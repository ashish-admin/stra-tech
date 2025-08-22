import logging
from datetime import datetime, timezone
from collections import defaultdict
from celery import shared_task
from sqlalchemy import func

from .extensions import db
from .models import (
    PollingStation, Election, ResultPS, ResultWardAgg, WardProfile,
    WardDemographics, WardFeatures
)
from .etl.form20_parser import parse_form20_csv

logger = logging.getLogger(__name__)

def _get_or_create_election(e_type: str, year: int) -> Election:
    e = Election.query.filter_by(type=e_type, year=year).first()
    if not e:
        e = Election(type=e_type, year=year, round="seed", official_ref="cli")
        db.session.add(e)
        db.session.flush()
    return e

@shared_task(bind=True)
def ingest_form20_ls24(self, csv_path: str) -> str:
    app_rows = 0
    e = _get_or_create_election("LOKSABHA", 2024)
    for row in parse_form20_csv(csv_path):
        ps = PollingStation.query.filter_by(ps_id=row["ps_id"]).first()
        if not ps:
            ps = PollingStation(
                ps_id=row["ps_id"], name=None, address=None,
                lat=None, lon=None,
                ac_id=row.get("ac_id"), pc_id=row.get("pc_id"),
                ward_id=row.get("ward_id"), ward_name=row.get("ward_name"),
                source_meta={"ingest": "csv"}
            )
            db.session.add(ps)
        rps = ResultPS(
            election_id=e.id,
            ps_id=row["ps_id"],
            party=row["party"],
            candidate=row.get("candidate"),
            votes=row.get("votes"),
            total_polled=row.get("total_polled"),
            rejected=row.get("rejected"),
            created_at=datetime.now(timezone.utc),
        )
        db.session.add(rps)
        app_rows += 1
    db.session.commit()
    msg = f"ingest_form20_ls24: ingested {app_rows} rows from {csv_path}"
    logger.info(msg)
    return msg

@shared_task(bind=True)
def aggregate_to_ward(self, election_type: str, year: int) -> str:
    e = Election.query.filter_by(type=election_type, year=year).first()
    if not e:
        return f"aggregate_to_ward: no election {election_type} {year}"
    from sqlalchemy import func
    q_votes = db.session.query(
        PollingStation.ward_id,
        ResultPS.party,
        func.sum(ResultPS.votes).label("votes"),
        func.sum(ResultPS.total_polled).label("total_polled")
    ).join(PollingStation, PollingStation.ps_id == ResultPS.ps_id
    ).filter(ResultPS.election_id == e.id
    ).group_by(PollingStation.ward_id, ResultPS.party).all()

    totals_per_ward = defaultdict(int)
    turnout_per_ward = defaultdict(int)
    for ward_id, party, votes, total_polled in q_votes:
        totals_per_ward[ward_id] += (votes or 0)
        turnout_per_ward[ward_id] = max(turnout_per_ward[ward_id], total_polled or 0)

    wrote = 0
    for ward_id, party, votes, total_polled in q_votes:
        total_votes = totals_per_ward.get(ward_id) or 1
        share = (votes or 0) / total_votes * 100.0
        ra = ResultWardAgg(
            election_id=e.id,
            ward_id=ward_id or "UNKNOWN",
            party=party,
            votes=votes or 0,
            vote_share=share,
            turnout_pct=(turnout_per_ward.get(ward_id) or 0) / max(1, total_votes) * 100.0,
            computed_at=datetime.now(timezone.utc),
        )
        db.session.add(ra)
        wrote += 1
    db.session.commit()
    return f"aggregate_to_ward: wrote {wrote} rows for {election_type} {year}"

@shared_task(bind=True)
def compute_features(self) -> str:
    as23 = Election.query.filter_by(type="ASSEMBLY", year=2023).first()
    ls24 = Election.query.filter_by(type="LOKSABHA", year=2024).first()
    if not ls24:
        return "compute_features: LS24 missing, abort"

    def collect(e: Election):
        rows = db.session.query(
            ResultWardAgg.ward_id, ResultWardAgg.party, ResultWardAgg.vote_share
        ).filter(ResultWardAgg.election_id == e.id).all()
        out = defaultdict(dict)
        for w, p, s in rows:
            out[w][p] = float(s or 0.0) / 100.0
        return out

    ls = collect(ls24)
    a23 = collect(as23) if as23 else {}

    wrote = 0
    for ward_id, ls_shares in ls.items():
        as_shares = a23.get(ward_id, {})
        dvi = {p: ls_shares.get(p, 0.0) - as_shares.get(p, 0.0)
               for p in set(ls_shares) | set(as_shares)}
        aci = as_shares.get("INC", 0.0) + as_shares.get("BJP", 0.0)

        wf = WardFeatures.query.filter_by(ward_id=ward_id).first()
        if not wf:
            wf = WardFeatures(ward_id=ward_id)
            db.session.add(wf)
        wf.as23_party_shares = as_shares or None
        wf.ls24_party_shares = ls_shares
        wf.dvi = dvi
        wf.aci_23 = aci
        wf.turnout_volatility = 0.0
        wf.incumbency_weakness = None
        wf.updated_at = datetime.now(timezone.utc)
        wrote += 1

    db.session.commit()
    return f"compute_features: updated {wrote} wards"

@shared_task(bind=True)
def compute_demographic_indices(self) -> str:
    return "compute_demographic_indices: not yet implemented"

@shared_task(bind=True)
def refresh_ward_profile(self) -> str:
    return "refresh_ward_profile: not yet implemented"

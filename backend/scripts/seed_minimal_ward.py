from datetime import datetime, timezone
from app import create_app
from app.extensions import db
from app.models import Election, WardProfile, WardDemographics, WardFeatures

def upsert(model, filters, defaults):
    row = model.query.filter_by(**filters).first()
    if not row:
        row = model(**filters, **defaults)
        db.session.add(row)
    else:
        for k, v in defaults.items():
            setattr(row, k, v)
    return row

def main():
    app = create_app()
    with app.app_context():
        upsert(Election, {"type": "LOKSABHA", "year": 2024},
               {"round": "Phase", "official_ref": "seed"})

        upsert(WardProfile, {"ward_id": "WARD_001"}, {
            "electors": 50000, "votes_cast": 27500, "turnout_pct": 55.0,
            "last_winner_party": "BRS", "last_winner_year": 2020,
            "updated_at": datetime.now(timezone.utc)
        })

        upsert(WardDemographics, {"ward_id": "WARD_001"}, {
            "literacy_idx": 0.72, "muslim_idx": 0.30,
            "scst_idx": 0.22, "secc_deprivation_idx": 0.45,
            "updated_at": datetime.now(timezone.utc)
        })

        upsert(WardFeatures, {"ward_id": "WARD_001"}, {
            "as23_party_shares": {"BRS": 0.38, "INC": 0.32, "BJP": 0.26, "AIMIM": 0.04},
            "ls24_party_shares": {"BRS": 0.28, "INC": 0.36, "BJP": 0.32, "AIMIM": 0.04},
            "dvi": {"BRS": -0.10, "INC": 0.04, "BJP": 0.06, "AIMIM": 0.00},
            "aci_23": 0.58, "turnout_volatility": 4.2,
            "incumbency_weakness": {"BRS": 0.62},
            "updated_at": datetime.now(timezone.utc)
        })

        db.session.commit()
        print("Seeded WARD_001 successfully.")

if __name__ == "__main__":
    main()

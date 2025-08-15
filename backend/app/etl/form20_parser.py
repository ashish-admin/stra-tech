import csv
from typing import Iterator, Dict, Any

def parse_form20_csv(path: str) -> Iterator[Dict[str, Any]]:
    with open(path, newline="", encoding="utf-8") as f:
        r = csv.DictReader(f)
        for row in r:
            for k in ("votes", "total_polled", "rejected"):
                v = row.get(k)
                row[k] = int(v) if v not in (None, "", "NA") else None
            yield row

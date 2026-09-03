from sqlalchemy.engine import Connection
from typing import List
from backend.detection.engine import FindingResult

def evaluate(conn: Connection, case_id: str) -> List[FindingResult]:
    # Placeholder for hackathon demo
    return [FindingResult(
        rule_id="IFR-007",
        severity="HIGH",
        weight=20,
        confidence=1.0,
        entity_ids=["e_mock"],
        event_ids=["ev_mock"],
        source_file_ids=["sf_mock"],
        source_rows=[1],
        explanation="IPDR session to same IP within 15 min of CALL"
    )]

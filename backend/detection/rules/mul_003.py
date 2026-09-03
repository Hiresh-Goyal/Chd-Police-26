from sqlalchemy.engine import Connection
from typing import List
from backend.detection.engine import FindingResult

def evaluate(conn: Connection, case_id: str) -> List[FindingResult]:
    # Placeholder for hackathon demo
    return [FindingResult(
        rule_id="MUL-003",
        severity="CRITICAL",
        weight=30,
        confidence=1.0,
        entity_ids=["e_mock"],
        event_ids=["ev_mock"],
        source_file_ids=["sf_mock"],
        source_rows=[1],
        explanation="Mule account pattern detected"
    )]

from sqlalchemy.engine import Connection
from typing import List
from backend.detection.engine import FindingResult
from . import ctn_001, sim_002, mul_003, coo_004, fsm_005, amt_006, ifr_007, vol_008

def run_all_rules(conn: Connection, case_id: str) -> List[FindingResult]:
    findings = []
    
    findings.extend(ctn_001.evaluate(conn, case_id))
    findings.extend(sim_002.evaluate(conn, case_id))
    findings.extend(mul_003.evaluate(conn, case_id))
    findings.extend(coo_004.evaluate(conn, case_id))
    findings.extend(fsm_005.evaluate(conn, case_id))
    findings.extend(amt_006.evaluate(conn, case_id))
    findings.extend(ifr_007.evaluate(conn, case_id))
    findings.extend(vol_008.evaluate(conn, case_id))
    
    return findings

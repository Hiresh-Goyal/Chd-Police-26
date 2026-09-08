from backend.db.connection import get_db
from backend.resolution.strategies import (
    msisdn_match,
    account_match,
    imei_group,
    ip_overlap,
    colocation,
    cross_source
)
from backend.resolution.contradiction import detect_contradictions

def resolve(case_id: str) -> dict:
    """
    Main entry point for entity resolution.
    Orchestrates all strategies to build entities and entity_links.
    Called by Member 4's /analyze endpoint.
    """
    db_gen = get_db()
    conn = next(db_gen)
    
    total_entities = 0
    total_links = 0
    contradictions = []
    
    try:
        # Start transaction for resolution
        with conn.begin():
            # 1. Exact matching (Entities creation)
            res1 = msisdn_match.execute(conn, case_id)
            total_entities += res1["entities_created"]
            total_links += res1["links_created"]
            
            res2 = account_match.execute(conn, case_id)
            total_entities += res2["entities_created"]
            total_links += res2["links_created"]
            
            # 2. Linking strategies
            res3 = imei_group.execute(conn, case_id)
            total_entities += res3["entities_created"]
            total_links += res3["links_created"]
            
            res4 = ip_overlap.execute(conn, case_id)
            total_entities += res4["entities_created"]
            total_links += res4["links_created"]
            
            res5 = colocation.execute(conn, case_id)
            total_entities += res5["entities_created"]
            total_links += res5["links_created"]
            
            res6 = cross_source.execute(conn, case_id)
            total_entities += res6["entities_created"]
            total_links += res6["links_created"]
            
            # 3. Contradiction Detection
            contradictions = detect_contradictions(conn, case_id)
            
    except Exception as e:
        print(f"Error during resolution: {e}")
        raise
    finally:
        # close generator
        try:
            next(db_gen)
        except StopIteration:
            pass

    return {
        "entities_created": total_entities,
        "links_created": total_links,
        "contradictions": contradictions
    }

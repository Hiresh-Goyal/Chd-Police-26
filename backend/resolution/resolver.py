from contextlib import nullcontext

from backend.db.connection import get_connection
from backend.resolution.strategies import (
    msisdn_match,
    account_match,
    imei_group,
    ip_overlap,
    colocation,
    cross_source,
    social_match,
)
from backend.resolution.contradiction import detect_contradictions
from backend.resolution.strategies.common import reset_case_resolution


def resolve(case_id: str, connection=None) -> dict:
    """
    Main entry point for entity resolution.

    Runs all entity-resolution strategies for the given case,
    followed by contradiction detection.

    Args:
        case_id: ID of the case to resolve.

    Returns:
        dict containing:
            - entities_created
            - links_created
            - contradictions
    """

    total_entities = 0
    total_links = 0
    contradictions = []

    try:
        # A caller may provide the analysis transaction; otherwise this stage
        # owns a short transaction itself.
        with (nullcontext(connection) if connection is not None else get_connection()) as conn:
            # Entities and links are derived solely from canonical events.
            # Rebuild them so re-analysis cannot accumulate stale duplicates.
            reset_case_resolution(conn, case_id)

            # ---------------------------------------------------------
            # 1. Exact matching / entity creation
            # ---------------------------------------------------------

            res1 = msisdn_match.execute(conn, case_id)
            total_entities += res1["entities_created"]
            total_links += res1["links_created"]

            res2 = account_match.execute(conn, case_id)
            total_entities += res2["entities_created"]
            total_links += res2["links_created"]

            # ---------------------------------------------------------
            # 2. Linking strategies
            # ---------------------------------------------------------

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

            res7 = social_match.execute(conn, case_id)
            total_entities += res7["entities_created"]
            total_links += res7["links_created"]

            # ---------------------------------------------------------
            # 3. Contradiction detection
            # ---------------------------------------------------------

            contradictions = detect_contradictions(conn, case_id)

    except Exception as e:
        print(f"Error during resolution: {e}")
        raise

    return {
        "entities_created": total_entities,
        "links_created": total_links,
        "contradictions": contradictions,
    }

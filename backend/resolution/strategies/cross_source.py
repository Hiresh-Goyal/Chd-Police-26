from sqlalchemy.engine import Connection

def execute(conn: Connection, case_id: str) -> dict:
    return {"entities_created": 0, "links_created": 0}

from typing import List, Optional

from fastapi import APIRouter, Depends, Query
from pydantic import BaseModel
from sqlalchemy import select, or_, and_

from backend.auth.jwt import get_current_user
from backend.db.connection import get_connection
from backend.shared.schema import canonical_events_table, entities_table

router = APIRouter(prefix="/search", tags=["Search"])

class SearchResult(BaseModel):
    source_type: str
    case_id: str
    event_id: Optional[str] = None
    entity_id: Optional[str] = None
    snippet: str
    matched_field: str
    ts: Optional[str] = None

@router.get("", response_model=List[SearchResult])
def search_all(q: str = Query(..., min_length=2), types: Optional[str] = None, current_user: dict = Depends(get_current_user)):
    results = []
    
    with get_connection() as conn:
        # 1. Search Canonical Events
        stmt_events = select(canonical_events_table).where(
            or_(
                canonical_events_table.c.actor_raw.ilike(f"%{q}%"),
                canonical_events_table.c.peer_raw.ilike(f"%{q}%"),
                canonical_events_table.c.location_raw.ilike(f"%{q}%")
            )
        ).limit(100)
        events = conn.execute(stmt_events).fetchall()
        
        for e in events:
            # Check which field matched
            matched_field = "actor_raw"
            snippet = e.actor_raw
            if e.peer_raw and q.lower() in e.peer_raw.lower():
                matched_field = "peer_raw"
                snippet = e.peer_raw
            elif e.location_raw and q.lower() in e.location_raw.lower():
                matched_field = "location_raw"
                snippet = e.location_raw
                
            results.append(SearchResult(
                source_type=e.event_type,
                case_id=e.case_id,
                event_id=e.id,
                snippet=snippet,
                matched_field=matched_field,
                ts=e.ts_start
            ))
            
        # 2. Search Entities
        stmt_entities = select(entities_table).where(
            entities_table.c.canonical_id.ilike(f"%{q}%")
        ).limit(50)
        entities = conn.execute(stmt_entities).fetchall()
        
        for ent in entities:
            results.append(SearchResult(
                source_type="ENTITY",
                case_id=ent.case_id,
                entity_id=ent.id,
                snippet=ent.canonical_id,
                matched_field="canonical_id",
                ts=ent.created_at
            ))
            
    # Simple limit and type filtering if needed
    if types:
        type_list = [t.strip().upper() for t in types.split(",")]
        results = [r for r in results if r.source_type in type_list or (r.source_type == "ENTITY" and "ENTITY" in type_list)]
        
    return results[:100]

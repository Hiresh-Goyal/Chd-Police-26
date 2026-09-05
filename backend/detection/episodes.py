import uuid
from typing import List, Dict, Any
from sqlalchemy.orm import Session
from sqlalchemy import text
from datetime import timedelta
import json

def build_episodes(db: Session, case_id: uuid.UUID) -> List[Dict[str, Any]]:
    # Clear existing episodes for case
    db.execute(text("UPDATE canonical_events SET episode_id = NULL WHERE case_id = :case_id"), {"case_id": case_id})
    db.execute(text("DELETE FROM episodes WHERE case_id = :case_id"), {"case_id": case_id})
    db.commit()

    # Step 1: Seed - get all events with a CONFIRMED actor_entity_id
    events_query = text("""
        SELECT ce.id, ce.ts_start, ce.ts_end, ce.actor_entity_id, ce.peer_entity_id
        FROM canonical_events ce
        JOIN entities e ON ce.actor_entity_id = e.id
        WHERE ce.case_id = :case_id AND e.confidence_tier = 'CONFIRMED'
        ORDER BY ce.ts_start ASC
    """)
    events = db.execute(events_query, {"case_id": case_id}).fetchall()
    
    if not events:
        return []
        
    # Step 3 & 4: Simple clustering
    # We will cluster events that share at least 1 entity and are within 4 hours
    clusters = []
    
    for ev in events:
        ev_id = str(ev.id)
        ev_start = ev.ts_start
        ev_end = ev.ts_end or ev.ts_start
        entities = set([str(ev.actor_entity_id)])
        if ev.peer_entity_id:
            entities.add(str(ev.peer_entity_id))
            
        matched_cluster = None
        for cluster in clusters:
            # Check overlap
            c_start = cluster['ts_start']
            c_end = cluster['ts_end']
            
            # Check time overlap within 4h
            if (ev_start - c_end) <= timedelta(hours=4) and (c_start - ev_end) <= timedelta(hours=4):
                # Check entity overlap
                if entities.intersection(cluster['entities']):
                    matched_cluster = cluster
                    break
                    
        if matched_cluster:
            matched_cluster['events'].add(ev_id)
            matched_cluster['entities'].update(entities)
            matched_cluster['ts_start'] = min(matched_cluster['ts_start'], ev_start)
            matched_cluster['ts_end'] = max(matched_cluster['ts_end'], ev_end)
        else:
            clusters.append({
                'events': {ev_id},
                'entities': entities,
                'ts_start': ev_start,
                'ts_end': ev_end
            })
            
    # Save episodes
    result_episodes = []
    for c in clusters:
        # Ignore tiny noise clusters for now
        if len(c['events']) < 2:
            continue
            
        ep_id = uuid.uuid4()
        duration_hrs = (c['ts_end'] - c['ts_start']).total_seconds() / 3600.0
        date_str = c['ts_start'].strftime('%Y-%m-%d')
        label = f"Fraud Cluster {date_str} — {len(c['entities'])} entities, {len(c['events'])} events"
        summary = f"An episode containing {len(c['events'])} related events over {duration_hrs:.1f} hours."
        
        db.execute(text("""
            INSERT INTO episodes (id, case_id, ts_start, ts_end, duration_hours, entity_ids, event_ids, label, summary)
            VALUES (:id, :case_id, :ts_start, :ts_end, :dur, :ent, :evt, :label, :summary)
        """), {
            "id": ep_id,
            "case_id": case_id,
            "ts_start": c['ts_start'],
            "ts_end": c['ts_end'],
            "dur": duration_hrs,
            "ent": json.dumps(list(c['entities'])),
            "evt": json.dumps(list(c['events'])),
            "label": label,
            "summary": summary
        })
        
        # Update canonical_events
        # we can pass list to ANY or just do multiple updates
        for ev_id in c['events']:
            db.execute(text("UPDATE canonical_events SET episode_id = :ep_id WHERE id = :id"), {"ep_id": ep_id, "id": ev_id})
            
        result_episodes.append({
            "id": ep_id,
            "label": label,
            "ts_start": c['ts_start']
        })
        
    db.commit()
    return result_episodes

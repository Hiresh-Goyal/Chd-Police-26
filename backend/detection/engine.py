import uuid
import json
from typing import Dict, Any, List
from sqlalchemy.orm import Session
from sqlalchemy import text
from datetime import datetime, timezone

from detection.episodes import build_episodes
from detection.narrative import generate_summary
from detection.rules.ctn_001 import run_ctn_001
from detection.rules.sim_002 import run_sim_002
from detection.rules.mul_003 import run_mul_003
from detection.rules.coo_004 import run_coo_004
from detection.rules.fsm_005 import run_fsm_005
from detection.rules.amt_006 import run_amt_006
from detection.rules.ifr_007 import run_ifr_007
from detection.rules.vol_008 import run_vol_008
from detection.rules.amt_010 import run_amt_010
from detection.rules.sim_011 import run_sim_011
from detection.rules.ring_009 import check_fraud_rings
from shared.schema import findings, entities

def run_detection(db: Session, case_id: uuid.UUID) -> Dict[str, Any]:
    # 0. Clear existing findings to ensure idempotency
    db.execute(text("DELETE FROM findings WHERE case_id = :case_id"), {"case_id": case_id})
    db.execute(text("DELETE FROM episodes WHERE case_id = :case_id"), {"case_id": case_id})
    db.execute(text("DELETE FROM fraud_scores WHERE case_id = :case_id"), {"case_id": case_id})
    db.commit()

    # 1. Build episodes first
    episodes_created = build_episodes(db, case_id)
    
    # Clear old findings
    db.execute(text("DELETE FROM findings WHERE case_id = :case_id"), {"case_id": case_id})
    db.commit()
    
    # 2. Run deterministic rules
    all_findings = []
    all_findings.extend(run_ctn_001(db, case_id))
    all_findings.extend(run_sim_002(db, case_id))
    all_findings.extend(run_mul_003(db, case_id))
    all_findings.extend(run_coo_004(db, case_id))
    all_findings.extend(run_fsm_005(db, case_id))
    all_findings.extend(run_amt_006(db, case_id))
    all_findings.extend(run_ifr_007(db, case_id))
    all_findings.extend(run_vol_008(db, case_id))
    all_findings.extend(run_amt_010(db, case_id))
    all_findings.extend(run_sim_011(db, case_id))
    
    # Process base findings
    for f in all_findings:
        f['id'] = str(uuid.uuid4())
        f['case_id'] = str(case_id)
        if 'template_data' in f:
            f['explanation'] = generate_summary(f['rule_id'], f.pop('template_data', {}))
        f['created_at'] = datetime.now(timezone.utc)
        f['rule_version'] = '1.0'
        f['ml_signal'] = 0.0
        
        # Ensure event_ids is a list of strings
        if 'event_ids' in f and f['event_ids']:
            f['event_ids'] = [str(x) for x in f['event_ids']]
        
        # Link to episode if possible
        ep_row = None
        if f.get('event_ids'):
            ep_query = text("""
                SELECT episode_id FROM canonical_events 
                WHERE id = ANY(:ev_ids) AND episode_id IS NOT NULL LIMIT 1
            """)
            try:
                ep_row = db.execute(ep_query, {"ev_ids": [uuid.UUID(x) for x in f['event_ids']]}).fetchone()
            except Exception:
                pass
        f['episode_id'] = str(ep_row[0]) if ep_row and ep_row[0] else None

    # 3. Community Detection (RING-009)
    fraud_rings = _run_community_detection(str(case_id), all_findings, db)
    ring_findings = check_fraud_rings(fraud_rings)
    for f in ring_findings:
        f['id'] = str(uuid.uuid4())
        f['case_id'] = str(case_id)
        f['created_at'] = datetime.now(timezone.utc)
        f['rule_version'] = '1.0'
        f['episode_id'] = None
        
        if 'event_ids' in f and f['event_ids']:
            f['event_ids'] = [str(x) for x in f['event_ids']]
            
        all_findings.append(f)
        
    # 4. Attach ML signals
    all_findings = _attach_ml_signals(str(case_id), all_findings, db)
    
    # 5. Save to database
    for f in all_findings:
        # Avoid issues with lists
        if 'entity_ids' in f:
            f['entity_ids'] = json.dumps([str(e) for e in f['entity_ids']]) if f['entity_ids'] else '[]'
        if 'event_ids' in f:
            f['event_ids'] = json.dumps([str(e) for e in f['event_ids']]) if f['event_ids'] else '[]'
        if 'source_file_ids' in f:
            f['source_file_ids'] = json.dumps([str(e) for e in f['source_file_ids']]) if f['source_file_ids'] else '[]'
        if 'source_rows' in f:
            f['source_rows'] = json.dumps(f['source_rows']) if f['source_rows'] else '[]'
            
        db.execute(findings.insert().values(**f))
    
    db.commit()
    
    return {
        "episodes_created": len(episodes_created),
        "findings_created": len(all_findings),
        "findings": all_findings
    }

def _attach_ml_signals(case_id: str, findings: list[dict], conn) -> list[dict]:
    """
    Attach ML signals to existing findings. NEVER creates new findings.
    """
    bank_events_raw = conn.execute(text("""
        SELECT * FROM canonical_events
        WHERE case_id = :cid AND event_type = 'BANK_TRANSFER'
    """), {"cid": case_id}).fetchall()
    bank_events = [dict(row._mapping) for row in bank_events_raw]
    
    try:
        from detection.ml.lgbm_scorer import score_transactions
        lgbm_scores = score_transactions(bank_events)
    except Exception as e:
        print("LGBM skip:", e)
        lgbm_scores = {}
    
    all_events_raw = conn.execute(text("""
        SELECT * FROM canonical_events WHERE case_id = :cid
    """), {"cid": case_id}).fetchall()
    all_events = [dict(row._mapping) for row in all_events_raw]
    
    try:
        from detection.ml.velocity_scorer import score_entities
        velocity_scores = score_entities(all_events)
    except Exception as e:
        print("Velocity skip:", e)
        velocity_scores = {}
        
    try:
        from detection.ml.graph_anomaly import analyze_graph
        graph_scores = analyze_graph(conn, uuid.UUID(case_id))
    except Exception as e:
        print("Graph Anomaly skip:", e)
        graph_scores = {}
        
    try:
        from detection.ml.timeline_anomaly import analyze_cross_domain_rhythm
        timeline_scores = analyze_cross_domain_rhythm(all_events)
    except Exception as e:
        print("Timeline Anomaly skip:", e)
        timeline_scores = {}
    
    for finding in findings:
        best_ml_signal = 0.0
        best_ml_explanation = None
        
        for event_id in (finding.get('event_ids') or []):
            if str(event_id) in lgbm_scores:
                score_data = lgbm_scores[str(event_id)]
                if score_data['ml_signal'] > best_ml_signal:
                    best_ml_signal = score_data['ml_signal']
                    best_ml_explanation = score_data['ml_explanation']
        
        for entity_id in (finding.get('entity_ids') or []):
            eid_str = str(entity_id)
            if eid_str in velocity_scores:
                v = velocity_scores[eid_str]
                if v['velocity_score'] > best_ml_signal:
                    best_ml_signal = v['velocity_score']
                    signals_text = '; '.join(v['velocity_signals'][:2])
                    best_ml_explanation = f"Velocity: {signals_text}"
            
            if eid_str in graph_scores:
                g = graph_scores[eid_str]
                if g['structural_anomaly_score'] > best_ml_signal:
                    best_ml_signal = g['structural_anomaly_score']
                    best_ml_explanation = f"Graph Anomaly: Structural role identified as {g.get('role_signal', 'UNKNOWN')}"
                    
            if eid_str in timeline_scores:
                t = timeline_scores[eid_str]
                if t['coordination_score'] > best_ml_signal:
                    best_ml_signal = t['coordination_score']
                    best_ml_explanation = f"Timeline: {t.get('rhythm_explanation', 'Anomalous pattern detected')}"
        
        if best_ml_signal > 0:
            finding['ml_signal'] = best_ml_signal
            if best_ml_explanation:
                finding['ml_explanation'] = best_ml_explanation
    
    return findings

def _run_community_detection(case_id: str, findings: list[dict], conn) -> list[dict]:
    """Run Louvain community detection and return fraud ring dicts."""
    try:
        from detection.ml.community_detector import detect_fraud_rings
        
        entities = [dict(r._mapping) for r in conn.execute(text(
            "SELECT * FROM entities WHERE case_id = :cid"
        ), {"cid": case_id}).fetchall()]
        
        links = [dict(r._mapping) for r in conn.execute(text(
            "SELECT * FROM entity_links WHERE case_id = :cid"
        ), {"cid": case_id}).fetchall()]
        
        findings_as_dicts = [
            {'entity_ids': [str(e) for e in (f.get('entity_ids') or [])]}
            for f in findings
        ]
        
        return detect_fraud_rings(entities, links, findings_as_dicts)
    except Exception as e:
        print("Community skip:", e)
        return []

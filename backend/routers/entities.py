import uuid
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import text

from db.connection import get_db

router = APIRouter()

@router.get("/cases/{case_id}/entities")
def get_entities(case_id: uuid.UUID, db: Session = Depends(get_db)):
    rows = db.execute(text("SELECT * FROM entities WHERE case_id = :case_id"), {"case_id": case_id}).fetchall()
    return [dict(r._mapping) for r in rows]

@router.get("/cases/{case_id}/entities/{entity_id}")
def get_entity_detail(case_id: uuid.UUID, entity_id: uuid.UUID, db: Session = Depends(get_db)):
    e = db.execute(text("SELECT * FROM entities WHERE id = :entity_id AND case_id = :case_id"), {"entity_id": entity_id, "case_id": case_id}).fetchone()
    if not e:
        raise HTTPException(404)
    return dict(e._mapping)

import json

@router.get("/cases/{case_id}/behavioral-summary")
def behavioral_summary(case_id: str, db: Session = Depends(get_db)):
    entities = db.execute(text(
        "SELECT * FROM entities WHERE case_id = :cid ORDER BY fraud_score_contribution DESC LIMIT 20"
    ), {"cid": str(case_id)}).fetchall()
    
    findings_by_entity = {}
    for f in db.execute(text("SELECT * FROM findings WHERE case_id = :cid"), {"cid": str(case_id)}).fetchall():
        e_ids = f.entity_ids
        if isinstance(e_ids, str):
            try:
                entity_ids = json.loads(e_ids or '[]')
            except Exception:
                entity_ids = []
        elif isinstance(e_ids, list):
            entity_ids = e_ids
        else:
            entity_ids = []
            
        for eid in entity_ids:
            if eid not in findings_by_entity:
                findings_by_entity[eid] = []
            findings_by_entity[eid].append(dict(f._mapping))
    
    profiles = []
    for entity in entities:
        eid = str(entity.id)
        entity_findings = findings_by_entity.get(eid, [])
        
        if not entity_findings:
            continue
        
        role = entity.role_signal or 'UNKNOWN'
        tier = entity.confidence_tier or 'CANDIDATE'
        canonical = entity.canonical_value or 'Unknown'
        
        role_narratives = {
            'COORDINATOR': f"Entity {canonical} appears to be a coordinator: appears in records of multiple unconnected victims.",
            'MULE': f"Entity {canonical} exhibits mule account behavior: receives and rapidly forwards funds.",
            'VICTIM': f"Entity {canonical} appears to be a victim: made outbound transfers consistent with task-fraud targeting.",
            'AGGREGATOR': f"Entity {canonical} is a likely aggregator: receives from multiple mule accounts.",
            'UNKNOWN': f"Entity {canonical} is involved in {len(entity_findings)} suspicious finding(s).",
        }
        
        rule_ids = list(set(f['rule_id'] for f in entity_findings))
        severity_counts = {}
        for f in entity_findings:
            sev = f.get('severity', 'LOW')
            severity_counts[sev] = severity_counts.get(sev, 0) + 1
        
        top_finding = max(entity_findings, key=lambda f: float(f.get('fraud_weight', 0) or 0))
        
        profiles.append({
            'entity_id': eid,
            'canonical_value': canonical,
            'entity_type': entity.type or '',
            'confidence_tier': tier,
            'role_signal': role,
            'fraud_score_contribution': float(entity.fraud_score_contribution or 0),
            'finding_count': len(entity_findings),
            'rules_fired': rule_ids,
            'severity_breakdown': severity_counts,
            'top_finding_explanation': top_finding.get('explanation', ''),
            'narrative': (
                f"{role_narratives.get(role, role_narratives['UNKNOWN'])} "
                f"Fired {len(rule_ids)} rules: {', '.join(rule_ids)}. "
                f"Confidence: {tier}. "
                f"Top finding: {top_finding.get('explanation', '')[:200]}..."
            ),
        })
    
    return {'profiles': profiles, 'total': len(profiles)}

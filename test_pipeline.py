import sys
import os
import uuid
import asyncio

# Ensure backend can be imported
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), 'backend')))

from db.connection import get_db
from ingestion.ingest import ingest_file
from resolution.resolver import resolve
from detection.engine import run_detection
from detection.score import compute_fraud_score
from sqlalchemy import text

async def test_pipeline():
    case_id = uuid.uuid4()
    
    # get_db is a generator, so we just next() it to get the session
    db = next(get_db())
    try:
        db.execute(text("INSERT INTO cases (id, title) VALUES (:id, :title)"), {"id": case_id, "title": "Test Case"})
        db.commit()
        
        # 1. Ingest
        print("Ingesting Data...")
        await ingest_file(db, case_id, "demo_data/cdr.csv", "CDR", "cdr.csv")
        await ingest_file(db, case_id, "demo_data/bank.csv", "BANK", "bank.csv")
        await ingest_file(db, case_id, "demo_data/ipdr.csv", "IPDR", "ipdr.csv")
        await ingest_file(db, case_id, "demo_data/social.csv", "SOCIAL", "social.csv")
        
        # 2. Resolve
        print("Resolving Entities...")
        res = resolve(db, case_id)
        print(f"Entities created: {res['entities_created']}")
        print(f"Links created: {res['links_created']}")
        
        # 3. Detect
        print("Running Detection...")
        det = run_detection(db, case_id)
        print(f"Episodes created: {det['episodes_created']}")
        print(f"Findings: {det['findings_created']}")
        for f in det['findings']:
            print(f" - {f['rule_id']}: {f['explanation']}")
        
        # 4. Score
        print("Computing Score...")
        score = compute_fraud_score(db, case_id)
        print(f"Fraud Score: {score['score']} ({score['risk_level']})")
        print(f"ML Flags: {score['ml_anomaly_summary']['isolation_forest_flags']}")
        print("Top Findings:")
        for top in score['top_findings']:
            print(f" - {top['rule_id']} (weight: {top['effective_weight']})")
    finally:
        db.close()

if __name__ == "__main__":
    asyncio.run(test_pipeline())

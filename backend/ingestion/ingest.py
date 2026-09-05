import hashlib
import uuid
import pandas as pd
from typing import Dict, Any
from sqlalchemy.orm import Session
from datetime import datetime, timezone

from shared.schema import canonical_events, raw_files
from ingestion.parse_cdr import parse_cdr
from ingestion.parse_bank import parse_bank
from ingestion.parse_ipdr import parse_ipdr
from ingestion.parse_social import parse_social

def compute_sha256(file_path: str) -> str:
    sha256_hash = hashlib.sha256()
    with open(file_path, "rb") as f:
        # Read and update hash string value in blocks of 4K
        for byte_block in iter(lambda: f.read(4096), b""):
            sha256_hash.update(byte_block)
    return sha256_hash.hexdigest()

async def ingest_file(db: Session, case_id: uuid.UUID, file_path: str, file_type: str, original_name: str) -> Dict[str, Any]:
    file_id = uuid.uuid4()
    
    # 1. Compute SHA-256
    file_hash = compute_sha256(file_path)
    import os
    file_size = os.path.getsize(file_path)
    
    # 2. Insert row into raw_files
    # Using SQLAlchemy core insert
    stmt = raw_files.insert().values(
        id=file_id,
        case_id=case_id,
        filename=os.path.basename(file_path),
        original_name=original_name,
        file_type=file_type,
        sha256=file_hash,
        file_size=file_size,
        path=file_path,
        events_created=0,
        parse_errors=[],
        uploaded_at=datetime.now(timezone.utc)
    )
    db.execute(stmt)
    db.commit()
    
    # 3. Call correct parser
    df = None
    if file_path.lower().endswith('.csv'):
        # using polars for speed if we wanted, but pandas is easier for basic parsing and we have the code.
        df = pd.read_csv(file_path)
        
    events = []
    
    if file_type == 'CDR':
        events = parse_cdr(df, file_id)
    elif file_type == 'BANK':
        events = parse_bank(file_path, df, file_id)
    elif file_type == 'IPDR':
        events = parse_ipdr(df, file_id)
    elif file_type == 'SOCIAL':
        events = parse_social(df, file_id)
    else:
        raise ValueError(f"Unknown file_type: {file_type}")
        
    events_created = len(events)
    
    # 4. Bulk-insert canonical_events
    if events_created > 0:
        # add case_id to all events
        for e in events:
            e['case_id'] = case_id
            e['id'] = uuid.uuid4()
            
        db.execute(canonical_events.insert(), events)
        
        # 5. Update raw_files.events_created
        update_stmt = raw_files.update().where(raw_files.c.id == file_id).values(events_created=events_created)
        db.execute(update_stmt)
        
    db.commit()
    
    # 6. Return response
    return {
        "file_id": str(file_id),
        "events_created": events_created,
        "parse_errors": []
    }

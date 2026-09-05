import pandas as pd
from datetime import timedelta
import uuid
from typing import List, Dict, Any
from resolution.phone_norm import normalize_phone

def parse_cdr(df: pd.DataFrame, file_id: uuid.UUID) -> List[Dict[str, Any]]:
    """
    Parse CDR CSV dataframe into canonical event dicts.
    Expected CSV columns: msisdn, peer_msisdn, imei, tower_id, ts_start, duration_sec, call_type
    """
    events = []
    
    # Ensure ts_start is datetime
    if 'ts_start' in df.columns:
        df['ts_start'] = pd.to_datetime(df['ts_start'], infer_datetime_format=True)
    
    # Iterate using itertuples for speed, but iterrows is safer if columns are missing
    # Enumerate starting from 1 since row 0 is header in original CSV, but here df index is 0.
    # The source_row should be 0-indexed row number after header.
    for idx, row in df.iterrows():
        try:
            ts_start = row.get('ts_start')
            duration_sec = float(row.get('duration_sec', 0))
            call_type = str(row.get('call_type', '')).upper()
            
            # Map call_type to EventType enum
            if 'SMS' in call_type:
                event_type = 'SMS'
                ts_end = ts_start
            else:
                event_type = 'CALL'
                ts_end = ts_start + timedelta(seconds=duration_sec) if pd.notna(ts_start) else None
                
            msisdn = normalize_phone(row.get('msisdn', ''))
            peer_msisdn = normalize_phone(row.get('peer_msisdn', ''))
            
            event = {
                'event_type': event_type,
                'ts_start': ts_start,
                'ts_end': ts_end,
                'actor_raw': msisdn,
                'peer_raw': peer_msisdn,
                'device_id': str(row.get('imei', '')) if pd.notna(row.get('imei')) else None,
                'location_raw': str(row.get('tower_id', '')) if pd.notna(row.get('tower_id')) else None,
                'source_file_id': file_id,
                'source_row': int(idx),
                'payload': {
                    'duration_sec': duration_sec,
                    'call_type': call_type
                }
            }
            events.append(event)
        except Exception as e:
            # We can log this or ignore, but robust parsing should continue
            continue
            
    return events

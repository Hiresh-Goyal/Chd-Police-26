import pandas as pd
import uuid
from typing import List, Dict, Any
from resolution.phone_norm import normalize_phone

def parse_ipdr(df: pd.DataFrame, file_id: uuid.UUID) -> List[Dict[str, Any]]:
    """
    Parse IPDR CSV dataframe into canonical event dicts.
    Expected columns: msisdn, src_ip, dst_ip, ts_start, ts_end, bytes_up, bytes_down, dst_port (optional)
    """
    events = []
    
    if 'ts_start' in df.columns:
        df['ts_start'] = pd.to_datetime(df['ts_start'], infer_datetime_format=True)
    if 'ts_end' in df.columns:
        df['ts_end'] = pd.to_datetime(df['ts_end'], infer_datetime_format=True)
        
    for idx, row in df.iterrows():
        try:
            ts_start = row.get('ts_start')
            ts_end = row.get('ts_end')
            
            bytes_up = int(row.get('bytes_up', 0)) if pd.notna(row.get('bytes_up')) else 0
            bytes_down = int(row.get('bytes_down', 0)) if pd.notna(row.get('bytes_down')) else 0
            dst_port = str(row.get('dst_port', '')) if 'dst_port' in row else ''
            
            msisdn = normalize_phone(row.get('msisdn', ''))
            src_ip = str(row.get('src_ip', ''))
            dst_ip = str(row.get('dst_ip', ''))
            
            event = {
                'event_type': 'IPDR_SESSION',
                'ts_start': ts_start,
                'ts_end': ts_end,
                'actor_raw': msisdn,
                'peer_raw': dst_ip,
                'location_raw': src_ip,  # Source IP acts as location for IPDR
                'source_file_id': file_id,
                'source_row': int(idx),
                'payload': {
                    'bytes_up': bytes_up,
                    'bytes_down': bytes_down,
                    'dst_port': dst_port
                }
            }
            events.append(event)
        except Exception as e:
            continue
            
    return events

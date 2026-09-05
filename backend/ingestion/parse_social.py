import pandas as pd
import uuid
from typing import List, Dict, Any
from resolution.phone_norm import normalize_phone

def parse_social(df: pd.DataFrame, file_id: uuid.UUID) -> List[Dict[str, Any]]:
    """
    Parse Social CSV dataframe into canonical event dicts.
    Expected columns: platform, user_id, phone, content, ts, interaction_type
    """
    events = []
    
    if 'ts' in df.columns:
        df['ts'] = pd.to_datetime(df['ts'], infer_datetime_format=True)
        
    for idx, row in df.iterrows():
        try:
            ts_start = row.get('ts')
            interaction_type = str(row.get('interaction_type', '')).upper()
            
            # Map interaction type
            event_type = 'SOCIAL_POST'
            if interaction_type in ['DM', 'COMMENT', 'RECRUITMENT']:
                event_type = 'SOCIAL_INTERACTION'
                
            user_id = str(row.get('user_id', ''))
            phone_raw = row.get('phone')
            phone = normalize_phone(phone_raw) if pd.notna(phone_raw) else None
            
            event = {
                'event_type': event_type,
                'ts_start': ts_start,
                'ts_end': None,
                'actor_raw': user_id,
                'peer_raw': phone,
                'source_file_id': file_id,
                'source_row': int(idx),
                'payload': {
                    'platform': str(row.get('platform', '')),
                    'content': str(row.get('content', '')),
                    'interaction_type': interaction_type
                }
            }
            events.append(event)
        except Exception as e:
            continue
            
    return events

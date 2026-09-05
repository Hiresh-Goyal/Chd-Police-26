import pandas as pd
import uuid
import os
from typing import List, Dict, Any

def parse_bank_csv(df: pd.DataFrame, file_id: uuid.UUID) -> List[Dict[str, Any]]:
    """
    Parse Bank CSV dataframe into canonical event dicts.
    Expected columns: account, peer_account, amount, ts, txn_type, ref_id
    """
    events = []
    
    if 'ts' in df.columns:
        df['ts'] = pd.to_datetime(df['ts'], infer_datetime_format=True)
        
    for idx, row in df.iterrows():
        try:
            ts_start = row.get('ts')
            amount = float(row.get('amount', 0))
            txn_type = str(row.get('txn_type', '')).upper()
            ref_id = str(row.get('ref_id', ''))
            
            event = {
                'event_type': 'BANK_TRANSFER',
                'ts_start': ts_start,
                'ts_end': None,
                'actor_raw': str(row.get('account', '')),
                'peer_raw': str(row.get('peer_account', '')),
                'amount': amount,
                'source_file_id': file_id,
                'source_row': int(idx),
                'payload': {
                    'txn_type': txn_type,
                    'ref_id': ref_id
                }
            }
            events.append(event)
        except Exception as e:
            continue
            
    return events

def parse_bank_pdf(file_path: str, file_id: uuid.UUID) -> List[Dict[str, Any]]:
    """Fallback parser for bank statements in PDF format."""
    import pdfplumber
    
    events = []
    row_idx = 0
    
    try:
        with pdfplumber.open(file_path) as pdf:
            for page in pdf.pages:
                tables = page.extract_tables()
                for table in tables:
                    if table and len(table[0]) >= 4:
                        # Simple heuristic: assume first row is header, rest is data
                        # Needs to map to account, peer_account, amount, ts, txn_type, ref_id
                        # For hackathon robust demo, if we don't have standard columns, we try our best.
                        # Assuming the PDF has the exact same columns as the CSV for demo simplicity.
                        header = [str(h).lower().strip() for h in table[0]]
                        
                        df = pd.DataFrame(table[1:], columns=header)
                        # ensure columns exist
                        if 'ts' in df.columns:
                            df['ts'] = pd.to_datetime(df['ts'], infer_datetime_format=True, errors='coerce')
                            
                        for _, row in df.iterrows():
                            try:
                                ts_start = row.get('ts')
                                if pd.isna(ts_start):
                                    continue
                                amount = float(row.get('amount', 0))
                                txn_type = str(row.get('txn_type', '')).upper()
                                ref_id = str(row.get('ref_id', ''))
                                
                                event = {
                                    'event_type': 'BANK_TRANSFER',
                                    'ts_start': ts_start,
                                    'ts_end': None,
                                    'actor_raw': str(row.get('account', '')),
                                    'peer_raw': str(row.get('peer_account', '')),
                                    'amount': amount,
                                    'source_file_id': file_id,
                                    'source_row': row_idx,
                                    'payload': {
                                        'txn_type': txn_type,
                                        'ref_id': ref_id
                                    }
                                }
                                events.append(event)
                            except Exception as e:
                                pass
                            finally:
                                row_idx += 1
    except Exception as e:
        print(f"Error parsing PDF: {e}")
        
    return events

def parse_bank(file_path: str, df: pd.DataFrame, file_id: uuid.UUID) -> List[Dict[str, Any]]:
    if file_path.lower().endswith('.pdf'):
        return parse_bank_pdf(file_path, file_id)
    return parse_bank_csv(df, file_id)

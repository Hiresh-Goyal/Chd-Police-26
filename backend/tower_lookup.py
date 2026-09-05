from typing import Optional, Dict

TOWER_LOCATIONS = {
    'TW-CH-001': {'lat': 30.7333, 'lng': 76.7794, 'area': 'Sector 17, Chandigarh'},
    'TW-CH-002': {'lat': 30.7192, 'lng': 76.8107, 'area': 'Sector 35, Chandigarh'},
    'TW-CH-003': {'lat': 30.7046, 'lng': 76.7179, 'area': 'Industrial Area Phase 1'},
    'TW-CH-004': {'lat': 30.7595, 'lng': 76.7804, 'area': 'Sector 8, Chandigarh'},
    'TW-CH-005': {'lat': 30.7280, 'lng': 76.8450, 'area': 'Mohali Phase 7'},
    'TW-CH-006': {'lat': 30.6942, 'lng': 76.8606, 'area': 'Zirakpur'},
    'TW-CH-007': {'lat': 30.7400, 'lng': 76.7200, 'area': 'Panchkula Sector 11'},
    'TW-CH-008': {'lat': 30.7500, 'lng': 76.8000, 'area': 'Sector 22, Chandigarh'},
}

def lookup(tower_id: str) -> Optional[Dict]:
    """
    Lookup geographic coordinates for a given cell tower ID.
    
    Limitations & Future Work:
    - This is a static mapping of a few Chandigarh/Mohali area towers for MVP/demo purposes.
    - In a real production environment, this should query a telecom operator's HLR/VLR API 
      or an open database like OpenCelliD using MCC, MNC, LAC, and Cell ID.
    - Does not currently support historical tower locations or mobile cells (e.g., cell on wheels).
    """
    return TOWER_LOCATIONS.get(tower_id)

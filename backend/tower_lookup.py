"""Configured geospatial lookup for evidence-provided tower/location identifiers.

Unknown identifiers are *not* assigned fabricated coordinates. They remain
unmapped until a real lookup entry or explicit latitude/longitude is present.
"""

import re
from typing import Dict, Optional

TOWER_DATABASE: Dict[str, Dict[str, object]] = {
    "TOW-17-01": {"lat": 30.7398, "lng": 76.7827, "name": "Sector 17 City Centre, Chandigarh"},
    "TOW-17-02": {"lat": 30.7380, "lng": 76.7780, "name": "Sector 17 ISBT, Chandigarh"},
    "TOW-22-01": {"lat": 30.7350, "lng": 76.7680, "name": "Sector 22 Market, Chandigarh"},
    "TOW-35-01": {"lat": 30.7220, "lng": 76.7680, "name": "Sector 35 Commercial Plaza, Chandigarh"},
    "TOW-43-01": {"lat": 30.7180, "lng": 76.7530, "name": "ISBT Sector 43, Chandigarh"},
    "TOW-CHD-CENTRAL": {"lat": 30.7480, "lng": 76.7900, "name": "Police Headquarters, Sector 9, Chandigarh"},
    "TOW-IT-PARK": {"lat": 30.7240, "lng": 76.8450, "name": "Rajiv Gandhi IT Park, Chandigarh"},
    "TOW-MOHALI-01": {"lat": 30.7050, "lng": 76.7150, "name": "Phase 7 Industrial Area, Mohali"},
    "TOW-MOHALI-02": {"lat": 30.7120, "lng": 76.6980, "name": "Phase 3B2 Commercial Market, Mohali"},
    "TOW-PANCHKULA-01": {"lat": 30.6950, "lng": 76.8550, "name": "Sector 5 City Centre, Panchkula"},
    "TOW-PANCHKULA-02": {"lat": 30.6870, "lng": 76.8620, "name": "Industrial Area Phase 1, Panchkula"},
    "TOW-AIRPORT": {"lat": 30.6730, "lng": 76.7885, "name": "Shaheed Bhagat Singh Intl Airport, Chandigarh"},
    "TOW-ZIRAKPUR": {"lat": 30.6420, "lng": 76.8170, "name": "VIP Road Junction, Zirakpur"},
    "TOW-SUKHNA": {"lat": 30.7421, "lng": 76.8188, "name": "Sukhna Lake, Chandigarh"},
    # The demo/design data uses Cell ID 45892 for Sector 17 Tower A.
    "45892": {"lat": 30.7398, "lng": 76.7827, "name": "Sector 17 Tower A, Chandigarh"},
}


def lookup_tower(location_raw: Optional[str]) -> Optional[Dict[str, object]]:
    if not location_raw:
        return None
    raw = str(location_raw).strip()
    if not raw:
        return None

    item = TOWER_DATABASE.get(raw.upper())
    if item:
        return {"lat": float(item["lat"]), "lng": float(item["lng"]), "location_name": str(item["name"])}

    match = re.match(r"^\s*([-+]?\d+(?:\.\d+)?)\s*,\s*([-+]?\d+(?:\.\d+)?)\s*$", raw)
    if match:
        lat, lng = float(match.group(1)), float(match.group(2))
        return {"lat": lat, "lng": lng, "location_name": f"Coordinates ({lat:.4f}, {lng:.4f})"}

    return None

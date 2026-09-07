"""
backend/tower_lookup.py

Cell tower coordinate lookup table and parser for Chandigarh & Tri-city area.
Translates location_raw (tower IDs or lat/lng strings) into geographic coordinates.
"""

import hashlib
import re
from typing import Dict, Optional, Tuple

# Pre-defined telecom towers in Chandigarh & surrounding areas
TOWER_DATABASE: Dict[str, Dict[str, any]] = {
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
}


def _deterministic_coords(raw: str) -> Tuple[float, float, str]:
    """Deterministically map an unrecognized tower ID to the Chandigarh bounding box."""
    digest = hashlib.md5(raw.encode("utf-8")).hexdigest()
    int_val_lat = int(digest[:8], 16)
    int_val_lng = int(digest[8:16], 16)

    # Chandigarh bounding box: Lat 30.68 to 30.78, Lng 76.70 to 76.85
    lat = 30.6800 + (int_val_lat % 10000) / 100000.0
    lng = 76.7000 + (int_val_lng % 15000) / 100000.0
    name = f"Cell Site ({raw})"
    return round(lat, 5), round(lng, 5), name


def lookup_tower(location_raw: Optional[str]) -> Optional[Dict[str, any]]:
    """Resolve location_raw string into {lat, lng, location_name}.

    Handles:
    - Known tower identifiers (e.g., 'TOW-17-01')
    - Explicit coordinates string (e.g., '30.7398,76.7827' or '30.7398, 76.7827')
    - Fallback deterministic hashing for other tower strings
    """
    if not location_raw:
        return None

    raw_clean = location_raw.strip()
    if not raw_clean:
        return None

    # 1. Direct dictionary match (case-insensitive)
    upper_raw = raw_clean.upper()
    if upper_raw in TOWER_DATABASE:
        item = TOWER_DATABASE[upper_raw]
        return {
            "lat": item["lat"],
            "lng": item["lng"],
            "location_name": item["name"],
        }

    # 2. Check for comma-separated lat, lng pattern (e.g., "30.7398, 76.7827")
    coord_match = re.match(r"^[-+]?([0-9]*\.[0-9]+|[0-9]+)\s*,\s*[-+]?([0-9]*\.[0-9]+|[0-9]+)$", raw_clean)
    if coord_match:
        try:
            lat = float(coord_match.group(1))
            lng = float(coord_match.group(2))
            return {
                "lat": lat,
                "lng": lng,
                "location_name": f"Coordinates ({lat:.4f}, {lng:.4f})",
            }
        except ValueError:
            pass

    # 3. Deterministic coordinate generation inside Chandigarh area
    lat, lng, name = _deterministic_coords(raw_clean)
    return {
        "lat": lat,
        "lng": lng,
        "location_name": name,
    }

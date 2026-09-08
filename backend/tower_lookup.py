"""Replaceable geospatial reference-data resolvers.

Reference datasets are intentionally empty until authoritative data is supplied.
Unknown identifiers are never assigned fabricated coordinates.
"""

import csv
import os
import re
from typing import Any, Dict, Optional

BASE_DIR = os.path.dirname(__file__)
TOWER_DATASET = os.path.join(BASE_DIR, "geospatial_data", "towers.csv")
IP_DATASET = os.path.join(BASE_DIR, "geospatial_data", "ip_locations.csv")
BANK_DATASET = os.path.join(BASE_DIR, "geospatial_data", "bank_locations.csv")


def _load_csv(path: str, key: str) -> Dict[str, Dict[str, Any]]:
    if not os.path.exists(path):
        return {}
    result: Dict[str, Dict[str, Any]] = {}
    with open(path, "r", encoding="utf-8-sig", newline="") as handle:
        for row in csv.DictReader(handle):
            value = str(row.get(key, "") or "").strip()
            if value:
                result[value.upper()] = row
    return result


def _coords_from_row(row: Optional[Dict[str, Any]]) -> Optional[Dict[str, Any]]:
    if not row:
        return None
    try:
        lat_raw = str(row.get("latitude", "") or "").strip()
        lng_raw = str(row.get("longitude", "") or "").strip()
        if not lat_raw or not lng_raw:
            return None
        lat = float(lat_raw)
        lng = float(lng_raw)
    except (TypeError, ValueError):
        return None
    return {
        "lat": lat,
        "lng": lng,
        "location_name": str(row.get("location_name") or row.get("address") or "Resolved location"),
        "address": row.get("address") or None,
        "resolution_source": row.get("source") or None,
    }


def _explicit_coords(raw: Optional[str]) -> Optional[Dict[str, Any]]:
    if not raw:
        return None
    match = re.match(r"^\s*([-+]?(?:\d+(?:\.\d+)?))\s*,\s*([-+]?(?:\d+(?:\.\d+)?))\s*$", str(raw).strip())
    if not match:
        return None
    try:
        lat = float(match.group(1))
        lng = float(match.group(2))
    except ValueError:
        return None
    return {
        "lat": lat,
        "lng": lng,
        "location_name": f"Coordinates ({lat:.4f}, {lng:.4f})",
        "address": None,
        "resolution_source": "event_data",
    }


def lookup_tower(location_raw: Optional[str]) -> Optional[Dict[str, Any]]:
    if not location_raw:
        return None
    raw = str(location_raw).strip()
    if not raw:
        return None
    explicit = _explicit_coords(raw)
    if explicit:
        return explicit
    towers = _load_csv(TOWER_DATASET, "tower_id")
    return _coords_from_row(towers.get(raw.upper()))


def lookup_ip(ip_raw: Optional[str]) -> Optional[Dict[str, Any]]:
    if not ip_raw:
        return None
    raw = str(ip_raw).strip()
    if not raw:
        return None
    locations = _load_csv(IP_DATASET, "ip_address")
    return _coords_from_row(locations.get(raw.upper()))


def lookup_bank_location(location_raw: Optional[str]) -> Optional[Dict[str, Any]]:
    if not location_raw:
        return None
    raw = str(location_raw).strip()
    if not raw:
        return None
    locations = _load_csv(BANK_DATASET, "location_id")
    return _coords_from_row(locations.get(raw.upper()))

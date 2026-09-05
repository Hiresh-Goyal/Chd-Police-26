"""
Behavioral Velocity Scorer
Computes rolling-window behavioral signals for phones and accounts.
Pure statistics — no ML model. 100% explainable.
"""
import numpy as np
from collections import defaultdict
from datetime import datetime, timedelta


def score_entities(canonical_events: list[dict]) -> dict[str, dict]:
    """
    Returns: {entity_id: {'velocity_score': float, 'velocity_signals': list[str]}}
    
    Signals computed:
    - call_burst: calls per hour peak vs mean
    - transfer_burst: transfers per 24h peak vs mean  
    - unique_peer_count: distinct peers in 24h windows (coordinator signal)
    - sim_diversity: distinct MSISDNs per IMEI (SIM-cycling signal)
    - night_activity_ratio: fraction of events between 22:00-06:00
    - cross_domain_velocity: how many different event types in 1h window
    """
    
    # Group events by entity
    entity_events = defaultdict(list)
    for ev in canonical_events:
        if ev.get('actor_entity_id'):
            entity_events[str(ev['actor_entity_id'])].append(ev)
    
    results = {}
    
    for entity_id, events in entity_events.items():
        if not events:
            continue
        
        signals = []
        score_components = []
        
        # Parse timestamps
        times = []
        for ev in events:
            try:
                t = datetime.fromisoformat(str(ev['ts_start']).replace('Z', '+00:00'))
                times.append(t)
            except Exception:
                pass
        
        if not times:
            continue
        
        times_sorted = sorted(times)
        
        # --- Signal 1: Call burst (VOL-008 complement) ---
        call_events = [ev for ev in events if ev.get('event_type') == 'CALL']
        if len(call_events) >= 5:
            call_times = sorted([
                datetime.fromisoformat(str(ev['ts_start']).replace('Z', '+00:00'))
                for ev in call_events
            ])
            hourly_buckets = defaultdict(int)
            for t in call_times:
                bucket = t.replace(minute=0, second=0, microsecond=0)
                hourly_buckets[bucket] += 1
            
            counts = list(hourly_buckets.values())
            mean_c = np.mean(counts)
            peak_c = max(counts)
            if mean_c > 0 and (peak_c / mean_c) > 3:
                ratio = peak_c / mean_c
                signals.append(f"Call burst: peak {peak_c} calls/hr vs avg {mean_c:.1f} ({ratio:.1f}x spike)")
                score_components.append(min(0.35, ratio / 20))
        
        # --- Signal 2: Transfer burst ---
        bank_events = [ev for ev in events if ev.get('event_type') == 'BANK_TRANSFER']
        if len(bank_events) >= 3:
            bank_times = sorted([
                datetime.fromisoformat(str(ev['ts_start']).replace('Z', '+00:00'))
                for ev in bank_events
            ])
            daily_buckets = defaultdict(int)
            for t in bank_times:
                day = t.date()
                daily_buckets[day] += 1
            
            counts = list(daily_buckets.values())
            peak_d = max(counts)
            if peak_d >= 5:
                signals.append(f"Transfer burst: {peak_d} transfers in a single day")
                score_components.append(min(0.30, peak_d / 20))
        
        # --- Signal 3: Unique peer count (coordinator signal) ---
        peers_24h = defaultdict(set)
        for ev in events:
            if ev.get('peer_raw'):
                try:
                    t = datetime.fromisoformat(str(ev['ts_start']).replace('Z', '+00:00'))
                    day = t.date()
                    peers_24h[day].add(str(ev['peer_raw']))
                except Exception:
                    pass
        
        if peers_24h:
            max_peers = max(len(v) for v in peers_24h.values())
            if max_peers >= 10:
                signals.append(f"High unique peer count: {max_peers} distinct contacts in one day (coordinator pattern)")
                score_components.append(min(0.25, max_peers / 50))
        
        # --- Signal 4: Night activity ratio ---
        night_count = sum(
            1 for t in times
            if t.hour < 6 or t.hour >= 22
        )
        night_ratio = night_count / max(len(times), 1)
        if night_ratio > 0.4:
            signals.append(f"High night-time activity: {night_ratio:.0%} of events between 22:00–06:00")
            score_components.append(min(0.20, night_ratio * 0.5))
        
        # --- Signal 5: Cross-domain velocity (multi-source coordination) ---
        one_hour_windows = defaultdict(set)
        for ev in events:
            try:
                t = datetime.fromisoformat(str(ev['ts_start']).replace('Z', '+00:00'))
                bucket = t.replace(minute=0, second=0, microsecond=0)
                one_hour_windows[bucket].add(ev.get('event_type', ''))
            except Exception:
                pass
        
        if one_hour_windows:
            max_types = max(len(v) for v in one_hour_windows.values())
            if max_types >= 3:
                signals.append(f"Cross-domain coordination: {max_types} different activity types in 1-hour window (call+bank+IP)")
                score_components.append(0.15)
        
        if score_components:
            velocity_score = min(1.0, sum(score_components))
            results[entity_id] = {
                'velocity_score': velocity_score,
                'velocity_signals': signals,
            }
    
    return results

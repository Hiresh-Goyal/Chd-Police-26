"""
Timeline Anomaly Detector — Cross-Domain Rhythm Analysis

Innovation: Most fraud detection treats events independently.
This module looks for the RHYTHM of coordinated activity:
- Does communication activity reliably precede financial activity? (recruitment pattern)
- Are multiple domains "lighting up" simultaneously? (coordination pattern)
- Does financial activity cluster in bursts separated by silence? (mule pattern)

This produces a Coordination Score (0.0–1.0) per entity, independent of rule-based findings.
It is the closest analog to a behavioral fingerprint of a fraud operation.

Output: {entity_id: {'coordination_score': float, 'rhythm_explanation': str}}
"""

from collections import defaultdict
from datetime import datetime, timedelta
import numpy as np


def analyze_cross_domain_rhythm(canonical_events: list[dict]) -> dict[str, dict]:
    """
    Detect coordinated multi-domain temporal patterns.
    """
    if not canonical_events:
        return {}
    
    results = {}
    
    # Group by entity
    entity_events = defaultdict(list)
    for ev in canonical_events:
        eid = str(ev.get('actor_entity_id') or '')
        if eid and eid != 'None':
            entity_events[eid].append(ev)
    
    for entity_id, events in entity_events.items():
        if len(events) < 5:
            continue
        
        # Parse events with timestamps
        typed_events = []
        for ev in events:
            try:
                t = datetime.fromisoformat(str(ev['ts_start']).replace('Z', '+00:00'))
                typed_events.append((t, str(ev.get('event_type', ''))))
            except Exception:
                pass
        
        if not typed_events:
            continue
        
        typed_events.sort(key=lambda x: x[0])
        
        signals = []
        score_components = []
        
        # --- Pattern 1: Call precedes transfer (communication → finance causality) ---
        calls = [(t, et) for t, et in typed_events if et == 'CALL']
        transfers = [(t, et) for t, et in typed_events if et == 'BANK_TRANSFER']
        
        if calls and transfers:
            causal_pairs = 0
            for call_t, _ in calls:
                for xfer_t, _ in transfers:
                    delta = (xfer_t - call_t).total_seconds() / 60
                    if 0 < delta <= 60:  # Transfer within 60 min of call
                        causal_pairs += 1
            
            if causal_pairs >= 2:
                signals.append(
                    f"Communication-to-finance causality: {causal_pairs} instances of call "
                    f"→ bank transfer within 60 minutes"
                )
                score_components.append(min(0.40, causal_pairs * 0.12))
        
        # --- Pattern 2: Multi-domain burst (all domains active in same hour) ---
        hourly_types = defaultdict(set)
        for t, et in typed_events:
            bucket = t.replace(minute=0, second=0, microsecond=0)
            hourly_types[bucket].add(et)
        
        multi_domain_hours = [
            (bucket, types)
            for bucket, types in hourly_types.items()
            if len(types) >= 3
        ]
        
        if multi_domain_hours:
            best_hour, best_types = max(multi_domain_hours, key=lambda x: len(x[1]))
            signals.append(
                f"Multi-domain coordination: {len(best_types)} activity types "
                f"({', '.join(best_types)}) in 1-hour window at {best_hour.strftime('%H:%M')}"
            )
            score_components.append(0.30)
        
        # --- Pattern 3: Financial burst-silence pattern (mule signature) ---
        if len(transfers) >= 4:
            transfer_times = sorted([t for t, _ in transfers])
            gaps = [
                (transfer_times[i+1] - transfer_times[i]).total_seconds() / 3600
                for i in range(len(transfer_times)-1)
            ]
            
            if gaps:
                mean_gap = np.mean(gaps)
                std_gap = np.std(gaps)
                # High variance = bursts of activity separated by silence
                if std_gap / (mean_gap + 1) > 1.5:
                    signals.append(
                        f"Burst-silence transfer pattern: high temporal variance "
                        f"(σ={std_gap:.1f}h, mean={mean_gap:.1f}h) — "
                        f"characteristic of mule account operation cycles"
                    )
                    score_components.append(0.25)
        
        if score_components and signals:
            coordination_score = min(1.0, sum(score_components))
            results[entity_id] = {
                'coordination_score': coordination_score,
                'rhythm_explanation': ' | '.join(signals),
            }
    
    return results

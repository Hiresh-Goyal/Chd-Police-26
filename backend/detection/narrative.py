TEMPLATES = {
    'CTN-001': (
        "Between {ts_start} and {ts_end}, entity {actor_id} contacted {peer_id} "
        "immediately before {transfer_count} bank transfer(s) totalling ₹{total_amount:,.0f}. "
        "The call-to-transfer gap was {delta_min} minutes. "
        "Rule CTN-001 (Call-Transfer Nexus) triggered. "
        "Evidence: {evidence}. "
        "Entity link confidence: {tier}."
    ),
    'SIM-002': (
        "IMEI {imei} was associated with {msisdn_count} distinct SIM cards "
        "within a 7-day window ({date_range}): {msisdn_list}. "
        "Frequent SIM changes on the same device is a documented fraud evasion technique. "
        "Evidence: {evidence}."
    ),
    'MUL-003': (
        "Account {account} received ₹{received:,.0f} from {source_count} distinct source accounts "
        "and forwarded ₹{forwarded:,.0f} ({ratio:.1f}%) within {hours:.1f} hours. "
        "The rapid pass-through pattern is consistent with a mule account operation. "
        "Evidence: {evidence}."
    ),
    'COO-004': (
        "Entity {coordinator} appears in the call records of {victim_count} victims "
        "({victim_list}) who have no direct connection to each other. "
        "This hub-and-spoke pattern is consistent with a fraud coordinator. "
        "Evidence: {evidence}."
    ),
    'FSM-005': (
        "MSISDN {msisdn} first appeared in records on {first_seen} and made its first "
        "bank transaction on {first_transfer} — only {days} day(s) after activation. "
        "Freshly-activated SIMs used for immediate financial activity are a mule indicator."
    ),
    'AMT-006': (
        "{transfer_count} transfers from entity {source} all fall in the ₹9,000–₹9,999 range "
        "(amounts: {amounts}). This clustering below the ₹10,000 UPI monitoring threshold "
        "is a recognized structuring / smurfing pattern."
    ),
    'IFR-007': (
        "Entity {entity} had an active IP session to {ip} (port {port}) "
        "during a call at {call_time} (overlap: {overlap_sec}s). "
        "Port 5060 indicates SIP/VoIP infrastructure, suggesting calls were routed "
        "through a non-carrier channel to evade CDR attribution. Evidence: {evidence}."
    ),
    'VOL-008': (
        "Entity {entity} made {peak_count} calls during {hour_start}–{hour_end} "
        "(Z-score: {z:.2f}). Baseline: {mean:.1f} calls/hour (σ={std:.1f}). "
        "This {z:.1f}σ spike is statistically extreme and consistent with mass-victim contact."
    ),
}

def generate_summary(rule_id: str, data: dict) -> str:
    template = TEMPLATES.get(rule_id, "Rule {rule_id} triggered.")
    
    # Handle missing keys gracefully by falling back to empty string or default
    from collections import defaultdict
    safe_data = defaultdict(str, data)
    
    # Python format() requires exact keys, so we only format if it matches, or we format carefully
    try:
        return template.format(**data)
    except KeyError as e:
        # Fallback if a template key is missing
        return f"Rule {rule_id} triggered. [Incomplete Data: missing {e}]"

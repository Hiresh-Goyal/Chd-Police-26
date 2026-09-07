from backend.detection.engine import FindingResult

def generate_summary(finding: FindingResult, event_data: dict) -> str:
    """
    Use Python f-strings, not LLM.
    Returns a human-readable explanation based on the rule_id.
    """
    if finding.rule_id == "CTN-001":
        return f"Between {event_data.get('ts_start', '?')} and {event_data.get('ts_end', '?')}, entity {event_data.get('actor_id', '?')} made {event_data.get('call_count', 0)} calls to {event_data.get('peer_id', '?')} immediately preceding {event_data.get('transfer_count', 0)} bank transfers totalling {event_data.get('total_amount', 0)}. Rule CTN-001 triggered. Confidence: {finding.confidence}."
    elif finding.rule_id == "SIM-002":
        return f"Device {event_data.get('device_id', '?')} associated with {event_data.get('msisdn_count', 0)} distinct MSISDNs in a 7-day window. Rule SIM-002 triggered. Confidence: {finding.confidence}."
    elif finding.rule_id == "MUL-003":
        return f"Account {event_data.get('account', '?')} received transfers from {event_data.get('source_count', 0)} distinct sources and transferred out >80% within 24h. Rule MUL-003 triggered. Confidence: {finding.confidence}."
    else:
        return f"Rule {finding.rule_id} triggered with severity {finding.severity}. Confidence: {finding.confidence}."

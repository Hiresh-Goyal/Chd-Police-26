import requests
import json

BASE = "http://localhost:8000/api"

# 1. Login
r = requests.post(f"{BASE}/auth/login",
    json={"username": "admin", "password": "sentinel_admin"})
assert r.status_code == 200, f"Login failed: {r.text}"
token = r.json()["access_token"]
H = {"Authorization": f"Bearer {token}"}
print("✅ Login OK")

# 2. Create case
r = requests.post(f"{BASE}/cases",
    json={"title": "Operation Phantom Ledger", "description": "Demo case"},
    headers=H)
assert r.status_code in (200, 201), f"Case creation failed: {r.text}"
case_id = r.json()["id"]
print(f"✅ Case created: {case_id}")

# 3. Upload all 4 demo files
for fname, ftype in [
    ("cdr.csv",    "CDR"),
    ("bank.csv",   "BANK"),
    ("ipdr.csv",   "IPDR"),
    ("social.csv", "SOCIAL"),
]:
    with open(f"demo_data/{fname}", "rb") as f:
        r = requests.post(
            f"{BASE}/cases/{case_id}/upload",
            files={"file": f},
            data={"file_type": ftype},
            headers=H,
        )
    assert r.status_code == 200, f"Upload {fname} failed: {r.text}"
    result = r.json()
    print(f"✅ Uploaded {fname}: {result['events_created']} events")

# 4. Run analysis
r = requests.post(f"{BASE}/cases/{case_id}/analyze", headers=H)
assert r.status_code in (200, 202), f"Analysis failed: {r.text}"
result = r.json()
print(f"✅ Analysis: {result['findings_created']} findings, score {result['fraud_score']}")

# 5. Verify rules fired
r = requests.get(f"{BASE}/cases/{case_id}/alerts", headers=H)
assert r.status_code == 200, f"Alerts fetch failed: {r.text}"
alerts = r.json()
rule_ids = [a["rule_id"] for a in alerts]
print(f"✅ Rules fired: {rule_ids}")

expected_rules = ["CTN-001", "SIM-002", "MUL-003", "COO-004", "FSM-005"]
for rule in expected_rules:
    status = "✅" if rule in rule_ids else "❌ MISSING"
    print(f"  {status} {rule}")
    assert rule in rule_ids, f"❌ Required rule {rule} is missing from alerts"

# 6. Verify fraud score
r = requests.get(f"{BASE}/cases/{case_id}/fraudscore", headers=H)
assert r.status_code == 200, f"FraudScore fetch failed: {r.text}"
score = r.json()
print(f"✅ FraudScore: {score['score']} — {score['risk_level']}")
assert score["score"] >= 70, f"❌ Score too low: {score['score']}"

# 7. Verify evidence chain on top alert
assert len(alerts) > 0, "❌ No alerts returned"
top_alert_id = alerts[0]["id"]
r = requests.get(f"{BASE}/cases/{case_id}/alerts/{top_alert_id}", headers=H)
assert r.status_code == 200, f"Alert detail fetch failed: {r.text}"
detail = r.json()
assert len(detail["event_ids"]) > 0, "❌ No event_ids in finding"
assert len(detail["source_file_ids"]) > 0, "❌ No source_file_ids in finding"
assert len(detail["source_rows"]) > 0, "❌ No source_rows in finding"
print("✅ Evidence chain: Alert → Finding → Events → Raw records")

# 8. Verify audit log
r = requests.get(f"{BASE}/audit/logs?case_id={case_id}", headers=H)
assert r.status_code == 200, f"Audit logs fetch failed: {r.text}"
logs = r.json()
actions = [l["action"] for l in logs]
print(f"✅ Audit log entries: {actions}")
for expected in ["LOGIN", "UPLOAD", "ANALYZE"]:
    status = "✅" if expected in actions else "❌ MISSING"
    print(f"  {status} {expected}")
    assert expected in actions, f"❌ Required audit action {expected} is missing from audit logs"

# 9. Save demo snapshot
r = requests.get(f"{BASE}/cases/{case_id}/report", headers=H)
assert r.status_code == 200, f"Report fetch failed: {r.text}"
with open("demo_data/snapshot.json", "w") as f:
    json.dump({"case_id": case_id, "report": r.json()}, f, indent=2)
print("✅ Snapshot saved to demo_data/snapshot.json")

print("\n🎯 All checks passed. Ready for demo.")

import requests
import json
import time

BASE_URL = "http://localhost:8000/api"

print("1. Creating a new Case...")
res = requests.post(f"{BASE_URL}/cases", json={
    "title": "Operation Phantom Ledger - API Test",
    "description": "Automated data upload to verify the pipeline."
})
case = res.json()
case_id = case['id']
print(f"Created case ID: {case_id}")

files_to_upload = [
    ("demo_data/cdr.csv", "CDR"),
    ("demo_data/ipdr.csv", "IPDR"),
    ("demo_data/bank.csv", "BANK"),
    ("demo_data/social.csv", "SOCIAL")
]

print("\n2. Uploading Data Sources...")
for filepath, file_type in files_to_upload:
    print(f"Uploading {filepath} as {file_type}...")
    with open(filepath, 'rb') as f:
        files = {'file': (filepath.split('/')[-1], f, 'text/csv')}
        data = {'file_type': file_type}
        upload_res = requests.post(f"{BASE_URL}/cases/{case_id}/upload", files=files, data=data)
        if upload_res.status_code == 200:
            print(f" -> Success: {upload_res.json()}")
        else:
            print(f" -> Error: {upload_res.text}")

print("\n3. Running Analytics Engine (Resolution & Detection)...")
start = time.time()
analyze_res = requests.post(f"{BASE_URL}/cases/{case_id}/analyze")
elapsed = time.time() - start

if analyze_res.status_code == 200:
    stats = analyze_res.json()
    print(f"\n✅ Analysis Complete in {elapsed:.2f} seconds!")
    print(f"  - Entities Resolved: {stats['entities_created']}")
    print(f"  - Entity Links Created: {stats['links_created']}")
    print(f"  - Fraud Episodes (Clusters): {stats['episodes_created']}")
    print(f"  - Suspicious Findings: {stats['findings_created']}")
    print(f"  - Total Fraud Score: {stats['fraud_score']} ({stats['risk_level']})")
else:
    print(f"Error during analysis: {analyze_res.text}")

import csv
import random
from datetime import datetime, timedelta
import os

os.makedirs('demo_data', exist_ok=True)

# Identities
C_MSISDN_1 = '9999911111'
C_MSISDN_2 = '9999922222'
C_MSISDN_3 = '9999933333'
C_IMEI = '358123456789012'

V1 = '8888811111'
V2 = '8888822222'
V3 = '8888833333'
V4 = '8888844444'
V5 = '8888855555'

M1 = 'ACC-M001'
M2 = 'ACC-M002'
M3 = 'ACC-M003'

A1 = 'ACC-A001'

V_ACCOUNTS = {V1: 'ACC-V001', V2: 'ACC-V002', V3: 'ACC-V003', V4: 'ACC-V004', V5: 'ACC-V005'}

# 1. CDR Data
cdr_rows = []
cdr_rows.append([C_MSISDN_1, V1, C_IMEI, 'TW-CH-001', '2026-01-09 14:23:00', 120, 'CALL'])
cdr_rows.append([C_MSISDN_1, V2, C_IMEI, 'TW-CH-001', '2026-01-09 09:15:00', 300, 'CALL'])
cdr_rows.append([C_MSISDN_2, V3, C_IMEI, 'TW-CH-002', '2026-01-09 11:30:00', 180, 'CALL'])
cdr_rows.append([C_MSISDN_3, V4, C_IMEI, 'TW-CH-003', '2026-01-10 10:00:00', 200, 'CALL'])
cdr_rows.append([C_MSISDN_3, V5, C_IMEI, 'TW-CH-001', '2026-01-10 15:00:00', 150, 'CALL'])

# VOL-008: 18 calls in 14:00-15:00 on 2026-01-09
base_ts = datetime(2026, 1, 9, 14, 0, 0)
for i in range(18):
    ts = base_ts + timedelta(minutes=i*2)
    peer = f'7777700{i:03d}'
    cdr_rows.append([C_MSISDN_1, peer, C_IMEI, 'TW-CH-001', ts.strftime('%Y-%m-%d %H:%M:%S'), 45, 'CALL'])

# Background noise
start_date = datetime(2026, 1, 1)
for i in range(400):
    ts = start_date + timedelta(days=random.randint(0, 10), hours=random.randint(8, 20), minutes=random.randint(0, 59))
    msisdn = f'666660{random.randint(100, 999)}'
    peer = f'666661{random.randint(100, 999)}'
    imei = f'358{random.randint(10000000000, 99999999999)}'
    tower = f'TW-CH-00{random.randint(1, 8)}'
    cdr_rows.append([msisdn, peer, imei, tower, ts.strftime('%Y-%m-%d %H:%M:%S'), random.randint(10, 300), 'CALL'])

with open('demo_data/cdr.csv', 'w', newline='') as f:
    writer = csv.writer(f)
    writer.writerow(['msisdn','peer_msisdn','imei','tower_id','ts_start','duration_sec','call_type'])
    writer.writerows(cdr_rows)

# 2. Bank Data
bank_rows = []
bank_rows.append([V_ACCOUNTS[V1], M1, 9999.00, '2026-01-09 14:51:00', 'DEBIT', 'REF-001'])
bank_rows.append([M1, V_ACCOUNTS[V1], 9999.00, '2026-01-09 14:51:00', 'CREDIT', 'REF-001'])

bank_rows.append([V_ACCOUNTS[V2], M1, 9998.00, '2026-01-09 09:37:00', 'DEBIT', 'REF-002'])
bank_rows.append([M1, V_ACCOUNTS[V2], 9998.00, '2026-01-09 09:37:00', 'CREDIT', 'REF-002'])

bank_rows.append([V_ACCOUNTS[V3], M2, 9750.00, '2026-01-09 11:52:00', 'DEBIT', 'REF-003'])
bank_rows.append([M2, V_ACCOUNTS[V3], 9750.00, '2026-01-09 11:52:00', 'CREDIT', 'REF-003'])

bank_rows.append([V_ACCOUNTS[V4], M2, 9500.00, '2026-01-10 10:22:00', 'DEBIT', 'REF-004'])
bank_rows.append([M2, V_ACCOUNTS[V4], 9500.00, '2026-01-10 10:22:00', 'CREDIT', 'REF-004'])

bank_rows.append([V_ACCOUNTS[V5], M3, 9999.00, '2026-01-10 15:25:00', 'DEBIT', 'REF-005'])
bank_rows.append([M3, V_ACCOUNTS[V5], 9999.00, '2026-01-10 15:25:00', 'CREDIT', 'REF-005'])

bank_rows.append([M1, A1, 18500.00, '2026-01-09 23:00:00', 'DEBIT', 'REF-006'])
bank_rows.append([A1, M1, 18500.00, '2026-01-09 23:00:00', 'CREDIT', 'REF-006'])

bank_rows.append([M2, A1, 18000.00, '2026-01-10 18:00:00', 'DEBIT', 'REF-007'])
bank_rows.append([A1, M2, 18000.00, '2026-01-10 18:00:00', 'CREDIT', 'REF-007'])

bank_rows.append([M3, A1, 9200.00, '2026-01-11 10:00:00', 'DEBIT', 'REF-008'])
bank_rows.append([A1, M3, 9200.00, '2026-01-11 10:00:00', 'CREDIT', 'REF-008'])

# Some background
for i in range(50):
    ts = start_date + timedelta(days=random.randint(0, 10), hours=random.randint(8, 20))
    acc1 = f'ACC-B{random.randint(100, 999)}'
    acc2 = f'ACC-B{random.randint(100, 999)}'
    amt = random.randint(100, 5000)
    ref = f'REF-B{i}'
    bank_rows.append([acc1, acc2, amt, ts.strftime('%Y-%m-%d %H:%M:%S'), 'DEBIT', ref])
    bank_rows.append([acc2, acc1, amt, ts.strftime('%Y-%m-%d %H:%M:%S'), 'CREDIT', ref])

with open('demo_data/bank.csv', 'w', newline='') as f:
    writer = csv.writer(f)
    writer.writerow(['account','peer_account','amount','ts','txn_type','ref_id'])
    writer.writerows(bank_rows)

# 3. IPDR Data
ipdr_rows = []
ipdr_rows.append([C_MSISDN_1, '10.0.0.5', '45.142.212.100', '2026-01-09 14:20:00', '2026-01-09 14:28:00', 5000, 5000, 5060])
ipdr_rows.append([C_MSISDN_1, '10.0.0.5', '45.142.212.100', '2026-01-09 09:13:00', '2026-01-09 09:21:00', 5000, 5000, 5060])
ipdr_rows.append([C_MSISDN_2, '10.0.0.6', '45.142.212.100', '2026-01-09 11:28:00', '2026-01-09 11:35:00', 5000, 5000, 5060])
ipdr_rows.append([C_MSISDN_3, '10.0.0.7', '45.142.212.100', '2026-01-10 09:58:00', '2026-01-10 10:05:00', 5000, 5000, 5060])
ipdr_rows.append([C_MSISDN_3, '10.0.0.7', '45.142.212.100', '2026-01-10 14:58:00', '2026-01-10 15:05:00', 5000, 5000, 5060])

with open('demo_data/ipdr.csv', 'w', newline='') as f:
    writer = csv.writer(f)
    writer.writerow(['msisdn','src_ip','dst_ip','ts_start','ts_end','bytes_up','bytes_down','dst_port'])
    writer.writerows(ipdr_rows)

# 4. Social Data
social_rows = []
social_rows.append(['TELEGRAM', 'C-001', C_MSISDN_1, 'Join our part time job', '2026-01-05 10:00:00', 'RECRUITMENT'])
social_rows.append(['TELEGRAM', 'C-001', C_MSISDN_1, 'Make 5k today', '2026-01-06 11:00:00', 'RECRUITMENT'])
social_rows.append(['TELEGRAM', 'V-001-TG', V1, 'I am interested', '2026-01-08 14:00:00', 'DM'])

with open('demo_data/social.csv', 'w', newline='') as f:
    writer = csv.writer(f)
    writer.writerow(['platform','user_id','phone','content','ts','interaction_type'])
    writer.writerows(social_rows)

# README.md
with open('demo_data/README.md', 'w') as f:
    f.write("""# Demo Data - Operation Phantom Ledger

## Scenarios
- C-001 recruits V-001 to V-005 via Telegram.
- C-001 uses 3 different SIM cards on the same device (IMEI).
- Bank transfers are made to mule accounts M-001, M-002, M-003, and then aggregated to A-001.

## Rules Triggered
- CTN-001: Calls from C-001 to victims immediately preceding bank transfers.
- SIM-002: C-001 changing SIM cards on the same IMEI within 7 days.
- MUL-003: Accounts receiving and forwarding money rapidly (Mules).
- COO-004: C-001 acting as coordinator calling multiple non-connected victims.
- FSM-005: (Not explicit in this script, requires first_seen logic).
- AMT-006: Transfers grouped around Rs 9,999.
- IFR-007: VoIP calls (IPDR overlap with CDR).
- VOL-008: C-001 making 18 calls in an hour on 2026-01-09.
""")

print("Demo data generated successfully.")

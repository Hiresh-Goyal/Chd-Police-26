# Operation Phantom Ledger — Demo Dataset

Synthetic dataset for end-to-end testing of the DigitalSentinel pipeline.
All MSISDNs use 10-digit normalised format. All timestamps are UTC ISO-8601.

## Cast

| Role        | ID    | MSISDNs                               | IMEI              | Accounts  |
|-------------|-------|---------------------------------------|-------------------|-----------|
| Victim 1    | V-001 | 9700000001                            | —                 | ACC-V001  |
| Victim 2    | V-002 | 9700000002                            | —                 | ACC-V002  |
| Victim 3    | V-003 | 9700000003                            | —                 | ACC-V003  |
| Victim 4    | V-004 | 9700000004                            | —                 | ACC-V004  |
| Victim 5    | V-005 | 9700000005                            | —                 | ACC-V005  |
| Coordinator | C-001 | 9800000001, 9800000002, 9800000003    | 352100000000001   | —         |
| Mule 1      | M-001 | 9900000001                            | 352200000000001   | ACC-M001  |
| Mule 2      | M-002 | 9900000002                            | —                 | ACC-M002  |
| Mule 3      | M-003 | 9900000003                            | —                 | ACC-M003  |
| Aggregator  | A-001 | —                                     | —                 | ACC-A001  |
| VoIP Infra  | I-001 | —                                     | —                 | IP: 45.133.200.88 |

## Timeline

| Date       | Key events                                                              |
|------------|-------------------------------------------------------------------------|
| 2025-01-07 | M-001 first CDR appearance (FSM-005). TG_C001 contacts V-003.          |
| 2025-01-08 | C-001 (SIM1) calls V-003 → V-003 transfers ₹9,750 to M-002.           |
|            | TG_C001 contacts V-004, V-005.                                         |
| 2025-01-09 | C-001 (SIM2) calls V-004, V-005 + 16 filler calls (VOL-008: 18 total). |
|            | V-004 → M-002 ₹9,500. V-005 → M-003 ₹9,999. TG_C001 contacts V-001/V-002. |
| 2025-01-10 | C-001 (SIM3) calls V-001, V-002. V-001 → M-001 ₹9,999. V-002 → M-001 ₹9,998. |
|            | Mules forward 90%+ to A-001.                                           |

## Pattern ↔ Row Mapping

### cdr.csv (22 rows)

| Pattern  | Rule Description          | Triggering Rows (0-indexed)                        | Details                                              |
|----------|---------------------------|----------------------------------------------------|------------------------------------------------------|
| CTN-001  | Call→Transfer chain       | 1 (V-003), 2 (V-004), 12 (V-005), 20 (V-001), 21 (V-002) | Each call is 25–30 min before corresponding bank.csv transfer |
| SIM-002  | IMEI-based SIM switching  | 1 (Jan 8, SIM1), 2–19 (Jan 9, SIM2), 20–21 (Jan 10, SIM3) | All use IMEI 352100000000001                         |
| COO-004  | Coordinator centrality    | 1, 2, 12, 20, 21                                   | C-001 calls ALL 5 victims; no victim→victim calls    |
| VOL-008  | High-volume burst         | 2–19                                                | 18 calls from 9800000002 between 14:00–15:00 on Jan 9|

### bank.csv (16 rows)

| Pattern  | Rule Description          | Triggering Rows (0-indexed)                        | Details                                              |
|----------|---------------------------|----------------------------------------------------|------------------------------------------------------|
| CTN-001  | Call→Transfer timing      | 0–4 (victim DEBITs)                                | 27min (V-003), 28min (V-004), 26min (V-005), 26min (V-001), 29min (V-002) |
| AMT-006  | Sub-₹10k amount pattern   | 0–4                                                | ₹9,750 / ₹9,500 / ₹9,999 / ₹9,999 / ₹9,998         |
| MUL-003  | Mule layering             | 5–9 (mule credits), 10–12 (mule→aggregator debits) | M-001: ₹18,000/₹19,997=90.0%. M-002: ₹17,325/₹19,250=90.0%. M-003: ₹9,099/₹9,999=91.0% |
| FSM-005  | Fresh SIM + mule account  | 8 (first credit to ACC-M001)                       | M-001 MSISDN first in CDR on Jan 7 (row 0 of cdr.csv), first inbound transfer on Jan 10 |

### ipdr.csv (10 rows)

| Pattern  | Rule Description          | Triggering Rows (0-indexed)                        | Details                                              |
|----------|---------------------------|----------------------------------------------------|------------------------------------------------------|
| IFR-007  | VoIP infrastructure use   | 0–4                                                | C-001 sessions to 45.133.200.88 within ±15 min of each victim call |

Row details:
- Row 0: SIM1 → 45.133.200.88 at 10:50 (V-003 call at 11:00, Δ=10 min)
- Row 1: SIM2 → 45.133.200.88 at 13:50 (V-004 call at 14:00, Δ=10 min)
- Row 2: SIM2 → 45.133.200.88 at 14:20 (V-005 call at 14:30, Δ=10 min)
- Row 3: SIM3 → 45.133.200.88 at 09:50 (V-001 call at 10:00, Δ=10 min)
- Row 4: SIM3 → 45.133.200.88 at 10:50 (V-002 call at 11:00, Δ=10 min)

### social.csv (11 rows)

| Pattern  | Rule Description            | Triggering Rows (0-indexed) | Details                                            |
|----------|-----------------------------|-----------------------------|---------------------------------------------------|
| S-001    | Pre-call social contact     | 0–10                        | TG_C001 contacts each victim via Telegram the day before C-001 calls them |

Victim contact timeline:
- V-003: social Jan 7 (row 1–2) → called Jan 8
- V-004: social Jan 8 (row 3–4) → called Jan 9
- V-005: social Jan 8 (row 5–6) → called Jan 9
- V-001: social Jan 9 (row 7–8) → called Jan 10
- V-002: social Jan 9 (row 9–10) → called Jan 10

## Cross-file Pattern Summary

| Rule ID  | Name                     | Files involved       | Confidence |
|----------|--------------------------|----------------------|------------|
| CTN-001  | Call→Transfer chain      | cdr.csv + bank.csv   | HIGH       |
| SIM-002  | IMEI-based SIM switching | cdr.csv              | CONFIRMED  |
| MUL-003  | Mule money layering      | bank.csv             | HIGH       |
| COO-004  | Coordinator centrality   | cdr.csv              | CONFIRMED  |
| FSM-005  | Fresh SIM mule account   | cdr.csv + bank.csv   | PROBABLE   |
| AMT-006  | Sub-₹10k amount evasion  | bank.csv             | CONFIRMED  |
| IFR-007  | VoIP infrastructure use  | ipdr.csv + cdr.csv   | HIGH       |
| VOL-008  | High-volume call burst   | cdr.csv              | CONFIRMED  |
| S-001    | Pre-call social grooming | social.csv + cdr.csv | PROBABLE   |

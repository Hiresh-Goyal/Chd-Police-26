# Demo Data - Operation Phantom Ledger

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

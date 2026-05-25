import json
import random
import uuid
from datetime import datetime, timedelta
import os

# Ensure data directory exists
os.makedirs("app/data", exist_ok=True)
FILE_PATH = "app/data/enterprise_telemetry.jsonl"

# ─────────────────────────────────────────────
# Realism Data Pools
# ─────────────────────────────────────────────
NORMAL_USERS   = [f"user_{i}@company.local" for i in range(1, 20)]
ATTACK_IPS     = {
    "mfa_fatigue":   "185.150.14.22",   # Threat Actor 1
    "brute_force":   "45.33.12.79",     # Threat Actor 2
    "full_breach":   "194.1.200.5",     # Threat Actor 3 (Critical)
    "lateral_move":  "10.0.0.87",       # Internal pivot host
    "c2_beacon":     "91.213.50.14",    # Known C2 server
    "exfil":         "185.220.101.55",  # TOR exit node / exfil destination
    "ransomware":    "194.1.200.5",     # Same actor as breach (pivot)
}
NORMAL_IPS     = [f"192.168.1.{i}" for i in range(10, 50)]
INTERNAL_HOSTS = [f"WKSTN-{i:03d}" for i in range(1, 30)]
DOMAIN         = "company.local"

logs = []
now  = datetime.utcnow()


# ─────────────────────────────────────────────
# Helper
# ─────────────────────────────────────────────
def add_log(ts, source, evt_type, user, ip, raw,
            thread_id=None, severity="LOW",
            hostname=None, dest_ip=None, dest_port=None,
            bytes_out=None, process=None, extra=None):
    entry = {
        "source":     source,
        "event_type": evt_type,
        "severity":   severity,
        "username":   user,
        "src_ip":     ip,
        "raw":        raw,
        "ts":         ts.isoformat(),
    }
    if thread_id:   entry["thread_id"]   = thread_id
    if hostname:    entry["hostname"]    = hostname
    if dest_ip:     entry["dest_ip"]     = dest_ip
    if dest_port:   entry["dest_port"]   = dest_port
    if bytes_out:   entry["bytes_out"]   = bytes_out
    if process:     entry["process"]     = process
    if extra:       entry.update(extra)
    logs.append(entry)


# ─────────────────────────────────────────────
# 1. BACKGROUND NOISE  (1 200 events / 24 h)
# ─────────────────────────────────────────────
print("Generating 24 hours of background enterprise noise...")
for _ in range(1200):
    user = random.choice(NORMAL_USERS)
    ip   = random.choice(NORMAL_IPS)
    ts   = now - timedelta(hours=random.randint(0, 23), minutes=random.randint(0, 59))
    if random.random() > 0.1:
        add_log(ts, "cisco_asa", "LOGIN_SUCCESS", user, ip,
                f"%ASA-6-113008: AAA transaction status ACCEPT : user = {user}")
    else:
        add_log(ts, "cisco_asa", "LOGIN_FAIL", user, ip,
                f"%ASA-6-113015: AAA user authentication Rejected : "
                f"reason = User not found : server = 10.0.0.1 : user = {user}")


# ─────────────────────────────────────────────
# ATTACK 1 — Low & Slow MFA Fatigue  (MEDIUM)
# Thread: T-MFA-001
# ─────────────────────────────────────────────
print("Injecting Attack 1: Low & Slow MFA Fatigue (Medium)...")
TID_MFA   = "T-MFA-001"
mfa_time  = now - timedelta(hours=2)
for i in range(4):
    add_log(mfa_time + timedelta(seconds=i * 30),
            "okta_sso", "MFA_PUSH_DENIED", "user_5@company.local",
            ATTACK_IPS["mfa_fatigue"],
            f"Okta Verify Push Denied by user. Attempt {i+1}/4",
            thread_id=TID_MFA, severity="MEDIUM",
            extra={"mitre_technique": "T1621", "tactic": "Credential Access"})

# After 4 denies the user finally approves (fatigue)
add_log(mfa_time + timedelta(minutes=3),
        "okta_sso", "MFA_PUSH_APPROVED", "user_5@company.local",
        ATTACK_IPS["mfa_fatigue"],
        "Okta Verify Push ACCEPTED — user approved after repeated prompts.",
        thread_id=TID_MFA, severity="HIGH",
        extra={"mitre_technique": "T1621", "tactic": "Credential Access",
               "note": "Possible MFA fatigue — user approved after 4 denials"})

add_log(mfa_time + timedelta(minutes=3, seconds=15),
        "okta_sso", "SESSION_CREATED", "user_5@company.local",
        ATTACK_IPS["mfa_fatigue"],
        "New Okta session created from anomalous IP.",
        thread_id=TID_MFA, severity="HIGH",
        extra={"mitre_technique": "T1078", "tactic": "Initial Access"})


# ─────────────────────────────────────────────
# ATTACK 2 — Aggressive Brute Force  (HIGH)
# Thread: T-BRF-002
# ─────────────────────────────────────────────
print("Injecting Attack 2: Aggressive Brute Force (High)...")
TID_BRF   = "T-BRF-002"
brute_time = now - timedelta(hours=1)
for i in range(8):
    add_log(brute_time + timedelta(seconds=i * 10),
            "cisco_asa", "LOGIN_FAIL", "user_12@company.local",
            ATTACK_IPS["brute_force"],
            "AAA user authentication Rejected : reason = AAA failure",
            thread_id=TID_BRF, severity="HIGH",
            extra={"mitre_technique": "T1110.001", "tactic": "Credential Access",
                   "attempt": i + 1})

# Account lockout triggered
add_log(brute_time + timedelta(seconds=90),
        "windows_wineventlog", "ACCOUNT_LOCKOUT", "user_12@company.local",
        ATTACK_IPS["brute_force"],
        "EventCode=4740 A user account was locked out. Account: user_12",
        thread_id=TID_BRF, severity="HIGH",
        extra={"mitre_technique": "T1110", "tactic": "Credential Access"})


# ─────────────────────────────────────────────
# ATTACK 3 — Brute Force → Login → Priv Esc  (CRITICAL)
# Thread: T-CRT-003
# ─────────────────────────────────────────────
print("Injecting Attack 3: Brute Force → Login → Priv Esc (Critical)...")
TID_CRT   = "T-CRT-003"
crit_time = now - timedelta(minutes=45)
for i in range(6):
    add_log(crit_time + timedelta(seconds=i * 5),
            "cisco_asa", "LOGIN_FAIL", "admin_jsmith",
            ATTACK_IPS["full_breach"],
            "AAA user authentication Rejected",
            thread_id=TID_CRT, severity="HIGH",
            extra={"mitre_technique": "T1110.001", "tactic": "Credential Access"})

add_log(crit_time + timedelta(seconds=40),
        "cisco_asa", "LOGIN_SUCCESS", "admin_jsmith",
        ATTACK_IPS["full_breach"],
        "AAA transaction status ACCEPT — admin_jsmith authenticated from external IP.",
        thread_id=TID_CRT, severity="CRITICAL",
        extra={"mitre_technique": "T1078", "tactic": "Initial Access",
               "note": "Admin login after brute-force from non-corporate IP"})

add_log(crit_time + timedelta(minutes=2),
        "windows_wineventlog", "PRIV_ESC", "admin_jsmith",
        ATTACK_IPS["full_breach"],
        "EventCode=4728 A member was added to Domain Admins group. Member: admin_jsmith",
        thread_id=TID_CRT, severity="CRITICAL",
        hostname="DC01", dest_ip="10.0.0.1",
        extra={"mitre_technique": "T1078.002", "tactic": "Privilege Escalation"})


# ─────────────────────────────────────────────
# ATTACK 4 — Lateral Movement via SMB  (HIGH)
# Thread: T-LAT-004  (continues from T-CRT-003 actor)
# ─────────────────────────────────────────────
print("Injecting Attack 4: Lateral Movement via SMB (High)...")
TID_LAT   = "T-LAT-004"
lat_time  = crit_time + timedelta(minutes=5)
pivot_hosts = random.sample(INTERNAL_HOSTS, 5)

for i, host in enumerate(pivot_hosts):
    add_log(lat_time + timedelta(minutes=i * 2),
            "windows_wineventlog", "SMB_LATERAL", "admin_jsmith",
            ATTACK_IPS["lateral_move"],
            f"EventCode=4624 Logon Type 3 (Network) — admin_jsmith accessed \\\\{host}\\C$",
            thread_id=TID_LAT, severity="HIGH",
            hostname=host, dest_ip=f"10.0.1.{10+i}", dest_port=445,
            extra={"mitre_technique": "T1021.002", "tactic": "Lateral Movement",
                   "share": f"\\\\{host}\\C$"})

# PsExec-style remote execution on one host
add_log(lat_time + timedelta(minutes=11),
        "windows_wineventlog", "REMOTE_EXEC", "admin_jsmith",
        ATTACK_IPS["lateral_move"],
        f"EventCode=7045 New service installed: PSEXESVC on {pivot_hosts[-1]}",
        thread_id=TID_LAT, severity="CRITICAL",
        hostname=pivot_hosts[-1], process="PSEXESVC.exe",
        extra={"mitre_technique": "T1569.002", "tactic": "Execution"})


# ─────────────────────────────────────────────
# ATTACK 5 — C2 Beacon (periodic outbound)  (HIGH)
# Thread: T-C2-005
# ─────────────────────────────────────────────
print("Injecting Attack 5: C2 Beacon Traffic (High)...")
TID_C2    = "T-C2-005"
c2_start  = now - timedelta(hours=3)
# Regular 5-minute beacons — classic C2 jitter ~±15s
for i in range(18):
    jitter = random.randint(-15, 15)
    ts_c2  = c2_start + timedelta(minutes=i * 5, seconds=jitter)
    host   = pivot_hosts[0]
    add_log(ts_c2,
            "palo_alto_ngfw", "OUTBOUND_C2", "SYSTEM",
            host,   # src is internal host (post-pivot)
            f"TRAFFIC ALLOW {host} -> {ATTACK_IPS['c2_beacon']}:443 "
            f"bytes={random.randint(200, 450)} proto=HTTPS",
            thread_id=TID_C2, severity="HIGH",
            hostname=host, dest_ip=ATTACK_IPS["c2_beacon"], dest_port=443,
            bytes_out=random.randint(200, 450),
            extra={"mitre_technique": "T1071.001", "tactic": "Command and Control",
                   "beacon_interval_s": 300, "note": "Regular interval — possible C2 beacon"})


# ─────────────────────────────────────────────
# ATTACK 6 — Credential Dumping (LSASS)  (CRITICAL)
# Thread: T-CRD-006  (continues from T-LAT-004 host)
# ─────────────────────────────────────────────
print("Injecting Attack 6: Credential Dumping via LSASS (Critical)...")
TID_CRD   = "T-CRD-006"
cred_time = lat_time + timedelta(minutes=14)
dump_host = pivot_hosts[1]

add_log(cred_time,
        "windows_sysmon", "PROCESS_ACCESS", "admin_jsmith",
        ATTACK_IPS["lateral_move"],
        f"EventCode=10 Process accessed lsass.exe — SourceImage: mimikatz.exe on {dump_host}",
        thread_id=TID_CRD, severity="CRITICAL",
        hostname=dump_host, process="mimikatz.exe",
        extra={"mitre_technique": "T1003.001", "tactic": "Credential Access",
               "target_process": "lsass.exe", "note": "LSASS memory read — credential dumping likely"})

add_log(cred_time + timedelta(seconds=5),
        "windows_sysmon", "FILE_CREATE", "admin_jsmith",
        ATTACK_IPS["lateral_move"],
        f"EventCode=11 File created: C:\\Windows\\Temp\\creds.dmp on {dump_host}",
        thread_id=TID_CRD, severity="CRITICAL",
        hostname=dump_host, process="mimikatz.exe",
        extra={"mitre_technique": "T1003.001", "tactic": "Credential Access",
               "file_path": "C:\\Windows\\Temp\\creds.dmp"})


# ─────────────────────────────────────────────
# ATTACK 7 — Data Exfiltration via DNS Tunneling  (CRITICAL)
# Thread: T-EXF-007
# ─────────────────────────────────────────────
print("Injecting Attack 7: Data Exfiltration via DNS Tunneling (Critical)...")
TID_EXF   = "T-EXF-007"
exfil_time = cred_time + timedelta(minutes=10)

for i in range(20):
    # Encoded DNS TXT queries — exfil via subdomain labels
    encoded_chunk = uuid.uuid4().hex[:24]
    add_log(exfil_time + timedelta(seconds=i * 8),
            "infoblox_dns", "DNS_TXT_QUERY", "SYSTEM",
            pivot_hosts[1],
            f"DNS TXT query: {encoded_chunk}.exfil.evilc2domain.net from {pivot_hosts[1]}",
            thread_id=TID_EXF, severity="CRITICAL",
            hostname=pivot_hosts[1], dest_ip=ATTACK_IPS["exfil"], dest_port=53,
            bytes_out=random.randint(180, 300),
            extra={"mitre_technique": "T1048.003", "tactic": "Exfiltration",
                   "query_type": "TXT", "note": "High-frequency TXT queries — possible DNS tunneling"})

# Large HTTPS POST to TOR exit node
add_log(exfil_time + timedelta(minutes=3),
        "palo_alto_ngfw", "LARGE_UPLOAD", "admin_jsmith",
        pivot_hosts[1],
        f"TRAFFIC ALLOW {pivot_hosts[1]} -> {ATTACK_IPS['exfil']}:443 bytes=54000000",
        thread_id=TID_EXF, severity="CRITICAL",
        hostname=pivot_hosts[1], dest_ip=ATTACK_IPS["exfil"], dest_port=443,
        bytes_out=54_000_000,
        extra={"mitre_technique": "T1041", "tactic": "Exfiltration",
               "note": "54 MB upload to TOR exit node IP"})


# ─────────────────────────────────────────────
# ATTACK 8 — Ransomware Precursor  (CRITICAL)
# Thread: T-RNS-008
# ─────────────────────────────────────────────
print("Injecting Attack 8: Ransomware Precursor — Shadow Copy Deletion (Critical)...")
TID_RNS   = "T-RNS-008"
rns_time  = exfil_time + timedelta(minutes=5)
rnw_host  = pivot_hosts[2]

# Shadow copy deletion
add_log(rns_time,
        "windows_wineventlog", "SHADOW_DELETE", "admin_jsmith",
        ATTACK_IPS["ransomware"],
        f"EventCode=4688 New process: vssadmin.exe delete shadows /all /quiet on {rnw_host}",
        thread_id=TID_RNS, severity="CRITICAL",
        hostname=rnw_host, process="vssadmin.exe",
        extra={"mitre_technique": "T1490", "tactic": "Impact",
               "cmdline": "vssadmin delete shadows /all /quiet",
               "note": "VSS deletion — common ransomware precursor"})

# wbadmin backup catalog delete
add_log(rns_time + timedelta(seconds=10),
        "windows_wineventlog", "BACKUP_DELETE", "admin_jsmith",
        ATTACK_IPS["ransomware"],
        f"EventCode=4688 New process: wbadmin delete catalog -quiet on {rnw_host}",
        thread_id=TID_RNS, severity="CRITICAL",
        hostname=rnw_host, process="wbadmin.exe",
        extra={"mitre_technique": "T1490", "tactic": "Impact"})

# Mass file rename (.locked extension)
for i in range(10):
    add_log(rns_time + timedelta(seconds=20 + i * 3),
            "windows_sysmon", "FILE_RENAME", "admin_jsmith",
            ATTACK_IPS["ransomware"],
            f"EventCode=11 File renamed: document_{i}.docx -> document_{i}.docx.locked on {rnw_host}",
            thread_id=TID_RNS, severity="CRITICAL",
            hostname=rnw_host, process="encrypt_stage2.exe",
            extra={"mitre_technique": "T1486", "tactic": "Impact",
                   "note": "Mass file rename with .locked extension"})

# Ransom note drop
add_log(rns_time + timedelta(minutes=1),
        "windows_sysmon", "FILE_CREATE", "admin_jsmith",
        ATTACK_IPS["ransomware"],
        f"EventCode=11 File created: C:\\Users\\Public\\README_DECRYPT.txt on {rnw_host}",
        thread_id=TID_RNS, severity="CRITICAL",
        hostname=rnw_host, process="encrypt_stage2.exe",
        extra={"mitre_technique": "T1486", "tactic": "Impact",
               "file_path": "C:\\Users\\Public\\README_DECRYPT.txt",
               "note": "Ransom note dropped — active ransomware deployment confirmed"})


# ─────────────────────────────────────────────
# Shuffle & Write
# ─────────────────────────────────────────────
print("Shuffling logs to simulate real-world packet arrival disorder...")
random.shuffle(logs)

with open(FILE_PATH, "w") as f:
    for log in logs:
        f.write(json.dumps(log) + "\n")

print(f"\n✅  Done! Wrote {len(logs)} events to {FILE_PATH}")
print("\n📋  Threat Threads Summary:")
print("  T-MFA-001  │ MEDIUM/HIGH   │ MFA Fatigue → Session Hijack        (user_5)")
print("  T-BRF-002  │ HIGH          │ Brute Force → Account Lockout        (user_12)")
print("  T-CRT-003  │ CRITICAL      │ Brute Force → Admin Login → Priv Esc (admin_jsmith)")
print("  T-LAT-004  │ HIGH/CRITICAL │ SMB Lateral Movement + Remote Exec   (admin_jsmith)")
print("  T-C2-005   │ HIGH          │ C2 Beacon (18 pulses, 5-min interval) (pivot host)")
print("  T-CRD-006  │ CRITICAL      │ LSASS Credential Dump (Mimikatz)      (admin_jsmith)")
print("  T-EXF-007  │ CRITICAL      │ DNS Tunneling + 54MB TOR Upload       (admin_jsmith)")
print("  T-RNS-008  │ CRITICAL      │ Ransomware: VSS del + file encryption (admin_jsmith)")
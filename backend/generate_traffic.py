import json
import random
import uuid
from datetime import datetime, timedelta
import os

# Ensure data directory exists
os.makedirs("app/data", exist_ok=True)
FILE_PATH = "app/data/enterprise_telemetry.jsonl"

# --- Realism Data Pools ---
NORMAL_USERS = [f"user_{i}@company.local" for i in range(1, 20)]
ATTACK_IPS = ["185.150.14.22", "45.33.12.79", "194.1.200.5"]
NORMAL_IPS = [f"192.168.1.{i}" for i in range(10, 50)]

logs = []
now = datetime.utcnow()

def add_log(ts, source, evt_type, user, ip, raw):
    logs.append({
        "source": source, "event_type": evt_type, "username": user, 
        "ip": ip, "raw": raw, "ts": ts.isoformat()
    })

print("Generating 24 hours of background enterprise noise...")
# 1. GENERATE NORMAL NOISE (1000+ events over 24 hours)
for _ in range(1200):
    user = random.choice(NORMAL_USERS)
    ip = random.choice(NORMAL_IPS)
    ts = now - timedelta(hours=random.randint(0, 23), minutes=random.randint(0, 59))
    
    # 90% Success, 10% Typo Fails
    if random.random() > 0.1:
        add_log(ts, "cisco_asa", "LOGIN_SUCCESS", user, ip, f"%ASA-6-113008: AAA transaction status ACCEPT : user = {user}")
    else:
        add_log(ts, "cisco_asa", "LOGIN_FAIL", user, ip, f"%ASA-6-113015: AAA user authentication Rejected : reason = User not found : server = 10.0.0.1 : user = {user}")

print("Injecting Attack 1: Low & Slow MFA Fatigue (Medium Severity)...")
# 2. INCIDENT 1: MFA Fatigue (Target: user_5)
mfa_time = now - timedelta(hours=2)
for i in range(4):
    add_log(mfa_time + timedelta(seconds=i*30), "okta_sso", "MFA_FAIL", "user_5@company.local", ATTACK_IPS[0], "Okta Verify Push Denied by user.")

print("Injecting Attack 2: Aggressive Brute Force (High Severity)...")
# 3. INCIDENT 2: Brute Force without success (Target: user_12)
brute_time = now - timedelta(hours=1)
for i in range(8):
    add_log(brute_time + timedelta(seconds=i*10), "cisco_asa", "LOGIN_FAIL", "user_12@company.local", ATTACK_IPS[1], "AAA user authentication Rejected : reason = AAA failure")

print("Injecting Attack 3: Brute Force -> Success -> Priv Esc (Critical Severity)...")
# 4. INCIDENT 3: Full Breach (Target: admin_jsmith)
crit_time = now - timedelta(minutes=15)
for i in range(6): # The brute force
    add_log(crit_time + timedelta(seconds=i*5), "cisco_asa", "LOGIN_FAIL", "admin_jsmith", ATTACK_IPS[2], "AAA user authentication Rejected")
# The success
add_log(crit_time + timedelta(seconds=40), "cisco_asa", "LOGIN_SUCCESS", "admin_jsmith", ATTACK_IPS[2], "AAA transaction status ACCEPT")
# The privilege escalation
add_log(crit_time + timedelta(minutes=2), "windows_wineventlog", "PRIV_ESC", "admin_jsmith", ATTACK_IPS[2], "EventCode=4728 A member was added to Domain Admins group. Member: admin_jsmith")

print("Shuffling logs to simulate real network packet arrival...")
# Shuffle everything so the backend has to actively sort and correlate the mess
random.shuffle(logs)

with open(FILE_PATH, "w") as f:
    for log in logs:
        f.write(json.dumps(log) + "\n")

print(f"✅ Success! Wrote {len(logs)} mixed telemetry events to {FILE_PATH}")

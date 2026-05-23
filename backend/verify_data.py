import json

lines = open('app/data/enterprise_telemetry.jsonl').readlines()
events = [json.loads(l) for l in lines]

print("Sample events from enterprise_telemetry.jsonl:")
for e in events[:5]:
    print(f"  {e['username']} ({e['event_type']} from {e['source']})")

print("\nAttack scenario checks:")
priv_escs = [e for e in events if e["event_type"] == "PRIV_ESC"]
mfa_fails = [e for e in events if e["event_type"] == "MFA_FAIL"]
brute_forces = [e for e in events if e["event_type"] == "LOGIN_FAIL" and e["source"] == "cisco_asa"]

print(f"  Privilege escalations: {len(priv_escs)}")
print(f"  MFA failures: {len(mfa_fails)}")
print(f"  Brute force attempts: {len(brute_forces)}")
print(f"\nTotal events: {len(events)}")

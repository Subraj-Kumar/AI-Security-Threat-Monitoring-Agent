import socket
import json
import requests
import time
from datetime import datetime, timedelta

# Configuration
HONEYPOT_PORT = 8888
API_URL = "http://127.0.0.1:8000/ingest/live"
TARGET_USER = "sysadmin_root"

def generate_apt_telemetry(attacker_ip):
    print(f"\n[!] Generating Custom APT29 Kill-Chain for IP: {attacker_ip}...")
    events = []
    now = datetime.utcnow()
    
    # 1. Generate 50 background noise events to prove the engine filters it
    for i in range(50):
        events.append({
            "ts": (now - timedelta(minutes=10, seconds=i)).isoformat(),
            "source": "windows_wineventlog", "event_type": "LOGIN_SUCCESS",
            "username": f"normal_user_{i}", "ip": f"192.168.1.{i}",
            "raw": f"EventCode=4624 | Normal background login activity."
        })

    # 2. Inject the Brute Force (Using the Teammate's REAL IP)
    brute_time = now - timedelta(minutes=2)
    for i in range(6):
        events.append({
            "ts": (brute_time + timedelta(seconds=i*4)).isoformat(),
            "source": "cisco_asa", "event_type": "LOGIN_FAIL",
            "username": TARGET_USER, "ip": attacker_ip,
            "raw": "%ASA-6-113015: AAA user authentication Rejected : reason = AAA failure"
        })
        
    # 3. Inject the Success & Lateral Movement (Golden Ticket)
    events.append({
        "ts": (brute_time + timedelta(seconds=45)).isoformat(),
        "source": "cisco_asa", "event_type": "LOGIN_SUCCESS",
        "username": TARGET_USER, "ip": attacker_ip,
        "raw": "%ASA-6-113008: AAA transaction status ACCEPT"
    })
    events.append({
        "ts": (brute_time + timedelta(minutes=1)).isoformat(),
        "source": "windows_wineventlog", "event_type": "PRIV_ESC",
        "username": TARGET_USER, "ip": attacker_ip,
        "raw": "EventCode=4728 | Kerberoasting detected. Member added to Enterprise Admins."
    })
    
    return events

def start_honeypot():
    server = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
    server.setsockopt(socket.SOL_SOCKET, socket.SO_REUSEADDR, 1)
    server.bind(("0.0.0.0", HONEYPOT_PORT))
    server.listen(5)
    
    print(f"""
    ================================================
    🛡️ SecOPS Live Honeypot Active
    Listening for unauthorized access on Port {HONEYPOT_PORT}...
    ================================================
    
    Commands to trigger the honeypot from another machine:
    curl http://<your-laptop-ip>:{HONEYPOT_PORT}
    
    ================================================
    """)
    
    try:
        while True:
            client_socket, address = server.accept()
            attacker_ip = address[0]
            
            print(f"\n🚨 [CRITICAL ALERT] INCOMING CONNECTION BLOCKED FROM: {attacker_ip}")
            client_socket.send(b"HTTP/1.1 403 Forbidden\r\n\r\nAccess Denied. Incident Logged.")
            client_socket.close()
            
            # Generate the Red Team Data using their IP
            telemetry = generate_apt_telemetry(attacker_ip)
            
            # Shoot it directly to the FastAPI Backend
            print("[*] Feeding raw telemetry to SecOPS Deterministic Engine...")
            try:
                response = requests.post(API_URL, json={"events": telemetry})
                if response.status_code == 200:
                    result = response.json()
                    print(f"✅ [SUCCESS] Attack successfully ingested!")
                    print(f"   Events processed: {result['ingested_events']}")
                    print(f"   Incidents created: {result['created_incidents']}")
                    print(f"\n[*] Dashboard will now show the attack from {attacker_ip}")
                else:
                    print(f"❌ [ERROR] Backend returned status {response.status_code}")
            except Exception as e:
                print(f"❌ [ERROR] Could not reach backend: {e}")
    except KeyboardInterrupt:
        print("\n\n[*] Honeypot shutting down...")
        server.close()

if __name__ == "__main__":
    start_honeypot()

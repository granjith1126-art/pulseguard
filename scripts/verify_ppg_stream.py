import urllib.request
import json
import time

def test_endpoints():
    base_url = "http://127.0.0.1:8000"
    
    # 1. Test root health
    print("\n--- 1. Testing Root Health Check ---")
    req = urllib.request.Request(f"{base_url}/")
    with urllib.request.urlopen(req) as resp:
        data = json.loads(resp.read().decode())
        print("Root Status:", data["status"], "Version:", data["version"])

    # 2. Test Telemetry Sensor Status
    print("\n--- 2. Testing /api/telemetry/sensor-status ---")
    req = urllib.request.Request(f"{base_url}/api/telemetry/sensor-status?patient_id=P-101")
    with urllib.request.urlopen(req) as resp:
        data = json.loads(resp.read().decode())
        print("Sensor Status:", json.dumps(data, indent=2))
        assert data["is_live_sensor"] == True, "Expected is_live_sensor to be True in default active mode"
        assert "MAX30102" in data["sensor_model"], "Expected MAX30102 sensor model"

    # 3. Test Raw PPG Ingestion Endpoint (Simulating ESP8266 batch of 10 samples)
    print("\n--- 3. Testing /api/telemetry/raw-ppg Ingestion ---")
    payload = {
        "patient_id": "P-101",
        "device_id": "MAX30102-ESP8266-01",
        "finger_detected": True,
        "sample_rate_hz": 100,
        "raw_ir": [172420, 172650, 173100, 173800, 174600, 175200, 174900, 173800, 172900, 172500],
        "raw_red": [160800, 160950, 161200, 161600, 162100, 162500, 162300, 161600, 161100, 160850]
    }
    req = urllib.request.Request(
        f"{base_url}/api/telemetry/raw-ppg",
        data=json.dumps(payload).encode(),
        headers={"Content-Type": "application/json"}
    )
    with urllib.request.urlopen(req) as resp:
        res = json.loads(resp.read().decode())
        print("Ingestion Result:", json.dumps(res, indent=2))
        assert res["status"] == "ingested"
        assert res["samples_received"] == 10

    # 4. Test Stream Mode Switch to SIMULATED (Disconnect)
    print("\n--- 4. Testing Stream Mode Switch to SIMULATED ---")
    mode_payload = {"patient_id": "P-101", "mode": "SIMULATED"}
    req = urllib.request.Request(
        f"{base_url}/api/telemetry/stream-mode",
        data=json.dumps(mode_payload).encode(),
        headers={"Content-Type": "application/json"}
    )
    with urllib.request.urlopen(req) as resp:
        res = json.loads(resp.read().decode())
        print("Mode Switch Result:", res)

    # Check status again
    req = urllib.request.Request(f"{base_url}/api/telemetry/sensor-status?patient_id=P-101")
    with urllib.request.urlopen(req) as resp:
        data = json.loads(resp.read().decode())
        print("Status after disconnect:", data["active_source"], "is_live_sensor:", data["is_live_sensor"])
        assert data["is_live_sensor"] == False

    # 5. Restore back to REAL_DATASET mode
    print("\n--- 5. Restoring back to REAL_DATASET mode ---")
    mode_payload = {"patient_id": "P-101", "mode": "REAL_DATASET"}
    req = urllib.request.Request(
        f"{base_url}/api/telemetry/stream-mode",
        data=json.dumps(mode_payload).encode(),
        headers={"Content-Type": "application/json"}
    )
    with urllib.request.urlopen(req) as resp:
        res = json.loads(resp.read().decode())
        print("Mode Restore Result:", res)

    print("\n>>> ALL BACKEND SENSOR TELEMETRY TESTS PASSED SUCCESSFULLY! <<<\n")

if __name__ == "__main__":
    test_endpoints()

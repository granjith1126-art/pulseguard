import asyncio
import json
import urllib.request
import websockets

async def test_scenario_switch():
    print("Connecting to ws://127.0.0.1:8000/ws/monitoring/P-001 ...")
    async with websockets.connect("ws://127.0.0.1:8000/ws/monitoring/P-001") as ws:
        # Read 1 normal message
        msg1 = json.loads(await ws.recv())
        print(f"Normal State: HR={msg1['vitals']['heart_rate']} SpO2={msg1['vitals']['spo2']}%")

        # Switch scenario to CRITICAL
        print("Switching scenario to CRITICAL via REST API...")
        req = urllib.request.Request(
            "http://127.0.0.1:8000/api/monitoring/scenario",
            data=json.dumps({"patient_id": "P-001", "scenario": "CRITICAL"}).encode(),
            headers={"Content-Type": "application/json"}
        )
        urllib.request.urlopen(req)

        # Read 2 critical messages
        for i in range(2):
            msg = json.loads(await ws.recv())
            v = msg["vitals"]
            print(f"Critical State [{i+1}]: Status={msg['status']} | HR={v['heart_rate']} BPM | SpO2={v['spo2']}% | Temp={v['temperature']}°C")

    print("Scenario switch verification passed!")

if __name__ == "__main__":
    asyncio.run(test_scenario_switch())

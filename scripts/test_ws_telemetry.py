import asyncio
import json
import websockets

async def check_ws():
    uri = "ws://127.0.0.1:8000/ws/monitoring/P-101"
    print(f"Connecting to {uri}...")
    async with websockets.connect(uri) as ws:
        # Read 3 messages
        for i in range(3):
            msg_str = await asyncio.wait_for(ws.recv(), timeout=3.0)
            data = json.loads(msg_str)
            print(f"\nMessage {i+1} received:")
            print(f"  Type: {data.get('type')}")
            print(f"  Patient ID: {data.get('patient_id')}")
            print(f"  Status: {data.get('status')}")
            print(f"  Vitals: HR={data['vitals']['heart_rate']}, SpO2={data['vitals']['spo2']}%, Temp={data['vitals']['temperature']}C")
            
            ppg = data.get("ppg", {})
            print(f"  PPG is_live_sensor: {ppg.get('is_live_sensor')}")
            print(f"  PPG sensor_source: {ppg.get('sensor_source')}")
            print(f"  PPG label: {ppg.get('label')}")
            print(f"  Raw samples count: {len(ppg.get('raw_samples', []))} | First sample: {ppg.get('raw_samples', [0])[0]}")
            print(f"  Processed samples: {ppg.get('processed_samples', [])[:5]}")
            
            assert data["type"] == "vital_update"
            assert "raw_samples" in ppg
            assert len(ppg["raw_samples"]) > 0

    print("\n>>> WEBSOCKET TELEMETRY STREAM TEST PASSED! <<<")

if __name__ == "__main__":
    asyncio.run(check_ws())

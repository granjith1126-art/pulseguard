import asyncio
import json
import websockets

async def test_stream():
    print("Connecting to ws://127.0.0.1:8000/ws/monitoring/P-001 ...")
    async with websockets.connect("ws://127.0.0.1:8000/ws/monitoring/P-001") as ws:
        for i in range(4):
            message = await ws.recv()
            data = json.loads(message)
            v = data.get("vitals", {})
            p = data.get("ppg", {})
            print(f"[Packet {i+1}] Scenario={data.get('scenario')} | HR={v.get('heart_rate')} BPM | SpO2={v.get('spo2')}% | Temp={v.get('temperature')}°C | PPG Samples={len(p.get('processed_samples', []))}")
    print("WebSocket telemetry stream verified successfully!")

if __name__ == "__main__":
    asyncio.run(test_stream())

# PulseGuard RPM — MAX30102 Hardware & Firmware Guide

## Dual-Stream Architecture Overview

The PulseGuard Remote Patient Monitoring system uses a **Dual-Stream Telemetry Architecture** designed to resolve the fundamental conflict between high-frequency waveform rendering and cloud database rate limits:

```
+-----------------------------------------------------------------------------------+
|                            MAX30102 Pulse Oximeter                                |
|                   (18-bit ADC, Red & IR Photodiode at 100 Hz)                     |
+-----------------------------------------+-----------------------------------------+
                                          |
                                          v  (I2C Fast Mode 400kHz)
+-----------------------------------------------------------------------------------+
|                        ESP8266 Microcontroller (NodeMCU)                          |
+-----------------------------------------+-----------------------------------------+
                    |                                                   |
       [Stream 1: Real-Time Waveform]                      [Stream 2: Cloud History]
       High-Speed HTTP POST / WebSocket                    15-Second Rate Limited GET
       Batch of 10 samples every 100ms                     Periodic aggregated vitals
                    |                                                   |
                    v                                                   v
+---------------------------------------+           +-------------------------------+
|     PulseGuard FastAPI Backend        |           |  MathWorks ThingSpeak Cloud   |
|   Digital Filtering (0.5 - 5.0 Hz)    |           |       (Channel 3110138)       |
|    Dicrotic Notch & Peak Detect       |           |   Vitals Logging (HR, SpO2)   |
+---------------------------------------+           +-------------------------------+
                    |                                                   |
                    v (WebSocket 100 Hz)                                v (HTTP REST)
+-----------------------------------------------------------------------------------+
|                            PulseGuard React Frontend                              |
|           • PPGWaveformCanvas: Continuous, glowing, real-time pulse               |
|           • ThingSpeakGraphs: Historical 15-second multi-day vitals trends        |
+-----------------------------------------------------------------------------------+
```

### Why ThingSpeak Cannot Be Used for Continuous PPG
ThingSpeak free-tier channels impose a **15-second minimum interval** between consecutive channel updates. A continuous PPG waveform requires at least **50 to 100 samples per second (50–100 Hz)** to capture:
1. The sharp systolic anacrotic upstroke (~100 ms duration).
2. The systolic peak and catacrotic decline.
3. The subtle aortic valve closure **dicrotic notch (incisura)** (~40 ms duration).
4. The secondary diastolic reflection wave.

If raw PPG were sent through ThingSpeak, each point would arrive 15 seconds apart, making it physically impossible to reconstruct a heartbeat waveform.
Therefore:
- **ThingSpeak (Channel 3110138)** is preserved exclusively for 15-second vitals logging, trend charts, and historical analysis.
- **Direct Real-Time Ingestion (`POST /api/telemetry/raw-ppg`)** provides the low-latency 100 Hz stream directly to the web client via WebSockets.

---

## Wiring Diagram (ESP8266 + MAX30102)

| MAX30102 Pin | ESP8266 Pin (NodeMCU) | Function | Notes |
|:---|:---|:---|:---|
| **VIN** | **3.3V** (or 5V if module has onboard LDO) | Power Supply | Recommended 3.3V to minimize noise |
| **GND** | **GND** | Ground | Common system ground |
| **SCL** | **D1** (GPIO 5) | I2C Clock | 400 kHz Fast I2C |
| **SDA** | **D2** (GPIO 4) | I2C Data | 400 kHz Fast I2C |
| **INT** | Unconnected (optional) | Interrupt | Not required for polled I2C |

---

## Sensor Detachment Handling
- When a patient removes their finger, raw IR drops below `50,000` ADC counts (ambient background).
- The firmware automatically sets `finger_detected = false`.
- The PulseGuard backend detects this condition and transitions the UI badge from **`LIVE PPG (MAX30102 RAW)`** to **`SIMULATED PPG (FALLBACK MODEL)`**, ensuring healthcare providers are never misled by synthetic data during sensor detachment.

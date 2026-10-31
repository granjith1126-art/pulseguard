# MATLAB Engine Integration & Setup Guide — PulseGuard RPM

This guide provides step-by-step instructions to connect your **MATLAB Engine** to the **PulseGuard FastAPI Backend** using the official **MATLAB Engine API for Python**.

---

## 1. Architecture Overview

```
┌─────────────────────────────────────────────────────────┐
│                    PULSEGUARD RPM                       │
└─────────────────────────────────────────────────────────┘
                            │
               MATLAB Functions (.m scripts)
           (generate_ppg.m, process_ppg.m, ...)
                            │
                            ▼
              MATLAB Engine API for Python
                 (import matlab.engine)
                            │
                            ▼
              FastAPI Telemetry Backend
                 (Uvicorn on Port 8000)
                            │
                     WebSocket Stream
               (/ws/monitoring/{patient_id})
                            │
                            ▼
                  PulseGuard Web UI
       (Live PPG Canvas, HR, SpO₂, Temperature)
```

---

## 2. Compatibility Matrix

| MATLAB Version | Compatible Python Versions |
|---|---|
| **MATLAB R2024b** | Python 3.10, 3.11, 3.12 |
| **MATLAB R2024a** | Python 3.9, 3.10, 3.11, 3.12 |
| **MATLAB R2023b** | Python 3.9, 3.10, 3.11 |
| **MATLAB R2023a** | Python 3.8, 3.9, 3.10, 3.11 |
| **MATLAB R2022b** | Python 3.8, 3.9, 3.10 |

### Check Your Python Version
In PowerShell or Command Prompt, run:
```powershell
python --version
```
*(Your system currently has Python 3.12 installed).*

---

## 3. How to Install MATLAB Engine API for Python

You can install the MATLAB Engine API using either **Method A (Recommended)** or **Method B (Official MATLAB Root Installer)**:

### Method A: Install via PyPI (Fastest)

MathWorks provides pre-compiled wheels for supported versions. Run in PowerShell:

```powershell
# For MATLAB R2024b:
pip install matlabengine==24.2.0

# For MATLAB R2024a:
pip install matlabengine==24.1.0

# Generic latest (auto-matches installed MATLAB):
pip install matlabengine
```

---

### Method B: Install from MATLAB's Local Installation Directory

1. Open MATLAB on your computer and run:
   ```matlab
   matlabroot
   ```
   *Example output:* `C:\Program Files\MATLAB\R2024a`

2. Open **PowerShell as Administrator** and navigate to the engine setup folder:
   ```powershell
   cd "C:\Program Files\MATLAB\R2024a\extern\engines\python"
   ```

3. Install the engine package into your Python environment:
   ```powershell
   python setup.py install
   ```

---

## 4. How to Test the MATLAB Engine Connection

We have provided an automated test script: `backend/test_matlab_connection.py`.

Run the test from the project root:
```powershell
python backend/test_matlab_connection.py
```

### Expected Output:
```text
======================================================================
    PULSEGUARD RPM — MATLAB ENGINE CONNECTION TEST
======================================================================

[STEP 1/5] Checking 'matlab.engine' Python package...
  ✓ SUCCESS: 'matlab.engine' package is installed in Python environment.

[STEP 2/5] Starting MATLAB Engine process...
  ✓ SUCCESS: MATLAB Engine started in 3.40 seconds.

[STEP 3/5] Executing basic MATLAB calculation: sqrt(25.0)...
  ✓ SUCCESS: MATLAB computed sqrt(25.0) = 5.0

[STEP 4/5] Testing PulseGuard custom functions in 'matlab_functions/'...
  ✓ Added path: d:\health monitoring device\matlab_functions
  - Testing generate_ppg.m (HR=75, Duration=1.0s, Fs=100Hz)...
    ✓ Generated 100 PPG samples.
  - Testing process_ppg.m...
    ✓ Filtered PPG in range [0.000, 1.000]
  - Testing calculate_heart_rate.m...
    ✓ Derived HR: 75 BPM (IBI: 800.0 ms)
  - Testing generate_vitals.m (NORMAL & CRITICAL scenarios)...
    ✓ NORMAL: HR=74 BPM, SpO2=98.5%, Temp=36.7°C
    ✓ CRITICAL: HR=142 BPM, SpO2=88.0%, Temp=39.4°C

[STEP 5/5] Closing MATLAB Engine instance...
  ✓ SUCCESS: MATLAB Engine closed cleanly.

======================================================================
🎉 MATLAB ENGINE CONNECTION SUCCESSFUL! 🎉
======================================================================
```

---

## 5. How to Run the PulseGuard Application

### 1. Start the FastAPI Backend
In a terminal at the project root:
```powershell
python -m uvicorn backend.main:app --reload --port 8000
```
- API Documentation: [http://localhost:8000/docs](http://localhost:8000/docs)
- MATLAB Status Check: [http://localhost:8000/api/system/matlab-status](http://localhost:8000/api/system/matlab-status)

### 2. Start the Frontend Website
In a second terminal:
```powershell
npm run dev
```
- Open [http://localhost:5173](http://localhost:5173) in your browser.

---

## 6. How the Live Telemetry Works

1. **Patient Login**:
   - The frontend automatically connects to the backend WebSocket at:
     `ws://localhost:8000/ws/monitoring/P-001`
   - FastAPI triggers `MatlabService.generate_and_process_cycle()` at 100Hz.
   - The Live PPG Canvas scrolls continuously in real time.
   - Heart Rate, SpO₂, and Temperature update live from the MATLAB signal processing pipeline.

2. **Scenario Controls**:
   - You can trigger scenarios (`NORMAL`, `WARNING`, `CRITICAL`) using the interactive buttons on the UI or via API:
     ```powershell
     curl -X POST http://localhost:8000/api/monitoring/scenario -H "Content-Type: application/json" -d "{\"patient_id\": \"P-001\", \"scenario\": \"CRITICAL\"}"
     ```

3. **Doctor Portal**:
   - Doctor selects an authorized patient (e.g. Ramesh Kumar `P-001`).
   - The Doctor dashboard receives that patient's live MATLAB WebSocket feed.
   - In `CRITICAL` scenario, clinical emergency alerts trigger immediately with browser location hospital guidance.

---

## 7. Troubleshooting

| Issue | Cause | Solution |
|---|---|---|
| `ModuleNotFoundError: No module named 'matlab'` | Engine API not installed in Python | Run `pip install matlabengine` or `python setup.py install` from matlabroot. |
| `Unable to start MATLAB Engine` | MATLAB license or PATH missing | Ensure MATLAB is activated and `matlab.exe` is in your Windows system PATH. |
| `Version mismatch` | Python 3.12 used with older MATLAB | Use a Python version matching your MATLAB release (see Section 2). |
| `Fallback Demo Mode Active` | Engine package absent | PulseGuard automatically activates high-fidelity mirrored simulation mode without crashing. |

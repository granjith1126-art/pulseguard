"""
=============================================================================
PULSEGUARD — MATLAB ENGINE CONNECTION VERIFICATION TEST
=============================================================================
This script tests and validates:
1. Availability of the matlab.engine Python package
2. Starting the MATLAB Engine process (MATLAB R2026a)
3. Executing standard MATLAB mathematical operations (e.g., sqrt(25))
4. Executing custom physiological functions in matlab_functions/
5. Clean engine teardown
=============================================================================
"""

import sys
import time
from pathlib import Path

def run_test():
    print("=" * 70)
    print("    PULSEGUARD RPM - MATLAB ENGINE CONNECTION TEST")
    print("=" * 70)

    # 1. Test Package Import
    print("\n[STEP 1/5] Checking 'matlab.engine' Python package...")
    try:
        import matlab
        import matlab.engine
        print("  [PASS] 'matlab.engine' package is installed and importable.")
    except ImportError as e:
        print("\n  [FAIL] 'matlab.engine' is not installed in current Python environment.")
        print(f"     Details: {e}")
        print("\n  To fix this, run: pip install matlabengine")
        print("=" * 70)
        sys.exit(1)

    # 2. Test Starting MATLAB Engine
    print("\n[STEP 2/5] Starting MATLAB Engine process (this may take a few seconds)...")
    start_time = time.time()
    try:
        eng = matlab.engine.start_matlab()
        elapsed = time.time() - start_time
        print(f"  [PASS] MATLAB Engine started in {elapsed:.2f} seconds.")
    except Exception as e:
        print("\n  [FAIL] Could not start MATLAB Engine process.")
        print(f"     Details: {e}")
        print("\n  Ensure MATLAB R2026a is activated and in Windows system PATH.")
        print("=" * 70)
        sys.exit(1)

    # 3. Test Standard Calculation
    print("\n[STEP 3/5] Executing basic MATLAB calculation: sqrt(25.0)...")
    try:
        result = eng.sqrt(25.0)
        print(f"  [PASS] MATLAB computed sqrt(25.0) = {result}")
        assert float(result) == 5.0
    except Exception as e:
        print(f"  [FAIL] Math evaluation failed: {e}")
        eng.quit()
        sys.exit(1)

    # 4. Test Custom MATLAB Functions in matlab_functions/
    print("\n[STEP 4/5] Testing PulseGuard custom functions in 'matlab_functions/'...")
    matlab_dir = Path(__file__).resolve().parent.parent / "matlab_functions"
    if not matlab_dir.exists():
        print(f"  [WARN] matlab_functions folder not found at {matlab_dir}")
    else:
        try:
            eng.addpath(str(matlab_dir), nargout=0)
            print(f"  [PASS] Added MATLAB functions path: {matlab_dir}")

            # Test generate_ppg.m
            print("  - Testing generate_ppg.m (HR=75, Duration=1.0s, Fs=100Hz)...")
            raw_ppg, _ = eng.generate_ppg(75.0, 1.0, 100.0, "NORMAL", 0.04, nargout=2)
            raw_list = list(raw_ppg[0])
            print(f"    [PASS] Generated {len(raw_list)} PPG samples. First 3: {[round(x, 1) for x in raw_list[:3]]}")

            # Test process_ppg.m
            print("  - Testing process_ppg.m...")
            proc_ppg, _ = eng.process_ppg(raw_ppg, 100.0, nargout=2)
            proc_list = list(proc_ppg[0])
            print(f"    [PASS] Filtered PPG in range [{min(proc_list):.3f}, {max(proc_list):.3f}]")

            # Test calculate_heart_rate.m
            print("  - Testing calculate_heart_rate.m...")
            derived_hr, peaks, ibi = eng.calculate_heart_rate(proc_ppg, 100.0, 75.0, nargout=3)
            print(f"    [PASS] Derived HR: {int(derived_hr)} BPM (IBI: {float(ibi):.1f} ms)")

            # Test generate_vitals.m
            print("  - Testing generate_vitals.m (NORMAL & CRITICAL scenarios)...")
            normal_v = eng.generate_vitals("NORMAL", 75.0, 98.0, 36.8, nargout=1)
            crit_v = eng.generate_vitals("CRITICAL", 75.0, 98.0, 36.8, nargout=1)
            print(f"    [PASS] NORMAL: HR={normal_v['heart_rate']} BPM, SpO2={normal_v['spo2']}%, Temp={normal_v['temperature']} C")
            print(f"    [PASS] CRITICAL: HR={crit_v['heart_rate']} BPM, SpO2={crit_v['spo2']}%, Temp={crit_v['temperature']} C")

        except Exception as e:
            print(f"  [FAIL] Error executing custom MATLAB functions: {e}")
            eng.quit()
            sys.exit(1)

    # 5. Clean Engine Shutdown
    print("\n[STEP 5/5] Closing MATLAB Engine instance...")
    try:
        eng.quit()
        print("  [PASS] MATLAB Engine closed cleanly.")
    except Exception as e:
        print(f"  [WARN] Warning during engine shutdown: {e}")

    print("\n" + "=" * 70)
    print("  MATLAB ENGINE CONNECTION SUCCESSFUL!")
    print("  FastAPI is ready to stream live MATLAB telemetry over WebSockets.")
    print("=" * 70 + "\n")

if __name__ == "__main__":
    run_test()

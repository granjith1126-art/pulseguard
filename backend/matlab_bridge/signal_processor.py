import numpy as np
import logging
from typing import Tuple, List, Dict, Any
from .engine_manager import matlab_manager

logger = logging.getLogger("pulseguard.matlab.processor")

class MatlabSignalProcessor:
    """
    Processes raw PPG sensor signals using MATLAB functions (process_ppg.m, calculate_heart_rate.m)
    or mirrored NumPy digital filtering algorithms.
    Maintains a continuous rolling buffer for live chunk processing to prevent square wave distortion.
    """
    _rolling_buffers: Dict[str, List[float]] = {}

    @classmethod
    def process_and_analyze(
        cls,
        raw_ppg: List[float],
        fs: int = 100,
        fallback_hr: int = 75,
        patient_id: str = "P-001"
    ) -> Dict[str, Any]:
        """
        Executes complete processing pipeline: Filtering -> Baseline removal -> Peak detection -> HR.
        """
        eng = matlab_manager.get_engine()

        # 1. Try MATLAB Engine processing if available and sufficient samples
        if eng is not None and len(raw_ppg) >= 50:
            try:
                import matlab
                matlab_raw = matlab.double(raw_ppg)

                processed_matlab, _ = eng.process_ppg(matlab_raw, float(fs), nargout=2)
                processed_list = [float(x) for x in list(processed_matlab[0])]

                hr_matlab, peaks_matlab, ibi_matlab = eng.calculate_heart_rate(
                    processed_matlab,
                    float(fs),
                    float(fallback_hr),
                    nargout=3
                )

                peaks_list = [int(p) for p in list(peaks_matlab[0])] if peaks_matlab else []

                return {
                    "processed_ppg": processed_list,
                    "derived_heart_rate": int(hr_matlab),
                    "detected_peaks": peaks_list,
                    "inter_beat_interval_ms": float(ibi_matlab),
                    "processing_source": "MATLAB_ENGINE"
                }
            except Exception as e:
                logger.warning(f"Error calling MATLAB process_ppg.m: {e}. Using fallback processor.")

        # 2. Continuous rolling Python processing
        return cls._fallback_process(raw_ppg, fs, fallback_hr, patient_id)

    @classmethod
    def _fallback_process(
        cls,
        raw_ppg: List[float],
        fs: int,
        fallback_hr: int,
        patient_id: str = "P-001"
    ) -> Dict[str, Any]:
        """
        Rolling-buffer digital filter and peak analyzer.
        Maintains a multi-beat buffer so percentiles and filters reflect the true continuous cardiac pulse.
        """
        if patient_id not in cls._rolling_buffers:
            cls._rolling_buffers[patient_id] = []

        buf = cls._rolling_buffers[patient_id]
        buf.extend(raw_ppg)

        # Retain last 300 samples (3.0 seconds at 100 Hz)
        max_buf_len = fs * 3
        if len(buf) > max_buf_len:
            buf = buf[-max_buf_len:]
            cls._rolling_buffers[patient_id] = buf

        arr = np.array(buf, dtype=np.float64)
        total_N = len(arr)
        chunk_N = len(raw_ppg)

        if total_N < 10:
            return {
                "processed_ppg": [0.5] * chunk_N,
                "derived_heart_rate": fallback_hr,
                "detected_peaks": [],
                "inter_beat_interval_ms": 60000.0 / max(1, fallback_hr),
                "processing_source": "MIRRORED_PROCESSOR"
            }

        # 1. Detrend: AC signal over multi-beat window
        signal_ac = arr - np.mean(arr)

        # 2. Digital IIR Bandpass: 0.5 Hz - 5.0 Hz
        alpha_hp = 0.98
        alpha_lp = 0.35

        hp = np.zeros(total_N)
        prev_x = signal_ac[0]
        prev_y = 0.0
        for k in range(1, total_N):
            prev_y = alpha_hp * (prev_y + signal_ac[k] - prev_x)
            prev_x = signal_ac[k]
            hp[k] = prev_y

        smooth = hp[0]
        filtered = np.zeros(total_N)
        for k in range(total_N):
            smooth += alpha_lp * (hp[k] - smooth)
            filtered[k] = smooth

        # 3. Robust percentile normalization across multi-beat window
        p2 = np.percentile(filtered, 2)
        p98 = np.percentile(filtered, 98)
        span = p98 - p2
        if span > 1e-4:
            normalized = np.clip((filtered - p2) / span, 0.0, 1.0)
        else:
            normalized = np.full(total_N, 0.5)

        # Extract only the processed samples belonging to the incoming chunk
        chunk_processed = normalized[-chunk_N:].tolist()

        # 4. Peak detection over the window
        min_dist = int(round(0.35 * fs))
        threshold = max(float(np.mean(normalized) + 0.15 * np.std(normalized)), 0.45)
        peaks = []

        for i in range(1, total_N - 1):
            if normalized[i] > threshold and normalized[i] > normalized[i - 1] and normalized[i] >= normalized[i + 1]:
                if not peaks or (i - peaks[-1]) >= min_dist:
                    peaks.append(i)
                elif normalized[i] > normalized[peaks[-1]]:
                    peaks[-1] = i

        if len(peaks) >= 2:
            intervals = np.diff(peaks)
            avg_ibi_sec = float(np.median(intervals)) / fs
            derived_hr = int(round(min(max(60.0 / avg_ibi_sec, 35), 210)))
            ibi_ms = avg_ibi_sec * 1000.0
        else:
            derived_hr = fallback_hr
            ibi_ms = 60000.0 / max(1, fallback_hr)

        return {
            "processed_ppg": chunk_processed,
            "derived_heart_rate": derived_hr,
            "detected_peaks": peaks,
            "inter_beat_interval_ms": round(ibi_ms, 1),
            "processing_source": "MIRRORED_PROCESSOR"
        }

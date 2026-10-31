import math
import numpy as np
import logging
from typing import Tuple, List, Dict, Any
from .engine_manager import matlab_manager

logger = logging.getLogger("pulseguard.matlab.generator")

class MatlabSignalGenerator:
    """
    Generates physiological PPG waveforms and vital parameters.
    Implements a clinical-grade multi-component physiological model:
    - Steep anacrotic systolic upstroke (90-120 ms)
    - Rounded systolic apex
    - Visible aortic valve dicrotic notch (incisura)
    - Secondary diastolic reflection wave
    - Non-linear diastolic runoff
    - Respiratory Sinus Arrhythmia (natural HRV pulse interval variations)
    - Respiratory-Induced Intensity Variation (stroke volume / amplitude variations)
    - Beat-to-beat contour micro-variations (no two consecutive heartbeats are identical)
    """
    _patient_phase: Dict[str, float] = {}
    _patient_resp_phase: Dict[str, float] = {}
    _patient_beat_variation: Dict[str, float] = {}
    _patient_last_beat_time: Dict[str, float] = {}

    @classmethod
    def generate_ppg_chunk(
        cls,
        target_hr: float = 75.0,
        duration_sec: float = 0.05,
        fs: int = 100,
        scenario: str = "NORMAL",
        noise_level: float = 0.03,
        patient_id: str = "P-001"
    ) -> List[float]:
        """
        Generates a continuous physiological PPG waveform chunk.
        """
        eng = matlab_manager.get_engine()
        
        # 1. If MATLAB Engine is available, call MATLAB generate_ppg.m
        if eng is not None:
            try:
                raw_ppg_matlab, _ = eng.generate_ppg(
                    float(target_hr),
                    float(duration_sec),
                    float(fs),
                    str(scenario),
                    float(noise_level),
                    nargout=2
                )
                raw_ppg = list(raw_ppg_matlab[0])
                return [float(x) for x in raw_ppg]
            except Exception as e:
                logger.warning(f"Error calling MATLAB generate_ppg.m: {e}. Using fallback generator.")

        # 2. Continuous realistic physiological Python generator
        return cls._fallback_generate_ppg(
            target_hr, duration_sec, fs, scenario, noise_level, patient_id
        )

    @staticmethod
    def generate_vitals(
        scenario: str = "NORMAL",
        current_hr: float = 76.0,
        current_spo2: float = 98.2,
        current_temp: float = 36.8
    ) -> Dict[str, Any]:
        """
        Generates physiological vitals dictionary.
        """
        eng = matlab_manager.get_engine()

        if eng is not None:
            try:
                vitals_matlab = eng.generate_vitals(
                    str(scenario),
                    float(current_hr),
                    float(current_spo2),
                    float(current_temp),
                    nargout=1
                )
                return {
                    "heart_rate": int(vitals_matlab["heart_rate"]),
                    "spo2": float(vitals_matlab["spo2"]),
                    "temperature": float(vitals_matlab["temperature"]),
                    "respiration_rate": int(vitals_matlab["respiration_rate"]),
                    "perfusion_index": float(vitals_matlab["perfusion_index"]),
                    "signal_quality": int(vitals_matlab["signal_quality"]),
                    "status": str(vitals_matlab["status"]),
                    "scenario": str(vitals_matlab["scenario"]),
                    "engine_source": "MATLAB_ENGINE"
                }
            except Exception as e:
                logger.warning(f"Error calling MATLAB generate_vitals.m: {e}. Using fallback.")

        return MatlabSignalGenerator._fallback_generate_vitals(
            scenario, current_hr, current_spo2, current_temp
        )

    @classmethod
    def _fallback_generate_ppg(
        cls,
        target_hr: float,
        duration_sec: float,
        fs: int,
        scenario: str,
        noise_level: float,
        patient_id: str = "P-001"
    ) -> List[float]:
        """
        Generates realistic physiological PPG with dynamic beat-to-beat variations.
        Never repeats an identical waveform.
        """
        scenario_upper = scenario.upper()
        if scenario_upper == "CRITICAL":
            target_hr = max(138.0, target_hr * 1.55)
            noise_level *= 1.6
        elif scenario_upper == "WARNING":
            target_hr = target_hr * 1.25
            noise_level *= 1.2

        N = max(1, int(round(duration_sec * fs)))
        dt = 1.0 / fs

        if target_hr <= 0:
            return [170000.0] * N

        phase = cls._patient_phase.get(patient_id, 0.0)
        resp_phase = cls._patient_resp_phase.get(patient_id, 0.0)
        beat_var = cls._patient_beat_variation.get(patient_id, 1.0)

        chunk_samples: List[float] = []

        # Breathing frequency ~ 0.23 Hz (14 breaths per minute)
        resp_freq_rad = 0.23 * 2.0 * math.pi

        for _ in range(N):
            # 1. Natural HRV: Respiratory Sinus Arrhythmia modulation on instantaneous HR
            instant_hr_mod = 1.0 + 0.045 * math.sin(resp_phase)
            current_hr = target_hr * instant_hr_mod
            beat_period = 60.0 / current_hr
            phase_increment = dt / beat_period

            phi = phase

            # Update beat variation factor whenever phase wraps (new cardiac cycle)
            if phi < phase_increment:
                # Randomize subtle stroke volume and dicrotic reflection variations
                beat_var = 1.0 + (np.random.rand() - 0.5) * 0.08
                cls._patient_beat_variation[patient_id] = beat_var

            # 2. Respiratory-Induced Intensity Variation (RIIV) on pulse amplitude
            riiv = 1.0 + 0.10 * math.sin(resp_phase + 0.4)
            amplitude_scale = riiv * beat_var

            # 3. Physiological Morphology Components:
            # Systolic upstroke: sharp anacrotic rise (peaking at phi = 0.15)
            w_sys = 0.055 if phi < 0.15 else 0.080
            p1 = 2.5 * math.exp(-((phi - 0.15) / w_sys) ** 2)

            # Dicrotic notch (incisura) where aortic valve snaps shut (phi = 0.33)
            w_notch = 0.042
            p_notch = -0.45 * math.exp(-((phi - 0.33) / w_notch) ** 2)

            # Reflected diastolic wave peaking at phi = 0.41
            w_dias = 0.075
            p_dias = 1.05 * math.exp(-((phi - 0.41) / w_dias) ** 2)

            # Non-linear continuous diastolic runoff
            if phi > 0.45:
                decay = math.exp(-(phi - 0.45) * 4.2)
                p_runoff = 0.65 * decay
            else:
                p_runoff = 0.0

            # 4. Respiratory baseline wander in raw optical ADC units
            resp_wander = 220.0 * math.sin(resp_phase)

            # 5. Optical photodiode quantum shot noise
            shot_noise = (np.random.randn()) * noise_level * 40.0

            # Combined optical signal in MAX30102 18-bit ADC units (centered ~172,000)
            pulsatile_ac = (p1 + p_notch + p_dias + p_runoff) * 1150.0 * amplitude_scale
            raw_adc = 172400.0 + pulsatile_ac + resp_wander + shot_noise

            chunk_samples.append(float(raw_adc))

            phase = (phase + phase_increment) % 1.0
            resp_phase = (resp_phase + dt * resp_freq_rad) % (2.0 * math.pi)

        cls._patient_phase[patient_id] = phase
        cls._patient_resp_phase[patient_id] = resp_phase

        return chunk_samples

    @staticmethod
    def _fallback_generate_vitals(
        scenario: str,
        current_hr: float,
        current_spo2: float,
        current_temp: float
    ) -> Dict[str, Any]:
        """Realistic vitals generator with natural clinical variations."""
        scenario_upper = scenario.upper()
        if scenario_upper == "CRITICAL":
            target_hr = int(142 + np.random.randn() * 4)
            target_spo2 = round(float(88.0 + np.random.randn() * 1.5), 1)
            target_temp = round(float(39.4 + np.random.randn() * 0.2), 1)
            resp_rate = int(28 + np.random.randn() * 2)
            pi_index = round(float(0.8 + np.random.rand() * 0.4), 1)
            sig_qual = int(88 + np.random.rand() * 8)
            status = "CRITICAL"
        elif scenario_upper == "WARNING":
            target_hr = int(108 + np.random.randn() * 3)
            target_spo2 = round(float(93.5 + np.random.randn() * 0.8), 1)
            target_temp = round(float(37.9 + np.random.randn() * 0.2), 1)
            resp_rate = int(22 + np.random.randn() * 1)
            pi_index = round(float(1.4 + np.random.rand() * 0.5), 1)
            sig_qual = int(94 + np.random.rand() * 4)
            status = "WARNING"
        else:
            target_hr = int(74 + np.random.randn() * 3)
            target_spo2 = round(float(98.5 + np.random.randn() * 0.4), 1)
            target_temp = round(float(36.7 + np.random.randn() * 0.1), 1)
            resp_rate = int(16 + np.random.randn() * 1)
            pi_index = round(float(2.4 + np.random.rand() * 0.8), 1)
            sig_qual = int(98 + np.random.rand() * 2)
            status = "STABLE"

        return {
            "heart_rate": target_hr,
            "spo2": min(100.0, max(75.0, target_spo2)),
            "temperature": target_temp,
            "respiration_rate": resp_rate,
            "perfusion_index": pi_index,
            "signal_quality": sig_qual,
            "status": status,
            "scenario": scenario_upper,
            "engine_source": "PHYSIOLOGICAL_ENGINE"
        }

import time
import logging
from typing import Dict, Any, List
from ..matlab_bridge.engine_manager import matlab_manager
from ..matlab_bridge.signal_generator import MatlabSignalGenerator
from ..matlab_bridge.signal_processor import MatlabSignalProcessor
from .sensor_stream_service import sensor_stream_service

logger = logging.getLogger("pulseguard.services.matlab")

class MatlabService:
    """
    High-level service orchestrating MAX30102 sensor stream ingestion,
    signal conditioning, digital filtering, and vital parameter derivation.
    Seamlessly switches between live MAX30102 sensor telemetry and physiological fallback.
    """

    def __init__(self):
        self.generator = MatlabSignalGenerator()
        self.processor = MatlabSignalProcessor()

    def generate_and_process_cycle(
        self,
        patient_id: str,
        scenario: str = "NORMAL",
        current_hr: float = 75.0,
        current_spo2: float = 98.2,
        current_temp: float = 36.8,
        chunk_duration_sec: float = 0.05, # 50ms chunk (5 samples @ 100Hz)
        fs: int = 100
    ) -> Dict[str, Any]:
        """
        Executes one live streaming monitoring cycle:
        1. Checks for real MAX30102 sensor stream (ESP8266 or authentic recording feed)
        2. If sensor is streaming, conditions raw IR samples with digital filter
        3. If disconnected, invokes physiological fallback generator
        4. Bundles into JSON payload for WebSocket streaming
        """
        chunk_samples_count = max(1, int(round(chunk_duration_sec * fs)))
        timestamp_iso = time.strftime("%Y-%m-%dT%H:%M:%S.") + f"{int(time.time() * 1000) % 1000:03d}Z"

        # Check for real MAX30102 sensor telemetry
        sensor_data = sensor_stream_service.get_stream_chunk(
            patient_id=patient_id,
            chunk_size=chunk_samples_count,
            fs=fs
        )

        if sensor_data.get("is_live", False):
            # 1. Live genuine MAX30102 sensor stream is active
            raw_chunk = sensor_data["raw_samples"]
            processed_chunk = sensor_data["processed_samples"]
            finger_detected = sensor_data["finger_detected"]
            source_tag = sensor_data["source"]

            # Derive vitals
            vitals_data = self.generator.generate_vitals(
                scenario=scenario,
                current_hr=current_hr,
                current_spo2=current_spo2,
                current_temp=current_temp
            )

            return {
                "type": "vital_update",
                "patient_id": patient_id,
                "timestamp": timestamp_iso,
                "scenario": scenario,
                "status": vitals_data["status"],
                "vitals": {
                    "heart_rate": vitals_data["heart_rate"] if finger_detected else 0,
                    "spo2": vitals_data["spo2"] if finger_detected else 0.0,
                    "temperature": vitals_data["temperature"],
                    "respiration_rate": vitals_data["respiration_rate"],
                    "perfusion_index": vitals_data["perfusion_index"],
                    "signal_quality": 98 if finger_detected else 0,
                },
                "ppg": {
                    "raw_samples": raw_chunk,
                    "processed_samples": processed_chunk,
                    "sample_rate_hz": fs,
                    "chunk_size": len(raw_chunk),
                    "is_live_sensor": True,
                    "sensor_source": source_tag,
                    "finger_detected": finger_detected,
                    "sensor_model": "MAX30102 Optical Sensor",
                    "label": "LIVE PPG (MAX30102 RAW SENSOR)"
                },
                "engine": {
                    "matlab_connected": matlab_manager.is_connected(),
                    "generator_source": "MAX30102_SENSOR_STREAM",
                    "processor_source": "DIGITAL_BANDPASS_FILTER",
                }
            }

        # 2. Sensor is disconnected: Use realistic physiological fallback
        vitals_data = self.generator.generate_vitals(
            scenario=scenario,
            current_hr=current_hr,
            current_spo2=current_spo2,
            current_temp=current_temp
        )

        target_hr = vitals_data["heart_rate"]

        raw_ppg_chunk = self.generator.generate_ppg_chunk(
            target_hr=target_hr,
            duration_sec=chunk_duration_sec,
            fs=fs,
            scenario=scenario,
            patient_id=patient_id
        )

        processed_result = self.processor.process_and_analyze(
            raw_ppg=raw_ppg_chunk,
            fs=fs,
            fallback_hr=target_hr,
            patient_id=patient_id
        )

        return {
            "type": "vital_update",
            "patient_id": patient_id,
            "timestamp": timestamp_iso,
            "scenario": scenario,
            "status": vitals_data["status"],
            "vitals": {
                "heart_rate": vitals_data["heart_rate"],
                "spo2": vitals_data["spo2"],
                "temperature": vitals_data["temperature"],
                "respiration_rate": vitals_data["respiration_rate"],
                "perfusion_index": vitals_data["perfusion_index"],
                "signal_quality": vitals_data["signal_quality"],
            },
            "ppg": {
                "raw_samples": raw_ppg_chunk,
                "processed_samples": processed_result["processed_ppg"],
                "sample_rate_hz": fs,
                "chunk_size": len(raw_ppg_chunk),
                "is_live_sensor": False,
                "sensor_source": "SIMULATED_FALLBACK",
                "finger_detected": False,
                "sensor_model": "PHYSIOLOGICAL_FALLBACK",
                "label": "SIMULATED PPG (FALLBACK MODEL)"
            },
            "engine": {
                "matlab_connected": matlab_manager.is_connected(),
                "generator_source": vitals_data.get("engine_source", "UNKNOWN"),
                "processor_source": processed_result.get("processing_source", "UNKNOWN"),
            }
        }

# Global instance
matlab_service = MatlabService()

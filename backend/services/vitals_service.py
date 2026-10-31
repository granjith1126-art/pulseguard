import asyncio
import time
import logging
from typing import Dict, Any, Optional, List
from .matlab_service import matlab_service
from .websocket_service import ws_manager

logger = logging.getLogger("pulseguard.services.vitals")

class PatientMonitoringSession:
    """Represents an active streaming monitoring session for a patient."""
    def __init__(self, patient_id: str, scenario: str = "NORMAL"):
        self.patient_id = patient_id
        self.scenario = scenario
        self.is_active = True
        self.start_time = time.time()
        self.last_hr = 75.0
        self.last_spo2 = 98.2
        self.last_temp = 36.8
        self.task: Optional[asyncio.Task] = None
        self.history_buffer: List[Dict[str, Any]] = []

class VitalsMonitoringService:
    """
    Manages real-time vital monitoring background loops and broadcasts MATLAB data
    over WebSockets to patients and doctors.
    """
    def __init__(self):
        # Maps patient_id -> PatientMonitoringSession
        self.sessions: Dict[str, PatientMonitoringSession] = {}

    def is_monitoring_active(self, patient_id: str) -> bool:
        """Checks if a patient is actively being monitored."""
        session = self.sessions.get(patient_id)
        return session is not None and session.is_active

    def get_session_scenario(self, patient_id: str) -> str:
        """Gets current active simulation scenario for a patient."""
        session = self.sessions.get(patient_id)
        return session.scenario if session else "NORMAL"

    def set_scenario(self, patient_id: str, scenario: str) -> bool:
        """Updates the active scenario (NORMAL, WARNING, CRITICAL) for a patient."""
        session = self.sessions.get(patient_id)
        if session:
            session.scenario = scenario.upper()
            logger.info(f"Updated patient {patient_id} scenario to {scenario.upper()}")
            return True
        return False

    async def start_monitoring(self, patient_id: str, scenario: str = "NORMAL") -> Dict[str, Any]:
        """
        Starts a high-frequency MATLAB monitoring worker loop for the patient.
        """
        if patient_id in self.sessions and self.sessions[patient_id].is_active:
            # Update scenario if already running
            self.sessions[patient_id].scenario = scenario.upper()
            return {
                "status": "already_running",
                "patient_id": patient_id,
                "scenario": self.sessions[patient_id].scenario,
                "message": f"Monitoring session already active for patient {patient_id}"
            }

        session = PatientMonitoringSession(patient_id=patient_id, scenario=scenario.upper())
        self.sessions[patient_id] = session

        # Launch async streaming background loop
        session.task = asyncio.create_task(self._monitoring_loop(session))
        logger.info(f"Started MATLAB monitoring loop for patient {patient_id} in {scenario.upper()} mode")

        return {
            "status": "started",
            "patient_id": patient_id,
            "scenario": session.scenario,
            "message": f"Started MATLAB telemetry monitoring for patient {patient_id}"
        }

    async def stop_monitoring(self, patient_id: str) -> Dict[str, Any]:
        """Stops the monitoring session for a patient."""
        session = self.sessions.get(patient_id)
        if not session:
            return {"status": "not_found", "patient_id": patient_id, "message": "No active session"}

        session.is_active = False
        if session.task:
            session.task.cancel()
            try:
                await session.task
            except asyncio.CancelledError:
                pass
            session.task = None

        del self.sessions[patient_id]
        logger.info(f"Stopped monitoring for patient {patient_id}")

        return {
            "status": "stopped",
            "patient_id": patient_id,
            "message": f"Monitoring stopped for patient {patient_id}"
        }

    async def _monitoring_loop(self, session: PatientMonitoringSession):
        """
        High-rate async loop executing MATLAB signal cycles every 50ms (20 FPS chunks of 5 samples = 100 Hz).
        """
        chunk_interval_sec = 0.05  # 50 ms
        fs = 100                   # 100 Hz sampling rate

        try:
            while session.is_active:
                # 1. Execute MATLAB telemetry cycle
                payload = matlab_service.generate_and_process_cycle(
                    patient_id=session.patient_id,
                    scenario=session.scenario,
                    current_hr=session.last_hr,
                    current_spo2=session.last_spo2,
                    current_temp=session.last_temp,
                    chunk_duration_sec=chunk_interval_sec,
                    fs=fs
                )

                # Update running values
                session.last_hr = payload["vitals"]["heart_rate"]
                session.last_spo2 = payload["vitals"]["spo2"]
                session.last_temp = payload["vitals"]["temperature"]

                # 2. Store rolling history
                session.history_buffer.append({
                    "timestamp": payload["timestamp"],
                    "heart_rate": session.last_hr,
                    "spo2": session.last_spo2,
                    "temperature": session.last_temp,
                    "status": payload["status"]
                })
                if len(session.history_buffer) > 1000:
                    session.history_buffer.pop(0)

                # 3. Broadcast to all active WebSocket listeners (Patient & Doctor)
                await ws_manager.broadcast_vital_update(session.patient_id, payload)

                # 4. Sleep for chunk duration
                await asyncio.sleep(chunk_interval_sec)

        except asyncio.CancelledError:
            pass
        except Exception as e:
            logger.error(f"Error in monitoring loop for patient {session.patient_id}: {e}", exc_info=True)
        finally:
            session.is_active = False

    def get_all_active_sessions(self) -> List[Dict[str, Any]]:
        """Lists all active monitoring sessions."""
        return [
            {
                "patient_id": s.patient_id,
                "scenario": s.scenario,
                "uptime_seconds": round(time.time() - s.start_time, 1),
                "last_hr": s.last_hr,
                "last_spo2": s.last_spo2,
                "last_temp": s.last_temp,
                "active_listeners": ws_manager.get_subscriber_count(s.patient_id)
            }
            for s in self.sessions.values() if s.is_active
        ]

# Global instance
vitals_service = VitalsMonitoringService()

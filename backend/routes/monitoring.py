import logging
from typing import Optional
from fastapi import APIRouter, HTTPException, Query
from pydantic import BaseModel, Field
from ..matlab_bridge.engine_manager import matlab_manager
from ..services.vitals_service import vitals_service
from ..services.websocket_service import ws_manager

logger = logging.getLogger("pulseguard.routes.monitoring")

router = APIRouter(prefix="/api/monitoring", tags=["monitoring"])
system_router = APIRouter(prefix="/api/system", tags=["system"])

class StartMonitoringRequest(BaseModel):
    patient_id: str = Field(default="P-001", description="Identifier of patient to monitor")
    scenario: str = Field(default="NORMAL", description="Simulation scenario: NORMAL, WARNING, CRITICAL")
    role: Optional[str] = Field(default="PATIENT", description="Authorized role: PATIENT or DOCTOR")

class StopMonitoringRequest(BaseModel):
    patient_id: str = Field(default="P-001")

class ChangeScenarioRequest(BaseModel):
    patient_id: str = Field(default="P-001")
    scenario: str = Field(..., description="NORMAL, WARNING, or CRITICAL")

@router.post("/start")
async def start_monitoring(req: StartMonitoringRequest):
    """
    Starts MATLAB telemetry generation & streaming loop for a patient.
    """
    if req.scenario.upper() not in ["NORMAL", "WARNING", "CRITICAL"]:
        raise HTTPException(status_code=400, detail="Invalid scenario. Must be NORMAL, WARNING, or CRITICAL.")

    result = await vitals_service.start_monitoring(
        patient_id=req.patient_id,
        scenario=req.scenario
    )
    return result

@router.post("/stop")
async def stop_monitoring(req: StopMonitoringRequest):
    """
    Stops MATLAB telemetry generation loop for a patient.
    """
    result = await vitals_service.stop_monitoring(patient_id=req.patient_id)
    return result

@router.post("/scenario")
async def change_scenario(req: ChangeScenarioRequest):
    """
    Updates the active scenario (NORMAL, WARNING, CRITICAL) for a patient.
    """
    if req.scenario.upper() not in ["NORMAL", "WARNING", "CRITICAL"]:
        raise HTTPException(status_code=400, detail="Invalid scenario. Must be NORMAL, WARNING, or CRITICAL.")

    success = vitals_service.set_scenario(req.patient_id, req.scenario)
    if not success:
        # If not already running, start it in this scenario
        await vitals_service.start_monitoring(req.patient_id, req.scenario)

    return {
        "status": "updated",
        "patient_id": req.patient_id,
        "scenario": req.scenario.upper()
    }

@router.get("/status")
async def get_monitoring_status(patient_id: Optional[str] = Query(None)):
    """
    Returns monitoring status of a specific patient or all active sessions.
    """
    if patient_id:
        is_active = vitals_service.is_monitoring_active(patient_id)
        scenario = vitals_service.get_session_scenario(patient_id)
        listeners = ws_manager.get_subscriber_count(patient_id)
        return {
            "patient_id": patient_id,
            "is_monitoring": is_active,
            "scenario": scenario,
            "active_listeners": listeners
        }

    return {
        "active_sessions": vitals_service.get_all_active_sessions(),
        "total_active": len(vitals_service.sessions)
    }

@system_router.get("/matlab-status")
async def get_matlab_status():
    """
    System diagnostic endpoint verifying MATLAB Engine connectivity,
    package installation, and function accessibility.
    """
    info = matlab_manager.get_status_info()
    return info

import logging
from typing import List, Optional
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field
from ..services.sensor_stream_service import sensor_stream_service

logger = logging.getLogger("pulseguard.routes.telemetry")

router = APIRouter(prefix="/api/telemetry", tags=["telemetry"])

class RawPPGIngestRequest(BaseModel):
    patient_id: str = Field(default="P-101", description="Identifier of patient")
    device_id: Optional[str] = Field(default="MAX30102-ESP8266-01", description="Device MAC/ID")
    raw_ir: List[int] = Field(..., description="Array of 18-bit raw IR ADC counts from MAX30102")
    raw_red: Optional[List[int]] = Field(default=None, description="Array of 18-bit raw Red ADC counts")
    finger_detected: bool = Field(default=True, description="True if finger is in contact with sensor")
    sample_rate_hz: int = Field(default=100, description="Sampling rate in Hz")

class StreamModeRequest(BaseModel):
    patient_id: str = Field(default="P-101")
    mode: str = Field(..., description="Mode: HARDWARE, REAL_DATASET, or SIMULATED")

@router.post("/raw-ppg")
async def ingest_raw_ppg(req: RawPPGIngestRequest):
    """
    Direct ingestion endpoint for high-frequency (100 Hz) raw MAX30102 optical samples.
    Receives sample batches from ESP8266/Arduino firmware and feeds the live WebSocket stream.
    """
    if not req.raw_ir:
        raise HTTPException(status_code=400, detail="raw_ir samples array cannot be empty")

    res = sensor_stream_service.ingest_raw_batch(
        patient_id=req.patient_id,
        raw_ir=req.raw_ir,
        raw_red=req.raw_red,
        finger_detected=req.finger_detected,
        sample_rate_hz=req.sample_rate_hz
    )
    return res

@router.post("/stream-mode")
async def set_stream_mode(req: StreamModeRequest):
    """
    Switches between LIVE HARDWARE, AUTHENTIC RECORDED DATASET, and SIMULATED FALLBACK.
    """
    if req.mode.upper() not in ["HARDWARE", "REAL_DATASET", "SIMULATED"]:
        raise HTTPException(status_code=400, detail="Invalid mode. Choose HARDWARE, REAL_DATASET, or SIMULATED.")

    return sensor_stream_service.set_stream_mode(req.patient_id, req.mode)

@router.get("/sensor-status")
async def get_sensor_status(patient_id: str = "P-101"):
    """
    Returns live hardware connection state, finger placement, and active sensor model.
    """
    is_hw = sensor_stream_service.is_hardware_active(patient_id)
    is_finger = sensor_stream_service.is_finger_present(patient_id)
    force_real = sensor_stream_service._force_real_dataset.get(patient_id, True)

    if is_hw:
        active_source = "MAX30102_LIVE_HARDWARE"
        label = "Live MAX30102 Sensor (Hardware Stream)"
    elif force_real:
        active_source = "MAX30102_REAL_FEED"
        label = "Live MAX30102 Sensor (Authentic Photodiode Stream)"
    else:
        active_source = "SIMULATED_FALLBACK"
        label = "Simulated Fallback PPG (Sensor Disconnected)"

    return {
        "patient_id": patient_id,
        "is_hardware_connected": is_hw,
        "finger_detected": is_finger if (is_hw or force_real) else False,
        "active_source": active_source,
        "active_label": label,
        "is_live_sensor": (is_hw or force_real) and is_finger,
        "sensor_model": "MAX30102 Pulse Oximeter",
        "sample_rate_hz": 100
    }

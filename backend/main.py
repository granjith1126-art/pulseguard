import os
import json
import logging
from contextlib import asynccontextmanager
from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

from .matlab_bridge.engine_manager import matlab_manager
from .services.websocket_service import ws_manager
from .services.vitals_service import vitals_service
from .routes.monitoring import router as monitoring_router, system_router
from .routes.auth import router as auth_router
from .routes.thingspeak import router as thingspeak_router
from .routes.patients import router as patients_router
from .routes.telemetry import router as telemetry_router

logger = logging.getLogger("pulseguard.main")
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s"
)

@asynccontextmanager
async def lifespan(app: FastAPI):
    """
    Application Lifespan:
    Starts and pre-warms MATLAB Engine on backend boot,
    and shuts down the engine cleanly on backend exit.
    """
    logger.info("==================================================")
    logger.info("   PULSEGUARD RPM — FASTAPI + MATLAB BACKEND      ")
    logger.info("==================================================")
    
    enable_matlab = os.getenv("ENABLE_MATLAB", "false").lower() == "true"
    if enable_matlab:
        logger.info("Starting MATLAB Engine Manager in background thread...")
        matlab_manager.initialize_async()
    else:
        logger.info("MATLAB disabled for current ThingSpeak telemetry phase.")
    
    yield
    
    # 2. Teardown MATLAB Engine
    logger.info("Shutting down PulseGuard backend...")
    if enable_matlab:
        matlab_manager.shutdown()

app = FastAPI(
    title="PulseGuard RPM — MATLAB Engine & Telemetry API",
    description="Remote Patient Monitoring FastAPI Backend integrated with MATLAB Engine API for Python",
    version="2.4.0",
    lifespan=lifespan
)

# Configure CORS for Vite Frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        "http://localhost:3000",
        "*"
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include REST Routers
app.include_router(monitoring_router)
app.include_router(system_router)
app.include_router(auth_router)
app.include_router(thingspeak_router)
app.include_router(patients_router)
app.include_router(telemetry_router)

@app.api_route("/", methods=["GET", "HEAD"])
async def root():
    """Health check endpoint."""
    return {
        "service": "PulseGuard Remote Patient Monitoring Backend",
        "status": "online",
        "matlab_status": matlab_manager.get_status_info()["matlab_engine"],
        "version": "2.4.0",
        "endpoints": {
            "websocket": "/ws/monitoring/{patient_id}",
            "monitoring_start": "/api/monitoring/start",
            "monitoring_stop": "/api/monitoring/stop",
            "matlab_status": "/api/system/matlab-status",
        }
    }

@app.websocket("/ws/monitoring/{patient_id}")
async def websocket_monitoring_endpoint(websocket: WebSocket, patient_id: str):
    """
    Live real-time WebSocket telemetry stream for a patient.
    Broadcasts 100Hz physiological PPG chunks and vital signs (HR, SpO2, Temp)
    generated/processed by MATLAB Engine.
    """
    await ws_manager.connect(patient_id, websocket)

    # Automatically ensure monitoring loop is active for this patient
    if not vitals_service.is_monitoring_active(patient_id):
        await vitals_service.start_monitoring(patient_id=patient_id, scenario="NORMAL")

    try:
        while True:
            # Receive client control messages (e.g. change scenario, ping)
            data = await websocket.receive_text()
            try:
                msg = json.loads(data)
                action = msg.get("action")
                
                if action == "set_scenario":
                    new_scenario = msg.get("scenario", "NORMAL")
                    vitals_service.set_scenario(patient_id, new_scenario)
                    logger.info(f"Client requested scenario change to {new_scenario} for patient {patient_id}")
                    
                elif action == "ping":
                    await websocket.send_text(json.dumps({"type": "pong", "time": msg.get("time")}))
                    
            except json.JSONDecodeError:
                pass

    except WebSocketDisconnect:
        ws_manager.disconnect(patient_id, websocket)
        logger.info(f"WebSocket client disconnected for patient {patient_id}")
    except Exception as e:
        logger.warning(f"WebSocket error for patient {patient_id}: {e}")
        ws_manager.disconnect(patient_id, websocket)

if __name__ == "__main__":
    import uvicorn
    port = int(os.getenv("PORT", 8000))
    uvicorn.run("backend.main:app", host="0.0.0.0", port=port, reload=True)

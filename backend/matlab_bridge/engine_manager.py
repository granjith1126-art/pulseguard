import os
import sys
import threading
import logging
from pathlib import Path
from typing import Optional, Any

logger = logging.getLogger("pulseguard.matlab.engine")

class MatlabEngineManager:
    """
    Singleton manager for the MATLAB Engine API for Python.
    Maintains a persistent MATLAB Engine instance, adds matlab_functions to path,
    and provides safe fallback demo capabilities when MATLAB is starting or not installed.
    """
    _instance: Optional["MatlabEngineManager"] = None
    _engine: Optional[Any] = None
    _is_initialized: bool = False
    _is_starting: bool = False
    _status: str = "disconnected"
    _diagnostic_message: str = ""
    _is_matlab_installed: bool = False
    _lock = threading.Lock()

    def __new__(cls) -> "MatlabEngineManager":
        if cls._instance is None:
            cls._instance = super(MatlabEngineManager, cls).__new__(cls)
        return cls._instance

    def initialize_async(self):
        """
        Launches MATLAB Engine initialization in a background daemon thread
        so FastAPI boots instantly while MATLAB Engine connects in parallel.
        """
        with self._lock:
            if self._is_initialized or self._is_starting:
                return
            self._is_starting = True

        thread = threading.Thread(target=self._initialize_sync, daemon=True)
        thread.start()

    def _initialize_sync(self) -> bool:
        """Internal synchronous initialization worker."""
        logger.info("Initializing MATLAB Engine Manager in background thread...")

        # 1. Check if matlab.engine Python package is installed
        try:
            import matlab.engine
            self._is_matlab_installed = True
            logger.info("MATLAB Engine API for Python found.")
        except ImportError as e:
            self._is_matlab_installed = False
            self._status = "demo_mode"
            self._diagnostic_message = (
                "MATLAB Engine API for Python is not installed. "
                "Running in High-Fidelity Demo Simulation Mode mirroring MATLAB algorithms. "
                "To connect live MATLAB, follow instructions in MATLAB_ENGINE_SETUP.md."
            )
            logger.warning(self._diagnostic_message)
            self._is_initialized = True
            self._is_starting = False
            return False

        # 2. Attempt starting the MATLAB Engine process
        try:
            self._status = "starting"
            self._diagnostic_message = "Connecting to MATLAB R2026a Engine process..."
            logger.info("Connecting to MATLAB R2026a Engine process...")
            
            eng = matlab.engine.start_matlab()
            self._engine = eng

            # 3. Add matlab_functions folder to MATLAB path
            matlab_functions_dir = Path(__file__).resolve().parent.parent.parent / "matlab_functions"
            if matlab_functions_dir.exists():
                self._engine.addpath(str(matlab_functions_dir), nargout=0)
                logger.info(f"Added MATLAB functions path: {matlab_functions_dir}")
            else:
                logger.warning(f"matlab_functions directory not found at {matlab_functions_dir}")

            self._status = "connected"
            self._diagnostic_message = "MATLAB Engine is active and connected."
            self._is_initialized = True
            self._is_starting = False
            logger.info("==================================================")
            logger.info("   MATLAB ENGINE R2026a SUCCESSFULLY CONNECTED!   ")
            logger.info("==================================================")
            return True

        except Exception as e:
            self._engine = None
            self._status = "error"
            self._diagnostic_message = f"Failed to start MATLAB Engine: {str(e)}"
            logger.error(self._diagnostic_message)
            self._is_initialized = True
            self._is_starting = False
            return False

    def get_engine(self) -> Optional[Any]:
        """Returns the active MATLAB engine instance if running."""
        return self._engine

    def is_connected(self) -> bool:
        """Returns True if live MATLAB Engine is actively connected."""
        return self._engine is not None and self._status == "connected"

    def get_status_info(self) -> dict:
        """Returns full diagnostic status dictionary for monitoring APIs."""
        return {
            "matlab_engine": "connected" if self.is_connected() else ("starting" if self._is_starting else "fallback_demo"),
            "engine_process": "running" if self._engine is not None else ("starting" if self._is_starting else "not_running"),
            "mode": "live_matlab" if self.is_connected() else "development_demo",
            "matlab_package_installed": self._is_matlab_installed,
            "status": self._status,
            "diagnostic_message": self._diagnostic_message,
        }

    def shutdown(self):
        """Gracefully terminates the MATLAB Engine on backend shutdown."""
        if self._engine is not None:
            logger.info("Shutting down MATLAB Engine...")
            try:
                self._engine.quit()
            except Exception as e:
                logger.warning(f"Error while quitting MATLAB Engine: {e}")
            self._engine = None
            self._status = "disconnected"
            self._is_initialized = False
            self._is_starting = False
            logger.info("MATLAB Engine shut down cleanly.")

# Global instance
matlab_manager = MatlabEngineManager()

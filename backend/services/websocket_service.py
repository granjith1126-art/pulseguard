import json
import logging
from typing import Dict, List, Set
from fastapi import WebSocket

logger = logging.getLogger("pulseguard.services.websocket")

class WebSocketConnectionManager:
    """
    Manages active WebSocket connections grouped by patient ID.
    Supports concurrent patient and doctor subscribers.
    """
    def __init__(self):
        # Maps patient_id -> Set of active WebSockets
        self.active_connections: Dict[str, Set[WebSocket]] = {}

    async def connect(self, patient_id: str, websocket: WebSocket):
        """Accepts and registers a new WebSocket client for a patient stream."""
        await websocket.accept()
        if patient_id not in self.active_connections:
            self.active_connections[patient_id] = set()
        self.active_connections[patient_id].add(websocket)
        logger.info(f"WebSocket client connected for patient {patient_id} (Total: {len(self.active_connections[patient_id])})")

    def disconnect(self, patient_id: str, websocket: WebSocket):
        """Removes a disconnected client."""
        if patient_id in self.active_connections:
            self.active_connections[patient_id].discard(websocket)
            if not self.active_connections[patient_id]:
                del self.active_connections[patient_id]
        logger.info(f"WebSocket client disconnected for patient {patient_id}")

    async def broadcast_vital_update(self, patient_id: str, data: dict):
        """Broadcasts vital update JSON to all active listeners for a patient."""
        if patient_id not in self.active_connections:
            return

        message = json.dumps(data)
        stale_sockets = []

        for socket in list(self.active_connections[patient_id]):
            try:
                await socket.send_text(message)
            except Exception as e:
                logger.warning(f"Error sending WebSocket message to client: {e}")
                stale_sockets.append(socket)

        # Cleanup any broken connections
        for stale in stale_sockets:
            self.disconnect(patient_id, stale)

    def get_subscriber_count(self, patient_id: str) -> int:
        """Returns number of active listeners for a patient."""
        return len(self.active_connections.get(patient_id, set()))

# Global instance
ws_manager = WebSocketConnectionManager()

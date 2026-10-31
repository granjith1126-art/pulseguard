import logging
from typing import Optional
from fastapi import APIRouter, HTTPException, Query
from ..services.thingspeak_service import thingspeak_service

logger = logging.getLogger("pulseguard.routes.thingspeak")

router = APIRouter(prefix="/api/thingspeak", tags=["thingspeak"])

@router.get("/data")
async def get_thingspeak_data(limit: Optional[int] = Query(None, description="Number of recent records to retrieve")):
    """
    Fetches real physiological telemetry records from ThingSpeak channel.
    Maps fields dynamically and returns sanitized numeric data with original timestamps.
    """
    try:
        data = thingspeak_service.fetch_channel_data(results_limit=limit)
        return {
            "success": True,
            **data
        }
    except ValueError as e:
        logger.warning(f"ThingSpeak configuration/validation error: {e}")
        return {
            "success": False,
            "status": "error",
            "error_type": "VALIDATION_ERROR",
            "message": str(e),
            "channel_id": thingspeak_service.channel_id,
            "records_count": 0,
            "records": [],
            "detected_fields": {},
            "latest_reading": None
        }
    except ConnectionError as e:
        logger.error(f"Network error connecting to ThingSpeak: {e}")
        return {
            "success": False,
            "status": "error",
            "error_type": "NETWORK_ERROR",
            "message": str(e),
            "channel_id": thingspeak_service.channel_id,
            "records_count": 0,
            "records": [],
            "detected_fields": {},
            "latest_reading": None
        }
    except Exception as e:
        logger.error(f"Unexpected error fetching ThingSpeak data: {e}", exc_info=True)
        return {
            "success": False,
            "status": "error",
            "error_type": "API_ERROR",
            "message": f"Unexpected ThingSpeak Cloud error: {str(e)}",
            "channel_id": thingspeak_service.channel_id,
            "records_count": 0,
            "records": [],
            "detected_fields": {},
            "latest_reading": None
        }

@router.get("/latest")
async def get_latest_thingspeak_entry():
    """
    Fast, lightweight endpoint to fetch only the single latest reading.
    Ideal for rapid 2-3 second polling loops.
    """
    try:
        return thingspeak_service.fetch_latest_entry()
    except Exception as e:
        logger.warning(f"Error fetching latest ThingSpeak entry: {e}")
        return {
            "success": False,
            "status": "error",
            "message": str(e),
            "entry": None
        }

@router.get("/status")
async def get_thingspeak_status():
    """
    Returns high-level status of the ThingSpeak channel connection.
    """
    try:
        data = thingspeak_service.fetch_channel_data(results_limit=1)
        return {
            "status": "connected",
            "channel_id": data["channel_id"],
            "channel_name": data["channel_name"],
            "detected_fields": data["detected_fields"],
            "has_ppg_data": data["has_ppg_data"],
            "latest_timestamp": data["latest_timestamp"],
            "records_count": data["records_count"],
        }
    except Exception as e:
        return {
            "status": "error",
            "channel_id": thingspeak_service.channel_id,
            "message": str(e)
        }

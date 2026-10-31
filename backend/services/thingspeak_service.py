import os
import json
import logging
import time
import urllib.request
import urllib.error
from datetime import datetime, timezone
from typing import Dict, Any, List, Optional
from dotenv import load_dotenv

load_dotenv()

logger = logging.getLogger("pulseguard.services.thingspeak")

class ThingSpeakService:
    """
    Service to fetch, inspect, and parse physiological telemetry data
    from MathWorks ThingSpeak Cloud channels.
    Includes smart high-speed in-memory caching to eliminate rate-limit errors
    and prevent read timeouts during 2-3 second live polling.
    """

    def __init__(self):
        self.channel_id = os.getenv("THINGSPEAK_CHANNEL_ID", "3110138")
        self.read_api_key = os.getenv("THINGSPEAK_READ_API_KEY", "EWP138HBYBB8NPP5")
        self.base_url = "https://api.thingspeak.com"
        self._cached_field_mapping: Optional[Dict[str, Dict[str, str]]] = None
        
        # High-cadence cache buffers
        self._cached_latest_entry: Optional[Dict[str, Any]] = None
        self._cached_latest_time: float = 0.0
        self._latest_cache_ttl: float = 1.8  # Cache latest entry for 1.8s
        
        self._cached_channel_data: Optional[Dict[str, Any]] = None
        self._cached_channel_time: float = 0.0
        self._channel_cache_ttl: float = 3.0  # Cache full history data for 3.0s

    def fetch_latest_entry(self) -> Dict[str, Any]:
        """
        Fetches the single most recent entry from ThingSpeak using feeds/last.json.
        Fast and lightweight for frequent 2-3 second polling.
        Uses in-memory caching to prevent ThingSpeak Cloud rate-limit timeouts.
        """
        now = time.time()
        if self._cached_latest_entry and (now - self._cached_latest_time) < self._latest_cache_ttl:
            return self._cached_latest_entry

        if not self.channel_id:
            raise ValueError("ThingSpeak Channel ID is not configured in .env.")
        if not self.read_api_key:
            raise ValueError("ThingSpeak Read API Key is not configured in .env.")

        # Ensure field mapping is known
        if not self._cached_field_mapping:
            try:
                self.fetch_channel_data(results_limit=1)
            except Exception:
                pass

        url = f"{self.base_url}/channels/{self.channel_id}/feeds/last.json?api_key={self.read_api_key}"
        req = urllib.request.Request(
            url,
            headers={
                "User-Agent": "PulseGuard-RPM/2.4 (Medical Monitoring Backend)",
                "Accept": "application/json"
            }
        )

        try:
            with urllib.request.urlopen(req, timeout=5) as response:
                content = response.read().decode("utf-8")
                if content.strip() == "-1" or content.strip() == "0":
                    raise ValueError("ThingSpeak API rejected the request. Invalid Channel ID or Read API Key.")
                feed = json.loads(content)

            if not feed or not isinstance(feed, dict) or "entry_id" not in feed:
                return {
                    "success": False,
                    "status": "no_data",
                    "message": "No readings recorded on ThingSpeak channel yet.",
                    "entry": None
                }

            mapping = self._cached_field_mapping or self._detect_field_roles({})
            record = self._process_feed_entry(feed, mapping)

            result = {
                "success": True,
                "channel_id": str(self.channel_id),
                "entry": record
            }
            self._cached_latest_entry = result
            self._cached_latest_time = now
            return result

        except Exception as e:
            # If network error or timeout occurs, gracefully return last cached reading
            if self._cached_latest_entry:
                logger.debug(f"ThingSpeak fetch timed out/throttled ({e}), returning cached latest reading.")
                return self._cached_latest_entry
            raise e

    def fetch_channel_data(self, results_limit: Optional[int] = None) -> Dict[str, Any]:
        """
        Fetches channel metadata and historical feed entries from ThingSpeak.
        Parses field names dynamically and returns sanitized numeric data points.
        Cached for 3 seconds to protect against burst requests.
        """
        now = time.time()
        if (
            self._cached_channel_data
            and (now - self._cached_channel_time) < self._channel_cache_ttl
            and (results_limit is None or results_limit <= self._cached_channel_data.get("records_count", 0))
        ):
            return self._cached_channel_data

        if not self.channel_id:
            raise ValueError("ThingSpeak Channel ID is not configured in .env.")
        if not self.read_api_key:
            raise ValueError("ThingSpeak Read API Key is not configured in .env.")

        # Construct ThingSpeak feeds JSON URL
        url = f"{self.base_url}/channels/{self.channel_id}/feeds.json?api_key={self.read_api_key}"
        if results_limit:
            url += f"&results={results_limit}"

        logger.info(f"Fetching ThingSpeak data from channel {self.channel_id}...")

        req = urllib.request.Request(
            url,
            headers={
                "User-Agent": "PulseGuard-RPM/2.4 (Medical Monitoring Backend)",
                "Accept": "application/json"
            }
        )

        try:
            with urllib.request.urlopen(req, timeout=6) as response:
                content = response.read().decode("utf-8")
                
                # Check for ThingSpeak error response
                if content.strip() == "-1" or content.strip() == "0":
                    raise ValueError("ThingSpeak API rejected the request. Invalid Channel ID or Read API Key.")
                
                raw_data = json.loads(content)

        except Exception as e:
            if self._cached_channel_data:
                logger.debug(f"ThingSpeak channel data fetch failed ({e}), returning cached channel data.")
                return self._cached_channel_data
            raise e

        # Parse Channel Metadata & Detect Field Meanings
        channel_info = raw_data.get("channel", {})
        feeds = raw_data.get("feeds", [])

        field_mapping = self._detect_field_roles(channel_info)
        self._cached_field_mapping = field_mapping

        # Process and sanitize feeds
        processed_records = []
        has_ppg = any(mapping["metric"] == "ppg" for mapping in field_mapping.values())

        for feed in feeds:
            record = self._process_feed_entry(feed, field_mapping)
            if record is not None:
                processed_records.append(record)

        # Extract latest valid entry for current-value cards
        latest_reading = self._extract_latest_reading(processed_records)

        first_timestamp = processed_records[0]["timestamp_iso"] if processed_records else None
        latest_timestamp = processed_records[-1]["timestamp_iso"] if processed_records else None

        result = {
            "status": "connected",
            "channel_id": str(self.channel_id),
            "channel_name": channel_info.get("name", "Medical Device"),
            "records_count": len(processed_records),
            "first_timestamp": first_timestamp,
            "latest_timestamp": latest_timestamp,
            "detected_fields": field_mapping,
            "has_ppg_data": has_ppg,
            "latest_reading": latest_reading,
            "records": processed_records,
        }
        self._cached_channel_data = result
        self._cached_channel_time = now
        return result

    def _detect_field_roles(self, channel_info: Dict[str, Any]) -> Dict[str, Dict[str, str]]:
        """
        Inspects channel field labels dynamically and maps them to clinical parameters.
        DO NOT assume fixed indices; examine field1..field8 names.
        """
        mapping = {}

        for i in range(1, 9):
            field_key = f"field{i}"
            label = channel_info.get(field_key)
            if not label:
                continue

            clean_label = str(label).strip().lower()
            metric = "unknown"
            unit = ""

            # Match Heart Rate keywords
            if any(k in clean_label for k in ["heart", "pulse", "bpm", "beat"]):
                metric = "heart_rate"
                unit = "BPM"
            # Match Temperature keywords
            elif any(k in clean_label for k in ["temp", "celsius", "fahrenheit", "deg"]):
                metric = "temperature"
                unit = "°C"
            # Match SpO2 keywords
            elif any(k in clean_label for k in ["spo2", "ox", "oxygen", "saturation", "sa02"]):
                metric = "spo2"
                unit = "%"
            # Match PPG keywords
            elif any(k in clean_label for k in ["ppg", "photopleth", "wave", "raw_ppg"]):
                metric = "ppg"
                unit = "ADC"

            mapping[field_key] = {
                "field_key": field_key,
                "label": str(label),
                "metric": metric,
                "unit": unit
            }

        # If no fields detected from channel_info (e.g. from feeds/last.json), use channel defaults
        if not mapping:
            mapping = {
                "field1": {"field_key": "field1", "label": "Heart beat", "metric": "heart_rate", "unit": "BPM"},
                "field2": {"field_key": "field2", "label": "Temp", "metric": "temperature", "unit": "°C"},
                "field3": {"field_key": "field3", "label": "SpO2", "metric": "spo2", "unit": "%"},
            }

        return mapping

    def _process_feed_entry(
        self,
        feed: Dict[str, Any],
        field_mapping: Dict[str, Dict[str, str]]
    ) -> Optional[Dict[str, Any]]:
        """
        Converts raw ThingSpeak feed entry to structured, numeric physiological reading.
        Preserves original timestamp.
        """
        raw_ts = feed.get("created_at")
        if not raw_ts:
            return None

        # Parse timestamp
        try:
            dt = datetime.fromisoformat(raw_ts.replace("Z", "+00:00"))
            time_label = dt.strftime("%H:%M:%S")
            datetime_label = dt.strftime("%b %d, %H:%M:%S")
        except Exception:
            time_label = raw_ts
            datetime_label = raw_ts

        entry_id = feed.get("entry_id")

        record = {
            "entry_id": entry_id,
            "timestamp_iso": raw_ts,
            "time_label": time_label,
            "datetime_label": datetime_label,
            "heart_rate": None,
            "temperature": None,
            "spo2": None,
            "ppg_sample": None,
            "raw_fields": {}
        }

        # Map each field according to detected role
        for field_key, meta in field_mapping.items():
            val_str = feed.get(field_key)
            record["raw_fields"][field_key] = val_str

            if val_str is None or str(val_str).strip() == "":
                continue

            try:
                numeric_val = float(str(val_str).strip())
            except ValueError:
                continue

            metric = meta["metric"]
            if metric == "heart_rate":
                hr_val = int(round(numeric_val))
                if 0 <= hr_val <= 250:
                    record["heart_rate"] = hr_val
                else:
                    record["heart_rate"] = 0

            elif metric == "temperature":
                temp_val = round(numeric_val, 2)
                if 0.0 <= temp_val <= 60.0:
                    record["temperature"] = temp_val
                else:
                    record["temperature"] = 0.0

            elif metric == "spo2":
                spo2_val = round(numeric_val, 1)
                if 0.0 <= spo2_val <= 100.0:
                    record["spo2"] = spo2_val
                elif 100.0 < spo2_val <= 120.0:
                    record["spo2"] = 100.0
                else:
                    record["spo2"] = 0.0

            elif metric == "ppg":
                record["ppg_sample"] = numeric_val

        return record

    def _extract_latest_reading(self, records: List[Dict[str, Any]]) -> Dict[str, Any]:
        """
        Finds the most recent valid values for each vital sign from the record sequence.
        """
        if not records:
            return {
                "heart_rate": 0,
                "spo2": 0,
                "temperature": 0.0,
                "timestamp_iso": None,
                "time_label": "No Data",
                "entry_id": None
            }

        latest_record = records[-1]

        # Scan backwards if the very last entry had any null fields
        hr = latest_record.get("heart_rate")
        spo2 = latest_record.get("spo2")
        temp = latest_record.get("temperature")

        for r in reversed(records):
            if hr is None and r.get("heart_rate") is not None:
                hr = r.get("heart_rate")
            if spo2 is None and r.get("spo2") is not None:
                spo2 = r.get("spo2")
            if temp is None and r.get("temperature") is not None:
                temp = r.get("temperature")
            if hr is not None and spo2 is not None and temp is not None:
                break

        return {
            "heart_rate": hr if hr is not None else 0,
            "spo2": spo2 if spo2 is not None else 0,
            "temperature": temp if temp is not None else 0.0,
            "timestamp_iso": latest_record.get("timestamp_iso"),
            "time_label": latest_record.get("time_label"),
            "datetime_label": latest_record.get("datetime_label"),
            "entry_id": latest_record.get("entry_id")
        }

# Global singleton instance
thingspeak_service = ThingSpeakService()

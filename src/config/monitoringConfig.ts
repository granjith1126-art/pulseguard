/**
 * Centralized Live Telemetry & Device Activity Configuration
 * 
 * Modify these parameters in ONE place to adjust polling speed and offline detection.
 */
export const LIVE_MONITORING_CONFIG = {
  // How frequently the frontend checks for new ThingSpeak readings (in milliseconds)
  // 3000ms = 3 seconds (as requested: 2-3 seconds)
  LIVE_POLL_INTERVAL_MS: 3000,

  // Device Inactivity Timeout (in milliseconds)
  // If no genuinely new sensor reading has been posted to ThingSpeak within this window,
  // the physical device is flagged as DISCONNECTED / POWERED OFF.
  //
  // Adjust this value according to your ESP32's upload frequency:
  // - Hardware uploads every ~17-24 seconds, so a 90000ms (90s) timeout allows 
  //   steady connection tracking without flapping between upload cycles.
  DEVICE_TIMEOUT_MS: 90000,

  // Maximum number of genuine sensor readings in the rolling live graph window (prevents memory bloat)
  MAX_LIVE_POINTS: 120,

  // Interval to update the "seconds ago" clock display and evaluate offline status (in milliseconds)
  AGE_TICK_INTERVAL_MS: 1000,
};

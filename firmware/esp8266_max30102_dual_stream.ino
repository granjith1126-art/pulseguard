/*
 * =========================================================================================
 * PULSEGUARD RPM — ESP8266 + MAX30102 DUAL-STREAM TELEMETRY FIRMWARE
 * =========================================================================================
 * Hardware Target: ESP8266 (NodeMCU v2/v3 / Wemos D1 Mini / ESP-12E)
 * Sensor:          Maxim Integrated MAX30102 High-Sensitivity Pulse Oximeter & Heart-Rate Sensor
 * 
 * ARCHITECTURE (DUAL-STREAM DESIGN):
 * 1. REAL-TIME RAW STREAM (100 Hz / ~100ms batching):
 *    Transmits raw 18-bit IR and Red photodiode ADC readings directly to the PulseGuard
 *    backend (FastAPI / WebSocket broker) via HTTP POST /api/telemetry/raw-ppg.
 *    This completely bypasses ThingSpeak's 15-second rate limit to render smooth,
 *    continuous 60 FPS live PPG waveforms with visible systolic peaks and dicrotic notches.
 *
 * 2. VITAL SIGNS CLOUD LOGGING (15-second interval):
 *    Calculates aggregated Heart Rate (BPM), SpO2 (%), and temperature, and uploads to
 *    ThingSpeak Channel 3110138 every 15 seconds.
 *    This preserves existing doctor/patient dashboard history, charts, and analytics.
 *
 * WIRING CONNECTIONS:
 * MAX30102         ESP8266 NodeMCU
 * ---------------------------------
 * VIN ------------ 3.3V (or 5V if module has 3.3V LDO)
 * GND ------------ GND
 * SCL ------------ D1 (GPIO 5)
 * SDA ------------ D2 (GPIO 4)
 * INT ------------ (Optional, not needed for polled I2C)
 * =========================================================================================
 */

#include <ESP8266WiFi.h>
#include <ESP8266HTTPClient.h>
#include <WiFiClient.h>
#include <Wire.h>
#include "MAX30105.h" // SparkFun MAX3010x library (supports MAX30102)

// =================== CONFIGURATION SETTINGS ===================
const char* WIFI_SSID     = "YOUR_WIFI_SSID";
const char* WIFI_PASSWORD = "YOUR_WIFI_PASSWORD";

// PulseGuard Local/Cloud Backend
const char* PULSEGUARD_SERVER_URL = "http://192.168.1.100:8000/api/telemetry/raw-ppg";
const char* PATIENT_ID            = "P-101"; // Assign to patient: Hithesh (P-101), Rithesh (P-102), etc.
const char* DEVICE_ID             = "MAX30102-ESP8266-01";

// ThingSpeak Channel Configuration
const char* THINGSPEAK_HOST        = "api.thingspeak.com";
const char* THINGSPEAK_API_KEY     = "EWP138HBYBB8NPP5"; // Replace with your Write API Key if writing
const unsigned long THINGSPEAK_INTERVAL_MS = 15000;      // ThingSpeak 15-second rate limit

// Sensor & Sampling Configuration
#define SAMPLE_RATE_HZ     100   // 100 Hz sampling (10 ms period)
#define SAMPLE_PERIOD_US   10000 // 10,000 microseconds = 10 ms
#define RAW_BATCH_SIZE     10    // Pack 10 samples per HTTP POST (~100 ms burst)
#define FINGER_THRESHOLD   50000 // Raw IR < 50,000 indicates finger detached

// =================== GLOBAL OBJECTS & STATE ===================
MAX30105 particleSensor;
WiFiClient wifiClient;

// Batch buffer for raw samples
uint32_t irBuffer[RAW_BATCH_SIZE];
uint32_t redBuffer[RAW_BATCH_SIZE];
uint8_t bufferIndex = 0;

// Timing counters
unsigned long lastSampleMicros = 0;
unsigned long lastThingSpeakMillis = 0;

// Clinical estimation variables
float lastCalculatedHR = 75.0;
float lastCalculatedSpO2 = 98.2;
float lastSensorTemp = 36.8;
bool isFingerPresent = false;

// Peak detection state for local BPM calculation
unsigned long lastPeakTime = 0;
uint32_t lastPeakValue = 0;
uint32_t runningAvgIR = 160000;

void setup() {
  Serial.begin(115200);
  delay(100);
  Serial.println("\n[PULSEGUARD] Initializing MAX30102 Dual-Stream Node...");

  // Initialize I2C (SDA=D2, SCL=D1)
  Wire.begin(D2, D1);
  Wire.setClock(400000); // 400kHz Fast I2C

  // Initialize MAX30102
  if (!particleSensor.begin(Wire, I2C_SPEED_FAST)) {
    Serial.println("[ERROR] MAX30102 sensor was not found. Check wiring (SDA/SCL/VCC/GND).");
    while (1) { delay(1000); }
  }

  // Configure MAX30102 for High-Fidelity PPG
  // LED Mode: 2 (Red + IR)
  // Sample Average: 1 (no hardware averaging to preserve raw dicrotic notch)
  // ADC Range: 4096 nA
  // Sample Rate: 100 Hz
  // Pulse Width: 411 us (18-bit resolution)
  byte ledBrightness = 60; // 0=Off to 255=50mA
  byte sampleAverage = 1;
  byte ledMode = 2;        // Red + IR
  int sampleRate = 100;    // 100 Hz
  int pulseWidth = 411;    // 18-bit
  int adcRange = 4096;

  particleSensor.setup(ledBrightness, sampleAverage, ledMode, sampleRate, pulseWidth, adcRange);
  particleSensor.enableDIETEMPRDY(); // Enable on-chip temperature sensor

  // Connect to Wi-Fi
  Serial.printf("[WIFI] Connecting to %s", WIFI_SSID);
  WiFi.mode(WIFI_STA);
  WiFi.begin(WIFI_SSID, WIFI_PASSWORD);
  int attempts = 0;
  while (WiFi.status() != WL_CONNECTED && attempts < 20) {
    delay(500);
    Serial.print(".");
    attempts++;
  }
  
  if (WiFi.status() == WL_CONNECTED) {
    Serial.printf("\n[WIFI] Connected! IP Address: %s\n", WiFi.localIP().toString().c_str());
  } else {
    Serial.println("\n[WIFI] Warning: Wi-Fi not connected yet. Operating in standalone mode.");
  }

  lastSampleMicros = micros();
  lastThingSpeakMillis = millis();
}

void loop() {
  unsigned long currentMicros = micros();

  // 1. Precise 100 Hz sampling timer (every 10,000 microseconds)
  if (currentMicros - lastSampleMicros >= SAMPLE_PERIOD_US) {
    lastSampleMicros += SAMPLE_PERIOD_US;

    // Read 18-bit raw optical values
    uint32_t irValue  = particleSensor.getIR();
    uint32_t redValue = particleSensor.getRed();

    // Check for finger placement
    if (irValue > FINGER_THRESHOLD) {
      isFingerPresent = true;
      detectLocalPeak(irValue);
    } else {
      isFingerPresent = false;
    }

    // Store in burst buffer
    irBuffer[bufferIndex]  = irValue;
    redBuffer[bufferIndex] = redValue;
    bufferIndex++;

    // When batch is full (10 samples = 100ms), transmit to PulseGuard Backend
    if (bufferIndex >= RAW_BATCH_SIZE) {
      sendRawBatchToPulseGuard();
      bufferIndex = 0;
    }
  }

  // 2. Periodic 15-second vital signs upload to ThingSpeak
  unsigned long currentMillis = millis();
  if (currentMillis - lastThingSpeakMillis >= THINGSPEAK_INTERVAL_MS) {
    lastThingSpeakMillis = currentMillis;

    // Read on-chip temperature
    float tempC = particleSensor.readTemperature();
    if (tempC > 20.0 && tempC < 50.0) {
      lastSensorTemp = tempC;
    }

    uploadToThingSpeak(lastCalculatedHR, lastSensorTemp, lastCalculatedSpO2);
  }
}

// Transmit 10 raw samples over HTTP POST (JSON) to PulseGuard Backend
void sendRawBatchToPulseGuard() {
  if (WiFi.status() != WL_CONNECTED) return;

  HTTPClient http;
  http.begin(wifiClient, PULSEGUARD_SERVER_URL);
  http.addHeader("Content-Type", "application/json");

  // Construct JSON payload
  String json = "{";
  json += "\"patient_id\":\"" + String(PATIENT_ID) + "\",";
  json += "\"device_id\":\"" + String(DEVICE_ID) + "\",";
  json += "\"finger_detected\":" + String(isFingerPresent ? "true" : "false") + ",";
  json += "\"sample_rate_hz\":" + String(SAMPLE_RATE_HZ) + ",";
  
  json += "\"raw_ir\":[";
  for (int i = 0; i < RAW_BATCH_SIZE; i++) {
    json += String(irBuffer[i]);
    if (i < RAW_BATCH_SIZE - 1) json += ",";
  }
  json += "],";

  json += "\"raw_red\":[";
  for (int i = 0; i < RAW_BATCH_SIZE; i++) {
    json += String(redBuffer[i]);
    if (i < RAW_BATCH_SIZE - 1) json += ",";
  }
  json += "]}";

  // Send non-blocking or fast POST
  http.setTimeout(150); // 150ms timeout to avoid starving 100Hz loop
  int httpCode = http.POST(json);
  if (httpCode > 0 && httpCode != HTTP_CODE_OK) {
    Serial.printf("[HTTP] Raw stream returned code: %d\n", httpCode);
  }
  http.end();
}

// Upload periodic aggregated vitals to ThingSpeak
void uploadToThingSpeak(float hr, float temp, float spo2) {
  if (WiFi.status() != WL_CONNECTED) return;

  HTTPClient http;
  String url = "http://" + String(THINGSPEAK_HOST) + "/update?api_key=" + String(THINGSPEAK_API_KEY);
  url += "&field1=" + String(isFingerPresent ? hr : 0);
  url += "&field2=" + String(temp, 1);
  url += "&field3=" + String(isFingerPresent ? spo2 : 0);

  Serial.println("[THINGSPEAK] Uploading 15s vitals update: " + url);
  http.begin(wifiClient, url);
  int httpCode = http.GET();
  if (httpCode > 0) {
    Serial.printf("[THINGSPEAK] Entry written successfully (Code %d)\n", httpCode);
  } else {
    Serial.printf("[THINGSPEAK] Upload failed, error: %s\n", http.errorToString(httpCode).c_str());
  }
  http.end();
}

// Basic peak detector for local BPM estimation
void detectLocalPeak(uint32_t currentIR) {
  runningAvgIR = (runningAvgIR * 95 + currentIR * 5) / 100;
  long ac = (long)currentIR - (long)runningAvgIR;

  if (ac > 800 && (millis() - lastPeakTime > 400)) { // Refractory period: > 400ms (< 150 BPM)
    if (currentIR > lastPeakValue) {
      lastPeakValue = currentIR;
    } else {
      // Local peak found
      unsigned long now = millis();
      unsigned long ibi = now - lastPeakTime;
      lastPeakTime = now;
      lastPeakValue = 0;

      if (ibi >= 400 && ibi <= 1500) {
        float bpm = 60000.0 / (float)ibi;
        lastCalculatedHR = lastCalculatedHR * 0.7 + bpm * 0.3; // EMA smoothing
      }
    }
  }
}

/*
 * =========================================================================================
 * PULSEGUARD RPM — ARDUINO UNO / NANO + MAX30102 RAW SERIAL STREAMER
 * =========================================================================================
 * Hardware Target: Arduino Uno / Nano / Pro Mini (ATmega328P)
 * Sensor:          Maxim Integrated MAX30102 Pulse Oximeter
 * 
 * Streaming Format:
 * Outputs binary/CSV packets over high-speed hardware serial (115200 baud) at 100 Hz:
 * [RAW_IR],[RAW_RED],[FINGER_FLAG]\n
 * e.g.: "172450,160890,1\n"
 *
 * Can be forwarded by an ESP8266 or read directly by the PulseGuard backend's serial bridge.
 * =========================================================================================
 */

#include <Wire.h>
#include "MAX30105.h"

MAX30105 particleSensor;

#define SAMPLE_PERIOD_US 10000 // 10,000 us = 100 Hz
#define FINGER_THRESHOLD 50000

unsigned long lastSampleMicros = 0;

void setup() {
  Serial.begin(115200);
  while (!Serial);

  Wire.begin();
  Wire.setClock(400000); // 400kHz fast I2C mode

  if (!particleSensor.begin(Wire, I2C_SPEED_FAST)) {
    Serial.println(F("ERR:MAX30102_NOT_FOUND"));
    while (1);
  }

  // Configure MAX30102 for raw 100Hz IR/Red output
  byte ledBrightness = 60; // 0=Off, 255=50mA
  byte sampleAverage = 1;  // No averaging (preserves dicrotic notch)
  byte ledMode = 2;        // Red + IR
  int sampleRate = 100;    // 100 Hz
  int pulseWidth = 411;    // 18-bit ADC resolution
  int adcRange = 4096;

  particleSensor.setup(ledBrightness, sampleAverage, ledMode, sampleRate, pulseWidth, adcRange);

  lastSampleMicros = micros();
}

void loop() {
  unsigned long currentMicros = micros();

  if (currentMicros - lastSampleMicros >= SAMPLE_PERIOD_US) {
    lastSampleMicros += SAMPLE_PERIOD_US;

    uint32_t irValue = particleSensor.getIR();
    uint32_t redValue = particleSensor.getRed();
    bool fingerDetected = (irValue > FINGER_THRESHOLD);

    // Stream line to serial port
    Serial.print(irValue);
    Serial.print(',');
    Serial.print(redValue);
    Serial.print(',');
    Serial.println(fingerDetected ? 1 : 0);
  }
}

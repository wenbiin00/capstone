/*
 * AEWRS RFID Locker Controller
 * Hardware: Arduino Uno + RC522 + HX711 load cell + IR sensor + IRF520 MOSFET + 12V solenoid
 *
 * Wiring (RC522):
 *   SDA  → D10 | SCK  → D13 | MOSI → D11 | MISO → D12 | RST → D9 | 3.3V | GND
 *
 * Wiring (Solenoid via MOSFET):
 *   D7 → MOSFET gate (IRF520)
 *
 * Wiring (IR sensor):
 *   D2 → OUT (LOW = item detected)
 *
 * Wiring (HX711 load cell):
 *   D4 → DT | D5 → SCK
 *
 * Serial protocol:
 *   Arduino → Bridge:  SCAN:<UID_HEX>
 *                       SENSOR:IR=<0|1>,WEIGHT=<grams>
 *                       STATUS:<message>
 *   Bridge  → Arduino: UNLOCK  or  DENY
 */

#include <SPI.h>
#include <MFRC522.h>
#include <HX711.h>

// ── Pin Definitions ──────────────────────────
#define SS_PIN        10
#define RST_PIN       9
#define SOLENOID_PIN  7
#define IR_PIN        2
#define HX711_DT      4
#define HX711_SCK     5

// ── Config ───────────────────────────────────
#define WEIGHT_THRESHOLD  20.0   // grams — above this = item present
#define UNLOCK_DURATION   5000   // ms to hold solenoid open
#define RESPONSE_TIMEOUT  8000   // ms to wait for bridge response before giving up
#define STATUS_INTERVAL   3000   // ms between periodic sensor prints
#define DEBOUNCE_MS       2000   // ms min between scans

// ── Objects ──────────────────────────────────
MFRC522 rfid(SS_PIN, RST_PIN);
HX711 scale;

// ── State ────────────────────────────────────
bool waitingForResponse = false;
unsigned long responseDeadline = 0;
unsigned long lastScanTime = 0;
unsigned long lastStatusPrint = 0;
float calibrationFactor = 1050;

// ── Helpers ──────────────────────────────────
bool itemDetectedIR() {
  return digitalRead(IR_PIN) == LOW;  // LOW = beam broken = item present
}

float readWeight() {
  if (!scale.is_ready()) return 0;
  float w = scale.get_units(5);
  return w < 0 ? 0 : w;
}

void sendSensorState() {
  float w = readWeight();
  Serial.print("SENSOR:IR=");
  Serial.print(itemDetectedIR() ? "1" : "0");
  Serial.print(",WEIGHT=");
  Serial.println(w, 1);
}

void unlockDoor() {
  Serial.println("STATUS:UNLOCKING");
  digitalWrite(SOLENOID_PIN, HIGH);

  unsigned long start = millis();
  while (millis() - start < UNLOCK_DURATION) {
    // Keep printing sensor state during unlock window
    if (millis() - lastStatusPrint >= STATUS_INTERVAL) {
      lastStatusPrint = millis();
      float w = readWeight();
      Serial.print("IR: ");
      Serial.print(itemDetectedIR() ? "1 (DETECTED)" : "0 (EMPTY)");
      Serial.print(" | Weight: ");
      Serial.print(w, 2);
      Serial.println("g | Solenoid: UNLOCKED");
    }
  }

  digitalWrite(SOLENOID_PIN, LOW);
  Serial.println("STATUS:LOCKED");

  // Report final sensor state so bridge can log whether item moved
  sendSensorState();
}

// ── Setup ─────────────────────────────────────
void setup() {
  Serial.begin(9600);

  // RFID
  SPI.begin();
  rfid.PCD_Init();
  byte version = rfid.PCD_ReadRegister(MFRC522::VersionReg);
  Serial.print("RC522 Version: 0x");
  Serial.println(version, HEX);
  if (version == 0x00 || version == 0xFF) {
    Serial.println("ERROR: RC522 not detected!");
  } else {
    Serial.println("RC522 OK");
  }

  // Solenoid
  pinMode(SOLENOID_PIN, OUTPUT);
  digitalWrite(SOLENOID_PIN, LOW);
  Serial.println("Solenoid OK");

  // IR Sensor
  pinMode(IR_PIN, INPUT);
  Serial.println("IR Sensor OK");

  // Weight Sensor
  scale.begin(HX711_DT, HX711_SCK);
  scale.set_scale(calibrationFactor);
  scale.tare();
  Serial.println("Weight Sensor OK");

  Serial.println("STATUS:READY");
  Serial.println("=== ALL COMPONENTS READY ===");
}

// ── Main Loop ────────────────────────────────
void loop() {

  // ── Periodic sensor status print ───────────
  if (!waitingForResponse && millis() - lastStatusPrint >= STATUS_INTERVAL) {
    lastStatusPrint = millis();
    float w = readWeight();
    Serial.print("IR: ");
    Serial.print(itemDetectedIR() ? "1 (DETECTED)" : "0 (EMPTY)");
    Serial.print(" | Weight: ");
    Serial.print(w, 2);
    Serial.println("g");
  }

  // ── Waiting for bridge response ─────────────
  if (waitingForResponse) {
    // Timeout guard — if bridge doesn't respond in time, deny
    if (millis() > responseDeadline) {
      Serial.println("STATUS:TIMEOUT");
      waitingForResponse = false;
      return;
    }

    if (Serial.available() > 0) {
      String response = Serial.readStringUntil('\n');
      response.trim();

      if (response == "UNLOCK") {
        waitingForResponse = false;
        unlockDoor();
      } else if (response == "DENY") {
        Serial.println("STATUS:ACCESS_DENIED");
        waitingForResponse = false;
      }
      // Ignore unknown lines (e.g. leftover STATUS echoes)
    }
    return;  // Don't scan new cards while waiting
  }

  // ── Check for new RFID card ─────────────────
  if (!rfid.PICC_IsNewCardPresent() || !rfid.PICC_ReadCardSerial()) {
    return;
  }

  // Debounce
  unsigned long now = millis();
  if (now - lastScanTime < DEBOUNCE_MS) {
    rfid.PICC_HaltA();
    return;
  }
  lastScanTime = now;

  // Build UID hex string
  String uid = "";
  for (byte i = 0; i < rfid.uid.size; i++) {
    if (rfid.uid.uidByte[i] < 0x10) uid += "0";
    uid += String(rfid.uid.uidByte[i], HEX);
  }
  uid.toUpperCase();

  Serial.println("======================");
  Serial.println("RFID Card Detected!");
  Serial.print("UID: ");
  Serial.println(uid);

  // Send to bridge and wait
  Serial.print("SCAN:");
  Serial.println(uid);
  waitingForResponse = true;
  responseDeadline = millis() + RESPONSE_TIMEOUT;

  rfid.PICC_HaltA();
  rfid.PCD_StopCrypto1();
}

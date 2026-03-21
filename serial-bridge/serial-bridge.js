/**
 * AEWRS Serial Bridge
 * Reads RFID scans from Arduino via USB serial, forwards to Express backend,
 * then sends UNLOCK or DENY back to Arduino.
 *
 * Usage:
 *   node serial-bridge.js
 *
 * Requires:
 *   npm install serialport axios dotenv
 */

require('dotenv').config();
const { SerialPort } = require('serialport');
const { ReadlineParser } = require('@serialport/parser-readline');
const axios = require('axios');

// ── Config ────────────────────────────────────────────────────────────────────
const SERIAL_PORT  = process.env.SERIAL_PORT  || '/dev/cu.usbmodem1101';
const BAUD_RATE    = parseInt(process.env.BAUD_RATE || '9600');
const API_BASE_URL = process.env.API_BASE_URL  || 'http://localhost:3000/api';
const LOCKER_ID    = parseInt(process.env.LOCKER_ID || '1');  // DB locker_id for this unit
// ─────────────────────────────────────────────────────────────────────────────

console.log(`[Bridge] Connecting to ${SERIAL_PORT} @ ${BAUD_RATE} baud`);
console.log(`[Bridge] Backend: ${API_BASE_URL}`);
console.log(`[Bridge] Locker ID: ${LOCKER_ID}`);

const port = new SerialPort({ path: SERIAL_PORT, baudRate: BAUD_RATE });
const parser = port.pipe(new ReadlineParser({ delimiter: '\n' }));

port.on('open', () => {
  console.log('[Bridge] Serial port open — waiting for Arduino...');
});

port.on('error', (err) => {
  console.error('[Bridge] Serial port error:', err.message);
  process.exit(1);
});

parser.on('data', async (line) => {
  line = line.trim();
  if (!line) return;

  // STATUS lines are just informational
  if (line.startsWith('STATUS:')) {
    console.log(`[Arduino] ${line.replace('STATUS:', '')}`);
    return;
  }

  // SCAN:<UID> — forward to backend
  if (line.startsWith('SCAN:')) {
    const rfid_uid = line.replace('SCAN:', '').trim();
    console.log(`[Bridge] Card scanned: ${rfid_uid}`);

    try {
      const response = await axios.post(`${API_BASE_URL}/rfid/scan`, {
        rfid_uid,
        locker_id: LOCKER_ID,
      });

      const { success, action, message, data } = response.data;

      if (success) {
        console.log(`[Backend] OK — action: ${action}`);
        console.log(`[Backend] ${message}`);
        if (data) console.log('[Backend] Data:', JSON.stringify(data));

        // All successful actions unlock the door
        sendToArduino('UNLOCK');
      } else {
        console.log(`[Backend] Denied — ${message || response.data.error}`);
        sendToArduino('DENY');
      }
    } catch (err) {
      if (err.response) {
        // HTTP error (403, 400, etc.)
        const { error, message } = err.response.data;
        console.log(`[Backend] ${err.response.status} — ${error || message}`);
      } else {
        // Network error
        console.error('[Bridge] Request failed:', err.message);
      }
      sendToArduino('DENY');
    }
    return;
  }

  // SENSOR:IR=<0|1>,WEIGHT=<grams> — forward sensor state to backend
  if (line.startsWith('SENSOR:')) {
    const parts      = line.replace('SENSOR:', '').split(',');
    const irPart     = parts.find(p => p.startsWith('IR='));
    const weightPart = parts.find(p => p.startsWith('WEIGHT='));

    if (irPart && weightPart) {
      const ir_detected  = parseInt(irPart.replace('IR=', '')) === 1;
      const weight_grams = parseFloat(weightPart.replace('WEIGHT=', ''));

      console.log(`[Bridge] Sensor — IR: ${ir_detected ? 'DETECTED' : 'EMPTY'}, Weight: ${weight_grams.toFixed(1)}g`);

      try {
        await axios.post(`${API_BASE_URL}/lockers/${LOCKER_ID}/sensor`, { ir_detected, weight_grams });
      } catch (err) {
        console.error('[Bridge] Sensor update failed:', err.response?.data?.error || err.message);
      }
    }
    return;
  }

  // Unknown line — log it
  console.log(`[Arduino] ${line}`);
});

function sendToArduino(command) {
  port.write(`${command}\n`, (err) => {
    if (err) {
      console.error('[Bridge] Write error:', err.message);
    } else {
      console.log(`[Bridge] Sent to Arduino: ${command}`);
    }
  });
}

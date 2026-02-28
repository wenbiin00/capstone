const { SerialPort } = require('serialport');
const { ReadlineParser } = require('@serialport/parser-readline');
const axios = require('axios');

// Change COM3 to your Arduino's port (check Arduino IDE → Tools → Port)
// On Mac/Linux it'll be something like /dev/ttyUSB0 or /dev/tty.usbmodem14101
const port = new SerialPort({ path: 'COM3', baudRate: 9600 });
const parser = port.pipe(new ReadlineParser({ delimiter: '\n' }));

console.log('Serial bridge running, waiting for RFID scans...');

parser.on('data', async (line) => {
  line = line.trim();
  console.log('Received from Arduino:', line);

  if (line.startsWith('UID:')) {
    const uid = line.replace('UID:', '');
    console.log(`Card scanned: ${uid}`);

    try {
      // Call your backend API
      const response = await axios.post('http://localhost:3000/api/locker/access', {
        rfid_uid: uid
      });

      const decision = response.data.access; // "grant" or "deny"
      console.log(`Backend decision: ${decision}`);

      // Send decision back to Arduino
      port.write(decision.toUpperCase() + '\n');

    } catch (error) {
      console.error('Backend error:', error.message);
      port.write('DENY\n'); // Fail safe — deny on error
    }
  }
});
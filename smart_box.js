const mysql = require('mysql');
const { Sms } = require('twilio');
const Bolt = require('boltiot').Bolt;
const credentials = require('./credentials'); // assuming the file has your API keys and other credentials
const moment = require('moment');

// Set up MySQL connection
const db = mysql.createConnection({
  host: 'localhost',
  user: 'root',
  password: 'your_password', // Replace with your DB password
  database: 'medicine_box'
});

db.connect(err => {
  if (err) throw err;
  console.log('Connected to MySQL database');
});

// Set up Twilio SMS service
const client = new Sms(credentials.TWILIO_SID, credentials.TWILIO_AUTH_TOKEN);

// Set up Bolt IoT
const mybolt = new Bolt(credentials.BOLT_API_KEY, credentials.BOLT_DEVICE_ID);

// Function to check expiry date before updating stock
const updateStock = (medicineId) => {
  const checkExpiryQuery = 'SELECT expiry_date FROM medicines WHERE id = ?';
  
  db.query(checkExpiryQuery, [medicineId], (err, result) => {
    if (err) {
      console.error('Error checking expiry date:', err);
      return;
    }

    const expiryDate = result[0].expiry_date;
    const currentDate = moment().format('YYYY-MM-DD');

    // If the medicine is expired, do not update the stock and send a message
    if (moment(expiryDate).isBefore(currentDate)) {
      console.log(`Medicine ID ${medicineId} is expired!`);
      client.messages.create({
        to: credentials.TO_NUMBER,
        from: credentials.FROM_NUMBER,
        body: 'Alert: Medicine has expired and cannot be dispensed.'
      })
      .then(message => console.log('Expiry alert sent:', message.sid))
      .catch(err => console.error('Error sending expiry SMS:', err));
    } else {
      // Update stock if medicine is not expired
      const updateQuery = 'UPDATE medicines SET stock = stock - 1 WHERE id = ?';
      db.query(updateQuery, [medicineId], (err, result) => {
        if (err) {
          console.error('Error updating stock:', err);
          return;
        }
        console.log(`Stock updated for medicine ID: ${medicineId}`);
      });
    }
  });
};

// Function to check the alarm and medicine taking status
const setAlarm = (alarmHour, alarmMinute, medicineId) => {
  const alarmTime = moment().set({ hour: alarmHour, minute: alarmMinute, second: 0, millisecond: 0 });

  setInterval(() => {
    const currentTime = moment();

    // If current time matches alarm time
    if (currentTime.isSame(alarmTime, 'minute')) {
      // Trigger alarm (just simulating here)
      console.log('Alarm triggered');
      mybolt.digitalWrite('2', 'HIGH');
      mybolt.digitalWrite('3', 'HIGH');

      setTimeout(() => {
        mybolt.digitalRead('1', (response) => {
          const buttonData = JSON.parse(response);

          // Check if the button was not pressed (patient didn't take the medicine)
          if (buttonData.value === '0') {
            console.log('Medicine not taken!');
            updateStock(medicineId);  // Update the stock in the database if medicine is not taken
            client.messages.create({
              to: credentials.TO_NUMBER,
              from: credentials.FROM_NUMBER,
              body: 'Alert: Patient has not taken the medicine. Please remind them.'
            })
            .then(message => console.log('Message sent:', message.sid))
            .catch(err => console.error('Error sending SMS:', err));
          }

          // Reset alarm
          mybolt.digitalWrite('2', 'LOW');
          mybolt.digitalWrite('3', 'LOW');
        });
      }, 60000);  // Wait for 1 minute before checking button state
    }
  }, 60000);  // Check every minute
};

// Example usage: Set alarm at 10:30 AM for medicine ID 1
setAlarm(10, 30, 1);

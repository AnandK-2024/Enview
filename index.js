const express = require('express');
const bodyParser = require('body-parser');
const cron = require('node-cron');

const app = express();
const PORT = 3000;

// storing events in memory
const EVENTS = [];
const ALERTS = [];
const locationThresholds = {
  highway: 4,
  city_center: 3,
  commercial: 2,
  residential: 1,
};
let AlertCount=0;


app.use(bodyParser.json());

//endpoint to receive driving events
app.post('/event', (req, res) => {
  const event = req.body;
  EVENTS.push(event);
    console.log(event);

  checkRule();

  res.status(200).send('Event received');
});

// endpoint to get an alert by UniqueID
app.get('/alert/:alert_id', (req, res) => {
  const alertId = req.params.alert_id;
  const alert = ALERTS.find((a) => a.id === alertId);

  if (alert) {
    
    res.status(200).json(alert);
  } else {
    res.status(404).send('Alert not found');
  }
});


// check the rule conditions and generate alerts
function checkRule() {
  // Get recent events recieved in  last 5 minutes
  const recentEvents = EVENTS.filter((event) => {
    const eventTimestamp = new Date(event.timestamp);
    const now = new Date();
    const timeDifference = now - eventTimestamp;
    return timeDifference <= 5 * 60 * 1000; // 5 minutes in milliseconds
  });

  // Group events by location 
  const eventsByLocationType = recentEvents.reduce((acc, event) => {
    acc[event.location_type] = acc[event.location_type] || 0;
    acc[event.location_type]++;
    return acc;
  }, {});

  // Check rule conditions for each location type
  for (const locationType in eventsByLocationType) {
    const eventCount = eventsByLocationType[locationType];
    const threshold = locationThresholds[locationType];

    if (eventCount >= threshold && !hasAlertInLast5Minutes()) {
      const alert = {
        id: generateUniqueId(),
        location_type: locationType,
        timestamp: new Date().toISOString(),
      };
      ALERTS.push(alert);

    }
  }
}

// Function to check if there's already an alert generated in the last 5 minutes
function hasAlertInLast5Minutes() {
  const now = new Date();
  const lastAlertTimestamp = ALERTS.length > 0 ? new Date(ALERTS[ALERTS.length - 1].timestamp) : null;

  return lastAlertTimestamp && now - lastAlertTimestamp <= 5 * 60 * 1000;
}

// Function to generate a unique ID for alerts
function generateUniqueId() {
    AlertCount+=1
    return AlertCount.toString();
}

// Schedule the rule check every 5 minutes
cron.schedule('*/5 * * * *', () => {
  checkRule();
});

// Start the server
app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});
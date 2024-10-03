const pidusage = require('pidusage');
const os = require('os');
const v8 = require('v8');
const sendMetrics = require('./send-metrics');
const debug = require('debug')('express-status-monitor');
const fs = require('fs');
const path = require('path');

let lastDatabaseLog = 0;

module.exports = (io, span, config) => {
  const defaultResponse = {
    2: 0,
    3: 0,
    4: 0,
    5: 0,
    count: 0,
    mean: 0,
    timestamp: Date.now(),
  };

  pidusage(process.pid, (err, stat) => {
    if (err) {
      debug('Error in pidusage:', err);
      return;
    }

    if (!stat) {
      debug('No stat data returned from pidusage');
      return;
    }

    try {
      const last = span.responses[span.responses.length - 1] || defaultResponse;

      // Convert from B to MB
      stat.memory = stat.memory / 1024 / 1024;
      stat.load = os.loadavg();
      stat.timestamp = Date.now();
      stat.heap = v8.getHeapStatistics();

      span.os.push(stat);
      if (!span.responses[0] || (last.timestamp + span.interval) * 1000 < Date.now()) {
        span.responses.push(defaultResponse);
      }

      if (span.os.length >= span.retention) span.os.shift();
      if (span.responses[0] && span.responses.length > span.retention) span.responses.shift();
      
      // Database logging
      if (stat.timestamp - lastDatabaseLog >= config.databaseLoggingInterval * 1000) {
        console.log("inside writing stats to file")
        lastDatabaseLog = stat.timestamp;
        const databaseFile = path.resolve(config.databaseFile);

        // Reading existing data from the JSON file
        fs.readFile(databaseFile, 'utf8', (readErr, data) => {
          if (readErr) {
            debug('Error reading the JSON file:', readErr);
            console.log('Error reading the JSON file:', readErr)
            return;
          }

          let jsonData;

          try {
            jsonData = JSON.parse(data); // Parse existing data
          } catch (parseErr) {
            debug('Error parsing the JSON file:', parseErr);
            console.log('Error parsing the JSON file:', parseErr);
            jsonData = {
              os: [],
              responses: [],
              interval: span.interval || 1,
              retention: span.retention || 60,
            }; // If parsing fails or data is empty, initialize an empty structure
          }

          // Initialize os and responses arrays if they don't exist
          jsonData.os = jsonData.os || [];
          jsonData.responses = jsonData.responses || [];

          // Calculate the date 6 months ago
          const sixMonthsAgo = Date.now() - 6 * 30 * 24 * 60 * 60 * 1000; // Approx. 6 months in milliseconds

          // Filter out OS entries older than 6 months
          jsonData.os = jsonData.os.filter(entry => entry.timestamp >= sixMonthsAgo);

          // Filter out response entries older than 6 months
          jsonData.responses = jsonData.responses.filter(entry => entry.timestamp >= sixMonthsAgo);

          // Append the new OS data (pidusage stats)
          jsonData.os.push({
            cpu: stat.cpu,
            memory: stat.memory,
            load: stat.load,
            timestamp: stat.timestamp,
            pid: stat.pid,
            ppid: stat.ppid,
            ctime: stat.ctime,
            elapsed: stat.elapsed,
            heap: stat.heap,
          });

          // Append the new response data
          jsonData.responses.push({
            2: defaultResponse['2'],
            3: defaultResponse['3'],
            4: defaultResponse['4'],
            5: defaultResponse['5'],
            count: defaultResponse.count,
            mean: defaultResponse.mean,
            timestamp: Date.now(),
          });

          // Write the updated data back to the JSON file
          fs.writeFile(databaseFile, JSON.stringify(jsonData, null, 2), 'utf8', writeErr => {
            if (writeErr) {
              debug('Error writing to the JSON file:', writeErr);
              console.log('Error writing to the JSON file:', writeErr);

            } else {
              debug('Successfully appended to the JSON file.');
              console.log('Successfully appended to the JSON file.');

            }
          });
        });
      }

      sendMetrics(io, span);
    } catch (error) {
      debug('Error in gather-os-metrics:', error);
    }
  });
};

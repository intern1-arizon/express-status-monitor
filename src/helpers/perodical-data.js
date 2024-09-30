const fs = require('fs');
const path = require('path');

// Function to calculate the date range based on the variable
const getDateRange = (timeRange) => {
  const now = new Date();
  switch (timeRange) {
    case '7days':
      return new Date(now.setDate(now.getDate() - 7));
    case '30days':
      return new Date(now.setDate(now.getDate() - 30));
    case '6months':
      return new Date(now.setMonth(now.getMonth() - 6));
    default:
      throw new Error('Invalid time range. Please use "7days", "30days", or "6months".');
  }
};

// Retrieve and group data by half-hour intervals, and calculate max for each group
const getStats = async (timeRange, filePath) => {
  const startDate = getDateRange(timeRange);

  // Check if the file exists, if not, initialize a fresh object
  let data;
  const resolvedFilePath = path.resolve(filePath);
  try {
    const rawData = fs.readFileSync(resolvedFilePath, 'utf8');
    data = rawData ? JSON.parse(rawData) : {};
  } catch (err) {
    // File doesn't exist or is empty, create fresh structure
    data = {
      os: [],
      responses: [],
      interval: 1, // Default interval
      retention: 60 // Default retention period
    };
  }

  // Ensure os and responses arrays are initialized
  data.os = data.os || [];
  data.responses = data.responses || [];

  console.log('file', resolvedFilePath, data.os.length, data.responses.length);

  // Filter the OS and responses data based on the timestamp (greater than the startDate)
  const filteredOsData = data.os.filter((entry) => entry.timestamp >= startDate.getTime());
  const filteredResponsesData = data.responses.filter((entry) => entry.timestamp >= startDate.getTime());

  console.log('filtered data', filteredOsData.length, filteredResponsesData.length);

  // Grouping the data by half-hour intervals and calculating max for each group
  const groupedData = {
    interval: data.interval,
    retention: data.retention,
    os: [],
    responses: []
  };

  let currentInterval = null;
  let maxOsStatsInInterval = null;
  let maxResponseStatsInInterval = null;

  // Grouping and calculating max for OS data
  filteredOsData.forEach((entry) => {
    const currentHalfHour = new Date(Math.floor(entry.timestamp / (30 * 60 * 1000)) * (30 * 60 * 1000));

    if (!currentInterval || currentInterval.getTime() !== currentHalfHour.getTime()) {
      if (maxOsStatsInInterval) {
        groupedData.os.push({
          ...maxOsStatsInInterval,
          timestamp: currentInterval.getTime()
        });
      }

      currentInterval = currentHalfHour;
      maxOsStatsInInterval = {
        cpu: entry.cpu,
        memory: entry.memory,
        load: entry.load,
        heap: entry.heap,
        timestamp: entry.timestamp,
        pid: entry.pid,
        ppid: entry.ppid,
        ctime: entry.ctime,
        elapsed: entry.elapsed
      };
    } else {
      // Calculate the maximum for the current half-hour interval for OS data
      maxOsStatsInInterval.cpu = Math.max(maxOsStatsInInterval.cpu, entry.cpu);
      maxOsStatsInInterval.memory = Math.max(maxOsStatsInInterval.memory, entry.memory);
      maxOsStatsInInterval.load = [
        Math.max(maxOsStatsInInterval.load[0], entry.load[0]),
        Math.max(maxOsStatsInInterval.load[1], entry.load[1]),
        Math.max(maxOsStatsInInterval.load[2], entry.load[2])
      ];
    }
  });

  // Add the last OS interval's max stats to the result
  if (maxOsStatsInInterval) {
    groupedData.os.push({
      ...maxOsStatsInInterval,
      timestamp: currentInterval.getTime()
    });
  }

  // Reset the currentInterval for responses
  currentInterval = null;

  // Grouping and calculating max for response data
  filteredResponsesData.forEach((entry) => {
    const currentHalfHour = new Date(Math.floor(entry.timestamp / (30 * 60 * 1000)) * (30 * 60 * 1000));

    if (!currentInterval || currentInterval.getTime() !== currentHalfHour.getTime()) {
      if (maxResponseStatsInInterval) {
        groupedData.responses.push({
          ...maxResponseStatsInInterval,
          timestamp: currentInterval.getTime()
        });
      }

      currentInterval = currentHalfHour;
      maxResponseStatsInInterval = {
        '2': entry['2'],
        '3': entry['3'],
        '4': entry['4'],
        '5': entry['5'],
        count: entry.count,
        mean: entry.mean,
        timestamp: entry.timestamp
      };
    } else {
      // Calculate the maximum for the current half-hour interval for response data
      maxResponseStatsInInterval['2'] = Math.max(maxResponseStatsInInterval['2'], entry['2']);
      maxResponseStatsInInterval['3'] = Math.max(maxResponseStatsInInterval['3'], entry['3']);
      maxResponseStatsInInterval['4'] = Math.max(maxResponseStatsInInterval['4'], entry['4']);
      maxResponseStatsInInterval['5'] = Math.max(maxResponseStatsInInterval['5'], entry['5']);
      maxResponseStatsInInterval.mean = Math.max(maxResponseStatsInInterval.mean, entry.mean);
    }
  });

  // Add the last response interval's max stats to the result
  if (maxResponseStatsInInterval) {
    groupedData.responses.push({
      ...maxResponseStatsInInterval,
      timestamp: currentInterval.getTime()
    });
  }

  return groupedData;
};

// Function to retrieve the data based on the interval
const getData = async (interval, filePath) => {
  const groupedData = await getStats(interval, filePath);
  return groupedData;
};

module.exports = getData;

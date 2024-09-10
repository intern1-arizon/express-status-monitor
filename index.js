const middlewareWrapper = require('./middleware-wrapper');
const gatherOsMetrics = require('./helpers/gather-os-metrics');
const validate = require('./helpers/validate');

let metricGatheringInterval;
let config;

const startMetricGathering = () => {
  if (metricGatheringInterval) {
    clearInterval(metricGatheringInterval);
  }
  
  metricGatheringInterval = setInterval(() => {
    gatherOsMetrics(null, config.spans[0], config);
  }, config.databaseLoggingInterval * 1000);

  // Start immediately
  gatherOsMetrics(null, config.spans[0], config);
};

const statusMonitor = (appConfig) => {
  config = validate(appConfig);
  return middlewareWrapper(config);
};

statusMonitor.startLogging = () => {
  if (!config) {
    throw new Error('Status monitor config not initialized. Call statusMonitor() first.');
  }
  startMetricGathering();
};

module.exports = statusMonitor;
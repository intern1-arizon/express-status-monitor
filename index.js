const middlewareWrapper = require('./middleware-wrapper');
const gatherOsMetrics = require('./helpers/gather-os-metrics');

let metricGatheringInterval;

const startMetricGathering = (config) => {
  if (metricGatheringInterval) {
    clearInterval(metricGatheringInterval);
  }
  
  metricGatheringInterval = setInterval(() => {
    gatherOsMetrics(null, config.spans[0], config);
  }, config.databaseLoggingInterval * 1000);

  // Start immediately
  gatherOsMetrics(null, config.spans[0], config);
};

module.exports = (appConfig) => {
  const config = require('./helpers/validate')(appConfig);
  startMetricGathering(config);
  
  return middlewareWrapper(config);
};
const middlewareWrapper = require('./middleware-wrapper');
const gatherOsMetrics = require('./helpers/gather-os-metrics');

let config;

const init = (appServer, appConfig) => {
  config = appConfig;
  gatherOsMetrics(null, config.spans[0], config);
};

module.exports = (appConfig) => {
  const middleware = middlewareWrapper(appConfig);
  
  return (req, res, next) => {
    if (!config) {
      init(req.socket.server, appConfig);
    }
    return middleware(req, res, next);
  };
};

module.exports.init = init;
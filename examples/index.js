/* eslint no-console: "off" */
const socketIoPort = 2222;
const express = require('express');
const path = require('path');

// This is optional. If your server uses socket.io already, pass it to config as `webserver` along with its port.
const socketio = require('socket.io')(socketIoPort);

const app = express();
const port = process.env.PORT || 3000;

// Resolve the absolute path to the data.json file
const databaseFilePath = path.resolve(__dirname, './data.json');

app.use(
  require('../index')({
    path: '/',
    databaseFile: databaseFilePath, // Use absolute path here
    // Use existing socket.io instance.
    // websocket: socketio,

    // Ignore requests which req.path begins with
    // ignoreStartsWith: '/return-status',

    // Pass socket.io instance port down to config.
    // Use only if you're passing your own instance.
    // port: socketIoPort,
    healthChecks: [
      {
        protocol: 'http',
        host: 'localhost',
        port: 3000,
        path: '/admin/health/ex1',
        headers: {},
      },
      {
        protocol: 'http',
        host: 'localhost',
        port: 3000,
        path: '/return-status/200',
        headers: {},
      },
    ],
  }),
);
app.use(require('express-favicon-short-circuit'));

// Example route throwing requested status code
app.get('/return-status/:statusCode', (req, res) =>
  res.sendStatus(req.params.statusCode),
);

app.listen(port, () => {
  console.log(`Listening on http://0.0.0.0:${port}`);
});

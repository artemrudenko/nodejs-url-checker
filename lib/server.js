/*
 * Server-related tasks
 *
 */

// Dependencies
const fs = require('fs');
const http = require('http');
const https = require('https');
const url = require('url');
const path = require('path');
const StringDecoder = require('string_decoder').StringDecoder;
const config = require('./config');
const handlers = require('./handlers');
const helpers = require('./helpers');

// Instantiate the server module object
var server = {};

// Instantiate the HTTP server
server.httpServer = http.createServer(function (req, res) {
  server.unifiedServer(req, res);
});

// Instantiate the HTTPS server
server.httpsServerOptions = {
  key: fs.readFileSync(path.join(__dirname, '../https/key.pem')),
  cert: fs.readFileSync(path.join(__dirname, '../https/cert.pem'))
};
server.httpsServer = https.createServer(server.httpsServerOptions, function(req, res) {
  server.unifiedServer(req, res);
});

// All the server logic for both the http and https server
server.unifiedServer = function(req, res) {
  // Get the URL and parse it,
  // second arg is true to use querystring module to parse url
  var parsedUrl = url.parse(req.url, true);

  // Get the path
  var path = parsedUrl.pathname;
  // Replace trimming slashes
  var trimmedPath = path.replace(/^\/+|\/+$/g, '');

  // Get the query string as an object
  var queryStringObject  = parsedUrl.query;

  // Get the HTTP method
  var method = req.method.toLowerCase();

  // Get the headers as an object
  var headers = req.headers;

  // Get the payload, if any
  var decoder = new StringDecoder('utf8');
  var buffer = '';
  // data event would be called if there is a payload
  req.on('data', function(data) {
    buffer += decoder.write(data);
  });
  // end event would be called in any case (e.g. it not depends on payload)
  req.on('end', function(){
    buffer += decoder.end();

    // Choose the handler this request should go to. If one is not found, use notFound handler
    var chosenHandler = typeof(server.router[trimmedPath]) !== 'undefined'
      ? server.router[trimmedPath]
      : handlers.notFound;

    // Construct the data object to send it to handler
    var data = {
      trimmedPath,
      queryStringObject,
      method,
      headers,
      payload: helpers.parseJsonToObject(buffer)
    };

    // Route the request to the handler specified in the router
    chosenHandler(data, function(statusCode, payload){
      // Use the status code called back by the handler, or default to 200
      statusCode = typeof(statusCode) === 'number' ? statusCode : 200;

      // Use the payload callback by the handler, or default to empty object
      payload = typeof(payload) == 'object' ? payload : {};

      // Convert the payload to string
      var payloadString = JSON.stringify(payload);

      // Return the response
      res.setHeader('Content-Type', 'application/json');
      res.writeHead(statusCode);
      res.end(payloadString);

      console.log(`Returning this response: ${statusCode}, ${payloadString}`);
    });

    // Log the request path
    // console.log(`Request received on path: ${trimmedPath}
    //     with method: ${method}
    //     and these query string parameters: ${JSON.stringify(queryStringObject)}
    //     and headers: ${JSON.stringify(headers)}
    //     and payload: ${buffer}`);
  });
};

// Define a request router
server.router = {
  ping: handlers.ping,
  users: handlers.users,
  tokens: handlers.tokens,
  checks: handlers.checks
}

// Init script
server.init = function() {
  // Start the HTTP server
  // https://stackoverflow.com/questions/9249830/how-can-i-set-node-env-production-on-windows
  server.httpServer.listen(config.httpPort, function() {
    console.log(`The server is listening on port ${config.httpPort} in config ${config.envName} mode!`);
  });
  // Start the HTTPS server
  server.httpsServer.listen(config.httpsPort, function() {
    console.log(`The server is listening on port ${config.httpsPort} in config ${config.envName} mode!`);
  });
}
// Export the module
module.exports = server;

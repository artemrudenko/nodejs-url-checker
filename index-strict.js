/*
 * Primary file for the API
 *
 * Run it with: node --use_strict .\index-strict.js or use "use strict"
 */
// "use strict"

// Dependencies
var server = require('./lib/server');
var workers = require('./lib/workers');
var cli = require('./lib/cli');

// Declare the application
var app = {};

// Declare a global (that strict mode should catch)
foo = 'bar';

// Init function
app.init = function () {
  // Start the server
  server.init();

  // Start the workers
  workers.init();

  // Start the CLI, but make sure that is starts last
  setTimeout(function () {
    cli.init();
  }, 50);

};

// Execute
app.init();

// Export the app
module.exports = app;

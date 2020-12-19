/*
 * Primary file for the API
 *
 * Run it with: node inspect .\index-debug.js
 */

// Dependencies
var server = require('./lib/server');
var workers = require('./lib/workers');
var cli = require('./lib/cli');
var exampleDebuggingProblem = require('./lib/exampleDebuggingProblem');

// Declare the application
var app = {};

// Init function
app.init = function () {
  debugger;
  // Start the server
  server.init();
  debugger;


  debugger;
  // Start the workers
  workers.init();
  debugger;

  // Start the CLI, but make sure that is starts last
  debugger;
  setTimeout(function () {
    debugger;
    cli.init();
  }, 50);
  debugger;

  debugger;
  // Set foo at one
  var foo = 1;
  debugger;

  // Increment foo
  foo++;
  debugger;

  // Square foo
  foo = foo * foo;
  debugger;

  // Converts foo to string
  foo = foo.toString();
  debugger;

  // Call the init script that will throw
  exampleDebuggingProblem.init();
  debugger;
};

// Execute
app.init();

// Export the app
module.exports = app;

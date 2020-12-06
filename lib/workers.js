/*
 *  Worker-related tasks
 *
 */

// Dependencies
const path = require('path');
const fs = require('fs');
const http = require('http');
const https = require('https');
const url = require('url');
const helpers = require('./helpers');
const _data = require('./data');
const _logs = require('./logs');
// this to allow logging in debug mode
const util = require('util');
// here workers is the name to be passed to NODE_DEBUG env variable before run
// e.g. NODE_DEBUG=workers node index.js
const debug = util.debuglog('workers');

// Instantiate the workers object
var workers = {};

// Lookup all checks, get their data, send to validator
workers.gatherAllChecks = function() {
  // Get all the checks
  _data.list('checks', function(err, checks) {
    if (!err && checks && checks.length > 0) {
      checks.forEach(function(check) {
        // Read in the check data
        _data.read('checks', check, function(err, originalCheckData) {
          if (!err && originalCheckData) {
            // Pass it to the check validator, and let that function continue or log errors as needed
            workers.validateCheckData(originalCheckData);
          } else {
            debug("Error reading one of the checks data!");
          }
        });
      });
    } else {
      debug("Error: Could not find any checks to process!");
    }
  });
};

// Sanity-check the check-data
workers.validateCheckData = function(originalCheckData) {
  originalCheckData = typeof(originalCheckData) == 'object' && originalCheckData !== null
    ? originalCheckData
    : {};
  originalCheckData.id = typeof(originalCheckData.id) == 'string' && originalCheckData.id.trim().length == 20 ? originalCheckData.id : false;
  originalCheckData.userPhone = typeof(originalCheckData.userPhone) == 'string' && originalCheckData.userPhone.trim().length == 10 ? originalCheckData.userPhone.trim() : false;
  originalCheckData.protocol = typeof(originalCheckData.protocol) == 'string' && ['http','https'].indexOf(originalCheckData.protocol.trim()) > -1 ? originalCheckData.protocol.trim() : false;
  originalCheckData.url = typeof(originalCheckData.url) == 'string' && originalCheckData.url.trim().length > 0 ? originalCheckData.url.trim() : false;
  originalCheckData.method = typeof(originalCheckData.method) == 'string' && ['post', 'get', 'put', 'delete'].indexOf(originalCheckData.method.trim()) > -1 ? originalCheckData.method.trim() : false;
  originalCheckData.successCodes = typeof(originalCheckData.successCodes) == 'object' && originalCheckData.successCodes instanceof Array && originalCheckData.successCodes.length > 0 ? originalCheckData.successCodes : false;
  originalCheckData.timeoutSeconds = typeof(originalCheckData.timeoutSeconds) == 'number' && originalCheckData.timeoutSeconds % 1 === 0 && originalCheckData.timeoutSeconds >= 1 & originalCheckData.timeoutSeconds <= 5 ? originalCheckData.timeoutSeconds : false;

  // Set the keys that may not be set (if the workers have never seen this check before)
  originalCheckData.state = typeof(originalCheckData.state) == 'string' && ['up','down'].indexOf(originalCheckData.state.trim()) > -1 ? originalCheckData.state.trim() : 'down';
  originalCheckData.lastChecked = typeof(originalCheckData.lastChecked) == 'number' && originalCheckData.lastChecked > 0 ? originalCheckData.lastChecked : false;

  // If all the checks pass, pass the data along to the next step in the process
  if (originalCheckData.id &&
    originalCheckData.userPhone &&
    originalCheckData.protocol &&
    originalCheckData.url &&
    originalCheckData.method &&
    originalCheckData.successCodes &&
    originalCheckData.timeoutSeconds) {
    workers.performCheck(originalCheckData);
  } else {
    debug("Error: One of the checks is not properly formatted. Skipping it!");
  }
}

// Perform the check, send the originalCheckData and the outcome of the check process to the next step in the process
workers.performCheck = function(originalCheckData) {
  // Prepare the initial check outcome
  var checkOutcome = {
    error: false,
    responseCode: false
  };

  // Mark that the outcome has not been sent yet
  var outcomeSent = false;

  // Parse the hostname and the path of the original check data
  var parsedUrl = url.parse(`${originalCheckData.protocol}://${originalCheckData.url}`, true);
  var hostName = parsedUrl.hostname;
  var path = parsedUrl.path; // Using path and not pathname because we want the query string
  // Construncting the request
  var requestDetails = {
    protocol: originalCheckData.protocol+":",
    hostname: hostName,
    method: originalCheckData.method.toUpperCase(),
    path,
    timeout: originalCheckData.timeoutSeconds * 1000
  };
  // Instantiate the request object (using either http or https module)
  var _moduleToUse = originalCheckData.protocol == 'http' ? http : https;

  var req = _moduleToUse.request(requestDetails, function(res) {
    // Grab the status of the sent request
    var status = res.statusCode;
    // Update the checkOutcome and pass the data along
    checkOutcome.responseCode = status;
    if (!outcomeSent) {
      workers.processCheckOutcome(originalCheckData, checkOutcome);
      outcomeSent = true;
    }
  });
  // Bind to the error event so it doesn't get thrown
  req.on('error', function(err){
    // Update the checkOutcome and pass the data along
    checkOutcome.error = {
      error: true,
      value: err
    };
    if (!outcomeSent) {
      workers.processCheckOutcome(originalCheckData, checkOutcome);
      outcomeSent = true;
    }
  });
  // Bind to the timeout event
  req.on('timeout', function(err){
    // Update the checkOutcome and pass the data along
    checkOutcome.error = {
      error: true,
      value: 'timeout'
    };
    if (!outcomeSent) {
      workers.processCheckOutcome(originalCheckData, checkOutcome);
      outcomeSent = true;
    }
  });
  // End the request
  req.end();
};

// Process the check outcome and update the check data, trigger an alert if needed
// Special logic for accomodating a check that has never been tested before (don't alert on that one)
workers.processCheckOutcome = function(originalCheckData, checkOutcome) {
  // Decide if the check is considered up or down
  var state = !checkOutcome.error && checkOutcome.responseCode && originalCheckData.successCodes.indexOf(checkOutcome.responseCode) > -1 ? 'up' : 'down';
  // Decide if an allert is warranted
  var allertWarranted = originalCheckData.lastChecked && originalCheckData.state !== state ? true : false;

  // Log the outcome
  var timeOfCheck = Date.now();
  workers.log(originalCheckData, checkOutcome, state, allertWarranted, timeOfCheck);

  // Update the check data
  var newCheckData = originalCheckData;
  newCheckData.state = state;
  newCheckData.lastChecked = timeOfCheck;

  // Save the updates
  _data.update('checks', newCheckData.id, newCheckData, function(err){
    if (!err) {
      // Send the new check data to the next phase of the process if needed
      if (allertWarranted) {
        workers.allertUserToStatusChange(newCheckData);
      } else {
        debug('Check outcome has not changed. No alert needed!');
      }
    } else {
      debug("Error trying to save updates to one of the checks")
    }
  })
};

// Alert the user as to a change in ther change status
workers.allertUserToStatusChange = function(newCheckData) {
  var message = 'Alert: You check for ' + newCheckData.method.toUpperCase() + ' ' + newCheckData.protocol + '://' + newCheckData.url + ' is currently ' + newCheckData.state;
  helpers.sendTwilioSms(newCheckData.userPhone, message, function(err){
    if (!err) {
      debug('Success: User was allerted to a status change in their check, via sms: '+ message);
    } else {
      debug('Error: could not send sms alert to user who has a status change in their check!');
    }
  });
};

//
workers.log = function(originalCheckData, checkOutcome, state, allertWarranted, timeOfCheck) {
  // Form the log data
  var logData = {
    'check': originalCheckData,
    'outcome': checkOutcome,
    state,
    'allert': allertWarranted,
    'time': timeOfCheck
  };
  // Convert data to a string
  var logString = JSON.stringify(logData);
  // Determine the name of the log file
  var logFileName = originalCheckData.id;
  // Append the log string to the file
  _logs.append(logFileName, logString, function(err){
    if (!err){
      debug('Logging to file succeded!');
    } else {
      debug('Logging to file failed!');
    }
  });
};

// Timer to execute the worker-process once per minute
workers.loop = function() {
  setInterval(function() {
    workers.gatherAllChecks();
  }, 1000 * 60);
};

// Rotate (compress) the log files
workers.rotateLogs = function() {
  // Listing all the (non compressed) log files
  _logs.list(false, function(err, logs) {
    if (!err && logs && logs.length > 0) {
      logs.forEach(function(logName) {
        // Compress the data to a different file
        var logId = logName.replace('.log', '');
        var newFileId = logId + '-' + Date.now();
        _logs.compress(logId, newFileId, function(err) {
          if (!err) {
            // Truncate the log
            _logs.truncate(logId, function(err) {
              if (!err) {
                debug("Success truncating logFile");
              } else {
                debug("Error truncating logFile");
              }
            });
          } else {
            debug("Error compressing one of the log files", err)
          }
        });
      });
    } else {
      debug("Error: could not find any logs to rotate")
    }
  })
};

// Timer to execute the log-rotation process once per day
workers.logRotationLoop = function() {
  setInterval(function() {
    workers.rotateLogs();
  }, 1000 * 60 * 60 * 24);
}

// Init script
workers.init = function() {
  // Send to console, in yellow
  // %s here to be replaced with second argument(e.g. string to be printed out)
  console.log('\x1b[33m%s\x1b[0m', 'Background workers are running');

  // Execute all the checks immediately
  workers.gatherAllChecks();

  // Call the loop so the checks will execute later on
  workers.loop();

  // Compress all the logs immediately
  workers.rotateLogs();

  // Call the compression loop so logs will be compressed later on
  workers.logRotationLoop();
};

// Export the module
module.exports = workers;

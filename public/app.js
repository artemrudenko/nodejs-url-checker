/*
 * Frontend Logic for application
 *
 */

//  Container for the fronent application
var app = {};

// Config
app.config = {
  'sessionToken': false
};

// AJAX client (for the restfull API)
app.client = {};

// Interface for making API calls 
app.client.request = function (headers, path, method, queryStringObject, payload, callback) {
  // Set defaults
  headers = typeof (headers) == 'object' && headers !== null ? headers : {}
  path = typeof (path) == 'string' ? path : '/';
  method = typeof (method) == 'string' && ['POST', 'GET', 'PUT', 'DELETE'].indexOf(method) > -1 ? method.toUpperCase() : 'GET';
  queryStringObject = typeof (queryStringObject) == 'object' && queryStringObject !== null ? queryStringObject : {}
  payload = typeof (payload) == 'object' && payload !== null ? payload : {}
  callback = typeof (callback) == 'function' ? callback : false;

  // For each query string parameter sent, add it to the path
  var requestUrl = `${path}?`;
  var counter = 0;
  for (const queryKey in queryStringObject) {
    if (queryStringObject.hasOwnProperty(queryKey)) {
      counter++;
      // If at least one query string parameter has alredy been added, prepend new ones with an amprersand
      if (counter > 1) {
        requestUrl += "&";
      }
      // Add  the key and value
      requestUrl += `${queryKey}=${queryStringObject[queryStringObject]}`;
    }
  }

  // Form the http request as a JSON type
  var xhr = new XMLHttpRequest();
  xhr.open(method, requestUrl, true);
  xhr.setRequestHeader("Content-Type", "application/json");

  // For each header sent, add it to the request one by one
  for (const headerKey in headers) {
    if (headers.hasOwnProperty(headerKey)) {
      xhr.setRequestHeader(headerKey, headers[headerKey]);
    }
  }

  // if there is a current session token set, add that as a header
  if (app.config.sessionToken) {
    xhr.setRequestHeader('token', app.config.sessionToken.id);
  }

  // When the request comes back, handle the response
  xhr.onreadystatechange = function () {

    if (xhr.readyState == XMLHttpRequest.DONE) {
      var statusCode = xhr.status;
      var responseReturned = xhr.responseText;

      // Callback if requested
      if (callback) {
        try {
          var parsedResponse = JSON.parse(responseReturned);
          callback(statusCode, parsedResponse);
        } catch (err) {
          callback(statusCode, false);
        }
      }
    }
  }

  // Send the payload as JSON
  var payloadString = JSON.stringify(payload);
  xhr.send(payloadString);
}
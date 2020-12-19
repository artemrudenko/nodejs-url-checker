/*
 * Library that demonstates something throwing when it's init is called
 *
 */

// Container for the module
var example = {};

// Init function 
example.init = function () {
  // This is and error created intentionally (bar is not defined)
  var foo = bar;
};


// Export the module
module.exports = example;
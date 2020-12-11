/*
 * Create and export configuration variables
 *
 */

// Container for all the environments
var environments = {};

// Staging (default) environment
environments.staging = {
  'httpPort': 3000,
  'httpsPort': 3001,
  'envName': 'staging',
  'hashingSecret': 'thisIsASecret',
  'maxChecks': 5,
  'twilio': {
    'accountSid': 'ACb32d411ad7fe886aac54c665d25e5c5d',
    'authToken': '9455e3eb3109edc12e3d8c92768f7a67',
    'fromPhone': '+15005550006'
  },
  'templateGlobals': {
    'appName': 'UptimeChecker',
    'companyName': 'NotARealCompany, Inc',
    'yearCreate': '2020',
    'baseUrl': 'http://localhost:3000/'
  }
};

// Production environment
environments.production = {
  'httpPort': 5000,
  'httpsPort': 5001,
  'envName': 'production',
  'hashingSecret': 'thisIsAlsoASecret',
  'maxChecks': 5,
  'twilio': {
    'fromPhone': '',
    'accoundSid': '',
    'authToken': ''
  },
  'templateGlobals': {
    'appName': 'UptimeChecker',
    'companyName': 'NotARealCompany, Inc',
    'yearCreate': '2020',
    'baseUrl': 'http://localhost:5000/'
  }
};

// Determine which environment was passed as a cli argument
var currentEnvironment = typeof (process.env.NODE_ENV) == 'string'
  ? process.env.NODE_ENV.toLowerCase()
  : '';

// Check that current environment exists(e.g. one of the environments above), if not, default to staging
var environmentToExport = typeof (environments[currentEnvironment]) === 'object'
  ? environments[currentEnvironment]
  : environments.staging;

// export the module
module.exports = environmentToExport;

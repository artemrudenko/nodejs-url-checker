/*
 * Async Hooks example
 *
 * Note: console.log is an async operation and that's why we are using fs.writeSync here
 */

// Dependencies
const async_hooks = require('async_hooks');
const fs = require('fs');

// Target execution context
var targetExecutionContext = false;

// Write an arbitrary async function
var whatTimeIsIt = (callback) => {
  setInterval(() => {
    fs.writeSync(1, 'When  the setInterval runs, the execution context is ' + async_hooks.executionAsyncId() + '\n');
    callback(Date.now());
  }, 1000);
};

// Call
whatTimeIsIt((time) => {
  fs.writeSync(1, `The time is ${time}\n`);
});

// Hooks (should not trigger an async operation - otherwise you will get a cycle)
var hooks = {
  init(asyncId, type, triggerAsyncId, resource) {
    fs.writeSync(1, "Hook init" + asyncId + "\n");
  },
  before(asyncId) {
    fs.writeSync(1, "Hook before" + asyncId + "\n");
  },
  after(asyncId) {
    fs.writeSync(1, "Hook after" + asyncId + "\n");
  },
  destroy(asyncId) {
    fs.writeSync(1, "Hook destroy" + asyncId + "\n");
  },
  promiseResolved(asyncId) {
    fs.writeSync(1, "Hook promiseResolved" + asyncId + "\n");
  }
};

// Create a new istance of AsyncHooks
var asyncHook = async_hooks.createHook(hooks);
asyncHook.enable();

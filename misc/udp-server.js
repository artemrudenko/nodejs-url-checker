/*
 * Example UDP Server
 * Creating a UDP datagram server listening on 6000
 */

//  Dependencies
const dgram = require('dgram');

// Creating a server
var server = dgram.createSocket('udp4');

server.on('message', (messageBuffer, sender) => {
  // Do something with an incomming message or do something with the sender
  var messageString = messageBuffer.toString();
  console.log(messageString);
});

// Bind to 6000
server.bind(6000);



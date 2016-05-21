//This is daemon of client.js

const child_process = require('child_process');
const EventEmitter = require('events').EventEmitter;
const event = new EventEmitter();

var worker_process

event.on('START',function () {
  worker_process = child_process.fork("client.js");
  // if receive "DG_RESTART"
  worker_process.on('message', function (data) {
     if (data.toString() == 'DG_RESTART') {
       worker_process.kill();
       setTimeout(function () {
         event.emit('START');
       },500)
     }
  });
  worker_process.on('close', function (code) {
     console.log('Process is closed...' + code);
  });
})

event.emit('START');

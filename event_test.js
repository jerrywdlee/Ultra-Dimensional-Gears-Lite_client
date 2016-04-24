
const EventEmitter = require('events').EventEmitter;
const event = new EventEmitter();

//const fs = require('fs');
const child_process = require('child_process');

event.on('aaa',function (res) {
	console.log(res);
})

event.emit('aaa','AAA');

/*
var EventEmitter = require('events').EventEmitter;
var event = new EventEmitter();
event.on('some_event', function() {
	console.log('some_event 事件触发');
});
setTimeout(function() {
	event.emit('some_event');
}, 1000);
*/
var reg_spawn = child_process.spawn( 'node', ['./reg.js'],{stdio:[ 'pipe',null,null, 'pipe' ]});
reg_spawn.stdout.on('data', function(data){
		console.log('['+'Register'+']' +data.toString());
});
reg_spawn.stderr.on('data',function(data) {
	console.error("Error!! \n"+data)
});
reg_spawn.on('close', function (code) {
	console.log('Register' + ' is exited : '+code);
});

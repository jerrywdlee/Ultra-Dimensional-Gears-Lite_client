const socket_io = require('socket.io-client');
console.log("Connecting to : "+"http://localhost/");
var socket = socket_io.connect("http://localhost/");
var socket_checker = false;//socket checker;
socket.on('ping',function(startTime,id){
    //var timeServer = Date.now();
    console.log("pinged "+startTime+id);
    socket.emit('test');
    socket.emit('pong_client',startTime);//why same pong only work on html
    //socket.emit('pong',123456789);
    //socket.emit('pong',startTime);
});
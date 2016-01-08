var socket_io = require('socket.io-client'),//socket.io-client connect server with out browser
	sqlite3 = require('sqlite3');
var	fs = require('fs');
const child_process = require('child_process');

//if uninitiated
var db_flag = fs.readdirSync('./').indexOf('client_db.sqlite3')===-1?false:true;
var reg_flag = fs.readdirSync('./').indexOf('ini.json')===-1?false:true;
if (!db_flag||!reg_flag) {
	console.log("You seems have not initiated this device yet...");
	//get local ip address and tell user
	console.log("Please connect to :");
	ip_reporter ();
	//block loop and initiate synchronously
	var workerProcess = child_process.execSync('node reg.js',function (err,stdout,stderr) {
	    if (err) {
	      console.log(err.stack);
	      console.log('Error code: '+err.code);
	      console.log('Signal received: '+err.signal);
	    };
	    console.log(stdout);
	    console.log(stderr);
  	});
	console.log('Initiating Process Executed');
};

//connect to db
var db = new sqlite3.Database('client_db.sqlite3');

//load ini.json and connect to server
var ini_json = load_ini_json();
console.log("Connecting to : "+'http://'+ini_json.server_ip+'/');
var socket = socket_io.connect('http://'+ini_json.server_ip+'/');

/*** Here is running logics ***/
socket.on('error', function(err) { 
    console.log(err);
});

socket.on('connect', function() {
	console.log('Client Connected to Server');
});

socket.on('disconnect',function() {    	
    	console.log('Disconnected from Server')
});






/*** Here is all functions ***/
function load_ini_json(){
  try{
    var ini_json = JSON.parse(fs.readFileSync('./ini.json', 'utf8'));
  }catch(e){
    var ini_json = { };
  }
  return ini_json;
}

function ip_reporter () {
	// body...
	var os = require('os');//for ip reporter
	var ifaces = os.networkInterfaces();
	var port = 8888;//in child process
	Object.keys(ifaces).forEach(function (ifname) {
	  var alias = 0;
	  ifaces[ifname].forEach(function (iface) {
	    if ('IPv4' !== iface.family || iface.internal !== false) {
	      // skip over internal (i.e. 127.0.0.1) and non-ipv4 addresses
	      return;
	    }
	    if (alias >= 1) {
	      // this single interface has multiple ipv4 addresses
	      console.log(ifname + alias, iface.address + ':' + port);
	    } else {
	      // this interface has only one ipv4 adress
	      console.log(ifname, iface.address+ ':' + port);
	    }
	    ++alias;
	  });
	});
}


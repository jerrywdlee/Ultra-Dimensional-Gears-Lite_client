const socket_io = require('socket.io-client'),//socket.io-client connect server with out browser
	  sqlite3 = require('sqlite3');
const fs = require('fs');
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

//load list of config settings 
const configs_path = "./configs"
var configs_list = fs.readdirSync(configs_path);

//connect to db
const db = new sqlite3.Database('client_db.sqlite3');
const sql_instr_tab = "SELECT * FROM instrument_table ORDER BY id DESC";
const sql_raw_data = "SELECT * FROM data_table ORDER BY sample_time DESC";
const sql_add_instr = "INSERT INTO instrument_table (instr_name, mac_addr, config) VALUES(?, ?, ?)";
const sql_del_instr = "DELETE FROM instrument_table WHERE id = ?;";

//check config files for all instrument
var instr_list = [];
db.all(sql_instr_tab,function(err,data){
	if (err) {console.log(err)};
	instr_list = data;
	//find if some instrument have no config
	for(var i in instr_list){
		instr_list[i].available=false;
		for(var j in configs_list){
			if (instr_list[i].config===configs_list[j]) {
				instr_list[i].available=true;break;
			};
		}
	}
	for(var i in instr_list){
		//if some instrument's confings missing
		if (!instr_list[i].available) {
			console.log("Error: [ "+instr_list[i].instr_name+" ] Config File Missing");
		};
	}	
});


//load ini.json and connect to server
var ini_json = load_ini_json();
console.log("Connecting to : "+ini_json.server_url);
var socket = socket_io.connect(ini_json.server_url);

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


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
const sql_del_instr = "DELETE FROM instrument_table WHERE id = ?";
const sql_insert_data = "INSERT INTO data_table (instr_name, sample_time, raw_data, pushed) VALUES ($instr_name, $sample_time, $raw_data, $pushed)";


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
	socket.emit('instr_status',instr_list);
});

socket.on('disconnect',function() {    	
    console.log('Disconnected from Server')
});

socket.on('instr_status',function() {
	socket.emit('instr_status',instr_list);
});

socket.on('local_admin_page',function() {
	admin_page();//start admin page
});

/**** this is a test ***/
var temp_data = [];
setInterval(function(){
	temp_data.push({instr_name :instr_list[3].instr_name, sample_time: time_stamp(), raw_data:{aa:01,bb:02}, pushed:1})
},500);
setTimeout(function(){
insert_all(temp_data);
//console.log(temp_data);
},5000);

/**** this is a test end ***/

/*** from here is all functions ***/
function load_ini_json(){
  try{
    var ini_json = JSON.parse(fs.readFileSync('./ini.json', 'utf8'));
  }catch(e){
    var ini_json = { };
  }
  return ini_json;
}
//report loacl ip
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
//render admin page 
function admin_page(){
	var child = child_process.spawn('node',['reg.js'],{stdio: ['ipc']});
	child.stdout.on('data', function(data) {
        console.log('[Admin Page]: '  + data);
        socket.emit('local_admin_page',data);
    });
}
//insert array into sqlite
function insert_all (temp_data) {
//	var temp_sql = "INSERT INTO data_table (instr_name, sample_time, raw_data, pushed) VALUES ($instr_name, $sample_time, $raw_data, $pushed)";
	var counter = temp_data.length;
	console.log(counter)
	db.serialize(function() {
	  var stmt = db.prepare(sql_insert_data);
	  //for is faster, for > for..in > forEach
	  for(var i=1;i<temp_data.length;i++){ 
	  	stmt.run(
	  	{
	  		$instr_name:temp_data[i].instr_name,
	  		$sample_time:temp_data[i].sample_time,
	  		$raw_data:JSON.stringify(temp_data[i].raw_data),
	  		$pushed:temp_data[i].pushed
	  	},function(err) {
	  		if (err) {console.error(err);return}
	  		counter--
	  		if (counter===1) {console.log(i+" Data Inserted.");};
	  	});
	  }
	  stmt.finalize();
	});
}
//make a time stamp like 2016-01-06 04:41:13.636 
function time_stamp () {
	var now = new Date();
	var timeNowISO = now.toISOString();//2016-01-06T04:38:02.561Z
	var theTimeNow=timeNowISO.split('T')[0]+" "+timeNowISO.split('T')[1].split('Z')[0];
	return theTimeNow;
	//console.log("time: "+theTimeNow);//2016-01-06 04:41:13.636 
}
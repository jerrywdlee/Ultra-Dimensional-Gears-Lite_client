const socket_io = require('socket.io-client'),//socket.io-client connect server with out browser
	  sqlite3 = require('sqlite3');
const fs = require('fs');
const child_process = require('child_process');
const events = require('events');
const event_emitter = new events.EventEmitter();

//if uninitiated yet
var db_flag = fs.readdirSync('./').indexOf('client_db.sqlite3')===-1?false:true;
var reg_flag = fs.readdirSync('./').indexOf('ini.json')===-1?false:true;
var server_remoting = false;//if remoted by server set it to true


/*
if (db_flag&&reg_flag) {
	event_emitter.emit()
};*/

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
//SQL queries
const sql_instr_tab = "SELECT * FROM instrument_table ORDER BY id DESC";
const sql_raw_data = "SELECT * FROM data_table ORDER BY sample_time DESC";
const sql_add_instr = "INSERT INTO instrument_table (instr_name, mac_addr, config) VALUES(?, ?, ?)";
const sql_del_instr = "DELETE FROM instrument_table WHERE id = ?";
const sql_insert_data = "INSERT INTO data_table (instr_name, sample_time, raw_data, pushed) VALUES ($instr_name, $sample_time, $raw_data, $pushed)";
const sql_clean_data = "DELETE FROM data_table WHERE sample_time BETWEEN $far AND $near";
const sql_record_num = "SELECT COUNT(*) FROM $table ";
const sql_del_multi = "DELETE FROM data_table WHERE sample_time IN (SELECT sample_time FROM data_table WHERE pushed=1 ORDER BY sample_time LIMIT $number)";

//check config files for all instrument
var instr_list = [];
db.all(sql_instr_tab,function(err,data){
	if (err) {console.error(err);}
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
	event_emitter.emit('databaseReady');	
});


//load ini.json and connect to server
var ini_json = load_ini_json();
console.log("Connecting to : "+ini_json.server_url);
var socket = socket_io.connect(ini_json.server_url);
var socket_checker = false;//socket checker;

//cache raw data as js obj
var cached_data = [];
//cached records' number under ?? not push, better under 500
var cache_size = 50; 
//cache watch dog
var watch_frequency = 60*1000; //watch cache size every minute
setInterval(function(){
	if (cached_data.length>cache_size&&!server_remoting) {
		if (socket_checker) { //if socket is connecting
			for (var i = cached_data.length - 1; i >= 0; i--) {
				cached_data[i].pushed = 1;//set if pushed to server
			};
			socket.emit('push_raw_data',cached_data);
		};
		insert_all(cached_data);
		cached_data=[];//clean cache
	};
},watch_frequency);

//delete data if db too big
var db_check_freq = 24*60*60*1000; //check db size daily
var db_size_under = 1*1000*1000; //db bigger than 1M delete data
var auto_del_num = 1000; //auto delete 1000 records
setInterval(function () {
	fs.stat('./client_db.sqlite3',function(err,stats){
		if (err) {console.error(err);};
		//console.log(stats.size);
		if (stats.size>db_size_under) {
			del_old_data(auto_del_num);
		};
	})
},db_check_freq)
del_old_data(200);

/*** Here is running logics ***/
socket.on('error', function(err) { 
    console.log(err);
    socket_checker=false;
});

socket.on('connect', function() {
	console.log('Client Connected to Server');
	socket_checker=true;
	socket.emit('instr_status',instr_list);
});

socket.on('disconnect',function() {    	
    console.log('Disconnected from Server')
    socket_checker=false;
});

socket.on('instr_status',function() {
	socket.emit('instr_status',instr_list);
});

socket.on('local_admin_page',function() {
	admin_page();//start admin page
});
// for server to caculate Network delay
socket.on('ping',function(startTime){
    //var timeServer = Date.now();
    socket.emit('pong',startTime);
})

/**** this is a test ***/
//var temp_data = [];
setInterval(function(){
	cached_data.push({instr_name :instr_list[0].instr_name, sample_time: time_stamp(), raw_data:{aa:01,bb:02}, pushed:0})
},3000);
/*
setTimeout(function(){
insert_all(temp_data);
//console.log(temp_data);
},5000);
*/


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
//render admin page Asynchronously
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
	//console.log(counter)
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
	  		if (err) {console.error(err);socket.emit('db_error',err);return}
	  		counter--
	  		if (counter===1) {console.log(i+" Data Inserted.");};
	  	});
	  }
	  stmt.finalize();
	});
}
function del_old_data (number) {
	db.run(sql_del_multi,{$number:number},function(err,data){
	  if (err) {console.log(err);socket.emit('db_error',err);return;};
	  console.log(number+" Records Deleted");
	  socket.emit('db_succeed',number+" Records Deleted")
	})
}

//make a time stamp like 2016-01-06 04:41:13.636 
function time_stamp () {
	var now = new Date();
	var timeNowISO = now.toISOString();//2016-01-06T04:38:02.561Z
	var theTimeNow=timeNowISO.split('T')[0]+" "+timeNowISO.split('T')[1].split('Z')[0];
	return theTimeNow;
	//console.log("time: "+theTimeNow);//2016-01-06 04:41:13.636 
}
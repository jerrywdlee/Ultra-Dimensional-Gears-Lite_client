const socket_io = require('socket.io-client'),//socket.io-client connect server with out browser
	  sqlite3 = require('sqlite3');
const fs = require('fs');
const child_process = require('child_process');
const EventEmitter = require('events').EventEmitter;
const event = new EventEmitter();

/* SQL queries */
const sql_instr_tab = "SELECT * FROM instrument_table ORDER BY id DESC";
const sql_raw_data = "SELECT * FROM data_table ORDER BY sample_time DESC";
const sql_add_instr = "INSERT INTO instrument_table (instr_name, mac_addr, config) VALUES(?, ?, ?)";
const sql_del_instr = "DELETE FROM instrument_table WHERE id = ?";
const sql_insert_data = "INSERT INTO data_table (instr_name, sample_time, raw_data, pushed) VALUES ($instr_name, $sample_time, $raw_data, $pushed)";
const sql_clean_data = "DELETE FROM data_table WHERE sample_time BETWEEN $far AND $near";
const sql_record_num = "SELECT COUNT(*) FROM ";
const sql_del_multi = "DELETE FROM data_table WHERE sample_time IN (SELECT sample_time FROM data_table WHERE pushed=1 ORDER BY sample_time LIMIT $number)";
var db;


//load list of config settings
const configs_path = "/configs"
var configs_list ,instr_list;

//delete data if db too big
var db_check_freq = 24*60*60*1000; //check db size daily
var db_size_under = 1*1000*1000; //db bigger than 1M delete data
var auto_del_num = 1000; //auto delete 1000 records

//a lot of flags
var db_flag = fs.readdirSync('./').indexOf('client_db.sqlite3')===-1?false:true;
var reg_flag = fs.readdirSync('./').indexOf('ini.json')===-1?false:true;
var server_remoting = false;//if remoted by server set it to true
var socket_checker = false;//socket checker;
var socket;

//store of activited objs
var active_instrs = {};
//cache raw data as js obj
var cached_data = [];
//cached records' number under ?? not push, better under 500
var cache_size = 50;
//cache watch dog
var watch_frequency = 60*1000; //watch cache size every minute


event.on('reg_ready',function () {
	//console.log("config_ready");
	//connect to db
	db = new sqlite3.Database('client_db.sqlite3');
	//check config files for all instrument
	var instr_data = [];
	//read all exsit configs
	//var configs_list = fs.readdirSync(configs_path);
	db.all(sql_instr_tab,function(err,data){
		//if (err) {console.error(err);}
		//instr_data = data;
		instr_data = data;
	  if (instr_data.length===0) {
			instr_data=[{"No Instrument": "No Data to View."}];
			console.warn(instr_data);
			console.warn("You Must Setup at Least 1 Instrument");
			console.log('\n');
			event.emit('reg');
			return;
		}else if (err){
			instr_data =[{Error: err}] ;//avoid view error
			console.error(instr_data);
			event.emit('reg');
			return;
	  }else {

			event.emit('config_check_ready',instr_data);
			event.emit('ready_to_connect');
			//console.log(instr_data)
	  }
	});
});
event.on('ready_to_connect',function () {

})



event.on('config_check_ready',function (instr_data) {
	if (instr_data.length!=0) {
		for (var i = instr_data.length - 1; i >= 0; i--) {
			active_instrs[instr_data[i].instr_name] = {
				instr_name : instr_data[i].instr_name,
				config : instr_data[i].config,
				available : false
			}
		}
		var configs_list = fs.readdirSync("."+configs_path)
		//find if some instrument have no config
		for(var i in active_instrs){
			for(var j = configs_list.length - 1; j >= 0; j--){
				if (active_instrs[i].config===configs_list[j]) {
					active_instrs[i].available=true;break;
				}
			}
		}
		for(var instr_name in active_instrs){
			//console.log(instr_name);
			//console.log(active_instrs[instr_name].available);
			//if some instrument's confings missing
			if (!active_instrs[instr_name].available) {
				console.log("Warning: [ "+instr_name+" ] Config File Missing");
			};
		}
		event.emit('instr_list_ready');
	}
});

event.on('instr_list_ready',function () {
	//console.log(active_instrs);
	for (var i in active_instrs) {
		if (active_instrs[i].available) {
			//use spawn_process, need configs_path
			var spawn_process = require('./dg_modules/spawn_process');
			//must use __dirname
			var temp_path = __dirname+configs_path+'/'+active_instrs[i].config+'/'+active_instrs[i].config+'.json';
			var config_json = JSON.parse(fs.readFileSync(temp_path, 'utf8'));
			//console.log(config_json)
			/* give all objs start function */
			active_instrs[i].config_json=config_json;
			active_instrs[i].spawn=spawn_process(config_json,active_instrs[i].config,__dirname,configs_path);
			active_instrs[i].running = function() {
				var spawn = this.spawn;
				var keyword = this.config_json.auto_sample.keyword;
				var freq = this.config_json.auto_sample.freq;
				var config = this.config;
				var instr_name = this.instr_name;
				spawn.stdout.on('data', function(data){
					console.log('['+instr_name+']' +data.toString());
					cached_data.push({
						instr_name :instr_name,
						sample_time: time_stamp(),
						raw_data:data.toString().replace(/\r?\n/g,""),
						pushed:0});
				});

				spawn.stderr.on('data',function(data) {
					console.error("Error!! \n"+data)
					cached_data.push({
						instr_name :instr_name,
						sample_time: time_stamp(),
						raw_data:'[Error:]'+data.toString().replace(/\r?\n/g,""),
						pushed:0});
				})

				spawn.on('close', function (code) {
					console.log(config + ' is exited : '+code);
				});

				setInterval(function () {
					//console.log(keyword);
					try {
						spawn.stdin.write(keyword+"\n");//must end by "\n"
					} catch (e) {
						console.error(e);
					}
				},freq);
			};
		}
	}
	event.emit('instr_setup_ready')
})

event.on('instr_setup_ready',function () {
	for (var i in active_instrs) {
		//console.log(instr_list[i])
		if (active_instrs[i].available) {
			active_instrs[i].running()
			console.log(i)
		};
	};
	event.emit('instr_activited')
})

event.on('instr_activited',function () {
	//load ini.json and connect to server
	var ini_json = load_ini_json();
	console.log("Connecting to : "+ini_json.server_url);
	socket = socket_io.connect(ini_json.server_url);
	console.log( sha_256("password"));//it is a test
	console.log( sha_256(ini_json.password));
	/*** Here is running logics ***/
	socket.on('error', function(err) {
	    console.log(err);
	    socket_checker=false;
	});
	get_instr_status();//its a test
	socket.on('connect', function() {
		console.log('Client Connected to Server');
		socket_checker=true;
		get_instr_status();
		socket.emit('instr_status',instr_list);
	});

	socket.on('disconnect',function() {
	    console.log('Disconnected from Server')
	    socket_checker=false;
	});

	socket.on('instr_status',function() {
		get_instr_status();
		socket.emit('instr_status',instr_list);
	});

	socket.on('local_admin_page',function() {
		//admin_page();//start admin page
	});
	// for server to caculate Network delay
	socket.on('ping',function(data){
	    //var timeServer = Date.now();
	    if (data) { //avoid an undefined emit
	    	console.log("pinged "+data);
	    	socket.emit('pong_client',data);//why same pong only work on html
	    };
	});
})



	setInterval(function(){
		if (cached_data.length>cache_size && !server_remoting) {
			if (socket_checker&&socket) { //if socket is connecting
				for (var i = cached_data.length - 1; i >= 0; i--) {
					cached_data[i].pushed = 1;//set if pushed to server
				};
				socket.emit('push_raw_data',JSON.stringify(cached_data,null,' '));
			};
			insert_all(cached_data);
			cached_data=[];//clean cache
		};
	},watch_frequency);

	//check db everyday if >1m del 1000 records
	setInterval(function () {
		fs.stat('./client_db.sqlite3',function(err,stats){
			if (err) {console.error(err);};
			//console.log(stats.size);
			if (stats.size>db_size_under) {
				del_old_data(auto_del_num);
			};
		})
	},db_check_freq)
	//del_old_data(2000);//it is a test

	/**** this is a test ***/
	//var temp_data = [];
	setInterval(function(){
	//	cached_data.push({instr_name :instr_list[0].instr_name, sample_time: time_stamp(), raw_data:{aa:01,bb:02}, pushed:0})
	},3000);

	/**** this is a test end ***/





event.on('reg',function () {
	var reg_spawn = child_process.spawn( 'node', ['./reg.js'],{stdio:[ 'pipe',null,null, 'pipe' ]});
	reg_spawn.stdout.on('data', function(data){
			console.log('['+'Register'+']' +data.toString());
	});
	reg_spawn.stderr.on('data',function(data) {
		console.error("Error!! \n"+data)
	});
	reg_spawn.on('close', function (code) {
		console.log('Register' + ' is exited : '+code);
		event.emit('started');//restart
	});
})



//if db or config not ready, setup
event.on('started',function () {
	//reload flags
	db_flag = fs.readdirSync('./').indexOf('client_db.sqlite3')===-1?false:true;
	reg_flag = fs.readdirSync('./').indexOf('ini.json')===-1?false:true;
	if (db_flag && reg_flag) {
		event.emit('reg_ready');
	}else {
		event.emit('reg');
	}
})




/*
//if this is a new device
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
*/

/* emiter here */
event.emit('started');//on started , emit 1st event




/*** from here is all functions ***/
function load_ini_json(){
  try{
    var ini_json = JSON.parse(fs.readFileSync('./ini.json', 'utf8'));
  }catch(e){
    var ini_json = { };
  }
  return ini_json;
}

function get_instr_status() {
	instr_list = {}
	for (var instr_name in active_instrs) {
		instr_list[instr_name] = active_instrs[instr_name].available;
	}
	console.log(instr_list);
}

//report loacl ip
/*
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
}*/
//render admin page Asynchronously
/*
function admin_page(){
	var child = child_process.spawn('node',['reg.js'],{stdio: ['ipc']});
	child.stdout.on('data', function(data) {
        console.log('[Admin Page]: '  + data);
        socket.emit('local_admin_page',data);
    });
}
*/
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
	var num_before = 0,num_after = 0;
	db.all(sql_record_num+"data_table",function(err,data){
		if (err) {console.log(err);return;};
		//console.log(data);
		num_before = data[0]['COUNT(*)'].toString(10);
		//delete data
		db.run(sql_del_multi,{$number:number},function(err){
		  if (err) {console.log(err);socket.emit('db_error',err);return;};
		  db.all(sql_record_num+"data_table",function(err,data2){
		  	//console.log(data);
		  	num_after = data2[0]['COUNT(*)'].toString(10);
		  	console.log((num_before-num_after)+" Records Deleted");
			socket.emit('db_succeed',(num_before-num_after)+" Records Deleted")
		  })
		})
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

//for hash password to transport
function sha_256 (password) {
  var jsSHA = require("jssha");
  var shaObj = new jsSHA("SHA-256", "TEXT");
  shaObj.update(password);
  var hash = shaObj.getHash("HEX");
  return hash;
}

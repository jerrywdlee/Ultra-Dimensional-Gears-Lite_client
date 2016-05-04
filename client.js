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
const sql_del_multi = "DELETE FROM data_table WHERE id IN (SELECT id FROM data_table WHERE pushed=1 ORDER BY sample_time LIMIT $number)";
const sql_unpush_num = "SELECT COUNT(*) FROM data_table WHERE pushed=0";
const sql_force_push = "SELECT * FROM data_table WHERE pushed=0 ORDER BY id LIMIT $number";
const sql_pushed_update = "UPDATE data_table SET pushed=1 WHERE id IN (SELECT id FROM data_table WHERE pushed=0 ORDER BY sample_time LIMIT $number)"

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
var socket_listeners;

//store of activited objs
var active_instrs = {};
//cache raw data as js obj
var cached_data = [];
//cached records' number under ?? not push, better under 500
var cache_size = 50;
//cache watch dog
var watch_frequency = 60*1000; //watch cache size every minute
//real_time device
var real_time_instrs = {};

var spawn_process = require('./dg_modules/spawn_process');

event.on('reg_ready',function () {
	//connect to db
	db = new sqlite3.Database('client_db.sqlite3');
	//check config files for all instrument
	var instr_data = [];
	//read all exsit configs
	db.all(sql_instr_tab,function(err,data){
		instr_data = data;
	  if (instr_data.length===0) {
			instr_data=[{"No Instrument": "No Data to View."}];
			console.log('\n');
			console.warn(instr_data);
			console.log('\nWarning:\n');
			console.warn("You Must Setup at Least 1 Instrument");
			console.log('\nStarting Setup page...\n');
			event.emit('reg');
			return;
		}else if (err){
			instr_data =[{Error: err}] ;//avoid view error
			console.error(instr_data);
			event.emit('reg');
			return;
	  }else {
			event.emit('config_check_ready',instr_data);
			//event.emit('ready_to_connect');
	  }
	});
});
//event.on('ready_to_connect',function () {
//
//})

event.on('config_check_ready',function (instr_data) {
	if (instr_data.length!=0) {
		for (var i = instr_data.length - 1; i >= 0; i--) {
			active_instrs[instr_data[i].instr_name] = {
				instr_name : instr_data[i].instr_name,
				config : instr_data[i].config,
				mac_addr : instr_data[i].mac_addr,
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
			//if some instrument's confings missing
			if (!active_instrs[instr_name].available) {
				console.warn("Warning: [ "+instr_name+" ] Config File Missing");
			};
		}
		event.emit('instr_list_ready');
	}
});

event.on('instr_list_ready',function () {
	/*** auto_sample ***/
	for (var i in active_instrs) {
		if (active_instrs[i].available) {
			//console.log("======= if_running "+!active_instrs[i].if_running);
			//use spawn_process, need configs_path
			//var spawn_process = require('./dg_modules/spawn_process');
			//must use __dirname
			var temp_path = __dirname+configs_path+'/'+active_instrs[i].config+'/'+active_instrs[i].config+'.json';
			//var config_json
			//try {
			var config_json = JSON.parse(fs.readFileSync(temp_path, 'utf8'));
			//} catch (e) {
			//	console.error(e);
			//	continue;
			//}
			/* give all objs start function */
			active_instrs[i].config_json=config_json;
			//console.log(active_instrs[i].config_json.real_time);
			if (config_json.exec_mode && config_json.auto_sample) {
				//console.log("{"+i+"} : "+active_instrs[i].config_json.exec_mode);
				active_instrs[i].running = function() {
					var instr_name = this.instr_name;
					var freq = this.config_json.auto_sample.freq;
					//var real_time = this.config_json.real_time;
					var exec_command = "cd "+__dirname+configs_path+'/'+active_instrs[instr_name].config +" & " ;
					exec_command += active_instrs[instr_name].config_json.exec;
					var argv_leng = active_instrs[instr_name].config_json.argv.length
					if (argv_leng > 0) {
						for (var j = 0; j < argv_leng; j++) {
							exec_command += " ";
							exec_command += active_instrs[instr_name].config_json.argv[j];
						}
					}
					var runner = setInterval(function () {
						try {
							var exec_process = child_process.exec(exec_command,function(error, stdout, stderr) {
								var data = stdout;
								if (error) {
									data = stderr;
									console.error('['+instr_name+']' +'Error!!\n' + stderr);
									var temp_err_obj = {
										instr_name :instr_name,
										sample_time: time_stamp(),
										raw_data:'[Error:]'+stderr.toString().replace(/\r?\n/g,""),
										pushed:0};
										if (active_instrs[instr_name].config_json.real_time.report) {
											console.log(temp_err_obj);
											socket.emit('real_time_report',JSON.stringify(temp_err_obj,null,' '));
										}
										if (active_instrs[instr_name].config_json.db_record.auto_sample) {
											cached_data.push(temp_err_obj);
										}
										//cached_data.push(temp_err_obj);

								}else {
									//cmd will return alot of things
									//var dir_index = parseInt(__dirname.length/2);
									//console.log(parseInt(__dirname.length/2));
									//console.log(stdout.toString().indexOf(__dirname.slice(dir_index)));
									var std_arr = stdout.toString().split('\n')
									//console.log('['+instr_name+']');
									//console.log('0:'+std_arr[0]);
									//console.log('1:'+std_arr[1]);
									//console.log('2:'+std_arr[2])
									data = std_arr[std_arr.length-1];
									if (data == "") {
										data = std_arr[std_arr.length-2]
									}
									//data = std_arr[std_arr.length-2]
									console.log('['+instr_name+']'+data);
									// cmd will show alot of things like "c:\>user\"
								}
								var temp_data_obj = {
									instr_name :instr_name,
									sample_time: time_stamp(),
									raw_data:data.toString().replace(/\r?\n/g,""),
									pushed:0};
								if (active_instrs[instr_name].config_json.real_time.report) {
									console.log(temp_data_obj);
									socket.emit('real_time_report',JSON.stringify(temp_data_obj,null,' '));
								}
								if (active_instrs[instr_name].config_json.db_record.auto_sample) {
									cached_data.push(temp_data_obj);
								}
								//cached_data.push(temp_data_obj);
							})
						} catch (e) {
							console.error('['+instr_name+']' +"Error!! \n"+e);
						}
					},freq);
					//runner killer
					var kill_runner = function (name) {
						if (name === instr_name||name==="ALL") {
							clearInterval(runner);
							// prevernt EventEmitter memory leak
							event.removeListener('kill_runner', kill_runner);
						}
					}
					event.on('kill_runner',kill_runner)
					/*
					event.on('kill_runner',function (name) {
						//console.log("KILL22 "+instr_name);
						if (name === instr_name||name==="ALL") {
							clearInterval(runner);
						}
					})
					*/
				}
			}else if(active_instrs[i].config_json.auto_sample){
				active_instrs[i].spawn=spawn_process(config_json,active_instrs[i].config,__dirname,configs_path,active_instrs[i].mac_addr);
				active_instrs[i].running = function() {
					var spawn = this.spawn;
					var keyword = this.config_json.auto_sample.keyword;
					var freq = this.config_json.auto_sample.freq;
					var config = this.config;
					var instr_name = this.instr_name;
					var real_time = this.config_json.real_time;
					//console.log(real_time);
					spawn.stdout.setEncoding('utf8');
					spawn.stdout.on('data', function(data){
						var temp_data_obj = {
							instr_name :instr_name,
							sample_time: time_stamp(),
							raw_data:data.toString().replace(/\r?\n/g,""),
							pushed:0};
						console.log('['+instr_name+']' +data.toString());
						if (active_instrs[instr_name].config_json.real_time.report) {
							console.log(temp_data_obj);
							socket.emit('real_time_report',JSON.stringify(temp_data_obj,null,' '));
						}
						if (active_instrs[instr_name].config_json.db_record.auto_sample) {
							cached_data.push(temp_data_obj);
						}
					});

					spawn.stderr.on('data',function(data) {
						var temp_err_obj = {
							instr_name :instr_name,
							sample_time: time_stamp(),
							raw_data:'[Error:]'+data.toString().replace(/\r?\n/g,""),
							pushed:0};
						console.error('['+instr_name+']' +"Error!! \n"+data)
						if (active_instrs[instr_name].config_json.real_time.report) {
							console.log(temp_err_obj);
							socket.emit('real_time_report',JSON.stringify(temp_err_obj,null,' '));
						}
						if (active_instrs[instr_name].config_json.db_record.auto_sample) {
							cached_data.push(temp_err_obj);
						}
					})

					spawn.on('close', function (code) {
						console.log(config + ' is exited : '+code);
						//this.available=false
						//clearInterval(runner);//auto runner exited
						//event.emit('delete_active_instr',instr_name)
						event.emit("kill_runner",instr_name)
						//test code
						//event.emit("kill_runner",'test_cmd') //ok!
					});

					var runner = setInterval(function () {
						try {
							spawn.stdin.write(keyword+"\n");//must end by "\n"
						} catch (e) {
							console.error('['+instr_name+']' +"Error!! \n"+e);
						}
					},freq);

					//runner killer
					var kill_runner = function (name) {
						if (name === instr_name||name==="ALL") {
							clearInterval(runner);
							// prevernt EventEmitter memory leak
							event.removeListener('kill_runner', kill_runner);
						}
					}
					event.on('kill_runner',kill_runner)
					/*
					event.on('kill_runner',function (name) {
						//console.log("KILL22 "+instr_name);
						if (name === instr_name||name==="ALL") {
							clearInterval(runner);
						}
					})
					*/
				};
			}
			//active_instrs[i].kill_runner = function () {
			//	var instr_name = this.instr_name;
			//	event.on('kill_runner',function () {
			//		console.log("KILL "+instr_name);
			//	})
			//}
		}
	}
	event.emit('instr_setup_ready')
})

event.on('instr_setup_ready',function () {
	for (var i in active_instrs) {
		if (active_instrs[i].available&&active_instrs[i].config_json.auto_sample) {
			//console.log("---==== if_running "+ !active_instrs[i].if_running);
			//console.log("=====running "+i);
			active_instrs[i].running()
			//active_instrs[i].if_running = true;
			//console.log("+++==== if_running "+ !active_instrs[i].if_running);
			//active_instrs[i].kill_runner()//listener of runner killer
		};
	};
	event.emit('instr_activited')
})

//socket events
event.on('instr_activited',function () {
	//load ini.json and connect to server
	var ini_json = load_ini_json();
	console.log("Connecting to : "+ini_json.server_url);
	if (!socket) {
		socket = socket_io.connect(ini_json.server_url);
	}
	console.log( sha_256(ini_json.password));//test, waitting for https

	/* test code */
	setTimeout(function () {
		console.log("================================================");
		//active_instrs["test_rb"].config_json.real_time.report = true
		//event.emit('restart')
	},10000)
	/* test code end */

	/*** Here is running logics ***/
	if (!socket_listeners) {
		socket_listeners = true;
		socket.on('error', function(err) {
				console.log(err);
				socket_checker=false;
		});
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
		});
		// for server to caculate Network delay
		socket.on('ping',function(data){
				//var timeServer = Date.now();
				if (data) { //avoid an undefined emit
					console.log("pinged "+data);
					socket.emit('pong_client',data);//why same pong only work on html
				};
		});

		socket.on('unpushed_num',function () {
			unpushed_num();
		})
		event.on('unpushed_num',function (num) {
			console.log(num+" Records Unpushed.");
			socket.emit('sum_unpushed',num);
		})

		socket.on('force_push',function (max) {
			force_push(max);
		})
		event.on('unpushed_data',function (data) {
			data.forEach(function (temp_data) {
				temp_data.pushed=1;
			})
			console.log(data);
			socket.emit('return_force_push',JSON.stringify(data,null,' '))
		})

		socket.on('reg',function () {
			console.log("reg");
			var reg_spawn = child_process.spawn( 'node', ['./reg.js'],{stdio:[ 'pipe',null,null, 'pipe' ]});
			reg_spawn.stdout.on('data', function(data){
					socket.emit('reg_log',"[Reg log]"+data)
			});
			reg_spawn.stderr.on('data',function(data) {
				socket.emit('reg_log',"Error!! \n"+data)
			});
			reg_spawn.on('close', function (code) {
				console.log();
				socket.emit('reg_log','Register is exited : '+code)
				event.emit('restart');//restart
			})
			socket.on('reg_kill',function () {
				reg_spawn.kill();
			})
		})

		socket.on('god_hand',function (mode,sql_query) {
			god_hand(mode,sql_query);
			event.on('god_hand_return',function (json_data) {
				socket.emit('god_hand_return',json_data);
			})
		})

		socket.on('real_time_control',function (instr_name,msg) {
			if (!real_time_instrs[instr_name]) {
				real_time_instrs[instr_name] = {};
				real_time_instrs[instr_name].config_json = active_instrs[instr_name].config_json;
				real_time_instrs[instr_name].config = active_instrs[instr_name].config;
				real_time_instrs[instr_name].mac_addr = active_instrs[instr_name].mac_addr
				if (active_instrs[instr_name].config_json.exec_mode) {
					event.emit('real_time_control',instr_name,msg)
				}else if (active_instrs[instr_name].spawn) {
					console.log(active_instrs[instr_name].config);
					real_time_instrs[instr_name].spawn = spawn_process(real_time_instrs[instr_name].config_json,
						real_time_instrs[instr_name].config,__dirname,configs_path,real_time_instrs[instr_name].mac_addr);
					//real_time_instrs[instr_name].spawn = active_instrs[instr_name].spawn;
					var spawn_realtime = real_time_instrs[instr_name].spawn
					spawn_realtime.stdout.setEncoding('utf8');
					spawn_realtime.stdout.on('data', function(data){
						var temp_data_obj = {
							instr_name :instr_name,
							sample_time: time_stamp(),
							raw_data:data.toString().replace(/\r?\n/g,""),
							pushed:0};
						console.log('['+instr_name+']' +data.toString());
						//socket.emit('real_time_report',JSON.stringify(temp_data_obj,null,' '));
						socket.emit('real_time_report',temp_data_obj);
						if (active_instrs[instr_name].config_json.db_record.real_time) {
							cached_data.push(temp_data_obj);
						}
					});

					spawn_realtime.stderr.on('data',function(data) {
						var temp_err_obj = {
							instr_name :instr_name,
							sample_time: time_stamp(),
							raw_data:'[Error:]'+data.toString().replace(/\r?\n/g,""),
							pushed:0};
						console.error('['+instr_name+']' +"Error!! \n"+data)

						socket.emit('real_time_report',JSON.stringify(temp_err_obj,null,' '));
						if (active_instrs[instr_name].config_json.db_record.real_time) {
							cached_data.push(temp_err_obj);
						}
					})

					spawn_realtime.on('close', function (code) {
						console.log(instr_name + ' is exited : '+code);
					});
				}else {
					socket.emit('real_time_report',"Cannot Initiate Device : "+instr_name);
				}
			}else {
				event.emit('real_time_control',instr_name,msg)
			}
		})

		event.on('real_time_control',function (instr_name,msg) {
			if (active_instrs[instr_name].config_json.exec_mode) {
				real_time_instrs[instr_name].msg = msg;
				//real_time_instrs[instr_name].spawn;
				var exec_command = "cd "+__dirname+configs_path+'/'+active_instrs[instr_name].config +" & " ;
				exec_command += active_instrs[instr_name].config_json.exec;
				//exec_command += " "+msg;
				real_time_instrs[instr_name].exec_command = exec_command;
				real_time_instrs[instr_name].msg = msg;
				real_time_instrs[instr_name].spawn =
				child_process.exec(real_time_instrs[instr_name].exec_command+" "+real_time_instrs[instr_name].msg,
					function(error, stdout, stderr) {
					var data = stdout;
					if (error) {
						data = stderr;
						console.error('['+instr_name+']' +'Error!!\n' + stderr);
						var temp_err_obj = {
							instr_name :instr_name,
							sample_time: time_stamp(),
							raw_data:'[Error:]'+stderr.toString().replace(/\r?\n/g,""),
							pushed:0};

							socket.emit('real_time_report',JSON.stringify(temp_err_obj,null,' '));

							if (active_instrs[instr_name].config_json.db_record.real_time) {
								cached_data.push(temp_err_obj);
							}
					}else {
						var std_arr = stdout.toString().split('\n')
						data = std_arr[std_arr.length-1];
						if (data == "") {
							data = std_arr[std_arr.length-2]
						}
						console.log('['+instr_name+']'+data);
						// cmd will show alot of things like "c:\>user\"
					}
					var temp_data_obj = {
						instr_name :instr_name,
						sample_time: time_stamp(),
						raw_data:data.toString().replace(/\r?\n/g,""),
						pushed:0};
						socket.emit('real_time_report',JSON.stringify(temp_data_obj,null,' '));
					if (active_instrs[instr_name].config_json.db_record.real_time) {
						cached_data.push(temp_data_obj);
					}
				});
			}else {
				var spawn = real_time_instrs[instr_name].spawn;
				try {
					spawn.stdin.write(msg+"\n");//must end by "\n"
				} catch (e) {
					console.error('['+instr_name+']' +"Error!! \n"+e);
				}

			}
		})
	}
})


//auto push and auto store
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

//check db everyday if >1m del 1000 unuploaded records
setInterval(function () {
	fs.stat('./client_db.sqlite3',function(err,stats){
		if (err) {console.error(err);};
		if (stats.size>db_size_under) {
			del_old_data(auto_del_num);
		};
	})
},db_check_freq)

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
		event.emit('restart');//restart
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

event.on('restart',function () {
	event.emit('kill_runner','ALL')//kill all runner
	setTimeout(function () {
		active_instrs = {};//clear all running objs
		//socket.removeAllListeners();
		//socket.off(Socket.EVENT_CONNECT);
	},100)
	setTimeout(function () {
		event.emit('started')//restart
	},200)
})

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

//insert array into sqlite
function insert_all (temp_data) {
	var counter = temp_data.length;
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
		if (err) {console.error(err);return;};
		num_before = data[0]['COUNT(*)'].toString(10);
		//delete data
		db.run(sql_del_multi,{$number:number},function(err){
		  if (err) {console.error(err);socket.emit('db_error',err);return;};
		  db.all(sql_record_num+"data_table",function(err,data2){
		  	num_after = data2[0]['COUNT(*)'].toString(10);
		  	console.log((num_before-num_after)+" Records Deleted");
			socket.emit('db_succeed',(num_before-num_after)+" Records Deleted")
		  })
		})
	})
}

function unpushed_num() {
	db.all(sql_unpush_num,function(err,data){
		if (err) {
			console.error('DB ERROR: '+err);
			socket.emit('db_error',err);return;
		}
		var num = data[0]['COUNT(*)'];
		event.emit('unpushed_num',num)
	})
}
function force_push(number) {
	db.all(sql_force_push,{$number:number},function(err,data){
		if (err) {
			console.error('DB ERROR'+err);socket.emit('db_error',err);return;
		}
		event.emit('unpushed_data',data);
		//pushed : 0 => pushed : 1
		db.run(sql_pushed_update,{$number:number},function(err){
		  if (err) {console.log(err);socket.emit('db_error',err);return;};})
			var temp_data = data;
		return temp_data;
	})
}

//god_hand which can oprate db remote
function god_hand(mode,sql_query) {
	var json_data;
	switch (mode) {
		case "READ":
		case "SHOW":
		case "read":
		case "show":
			db.all(sql_query,function (err,data) {
				if (err) {json_data = JSON.stringify(err,null,' ');return;}
				json_data = JSON.stringify(data,null,' ');
				event.emit('god_hand_return',json_data)
			})
			break;
		case "INSERT":
		case "UPDATE":
		case "WRITE":
		case "write":
			db.run(sql_query,function (err) {
				if (err) {json_data = JSON.stringify(err,null,' ');return;}
				json_data = "DB UPDATED!";
				event.emit('god_hand_return',json_data)
			})
			break;
		default:
			json_data = "Mode in [READ] or [INSERT]";
			event.emit('god_hand_return',json_data)
	}
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

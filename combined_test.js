const sqlite3 = require('sqlite3');
var db;
const child = require('child_process');
const fs = require('fs');
const configs_path = '/configs';
const EventEmitter = require('events').EventEmitter;
const event = new EventEmitter();

const sql_instr_tab = "SELECT * FROM instrument_table ORDER BY id DESC";

var instr_list = {};
connect_db();

event.on('db_connected',function (res) {
	// wait until db connect is safer
	db.all(sql_instr_tab,function(err,res){
	  var instr_data = res;
	  if (res.length===0) {
			instr_data=[{"No Data": "No Data to View."}];
			console.warn(instr_data);
		}else if (err){
			instr_data =[{Error: err}] ;//avoid view error
			console.error(instr_data);
	  }else {
			event.emit('db_ready',instr_data);
			//console.log(instr_data)
	  }
	});
})


event.on('db_ready',function (instr_data) {
	//console.log(res)
	if (instr_data.length!=0) {
		//var instr_list = {};
		for (var i = instr_data.length - 1; i >= 0; i--) {
			instr_list[instr_data[i].instr_name] = {
				config : instr_data[i].config,
				available : false
			}
		}
		var configs_list = fs.readdirSync("."+configs_path)
		//find if some instrument have no config
		for(var i in instr_list){
			for(var j = configs_list.length - 1; j >= 0; j--){
				if (instr_list[i].config===configs_list[j]) {
					instr_list[i].available=true;break;
				}
			}
		}
		event.emit('instr_list_ready');
		//console.log(instr_list);
	}
})

event.on('instr_list_ready',function () {
	for (var i in instr_list) {
		if (instr_list[i].available) {
			//must use __dirname
			var temp_path = __dirname+configs_path+'/'+instr_list[i].config+'/'+instr_list[i].config+'.json';
			var config_json = JSON.parse(fs.readFileSync(temp_path, 'utf8'));
			//console.log(config_json)
			/* give all objs start function */
			instr_list[i].config_json=config_json;
			instr_list[i].spawn=spawn_process(config_json,instr_list[i].config);
			instr_list[i].running = function() {
				var spawn = this.spawn;
				var keyword = this.config_json.auto_sample.keyword;
				var freq = this.config_json.auto_sample.freq;
				var config = this.config;
				spawn.stdout.on('data', function(data){
			    	console.log('['+config+']' +data.toString());
				});

				spawn.stderr.on('data',function(data) {
					console.error("Error!! \n"+data)
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

/**** run all method, but can only one by unknow bug ****/
event.on('instr_setup_ready',function () {
	//test 1st obj 'python_test'
	/*
	var temp_path = __dirname+configs_path+'/'+instr_list['python_test'].config+'/'+instr_list['python_test'].config+'.json';
	var config_json = JSON.parse(fs.readFileSync(temp_path, 'utf8'));
	instr_list['python_test'].spawn=spawn_process(config_json,instr_list['python_test'].config);
	instr_list['python_test'].running = function() {
		//console.log(this.config)
		var spawn = this.spawn
		spawn.stdout.on('data', function(data){
	    	console.log('[python]' +data.toString());
		});

		spawn.stderr.on('data',function(data) {
			console.log("Error!! \n"+data)
		})

		setInterval(function () {
			spawn.stdin.write("Hello\n");//must end by "\n"
		},config_json.auto_sample.freq);
	};
	instr_list['python_test'].running()

	//test 2nd object 'node_test'
	var temp_path = __dirname+configs_path+'/'+instr_list['node_test'].config+'/'+instr_list['node_test'].config+'.json';
	var config_json = JSON.parse(fs.readFileSync(temp_path, 'utf8'));
	instr_list['node_test'].spawn=spawn_process(config_json,instr_list['node_test'].config);
	instr_list['node_test'].running = function() {
		//console.log(this.config)
		var spawn = this.spawn
		spawn.stdout.on('data', function(data){
	    	console.log('[node]'+ data.toString());
		});

		spawn.stderr.on('data',function(data) {
			console.log("Error!! \n"+data)
		})

		setInterval(function () {
			spawn.stdin.write("Hello\n");//must end by "\n"
		},2000);
	};
	instr_list['node_test'].running()

	//test 3rd object 'java_test'
	var temp_path = __dirname+configs_path+'/'+instr_list['java_test'].config+'/'+instr_list['java_test'].config+'.json';
	var config_json = JSON.parse(fs.readFileSync(temp_path, 'utf8'));
	instr_list['java_test'].spawn=spawn_process(config_json,instr_list['java_test'].config);
	instr_list['java_test'].running = function() {
		//console.log(this.config)
		var spawn = this.spawn
		spawn.stdout.on('data', function(data){

	    	console.log('[java]' +data.toString());
		});

		spawn.stderr.on('data',function(data) {
			console.log("Error!! \n"+data)
		})

		setInterval(function () {
			spawn.stdin.write("Hello\n");//must end by "\n"
		},2000);
	};
	instr_list['java_test'].running()
 */


	for (var i in instr_list) {
		//console.log(instr_list[i])
		if (instr_list[i].available) {
			instr_list[i].running()
			console.log(i)
		};
	};

})


/**** run all method ****/

function connect_db(){
  db = new sqlite3.Database('client_db.sqlite3',sqlite3.OPEN_READWRITE,function (err) {
    if (err) {
    	console.log(err);
    }else{
    	event.emit('db_connected')
    }
  });//if write sqlite3.OPEN_READWRITE db will not create auto
}

function spawn_process (config_json,config_name) {
	var temp_entrance = __dirname+configs_path+'/'+config_name+'/'+config_json.entrance;
	//console.log(temp_entrance)
	switch (config_json.engine) {
		case 'python':
			//console.log("python")
			//python must "-u" to unbuffered binary stdout and stderr
			return child.spawn( 'python', ['-u',temp_entrance],{stdio:[ 'pipe',null,null, 'pipe' ]});
			break;
		case 'cmd.exe':
			//console.log("cmd")
			// '/c' to stop keep steam in buffer
			return child.spawn( 'cmd.exe', ['/c',temp_entrance],{stdio:[ 'pipe',null,null, 'pipe' ]});
			break;
		case 'java':
			//console.log("java")
			//console.log(temp_entrance);
			temp_entrance = __dirname+configs_path+'/'+config_name;
			return child.spawn( 'java', ['-classpath',temp_entrance,config_json.entrance],{stdio:[ 'pipe',null,null, 'pipe' ]});
			break;
		case 'node':
			//console.log("node")
			return child.spawn( 'node', [temp_entrance,' {node}'],{stdio:[ 'pipe',null,null, 'pipe' ]});
			break;
		case 'ruby':
			return child.spawn( 'ruby', [temp_entrance],{stdio:[ 'pipe',null,null, 'pipe' ]});
			break;
	}
}

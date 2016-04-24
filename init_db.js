var sqlite3 = require('sqlite3');

var set_sensor_table = "CREATE TABLE instrument_table (id INTEGER PRIMARY KEY AUTOINCREMENT,instr_name TEXT UNIQUE NOT NULL,mac_addr TEXT,config TEXT NOT NULL);";
var set_data_table = " CREATE TABLE data_table( instr_name TEXT NOT NULL ,sample_time DATETIME NOT NULL,raw_data NUMERIC,pushed INT NOT NULL); ";
//wait until DB ready
var wait_time = 2500;

var db = new sqlite3.Database('client_db.sqlite3',function (err) {
	console.log("Wait "+wait_time/1000+" sec until DB ready");
});

//wait IO and connect to Database
setTimeout(function(){
	db = new sqlite3.Database('client_db.sqlite3',
		sqlite3.OPEN_READWRITE,function(err) {
	    if (err) {
	      console.error("DB err:"+err.message);
	    	}
	    else {
	      console.log("Database opened.");
	      db.run(set_data_table,function(err){
	      	if (err) {
	      		console.log(err);
	      	}else{
	      		console.log("data_table CREATED.");
	      	};
	      });
	      db.run(set_sensor_table,function(err){
	      	if (err) {
	      		console.log(err);
	      	}else{
	      		console.log("sensor_table CREATED.");
	      	};
	      });
	    }
	  });
},wait_time);

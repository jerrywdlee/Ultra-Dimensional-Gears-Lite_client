var sqlite3 = require('sqlite3');

var set_data_table = " CREATE TABLE data_table( alt_name TEXT NOT NULL,mac_addr TEXT,sample_time DATETIME PRIMARY KEY,raw_data NUMERIC,sensor_type TEXT NOT NULL,pushed INT NOT NULL); ";
//wait until DB ready
var wait_time = 2500;

var db = new sqlite3.Database('client_db.sqlite3',function (err) {
	console.log("Wait "+wait_time/1000+" sec until DB ready");
});
//db.close(function(err){console.log("Wait 3 sec for DB ready")});



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
	    }
	  });//connect to Database
},wait_time);








//var set_data_table = "CREATE TABLE data_table(name TEXT);"



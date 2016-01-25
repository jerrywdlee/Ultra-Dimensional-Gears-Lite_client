const sqlite3 = require('sqlite3');
var db;
const child = require('child_process');
const fs = require('fs');
const EventEmitter = require('events').EventEmitter; 
const event = new EventEmitter(); 

const sql_instr_tab = "SELECT * FROM instrument_table ORDER BY id DESC";

//var instr_data = [];
connect_db();

event.on('db_connected',function (res) {
	// wait until db connect is safer
	db.all(sql_instr_tab,function(err,res){
	  var instr_data = res;
	  if (res.length===0) {instr_data=[{"No Data": "No Data to View."}]};
	  if (err){
	      instr_data =[{Error: err}] ;//avoid view error
	  };
	  event.emit('db_ready',instr_data);
	  //console.log(instr_data)
	});
})


event.on('db_ready',function (res) {
	console.log(res)
	if (res.length!=0) {
		var instr_all =[];
	}
})


function connect_db(){
  db = new sqlite3.Database('client_db.sqlite3',sqlite3.OPEN_READWRITE,function (err) {
    if (err) {
    	console.log(err);
    }else{
    	event.emit('db_connected')
    }
  });//if write sqlite3.OPEN_READWRITE db will not create auto
}

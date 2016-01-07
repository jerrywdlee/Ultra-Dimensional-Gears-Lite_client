var os = require('os');
var	fs = require('fs');

//DB
var sqlite3 = require('sqlite3');
var db_flag = null;//if db exsit
var io_wait_time = 100;
var db;
connect_db();//if db exsit,try to connect
var sql_test = "SELECT name FROM sqlite_master WHERE type='table' AND name!='sqlite_sequence' order by name;";
//for initiate DB
var childProcess = require('child_process');

//for http server
var	express = require('express'),
    app = express();
//router very very important
var index_router = express.Router();
var set_db_router = express.Router();
//set ejs as view
app.set('view options', { layout: false });
app.set('view engine', 'ejs');
var port = 8888;
app.listen(port);

index_router.get('/', function(req, res, next) {
  var ini_json = load_ini_json();
  var disable = ini_json.dev_name?"":"disabled";//confirm if have ini.json
  res.render('index', { 
  						title: ini_json.dev_name || 'New Device',
  						disable: disable ||'true' , 
              uuid: ini_json.uuid || get_uuid(),
              org: ini_json.org || 'Unknow.Org',
              dev_name: ini_json.dev_name || '',
              mail: ini_json.mail || '',
              tel: ini_json.tel || ''});
});

//render index page defalt
app.use('/', index_router);
//render set db page
app.use('/set_db', function(req,res){
  //reload ini.json for setting db
  var ini_json = load_ini_json();
  //and render set_db page if ini.json completed
  if (ini_json.dev_name) {
    //if no db connection,connect    
    if (!db_flag) {
      connect_db();
    }
    //operate_db(db);
    var db_data = [{Error: "No Data!"}];
    db.all(sql_test,function(err,res){
      db_data = res;
      if (err){
          db_data = err;
      };     
    });
    // waitting for io ready
    setTimeout(function(){
      console.log(db_data);
      res.render('set_db', { title: ini_json.dev_name,
                             db_data: db_data } );},io_wait_time);
  }else{
    res.end("<p>You Seems Have Not Registered Before</p>"+
      "<p><a href='./'>Click Here to Register</a><p>");
  }
});

//when get data from index 
app.get('/reg_div', function(req, res){
  console.log(req.query); // for logging

  if (req.query) {  //if not null
  	//write ini.json
    fs.writeFile('ini.json', 
    	JSON.stringify(req.query,null,' '), 
    	function(err){
        if (err) {
          console.log(err)
        }; 
        //reload ini.json for confirm page
        var ini_json = load_ini_json();
        //and render  page
        var disable = ini_json.dev_name?"":"disabled";
        res.render('confirm_set', { title: ini_json.dev_name,
                                    disable: disable,
                                    data: ini_json } );
        init_db();//when regsitered , init DB
      });
  }else{ 
    //app.use('/', router);//render index page
  }
});




console.log("Please connect to :");
//get local ip address 
var ifaces = os.networkInterfaces();
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

function get_uuid(){
  var now = new Date();
  var uuid = now.toISOString();
  var rad = Math.random().toString(16);
  uuid += rad.substr(2,4);
  return uuid;
}

//find if have ini.json
function load_ini_json(){
  try{
    var ini_json = JSON.parse(fs.readFileSync('./ini.json', 'utf8'));
  }catch(e){
    var ini_json = { };
  }
  return ini_json;
}

function init_db(){
  var workerProcess = childProcess.exec('node init_db.js',function (err,stdout,stderr) {
    if (err) {
      console.log(err.stack);
      console.log('Error code: '+err.code);
      console.log('Signal received: '+err.signal);
    };
    console.log('stdout: ' + stdout);
    console.log('stderr: ' + stderr);
  });
  workerProcess.on('exit',function (code) {
    console.log('Child Process Over');
  });
}

function connect_db(){
  db = new sqlite3.Database('client_db.sqlite3',sqlite3.OPEN_READWRITE,function (err) {
    if (err) {
      console.log(err);
      db_flag = null;
    }else{
      console.log("DB connected");
      db_flag = true;
    }
  });//if write sqlite3.OPEN_READWRITE db will not create auto
}

function operate_db(db,sql){
    db.all("SELECT name FROM sqlite_master WHERE type='table' AND name!='sqlite_sequence' order by name;",
    function(err,res){console.log(res);});
}
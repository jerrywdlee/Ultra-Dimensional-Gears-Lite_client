const child_process = require('child_process');
const fs = require('fs');
const configs_path = "./configs";


var instr_names = ["test_java","test_nodejs","test_python"];

var obj_on_go = {};
for (var i = instr_names.length - 1; i >= 0; i--) {
   add_or_exec( instr_names[i]);
}

/*** test code 
obj_on_go["test_java"].child_process.stdout.on('data', function (data) {
               console.log(' stdout: ' + data);});
setInterval(function () {
obj_on_go["test_java"].child_process.stdin.write("test\n");
},2000);
/*** test code ***/

function add_or_exec (instr_name) {
   if (!obj_on_go[instr_name]) { 
      obj_on_go[instr_name] =JSON.parse(fs.readFileSync(configs_path+"/"+instr_name+"/"+instr_name+".json","utf8"));
      //console.log(obj_on_go[instr_name].exec);
      var dir_path = __dirname+"/"+"configs"+"/"+instr_name;//end of "cwd" must no "/" 
      if (obj_on_go[instr_name].engine!="node"||obj_on_go[instr_name].multiprocess) {
         if (obj_on_go[instr_name].keep_run&&obj_on_go[instr_name].auto_sample) {
            obj_on_go[instr_name].child_process = child_process.spawn(obj_on_go[instr_name].engine, 
               [obj_on_go[instr_name].entrance],  {cwd: dir_path, stdio:['pipe']} );
            /*
            obj_on_go[instr_name].out = function(){ obj_on_go[instr_name].child_process.stdout.on('data', function (data) {
               console.log(instr_name+' stdout: ' + data);
               });}
            obj_on_go[instr_name].send = function(){ 
               obj_on_go[instr_name].child_process.stdin.write(obj_on_go[instr_name].auto_sample.keyword);
               }
               */
            };
             
         };
   }else{

   }
}



//console.log(__dirname)

//for java must use absolute pathname

var path3 = __dirname+"/"+"configs"+"/"+"test_python";//end of "cwd" must no "/" 
var workerProcess3 = child_process.spawn('python', ['test3.py',"bbbb"],  {cwd: path3, stdio:['pipe']} );

   workerProcess3.stdout.on('data', function (data) {
      console.log('stdout: ' + data);
   });
   setTimeout(function() {
      workerProcess3.stdin.write("Hello\n");//must end by "\n"
   },2000)
   setTimeout(function() {
      workerProcess3.stdin.write("World\n");//must end by "\n"
   },4000)
   setTimeout(function() {
      workerProcess3.stdin.write("aaa\n");//must end by "\n"
   },6000)
   setTimeout(function() {
      workerProcess3.kill();
   },8000)
   //workerProcess3.stdin.end();//dont write it too quickly , will error
   workerProcess3.stderr.on('data', function (data) {
      console.log('stderr: ' + data);
   });

   workerProcess3.on('close', function (code) {
      console.log('子进程已退出，退出码 '+code);//null:killed; 0:end by self
   });
   
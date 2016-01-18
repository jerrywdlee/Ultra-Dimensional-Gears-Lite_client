const child_process = require('child_process');
const configs_path = "./configs";
var path_name="test";
var file_name ="test.js";
/*
for(var i=0; i<3; i++) {
   var path=configs_path+"/"+path_name+"/"+file_name;
   var workerProcess = child_process.spawn('node', [path, i] );

   workerProcess.stdout.on('data', function (data) {
      console.log('stdout: ' + data);
   });

   workerProcess.stderr.on('data', function (data) {
      console.log('stderr: ' + data);
   });

   workerProcess.on('close', function (code) {
      console.log('子进程已退出，退出码 '+code);
   });
}
*/
console.log(__dirname)
/*
var path2="cd "+configs_path+"/"+path_name+"/"+"&&"+" "+"java test"+" ";

var workerProcess2 = child_process.exec(path2+"aaa",
      function (error, stdout, stderr) {
         if (error) {
            console.log(error.stack);
            console.log('Error code: '+error.code);
            console.log('Signal received: '+error.signal);
         }
         console.log('stdout: ' + stdout);
         //console.log('stderr: ' + stderr);
      });

      workerProcess2.on('exit', function (code) {
      console.log('子进程已退出，退出码 '+code);
   });
*/
//for java must use absolute pathname
var path3 = __dirname+"/"+"configs"+"/"+"test";//end of "cwd" must no "/" 
var workerProcess3 = child_process.spawn('java', ['test',"bbbb"],  {cwd: path3, stdio:['pipe']} );

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
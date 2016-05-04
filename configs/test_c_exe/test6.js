var child = require('child_process');
var path = __dirname+'/';
var cpp = child.spawn( path+'test6',['aaa','bbb'],{stdio:[ 'pipe',null,null, 'pipe' ]});
//var cpp = child.spawn("test6", [], { stdio: 'inherit' });

//console.log(path);
chunk ="AABBAA"
//cpp.stdin.write("AAAA\n");
cpp.stdout.on('data', function(data){
	chunk += data;//it returns <Buffer 74 65 73 74 5f 70 79 74 68 6f 6e 0d 0a>
    console.log("[test6] "+data.toString());
} );

cpp.stderr.on('data', function (data) {
      console.log('stderr: ' + data.toString());
   });
//cpp.stdin.write("AAAA\n");

//cpp.kill();

setInterval(function() {
//setTimeout(function () {
   cpp.stdin.write("Hello\n");//must end by "\n"
   //cpp.stdin.write("Hello1\n");//must end by "\n"
   //cpp.stdin.write("Hello2\n");//must end by "\n"
},2000)

setTimeout(function () {
  //cpp.kill();
},10000)

cpp.stdout.on('close', function( ){
    console.log(chunk);
} );

var child = require('child_process');

var cmd = child.spawn( 'cmd.exe', ['/c','test4.bat'],{stdio:[ 'pipe',null,null, 'pipe' ]});
// '/c' to stop keep steam in buffer
//var chunk = '';
cmd.stdout.on('data', function(data){
	//chunk += data;//it returns <Buffer 74 65 73 74 5f 70 79 74 68 6f 6e 0d 0a>
    console.log( data.toString());
} );

cmd.stderr.on('data', function (data) {
      console.log('stderr: ' + data.toString());
   });
//cmd.stdin.write("AAAA\n");

/*
setTimeout(function() {
   python.stdin.write("Hello\n");//must end by "\n"
},2000)
*/
/*
python.stdout.on('close', function( ){
    console.log(chunk);
} );*/
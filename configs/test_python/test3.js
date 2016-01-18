var child = require('child_process');

var python = child.spawn( 'python', ['-u','test3.py'],{stdio:[ 'pipe',null,null, 'pipe' ]});//python must "-u" to unbuffered binary stdout and stderr
//python似乎不能实时通信
//var chunk = '';
python.stdout.on('data', function(data){
	//chunk += data;//it returns <Buffer 74 65 73 74 5f 70 79 74 68 6f 6e 0d 0a>
    console.log( data.toString());
} );

python.stderr.on('data', function (data) {
      console.log('stderr: ' + data.toString());
   });
python.stdin.write("AAAA\n");

setTimeout(function() {
   python.stdin.write("Hello\n");//must end by "\n"
},2000)

/*
python.stdout.on('close', function( ){
    console.log(chunk);
} );*/
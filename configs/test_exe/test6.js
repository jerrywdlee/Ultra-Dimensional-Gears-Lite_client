var child = require('child_process');
var path = __dirname+'/';
var ruby = child.spawn( path+'string.exe',{stdio:[ 'pipe',null,null, 'pipe' ]});//ruby must "-u" to unbuffered binary stdout and stderr

ruby.stdin.write("AAAA\n");
ruby.stdout.on('data', function(data){
	//chunk += data;//it returns <Buffer 74 65 73 74 5f 70 79 74 68 6f 6e 0d 0a>
    console.log( data.toString());
} );

ruby.stderr.on('data', function (data) {
      console.log('stderr: ' + data.toString());
   });
ruby.stdin.write("AAAA\n");

//ruby.kill();

setInterval(function() {
   ruby.stdin.write("Hello\n");//must end by "\n"
},2000)

/*
ruby.stdout.on('close', function( ){
    console.log(chunk);
} );*/
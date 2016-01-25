var child = require('child_process');
var java = child.spawn( 'java', ['test'],{stdio:[ 'pipe',null,null, 'pipe' ]});

java.stdout.on('data', function(data){
	//chunk += data;//it returns <Buffer 74 65 73 74 5f 70 79 74 68 6f 6e 0d 0a>
    console.log( data.toString());
} );

setInterval(function () {
	java.stdin.write("Hello\n");//must end by "\n"
},2000);
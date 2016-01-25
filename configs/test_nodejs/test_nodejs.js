var child = require('child_process');
var node = child.spawn( 'node', ['test2','aaa'],{stdio:[ 'pipe',null,null, 'pipe' ]});
// process.argv[2] will be aaa
node.stdout.on('data', function(data){
	//chunk += data;//it returns <Buffer 74 65 73 74 5f 70 79 74 68 6f 6e 0d 0a>
    console.log( data.toString());
} );

setInterval(function () {
	node.stdin.write("Hello\n");//must end by "\n"
},2000);
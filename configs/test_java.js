//to test how to run java in different dir

var child = require('child_process');
var pass = __dirname+'/'+'test_java'+' '+'test';
console.log(pass)
var java = child.spawn( 'java', ['-classpath',__dirname+'/test_java','test'],{stdio:[ 'pipe',null,null, 'pipe' ]});
// $ java -classpath [yourpath] [classname]
java.stdout.on('data', function(data){
	//chunk += data;//it returns <Buffer 74 65 73 74 5f 70 79 74 68 6f 6e 0d 0a>
    console.log( data.toString());
} );

setInterval(function () {
	java.stdin.write("Hello\n");//must end by "\n"
},2000);
process.stdin.resume();//this is how to get input from console
process.stdin.setEncoding('utf8');

console.log("initiating process ,argv: " + process.argv[2] +","+process.argv[3] + " \nPlease input: " );


process.stdin.on('data',function (data) {
	// body...
	console.log('I receive: '+data.toString() )
})


setInterval(function () {
//	//console.log("进程 " + process.argv[2] + " 执行。" );
	process.exit();
},10000);

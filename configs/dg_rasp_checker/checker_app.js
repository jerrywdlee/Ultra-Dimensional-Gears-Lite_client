process.stdin.resume();//this is how to get input from console
process.stdin.setEncoding('utf8');
const child_process = require('child_process');
//var exec = child_process
//console.log("Initiating Rasp Checker ,argv: " + process.argv[2] +","+process.argv[3] + " \nPlease input: " );

const CODEC = "H264 MPG2 WVC1 MPG4 MJPG WMV9";

process.stdin.on('data',function (data) {
	// body...
	var command = "";
	var keyword = data.toString().replace(/[\n\r]/g,"")
	//console.log('I receive: '+ keyword )
	//console.log(keyword==="cpu_temp");
	switch (keyword) {
		case "cpu_temp":
			exec_command = "cat /sys/class/thermal/thermal_zone0/temp"
			//exec_command = "cat "+__dirname+"/test.txt"
			try {
				var exec_process = child_process.exec(exec_command,function(error, stdout, stderr){
					if (error) {
						console.log("{'error':"+stderr+"}");
					}
					var cpu_temp = stdout.toString().replace(/[\n\r]/g,"")
					cpu_temp = parseInt(cpu_temp,10)
					cpu_temp = cpu_temp/1000
					console.log("{'cpu_temp':'"+cpu_temp+"'}");
				})
			} catch (e) {
				console.log("{'error':'"+e+"'}");
			}
			//console.log("cpu_temp");
			break
		case "codec_enabled":
			exec_command = "for codec in "+CODEC+ '; do echo "$(vcgencmd codec_enabled $codec)" ; done'
			//for codec in H264 MPG2 WVC1 MPG4 MJPG WMV9 ; do echo -e "$codec:\t$(vcgencmd codec_enabled $codec)" ; done
			var codec_enabled="{"
			try {
				var exec_process = child_process.exec(exec_command,function(error, stdout, stderr){
					if (error) {
						console.log("{'error':"+stderr+"}");
					}
					stdout = stdout.toString()
					//var temp_codec=[]
					var temp_codec =stdout.split('\n');
					//last one is a ""
					for (var i=temp_codec.length-2;i>0 ;i--) {
						temp = temp_codec[i].split('=')
						codec_enabled += "'"+temp[0]+"':'"+temp[1]+"'"
						if (i>1) {
							codec_enabled += ","
						}
					}
					codec_enabled += "}"
					//console.log(codec_enabled);
					console.log(codec_enabled);
				})
				/*
				for (var i=CODEC.length-1 ;i>0;i--) {
					//temp_codec=CODEC[i].split('=')
					var exec_process = child_process.exec(exec_command+CODEC[i],function(error, stdout, stderr){
						if (error) {
							console.log("{'error':"+stderr+"}");
						}
						temp_codec = stdout.toString().replace(/[\n\r]/g,"").split('=');
					})
					codec_enabled += "'"+temp_codec[0]+"':'"+temp_codec[1]+"'"
					if (i>1) {
						codec_enabled += ","
					}
				}
				codec_enabled += "}"
				console.log(codec_enabled);
				*/
			} catch (e) {
				console.log("{'error':'"+e+"'}");
			}
			break;
		case "all":
		case "ALL":
			console.log("ALL")

			break;
		default:
			console.log("{'No Such Command':'"+keyword+"'}");
	}


})


//setInterval(function () {
////	//console.log("进程 " + process.argv[2] + " 执行。" );
//	process.exit();
//},10000);

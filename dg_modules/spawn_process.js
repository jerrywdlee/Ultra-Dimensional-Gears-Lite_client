const child = require('child_process');

function spawn_process (config_json,config_name,dir_path,configs_path,mac_addr) {
	var temp_entrance = dir_path+configs_path+'/'+config_name+'/'+config_json.entrance;
	//var argv_arry = config_json.argv;
	//console.log(temp_entrance)
  mac_addr = mac_addr.replace(" ","")
	switch (config_json.engine) {
		case 'python':
			//console.log("python")
			//python must "-u" to unbuffered binary stdout and stderr
      var entrance_array = ['-u',temp_entrance]
      if (mac_addr !== '' && mac_addr !== undefined && mac_addr !== null) {
        entrance_array.push(mac_addr)
      }
			entrance_array.concat(config_json.argv);
			return child.spawn( 'python',entrance_array,{stdio:[ 'pipe',null,null, 'pipe' ]});
			break;
		case 'cmd.exe':
			//console.log("cmd")
			// '/c' to stop keep steam in buffer
      var entrance_array = ['/c',temp_entrance]
      if (mac_addr !== '' && mac_addr !== undefined && mac_addr !== null) {
        entrance_array.push(mac_addr)
      }
      entrance_array.concat(config_json.argv);
			//var entrance_array = ['/c',temp_entrance].concat(config_json.argv);
			return child.spawn( 'cmd.exe',entrance_array,{stdio:[ 'pipe',null,null, 'pipe' ]});
			break;
		case 'java':
			//console.log("java")
			//console.log(temp_entrance);
			temp_entrance = dir_path+configs_path+'/'+config_name;
			var entrance_array = ['-classpath',temp_entrance,config_json.entrance];
      if (mac_addr !== '' && mac_addr !== undefined && mac_addr !== null) {
        entrance_array.push(mac_addr)
      }
      entrance_array.concat(config_json.argv);
			return child.spawn( 'java', entrance_array,{stdio:[ 'pipe',null,null, 'pipe' ]});
			break;
		case 'node':
			//console.log("node")
			var entrance_array =  [temp_entrance];
      if (mac_addr !== '' && mac_addr !== undefined && mac_addr !== null) {
        entrance_array.push(mac_addr)
      }
      entrance_array.concat(config_json.argv);
			return child.spawn( 'node', entrance_array,{stdio:[ 'pipe',null,null, 'pipe' ]});
			break;
		case 'ruby':
			//var entrance_array =  [temp_entrance].concat(config_json.argv);
      var entrance_array =  [temp_entrance]
      if (mac_addr !== '' && mac_addr !== undefined && mac_addr !== null) {
        entrance_array.push(mac_addr)
      }
      entrance_array.concat(config_json.argv);
			return child.spawn( 'ruby', entrance_array,{stdio:[ 'pipe',null,null, 'pipe' ]});
			break;
		case 'c_exe':
      //in .c files must use "fflush(stdout);" after "printf"
			//var entrance_array = config_json.argv;
      var entrance_array = [];
      if (mac_addr !== '' && mac_addr !== undefined && mac_addr !== null) {
        entrance_array.push(mac_addr)
      }
      entrance_array.concat(config_json.argv);
			return child.spawn( temp_entrance, entrance_array,{stdio:[ 'pipe',null,null, 'pipe' ]});
			break;
		default:
			var entrance_array =  [temp_entrance];
      if (mac_addr !== '' && mac_addr !== undefined && mac_addr !== null) {
        entrance_array.push(mac_addr)
      }
      entrance_array.concat(config_json.argv);
			return child.spawn( config_json.engine,entrance_array,{stdio:[ 'pipe',null,null, 'pipe' ]});
	}
}

module.exports = spawn_process;

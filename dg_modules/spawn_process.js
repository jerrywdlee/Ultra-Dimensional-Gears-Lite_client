const child = require('child_process');

function spawn_process (config_json,config_name,dir_path,configs_path,mac_addr) {
	var temp_entrance = dir_path+configs_path+'/'+config_name+'/'+config_json.entrance;
	//console.log(temp_entrance)
	switch (config_json.engine) {
		case 'python':
			//console.log("python")
			//python must "-u" to unbuffered binary stdout and stderr
			return child.spawn( 'python', ['-u',temp_entrance],{stdio:[ 'pipe',null,null, 'pipe' ]});
			break;
		case 'cmd.exe':
			//console.log("cmd")
			// '/c' to stop keep steam in buffer
			return child.spawn( 'cmd.exe', ['/c',temp_entrance],{stdio:[ 'pipe',null,null, 'pipe' ]});
			break;
		case 'java':
			//console.log("java")
			//console.log(temp_entrance);
			temp_entrance = dir_path+configs_path+'/'+config_name;
			return child.spawn( 'java', ['-classpath',temp_entrance,config_json.entrance],{stdio:[ 'pipe',null,null, 'pipe' ]});
			break;
		case 'node':
			//console.log("node")
			return child.spawn( 'node', [temp_entrance,' {node}'],{stdio:[ 'pipe',null,null, 'pipe' ]});
			break;
		case 'ruby':
			return child.spawn( 'ruby', [temp_entrance],{stdio:[ 'pipe',null,null, 'pipe' ]});
			break;
	}
}

module.exports = spawn_process;

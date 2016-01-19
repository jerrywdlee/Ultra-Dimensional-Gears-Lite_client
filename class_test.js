var EventEmitter = require('events').EventEmitter; 
var event = new EventEmitter(); 

var array = {};
var names =["aaa","bbb","ccc"];

for (var i = names.length - 1; i >= 0; i--) {
	array[names[i]] = {};
	array[names[i]].name = names[i];
	array[names[i]].delay=(i+1)*1000
	array[names[i]].call_name = function() {
		var name = this.name
		var delay = this.delay
		setInterval(function(){
			console.log("Name is :"+ name);
		},delay)
		event.on('call_name'+name, function() { 
			console.log(name+' Has been called'); 
		});
	};
}
console.log(array)

//ignite all functions in 3 objects
for (var i in array) {
	array[i].call_name();
};
//emit event
setInterval(function(){
	event.emit('call_name'+'aaa'); 
},2500)
setInterval(function(){
	event.emit('call_name'+'bbb'); 
},3500)
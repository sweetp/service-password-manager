var sweetp = require('./lib/sweetp');
var http = require('http');

var service, client;

service = {
	getConfig:function() {
		var config = [{
			'/password/manager/get':{
				method:'get',
				params: {
					name: 'one'
				}
			}
		}];
		return config;
	},

	get:function(params) {
		return "test " + params.name;
	}
};

client = sweetp.start(service);

process.once('SIGUSR2', function() {
	console.log('Got a SIGUSR2');
	client.closeSocket();
	http.get({
		host:'localhost',
		port:7777,
		path:'/services/foo/password/manager/get'
	}, function() {
		console.log('http request finished');
		process.kill(process.pid, 'SIGUSR2');
	}).on('error', function(e) {
		console.log("Got error: " + e.message);
	});
});


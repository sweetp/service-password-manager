var sweetp = require('./lib/sweetp');
var http = require('http');

var service, methods, client;

service = {
	get:{
		options: {
			params: {
				name: 'one'
			}
		},
		target:'/password/manager/get',
		fn:function(params) {
			return "test " + params.name;
		}
	}
};

methods = sweetp.createMethods(service);
client = sweetp.start(methods);

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


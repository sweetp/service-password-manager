var sweetp = require('./lib/sweetp');
var http = require('http');
var Crypto = require('ezcrypto').Crypto;
var bcrypt = require('bcrypt');

var service, methods, client;

// private helper functions for service methods
function foo(name) {
	return "foobar" + name;
}

// public service functions
service = {
	get:{
		options: {
			params: {
				name: 'one'
			}
		},
		fn:function(params) {
			// get user and password for 'name'
			return foo(params.name);
		}
	},

	set:{
		options: {
			params: {
				name: 'one',
				user: 'one',
				password: 'one'
			}
		},
		fn:function(params) {
			// set object
			return "test " + params.name;
		}
	},

	authenticate:{
		options: {
			params: {
				url: 'url'
			}
		},
		fn:function(params) {
			// call service to retrieve master password by user and decrypt password safe
			return "test " + params.name;
		}
	},

	createPasswordStore:{
		options: {
			params: {
				url: 'url'
			}
		},
		fn:function(params) {
			// create master password for this project
			return "test " + params.name;
		}
	}
};

// create service methods and start sweetp service (client)
methods = sweetp.createMethods(service, '/password/manager/');
client = sweetp.start(methods);

// only used for development
process.once('SIGUSR2', function() {
	console.log('restarting...');
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


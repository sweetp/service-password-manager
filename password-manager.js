var sweetp = require('./lib/sweetp');
var http = require('http');
var Crypto = require('ezcrypto').Crypto;
var bcrypt = require('bcrypt');
var fs = require('fs');
var path = require('path');

var

/**
 * {Object} service methods with sweetp meta data
 * @private
 */
service,
methods, client, salt, passwords, master;

// init
salt = bcrypt.genSaltSync(10);
master = {};
passwords = {};

// private helper functions for service methods

function getMasterPasswordFromUser(url) {
	// TODO get it with service call
	return "foobar";
}

function getDataPath(config) {
	return path.join(config.dir, ".sweetp", "passwordSafe.json");
}

function getDataFromFile(dataPath, callback) {
	fs.exists(dataPath, function (exists) {
		if (!exists) {
			throw new Error("Password file doesn't exist, call 'createStore' method to init password store in .sweetp/ directory of this project.");
		}
		fs.readFile(dataPath, function (err, fileData) {
			if (err) {
				throw new Error("Error occured during password file read: " + err);
			}
			data = JSON.parse( fileData.toString() );
			if (!data.master) {
				throw new Error("Master password hash not found in file " + dataPath);
			}
			masterHash = data.master;
			// TODO finish
			callback();
		});
	});
}


// public service functions
service = {
	createSafe:{
		options: {
			params: {
				url: 'url',
				config: 'projectConfig'
			}
		},
		fn:function(params) {
			var masterHash, masterPassword;
			master[params.config.name] = masterPassword = getMasterPasswordFromUser(params.url);
			masterHash = bcrypt.hashSync(masterPassword, salt);
			dataPath = getDataPath(params.config);
			passwords[params.config.name] = {};
			fs.writeFileSync(dataPath, JSON.stringify({master:masterHash, passwords:{}}), 'utf-8');
			return "Password safe created successfully.";
		}
	},

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
				password: 'one',
				config: 'projectConfig'
			}
		},
		fn:function(params) {

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


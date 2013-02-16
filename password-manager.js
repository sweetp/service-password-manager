var sweetp = require('./lib/sweetp');
var http = require('http');
var Crypto = require('ezcrypto').Crypto;
var bcrypt = require('bcrypt');
var fs = require('fs');
var path = require('path');


/**
 * {Object} service methods with sweetp meta data
 * @private
 */
var service;

var methods, client, salt, passwords, master;

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

function updatePasswordSafe(config) {
	var masterHash, masterPassword, passwords;
	masterPassword = master[config.name];
	masterHash = bcrypt.hashSync(masterPassword, salt);
	dataPath = getDataPath(config);
	passwords = passwords[config.name];
	fs.writeFileSync(dataPath, JSON.stringify({master:masterHash, passwords:passwords}), 'utf-8');
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
			master[params.config.name] = getMasterPasswordFromUser(params.url);
			updatePasswordSafe(params.config);
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
				key: 'one',
				username: 'one',
				password: 'one',
				config: 'projectConfig'
			}
		},
		fn:function(params) {
			var masterPassword;

			if (!master[params.config.name]) {
				throw new Error("Not authenticated, call authenticate service method to encrypt password safe for this project.");
			}
			masterPassword = master[params.config.name];

			value = {};
			value.username = Crypto.AES.encrypt(params.username, masterPassword);
			value.password = Crypto.AES.encrypt(params.password, masterPassword);

			passwords[params.config.name][params.key] = value;
			updatePasswordSafe(params.config);
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


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

var methods, client, salt, passwordsCache, master;

// init
salt = bcrypt.genSaltSync(10);

// save master passwords in memory to de/encrypt passwords
master = {};

// cache loaded passwords from safe
passwordsCache = {};
masterHashCaches = {};

// private helper functions for service methods

function getMasterPasswordFromUser(url) {
	// TODO get it with service call
	return "foobar";
}

function getDataPath(dir) {
	return path.join(dir, ".sweetp", "passwordSafe.json");
}

function refreshPasswords(err, project, dir, callback) {
	if (err) return callback(err);

	// TODO check modified date from file
	if (passwordsCache[project] && masterHashCaches[project]) {
		return callback(null, {
			passwords:passwordsCache[project],
			master:masterHashCaches[project]
		});
	}

	return getDataFromFile(null, dir, callback);
}

function getDataFromFile(err, dir, callback) {
	if (err) return callback(err);

	dataPath = getDataPath(dir);

	fs.exists(dataPath, function (exists) {
		if (!exists) {
			return callback(new Error("Password file doesn't exist, call 'createStore' method to init password store in .sweetp/ directory of this project."));
		}

		fs.readFile(dataPath, function (err, fileData) {
			if (err) {
				return callback(new Error("Error occured during password file read: " + err));
			}

			data = JSON.parse(fileData.toString());

			if (!data.master) {
				return callback(new Error("Master password hash not found in file " + dataPath));
			}

			callback(null, data);
		});
	});
}

function updatePasswordSafe(dir, name, passwords) {
	var masterHash, masterPassword;
	masterPassword = master[name];
	masterHash = bcrypt.hashSync(masterPassword, salt);
	dataPath = getDataPath(dir);
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
		fn:function(err, params, callback) {
			if (err) return callback(err);
			master[params.config.name] = getMasterPasswordFromUser(params.url);
			updatePasswordSafe(params.config.name, params.config.dir, {});
			return callback(null, "Password safe created successfully.");
		}
	},

	get:{
		options: {
			params: {
				name: 'one'
			}
		},
		fn:function(err, params, callback) {
			if (err) return callback(err);
			// get user and password for 'name'
			return callback(null, foo(params.name));
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
		fn:function(err, params, callback) {
			var masterPassword, project;

			if (err) return callback(err);

			project = params.config.name;
			masterPassword = master[project];
			if (!masterPassword) {
				return callback(new Error("Not authenticated, call authenticate service method to encrypt password safe for this project."));
			}

			if (!params.key) {
				return callback(new Error("No key given!"));
			}

			refreshPasswords(null, params.config.name, params.config.dir, function(err, data) {
				var value;

				if (err) return callback(err);

				// generate data object
				value = {};
				value.username = Crypto.AES.encrypt(params.username, masterPassword);
				value.password = Crypto.AES.encrypt(params.password, masterPassword);

				// add it to current passwords or overwrite existing
				data.passwords[params.key] = value;

				// try to safe passwords
				updatePasswordSafe(params.config, data.passwords);

				// refresh cache
				master[project] = masterPassword;
				passwordsCache[project] = data.passwords;
				masterHashCaches[project] = data.master;

				callback(null, "Credentials saved for key " + key + ".");
			});
		}
	},

	authenticate:{
		options: {
			params: {
				url: 'url',
				config: 'projectConfig'
			}
		},
		fn:function(err, params, callback) {
			if (err) return callback(err);
			// TODO call service to retrieve master password by user and decrypt password safe
			project = params.config.name;
			masterPassword = getMasterPasswordFromUser();

			return refreshPasswords(null, project, params.config.dir, function(err, data) {
				if (err) return callback(err);
				valid = bcrypt.compareSync(masterPassword, data.master);

				if (!valid) {
					return callback(new Error("Master password and hash not identical!"));
				}

				// refresh cache
				master[project] = masterPassword;
				passwordsCache[project] = data.passwords;
				masterHashCaches[project] = data.master;

				return callback(null, 'authenticated');
			});
		}
	}

};

// create service methods and start sweetp service (client)
methods = sweetp.createMethods(service, '/password/manager/');
client = sweetp.start(methods);

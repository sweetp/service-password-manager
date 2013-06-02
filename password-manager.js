var sweetp = require('sweetp-base');
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

var methods, client, salt, passwordsCache, master, getMasterPasswordFromUser,
    getDataPath, refreshPasswords, getDataFromFile, updatePasswordSafe,
    methodName;

// init
salt = bcrypt.genSaltSync(10);

// save master passwords in memory to de/encrypt passwords
master = {};

// cache loaded passwords from safe
passwordsCache = {};
masterHashCache = {};
lastFileRead = {};

// private helper functions for service methods

getMasterPasswordFromUser = function (url) {
	// TODO get it with service call
	// something like:  zenity --password --title "Enter password to unlock password safe of sweetp project NAME"
    // or build one service which uses java to show simple ui thingers, like a password dialog -> OS independant
	return "foobar";
};

getDataPath = function (dir) {
	return path.join(dir, ".sweetp", "passwordSafe.json");
};

refreshPasswords = function (err, project, dir, callback) {
    var dataPath;
	if (err) return callback(err);

	dataPath = getDataPath(dir);
    return fs.stat(dataPath, function (err, stats) {
        var useCache;
        if (err) return callback(err);

        if (lastFileRead[project] && lastFileRead[project] > stats.mtime) {
            useCache = true;
        } else {
            useCache = false;
        }

        if (passwordsCache[project] && masterHashCache[project] && useCache) {
            console.log("Return cached passwords.");
            return callback(null, {
                passwords:passwordsCache[project],
                master:masterHashCache[project]
            });
        }

        console.log("Read passwords from file and cache it.");
        return getDataFromFile(null, dir, function(err, data) {
            if (err) return callback(err);

            // refresh cache
            passwordsCache[project] = data.passwords;
            masterHashCache[project] = data.master;
            lastFileRead[project] = stats.mtime;

            return callback(null, data);
        });
    });
};

getDataFromFile = function (err, dir, callback) {
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
};

/**
 * Saves current passwords to disc.
 *
 * ATTENTION: you must make sure that your in memory data is up to date by
 * calling refreshPasswords before!
 */
updatePasswordSafe = function (dir, project, passwords) {
	var masterHash, masterPassword;
	masterPassword = master[project];
	masterHash = bcrypt.hashSync(masterPassword, salt);
	dataPath = getDataPath(dir);
	fs.writeFileSync(dataPath, JSON.stringify({master:masterHash, passwords:passwords}), 'utf-8');
};

// public service functions
service = {
	createSafe:{
		options: {
			params: {
				url: sweetp.PARAMETER_TYPES.url,
				config: sweetp.PARAMETER_TYPES.projectConfig
			},
			description: {
				summary:"Creates a password safe file in the '.sweetp/' directory of the project."
			},
            returns: "Success or error message."
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
				key: sweetp.PARAMETER_TYPES.one,
				config: sweetp.PARAMETER_TYPES.projectConfig
			},
			description: {
				summary:"Get user and password for 'key'."
			},
            returns: {
                username: "The username for the specified key.",
                password: "The password for the specified key."
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

				// get encrypted value
				encryptedValue = data.passwords[params.key];
				if (!encryptedValue) {
					return callback(new Error("No encrypted value found for key '" + params.key + "'!"));
				}

				// generate data object
				value = {};

				if (encryptedValue.username) {
					value.username = Crypto.AES.decrypt(encryptedValue.username, masterPassword);
				}

				if (encryptedValue.password) {
					value.password = Crypto.AES.decrypt(encryptedValue.password, masterPassword);
				}

				callback(null, value);
			});
		}
	},

	set:{
		options: {
			params: {
				key: sweetp.PARAMETER_TYPES.one,
				username: sweetp.PARAMETER_TYPES.one,
				password: sweetp.PARAMETER_TYPES.one,
				config: sweetp.PARAMETER_TYPES.projectConfig
			},
			description: {
				summary:"Set username and password for specified key in password database."
			},
            returns: "Success or error message."
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
				updatePasswordSafe(params.config.dir, project, data.passwords);

				callback(null, "Credentials saved for key " + params.key + ".");
			});
		}
	},

	authenticate:{
		options: {
			params: {
				url: sweetp.PARAMETER_TYPES.url,
				config: sweetp.PARAMETER_TYPES.projectConfig
			},
			description: {
				summary:"Authenticates user by prompting the password for the password safe of the project."
			},
            returns: "Success or error message."
		},
		fn:function(err, params, callback) {
			if (err) return callback(err);
			project = params.config.name;
			masterPassword = getMasterPasswordFromUser();

			return refreshPasswords(null, project, params.config.dir, function(err, data) {
				if (err) return callback(err);
				valid = bcrypt.compareSync(masterPassword, data.master);

				if (!valid) {
					return callback(new Error("Master password and hash not identical!"));
				}

				master[project] = masterPassword;

				return callback(null, 'Authenticated');
			});
		}
	}

};

// add config text to all methods
for (methodName in service) {
    if (service.hasOwnProperty(methodName)) {
        item = service[methodName];
        item.options.description.config = "No special config setting needed. To create a password safe, use the createSafe method of this service.";
    }
}

// create service methods and start sweetp service (client)
methods = sweetp.createMethods(service, '/password/manager/');
client = sweetp.start("password-manager", methods);

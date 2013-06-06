var sweetp = require('sweetp-base');
var http = require('http');
var urlHelper = require('url');
var querystring = require('querystring');
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
    methodName, getPasswortFromUser;

// init
salt = bcrypt.genSaltSync(10);

// save master passwords in memory to de/encrypt passwords
master = {};

// cache loaded passwords from safe
passwordsCache = {};
masterHashCache = {};
lastFileRead = {};

// private helper functions for service methods

getPasswortFromUser = function (url, title, message, callback) {
    var options;

    options = {};

    parsed = urlHelper.parse(url);
    options.hostname = parsed.hostname;
    options.port = parsed.port;
    options.protocol = parsed.protocol;
    options.path = "/services/noproject/ui/dialog/password";
    // add params
    options.path += "?" + querystring.stringify({
        title:title,
        message:message
    });

    options.headers = {
        'Accept':'application/json'
    };

    http.get(options, function(res) {
        var data = '';

        res.on('data', function (chunk) {
            data += chunk;
        });

        res.on('end', function () {
            console.log("Got response: " + res.statusCode);
            if (res.statusCode !== 200) {
                return callback("Got response: " + res.statusCode + " Data: " + data);
            }

            // parse json
            console.log(data);
            json = JSON.parse(data);
            callback(null, json.service);
        });
    }).on('error', function(e) {
        console.log("Got error: " + e.message);
        callback(e.message);
    });
};

getMasterPasswordFromUser = function (url, project, callback) {
    return getPasswortFromUser(url, "Sweetp password safe", "Insert master passwort for project: '" + project + "'", callback);
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
				url: sweetp.PARAMETER_TYPES.url,
				key: sweetp.PARAMETER_TYPES.one,
				username: sweetp.PARAMETER_TYPES.one,
				password: sweetp.PARAMETER_TYPES.one,
				config: sweetp.PARAMETER_TYPES.projectConfig
			},
			description: {
				summary:"Set username and password for specified key in password database.</br></br>" +
                    "Parameter 'password' is optional. If not provided a simple dialog is spawned to get it. " +
                    "If called by a service, provide a UI to safely ask the user for its password. " +
                    "When called from the user directly, you can use the dialog."
			},
            returns: "Success or error message."
		},
		fn:function(err, params, callback) {
			var masterPassword, project, password, onPassword;

			if (err) return callback(err);

			project = params.config.name;
			masterPassword = master[project];
			if (!masterPassword) {
				return callback(new Error("Not authenticated, call authenticate service method to encrypt password safe for this project."));
			}

			if (!params.key) {
				return callback(new Error("No key given!"));
			}

			if (!params.username) {
				return callback(new Error("No username given!"));
			}

            onPassword = function (err, password) {
                if (err) return callback(err);

                refreshPasswords(null, params.config.name, params.config.dir, function(err, data) {
                    var value;

                    if (err) return callback(err);

                    // generate data object
                    value = {};
                    value.username = Crypto.AES.encrypt(params.username, masterPassword);
                    value.password = Crypto.AES.encrypt(password, masterPassword);

                    // add it to current passwords or overwrite existing
                    data.passwords[params.key] = value;

                    // try to safe passwords
                    updatePasswordSafe(params.config.dir, project, data.passwords);

                    callback(null, "Credentials saved for key " + params.key + ".");
                });
            };

            if (!params.password) {
                return getPasswortFromUser(params.url, "Sweetp password safe",
                    "Insert password for project '" + project + "' and key '" +
                    params.key + "':", onPassword);
            } else {
                return onPassword(null, params.password);
            }
		}
	},

	createSafe:{
		options: {
			params: {
				url: sweetp.PARAMETER_TYPES.url,
				masterPassword: sweetp.PARAMETER_TYPES.one,
				config: sweetp.PARAMETER_TYPES.projectConfig
			},
			description: {
				summary:"Creates a password safe file in the '.sweetp/' directory of the project.</br></br>" +
                    "Parameter 'masterPassword' is optional. If not provided a simple dialog is spawned to get it. " +
                    "If called by a service, provide a UI to safely ask the user for its password. " +
                    "When called from the user directly, you can use the dialog."
			},
            returns: "Success or error message."
		},
		fn:function(err, params, callback) {
            var onPassword;
			if (err) return callback(err);

            onPassword = function (err, masterPassword) {
                if (err) return callback(err);

                master[params.config.name] = masterPassword;
                updatePasswordSafe(params.config.dir, params.config.name, {});
                return callback(null, "Password safe created successfully.");
            };

            if (params.masterPassword) {
                onPassword(null, params.masterPassword);
            } else {
                return getMasterPasswordFromUser(params.url, params.config.name, onPassword);
            }
		}
	},

	authenticate:{
		options: {
			params: {
				url: sweetp.PARAMETER_TYPES.url,
				masterPassword: sweetp.PARAMETER_TYPES.one,
				config: sweetp.PARAMETER_TYPES.projectConfig
			},
			description: {
				summary:"Authenticates user by prompting the password for the password safe of the project.</br></br>" +
                    "Parameter 'masterPassword' is optional. If not provided a simple dialog is spawned to get it. " +
                    "If called by a service, provide a UI to safely ask the user for its password. " +
                    "When called from the user directly, you can use the dialog."
			},
            returns: "Success or error message."
		},
		fn:function(err, params, callback) {
            var onPassword;

			if (err) return callback(err);
			project = params.config.name;

            onPassword = function (err, masterPassword) {
                if (err) return callback(err);

                refreshPasswords(null, project, params.config.dir, function(err, data) {
                    if (err) return callback(err);
                    valid = bcrypt.compareSync(masterPassword, data.master);

                    if (!valid) {
                        return callback(new Error("Master password and hash not identical!"));
                    }

                    master[project] = masterPassword;

                    return callback(null, 'Authenticated');
                });
            };

            if (params.masterPassword) {
                onPassword(null, params.masterPassword);
            } else {
                return getMasterPasswordFromUser(params.url, params.config.name, onPassword);
            }
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

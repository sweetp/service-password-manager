var sys = require('util'),
    net = require('net');

/**
 * TODO add static strings for parameter types for service configuration
 */

exports.start = function (methodsObject, port, host) {
	return new Sweetp(methodsObject, port, host);
};

/**
 * TODO add DSL description
 */
exports.createMethods = function(service, baseUrl) {
	var methods, configs, methodName, item;

	configs = [];
	methods = {};
	for (methodName in service) {
		if (service.hasOwnProperty(methodName)) {
			config = service[methodName];

			if (!config.target) {
				config.target = baseUrl + methodName;
			}

			item = {};
			item[config.target] = config.options;
			item[config.target].method = methodName;

			configs.push(item);

			methods[methodName] = config.fn;
		}
	}

	methods.getConfig = function(err, params, callback) {
		if (err) return callback(err);
		return callback(null, configs);
	};

	return methods;
};

/**
 * TODO save in own class and require it
 */

function sendRepsonse (response, socket) {
	var message = JSON.stringify(response);
	console.log("------ send: " + message);
	socket.write(message + "\n");
	console.log("------ done");
}

function Sweetp(methodsObject, port, host) {
	this.methods = methodsObject;

	if (port === null || port === undefined) {
		port = process.env.PORT;
	}

	this.socket = net.createConnection(port, host, this.onConnect.bind(this));
	this.socket.on('data', this.onData.bind(this));
}

Sweetp.prototype.onConnect = function() {
	console.log('Connection with sweetp server established.');
};

Sweetp.prototype.onData = function(data) {
	console.log("Data recieved from server");

	try {
		return this.parseMessage(null, data, this.respond.bind(this));
	} catch (e) {
		return this.respond(e);
	}

};

Sweetp.prototype.parseMessage = function(err, data, callback) {
	var json;
	if (err) return callback(err);
	json = JSON.parse(data.toString());

	if (json.method === null || json.method === undefined ||
		typeof this.methods[json.method] !== 'function') {
		return callback(new Error("Missing method: " + json.method));
	}

	return this.methods[json.method].call(this.methods, null, json.params, callback);
};

Sweetp.prototype.respond = function(err, data) {
	var response;

	if (err && err.match && err.match(/^Missing method/)) {
		response = {
			status: 404,
			data: err
		};
	} else if (err) {
		console.error(err.message, err.stack);
		response = {
			status: 500,
			data: err.message
		};
	} else {
		response = {
			status: 200,
			data: data
		};
	}

	return sendRepsonse(response, this.socket);
};

/**
 * @public
 */
Sweetp.prototype.closeSocket = function() {
	this.socket.destroy();
};


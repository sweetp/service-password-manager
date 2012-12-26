var sys   = require('util'),
    net = require('net');

exports.start = function (methodsObject, port, host) {
	return new Sweetp(methodsObject, port, host);
};

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
	var response, message;

	try	{
		response = {
			status: 200,
			data: this.parseMessage(data)
		};
	} catch (e) {
		if (e && e.match && e.match(/^Missing method/)) {
			response = {
				status: 404,
				data: e
			};
		} else {
			response = {
				status: 500,
				data: e
			};
		}
	}

	message = JSON.stringify(response);
	console.log("------ send: " + message);
	this.socket.write(message + "\n");
	console.log("------ done");

};

Sweetp.prototype.parseMessage = function(data) {
	var json;
	json = JSON.parse(data.toString());

	if (json.method === null || json.method === undefined ||
		typeof this.methods[json.method] !== 'function') {
		throw "Missing method: " + json.method;
	}

	return this.methods[json.method].call(this.methods, json.params);
};

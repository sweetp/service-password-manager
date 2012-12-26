var sys   = require('util'),
    net = require('net');

exports.start = function (methodsObject, port, host) {
	return new Sweetp(methodsObject, port, host);
};

function Sweetp(methodsObject, port, host) {
	this.methods = methodsObject;
	var socket;

	if (port === null || port === undefined) {
		port = process.env.PORT;
	}

	socket = net.createConnection(port, host, this.onConnect);
	socket.on('data', this.onData);
}

Sweetp.prototype.onConnect = function() {
	console.log('Connection with sweetp server established.');
};

Sweetp.prototype.onData = function(data) {
	console.log('---' + data + '---');
};

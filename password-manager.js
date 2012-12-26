var sweetp = require('./lib/sweetp');

service = {
	getConfig:function() {
		var config = [{
			'/password/manager/get':{
				method:'get',
				params: {
					name: 'one'
				}
			}
		}];
		return config;
	},

	get:function(params) {
		return "test " + params.name;
	}
};

sweetp.start(service);

    // spawn command line command
/*
 *    var ls    = spawn('git', ['status']);
 *
 *    ls.stdout.on('data', function (data) {
 *        sys.print(data);
 *        con.write(data);
 *    });
 *
 *    ls.stderr.on('data', function (data) {
 *        sys.print('stderr: ' + data);
 *        con.write('stderr: ' + data);
 *    });
 *
 *    ls.on('exit', function (code) {
 *        console.log('child process exited with code ' + code);
 *        con.write('child process exited with code ' + code);
 *        con.destroy();
 *    });
 */


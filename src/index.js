'use strict';

const net = require('net');
const idGenerator = require('./id');
let logger = require('./logger');

const descrCmd = '__D';
const resultCmd = '__R';
const errorCmd = '__E';
const newLineCode = '\n'.charCodeAt(0);

function Coby(opts){
    this.options = opts || {
        logger
    }; // defaults

    logger = this.options.logger || logger;
    this.wrapper = {};
    this.description = {};
    this.callbacks = {};
	return this;
}

Coby.prototype.use = function(wrapper) {
    Object.assign(this.wrapper, wrapper);

    for(var p in wrapper){
        this.description[p] = {};
    }

    this.descrStr = command(descrCmd, this.description);
    return this;
};

Coby.prototype.connect = function(port, host, callback){
	if(!callback){
		callback = host;
		host = 'localhost';
	}

	var connection = net.createConnection(port, host);
	var self = this;

	connection.setKeepAlive(true);

	connection.on('connect', function(){
		connection.write(command(descrCmd));
	});

	var commandsCallback = function(cmd){
		if(cmd.command === resultCmd){
			if(self.callbacks[cmd.data.id]){
				self.callbacks[cmd.data.id].apply(this, cmd.data.args);
				delete self.callbacks[cmd.data.id];
			}
		}
		else if(cmd.command === errorCmd){
			if(self.callbacks[cmd.data.id]){
				self.callbacks[cmd.data.id].call(this, cmd.data.err);
				delete self.callbacks[cmd.data.id];
			}
		}
		else if(cmd.command === descrCmd){
			var remoteObj = {};

			for(var p in cmd.data){
				remoteObj[p] = getRemoteCallFunction(p, self.callbacks, connection);
			}

			callback(remoteObj, connection);
		}
	};

	var lengthObj = {
		bufferBytes: undefined,
		getLength: true,
		length: -1
	};

	connection.on('data', getOnDataFn(commandsCallback, lengthObj));
	connection.on('error', function(err){
		logger.error('CONNECTION_DAMN_ERROR', err);
	});

	connection.on('timeout', function(){
		logger.error('RPC connection timeout');
	});

	connection.on('end', function(){
		logger.error('RPC connection other side send end event');
	});
};

Coby.prototype.listen = function(){
	this.getServer();
	this.server.listen.apply(this.server, arguments);
};

Coby.prototype.getServer = function(){
	var self = this;

	var server = net.createServer(function(c) {
		var commandsCallback = function(cmd){
			if(cmd.command === descrCmd){
				c.write(self.descrStr);
			}
			else if(!self.wrapper[cmd.command]){
				c.write(command('error', {code: 'UNKNOWN_COMMAND'}));
			}
			else {
				var args = cmd.data.args;
				args.push(getSendCommandBackFunction(c, cmd.data.id));

				try{
					self.wrapper[cmd.command].apply({}, args);
				}
				catch(err){
					logger.error(err);

					var resultCommand = command(errorCmd, {id: cmd.data.id, err: err});
					c.write(resultCommand);
				}
			}
		};

		var lengthObj = {
			bufferBytes: undefined,
			getLength: true,
			length: -1
		};

		c.on('data', getOnDataFn(commandsCallback, lengthObj));

		c.on('error', function(exception){
			logger.error(exception);
		});
	});

	this.server = server;
	return server;
};

Coby.prototype.close = function(){
	this.server.close();
};

Coby.connect = function(){
	var rpc = new Coby();
	return rpc.connect.apply(rpc, arguments);
};

function command(name, data){
	var cmd = {
		command: name,
		data: data
	};

	var cmdStr = JSON.stringify(cmd);
	return Buffer.byteLength(cmdStr) + '\n' + cmdStr;
}

function getOnDataFn(commandsCallback, lengthObj){
	return function(data){
		if(lengthObj.bufferBytes && lengthObj.bufferBytes.length > 0){
			var tmpBuff = new Buffer(lengthObj.bufferBytes.length + data.length);

			lengthObj.bufferBytes.copy(tmpBuff, 0);
			data.copy(tmpBuff, lengthObj.bufferBytes.length);

			lengthObj.bufferBytes = tmpBuff;
		} else {
			lengthObj.bufferBytes = data;
		}

		var commands = getComands.call(lengthObj);
		commands.forEach(commandsCallback);
	};
}

function getRemoteCallFunction(cmdName, callbacks, connection){
	return function(){
		var id = idGenerator();

		if(typeof arguments[arguments.length - 1] === 'function'){
			callbacks[id] = arguments[arguments.length - 1];
		}

		var args = [];
		for(var ai = 0, al = arguments.length; ai < al; ++ai){
			if(typeof arguments[ai] !== 'function'){
				args.push(arguments[ai]);
			}
		}

		var newCmd = command(cmdName, {id, args});
		connection.write(newCmd);
	};
}

function getSendCommandBackFunction(connection, cmdId){
	return function(){
		var innerArgs = [];

		for(var ai = 0, al = arguments.length; ai < al; ++ai){
			if(typeof arguments[ai] !== 'function'){
				innerArgs.push(arguments[ai]);
			}
		}

		var resultCommand = command(resultCmd, {id: cmdId, args: innerArgs});
		connection.write(resultCommand);
	};
}

function getComands(){
	var commands = [];
	var i = -1;

	var parseCommands = function(){
		if(this.getLength === true){
			i = getNewlineIndex(this.bufferBytes);
			if(i > -1){
				this.length = Number(this.bufferBytes.slice(0, i).toString());
				this.getLength = false;
				// (i + 1) for \n symbol
				this.bufferBytes = clearBuffer(this.bufferBytes, i + 1);
			}
		}

		if(this.bufferBytes && this.bufferBytes.length >= this.length){
			var cmd = this.bufferBytes.slice(0, this.length).toString();
			this.getLength = true;

			try{
				var parsedCmd = JSON.parse(cmd);
			}
			catch(e){
				logger.error('ERROR PARSE');
				logger.error(cmd);
				logger.error(this.length, this.bufferBytes.toString());
				return;
			}

			commands.push(parsedCmd);
			this.bufferBytes = clearBuffer(this.bufferBytes, this.length);

			if(this.bufferBytes && this.bufferBytes.length > 0){
				parseCommands.call(this);
			}
		}
	};

	parseCommands.call(this);
	return commands;
}

function getNewlineIndex(buffer){
	if(buffer){
		for(var i = 0, l = buffer.length; i < l; ++i){
			if(buffer[i] === newLineCode){
				return i;
			}
		}
	}

	return -1;
}

function clearBuffer(buffer, length){
	if(buffer.length > length){
		return buffer.slice(length);
	}

	return undefined;
}

module.exports = Coby;

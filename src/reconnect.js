/*
 * Created by Henry Leu (henryleu@126.com) on 2017/12/29
 */

var net = require('net');
var events = require('events');
var util = require('util');

// toNumber isPipeName and normalizeConnectArgs all lifted directly from
// node source code.
// https://github.com/joyent/node/blob/v0.10.32/lib/net.js
function toNumber(x) {
    return (x = Number(x)) >= 0 ? x : false;
}

function isPipeName(s) {
    return typeof s === 'string' && toNumber(s) === false;
}

// Returns an array [options] or [options, cb]
// It is the same as the argument of Socket.prototype.connect().
function normalizeConnectArgs(args) {
    var options = {};
    if (typeof args[0] === 'object') {
        // connect(options, [cb])
        options = args[0];
    } else if (isPipeName(args[0])) {
        // connect(path, [cb]);
        options.path = args[0];
    } else {
        // connect(port, [host], [cb])
        options.port = args[0];
        if (typeof args[1] === 'string') {
            options.host = args[1];
        }
    }
    var cb = args[args.length - 1];
    return (typeof cb === 'function') ? [options, cb] : [options];
}

// DurableConnection provides a socket connection that automatically reconnects
// if the connection is lost.
//
// Takes the same arguments as net.connect or net.createConnection.
// http://nodejs.org/api/net.html
//
// We are essentially a thin wrapper around socket. We wrap all the socket
// events, 'close', 'error', etc. You should register handlers on
// DurableConnection not on DurableConnection.socket. Otherwise your handlers
// will be lost when we reconnect and have a new socket.
function DurableConnection() {
    if (!(this instanceof DurableConnection)) {
        return new DurableConnection();
    }
    // public
    this.socket = null;
    this.reconnectMillis = 1000;
    this.maxReconnectMillis = Number.MAX_SAFE_INTEGER;
    this._reconnectTimes = 0;
    this.log = function log() {
        var args = Array.prototype.slice.call(arguments);
        args.unshift('DurableConnection');
        console.log.apply(null, args);
    };
    this._normalizedArgs = normalizeConnectArgs(arguments);
    this._reconnectTimeout = null;
    this._closeRequested = false;
    this._backoffReconnect = this.reconnectMillis;
}

util.inherits(DurableConnection, events.EventEmitter);

DurableConnection.prototype.close = function close() {
    var me = this;
    me.log('closing', me._normalizedArgs);
    me._reconnectTimeout && clearTimeout(me._reconnectTimeout);
    me._closeRequested = true;
    me.socket && me.socket.end();
};

DurableConnection.prototype._reconnect = function _reconnect() {
    var me = this;
    me.socket = null;
    if (!me._reconnectTimeout && !me._closeRequested) {
        me._reconnectTimeout = setTimeout(me.connect.bind(me), me._backoffReconnect);
        me._backoffReconnect = me._backoffReconnect * 1.1;
        if (me._backoffReconnect > me.maxReconnectMillis) {
            me._backoffReconnect = me.maxReconnectMillis;
        }
    }
};

DurableConnection.prototype.connect = function connect() {
    var me = this;
    me._reconnectTimeout = null;
    me.log('connect', me._normalizedArgs, me._backoffReconnect);
    if (me._closeRequested || me.socket) {
        me.log('connect aborted', '_closeRequested =', me._closeRequested, 'socket =', me.socket);
        return;
    }
    me.socket = net.connect(me._normalizedArgs[0]);
    me.socket.on('connect', function() {
        // add connect callback here rather than on the socket otherwise would
        // get lost when we reconnect.
        if (me._normalizedArgs.length === 2) {
            me._normalizedArgs[1]();
        }
        me._backoffReconnect = me.reconnectMillis;
        me.emit('connect');
        me._reconnectTimes++ && me.emit('reconnect', me._reconnectTimes-1);
    });
    me.socket.on('data', function(buf) {
        me.emit('data', buf);
    });
    me.socket.on('end', function() {
        me.emit('end');
        me._reconnect();
    });
    me.socket.on('timeout', function() {
        me.emit('timeout');
    });
    me.socket.on('drain', function() {
        me.emit('drain');
    });
    me.socket.on('error', function(err) {
        me.emit('error', err);
    });
    me.socket.on('close', function(hadError) {
        me.emit('close', hadError);
        me._reconnect();
    });
    return me.socket;
};

module.exports = DurableConnection;

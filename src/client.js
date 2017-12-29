/*
 * Created by Henry Leu (henryleu@126.com) on 2017/11/3
 */
const util = require('util');
const Coby = require('./coby');
const lg = require('./logger');

const Client = function (options) {
    this._options = options || {};
    const logger = this._options.logger || lg;
    this.coby = new Coby({ logger });
}

Client.prototype.connect = function (cb) {
    if (cb) {
        this._connect(cb);
    } else {
        return new Promise((resolve) => this._connect(resolve));
    }
}

Client.prototype._connect = function (cb) {
    const port = this._options.port;
    const host = this._options.host;
    this.coby.connect(port, host, (remote) => {
        this._remote = remote;
        this._init();
        cb();
    });
}

Client.prototype._init = function () {
    for (let key in this._remote) {
        const names = key.split('.');
        const methodName = names.pop();
        let ctx = this;
        for (let name of names) {
            !ctx[name] && (ctx[name] = {});
            ctx = ctx[name];
        }
        ctx[methodName] = util.promisify(this._remote[key]);
    }
}

module.exports = Client;

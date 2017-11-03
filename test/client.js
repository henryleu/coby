var Coby = require("../src");
var Meter = require("./meter");
var PORT = 9981;
var HOST = 'localhost';
var TIMES = 100;

var add = function(method, ruler){
    ruler.start();
    method(3, 7).then(function(res){
        ruler.end();
        // console.log(res);
    }).catch(function (err) {
        ruler.end();
    })
};

var op = 'add';
var meter = new Meter(op, TIMES);
meter.init();

var client = new Coby.Client({port: PORT, host: HOST});
client.connect().then(function () {
    for (var i = 0; i < TIMES; i++) {
        add(client.add, meter.metrics[i]);
    }
});

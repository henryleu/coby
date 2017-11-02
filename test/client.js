var Coby = require("../src");
var Meter = require("./meter");
var PORT = 9981;
var HOST = 'localhost';
var TIMES = 100;

var call_multiply = function(remote, ruler){
    process.nextTick(function() {
        ruler.start();
        remote.multiply({x:3, y:7}, function(err, res){
            ruler.end();
        });
    })
};

var call_add = function(remote, ruler){
        ruler.start();
        remote.add(3, 7, function(err, res){
            ruler.end();
            // console.log(res);
        });
};

var op = 'multiply';
var meter = new Meter(op, TIMES);
meter.init();

Coby.connect(PORT, HOST, function(remote){
    console.log('light client is connected to ' + HOST + ':' + PORT);
    meter.start();
    // for(var i = 0; i < TIMES; i++){ call_multiply(remote, meter.metrics[i]); }
    for(var i = 0; i < TIMES; i++){ call_add(remote, meter.metrics[i]); }
});



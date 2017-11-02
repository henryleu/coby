/**
 * Created by henryleu on 11/2/17.
 */
var Coby = require("../src");
var operations = require("./operations");
var PORT = 9981;
var HOST = 'localhost';

var rpc = new Coby();
rpc.use({
    multiply: function(req, cb){
        operations.multiply(req.x, req.y, function(err, result){
            if (err) {
                cb(err);
            } else {
                cb(err, {result: result});
            }
        });
    },
    add: function (x, y, cb) {
        cb(null, x+y);
    }
});

rpc.listen(PORT, HOST, function(){
    console.log('coby server is listening on ' + HOST + ':' + PORT);
});

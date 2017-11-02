var Ruler =  require('./ruler');

var Meter = function(op, times){
    this.op = op;
    this.times = times;
    this.metrics = new Array(times);
    this.index = 0;
    this.counter = 0;
    this.startTime = 0;
    this.endTime = 0;
    this.restTime = 2000;
};

Meter.prototype.start = function(){
    this.startTime = new Date().getTime();
};

Meter.prototype.end = function(){
    if(!this.ended){
        this.ended = true;
        this.endTime = new Date().getTime();
        this.runTime = this.endTime - this.startTime;
        this.report();
    }
};

Meter.prototype.count = function(){
    var me = this;
    this.counter++;

    // if(!this.timeoutId && this.counter/this.times > 0.6){
    //     this.timeoutId = setTimeout(function(){ me.end(); }, this.restTime);
    // }

    if(this.counter>=this.times){
        this.end();
    }
};

Meter.prototype.newRuler = function(){
    if(this.index>=this.times){
        return null;
    }
    var ruler = new Ruler(this);
    this.metrics[this.index++] = ruler;
    return ruler;
};

Meter.prototype.init = function(){
    for(var i=0; i<this.times; i++){
        this.newRuler();
    }
};

Meter.prototype.report = function(){
    var total = 0;
    var counter = 0;
    var shortest = 9000000;
    var longest = 0;
    for(var i=0; i<this.times; i++){
        var r = this.metrics[i];
        if(r.rt){
            total += r.rt;
            counter++;
            shortest > r.rt && (shortest = r.rt);
            longest < r.rt && (longest = r.rt);
        }
        // console.log(r.rt + ' ms');
    }
    console.log(this.times + ' calls, ' + this.counter + ' responses');
    console.log('total last   rt: ' + this.runTime + ' ms');
    console.log('total amount rt: ' + total + ' ms');

    console.log('average      rt: ' + Math.round(total/counter) + ' ms');
    console.log('shortest     rt: ' + shortest + ' ms');
    console.log('longest      rt: ' + longest + ' ms');
};

module.exports = Meter;
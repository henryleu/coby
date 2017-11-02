var Ruler = function(meter){
    this.meter = meter;
};

Ruler.prototype.start = function(){
    this.st = new Date().getTime();
};

Ruler.prototype.end = function(){
    if(this.meter.ended) return;
    this.et = new Date().getTime();
    this.rt = this.et - this.st;
    this.meter.count();
};

module.exports = Ruler;
/*
 * Created by Henry Leu (henryleu@126.com) on 2017/11/2
 */
var idGenerator = function(a){
    return a ? (a ^ Math.random() * 16 >> a / 4).toString(16) : ([1e7] + -1e3 + -4e3 + -8e3 + -1e11).
    replace(/[018]/g, idGenerator);
};

module.exports = idGenerator;

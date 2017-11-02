/*
 * Created by Henry Leu (henryleu@126.com) on 2017/11/2
 */
const logger = {
    // e: function(){
    //     var args = new Array(arguments.length);
    //     for(var ai = 0, al = arguments.length; ai < al; ++ai){
    //         args[ai] = arguments[ai];
    //     }
    //
    //     console.log(args);
    // }
};

// logger.info = console.info.bind(console);
// logger.warn = console.warn.bind(console);
logger.error = console.error.bind(console);

module.exports = logger;

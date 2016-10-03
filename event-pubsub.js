'use strict';

let EventPubSub = require('./es6');
if(process.version[1]<5){
    EventPubSub = require('./es5');
}

module.exports=EventPubSub;

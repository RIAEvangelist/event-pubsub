'use strict';

let EventPubSub = require('./es5');
if(process.version[1]>4){
    EventPubSub = require('./es6');
}

module.exports=EventPubSub;

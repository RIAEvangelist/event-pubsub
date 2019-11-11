'use strict';

const semver = require('semver');

let EventPubSub = require('./es5');
if(semver.gt(process.versions.node, '5.0.0')){
    EventPubSub = require('./es6');
}

module.exports=EventPubSub;

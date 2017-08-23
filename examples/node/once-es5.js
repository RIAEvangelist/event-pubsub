'use strict';
// requireing 'event-pubsub' module will auto detect ES6/ES5 support
// so we will force it here incase you support ES6
// for example sake
var Events = require('../../es5.js');

var events=new Events;


/**********************************\
 *
 * Demonstrate once
 *
 * ********************************/
events.once(
   'test.once',
   (data)=>{
     console.log(`got data ${data} from .once`)
   }
);

events.on(
   'test.once',
   (data)=>{
     console.log(`got data ${data} from .on with true`)
   },
   true
);

/************************************\
 * emit events for testing
 * **********************************/

events.emit(
    'test.once',
    '-5 TESTING-'
);

events.emit(
    'test.once',
    '-5 NEVER SEE THIS-'
);

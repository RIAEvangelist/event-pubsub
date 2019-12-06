'use strict';
const Events = require('../../event-pubsub.js');

const events=new Events;

/**********************************\
 *
 * Demonstrate once
 *
 * ********************************/
events.once(
   'test.once',
   (data)=>{
     console.log(`got data ${data} from .once`);
   }
);

events.on(
   'test.once',
   function(data){
     console.log(`got data ${data} from .on with true`)
   },
   true
);

/************************************\
 * emit events for testing
 * **********************************/
events.emit(
    'test.once',
    '-TESTING-'
);

events.emit(
    'test.once',
    '-NEVER SEE THIS-'
);

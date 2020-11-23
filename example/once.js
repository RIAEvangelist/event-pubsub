//emulating path as if this was on a server
//allows us to use the same files for node and web
import EventPubSub from './node_modules/event-pubsub/index.js';

const events=new EventPubSub;

/**********************************\
 * Demonstrate once
 * ********************************/
events.once(
   'test.once',
   (data)=>console.log(`\nevents.once('test.once') was detected. List of Event arguments: "${data}"\n`)
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

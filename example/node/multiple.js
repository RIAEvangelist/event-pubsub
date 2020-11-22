//emulating path as if this was on a server
//allows us to use the same files for node and web
import EventPubSub from '../node_modules/event-pubsub/index.js';

/************************************\
 * instantiating myEvents scope
 * **********************************/
const myEvents=new EventPubSub();

/************************************\
 * instantiating myEvents2 scope
 * **********************************/
const yourEvents=new EventPubSub();


/********************\
 * binding myEvents 
 * ******************/ 
myEvents.on(
    'hello',
    function(data1,data2){
        console.log(`myEvents.on("hello") detected. List of the event arguments:\n "${data1}"\n`);
    }
);

/*****************************\
 * binding yourEvents events
 * ***************************/
yourEvents.on(
    'hello',
    function(data1,data2){
        console.log(`yourEvents.on("hello") detected. List of the event arguments:\n "${data1}"\n`);
    }
);


/************************************\
 * emit events for testing
 * **********************************/
myEvents.emit(
    'hello',
    'world'
);

yourEvents.emit(
    'hello',
    'is round'
);

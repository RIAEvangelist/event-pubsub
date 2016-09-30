const Events = new require('../../event-pubsub.js');

const events=new Events;

events.on(
    'hello',
    function(data){
        console.log('hello event recieved ', data);
    }
);

events.on(
    'hello',
    function(data){
        console.log('Second handler listening to hello event got',data);
        events.emit(
            'world',
            {
                type:'myObject',
                data:{
                    x:'YAY, Objects!'
                }
            }
        )
    }
);

events.on(
    'world',
    function(data){
        console.log('World event got',data);
        events.off('*','*');
        console.log('Removed all events');
    }
);

/**********************************\
 *
 * Demonstrate * event (on all events)
 * remove this for less verbose
 * example
 *
 * ********************************/
events.on(
    '*',
    function(type){
        console.log('Catch all detected event type of : ',type, '. List of all the sent arguments ',arguments);
    }
);

/************************************\
 * emit events for testing
 * **********************************/
events.emit(
    'hello',
    'world'
);

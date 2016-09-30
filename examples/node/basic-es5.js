const Events = require('../../es5.js');
const events = new Events;

events.on(
    'hello',
    function(data){
        console.log('hello event recieved ', data);
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
    '*',
    function(type){
        console.log('Catch all detected event type of : ',type, '. List of all the sent arguments ',arguments);
    }
);

 events.emit(
     'hello',
     'world'
 );

 events.emit(
     'hello',
     'again','and again'
 );

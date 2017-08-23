'use strict';
// requireing 'event-pubsub' module will auto detect ES6/ES5 support
// so we will force it here incase you support ES6
// for example sake
var ForceES5 = require('../../es5.js');
var events = new ForceES5;

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

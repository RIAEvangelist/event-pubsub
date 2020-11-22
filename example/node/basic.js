//emulating path as if this was on a server
//allows us to use the same files for node and web
import EventPubsub from '../node_modules/event-pubsub/index.js';

const events=new EventPubsub;

//do this for every event detected
events.on(
    '*',
    function(type,...args){
        console.log(
            `\n.on("*") detected "${type}" event.\n List of  the event arguments:\n `,
            ...args,
            '\n'
        );        
    }
);

//basic hello event
events.on(
    'hello',
    function(data1,data2){
        console.log(`.on("hello") detected. List of the event arguments:\n "${data1}",`, data2,'\n');

        events.reset();
        
        console.log('Removed all events\n');

        //test
        //you should not see these ever!
        events.emit(
            'hello',
            'You should not see this!'
        );
    }
);

//emit
events.emit(
    //event type
    'hello',
    //event data, this can be as many args as you want
    'world',
    {answer:42}
);
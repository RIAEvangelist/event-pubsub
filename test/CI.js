import VanillaTest from '../node_modules/vanilla-test/index.js';
import EventPubSub  from '../example/node_modules/event-pubsub/index.js';

const test=new VanillaTest;
const e=new EventPubSub;

//helper functions
const expectTypeErr=(err)=>{
    try{
        test.is.typeError(err);
    }catch(err){
        debug(err);;
        test.fail();
    }
    test.pass();
}

const debug=(err)=>{
    console.log(err);
}

//on
try{
    test.expects('.on should throw a TypeError if the type arg is not a string');    
    e.on(1,()=>{});
}catch(err){
    expectTypeErr(err);
}
test.fail();
test.done();


try{
    test.expects('.on should throw a TypeError if the handler arg is not a function');    
    e.on('test',1);
}catch(err){
    expectTypeErr(err);
}
test.fail();
test.done();


try{
    test.expects('.on should throw a TypeError if the once flag arg is not a boolean');    
    e.on('test',()=>{},1);
}catch(err){
    expectTypeErr(err);
}
test.fail();
test.done();

try{
    test.expects('.on(*,()=>{}) should add an even handler to the * handler array');    
    const handler = ()=>{};
    e.on('*',handler);
    const events=e.list[Symbol.for('event-pubsub-all')];
    test.is.array(events);
    test.compare(events[0],handler);
}catch(err){
    debug(err);
    test.fail();
}
test.pass();
test.done();


try{
    test.expects('.reset should remove all events from the .list');    
    e.reset();
    const events=e.list;
    test.is.object(events);
    test.is.undefined(events[Symbol.for('event-pubsub-all')]);
}catch(err){
    debug(err);
    test.fail();
}
test.pass();
test.done();


//off
try{
    test.expects('.off should throw a TypeError if the type arg is not a string');    
    e.off(1,()=>{});
}catch(err){
    expectTypeErr(err);
}
test.fail();
test.done();

try{
    test.expects('.off should not throw a TypeError if the handler arg is not a function, but the event type does not exist');    
    e.off('test',1);
}catch(err){
    debug(err);
    test.fail();
}
test.pass();
test.done();

try{
    test.expects('.off should throw a TypeError if the handler arg is not a function, and the event type exists');    
    
    const type='test';
    const handler=()=>{};
    e.on(type,handler)
    e.off('test',1);
}catch(err){
    expectTypeErr(err);
}
test.fail();
test.done();


try{
    test.expects('.off(test,*) clear the test event handler array');    
    
    const type='test';
    let events=e.list[type];
    test.is.function(events[0]);

    e.off(type,'*');
    
    events=e.list[type];
    test.is.undefined(events);

}catch(err){
    debug(err);
    test.fail();
}
test.pass();
test.done();


try{
    test.expects('.off(test,handler1) should remove handler1 from the test event handler array');    
    
    const type='test';
    const handler1=()=>{};
    const handler2=()=>{};

    e.on(type,handler1);
    e.on(type,handler2);
    
    const event=e.list[type];
    test.is.array(event);
    
    if(!event.includes(handler1)){
        test.fail();
    }

    e.off(type,handler1);
    
    if(event.includes(handler1)){
        test.fail();
    }

    if(!event.includes(handler2)){
        test.fail();
    }

    e.reset();
}catch(err){
    debug(err);
    test.fail();
}
test.pass();
test.done();


//once
try{
    test.expects('.once should throw a TypeError if the type arg is not a string');    
    e.once(1,()=>{});
}catch(err){
    expectTypeErr(err);
}
test.fail();
test.done();


try{
    test.expects('.once should throw a TypeError if the handler arg is not a function');    
    e.on('test',1);
}catch(err){
    expectTypeErr(err);
}
test.fail();
test.done();

try{
    test.expects('.once should mark the handler to be called only once');    
    const handler=()=>{};
    const type='test';
    e.once(type,handler);

    const onceSetting=handler[Symbol.for('event-pubsub-once')];

    test.is.boolean(onceSetting);

    if(!onceSetting){
        test.fail();
    }

    e.reset();
}catch(err){
    debug(err);
    test.fail();
}
test.pass();
test.done();


try{
    test.expects('.on should not mark the handler to be called only once');    
    const handler=()=>{};
    const type='test';
    e.on(type,handler);

    const onceSetting=handler[Symbol.for('event-pubsub-once')];

    test.is.boolean(onceSetting);
    
    if(onceSetting){
        test.fail();
    }

    e.reset();
}catch(err){
    debug(err);
    test.fail();
}
test.pass();
test.done();

//emit
try{
    test.expects('.emit should throw a TypeError if the type arg is not a string');    
    e.emit(1);
}catch(err){
    expectTypeErr(err);
}
test.fail();
test.done();


//event emitting tests
try{
    test.expects('emit should run all bound handler functions, and those handler function should recive the passed arguments');
    const type='test';
    //use an array as it is a refrence
    const count=[0];
    const finalCount=3;
    
    //handler1 adds 1 and handler2 adds 2 for a total of 3
    const handler1=(count)=>{
        try{
            test.is.array(count);
            count[0]+=1;
        }catch(err){
            test.fail();
        }
        return this;
    }

    const handler2=(count)=>{
        try{
            test.is.array(count);
            count[0]+=2;
        }catch(err){
            test.fail();
        }
        return this;
    }

    e.on(type,handler1);
    e.on(type,handler2);

    e.emit(type,count);

    //events are asnyc so chew on something for a moment
    test.delay(1000);

    test.compare(count,finalCount);

    e.reset();
}catch(err){
    debug(err);
    test.fail();
}
test.pass();
test.done();


try{
    test.expects('emitting an event bound with .once should remove the handler after it is run');    
    const type='test';

    //ensure no events for this type
    test.is.undefined(e.list[type]);

    //add event
    e.once(type,()=>{});

    //ensure type events array created
    test.is.array(e.list[type]);

    e.emit(type);

    //events are asnyc so chew on something for a moment
    test.delay(1000);

    test.is.undefined(e.list[type]);

    e.reset();
}catch(err){
    debug(err);
    test.fail();
}
test.pass();
test.done();

try{
    test.expects('emitting any event should run * event handlers');    
    const type='*';
    const runRef=[];
    const runRefLength=1;

    e.on(
        type,
        (renRef)=>{
            console.log(runRef)
            runRef.push(1)
        }
    );

    e.emit('rando.event',runRef);

    //events are asnyc so chew on something for a moment
    test.delay(1000);

    console.log(runRef);

    test.compare(runRef.length,runRefLength);

    e.reset();
}catch(err){
    debug(err);
    test.fail();
}
test.pass();
test.done();

test.report();

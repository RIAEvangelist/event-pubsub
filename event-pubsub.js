'use strict';

const emit=require('./members/#emit.js'),
    emit$=require('./members/#emit$.js'),
    off=require('./members/#off.js'),
    on=require('./members/#on.js'),
    once=require('./members/#once.js');

class EventPubSub {
    //locking down the interface for extension
    //making things protected vs private (hack 4 now)
    
    get publish(){return this.#emit};
    get trigger(){return this.#emit};
    get emit(){return this.#emit};

    get subscribe(){return this.#on};
    get on(){return this.#on};

    get unSubscribe(){return this.#off}; 
    get off(){return this.#off};

    get events(){return this.events};

    #events = {};
    
    #on = on;
    #once = once;

    #off = off;    

    #emit$=emit;
}

module.exports = EventPubSub;

'use strict';

class EventPubSub {
    publish = this.emit;
    trigger = this.emit;
    
    subscribe = this.on;
    unSubscribe = this.off; 

    #events = {};

    on( type, handler, once ) {
        if ( !handler ) {
            throw new ReferenceError( 'handler not defined.' );
        }

        console.log(this);

        if ( !this.#events[ type ] ) {
            this.#events[ type ] = [];
        }

        if(once){
            handler._once_ = once;
        }

        this.#events[ type ].push( handler );
    }

    once( type, handler ) {
        return this.on( type, handler, true );
    }

    off( type, handler ) {
        if ( !this.#events[ type ] ) {
            return;
        }

        if ( !handler ) {
            throw new ReferenceError( 'handler not defined. if you wish to remove all handlers from the event please pass "*" as the handler' );
        }

        if ( handler == '*' ) {
            delete this.#events[ type ];
            return;
        }

        const handlers = this.#events[ type ];

        while ( handlers.includes( handler ) ) {
            handlers.splice(
                handlers.indexOf( handler ),
                1
            );
        }

        if ( handlers.length < 1 ) {
            delete this.#events[ type ];
        }
    }

    emit( type, ...args ) {
        if ( !this.#events[ type ] ) {
            return this.emit$( type, ...args );
        }

        const handlers = this.#events[ type ];
        const onceHandled=[];

        for ( let handler of handlers ) {
            handler(...args);
            if(handler._once_){
              onceHandled.push(handler);
            }
        }

        for(let handler of onceHandled){
          this.off(type,handler);
        }

        return this.#emit$( type, ...args );
    }

    #emit$=( type, ...args )=>{
        if ( !this.#events[ '*' ] ) {
            return this;
        }
    
        const catchAll = this.#events[ '*' ];
    
        for ( let handler of catchAll ) {
            handler(type, ...args);
        }
    }
}

module.exports = EventPubSub;

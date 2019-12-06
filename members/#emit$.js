'use-strict';

function emit$( type, ...args ){
    if ( !this.events[ '*' ] ) {
        return;
    }

    const catchAll = this.events[ '*' ];

    for ( let handler of catchAll ) {
        handler(type, ...args);
    }

    return this;
}

module.exports=emit$;
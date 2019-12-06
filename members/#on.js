'use-strict';

function on( type, handler, once ) {
    if ( !handler ) {
        throw new ReferenceError( 'handler not defined.' );
    }

    if ( !this.events[ type ] ) {
        this.events[ type ] = [];
    }

    const handlers=this.events[ type ];
    const handlerPosition=handlers.length;

    this.events[ type ].push( 
        handler.bind(this)
    );

    handlers[handlerPosition]._once_ = once||false;

    return this;
}

module.exports = on;
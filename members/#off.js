'use-strict';

function off( type, handler ) {
    if ( !this.events[ type ] ) {
        return;
    }

    if ( !handler ) {
        throw new ReferenceError( 'handler not defined. if you wish to remove all handlers from the event please pass "*" as the handler' );
    }

    if ( handler == '*' ) {
        return delete this.events[ type ];
    }

    const handlers = this.events[ type ];

    while ( handlers.includes( handler ) ) {
        handlers.splice(
            handlers.indexOf( handler ),
            1
        );
    }

    if ( handlers.length < 1 ) {
        delete this.events[ type ];
    }

    return this;
}

module.exports=off;
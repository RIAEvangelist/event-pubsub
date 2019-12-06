'use-strict';

function once( type, handler ) {
    return this.on( type, handler, true );
}

module.exports=once;
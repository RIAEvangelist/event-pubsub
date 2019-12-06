'use-strict';

function emit( type, ...args ) {
    if ( !this.events[ type ] ) {
        return this.emit$( type, ...args );
    }

    const handlers = this.events[ type ];
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

    return this.emit$( type, ...args );
}

module.exports=emit;
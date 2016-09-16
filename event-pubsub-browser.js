window.pubsub=(
    function(){

        function sub(type,handler){
            if(!handler){
                var err=new ReferenceError('handler not defined');
                throw(err);
            }

            checkScope.apply(this);

            if(!this._events_[type])
                this._events_[type]=[];

            this._events_[type].push(handler);
        }

        function unsub(type,handler){
            if(!handler){
                var err=new ReferenceError('handler not defined. if you wish to remove all handlers from the event please pass "*" as the handler');
                throw err;
            }
            checkScope.apply(this);


            if(type=='*'){
                if(handler=='*'){
                    delete this._events_;
                }
                else{
                    for(var t in this._events_){
                        removeHandlers.apply(this, [t, handler]);
                    }
                }
            }
            else{
                if(handler=='*')
                    delete this._events_[type];
                else
                    removeHandlers.apply(this, [type, handler]);
            }
        }

        function removeHandlers(type, handler){
            var events = this._events_[type],
                i = events.length-1;
            while (i >= 0){
                if(events[i]==handler) events.splice(i,1);
                else i--;
            }
            if(events.length<1){
                delete this._events_[type];
            }
        }

        function pub(type){
            checkScope.apply(this);

            if(this._events_['*'] && type!='*'){
                var params=Array.prototype.slice.call(arguments);
                params.unshift('*');
                this.trigger.apply(this,params);
            }

            if(!this._events_[type])
                return;

            for(var i=0,
                    events=this._events_[type],
                    count=events.length,
                    args=Array.prototype.slice.call(arguments,1);
            i<count;
            i++){
                events[i].apply(this, args);
            }
        }

        function checkScope(){
            if(!this._events_)
                this._events_={};
        }

        function init(scope){
            if(!scope)
                return {
                    on:sub,
                    off:unsub,
                    trigger:pub
                };

            scope.on=(
                function(scope){
                    return function(){
                        sub.apply(
                            scope,
                            Array.prototype.slice.call(arguments)
                        );
                    }
                }
            )(scope);

            scope.off=(
                function(scope){
                    return function(){
                        unsub.apply(
                            scope,
                            Array.prototype.slice.call(arguments)
                        );
                    }
                }
            )(scope);

            scope.trigger=(
                function(scope){
                    return function(){
                        pub.apply(
                            scope,
                            Array.prototype.slice.call(arguments)
                        );
                    }
                }
            )(scope);

            scope._events_={};
        }

        return init;

    }
)();

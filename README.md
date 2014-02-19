Event PubSub
============

Pubsub events for Node and the browser allowing event scoping and multiple scopes. 
Easy for any developer level. No frills, just high speed pubsub events!

---
### Basic Example
---
***NOTE - the only diffeence between node and browser code is how the ``events`` variable is created***  
* node ``var events = new require('../../event-pubsub.js')();``
* browser ``var events = new window.pubsub();``

#### Node

    var events = new require('../../event-pubsub.js')();

    events.on(
        'hello',
        function(data){
            console.log('hello event recieved ', data);
        }
    );
    
    events.on(
        '*',
        function(type){
            console.log('Catch all detected event type of : ',type, '. List of all the sent arguments ',arguments);
        }
    );
    
    /************************************\
     * trigger events for testing
     * **********************************/
    events.trigger(
        'hello',
        'world'
    );

#### Browser
##### HTML

    <!DOCTYPE html>
    <html>
        <head>
            <title>PubSub Example</title>
            <script src='../../event-pubsub-browser.js'></script>
            <script src='yourAmazingCode.js'></script>
        </head>
        <body>
            ...
        </body>
    </html>

##### Inside Your Amazing Code

    var events = new window.pubsub();

    events.on(
        'hello',
        function(data){
            console.log('hello event recieved ', data);
        }
    );
    
    events.on(
        '*',
        function(type){
            console.log('Catch all detected event type of : ',type, '. List of all the sent arguments ',arguments);
        }
    );
    
    /************************************\
     * trigger events for testing
     * **********************************/
    events.trigger(
        'hello',
        'world'
    );

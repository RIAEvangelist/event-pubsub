# Event PubSub

`npm install event-pubsub`

npm info :  [See npm trends and stats for event-pubsub](http://npm-stat.com/charts.html?package=event-pubsub&author=&from=&to=)   

![event-pubsub npm version](https://img.shields.io/npm/v/event-pubsub.svg) ![total npm downloads for event-pubsub](https://img.shields.io/npm/dt/event-pubsub.svg) ![monthly npm downloads for event-pubsub](https://img.shields.io/npm/dm/event-pubsub.svg)

GitHub info :  
![event-pubsub GitHub Release](https://img.shields.io/github/release/RIAEvangelist/event-pubsub.svg) ![GitHub license event-pubsub license](https://img.shields.io/github/license/RIAEvangelist/event-pubsub.svg) ![open issues for event-pubsub on GitHub](https://img.shields.io/github/issues/RIAEvangelist/event-pubsub.svg)

Build Info :  
Travis CI (linux,windows & Mac) : [![Build Status](https://travis-ci.org/RIAEvangelist/event-pubsub.svg?branch=main)](https://travis-ci.org/RIAEvangelist/event-pubsub)

***Super light and fast*** Extensible ES6+ event system for Node and the browser the same files that work in node will work in the browser without any modifications. If you must support old browsers you can transpile the module.

# Methods

|Method|Arguments|Description|
|------|---------|-----------|
|on|type:`string`, handler:`function`, once:`boolean`|will bind the `handler` function to the the `type` event. Just like `addEventListener` in the browser. If once is set to true the hander will be removed after being called once.|
|once|type:`string`, handler:`function`| will bind the `handler` function to the the `type` event and unbind it after ***one*** execution. Just like `addEventListener` in the browser withe the `once` option set|
|off|type/`*`:`string`, handler/`*`:`function`|will ***un***bind the `handler` function from the the `type` event. If the `handler` is `*`, all handlers for the event type will be removed.   Just like `removeEventListener` in the browser, but also can remove all event handlers for the type.|
|emit|type:`string`, `...data` arguments|will call all `handler` functions bound to the `*` event and the `type` event. It will pass all `...data arguments` to those handlers, for `*` events, the first arg will be the `type` you can filter the events|
|reset||Removes all events of any and all types including `*`|

# Members

|Member|Type|Description|
|------|----|-----------|
|.list |Object|List representation of all the bound events, primarily used for visibility. |

# The ` * ` event type

The ` * ` event type will be triggered by ***any `emit`***. These also run first. The handlers for `*` should expect the first arg to be the `type` and all args after that to be data arguments.

## Local website

`npm start` actually starts a [node-http-server](https://github.com/RIAEvangelist/node-http-server). So if you just want quick links to the example and test web pages, there is a page in the root of this module with links. You can access it by going to the [local homepage](http://localhost:8000) : http://localhost:8000

Provided your router and firewall are not blocking your IP/ports, you can also go to `http://[your-ip-here]:8000/` on any device including your mobile device provided it is on the same network.


## Basic Examples

```javascript

//relative paths will let your code work in both node and the browser without transpiling unless you want to.
import EventPubSub from './node_modules/event-pubsub/index.js';

events=new EventPubSub

events.on(
    'hello',
    (data)=>{
        console.log('hello event recieved ', data);
    }
);

events.emit(
    'hello',
    'world'
);

```

#### Basic Chaining

```javascript

events.on(
    'hello',
    someFunction
).on(
    'goodbye',
    anotherFunction
).emit(
    'hello',
    'world'
);

events.emit(
    'goodbye',
    'humans'
).off(
    'hello',
    '*'
);

```

### Basic Event Emitter and/or Extending Event PubSub

```javascript
//relative paths will let your code work in both node and the browser!
import EventPubSub from './node_modules/event-pubsub/index.js';


class Book extends EventPubSub{
    constructor(){
        super();
        //now Book has .on, .off, and .emit

        this.words=[];
    }

    add(...words){
        this.words.push(...words);
        this.emit(
            'added',
            ...words
        );
    }

    read(){
        this.emit(
            'reading'
        );
        console.log(this.words.join(' '));
    }
}

const book=new Book;

book.on(
    'added',
    function(...words){
        console.log('words added : ',words);
        this.read();
    }
);

book.add(
    'once','upon','a','time','in','a','cubicle'
);


```

## Strong Type Checking
`event-pubsub` uses the `strong-type` class which provides methods to test ***all*** the built in js primatives, objects, classes, and even fancy things like async functions and generators. This should help make sure your code doesn't do unexpected things.

[full strong-type documentation](https://github.com/RIAEvangelist/strong-type)


#### For node
Since we use the same files for node and the browser, we need to emulate a production `npm i event-pubsub` in the example folder, so be sure to :  

first run `npm run emulate`

then run any of the following examples

`node ./example/basic.js`  
`node ./example/miltiple.js`  
`node ./example/extending.js`  
`node ./example/once.js`  

![node event-pubsub basic example](https://raw.githubusercontent.com/RIAEvangelist/event-pubsub/master/example/img/node-event-pubsub-es6.PNG)


#### For the browser
run `npm start` this will automatically run `npm run emulate` for you as well. 

Then just go to the [local server](http://localhost:8000) : http://localhost:8000 from here you can see both the examples and the tests. Or go directly to [the local example](http://localhost:8000/example/index.html) : http://localhost:8000/example/. It actually imports the node example into the browser and runs it, same exact file, no transpiling or custom code for the browser. If you want to transpile though, you can. 

#### Chrome
![Chrome event-pubsub basic example](https://raw.githubusercontent.com/RIAEvangelist/event-pubsub/master/example/img/chrome-event-pubsub-es6.PNG)

#### Edge
![Edge event-pubsub basic example](https://raw.githubusercontent.com/RIAEvangelist/event-pubsub/master/example/img/edge-event-pubsub-es6.PNG)

#### FireFox Nightly
As of 11/22/2020 FF still does not support private fields or methods in js classes, however, the nightly build has it included behind a flag. With the private field and method flags set to true, FireFox nightly works like a charm.

![FireFox-nightly event-pubsub basic example](https://raw.githubusercontent.com/RIAEvangelist/event-pubsub/master/example/img/FireFox-nightly-event-pubsub-es6.PNG)
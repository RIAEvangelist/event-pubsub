'use strict';
const Events = require('../../event-pubsub.js');

class Book extends Events{
    words=[];

    constructor(){
        super();
        //now Book has full event pubsub functionality like .on, .off, .emit etc.
    }

    add(...words){
        this.words.push(...words);
        this.emit(
            'added',
            ...words
        );
    }

    erase(count){
        const words=this.words.splice(
            -count
        );
        this.emit(
            'erased',
            ...words
        )
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
        console.log(this);
        this.read();
    }
);

book.on(
    'erased',
    function(...words){
        console.log('words erased : ',words);
        this.read();
    }
);

book.on(
    'reading',
    function(...words){
        console.log('reading book...');
    }
);

book.add(
    'once','upon','a','time','in','a','cubicle'
);

book.erase(1);

book.add(
    'land','far','far','away'
);

console.log('book final copy reads :');
book.read();

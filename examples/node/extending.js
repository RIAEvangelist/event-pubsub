const Events = require('../../event-pubsub.js');

class Book extends Events{
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

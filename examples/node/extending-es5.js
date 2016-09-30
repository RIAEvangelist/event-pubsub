const Events = require('../../es5.js');

function Book(){
    //extend happens below
    Object.assign(this,new Events);
    //now Book has .on, .off, and .trigger

    this.words=[];
    this.add=add;
    this.erase=erase;
    this.read=read;

    function add(){
        arguments.slice=Array.prototype.slice;

        this.words=this.words.concat(
            arguments.slice()
        );

        this.trigger(
            'added',
            arguments.slice()
        );
    }

    function erase(count){
        const words=this.words.splice(
            -count
        );
        this.trigger(
            'erased',
            words
        )
    }

    function read(){
        this.trigger(
            'reading'
        );
        console.log(this.words.join(' '));
    }

    return this;
};

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

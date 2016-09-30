function Book(){
    //extend happens below
    Object.assign(this,new window.EventPubSub);
    //now Book has .on, .off, and .emit

    this.words=[];
    this.add=add;
    this.erase=erase;
    this.read=read;

    function add(){
        arguments.slice=Array.prototype.slice;

        this.words=this.words.concat(
            arguments.slice()
        );
        this.emit(
            'added',
            arguments.slice()
        );
    }

    function erase(count){
        const words=this.words.splice(
            -count
        );
        this.emit(
            'erased',
            words
        )
    }

    function read(){
        this.emit(
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

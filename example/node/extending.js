//emulating path as if this was on a server
//allows us to use the same files for node and web
import EventPubSub from '../node_modules/event-pubsub/index.js';

class Book extends EventPubSub{
    add(...words){
        this.words.push(...words);
        
        this.emit(
            'added',
            ...words
        );

        //allow chaining
        return this;
    }

    erase(count){
        const words=this.words.splice(
            -count
        );

        this.emit(
            'erased',
            ...words
        );

        //allow chaining
        return this;
    }

    read(){
        this.emit(
            'reading',
            this.words.join(' ')
        );

        //allow chaining
        return this;
    }

    get words(){
        return this.#words;
    }

    reset(){
        super.reset();
        this.#words=[];
    }

    #words=[];
}

const book=new Book;

book.on(
    'added',
    function(...words){
        console.log('words added : ',words);
        book.read();
    }
);

//chaining example
book.on(
    'erased',
    function(...words){
        console.log('words erased : ',words);
        book.read();
    }
).on(
    'reading',
    function(words){
        console.log(`reading book...\n ${words}\n`);
    }
)

book.add(
    'once','upon','a','time','in','a','cubicle'
);

//more chaining
book.erase(1)
    .add(
        'land','far','far','away'
    );

console.log('\nResetting Book :\n');

book.reset();

console.log(`Books contents after being reset are : "${book.words}"\n\n`);

//You should never see this event!
//all events it was removed from book.reset()
book.read();

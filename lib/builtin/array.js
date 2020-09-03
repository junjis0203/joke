import { JokeObject, JokeFunction, JokeNativeMethod } from '../object.js';

const Iterator_next = new JokeNativeMethod(
    thisValue => {
        const array = thisValue.getProperty('array');
        const ptr   = thisValue.getProperty('ptr');

        const result = new JokeObject();
        const done  = ptr >= array.getProperty('length');
        const value = array.getProperty(ptr);
        result.setProperty('done',  done);
        result.setProperty('value', value);

        thisValue.setProperty('ptr', ptr + 1);
        return result;
    }
);

class JokeArrayIterator extends JokeObject {
    constructor(array) {
        super();

        this.setProperty('array', array);
        this.setProperty('ptr',   0);

        this.setProperty('next', Iterator_next);
    }
}

const Array_iterator = new JokeNativeMethod(
    thisValue => {
        return new JokeArrayIterator(thisValue);
    }
);

const Array_push = new JokeNativeMethod(
    (thisValue, ...args) => {
        let length = thisValue.getProperty('length');
        for (let i = 0; i < args.length; i++) {
            thisValue.setProperty(length++, args[i]);
        }
        thisValue.setProperty('length', length);
        return length;
    }
);

const Array_pop = new JokeNativeMethod(
    thisValue => {
        const length = thisValue.getProperty('length');
        const value  = thisValue.getProperty(length - 1);
        thisValue.setProperty(length - 1, undefined);
        thisValue.setProperty('length', length - 1);
        return value;
    }
);

const Array_unshift = new JokeNativeMethod(
    (thisValue, ...args) => {
        const length = thisValue.getProperty('length');
        for (let i = length + args.length - 1; i >= length; i--) {
            thisValue.setProperty(i, thisValue.getProperty(i - args.length));
        }
        for (let i = 0; i < args.length; i++) {
            thisValue.setProperty(i, args[i]);
        }
        thisValue.setProperty('length', length + args.length);
        return length + args.length;
    }
);

const Array_shift = new JokeNativeMethod(
    thisValue => {
        const length = thisValue.getProperty('length');
        const value  = thisValue.getProperty(0);
        for (let i = length - 1; i >= 1; i--) {
            thisValue.setProperty(i - 1, thisValue.getProperty(i));
        }
        thisValue.setProperty(length - 1, undefined);
        thisValue.setProperty('length', length - 1);
        return value;
    }
);

export const JokeArray = new JokeFunction();
{
    const prototype = JokeArray.getProperty('prototype');
    prototype.setProperty('length', 0);

    prototype.setProperty(Symbol.iterator, Array_iterator);
    prototype.setProperty('push', Array_push);
    prototype.setProperty('pop', Array_pop);
    prototype.setProperty('unshift', Array_unshift);
    prototype.setProperty('shift', Array_shift);
}

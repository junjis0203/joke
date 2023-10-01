import { JokeObject, JokeFunction, JokeNativeMethod } from '../object.js';

const Iterator_next = new JokeNativeMethod(
    (context, thisValue) => {
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
    (context, thisValue) => {
        return new JokeArrayIterator(thisValue);
    }
);

const Array_push = new JokeNativeMethod(
    (context, thisValue, ...args) => {
        let length = thisValue.getProperty('length');
        for (let i = 0; i < args.length; i++) {
            thisValue.setProperty(length++, args[i]);
        }
        thisValue.setProperty('length', length);
        return length;
    }
);

const Array_pop = new JokeNativeMethod(
    (context, thisValue) => {
        const length = thisValue.getProperty('length');
        const value  = thisValue.getProperty(length - 1);
        thisValue.setProperty(length - 1, undefined);
        thisValue.setProperty('length', length - 1);
        return value;
    }
);

const Array_unshift = new JokeNativeMethod(
    (context, thisValue, ...args) => {
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
    (context, thisValue) => {
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

const Array_reverse = new JokeNativeMethod(
    (context, thisValue) => {
        const length = thisValue.getProperty('length');
        for (let i = 0; i < length / 2; i++) {
            const r = thisValue.getProperty(length - i - 1);
            const f = thisValue.getProperty(i);
            thisValue.setProperty(i, r);
            thisValue.setProperty(length - i - 1, f);
        }
        return thisValue;
    }
);

const Array_sort = new JokeNativeMethod(
    (context, thisValue, compareFunction) => {
        // TODO: compareFunction is not provided
        // TODO: consider undefined
        const length = thisValue.getProperty('length');
        for (let i = 0; i < length - 1; i++) {
            let minValue = thisValue.getProperty(i);
            let minIndex = i;
            for (let j = i + 1; j < length; j++) {
                const a = thisValue.getProperty(j);
                if (compareFunction.call(context, minValue, a).value > 0) {
                    minValue = a;
                    minIndex = j;
                }
            }
            if (minIndex != i) {
                const a = thisValue.getProperty(i);
                const b = thisValue.getProperty(minIndex);
                thisValue.setProperty(i, b);
                thisValue.setProperty(minIndex, a);
            }
        }
        return thisValue;
    }
)

const Array_splice = new JokeNativeMethod(
    (context, thisValue, start, deleteCount, ...items) => {
        let length = thisValue.getProperty('length');

        if (start > length) {
            start = length;
        }
        if (start < 0) {
            start = length + start;
            if (start < 0) {
                start = 0;
            }
        }

        const deletedElems = JokeArray.newInstance();
        if (deleteCount > 0) {
            for (let i = 0; i < deleteCount; i++) {
                const deleted = thisValue.getProperty(start + i);
                deletedElems.setProperty(i, deleted);
                thisValue.setProperty(start + i, thisValue.getProperty(start + i + 1));
            }
            length -= deleteCount;
            deletedElems.setProperty('length', deleteCount);
        }

        for (let i = 0; i < items.length; i++) {
            // move to new position
            if (start + i < length) {
                thisValue.setProperty(start + i + items.length, thisValue.getProperty(start + i));
            }
            // insert
            thisValue.setProperty(start + i, items[i]);
        }
        length += items.length;

        thisValue.setProperty('length', length);

        return deletedElems;
    }
);

const Array_includes = new JokeNativeMethod(
    (context, thisValue, valueToFind, fromIndex=0) => {
        return thisValue.invoke('indexOf', context, valueToFind, fromIndex) != -1;
    }
);

const Array_indexOf = new JokeNativeMethod(
    (context, thisValue, searchElement, fromIndex=0) => {
        const length = thisValue.getProperty('length');

        if (fromIndex < 0) {
            fromIndex = length + fromIndex;
        }
        for (let i = fromIndex; i < length; i++) {
            if (searchElement === thisValue.getProperty(i)) {
                return i;
            }
        }
        return -1;
    }
);

const Array_join = new JokeNativeMethod(
    (context, thisValue, separator=',') => {
        const length = thisValue.getProperty('length');
        let joined = '';

        for (let i = 0; i < length; i++) {
            const elem = thisValue.getProperty(i);
            // TODO: consider undefined, null and "Object"
            joined += elem;
            if (i != length - 1) {
                joined += separator;
            }
        }
        return joined;
    }
);

const Array_slice = new JokeNativeMethod(
    (context, thisValue, start=0, end) => {
        const length = thisValue.getProperty('length');

        if (start < 0) {
            start = length + start;
            if (start < 0) {
                start = 0;
            }
        }
        if (end === undefined) {
            end = length;
        } else if (end < 0) {
            end = length + end;
            if (end < 0) {
                end = 0;
            }
        }
        const sliced = JokeArray.newInstance();
        for (let i = start; i < end; i++) {
            sliced.setProperty(i - start, thisValue.getProperty(i));
        }
        const slicedLength = end - start;
        if (slicedLength > 0) {
            sliced.setProperty('length', slicedLength);
        }

        return sliced;
    }
);

const Array_toString = new JokeNativeMethod(
    (context, thisValue) => {
        return thisValue.invoke('join', context);
    }
);

const Array_filter = new JokeNativeMethod(
    (context, thisValue, callback, thisArg) => {
        const length = thisValue.getProperty('length');
        const callbackContext = {
            ...context,
            thisValue: thisArg ? thisArg : thisValue
        };
        const filtered = JokeArray.newInstance();
        for (let i = 0; i < length; i++) {
            const elem = thisValue.getProperty(i);
            if (callback.call(callbackContext, elem, i, thisValue).value) {
                filtered.invoke('push', context, elem);
            }
        }
        return filtered;
    }
);

const Array_find = new JokeNativeMethod(
    (context, thisValue, callback, thisArg) => {
        const length = thisValue.getProperty('length');
        const callbackContext = {
            ...context,
            thisValue: thisArg ? thisArg : thisValue
        };
        for (let i = 0; i < length; i++) {
            const elem = thisValue.getProperty(i);
            if (callback.call(callbackContext, elem, i, thisValue).value) {
                return elem;
            }
        }
    }
);

const Array_map = new JokeNativeMethod(
    (context, thisValue, callback, thisArg) => {
        const length = thisValue.getProperty('length');
        const callbackContext = {
            ...context,
            thisValue: thisArg ? thisArg : thisValue
        };
        const mapped = JokeArray.newInstance();
        for (let i = 0; i < length; i++) {
            const elem = thisValue.getProperty(i);
            mapped.invoke('push', context, callback.call(callbackContext, elem, i, thisValue).value);
        }
        return mapped;
    }
);

const Array_reduce = new JokeNativeMethod(
    (context, thisValue, callback, initialValue) => {
        const length = thisValue.getProperty('length');
        let start = 0;
        if (initialValue === undefined) {
            // TODO: TypeError in case of empty array
            initialValue = thisValue.getProperty(0);
            start = 1;
        }
        let accumulator = initialValue;
        for (let i = start; i < length; i++) {
            const elem = thisValue.getProperty(i);
            accumulator = callback.call(context, accumulator, elem, i, thisValue).value;
        }
        return accumulator;
    }
);

// Array is builtin "object"(not "class")
export const JokeArray = new JokeFunction();
{
    const prototype = JokeArray.getProperty('prototype');
    prototype.setProperty('length', 0);

    prototype.setProperty(Symbol.iterator, Array_iterator);

    prototype.setProperty('push', Array_push);
    prototype.setProperty('pop', Array_pop);
    prototype.setProperty('unshift', Array_unshift);
    prototype.setProperty('shift', Array_shift);

    prototype.setProperty('reverse', Array_reverse);
    prototype.setProperty('sort', Array_sort);
    prototype.setProperty('splice', Array_splice);

    prototype.setProperty('includes', Array_includes);
    prototype.setProperty('indexOf', Array_indexOf);
    prototype.setProperty('join', Array_join);
    prototype.setProperty('slice', Array_slice);
    prototype.setProperty('toString', Array_toString);

    prototype.setProperty('filter', Array_filter);
    prototype.setProperty('find', Array_find);
    prototype.setProperty('map', Array_map);
    prototype.setProperty('reduce', Array_reduce);
}
JokeArray.newInstance = () => {
    const arr = new JokeObject();
    arr.setProperty('constructor', JokeArray);
    return arr;
};

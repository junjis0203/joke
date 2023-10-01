import { FunctionObject } from './function_object.js';

export class NativeFunction extends FunctionObject {
    constructor(func) {
        super();
        this.func = func;
    }

    call(thisArgument, argumentsList) {
        const value = this.func(...argumentsList);
        return {
            type: 'RETURN',
            value
        };
    }
}

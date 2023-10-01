import { OrdinaryObject } from '../ordinary_object.js';
import { NativeFunction } from '../native_function.js';
import { resolveThisBinding } from '../execution_context.js';

export function createErrorIntrinsics(realm) {
    const funcProto = realm.intrinsics['FunctionPrototype'];

    const err = new NativeFunction(
        (message) => {
            const thisValue = resolveThisBinding();
            thisValue.set('message', message);
        }
    );
    const errProto = new OrdinaryObject();
    err.setPrototypeOf(funcProto);
    err.set('prototype', errProto);
    
    errProto.set('constructor', err);
    errProto.set('message', '');
    errProto.set('name', 'Error');
    errProto.set('toString', new NativeFunction(
        () => {
            const thisValue = resolveThisBinding();
            const name = thisValue.get('name');
            const msg  = thisValue.get('message');
            if (msg == '') {
                return name;
            }
            return name + ': ' + msg;
        }
    ));

    realm.intrinsics['Error'] = err;
    realm.intrinsics['ErrorPrototype'] = errProto;
}

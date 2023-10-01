import { newGlobalEnvironment } from './lexical_environment.js';
import { OrdinaryObject, PropertyDescriptor } from './ordinary_object.js';
import { NativeFunction } from './native_function.js';

class Realm {
    constructor() {
        this.intrinsics = {};
        this.globalThis = undefined;
        this.globalEnv = undefined;
    }
}

function createBuiltinFunction(realm, steps, prototype, internalSlotsList) {
    const func = new NativeFunction(steps);
    func.realm = realm;
    func.setPrototypeOf(prototype);
    return func;
}

export function createRealm() {
    const realm = new Realm();
    createIntrinsics(realm);
    return realm;
};

import { createObjectIntrinsics } from './builtin/object.js';
import { createFunctionIntrinsics } from './builtin/function.js';
import { createErrorIntrinsics } from './builtin/error.js';

function createIntrinsics(realm) {
    const objProto = new OrdinaryObject();
    realm.intrinsics['ObjectPrototype'] = objProto;
    const funcProto = createBuiltinFunction(realm, () => {}, objProto);
    realm.intrinsics['FunctionPrototype'] = funcProto;

    createObjectIntrinsics(realm);
    createFunctionIntrinsics(realm);
    createErrorIntrinsics(realm);

    {
        const iterProto = new OrdinaryObject();
        iterProto.set('prototype', objProto);
        // TODO: set [@@iterator] function
        realm.intrinsics['IteratorPrototype'] = iterProto;
    }
}

export function setRealmGlobalObject(realm, globalObj) {
    if (globalObj === undefined) {
        globalObj = new OrdinaryObject();
        globalObj.setPrototypeOf(realm.intrinsics['ObjectPrototype']);
    }
    realm.globalThis = globalObj;
    const globalEnv = newGlobalEnvironment(globalObj);
    realm.globalEnv = globalEnv;
};

export function setDefaultGlobalBindings(realm) {
    // "global" is referenced as Node.js' global object
    const _global = realm.globalThis;

    _global.defineOwnProperty('undefined', new PropertyDescriptor({}));

    // const constructorProperties = ['Error'];
    // for (const name of constructorProperties) {
    //     const value = realm.intrinsics[name];
    //     const desc = new PropertyDescriptor({value});
    //     _global.defineOwnProperty(name, desc);
    // }

    return _global;
};

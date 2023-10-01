import { FunctionObject } from '../function_object.js';

export function createFunctionIntrinsics(realm) {
    const funcProto = realm.intrinsics['FunctionPrototype'];

    const func = new FunctionObject();
    func.setPrototypeOf(funcProto);
    func.set('prototype', funcProto);
    realm.intrinsics['Function'] = func;
}

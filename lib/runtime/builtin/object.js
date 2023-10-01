import { FunctionObject } from '../function_object.js';

export function createObjectIntrinsics(realm) {
    const objProto = realm.intrinsics['ObjectProtoType'];
    const funcProto = realm.intrinsics['FunctionPrototype'];

    const obj = new FunctionObject();
    obj.setPrototypeOf(funcProto);
    obj.set('prototype', objProto);
    realm.intrinsics['Object'] = obj;
}

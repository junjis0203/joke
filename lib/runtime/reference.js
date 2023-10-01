import { OrdinaryObject } from './ordinary_object.js';

export class Reference {
    constructor(base, name, strict) {
        this.base = base;
        this.name = name;
        this.strict = strict;
    }

    getBase() {
        return this.base;
    }

    getReferencedName() {
        return this.name;
    }

    isStrictReference() {
        return this.strict;
    }

    // TODO: hasPrimitiveBase()

    isPropertyReference() {
        if (this.base instanceof OrdinaryObject) {
            return true;
        } else {
            return false;
        }
    }

    isUnresolvableReference() {
        return this.base === undefined;
    }

    isSuperReference() {
        return this.hasOwnProperty('thisValue');
    }

    getThisValue() {
        if (this.isSuperReference()) {
            return this.thisValue;
        }
        return this.getBase();
    }
};

export function getValue(v) {
    if (!(v instanceof Reference)) {
        return v;
    }
    const base = v.getBase();
    if (v.isUnresolvableReference()) {
        throw ReferenceError(`[JOKE] ${v.name}`);
    }
    if (v.isPropertyReference()) {
        // TODO: support primitive convertion
        return base.get(v.getReferencedName(), v.getThisValue());
    } else {
        return base.getBindingValue(v.getReferencedName(), v.isStrictReference());
    }
};

export function putValue(v, w) {
    if (!(v instanceof Reference)) {
        throw ReferenceError(`[JOKE] ${v.name}`);
    }
    const base = v.getBase();
    if (v.isUnresolvableReference()) {
        // always strict
        throw ReferenceError(`[JOKE] ${v.name}`);
    }
    if (v.isPropertyReference()) {
        // TODO: support primitive convertion
        const succeeded = base.set(v.getReferencedName(), w, v.getThisValue());
        if (!succeeded && v.isStrictReference()) {
            throw new TypeError(`[JOKE] ${v.name}`);
        }
    } else {
        return base.setMutableBinding(v.getReferencedName(), w, v.isStrictReference());
    }
}

export function initializeReferencedBinding(v, w) {
    const base = v.getBase();
    base.initializeBinding(v.getReferencedName(), w);
}

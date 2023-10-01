import { Reference } from './reference.js';

class EnvironmentRecord {
    hasBinding(name) {
    }

    createMutableBinding(name, del) {
    }

    createImmutableBinding(name, strict) {
    }

    initializeBinding(name, value) {
    }

    setMutableBinding(name, value, strict) {
    }

    getBindingValue(name, strict) {
    }

    // unsupport deleteBinding(name)

    hasThisBinding() {
    }

    hasSuperBinding() {
    }

    // unsupport withBaseObject()
}

class LexicalEnvironment {
    constructor(environmentRecord, outer) {
        this.environmentRecord = environmentRecord;
        this.outer = outer;
    }
}

export function getIdentifierReference(lex, name, strict) {
    if (lex === null) {
        return new Reference(undefined, name, strict);
    }
    const envRec = lex.environmentRecord;
    const exists = envRec.hasBinding(name);
    if (exists) {
        return new Reference(envRec, name, strict);
    } else {
        return getIdentifierReference(lex.outer, name, strict);
    }
};

class DeclarativeEnvironmentRecord extends EnvironmentRecord {
    constructor() {
        super();
        this.bindings = {};
    }

    hasBinding(name) {
        return this.bindings.hasOwnProperty(name);
    }

    createMutableBinding(name, del) {
        this.bindings[name] = {init: false, mutable: true}
    }

    createImmutableBinding(name, strict) {
        this.bindings[name] = {init: false, mutable: false}
    }

    initializeBinding(name, value) {
        const binding = this.bindings[name];
        binding.value = value;
        binding.init = true;
    }

    setMutableBinding(name, value, strict) {
        const binding = this.bindings[name];
        // always strict
        if (!binding) {
            throw new ReferenceError(`[JOKE] ${name}`);
        }
        // must check uninitialized?
        if (binding.mutable) {
            binding.value = value;
        } else {
            throw new TypeError('[JOKE] Assignment to const');
        }
    }

    getBindingValue(name, strict) {
        // must check uninitialized?
        return this.bindings[name].value;
    }

    hasThisBinding() {
        return false;
    }

    hasSuperBinding() {
        return false;
    }
}

export function newDeclarativeEnvironment(outer) {
    const envRec = new DeclarativeEnvironmentRecord();
    return new LexicalEnvironment(envRec, outer);
};

// unsupport wth
class ObjectEnvironmentRecord extends EnvironmentRecord {
    constructor(bindingObject) {
        super();
        this.bindingObject = bindingObject;
    }

    hasBinding(name) {
        return this.bindingObject.hasProperty(name);
    }

    createMutableBinding(name, del) {
        this.defineOwnProperty(name, new PropertyDescriptor({value: undefined}));
    }

    // createImmutableBinding is never used

    initializeBinding(name, value) {
        this.setMutableBinding(name, value);
    }

    setMutableBinding(name, value, strict) {
        const bindings = this.bindingObject;
        bindings.set(name, value, bindings);
    }

    getBindingValue(name, strict) {
        const bindings = this.bindingObject;
        if (bindings.hasProperty(name) === false) {
            // ignore strict
            return undefined;
        }
        return bindings.get(name, bindings);
    }

    hasThisBinding() {
        return false;
    }

    hasSuperBinding() {
        return false;
    }
}

export function newObjectEnvironment(obj, outer) {
    const envRec = new ObjectEnvironmentRecord(obj);
    return new LexicalEnvironment(envRec, outer);
};

class FunctionEnvironmentRecord extends DeclarativeEnvironmentRecord {
    constructor(thisValue, thisBindingStatus, functionObject, homeObject, newTarget) {
        super();
        this.thisValue = thisValue;
        this.thisBindingStatus = thisBindingStatus;
        this.functionObject = functionObject;
        this.homeObject = homeObject;
        this.newTarget = newTarget;
    }

    bindThisValue(value) {
        this.thisValue = value;
        this.thisBindingStatus = 'initialized';
    }

    hasThisBinding() {
        return this.thisBindingStatus !== 'lexical';
    }

    hasSuperBinding() {
        if (this.thisBindingStatus === 'lexical') {
            return false;
        }
        return this.homeObject !== undefined;
    }

    getThisBinding() {
        return this.thisValue;
    }

    getSuperBase() {
        const home = this.homeObject;
        if (home === undefined) {
            return undefined;
        }
        return home.getPrototypeOf();
    }
}

export function newFunctionEnvironment(f, newTarget) {
    const thisBindingStatus = f.thisMode === ' lexical' ? 'lexical' : 'uninitialized';
    const envRec = new FunctionEnvironmentRecord(undefined, thisBindingStatus, f, f.homeObject, newTarget);
    return new LexicalEnvironment(envRec, f.environment);
};

class GlobalEnvironmentRecord extends EnvironmentRecord {
    constructor(objectRecord, declarativeRecord) {
        super();
        this.objectRecord = objectRecord;
        this.declarativeRecord = declarativeRecord;
        this.varNames = [];
    }

    hasBinding(name) {
        if (this.declarativeRecord.hasBinding(name)) {
            return true;
        }
        return this.objectRecord.hasBinding(name);
    }

    createMutableBinding(name, del) {
        const dclRec = this.declarativeRecord;
        if (dclRec.hasBinding(name)) {
            // What case is this happened?
            throw TypeError();
        }
        dclRec.createMutableBinding(name, del);
    }

    createImmutableBinding(name, strict) {
        const dclRec = this.declarativeRecord;
        if (dclRec.hasBinding(name)) {
            throw TypeError();
        }
        dclRec.createImmutableBinding(name, strict);
    }

    initializeBinding(name, value) {
        const dclRec = this.declarativeRecord;
        if (dclRec.hasBinding(name)) {
            return dclRec.initializeBinding(name, value);
        }
        return this.objectRecord.initializeBinding(name, value);
    }

    setMutableBinding(name, value, strict) {
        const dclRec = this.declarativeRecord;
        if (dclRec.hasBinding(name)) {
            return dclRec.setMutableBinding(name, value, strict);
        }
        return this.setMutableBinding(name, value, strict);
    }

    getBindingValue(name) {
        const dclRec = this.declarativeRecord;
        if (dclRec.hasBinding(name)) {
            return dclRec.getBindingValue(name);
        }
        return this.objectRecord.getBindingValue(name);
    }

    hasThisBinding() {
        return true;
    }

    hasSuperBinding() {
        return false;
    }

    getThisBinding() {
        return this.objectRecord.bindingObject;
    }

    hasVarDeclaration(name) {
        return this.varNames.includes(name);
    }

    hasLexicalDeclaration(name) {
        return this.hasBinding(name);
    }

    hasRestrictedGlobalProperty(name) {
        const globalObject = this.objectRecord.bindingObject;
        const existingProp = globalObject.getOwnProperty(name);
        if (existingProp === undefined) {
            return false;
        }
        return existingProp.configurable === false;
    }

    // unsupport canDeclareGlobalVar(name)

    canDeclareGlobalFunction(name) {
        const globalObject = this.objectRecord.bindingObject;
        const existingProp = globalObject.getOwnProperty(name);
        if (existingProp === undefined) {
            // always extensible
            return true;
        }
        // always configurable and skip later check
        return true;
    }

    // unsupport createGlobalVarBinding(name, del)

    createGlobalFunctionBinding(name, value, del) {
        const globalObject = this.objectRecord.bindingObject;
        // skip validation
        globalObject.set(name, value, globalObject);
        if (!this.varNames.includes(name)) {
            this.varNames.push(name);
        }
    }
}

export function newGlobalEnvironment(globalObject) {
    const objRec = new ObjectEnvironmentRecord(globalObject);
    const dclRec = new DeclarativeEnvironmentRecord();
    const globalRec = new GlobalEnvironmentRecord(objRec, dclRec);
    return new LexicalEnvironment(globalRec, null);
};

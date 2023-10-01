import { ExecutionContext, getRunningExecutionContext, popExecutionContext, pushExecutionContext, resolveBinding } from './execution_context.js';
import { newDeclarativeEnvironment, newFunctionEnvironment } from './lexical_environment.js';
import { OrdinaryObject, PropertyDescriptor, objectCreate } from './ordinary_object.js';
import { initializeReferencedBinding, getValue, putValue } from './reference.js';

function getPrototype(prototype) {
    const context = getRunningExecutionContext();
    const realm = context.realm;
    return realm.intrinsics[prototype];
}

function prepareForOrdinaryCall(f, newTarget) {
    const callerContext = getRunningExecutionContext();
    const calleeContext = new ExecutionContext();
    calleeContext.functionObject = f;
    const calleeRealm = f.realm;
    calleeContext.realm = calleeRealm;
    const localEnv = newFunctionEnvironment(f, newTarget);
    calleeContext.lexicalEnvironment = localEnv;
    // TODO: Suspend callerContext
    pushExecutionContext(calleeContext);
    return calleeContext;
}

function ordinaryCallBindThis(f, calleeContext, thisArgument) {
    const thisMode = f.thisMode;
    if (thisMode == 'lexical') {
        return;
    }
    const calleeRealm = f.realm;
    const localEnv = calleeContext.lexicalEnvironment;
    let thisValue;
    if (thisMode == 'strict') {
        thisValue = thisArgument;
    } else {
        if (thisArgument === null || thisArgument === undefined) {
            thisValue = calleeRealm.globalThis;
        } else {
            // TODO: implement and use ToObject
            thisValue = thisArgument;
        }
    }
    const envRec = localEnv.environmentRecord;
    return envRec.bindThisValue(thisValue);
}

// formals is not Parse Node described in ECMAScript specification
function getBoundNames(formals) {
    const names = [];
    for (const param of formals) {
        if (param.patterns) {
            for (const pattern of param.patterns) {
                names.push(pattern.name);
            }
        } else {
            names.push(param.name);
        }
    }
    return names;
}

function checkDuplicateEntries(names) {
    // I don't use Set because I don't want to implement Set:-P
    for (let i = 0; i < names.length; i++) {
        for (let j = i + 1; j < names.length; j++) {
            if (names[i] == names[j]) {
                return true;
            }
        }
    }
    return false;
}

function containsExpression(formals) {
    for (const param of formals) {
        if (param.patterns) {
            // currently BindingPattern doesn't support init
        }
        if (param.init) {
            return true;
        }
    }
    return false;
}

function createIterResultObject(value, done) {
    const obj = objectCreate(getPrototype('ObjectPrototype'));
    obj.defineOwnProperty('value', new PropertyDescriptor({value: value}));
    obj.defineOwnProperty('done', new PropertyDescriptor({value: done}));
    return obj;
}

function listIteratorNext() {
    const o = this;
    const list = o.iteratedList;
    const index = o.listIteratorNextIndex;
    const len = list.length;
    if (index >= len) {
        return createIterResultObject(undefined, true);
    } else {
        o.listIteratorNextIndex = index + 1;
        return createIterResultObject(list[index], false);
    }
}

function createListIterator(list) {
    const iterator = objectCreate(getPrototype('IteratorPrototype'));
    iterator.iteratedList = list;
    iterator.listIteratorNextIndex = 0;
    const next = listIteratorNext;
    iterator.IteratorNext = next;
    iterator.defineOwnProperty('next', new PropertyDescriptor({value: next}));
    return iterator;
}

// valid only ListIterator
function iteratorNext(iterator, value) {
    const result = iterator.IteratorNext();
    return result;
}

function iteratorComplete(iterResult) {
    return iterResult.get('done');
}

function iteratorValue(iterResult) {
    return iterResult.get('value');
}

function iteratorStep(iterator) {
    const result = iteratorNext(iterator);
    const done = iteratorComplete(result);
    if (done == true) {
        return false;
    }
    return result;
}

function iteratorBindingInitialization(formals, iteratorRecord, environment) {
    for (const param of formals) {
        if (param.patterns) {
            // BindingPattern
            for (const pattern of param.patterns) {
            }
        } else {
            if (param.rest) {
                // BindingRestElement
            } else {
                // SingleNameBinding
                const bindingId = param.name;
                const lhs = resolveBinding(bindingId, environment);
                let v;
                if (iteratorRecord.done == false) {
                    const next = iteratorStep(iteratorRecord.iterator);
                    if (next == false) {
                        iteratorRecord.done = true;
                    } else {
                        v = iteratorValue(next);
                    }
                } else {
                    v = undefined;
                }
                if (param.init && v == undefined) {
                    // setup environment
                    const currentContext = getRunningExecutionContext();
                    // variableEnvironment is not supported
                    const originalEnv = currentContext.lexicalEnvironment;
                    const paramVarEnv = newDeclarativeEnvironment(originalEnv);
                    currentContext.lexicalEnvironment = paramVarEnv;

                    const ret = _evaluator(param.initInsns);
                    // assume Exception is not occurred
                    const defaultValue = ret.value;
                    v = getValue(defaultValue);
                    // omit anonymous function check

                    // teardown environment
                    currentContext.lexicalEnvironment = originalEnv;
                }
                if (environment == undefined) {
                    putValue(lhs, v);
                } else {
                    initializeReferencedBinding(lhs, v);
                }
            }
        }
    }
}

function functionDeclarationInstantiation(f, argumentsList) {
    const calleeContext = getRunningExecutionContext();
    const env = calleeContext.lexicalEnvironment;
    const envRec = env.environmentRecord;
    const strict = f.strict;
    const formals = f.formalParameters;
    const parameterNames = getBoundNames(formals);
    const hasDuplicates = checkDuplicateEntries(parameterNames);
    const hasParameterExpressions = containsExpression(formals);
    // no var support
    // no arguments support

    for (const paramName of parameterNames) {
        const alreadyDeclared = envRec.hasBinding(paramName);
        if (alreadyDeclared == false) {
            let status = envRec.createMutableBinding(paramName);
            if (hasDuplicates) {
                status = envRec.initializeBinding(paramName, undefined);
            }
        }
    }

    const iteratorRecord = {iterator: createListIterator(argumentsList), done: false};
    if (hasDuplicates) {
        iteratorBindingInitialization(formals, iteratorRecord, undefined);
    } else {
        iteratorBindingInitialization(formals, iteratorRecord, env);
    }

    let varEnv;
    if (hasParameterExpressions == false) {
        varEnv = env;
    } else {
        varEnv = newDeclarativeEnvironment(env);
    }

    let lexEnv;
    if (strict == false) {
        lexEnv = newDeclarativeEnvironment(varEnv);
    } else {
        lexEnv = varEnv;
    }
    calleeContext.lexicalEnvironment = lexEnv;

    // Lexical bindings are created runtime, not here.
}

let _evaluator;
export function setEvaluator(evaluator) {
    _evaluator = evaluator;
}

function ordinaryCallEvaluateBody(f, argumentsList) {
    functionDeclarationInstantiation(f, argumentsList);
    // call evaluator implementation. this is not ECMAScript specification
    return _evaluator(f.ecmaScriptCode);
}

export class FunctionObject extends OrdinaryObject {
    call(thisArgument, argumentsList) {
        if (this.functionKind == 'classConstructor') {
            const name = this.getOwnProperty('name').value;
            throw new TypeError(`Class constructor ${name} cannot be invoked without 'new'`);
        }
        const callerContext = getRunningExecutionContext();
        const calleeContext = prepareForOrdinaryCall(this, undefined);
        ordinaryCallBindThis(this, calleeContext, thisArgument);
        const result = ordinaryCallEvaluateBody(this, argumentsList);
        popExecutionContext();
        return result;
    }
};

function functionAllocate(functionPrototype, strict, functionKind) {
    if (!functionKind) {
        functionKind = 'normal';
    }
    let needsConstruct;
    if (functionKind == 'non-constructor') {
        functionKind = 'normal';
        needsConstruct = false;
    } else {
        needsConstruct = true;
    }
    const f = new FunctionObject();
    if (needsConstruct) {
        // TODO
    }
    f.strict = strict;
    f.functionKind = functionKind;
    f.prototype = functionPrototype;
    f.realm = getRunningExecutionContext().realm;
    return f;
}

function functionInitialize(f, kind, parameterList, body, scope) {
    const len = parameterList.length;
    f.defineOwnProperty('length', new PropertyDescriptor({value: len}));
    const strict = f.strict;
    f.environment = scope;
    f.formalParameters = parameterList;
    f.ecmaScriptCode = body;
    if (kind == 'Arrow') {
        f.thisMode = 'lexical';
    } else if (strict === true) {
        f.thisMode = 'strict';
    } else {
        f.thisMode = 'global';
    }
    return f;
}

export function functionCreate(kind, parameterList, body, scope, strict, prototype) {
    if (!prototype) {
        const context = getRunningExecutionContext();
        const realm = context.realm;
        prototype = realm.intrinsics['FunctionPrototype'];
    }
    const allocKind = kind != 'Normal' ? 'non-constructor' : 'normal';
    const f = functionAllocate(prototype, strict, allocKind);
    return functionInitialize(f, kind, parameterList, body, scope);
}

export function makeConstructor(f, writablePrototype, prototype) {
    // if (writablePrototype === undefined) {
    //     writablePrototype = true;
    // }
    if (prototype === undefined) {
        prototype = objectCreate(getPrototype('ObjectPrototype'));
        prototype.defineOwnProperty('constructor', new PropertyDescriptor({value: f}));
    }
    f.defineOwnProperty('prototype', new PropertyDescriptor({value: prototype}));
}

export function setFunctionName(f, name, prefix) {
    if (typeof(name) == 'symbol') {
        const description = name.description;
        if (description === undefined) {
            name = '';
        } else {
            name = `[${description}]`;
        }
    }
    if (prefix) {
        name = `${prefix} ${name}`;
    }
    f.defineOwnProperty('name', new PropertyDescriptor({value: name}));
}

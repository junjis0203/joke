import { createScope } from './object.js';

function lookupObject(scopes, name) {
    for (const scope of scopes) {
        const object = scope.getObject(name);
        if (object) {
            return object.value;
        }
    }
    throw new ReferenceError(name);
}

function findScopeForObject(scopes, name) {
    for (const scope of scopes) {
        const object = scope.getObject(name);
        if (object) {
            return scope;
        }
    }
    throw new ReferenceError(name);
}

function executeInsn(insn, stack, scopes) {
    switch (insn.command) {
    case 'PUSH':
        stack.push(insn.operand);
        break;
    case 'POP':
        stack.pop();
        break;
    case 'DEFINE':
        {
            const currentScope = scopes[0];
            currentScope.defineObject(insn.operand1, insn.operand2);
        }
        break;
    case 'INITIALIZE':
        {
            const currentScope = scopes[0];
            const objectName = stack.pop();
            const value = stack.pop();
            currentScope.setObject(objectName, value, true);
        }
        break;
    case 'ASSIGN':
        {
            const objectName = stack.pop();
            const scope = findScopeForObject(scopes, objectName);
            const value = stack.pop();
            scope.setObject(objectName, value);
            // assignment operator value
            stack.push(value);
        }
        break;
    case 'PUSH_SCOPE':
        {
            const newScope = createScope();
            scopes.unshift(newScope);
        }
        break;
    case 'POP_SCOPE':
        scopes.shift();
        break;
    case 'LOOKUP':
        {
            const objectName = stack.pop();
            const object = lookupObject(scopes, objectName);
            stack.push(object);
        }
        break;
    case 'MEMBER':
        {
            const propertyName = stack.pop();
            const object = stack.pop();
            const property = object.getProperty(propertyName);
            stack.push(property);
        }
        break;
    case 'CALL':
        {
            const args = [];
            const arglen = insn.operand;
            for (let i = 0; i < arglen; i++) {
                args.push(stack.pop());
            }
            args.reverse();
            const target = stack.pop();
            const ret = target(...args);
            stack.push(ret);
        }
        break;
    default:
        throw new Error(`Unknown instruction: ${insn.command}`);
    }
}

function vmMain(insns, stack, scopes) {
    let ptr = 0;
    while (ptr != insns.length) {
        executeInsn(insns[ptr++], stack, scopes);
    }
}

export default class Vm {
    run(insns, globalScope) {
        const scopes = [globalScope];
        const stack = [];
        vmMain(insns, stack, scopes);
        if (stack.length != 0) {
            throw new Error(`Stack must be empty: ${stack}`);
        }
    }
}

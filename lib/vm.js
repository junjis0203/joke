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

const UNARY_OPERATOR = {
    '-': a => -a
}

function runUnaryOperator(operator, operand) {
    return UNARY_OPERATOR[operator](operand);
}

const BINARY_OPERATOR = {
    '+': (a, b) => a + b,
    '-': (a, b) => a - b,
    '*': (a, b) => a * b,
    '/': (a, b) => a / b,
    '%': (a, b) => a % b
}

function runBinaryOperator(operator, left, right) {
    return BINARY_OPERATOR[operator](left, right);
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
            const currentScope = scopes[0];
            const objectName = stack.pop();
            const value = stack.pop();
            currentScope.setObject(objectName, value);
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
    case 'UNI_OP':
        {
            const operand = stack.pop();
            const result = runUnaryOperator(insn.operator, operand);
            stack.push(result);
        }
        break;
    case 'BIN_OP':
        {
            const right = stack.pop();
            const left = stack.pop();
            const result = runBinaryOperator(insn.operator, left, right);
            stack.push(result);
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

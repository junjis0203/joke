import * as Instruction from './instruction.js';
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
    // shorten name
    const I = Instruction;

    switch (insn.command) {
    case I.PUSH:
        stack.push(insn.operand);
        break;
    case I.POP:
        stack.pop();
        break;
    case I.DUP:
        stack.push(stack[stack.length - 1]);
        break;
    case I.DEFINE:
        {
            const currentScope = scopes[0];
            currentScope.defineObject(insn.operand1, insn.operand2);
        }
        break;
    case I.INITIALIZE:
        {
            const currentScope = scopes[0];
            const objectName = stack.pop();
            const value = stack.pop();
            currentScope.setObject(objectName, value, true);
        }
        break;
    case I.ASSIGN:
        {
            const currentScope = scopes[0];
            const objectName = stack.pop();
            const value = stack.pop();
            currentScope.setObject(objectName, value);
            // assignment operator value
            stack.push(value);
        }
        break;
    case I.PUSH_SCOPE:
        {
            const newScope = createScope();
            scopes.unshift(newScope);
        }
        break;
    case I.POP_SCOPE:
        scopes.shift();
        break;
    case I.LOOKUP:
        {
            const objectName = stack.pop();
            const object = lookupObject(scopes, objectName);
            stack.push(object);
        }
        break;
    case I.MEMBER:
        {
            const propertyName = stack.pop();
            const object = stack.pop();
            const property = object.getProperty(propertyName);
            stack.push(property);
        }
        break;
    case I.CALL:
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
    case I.UNI_OP:
        {
            const operand = stack.pop();
            const result = runUnaryOperator(insn.operator, operand);
            stack.push(result);
        }
        break;
    case I.BIN_OP:
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
        const insn = insns[ptr++];
        try {
            executeInsn(insn, stack, scopes);
        } catch (e) {
            // add srcInfo to message
            e.message += `: ${insn.srcInfo}`;
            throw e;
        }
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

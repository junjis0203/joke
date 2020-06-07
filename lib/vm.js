import * as Instruction from './instruction.js';
import { createScope } from './object.js';

function lookupObject(scopes, name) {
    for (const scope of scopes) {
        const object = scope.getObject(name);
        if (object) {
            return object.value;
        }
    }
    throw new ReferenceError(`[JOKE] ${name}`);
}

function findScopeForObject(scopes, name) {
    for (const scope of scopes) {
        const object = scope.getObject(name);
        if (object) {
            return scope;
        }
    }
    throw new ReferenceError(`[JOKE] ${name}`);
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

function callFunction(context, func, args) {
    const {stack} = context;
    const {params, insns, scopes} = func;

    // BUG: can declare variable that is same name with argument
    //      must be detected by Validator
    const argsScope = createScope();
    for (let i = 0; i < params.length; i++) {
        argsScope.defineObject(params[i], 'let');
        if (args[i]) {
            argsScope.setObject(params[i], args[i]);
        } else {
            // TODO: set default parameter(need execute)
        }
    }

    scopes.unshift(argsScope);
    runInsns(context, insns);
    scopes.shift();

    return stack.pop();
}

function executeInsn(context, insn) {
    const {insnsList, stack, scopes} = context;

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
            const objectName = stack.pop();
            const scope = findScopeForObject(scopes, objectName);
            const value = stack.pop();
            scope.setObject(objectName, value);
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
            let ret;
            if (typeof(target) == "function") {
                // "native" function
                ret = target(...args);
            } else {
                ret = callFunction(context, target, args);
            }
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
    case I.DEFINE_FUNC:
        {
            const funcInsns = insnsList[insn.ref];
            const func = {
                name: insn.name,
                params: insn.params,
                insns: funcInsns,
                scopes: scopes
            };
            const currentScope = scopes[0];
            currentScope.defineObject(insn.name, 'let');
            currentScope.setObject(insn.name, func);
        }
        break;
    case I.RETURN:
        return 'EXIT';
    default:
        throw new Error(`[JOKE] Unknown instruction: ${insn.command}`);
    }
}

function runInsns(context, insns) {
    let ptr = 0;
    while (ptr != insns.length) {
        const insn = insns[ptr++];
        try {
            const ret = executeInsn(context, insn);
            if (ret == 'EXIT') {
                break;
            }
        } catch (e) {
            // add srcInfo to message
            e.message += `: ${insn.srcInfo}`;
            throw e;
        }
    }
}

export default class Vm {
    run(insnsList, globalScope) {
        const scopes = [globalScope];
        const stack = [];
        const context = {
            insnsList,
            stack,
            scopes
        }
        const topInsns = insnsList[0];
        runInsns(context, topInsns);
        if (stack.length != 0) {
            throw new Error(`[JOKE] Stack must be empty: ${stack}`);
        }
    }
}

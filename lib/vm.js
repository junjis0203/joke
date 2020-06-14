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
    '-': a => -a,
    '!': a => !a,
}

function runUnaryOperator(operator, operand) {
    return UNARY_OPERATOR[operator](operand);
}

// Implement operator using under layer engine's operator.
// This way is easy but not interesting :-<
const BINARY_OPERATOR = {
    // arithmetic operator
    '+': (a, b) => a + b,
    '-': (a, b) => a - b,
    '*': (a, b) => a * b,
    '/': (a, b) => a / b,
    '%': (a, b) => a % b,

    // equality operator
    '==':  (a, b) => a ==  b,
    '!=':  (a, b) => a !=  b,
    '===': (a, b) => a === b,
    '!==': (a, b) => a !== b,

    // relational operator
    '>':  (a, b) => a >  b,
    '<':  (a, b) => a <  b,
    '>=': (a, b) => a >= b,
    '<=': (a, b) => a <= b,
}

function runBinaryOperator(operator, left, right) {
    return BINARY_OPERATOR[operator](left, right);
}

function callFunction(context, func, args) {
    const stack = [];
    const {params, insns, scopes, insnsList} = func;

    // function has self context(defined context)
    const funcContext = {
        insnsList,
        stack,
        scopes
    };

    // BUG: can declare variable that is same name with argument
    //      must be detected by Validator
    const argsScope = createScope();

    // default initializer can use preceeding argument
    scopes.unshift(argsScope);
    for (let i = 0; i < params.length; i++) {
        argsScope.defineObject(params[i].name, 'let');
        if (args[i] != undefined) {
            argsScope.setObject(params[i].name, args[i]);
        } else if (params[i].init) {
            // run initializer
            // TODO: this way is no good. rewrite in the future
            const initInsns = insnsList[params[i].init];
            runInsns(funcContext, initInsns);
            const val = stack.pop();
            argsScope.setObject(params[i].name, val);
        }
    }

    runInsns(funcContext, insns);
    scopes.shift();

    // return undefined if function has no return statement
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
    case I.JUMP_IF:
        {
            const val = stack.pop();
            if (val) {
                return {type: 'JUMP', offset: insn.offset};
            }
        }
        break;
    case I.JUMP:
        return {type: 'JUMP', offset: insn.offset};
    case I.MAKE_FIUNCTION:
        {
            const funcInfo = stack.pop();
            const funcInsns = insnsList[funcInfo.ref];
            const func = {
                name: funcInfo.name,
                params: funcInfo.params,
                insns: funcInsns,
                // include scopes and insnsList to execute function
                scopes: scopes.slice(),
                insnsList
            };
            stack.push(func);
        }
        break;
    case I.RETURN:
        return {type: 'EXIT'};
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
            if (ret) {
                if (ret.type == 'EXIT') {
                    break;
                } else if (ret.type == 'JUMP') {
                    ptr = ptr + ret.offset;
                }
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

import * as Instruction from './instruction.js';
import { Scope, JokeObject, JokeFunction } from './object.js';

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
    const breakableStack = [];
    const {params, insns, scopes, insnsList, insnsListIndex} = func.funcInfo;
    const thisValue = context.thisValue ? context.thisValue : func.thisValue;

    // function has self context(defined context)
    const funcContext = {
        insnsList,
        insnsListIndex,
        stack,
        breakableStack,
        scopes,
        thisValue,
        debug: context.debug
    };

    // BUG: can declare variable that is same name with argument
    //      must be detected by Validator
    const argsScope = new Scope();

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
            const initContext = {
                ...funcContext,
                insnsListIndex: params[i].init
            };
            runInsns(initContext, initInsns);
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
    case I.MEMBER_ASSIGN:
        {
            const propertyName = stack.pop();
            const object = stack.pop();
            const value = stack.pop();
            object.setProperty(propertyName, value);
            // assignment operator value
            stack.push(value);
        }
        break;
    case I.PUSH_SCOPE:
        {
            const newScope = new Scope();
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
    case I.THIS:
        stack.push(context.thisValue);
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
    case I.NEW:
        {
            // TODO: make common
            const args = [];
            const arglen = insn.operand;
            for (let i = 0; i < arglen; i++) {
                args.push(stack.pop());
            }
            args.reverse();
            const target = stack.pop();

            const newObject = new JokeObject();
            newObject.setProperty('constructor', target);
            const ret = callFunction({...context, thisValue: newObject}, target, args);
            stack.push(newObject);
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
                return {type: 'JUMP_REL', offset: insn.offset};
            }
        }
        break;
    case I.JUMP:
        return {type: 'JUMP_REL', offset: insn.offset};
    case I.MAKE_FIUNCTION:
        {
            const funcInfo = stack.pop();
            const funcInsns = insnsList[funcInfo.ref];
            const func = new JokeFunction();
            func.funcInfo = {
                name: funcInfo.name,
                params: funcInfo.params,
                insns: funcInsns,
                // include scopes and insnsList to execute function
                scopes: scopes.slice(),
                insnsList,
                insnsListIndex: funcInfo.ref
            };
            stack.push(func);
        }
        break;
    case I.MAKE_OBJECT:
        {
            const obj = new JokeObject();
            stack.push(obj);
        }
        break;
    case I.PROP_DEFINE:
        {
            const value = stack.pop();
            const name = stack.pop();
            const obj = stack.pop();
            obj.setProperty(name, value);
            // repush obj for later use
            stack.push(obj);
        }
        break;
    case I.COPY_OBJECT:
        {
            const src = stack.pop();
            const dst = stack.pop();
            const names = src.getPropertyNames();
            for (const name of names) {
                dst.setProperty(name, src.getProperty(name));
            }
            // repush obj for later use
            stack.push(dst);
        }
        break;
    case I.CONTINUE:
        while (true) {
            const breakInfo = context.breakableStack.pop();
            if (breakInfo.ptrContinue) {
                return {type: 'JUMP_ABS', ptr: breakInfo.ptrContinue};
            }
        }
    case I.BREAK:
        {
            const breakInfo = context.breakableStack.pop();
            return {type: 'JUMP_ABS', ptr: breakInfo.ptrBreak};
        }
    case I.PUSH_BREAKABLE:
        {
            // compute absolute address
            let ptrBreak = context.ptr + insn.breakOffset;
            let ptrContinue;
            if (insn.continueOffset != undefined) {
                ptrContinue = context.ptr + insn.continueOffset;
            }
            context.breakableStack.push({ptrBreak, ptrContinue});
        }
        break;
    case I.POP_BREAKABLE:
        context.breakableStack.pop();
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
        const insn = insns[ptr];

        if (context.debug.traceVm) {
            console.log('VM trace:')
            console.group();

            console.log(`list#:${context.insnsListIndex}, ptr:${ptr}`);
            console.log(insn);
            console.log();

            console.log('stack:')
            console.group();
            console.log(context.stack);
            console.groupEnd();

            console.groupEnd();
            console.log();
        }

        try {
            const ret = executeInsn({...context, ptr}, insn);
            if (ret) {
                if (ret.type == 'EXIT') {
                    break;
                } else if (ret.type == 'JUMP_REL') {
                    ptr = ptr + ret.offset;
                } else if (ret.type == 'JUMP_ABS') {
                    ptr = ret.ptr;
                }
            } else {
                ptr++;
            }
        } catch (e) {
            // add srcInfo to message
            e.message += `: ${insn.srcInfo}`;
            throw e;
        }
    }
}

export default class Vm {
    constructor(debug = {}) {
        this.debug = debug;
    }

    run(insnsList, globalScope) {
        const scopes = [globalScope];
        const stack = [];
        const breakableStack = [];
        const context = {
            insnsList,
            insnsListIndex: 0,
            stack,
            breakableStack,
            scopes,
            debug: this.debug
        }
        const topInsns = insnsList[0];
        runInsns(context, topInsns);
        if (stack.length != 0) {
            throw new Error(`[JOKE] Stack must be empty: ${stack}`);
        }
    }
}

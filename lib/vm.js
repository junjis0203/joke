import * as Instruction from './instruction.js';
import { Reference, getValue, putValue, initializeReferencedBinding } from './runtime/reference.js';
import { newDeclarativeEnvironment } from './runtime/lexical_environment.js';
import { ExecutionContext, getRunningExecutionContext, pushExecutionContext, resolveBinding } from './runtime/execution_context.js';
import { functionCreate, makeConstructor, setFunctionName, setEvaluator } from './runtime/function_object.js';

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

export function callFunction(context, ref, args) {
    const func = getValue(ref);
    const argList = [];
    for (let i = 0; i < args.length; i++) {
        argList[i] = getValue(args[i]);
    }
    return func.call(undefined, argList);
}

function extractPattern(obj, patterns, scope, initialize) {
    for (const pattern of patterns) {
        // TODO: support default and nest
        if (pattern.name) {
            const value = obj.getProperty(pattern.key);
            scope.setVariable(pattern.name, value, initialize);
        }
    }
}

function executeInsn(context, insn) {
    const {insnsList, stack, scopes} = context;

    // shorten name
    const I = Instruction;

    switch (insn.command) {
    // stack operation
    case I.PUSH:
        stack.push(insn.operand);
        break;
    case I.POP:
        stack.pop();
        break;
    case I.DUP:
        stack.push(stack[stack.length - 1]);
        break;

    // variable
    case I.PUSH_SCOPE:
        {
            const context = getRunningExecutionContext();
            const oldEnv = context.lexicalEnvironment;
            const blockEnv = newDeclarativeEnvironment(oldEnv);
            context.lexicalEnvironment = blockEnv;
        }
        break;
    case I.POP_SCOPE:
        {
            const context = getRunningExecutionContext();
            const blockEnv = context.lexicalEnvironment;
            const oldEnv = blockEnv.outer;
            context.lexicalEnvironment = oldEnv;
        }
        break;
    case I.DEFINE_VARIABLE:
        {
            // Specification says variable is created before running.
            // JOKE is incompatible that.
            // Variable are refactored easily, but function declaration also uses this.
            const context = getRunningExecutionContext();
            const env = context.lexicalEnvironment;
            const envRec = env.environmentRecord;
            const objectName = insn.operand1;
            const type = insn.operand2;
            switch (type) {
            case 'const':
                envRec.createImmutableBinding(objectName, true);
                break;
            case 'let':
                envRec.createMutableBinding(objectName, false);
                break;
            }
        }
        break;
    case I.INITIALIZE_VARIABLE:
        {
            const objectName = stack.pop();
            const lhs = resolveBinding(objectName);
            const value = stack.pop();
            // TODO: set function name for anonymous function
            initializeReferencedBinding(lhs, value);
        }
        break;
    case I.EXTRACT_PATTERN:
        {
            const currentScope = scopes[0];
            const obj = stack.pop();
            extractPattern(obj, insn.operand1, currentScope, insn.operand2);
        }
        break;
    case I.SET_VARIABLE:
        {
            const objectName = stack.pop();
            const left = resolveBinding(objectName);
            const right = stack.pop();
            const value = getValue(right);
            // TODO: set function name for anonymous function
            putValue(left, value);
            // assignment operator value
            stack.push(value);
        }
        break;
    case I.LOOKUP_VARIABLE:
        {
            const objectName = stack.pop();
            const reference = resolveBinding(objectName);
            stack.push(reference);
        }
        break;
    case I.LOOKUP_THIS:
        stack.push(context.thisValue);
        break;

    // operation
    case I.UNI_OP:
        {
            const operand = getValue(stack.pop());
            const result = runUnaryOperator(insn.operator, operand);
            stack.push(result);
        }
        break;
    case I.BIN_OP:
        {
            const right = getValue(stack.pop());
            const left = getValue(stack.pop());
            const result = runBinaryOperator(insn.operator, left, right);
            stack.push(result);
        }
        break;
    case I.INCREMENT:
        // support only postfix
        if (insn.kind == 'postfix') {
            const left = stack.pop();
            const oldValue = getValue(left);
            const newValue = runBinaryOperator('+', oldValue, 1);
            putValue(left, newValue);
            stack.push(oldValue);
        }
        break;
    case I.DECREMENT:
        if (insn.kind == 'postfix') {
            const left = stack.pop();
            const oldValue = getValue(left);
            const newValue = runBinaryOperator('-', oldValue, 1);
            putValue(left, newValue);
            stack.push(oldValue);
        }
        break;

    // jump
    case I.RETURN:
        return {type: 'RETURN'};
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
    case I.BREAK:
        {
            const breakInfo = context.breakableStack.pop();
            return {type: 'JUMP_ABS', ptr: breakInfo.ptrBreak};
        }
    case I.CONTINUE:
        while (true) {
            const breakInfo = context.breakableStack.pop();
            if (breakInfo.ptrContinue) {
                return {type: 'JUMP_ABS', ptr: breakInfo.ptrContinue};
            }
        }
    case I.PUSH_TRY:
        {
            const ptr = context.ptr + insn.tryLength + 2; // jump to after POP_TRY
            context.tryStack.push({variable: insn.variable, ref: insn.ref, ptr});
        }
        break;
    case I.POP_TRY:
        context.tryStack.pop();
        break;
    case I.THROW:
        return {type: 'THROW'};

    // call
    case I.CALL:
        {
            const args = stack.pop();
            const target = stack.pop();

            const ret = callFunction(context, target, args);
            stack.push(ret.value);
            if (ret.type == 'THROW') {
                return {type: 'THROW'};
            }
        }
        break;
    case I.NEW:
        {
            const args = stack.pop();
            const target = stack.pop();

            const newObject = new JokeObject();
            newObject.setProperty('constructor', target);
            const ret = callFunction({...context, thisValue: newObject}, target, args);
            if (ret.type != 'THROW') {
                stack.push(newObject);
            } else {
                stack.push(ret.value);
                return {type: 'THROW'};
            }
        }
        break;
    case I.SUPER_CALL:
        {
            const args = stack.pop();
            const target = context.thisValue.getProperty('constructor').superClass;

            const ret = callFunction(context, target, args);
            if (ret.type != 'THROW') {
                stack.push(context.thisValue);
            } else {
                stack.push(ret.value);
                return {type: 'THROW'};
            }
        }
        break;

    // function
    case I.MAKE_FUNCTION:
        {
            const funcInfo = stack.pop();
            const funcInsns = insnsList[funcInfo.ref];
            // dirty hack
            funcInsns.index = funcInfo.ref;
            // TODO: Arrow
            const context = getRunningExecutionContext();
            const scope = context.lexicalEnvironment;
            const strict = true;
            const params = [];
            for (const param of funcInfo.params) {
                if (param.init) {
                    // derefer insns
                    params.push({name: param.name, init: param.init, initInsns: insnsList[param.init]});
                } else {
                    params.push(param)
                }
            }
            const func = functionCreate(funcInfo.kind, params, funcInsns, scope, strict);
            makeConstructor(func);
            setFunctionName(func, funcInfo.name);
            stack.push(func);
        }
        break;
    case I.SET_SUPER_CLASS:
        {
            const subClass = stack.pop();
            const superClass = stack.pop();
            subClass.superClass = superClass;
        }
        break;

    // object
    case I.MAKE_OBJECT:
        {
            const obj = new JokeObject();
            stack.push(obj);
        }
        break;
    case I.DEFINE_PROPERTY:
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

    // array
    case I.MAKE_ARRAY:
        {
            const arr = [];
            stack.push(arr);
        }
        break;
    case I.ADD_ELEMENT:
        {
            const elem = stack.pop();
            const arr = stack.pop();
            arr.push(elem);
            // repush array for later use
            stack.push(arr);
        }
        break;
    case I.COPY_ARRAY:
        {
            const src = stack.pop();
            const dst = stack.pop();
            const srcLength = src.getProperty('length');
            const dstLength = dst.getProperty('length');
            for (let i = 0; i < srcLength; i++) {
                dst.setProperty(dstLength + i, src.getProperty(i));
            }
            dst.setProperty('length', dstLength + srcLength);
            // repush array for later use
            stack.push(dst);
        }
        break;

    // property
    case I.SET_PROPERTY:
        {
            const propertyName = stack.pop();
            const object = stack.pop();
            const value = stack.pop();
            const setter = object.getProperty('set ' + propertyName.toString());
            if (setter) {
                const ret = callFunction(context, setter, [value]);
                if (ret.type == 'THROW') {
                    stack.push(ret.value);
                    return {type: 'THROW'};
                }
            } else {
                object.setProperty(propertyName, value);
            }
            // assignment operator value
            stack.push(value);
        }
        break;
    case I.GET_PROPERTY:
        {
            const propertyName = stack.pop();
            const baseReference = stack.pop();
            const baseValue = getValue(baseReference);
            const strict = true;
            const propertyReference = new Reference(baseValue, propertyName, strict);
            stack.push(propertyReference);
        }
        break;
    case I.SUPER_PROPERTY:
        {
            const propertyName = stack.pop();
            const object = context.thisValue;
            const property = object.getSuperProperty(propertyName);
            stack.push(property);
        }
        break;

    default:
        throw new Error(`[JOKE] Unknown instruction: ${insn.command}`);
    }
}

function runInsns(context, insns) {
    let ptr = 0;
    const tryStack = [];
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
            const ret = executeInsn({...context, ptr, tryStack}, insn);
            if (ret) {
                if (ret.type == 'RETURN') {
                    return {
                        type: 'RETURN',
                        value: context.stack.pop()
                    };
                } else if (ret.type == 'JUMP_REL') {
                    ptr = ptr + ret.offset;
                } else if (ret.type == 'JUMP_ABS') {
                    ptr = ret.ptr;
                } else if (ret.type == 'THROW') {
                    while (true) {
                        if (tryStack.length > 0) {
                            // execute catch clause
                            const catchInfo = tryStack.pop();
                            const catchInsns = context.insnsList[catchInfo.ref];
    
                            const e = context.stack.pop();
                            const scope = new Scope();
                            scope.defineVariable(catchInfo.variable, 'let');
                            scope.setVariable(catchInfo.variable, e);
    
                            context.scopes.unshift(scope);
                            const ret = runInsns({...context, insnsListIndex: catchInfo.ref}, catchInsns);
                            context.scopes.shift();
    
                            switch (ret.type) {
                            case 'RETURN':
                                return ret;
                            case 'THROW':
                                // throw to outer try
                                context.stack.push(ret.value);
                                continue;
                            }
    
                            // continue after catch
                            ptr = catchInfo.ptr;
                            break;
                        } else {
                            // no try. forward to caller
                            return {
                                type: 'THROW',
                                value: context.stack.pop()
                            };
                        }
                    }
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
    // no explicit return or throw
    return {
        type: 'RETURN',
        value: context.stack.pop()
    }
}

export default class Vm {
    constructor(debug = {}) {
        this.debug = debug;
    }

    run(insnsList, realm) {
        setEvaluator((insns) => {
            const stack = [];
            const breakableStack = [];
            const context = {
                insnsList,
                insnsListIndex: insns.index,
                stack,
                breakableStack,
                debug: this.debug
            };
            return runInsns(context, insns);
        });
        
        // const scopes = [globalScope];
        const globalEnv = realm.globalEnv;
        const scriptCxt = new ExecutionContext();
        scriptCxt.realm = realm;
        scriptCxt.lexicalEnvironment = globalEnv;
        pushExecutionContext(scriptCxt);

        const stack = [];
        const breakableStack = [];
        const context = {
            insnsList,
            insnsListIndex: 0,
            stack,
            breakableStack,
            // scopes,
            debug: this.debug
        }
        const topInsns = insnsList[0];
        const ret = runInsns(context, topInsns);
        if (ret.type == 'THROW') {
            throw ret.value;
        }
        if (stack.length != 0) {
            throw new Error(`[JOKE] Stack must be empty: ${stack}`);
        }
    }
}

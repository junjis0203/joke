import { getIdentifierReference } from './lexical_environment.js';

export class ExecutionContext {
    constructor() {
        this.codeEvaluationState = undefined;
        this.functionObject = null;
        this.realm = undefined;
        this.lexicalEnvironment = undefined;
    }
};

const executionContextStack = [];

export function getRunningExecutionContext() {
    return executionContextStack[executionContextStack.length - 1];
};

export function pushExecutionContext(context) {
    executionContextStack.push(context);
};

export function popExecutionContext() {
    executionContextStack.pop();
};

export function resolveBinding(name, env) {
    if (env === undefined) {
        env = getRunningExecutionContext().lexicalEnvironment;
    }
    // always strict
    const strict = true;
    return getIdentifierReference(env, name, strict);
};

export function getThisEnvironment() {
    let lex = getRunningExecutionContext().lexicalEnvironment;
    while (true) {
        const envRec = lex.environmentRecord;
        if (envRec.hasThisBinding()) {
            return envRec;
        }
        lex = lex.outer;
    }
};

export function resolveThisBinding() {
    const envRec = getThisEnvironment();
    return envRec.getThisBinding();
};

export function getNewTarget() {
    const envRec = getThisEnvironment();
    return envRec.newTarget;
};

export function getGlobalObject() {
    const ctx = getRunningExecutionContext();
    return ctx.realm.globalThis;
};

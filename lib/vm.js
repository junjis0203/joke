function lookupObject(scopes, name) {
    for (const scope of scopes) {
        const object = scope.getObject(name);
        if (object) {
            return object;
        }
    }
    throw new ReferenceError(name);
}

function executeInsn(insn, stack, scopes) {
    switch (insn.command) {
    case 'PUSH':
        stack.push(insn.operand);
        break;
    case 'DEFINE':
        {
            const currentScope = scopes[0];
            currentScope.setObject(insn.operand, undefined);
        }
        break;
    case 'ASSIGN':
        {
            const currentScope = scopes[0];
            const objectName = stack.pop();
            const value = stack.pop();
            currentScope.setObject(objectName, value);
        }
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
    }
}

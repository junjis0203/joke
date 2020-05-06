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
    case 'LOOKUP':
        {
            const propertyName = stack.pop();
            const objectName = stack.pop();
            const object = lookupObject(scopes, objectName);
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

import * as Node from './node.js';

function validateNode(context, node) {
    const { scopes } = context;

    // shorten name
    const N = Node;

    switch (node.type) {
    case N.STATEMENTS:
        {
            for (const statement of node.statements) {
                validateNode(context, statement);
            }
        }
        break;
    case N.BINDINGS:
        {
            for (const binding of node.bindings) {
                const scope = scopes[0];
                if (scope[binding.identifier]) {
                    throw new SyntaxError(`[JOKE] '${binding.identifier}' is duplicated: ${node.srcInfo}`);
                }
                scope[binding.identifier] = true;
            }
        }
        break;
    case N.BLOCK:
        {
            const newScope = {};
            scopes.unshift(newScope);
            validateNode(context, node.block);
            scopes.shift();
        }
        break;
    case N.WHILE:
    case N.FOR:
        validateNode({...context, withinIteration: true}, node.stmt);
        break;
    case N.CONTINUE:
        if (!context.withinIteration) {
            throw new SyntaxError(`[JOKE] No iteration for continue: ${node.srcInfo}`);
        }
    case N.BREAK:
        if (!context.withinIteration) {
            throw new SyntaxError(`[JOKE] No iteration for break: ${node.srcInfo}`);
        }
    }
}

export default class Validator {
    validate(node, scope) {
        const scopes = [scope];
        const context = {
            scopes
        }
        validateNode(context, node);
    }
};

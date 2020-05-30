import * as Node from './node.js';

function validateNode(node, scopes) {
    // shorten name
    const N = Node;

    switch (node.type) {
    case N.STATEMENTS:
        {
            for (const statement of node.statements) {
                validateNode(statement, scopes);
            }
        }
        break;
    case N.BINDINGS:
        {
            for (const binding of node.bindings) {
                const scope = scopes[0];
                if (scope[binding.identifier]) {
                    throw new SyntaxError(`'${binding.identifier}' is duplicated: ${node.srcInfo}`);
                }
                scope[binding.identifier] = true;
            }
        }
        break;
    case N.BLOCK:
        {
            const newScope = {};
            scopes.unshift(newScope);
            validateNode(node.block, scopes);
            scopes.shift();
        }
        break;
    }
}

export default class Validator {
    validate(node, scope) {
        const scopes = [scope];
        validateNode(node, scopes);
    }
};

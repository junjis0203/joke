function validateNode(node, scopes) {
    switch (node.type) {
    case 'STATEMENTS':
        {
            for (const statement of node.statements) {
                validateNode(statement, scopes);
            }
        }
        break;
    case 'BINDINGS':
        {
            for (const binding of node.bindings) {
                const scope = scopes[0];
                if (scope[binding.identifier]) {
                    throw new SyntaxError(`'${binding.identifier}' is duplicated`);
                }
                scope[binding.identifier] = true;
            }
        }
        break;
    case 'BLOCK':
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

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
                if (node.declarationType == 'const' && 
                    !([N.INITIALIZE, N.PATTERN_INITIALIZE].includes(binding.type))) {
                    throw new SyntaxError('[JOKE] const but no initializer');
                }

                function checkDuplicate(identifier) {
                    const scope = scopes[0];
                    if (scope[identifier]) {
                        throw new SyntaxError(`[JOKE] '${identifier}' is duplicated: ${binding.srcInfo}`);
                    }
                    scope[identifier] = true;
                }

                switch (binding.type) {
                case N.INITIALIZE:
                    checkDuplicate(binding.identifier);
                    break;
                case N.PATTERN_INITIALIZE:
                    {
                        // TODO: support nest
                        function checkPattern(properties) {
                            for (const property of properties) {
                                if (property.identifier) {
                                    checkDuplicate(property.identifier);
                                }
                            }
                        }

                        checkPattern(binding.properties);
                    }
                    break;
                }
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
    case N.SWITCH:
        {
            // check duplication in CaseClauses
            const newScope = {};
            scopes.unshift(newScope);
            for (const c of node.cases) {
                validateNode({...context, withinSwitch: true}, c.stmts);
            }
            scopes.shift();
        }
        break;
    case N.CONTINUE:
        if (!context.withinIteration) {
            throw new SyntaxError(`[JOKE] No iteration for continue: ${node.srcInfo}`);
        }
    case N.BREAK:
        if (!context.withinIteration && !context.withinSwitch) {
            throw new SyntaxError(`[JOKE] No iteration for break: ${node.srcInfo}`);
        }
    }
}

export default class Validator {
    validate(node) {
        const scopes = [{}];
        const context = {
            scopes
        }
        validateNode(context, node);
    }
};

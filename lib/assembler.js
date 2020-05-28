function assembleNode(node, insns) {
    switch (node.type) {
    case 'IDENTIFIER_REFERENCE':
        insns.push({command: 'PUSH', operand: node.identifier})
        insns.push({command: 'LOOKUP'});
        break;
    case 'STRING':
        insns.push({command: 'PUSH', operand: node.string});
        break;
    case 'NUMBER':
        insns.push({command: 'PUSH', operand: node.number});
        break;
    case 'STATEMENTS':
        {
            for (const statement of node.statements) {
                assembleNode(statement, insns);
            }
        }
        break;
    case 'UNARY_OPERATOR':
        assembleNode(node.operand, insns);
        insns.push({command: 'UNI_OP', operator: node.operator});
        break;
    case 'BINARY_OPERATOR':
        assembleNode(node.left, insns);
        assembleNode(node.right, insns);
        insns.push({command: 'BIN_OP', operator: node.operator});
        break;
    case 'INCREMENT':
        // currently expand increment at assembler
        if (node.kind == 'postfix') {
            assembleNode(node.operand, insns);
            // postfix increment's value is previous value
            insns.push({command: 'DUP'});
            insns.push({command: 'PUSH', operand: 1});
            insns.push({command: 'BIN_OP', operator: '+'});
            // TODO: member
            insns.push({command: 'PUSH', operand: node.operand.identifier});
            insns.push({command: 'ASSIGN'});
            // ASSIGN left assigned value but pop it to set previous value on stack top
            insns.push({command: 'POP'});
        }
        break;
    case 'DECREMENT':
        if (node.kind == 'postfix') {
            assembleNode(node.operand, insns);
            insns.push({command: 'DUP'});
            insns.push({command: 'PUSH', operand: 1});
            insns.push({command: 'BIN_OP', operator: '-'});
            insns.push({command: 'PUSH', operand: node.operand.identifier});
            insns.push({command: 'ASSIGN'});
            insns.push({command: 'POP'});
        }
        break;
    case 'EXPRESSION_STATEMENT':
        assembleNode(node.expression, insns);
        insns.push({command: 'POP'});
        break;
    case 'MEMBER':
        assembleNode(node.object, insns);
        insns.push({command: 'PUSH', operand: node.property});
        insns.push({command: 'MEMBER'});
        break;
    case 'CALL':
        {
            assembleNode(node.target, insns);
            for (const arg of node.arguments) {
                assembleNode(arg, insns);
            }
            insns.push({command: 'CALL', operand: node.arguments.length});
        }
        break;
    case 'BINDINGS':
        {
            for (const binding of node.bindings) {
                insns.push({command: 'DEFINE', operand1: binding.identifier, operand2: node.declarationType});
                if (binding.initializer) {
                    assembleNode(binding, insns);
                }
            }
        }
        break;
    case 'INITIALIZE':
        assembleNode(node.initializer, insns);
        insns.push({command: 'PUSH', operand: node.identifier});
        insns.push({command: 'INITIALIZE'});
        break;
    case 'ASSIGNMENT':
        assembleNode(node.right, insns);
        insns.push({command: 'PUSH', operand: node.left.identifier});
        insns.push({command: 'ASSIGN'});
        break;
    case 'BLOCK':
        insns.push({command: 'PUSH_SCOPE'});
        assembleNode(node.block, insns);
        insns.push({command: 'POP_SCOPE'});
        break;
    default:
        throw new Error(`Unknown node type: ${node.type}`);
    }
}

export default class Assembler {
    assemble(node) {
        const insns = [];
        assembleNode(node, insns);
        return insns;
    }
}

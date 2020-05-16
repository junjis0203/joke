function assembleNode(node, insns) {
    switch (node.type) {
    case 'IDENTIFIER_REFERENCE':
        insns.push({command: 'PUSH', operand: node.identifier})
        insns.push({command: 'LOOKUP'});
        break;
    case 'STRING':
        insns.push({command: 'PUSH', operand: node.string});
        break;
    case 'STATEMENTS':
        {
            for (const statement of node.statements) {
                assembleNode(statement, insns);
            }
        }
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
                insns.push({command: 'DEFINE', operand: binding.identifier});
                if (binding.initializer) {
                    assembleNode(binding, insns);
                }
            }
        }
        break;
    case 'INITIALIZE':
        assembleNode(node.initializer, insns);
        insns.push({command: 'PUSH', operand: node.identifier});
        insns.push({command: 'ASSIGN'});
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

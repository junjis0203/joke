function assembleNode(node, insns) {
    switch (node.type) {
    case 'IDENTIFIER':
        insns.push({command: 'PUSH', operand: node.identifier})
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
        insns.push({command: 'LOOKUP'});
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
    }
}

export default class Assembler {
    assemble(node) {
        const insns = [];
        assembleNode(node, insns);
        return insns;
    }
}

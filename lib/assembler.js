import * as Node from './node.js';
import * as Instruction from './instruction.js';

function assembleNodeEx(node, insns, insnsList) {
    // shorten name
    const N = Node;
    const I = Instruction;

    // define function like preprocessor to reduce redundant code
    function makeInstruction(command, args) {
        insns.push({command, ...args, srcInfo: node.srcInfo});
    }

    // pass insnsList implicitly. bad idea?
    function assembleNode(node, insns) {
        assembleNodeEx(node, insns, insnsList);
    }

    switch (node.type) {
    case N.IDENTIFIER_REFERENCE:
        makeInstruction(I.PUSH, {operand: node.identifier});
        makeInstruction(I.LOOKUP);
        break;
    case N.STRING:
        makeInstruction(I.PUSH, {operand: node.string});
        break;
    case N.NUMBER:
        makeInstruction(I.PUSH, {operand: node.number});
        break;
    case N.STATEMENTS:
        {
            for (const statement of node.statements) {
                assembleNode(statement, insns);
            }
        }
        break;
    case N.UNARY_OPERATOR:
        assembleNode(node.operand, insns);
        makeInstruction(I.UNI_OP, {operator: node.operator});
        break;
    case N.BINARY_OPERATOR:
        assembleNode(node.left, insns);
        // custom operations is need
        if (node.operator == '&&' || node.operator == '||') {
            // dup for operation result
            makeInstruction(I.DUP);
            const rightInsns = [];
            assembleNode(node.right, rightInsns);
            if (node.operator == '&&') {
                makeInstruction(I.UNI_OP, {operator: '!'});
            }
            makeInstruction(I.JUMP_IF, {offset: rightInsns.length+2});
            // dupped value is no need if false
            makeInstruction(I.POP);
            insns.splice(insns.length, 0, ...rightInsns); 
        } else {
            assembleNode(node.right, insns);
            makeInstruction(I.BIN_OP, {operator: node.operator});
        }
        break;
    case N.INCREMENT:
    case N.DECREMENT:
        // currently expand increment at assembler
        if (node.kind == 'postfix') {
            assembleNode(node.operand, insns);
            // postfix increment's value is previous value
            makeInstruction(I.DUP);
            makeInstruction(I.PUSH, {operand: 1});
            if (node.type == N.INCREMENT) {
                makeInstruction(I.BIN_OP, {operator: '+'});
            } else if (node.type == N.DECREMENT) {
                makeInstruction(I.BIN_OP, {operator: '-'});
            }
            // TODO: member
            makeInstruction(I.PUSH, {operand: node.operand.identifier});
            makeInstruction(I.ASSIGN);
            // ASSIGN left assigned value but pop it to set previous value on stack top
            makeInstruction(I.POP);
        }
        break;
    case N.EXPRESSION_STATEMENT:
        assembleNode(node.expression, insns);
        makeInstruction(I.POP);
        break;
    case N.MEMBER:
        assembleNode(node.object, insns);
        makeInstruction(I.PUSH, {operand: node.property});
        makeInstruction(I.MEMBER);
        break;
    case N.CALL:
        {
            assembleNode(node.target, insns);
            for (const arg of node.arguments) {
                assembleNode(arg, insns);
            }
            makeInstruction(I.CALL, {operand: node.arguments.length});
        }
        break;
    case N.BINDINGS:
        {
            for (const binding of node.bindings) {
                makeInstruction(I.DEFINE, {operand1: binding.identifier, operand2: node.declarationType});
                if (binding.initializer) {
                    assembleNode(binding, insns);
                }
            }
        }
        break;
    case N.INITIALIZE:
        assembleNode(node.initializer, insns);
        makeInstruction(I.PUSH, {operand: node.identifier});
        makeInstruction(I.INITIALIZE);
        break;
    case N.ASSIGNMENT:
        assembleNode(node.right, insns);
        makeInstruction(I.PUSH, {operand: node.left.identifier});
        makeInstruction(I.ASSIGN);
        break;
    case N.BLOCK:
        makeInstruction(I.PUSH_SCOPE);
        assembleNode(node.block, insns);
        makeInstruction(I.POP_SCOPE);
        break;
    case N.IF:
        {
            assembleNode(node.expr, insns);
            const thenInsns = [];
            assembleNode(node.thenStmt, thenInsns);
            const elseInsns = [];
            if (node.elseStmt) {
                assembleNode(node.elseStmt, elseInsns);
            }
            // jump to thenInsns
            makeInstruction(I.JUMP_IF, {offset: 2});
            // jump to elseInsns
            makeInstruction(I.JUMP, {offset: thenInsns.length+2});
            // embed thenInsns
            insns.splice(insns.length, 0, ...thenInsns); 
            // jump to last
            makeInstruction(I.JUMP, {offset: elseInsns.length+1});
            // embed elseInsns
            insns.splice(insns.length, 0, ...elseInsns);
        }
        break;
    case N.WHILE:
        {
            const len1 = insns.length;
            assembleNode(node.expr, insns);
            const len2 = insns.length;
            const lenExpr = len2 - len1;
            const stmtInsns = [];
            assembleNode(node.stmt, stmtInsns);
            makeInstruction(I.UNI_OP, {operator: '!'});
            makeInstruction(I.JUMP_IF, {offset: stmtInsns.length+2});
            insns.splice(insns.length, 0, ...stmtInsns);
            makeInstruction(I.JUMP, {offset: -(lenExpr + stmtInsns.length + 2)});
        }
        break;
    case N.RETURN:
        if (node.expr) {
            assembleNode(node.expr, insns);
        } else {
            makeInstruction(I.PUSH, {operand: undefined});
        }
        makeInstruction(I.RETURN);
        break;
    case N.FUNCTION_DECLARATION:
    case N.FUNCTION_EXPRESSION:
        {
            const funcInsns = [];
            assembleNode(node.body, funcInsns);
            const funcId = insnsList.length;
            insnsList.push(funcInsns);

            const params = [];
            for (const p of node.params) {
                if (p.type == N.IDENTIFIER) {
                    params.push({name: p.identifier});
                } else if (p.type == N.INITIALIZE) {
                    const initInsns = [];
                    assembleNode(p.initializer, initInsns);
                    const initId = insnsList.length;
                    insnsList.push(initInsns);
                    params.push({name: p.identifier, init: initId});
                }
            }
            makeInstruction(I.PUSH, {operand: {name: node.name, params, ref: funcId}});
            makeInstruction(I.MAKE_FIUNCTION);
            if (node.type == N.FUNCTION_DECLARATION) {
                makeInstruction(I.DEFINE, {operand1: node.name, operand2: 'let'});
                makeInstruction(I.PUSH, {operand: node.name});
                makeInstruction(I.INITIALIZE);
            }
        }
        break;
    default:
        throw new Error(`[JOKE] Unknown node type: ${node.type}`);
    }
}

export default class Assembler {
    assemble(node) {
        const insnsList = [];
        const topInsns = [];
        insnsList.push(topInsns);
        assembleNodeEx(node, topInsns, insnsList);
        return insnsList;
    }
}

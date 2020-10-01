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

    function embedInsns(otherInsns) {
        insns.splice(insns.length, 0, ...otherInsns); 
    }

    // pass insnsList implicitly. bad idea?
    function assembleNode(node, insns) {
        assembleNodeEx(node, insns, insnsList);
    }

    function makeAssignInstructions(target) {
        switch (target.type) {
        case N.IDENTIFIER_REFERENCE:
            makeInstruction(I.PUSH, {operand: target.identifier});
            makeInstruction(I.SET_VARIABLE);
            break;
        case N.PROPERTY_REF:
            assembleNode(target.object, insns);
            makeInstruction(I.PUSH, {operand: target.property});
            makeInstruction(I.SET_PROPERTY);
            break;
        case N.ARRAY_REF:
            assembleNode(target.object, insns);
            assembleNode(target.index, insns);
            makeInstruction(I.SET_PROPERTY);
            break;
        }
    }

    function makeArguments(args) {
        makeInstruction(I.MAKE_ARRAY);
        for (const arg of args) {
            if (arg.type == N.SPREAD) {
                assembleNode(arg.expr, insns);
                makeInstruction(I.COPY_ARRAY);
            } else {
                assembleNode(arg, insns);
                makeInstruction(I.ADD_ELEMENT);
            }
        }
    }

    function makeFunction(node) {
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
    }

    switch (node.type) {
    // primary
    case N.NUMBER:
        makeInstruction(I.PUSH, {operand: node.number});
        break;
    case N.STRING:
        makeInstruction(I.PUSH, {operand: node.string});
        break;
    case N.IDENTIFIER_REFERENCE:
        makeInstruction(I.PUSH, {operand: node.identifier});
        makeInstruction(I.LOOKUP_VARIABLE);
        break;
    case N.THIS:
        makeInstruction(I.LOOKUP_THIS);
        break;
    case N.OBJECT:
        {
            makeInstruction(I.MAKE_OBJECT);
            for (const prop of node.props) {
                switch (prop.type) {
                case N.PROPERTY_NAME:
                    if (prop.name.type == N.IDENTIFIER) {
                        makeInstruction(I.PUSH, {operand: prop.name.identifier});
                    } else {
                        assembleNode(prop.name, insns);
                    }
                    assembleNode(prop.expr, insns);
                    makeInstruction(I.DEFINE_PROPERTY);
                    break;
                case N.SPREAD:
                    assembleNode(prop.expr, insns);
                    makeInstruction(I.COPY_OBJECT);
                    break;
                }
            }
        }
        break;
    case N.ARRAY:
        {
            makeInstruction(I.MAKE_ARRAY);
            for (const element of node.elements) {
                switch (element.type) {
                case N.SPREAD:
                    assembleNode(element.expr, insns);
                    makeInstruction(I.COPY_ARRAY);
                    break;
                default:
                    assembleNode(element, insns);
                    makeInstruction(I.ADD_ELEMENT);
                    break;
                }
            }
        }
        break;

    // object
    case N.PROPERTY_REF:
        assembleNode(node.object, insns);
        makeInstruction(I.PUSH, {operand: node.property});
        makeInstruction(I.GET_PROPERTY);
        break;
    case N.ARRAY_REF:
        assembleNode(node.object, insns);
        assembleNode(node.index, insns);
        makeInstruction(I.GET_PROPERTY);
        break;
    case N.SUPER_PROPERTY:
        makeInstruction(I.PUSH, {operand: node.property});
        makeInstruction(I.SUPER_PROPERTY);
        break;

    // call
    case N.CALL:
        assembleNode(node.target, insns);
        makeArguments(node.arguments);
        makeInstruction(I.CALL);
        break;
    case N.SUPER_CALL:
        makeArguments(node.arguments);
        makeInstruction(I.SUPER_CALL);
        break;
    case N.NEW:
        assembleNode(node.target, insns);
        makeArguments(node.arguments);
        makeInstruction(I.NEW);
        break;

    // operation
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
            makeInstruction(I.JUMP_IF, {offset: rightInsns.length + 2});
            // dupped value is no need if false
            makeInstruction(I.POP);
            embedInsns(rightInsns); 
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
            makeAssignInstructions(node.operand);
            // ASSIGN left assigned value but pop it to set previous value on stack top
            makeInstruction(I.POP);
        }
        break;
    case N.ASSIGNMENT:
        assembleNode(node.right, insns);
        makeAssignInstructions(node.left);
        break;
    case N.COMMA:
        assembleNode(node.left, insns);
        makeInstruction(I.POP);
        assembleNode(node.right, insns);
        break;

    // statement
    case N.EXPRESSION_STATEMENT:
        assembleNode(node.expression, insns);
        makeInstruction(I.POP);
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
            makeInstruction(I.JUMP, {offset: thenInsns.length + 2});
            // embed thenInsns
            embedInsns(thenInsns); 
            // jump to last
            makeInstruction(I.JUMP, {offset: elseInsns.length + 1});
            // embed elseInsns
            embedInsns(elseInsns);
        }
        break;
    case N.SWITCH:
        {
            assembleNode(node.expr, insns);
            const labelInfoList = [];
            let existDefault = false;
            for (const c of node.cases) {
                const exprInsns = [];
                if (c.expr) {
                    assembleNode(c.expr, exprInsns);
                }
                const stmtsInsns = []
                assembleNode(c.stmts, stmtsInsns);
                labelInfoList.push({
                    default: c.default,
                    exprInsns,
                    stmtsInsns,
                });
                existDefault = existDefault || c.default;
            }

            // calculate jump offset(any cool implementation?)
            for (let i = 0; i < labelInfoList.length; i++) {
                let insnsCount = 0;
                if (!labelInfoList[i].default) {
                    for (let j = i + 1; j < labelInfoList.length; j++) {
                        if (!labelInfoList[j].default) {
                            insnsCount += labelInfoList[j].exprInsns.length + 3;
                        }
                    }
                    insnsCount += 1;
                }
                for (let j = 0; j < i; j++) {
                    insnsCount += labelInfoList[j].stmtsInsns.length;
                    if (!labelInfoList[j].default) {
                        insnsCount += 1;
                    }
                }
                labelInfoList[i].stmtsOffset = insnsCount + 1;
            }

            // separate calculation of breakOffset to make readable
            let breakOffset = 2; // to POP_SCOPE
            for (let i = 0; i < labelInfoList.length; i++) {
                const labelInfo = labelInfoList[i];
                if (!labelInfo.default) {
                    breakOffset += labelInfo.exprInsns.length + 3;
                }
                breakOffset += labelInfo.stmtsInsns.length;
                if (!labelInfo.default) {
                    breakOffset += 1;
                }
            }
            breakOffset += 1; // for default jump

            const labelInfoListWithoutDefault = labelInfoList.filter(c => !c.default);
            const labelInfoForDefault = labelInfoList.find(c => c.default);

            makeInstruction(I.PUSH_SCOPE);
            makeInstruction(I.PUSH_BREAKABLE, {breakOffset});
            for (const labelInfo of labelInfoListWithoutDefault) {
                // dup switch.expr result for remain case
                makeInstruction(I.DUP);
                embedInsns(labelInfo.exprInsns);
                makeInstruction(I.BIN_OP, {operator: '==='});
                makeInstruction(I.JUMP_IF, {offset: labelInfo.stmtsOffset});
            }
            if (labelInfoForDefault) {
                // jump to default label if no match
                makeInstruction(I.JUMP, {offset: labelInfoForDefault.stmtsOffset});
            } else {
                // jump to switch end
                let offset = labelInfoList.reduce((sum, curr) => sum + curr.stmtsInsns.length + 1, 0);
                offset += 1;
                makeInstruction(I.JUMP, {offset});
            }
            for (const labelInfo of labelInfoList) {
                if (!labelInfo.default) {
                    // pop duplicated switch.expr result
                    makeInstruction(I.POP);
                }
                embedInsns(labelInfo.stmtsInsns);
            }
            makeInstruction(I.POP_BREAKABLE);
            makeInstruction(I.POP_SCOPE);
            // pop unused switch.expr result
            if (!labelInfoForDefault) {
                makeInstruction(I.POP);
            }
        }
        break;
    case N.WHILE:
        {
            const exprInsns = [];
            assembleNode(node.expr, exprInsns);
            const stmtInsns = [];
            assembleNode(node.stmt, stmtInsns);

            const breakOffset = exprInsns.length + stmtInsns.length + 5; // to after POP_BREAKABLE
            const continueOffset = 0;
            makeInstruction(I.PUSH_BREAKABLE, {breakOffset, continueOffset});

            embedInsns(exprInsns);
            makeInstruction(I.UNI_OP, {operator: '!'});
            makeInstruction(I.JUMP_IF, {offset: stmtInsns.length + 2});

            embedInsns(stmtInsns);
            makeInstruction(I.JUMP, {offset: -(exprInsns.length + stmtInsns.length + 2)});

            makeInstruction(I.POP_BREAKABLE);
        }
        break;
    case N.FOR:
        {
            // always push/pop scope for simplicity. bad idea?
            makeInstruction(I.PUSH_SCOPE);
            if (node.decr) {
                assembleNode(node.decr, insns);
            } else if (node.expr1) {
                assembleNode(node.expr1, insns);
                // need to pop expr1 result
                makeInstruction(I.POP);
            }

            const expr2Insns = [];
            if (node.expr2) {
                assembleNode(node.expr2, expr2Insns);
            }

            const stmtInsns = [];
            assembleNode(node.stmt, stmtInsns);

            const expr3Insns = [];
            if (node.expr3) {
                assembleNode(node.expr3, expr3Insns);
            }

            let breakOffset = stmtInsns.length + 3; // to POP_SCOPE
            let continueOffset = stmtInsns.length + 1; // to expr3
            if (node.expr2) {
                breakOffset += expr2Insns.length + 2;
                continueOffset += expr2Insns.length + 2;
            }
            if (node.expr3) {
                breakOffset += expr3Insns.length + 1;
            }
            makeInstruction(I.PUSH_BREAKABLE, {breakOffset, continueOffset});

            if (node.expr2) {
                embedInsns(expr2Insns);
                makeInstruction(I.UNI_OP, {operator: '!'});
                makeInstruction(I.JUMP_IF, {offset: stmtInsns.length + expr3Insns.length + 3});
            }

            embedInsns(stmtInsns);

            if (node.expr3) {
                embedInsns(expr3Insns);
                // need to pop expr3 result
                makeInstruction(I.POP);
            }

            let jumpOffset = -stmtInsns.length;
            if (node.expr2) {
                jumpOffset -= (expr2Insns.length + 2);
            }
            if (node.expr3) {
                jumpOffset -= (expr3Insns.length + 1);
            }
            makeInstruction(I.JUMP, {offset: jumpOffset});

            makeInstruction(I.POP_BREAKABLE);

            makeInstruction(I.POP_SCOPE);
        }
        break;
    case N.FOR_OF:
        {
            const stmtInsns = [];
            assembleNode(node.stmt, stmtInsns);

            // 1. GetIterator(expr2)
            assembleNode(node.expr2, insns);
            makeInstruction(I.PUSH, {operand: Symbol.iterator});
            makeInstruction(I.GET_PROPERTY);
            makeInstruction(I.MAKE_ARRAY);
            makeInstruction(I.CALL);

            // break/continue info
            const breakOffset = stmtInsns.length + 19; // to after POP_BREAKABLE
            const continueOffset = 0;
            makeInstruction(I.PUSH_BREAKABLE, {breakOffset, continueOffset});

            // 2. IteratorStep(iterator)
            makeInstruction(I.DUP);
            makeInstruction(I.PUSH, {operand: 'next'});
            makeInstruction(I.GET_PROPERTY);
            makeInstruction(I.MAKE_ARRAY);
            makeInstruction(I.CALL);
            makeInstruction(I.DUP); // dup for value
            makeInstruction(I.PUSH, {operand: 'done'});
            makeInstruction(I.GET_PROPERTY);

            // 3. jump to 7. if done is true
            makeInstruction(I.JUMP_IF, {offset: stmtInsns.length + 9});

            // 4. bind IteratorValue(nextResult)
            makeInstruction(I.PUSH, {operand: 'value'});
            makeInstruction(I.GET_PROPERTY);
            makeInstruction(I.PUSH_SCOPE);
            makeInstruction(I.DEFINE_VARIABLE, {operand1: node.decr.identifier, operand2: 'const'});
            makeInstruction(I.PUSH, {operand: node.decr.identifier});
            makeInstruction(I.INITIALIZE_VARIABLE);

            // 5. run stmt
            embedInsns(stmtInsns);

            // 6. jump to 2.
            makeInstruction(I.POP_SCOPE);
            makeInstruction(I.JUMP, {offset: -stmtInsns.length - 16});

            makeInstruction(I.POP_BREAKABLE);

            // 7. pop iterator
            makeInstruction(I.POP); // IteratorResult
            makeInstruction(I.POP); // Iterator
        }
        break;
    case N.BREAK:
        makeInstruction(I.BREAK);
        break;
    case N.CONTINUE:
        makeInstruction(I.CONTINUE);
        break;
    case N.RETURN:
        if (node.expr) {
            assembleNode(node.expr, insns);
        } else {
            makeInstruction(I.PUSH, {operand: undefined});
        }
        makeInstruction(I.RETURN);
        break;
    case N.STATEMENTS:
        {
            for (const statement of node.statements) {
                assembleNode(statement, insns);
            }
        }
        break;
    case N.BLOCK:
        makeInstruction(I.PUSH_SCOPE);
        assembleNode(node.block, insns);
        makeInstruction(I.POP_SCOPE);
        break;

    // variable
    case N.BINDINGS:
        {
            for (const binding of node.bindings) {
                makeInstruction(I.DEFINE_VARIABLE, {operand1: binding.identifier, operand2: node.declarationType});
                if (binding.initializer) {
                    assembleNode(binding, insns);
                }
            }
        }
        break;
    case N.INITIALIZE:
        assembleNode(node.initializer, insns);
        makeInstruction(I.PUSH, {operand: node.identifier});
        makeInstruction(I.INITIALIZE_VARIABLE);
        break;

    // function
    case N.FUNCTION_DECLARATION:
    case N.FUNCTION_EXPRESSION:
    case N.ARROW_FUNCTION: // TODO: lexical this
        {
            makeFunction(node);
            if (node.type == N.FUNCTION_DECLARATION) {
                makeInstruction(I.DEFINE_VARIABLE, {operand1: node.name, operand2: 'let'});
                makeInstruction(I.PUSH, {operand: node.name});
                makeInstruction(I.INITIALIZE_VARIABLE);
            }
        }
        break;

    // class
    case N.CLASS_DECLARATION:
        {
            // override constructor name
            makeFunction({...node.constructor, name: node.name});
            makeInstruction(I.DEFINE_VARIABLE, {operand1: node.name, operand2: 'const'});
            makeInstruction(I.PUSH, {operand: node.name});
            makeInstruction(I.INITIALIZE_VARIABLE);

            if (node.superClass) {
                assembleNode(node.superClass, insns);
                makeInstruction(I.PUSH, {operand: node.name});
                makeInstruction(I.LOOKUP_VARIABLE);
                makeInstruction(I.SET_SUPER_CLASS);
            }

            for (const m of node.methods) {
                makeFunction(m);

                // TODO: cache
                makeInstruction(I.PUSH, {operand: node.name});
                makeInstruction(I.LOOKUP_VARIABLE);

                makeInstruction(I.PUSH, {operand: 'prototype'});
                makeInstruction(I.GET_PROPERTY);

                let name = m.name;
                switch (m.type) {
                case N.GETTER_METHOD_DEFINITION:
                    name = "get " + name;
                    break;
                case N.SETTER_METHOD_DEFINITION:
                    name = "set " + name;
                    break;
                }
                makeInstruction(I.PUSH, {operand: name});
                makeInstruction(I.SET_PROPERTY);
                makeInstruction(I.POP);
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

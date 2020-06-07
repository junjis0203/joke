import * as Token from './token.js';
import * as Node from './node.js';

function checkCharToken(token, c) {
    return token.type == Token.CHAR && token.char == c;
}

function assertCharToken(scanner, c) {
    if (checkCharToken(scanner.token, c)) {
        scanner.next();
    } else {
        throw new SyntaxError(`[JOKE] No ${c} at ${scanner.tokenPosInfo()}`);
    }
}

function assertSemicolon(scanner) {
    assertCharToken(scanner, ';');
}

function skipCharToken(scanner, c) {
    if (checkCharToken(scanner.token, c)) {
        scanner.next();
    }
}

function checkKeywordToken(token, keyword) {
    return token.type == Token.KEYWORD && token.keyword == keyword;
}

function NumericLiteral(scanner) {
    if (scanner.token.type == Token.NUMBER) {
        const node = {
            type: Node.NUMBER,
            number: scanner.token.number,
            srcInfo: scanner.tokenPosInfo()
        }
        scanner.next();
        return node;
    }
}

function StringLiteral(scanner) {
    if (scanner.token.type == Token.STRING) {
        const node = {
            type: Node.STRING,
            string: scanner.token.string,
            srcInfo: scanner.tokenPosInfo()
        }
        scanner.next();
        return node;
    }
}

function Literal(scanner) {
    let node;
    node = NumericLiteral(scanner);
    if (node) {
        return node;
    }
    node = StringLiteral(scanner);
    if (node) {
        return node;
    }
    // TODO: other literal
}

function Identifier(scanner) {
    if (scanner.token.type == Token.IDENTIFIER) {
        const node = {
            type: Node.IDENTIFIER,
            identifier: scanner.token.identifier,
            srcInfo: scanner.tokenPosInfo()
        }
        scanner.next();
        return node;
    }
}

function IdentifierReference(scanner) {
    let node = Identifier(scanner);
    if (node) {
        node = {
            type: Node.IDENTIFIER_REFERENCE,
            identifier: node.identifier,
            srcInfo: node.srcInfo
        }
    }
    return node;
    // support yield?
}

function PrimaryExpression(scanner) {
    let node;
    if (checkCharToken(scanner.token, '(')) {
        scanner.next();
        node = Expression(scanner);
        assertCharToken(scanner, ')');
        return node;
    }
    node = IdentifierReference(scanner);
    if (node) {
        return node;
    }
    node = Literal(scanner);
    if (node) {
        return node;
    }
    // TODO: other varietion
}

function MemberExpression(scanner) {
    let node = PrimaryExpression(scanner);
    if (checkCharToken(scanner.token, '.')) {
        scanner.next();
        if (scanner.token.type != Token.IDENTIFIER) {
            throw new SyntaxError(`[JOKE] No identifier at ${scanner.tokenPosInfo()}`);
        }
        node = {
            type: Node.MEMBER,
            object: node,
            property: scanner.token.identifier,
            srcInfo: node.srcInfo
        }
        scanner.next();
    }
    // TODO: other varietion
    return node;
}

function NewExpression(scanner) {
    let node = MemberExpression(scanner);
    if (node) {
        return node;
    }
    // TODO?
}

function ArgumentList(scanner) {
    // TODO: spread

    // preserve first argument pos as arguments node's pos
    const srcInfo = scanner.tokenPosInfo();
    // cannot use 'arguments' in strict mode
    const args = [];
    while (true) {
        const arg = AssignmentExpression(scanner);
        if (arg) {
            args.push(arg);
        } else {
            break;
        }
        skipCharToken(scanner, ',');
    }
    const node = {
        type: Node.ARGUMENTS,
        arguments: args,
        srcInfo
    }
    return node;
}

function Arguments(scanner) {
    assertCharToken(scanner, '(');
    const node = ArgumentList(scanner);
    assertCharToken(scanner, ')');
    return node;
}

function LeftHandSideExpression(scanner) {
    let node;
    node = NewExpression(scanner);
    while (true) {
        if (checkCharToken(scanner.token, '(')) {
            // treat as not NewExpression but CallExpression
            const args = Arguments(scanner);
            node = {
                type: Node.CALL,
                target: node,
                arguments: args.arguments,
                srcInfo: node.srcInfo // copy
            };
        } else if (checkCharToken(scanner.token, '.')) {
            // CallExpression . IdentifierName
            scanner.next();
            if (scanner.token.type != Token.IDENTIFIER) {
                throw new SyntaxError(`[JOKE] No identifier at ${scanner.tokenPosInfo()}`);
            }
            node = {
                type: Node.MEMBER,
                object: node,
                property: scanner.token.identifier,
                srcInfo: node.srcInfo
            }
            scanner.next();
        } else {
            break;
        }
    }
    return node;
}

function PostfixExpression(scanner) {
    let node = LeftHandSideExpression(scanner);
    if (checkCharToken(scanner.token, '++') || checkCharToken(scanner, '--')) {
        // TODO: support array type access
        if (node.type != Node.IDENTIFIER_REFERENCE && node.type != Node.MEMBER) {
            throw new ReferenceError('[JOKE] Invalid left hand side in postfix operation');
        }
        if (checkCharToken(scanner.token, '++')) {
            node = {
                type: Node.INCREMENT,
                kind: 'postfix',
                operand: node,
                srcInfo: node.srcInfo
            };
        }
        // don't need check but for readable
        else if (checkCharToken(scanner.token, '--')) {
            node = {
                type: Node.DECREMENT,
                kind: 'postfix',
                operand: node,
                srcInfo: node.srcInfo
            };
        }
        scanner.next();
    }
    return node;
}

function UnaryExpression(scanner) {
    let node;
    if (checkCharToken(scanner.token, '-')) {
        const operator = scanner.token.char;
        scanner.next();
        const operand = PostfixExpression(scanner);
        node = {
            type: Node.UNARY_OPERATOR,
            operator,
            operand,
            srcInfo: operand.srcInfo
        }
        return node;
    }
    return PostfixExpression(scanner);
    // TODO
}

function MultiplicativeExpression(scanner) {
    let node = UnaryExpression(scanner);
    while (checkCharToken(scanner.token, '*') || checkCharToken(scanner.token, '/') || checkCharToken(scanner.token, '%')) {
        const operator = scanner.token.char;
        scanner.next();
        const right = UnaryExpression(scanner);
        node = {
            type: Node.BINARY_OPERATOR,
            operator,
            left: node,
            right,
            srcInfo: node.srcInfo
        };
    }
    return node;
}

function AdditiveExpression(scanner) {
    let node = MultiplicativeExpression(scanner);
    while (checkCharToken(scanner.token, '+') || checkCharToken(scanner.token, '-')) {
        const operator = scanner.token.char;
        scanner.next();
        const right = MultiplicativeExpression(scanner);
        node = {
            type: Node.BINARY_OPERATOR,
            operator,
            left: node,
            right,
            srcInfo: node.srcInfo
        };
    }
    return node;
}

function RelationalExpression(scanner) {
    // unsupport bitwise operator and jump to additive expression
    return AdditiveExpression(scanner);
    // TODO
}

function EqualityExpression(scanner) {
    return RelationalExpression(scanner);
    // TODO
}

function LogicalANDExpression(scanner) {
    // unsupport bitwise operator and jump to equality expression
    return EqualityExpression(scanner);
    // TODO
}

function LogicalORExpression(scanner) {
    return LogicalANDExpression(scanner);
    // TODO
}

function ConditionalExpression(scanner) {
    return LogicalORExpression(scanner);
    // TODO
}

function AssignmentExpression(scanner) {
    const state = scanner.saveState();
    let node = ConditionalExpression(scanner);
    if (node) {
        if (checkCharToken(scanner.token, '=')) {
            // backtrack and reparse as LeftHandSideExpression
            scanner.restoreState(state);
            node = LeftHandSideExpression(scanner);

            // TODO: ObjectLiteral and ArrayLiteral 
            if (node.type != Node.IDENTIFIER_REFERENCE) {
                throw new ReferenceError('[JOKE] Invalid left hand side in assignment');
            }

            scanner.next();
            const right = AssignmentExpression(scanner);
            node = {
                type: Node.ASSIGNMENT,
                left: node,
                right,
                srcInfo: node.srcInfo
            };
        } else if (
            // TODO: readable but too redundant
            checkCharToken(scanner.token, '+=') ||
            checkCharToken(scanner.token, '-=') ||
            checkCharToken(scanner.token, '*=') ||
            checkCharToken(scanner.token, '/=') ||
            checkCharToken(scanner.token, '%=')
        ) {
            const operator = scanner.token.char[0];

            scanner.restoreState(state);
            node = LeftHandSideExpression(scanner);

            // TODO: ObjectLiteral and ArrayLiteral 
            if (node.type != Node.IDENTIFIER_REFERENCE) {
                throw new ReferenceError('[JOKE] Invalid left hand side in assignment');
            }
            const lhs = node;

            scanner.next();
            const right = AssignmentExpression(scanner);

            // expand
            node = {
                type: Node.BINARY_OPERATOR,
                operator,
                left: lhs,
                right,
                srcInfo: lhs.srcInfo
            }
            node = {
                type: Node.ASSIGNMENT,
                left: lhs,
                right: node,
                srcInfo: lhs.srcInfo
            };
        }
        return node;
    }
    // TODO
}

function Expression(scanner) {
    return AssignmentExpression(scanner);
    // support comma?
}

function Block(scanner) {
    if (checkCharToken(scanner.token, '{')) {
        const srcInfo = scanner.tokenPosInfo();
        scanner.next();
        let node = StatementList(scanner);
        assertCharToken(scanner, '}');
        node = {
            type: Node.BLOCK,
            block: node,
            srcInfo
        };
        return node;
    }
}

function BlockStatement(scanner) {
    return Block(scanner);
}

function ExpressionStatement(scanner) {
    // TODO: check current token is not {, function, class, let [
    let node = Expression(scanner);
    if (node) {
        node = {
            type: Node.EXPRESSION_STATEMENT,
            expression: node,
            srcInfo: node.srcInfo
        };
        assertSemicolon(scanner);
    }
    return node;
}

function ReturnStatement(scanner) {
    if (checkKeywordToken(scanner.token, 'return')) {
        const srcInfo = scanner.tokenPosInfo();
        scanner.next();
        let expr;
        if (!checkCharToken(scanner.token, ';')) {
            // Specification says [no LineTerminator here]
            expr = Expression(scanner);
        }
        assertSemicolon(scanner);
        const node = {
            type: Node.RETURN,
            expr,
            srcInfo
        };
        return node;
    }
}

function Statement(scanner) {
    let node;
    node = BlockStatement(scanner);
    if (node) {
        return node;
    }
    node = ExpressionStatement(scanner);
    if (node) {
        return node;
    }
    node = ReturnStatement(scanner);
    if (node) {
        return node;
    }
    // TODO: other *Statement
}

function BindingIdentifier(scanner) {
    return Identifier(scanner);
    // support yield?
}

function Initializer(scanner) {
    if (checkCharToken(scanner.token, '=')) {
        scanner.next();
        return AssignmentExpression(scanner);
    }
}

function LexicalBinding(scanner) {
    let node = BindingIdentifier(scanner);
    const initializer = Initializer(scanner);
    if (initializer) {
        node = {
            type: Node.INITIALIZE,
            identifier: node.identifier,
            initializer,
            srcInfo: node.srcInfo
        }
    }
    return node;
    // TODO: BindingPattern
}

function HoistableDeclation(scanner) {
    let node;
    node = FunctionDeclation(scanner);
    if (node) {
        return node;
    }
    // support generator?
}

function LexicalDeclaration(scanner) {
    if (checkKeywordToken(scanner.token, 'const') || checkKeywordToken(scanner.token, 'let')) {
        const srcInfo = scanner.tokenPosInfo();
        const declarationType = scanner.token.keyword;
        scanner.next();

        const bindings = [];
        while (true) {
            const binding = LexicalBinding(scanner);
            if (binding) {
                if (declarationType == 'const' && binding.type != Node.INITIALIZE) {
                    throw new SyntaxError('[JOKE] const but no initializer');
                }
                bindings.push(binding);
            } else {
                break;
            }
            skipCharToken(scanner, ',');
        }
        if (bindings.length == 0) {
            throw new SyntaxError(`[JOKE] ${declarationType} but there is no variable declaration`);
        }
        assertSemicolon(scanner);
        const node = {
            type: Node.BINDINGS,
            declarationType,
            bindings,
            srcInfo
        }
        return node;
    }
}

function Declaration(scanner) {
    let node;
    node = HoistableDeclation(scanner);
    if (node) {
        return node;
    }
    node = LexicalDeclaration(scanner);
    if (node) {
        return node;
    }
    // TODO: other *Declaration
}

function StatementListItem(scanner) {
    let node;
    node = Statement(scanner);
    if (node) {
        return node;
    }
    node = Declaration(scanner);
    if (node) {
        return node;
    }
}

function StatementList(scanner) {
    const srcInfo = scanner.tokenPosInfo();
    const statements = [];
    while (true) {
        const item = StatementListItem(scanner);
        if (item) {
            statements.push(item);
        } else {
            break;
        }
        // how to regognize end?
        if (scanner.token.type == Token.END || checkCharToken(scanner.token, '}')) {
            break;
        }
    }
    const node = {
        type: Node.STATEMENTS,
        statements,
        srcInfo
    };
    return node;
}

function SingleNameBinding(scanner) {
    const node = BindingIdentifier(scanner);
    // TODO: Initializer
    return node;
}

function BindingElement(scanner) {
    return SingleNameBinding(scanner);
    // TODO: BindingPattern
}

function FormalParameter(scanner) {
    return BindingElement(scanner);
}

function FormatParameterList(scanner) {
    // TODO: rest
    const srcInfo = scanner.tokenPosInfo();
    const params = [];
    while (true) {
        const param = FormalParameter(scanner);
        if (param) {
            params.push(param);
        } else {
            break;
        }
    }
    const node = {
        type: Node.PARAMETERS,
        params,
        srcInfo
    };
    return node;
}

function FormalParameters(scanner) {
    return FormatParameterList(scanner);
}

function FunctionStatementList(scanner) {
    return StatementList(scanner);
}

function FunctionBody(scanner) {
    return FunctionStatementList(scanner);
}

function FunctionDeclation(scanner) {
    if (checkKeywordToken(scanner.token, 'function')) {
        const srcInfo = scanner.tokenPosInfo();
        scanner.next();
        const name = BindingIdentifier(scanner);
        assertCharToken(scanner, '(');
        const params = FormalParameters(scanner);
        assertCharToken(scanner, ')');
        assertCharToken(scanner, '{');
        const body = FunctionBody(scanner);
        assertCharToken(scanner, '}');
        const node = {
            type: Node.FUNCTION,
            name: name.identifier,
            params: params.params,
            body,
            srcInfo
        }
        return node;
    }
}

function ScriptBody(scanner) {
    return StatementList(scanner);
}

function Script(scanner) {
    return ScriptBody(scanner);
}

export default class Parser {
    constructor(scanner) {
        this.scanner = scanner;
    }

    parse() {
        this.scanner.next();
        const node = Script(this.scanner);
        this.scanner.validate();
        return node;
    }
}

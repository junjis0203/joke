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

function LiteralPropertyName(scanner) {
    let node;
    node = Identifier(scanner);
    if (node) {
        return node;
    }
    node = StringLiteral(scanner);
    if (node) {
        return node;
    }
    node = NumericLiteral(scanner);
    if (node) {
        return node;
    }
}

function PropertyName(scanner) {
    return LiteralPropertyName(scanner);
    // unsupport ComputedPropertyName
}

function PropertyDefinition(scanner) {
    const state = scanner.saveState();
    const name = PropertyName(scanner);
    if (name) {
        let expr;
        if (checkCharToken(scanner.token, ':')) {
            scanner.next();
            expr = AssignmentExpression(scanner);
        } else if (checkCharToken(scanner.token, '(')) {
            // treat as shorthand method names
            scanner.restoreState(state);
            const method = MethodDefinition(scanner);
            // expand as FunctionExpression
            expr = {
                type: Node.FUNCTION_EXPRESSION,
                name: name.identifier,
                params: method.params,
                body: method.body,
                srcInfo: name.srcInfo
            };
        } else if (name.type == Node.IDENTIFIER) {
            // treat as shorthand property names
            expr = {
                type: Node.IDENTIFIER_REFERENCE,
                identifier: name.identifier,
                srcInfo: name.srcInfo
            };
        } else {
            // maybe not occurs
            throw new Error('[JOKE] Illegal state in PropertyDefinition');
        }
        const node = {
            type: Node.PROP_NAME,
            name,
            expr,
            srcInfo: name.srcInfo
        };
        return node;
    }
    // ES2018
    if (checkCharToken(scanner.token, '...')) {
        const srcInfo = scanner.tokenPosInfo();
        scanner.next();
        const expr = AssignmentExpression(scanner);
        const node = {
            type: Node.SPREAD,
            expr,
            srcInfo
        };
        return node;
    }
}

function ObjectLiteral(scanner) {
    if (checkCharToken(scanner.token, '{')) {
        const srcInfo = scanner.tokenPosInfo();
        scanner.next();
        const props = [];
        while (true) {
            const prop = PropertyDefinition(scanner);
            if (prop) {
                props.push(prop);
            } else {
                break;
            }
            skipCharToken(scanner, ',');
        }
        // skip trailing comma
        skipCharToken(scanner, ',');
        assertCharToken(scanner, '}');

        const node = {
            type: Node.OBJECT,
            props,
            srcInfo
        };
        return node;
    }
}

function PrimaryExpression(scanner) {
    let node;
    if (checkKeywordToken(scanner.token, 'this')) {
        const srcInfo = scanner.tokenPosInfo();
        scanner.next();
        node = {
            type: Node.THIS,
            srcInfo
        };
        return node;
    }
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
    node = ObjectLiteral(scanner);
    if (node) {
        return node;
    }
    node = FunctionExpression(scanner);
    if (node) {
        return node;
    }
    // TODO: other varietion
}

function SuperProperty(scanner) {
    if (checkKeywordToken(scanner.token, 'super')) {
        const srcInfo = scanner.tokenPosInfo();
        scanner.next();
        // support array access?
        assertCharToken(scanner, '.');
        const prop = Identifier(scanner);
        const node = {
            type: Node.SUPER_PROPERTY,
            property: prop.identifier,
            srcInfo
        };
        return node;
    }
}

function MemberExpression(scanner) {
    // check first
    if (checkKeywordToken(scanner.token, 'new')) {
        const srcInfo = scanner.tokenPosInfo();
        scanner.next();
        const target = MemberExpression(scanner);
        const args = Arguments(scanner);
        const node = {
            type: Node.NEW,
            target,
            arguments: args.arguments,
            srcInfo
        };
        return node;
    }

    let node;
    node = SuperProperty(scanner);
    if (node) {
        return node;
    }

    node  = PrimaryExpression(scanner);
    while (true) {
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
        } else if (checkCharToken(scanner.token, '[')) {
            scanner.next();
            const expr = Expression(scanner);
            node = {
                type: Node.ARRAY_REF,
                object: node,
                index: expr,
                srcInfo: node.srcInfo
            }
            assertCharToken(scanner, ']');
        } else {
            break;
        }
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

function SuperCall(scanner) {
    if (checkKeywordToken(scanner.token, 'super')) {
        const state = scanner.saveState();
        const srcInfo = scanner.tokenPosInfo();
        scanner.next();
        if (checkCharToken(scanner.token, '(')) {
            const args = Arguments(scanner);
            const node = {
                type: Node.SUPER_CALL,
                arguments: args.arguments,
                srcInfo
            };
            return node;
        } else {
            // not SuperCall. backtrack
            scanner.restoreState(state);
        }
    }
}

function LeftHandSideExpression(scanner) {
    // check first
    let node = SuperCall(scanner);
    if (node) {
        return node;
    }

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
        } else if (checkCharToken(scanner.token, '[')) {
            scanner.next();
            const expr = Expression(scanner);
            node = {
                type: Node.ARRAY_REF,
                object: node,
                index: expr,
                srcInfo: node.srcInfo
            }
            assertCharToken(scanner, ']');
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
    if (
        checkCharToken(scanner.token, '-') ||
        checkCharToken(scanner.token, '!')
    ) {
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
    let node = AdditiveExpression(scanner);
    while (
        checkCharToken(scanner.token, '>') ||
        checkCharToken(scanner.token, '<') ||
        checkCharToken(scanner.token, '>=') ||
        checkCharToken(scanner.token, '<=')
    ) {
        const operator = scanner.token.char;
        scanner.next();
        const right = AdditiveExpression(scanner);
        node = {
            type: Node.BINARY_OPERATOR,
            operator,
            left: node,
            right,
            srcInfo: node.srcInfo
        };
    }
    return node;
    // support instanceof and in?
}

function EqualityExpression(scanner) {
    let node = RelationalExpression(scanner);
    while (
        checkCharToken(scanner.token, '==') ||
        checkCharToken(scanner.token, '!=') ||
        checkCharToken(scanner.token, '===') ||
        checkCharToken(scanner.token, '!==')
    ) {
        const operator = scanner.token.char;
        scanner.next();
        const right = RelationalExpression(scanner);
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

function LogicalANDExpression(scanner) {
    // unsupport bitwise operator and jump to equality expression
    let node = EqualityExpression(scanner);
    while (checkCharToken(scanner.token, '&&')) {
        const operator = scanner.token.char;
        scanner.next();
        const right = EqualityExpression(scanner);
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

function LogicalORExpression(scanner) {
    let node = LogicalANDExpression(scanner);
    while (checkCharToken(scanner.token, '||')) {
        const operator = scanner.token.char;
        scanner.next();
        const right = LogicalANDExpression(scanner);
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

function ConditionalExpression(scanner) {
    return LogicalORExpression(scanner);
    // TODO
}

function AssignmentExpression(scanner) {
    const ASSIGNABLE_NODE_TYPE = [
        Node.IDENTIFIER_REFERENCE, Node.MEMBER, Node.ARRAY_REF
    ];

    const state = scanner.saveState();
    let node = ConditionalExpression(scanner);
    if (node) {
        if (checkCharToken(scanner.token, '=')) {
            // backtrack and reparse as LeftHandSideExpression
            scanner.restoreState(state);
            node = LeftHandSideExpression(scanner);

            if (!ASSIGNABLE_NODE_TYPE.includes(node.type)) {
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

            if (!ASSIGNABLE_NODE_TYPE.includes(node.type)) {
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

function IfStatement(scanner) {
    if (checkKeywordToken(scanner.token, 'if')) {
        const srcInfo = scanner.tokenPosInfo();
        scanner.next();
        assertCharToken(scanner, '(');
        const expr = Expression(scanner);
        assertCharToken(scanner, ')');
        const thenStmt = Statement(scanner);
        let elseStmt;
        if (checkKeywordToken(scanner.token, 'else')) {
            scanner.next();
            elseStmt = Statement(scanner);
        }
        const node = {
            type: Node.IF,
            expr,
            thenStmt,
            elseStmt,
            srcInfo
        };
        return node;
    }    
}

function IterationStatement(scanner) {
    if (checkKeywordToken(scanner.token, 'while')) {
        const srcInfo = scanner.tokenPosInfo();
        scanner.next();
        assertCharToken(scanner, '(');
        const expr = Expression(scanner);
        assertCharToken(scanner, ')');
        const stmt = Statement(scanner);
        const node = {
            type: Node.WHILE,
            expr,
            stmt,
            srcInfo
        }
        return node;
    } else if (checkKeywordToken(scanner.token, 'for')) {
        const srcInfo = scanner.tokenPosInfo();
        scanner.next();
        assertCharToken(scanner, '(');
        let decr, expr1;
        if (checkKeywordToken(scanner.token, 'const') || checkKeywordToken(scanner.token, 'let')) {
            decr = LexicalDeclaration(scanner);
        } else {
            expr1 = Expression(scanner);
            assertCharToken(scanner, ';');
        }
        const expr2 = Expression(scanner);
        assertCharToken(scanner, ';');
        const expr3 = Expression(scanner);
        assertCharToken(scanner, ')');
        const stmt = Statement(scanner);
        const node = {
            type: Node.FOR,
            decr,
            expr1,
            expr2,
            expr3,
            stmt,
            srcInfo
        };
        return node;
        // TODO: for-of
    }
}

function CaseBlock(scanner) {
    assertCharToken(scanner, '{');
    const cases = [];
    let seenDefault = false;
    while (true) {
        const srcInfo = scanner.tokenPosInfo();
        if (checkKeywordToken(scanner.token, 'case')) {
            scanner.next();
            const expr = Expression(scanner);
            assertCharToken(scanner, ':');
            const stmts = StatementList(scanner);
            const node = {
                expr,
                stmts,
                srcInfo
            };
            cases.push(node);
        } else if (checkKeywordToken(scanner.token, 'default')) {
            // BNF not allow multiple default
            if (seenDefault) {
                throw new SyntaxError('[JOKE] multiple default clause');
            }
            seenDefault = true;

            scanner.next();
            assertCharToken(scanner, ':');
            const stmts = StatementList(scanner);
            const node = {
                default: true,
                stmts,
                srcInfo
            };
            cases.push(node);
        } else {
            break;
        }
    }
    assertCharToken(scanner, '}');
    return cases;
}

function SwitchStatement(scanner) {
    if (checkKeywordToken(scanner.token, 'switch')) {
        const srcInfo = scanner.tokenPosInfo();
        scanner.next();
        assertCharToken(scanner, '(');
        const expr = Expression(scanner);
        assertCharToken(scanner, ')');
        const cases = CaseBlock(scanner);
        const node = {
            type: Node.SWITCH,
            expr,
            cases,
            srcInfo
        };
        return node;
    }
}

function BreakableStatement(scanner) {
    let node;
    node = IterationStatement(scanner);
    if (node) {
        return node;
    }
    node = SwitchStatement(scanner);
    if (node) {
        return node;
    }
}

function ContinueStatement(scanner) {
    if (checkKeywordToken(scanner.token, 'continue')) {
        const srcInfo = scanner.tokenPosInfo();
        scanner.next();
        // unsupport label
        assertSemicolon(scanner);
        const node = {
            type: Node.CONTINUE,
            srcInfo
        };
        return node;
    }
}

function BreakStatement(scanner) {
    if (checkKeywordToken(scanner.token, 'break')) {
        const srcInfo = scanner.tokenPosInfo();
        scanner.next();
        // unsupport label
        assertSemicolon(scanner);
        const node = {
            type: Node.BREAK,
            srcInfo
        };
        return node;
    }
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
    node = IfStatement(scanner);
    if (node) {
        return node;
    }
    node = BreakableStatement(scanner);
    if (node) {
        return node;
    }
    node = ContinueStatement(scanner);
    if (node) {
        return node;
    }
    node = BreakStatement(scanner);
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

function HoistableDeclaration(scanner) {
    let node;
    node = FunctionDeclaration(scanner);
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
    node = ClassDeclaration(scanner);
    if (node) {
        return node;
    }
    node = HoistableDeclaration(scanner);
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
    // try Declaration first for FunctionDeclaration
    node = Declaration(scanner);
    if (node) {
        return node;
    }
    node = Statement(scanner);
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
        skipCharToken(scanner, ',');
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

function StrictFormalParameters(scanner) {
    // TODO: check duplicate elements
    return FormalParameters(scanner);
}

function FunctionStatementList(scanner) {
    return StatementList(scanner);
}

function FunctionBody(scanner) {
    return FunctionStatementList(scanner);
}

function FunctionDeclaration(scanner) {
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
            type: Node.FUNCTION_DECLARATION,
            name: name.identifier,
            params: params.params,
            body,
            srcInfo
        }
        return node;
    }
}

// almost same but separate for readable
function FunctionExpression(scanner) {
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
            type: Node.FUNCTION_EXPRESSION,
            name: name && name.identifier, // name is option for FunctionExpression
            params: params.params,
            body,
            srcInfo
        }
        return node;
    }
}

function MethodDefinition(scanner) {
    if (checkKeywordToken(scanner.token, 'get')) {
        const srcInfo = scanner.tokenPosInfo();
        scanner.next();
        const name = PropertyName(scanner);
        assertCharToken(scanner, '(');
        assertCharToken(scanner, ')');
        assertCharToken(scanner, '{');
        const body = FunctionBody(scanner);
        assertCharToken(scanner, '}');
        const node = {
            type: Node.GETTER_METHOD_DEFINITION,
            name: name.identifier,
            params: [],
            body,
            srcInfo
        }
        return node;
    } else if (checkKeywordToken(scanner.token, 'set')) {
        const srcInfo = scanner.tokenPosInfo();
        scanner.next();
        const name = PropertyName(scanner);
        assertCharToken(scanner, '(');
        // PropertySetParameterList : FormalParameter
        const param = FormalParameter(scanner);
        assertCharToken(scanner, ')');
        assertCharToken(scanner, '{');
        const body = FunctionBody(scanner);
        assertCharToken(scanner, '}');
        const node = {
            type: Node.SETTER_METHOD_DEFINITION,
            name: name.identifier,
            params: [param],
            body,
            srcInfo
        }
        return node;
    }

    const name = PropertyName(scanner);
    if (name) {
        assertCharToken(scanner, '(');
        const params = StrictFormalParameters(scanner);
        assertCharToken(scanner, ')');
        assertCharToken(scanner, '{');
        const body = FunctionBody(scanner);
        assertCharToken(scanner, '}');
        const node = {
            type: Node.METHOD_DEFINITION,
            name: name.identifier,
            params: params.params,
            body,
            srcInfo: name.srcInfo
        }
        return node;
    }
}

function ClassHeritage(scanner) {
    if (checkKeywordToken(scanner.token, 'extends')) {
        scanner.next();
        const lhs = LeftHandSideExpression(scanner);
        const node = {
            superClass: lhs
        };
        return node;
    }
}

function ClassElement(scanner) {
    return MethodDefinition(scanner);
    // support static?
}

function ClassElementList(scanner) {
    let constructor;
    const elements = [];
    while (true) {
        const element = ClassElement(scanner);
        if (element) {
            if (element.name == 'constructor') {
                // TODO: not twice
                constructor = element;
            } else {
                elements.push(element);
            }
        } else {
            break;
        }
    }
    const node = {
        constructor,
        elements
    };
    return node;
}

function ClassBody(scanner) {
    return ClassElementList(scanner);
}

function ClassTail(scanner) {
    const heritage = ClassHeritage(scanner);
    assertCharToken(scanner, '{');
    const body = ClassBody(scanner);
    assertCharToken(scanner, '}');
    const node = {
        heritage,
        body
    };
    return node;
}

function ClassDeclaration(scanner) {
    if (checkKeywordToken(scanner.token, 'class')) {
        const srcInfo = scanner.tokenPosInfo();
        scanner.next();
        const name = BindingIdentifier(scanner);
        const tail = ClassTail(scanner);
        const node = {
            type: Node.CLASS_DECLARATION,
            name: name.identifier,
            superClass: tail.heritage && tail.heritage.superClass,
            constructor: tail.body.constructor,
            methods: tail.body.elements,
            srcInfo
        };
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

function checkCharToken(token, c) {
    return token.type == 'CHAR' && token.char == c;
}

function assertCharToken(scanner, c) {
    if (checkCharToken(scanner.token, c)) {
        scanner.next();
    } else {
        throw new SyntaxError(`No ${c} at ${scanner.tokenPosInfo()}`);
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
    return token.type == 'KEYWORD' && token.keyword == keyword;
}

function NumericLiteral(scanner) {
    if (scanner.token.type == 'NUMBER') {
        const node = {
            type: 'NUMBER',
            number: scanner.token.number            
        }
        scanner.next();
        return node;
    }
}

function StringLiteral(scanner) {
    if (scanner.token.type == 'STRING') {
        const node = {
            type: 'STRING',
            string: scanner.token.string            
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
    if (scanner.token.type == 'IDENTIFIER') {
        const node = {
            type: 'IDENTIFIER',
            identifier: scanner.token.identifier
        }
        scanner.next();
        return node;
    }
}

function IdentifierReference(scanner) {
    let node = Identifier(scanner);
    if (node) {
        node = {
            type: 'IDENTIFIER_REFERENCE',
            identifier: node.identifier
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
        if (scanner.token.type != 'IDENTIFIER') {
            throw new SyntaxError(`No identifier at ${scanner.tokenPosInfo()}`);
        }
        node = {
            type: 'MEMBER',
            object: node,
            property: scanner.token.identifier
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
        type: 'ARGUMENTS',
        arguments: args
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
                type: 'CALL',
                target: node,
                arguments: args.arguments
            };
        } else if (checkCharToken(scanner.token, '.')) {
            // CallExpression . IdentifierName
            scanner.next();
            if (scanner.token.type != 'IDENTIFIER') {
                throw new SyntaxError(`No identifier at ${scanner.tokenPosInfo()}`);
            }
            node = {
                type: 'MEMBER',
                object: node,
                property: scanner.token.identifier
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
        if (node.type != 'IDENTIFIER_REFERENCE' && node.type != 'MEMBER') {
            throw new ReferenceError('Invalid left hand side in postfix operation');
        }
        if (checkCharToken(scanner.token, '++')) {
            node = {
                type: 'INCREMENT',
                kind: 'postfix',
                operand: node
            };
        }
        // don't need check but for readable
        else if (checkCharToken(scanner.token, '--')) {
            node = {
                type: 'DECREMENT',
                kind: 'postfix',
                operand: node
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
            type: 'UNARY_OPERATOR',
            operator,
            operand
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
            type: 'BINARY_OPERATOR',
            operator,
            left: node,
            right
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
            type: 'BINARY_OPERATOR',
            operator,
            left: node,
            right
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
            if (node.type != 'IDENTIFIER_REFERENCE') {
                throw new ReferenceError('Invalid left hand side in assignment');
            }

            scanner.next();
            const right = AssignmentExpression(scanner);
            node = {
                type: 'ASSIGNMENT',
                left: node,
                right
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
            if (node.type != 'IDENTIFIER_REFERENCE') {
                throw new ReferenceError('Invalid left hand side in assignment');
            }
            const lhs = node;

            scanner.next();
            const right = AssignmentExpression(scanner);

            // expand
            node = {
                type: 'BINARY_OPERATOR',
                operator,
                left: lhs,
                right
            }
            node = {
                type: 'ASSIGNMENT',
                left: lhs,
                right: node
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
        scanner.next();
        let node = StatementList(scanner);
        assertCharToken(scanner, '}');
        node = {
            type: 'BLOCK',
            block: node
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
            type: 'EXPRESSION_STATEMENT',
            expression: node
        };
        assertSemicolon(scanner);
    }
    return node;
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
            type: 'INITIALIZE',
            identifier: node.identifier,
            initializer
        }
    }
    return node;
    // TODO: BindingPattern
}

function LexicalDeclaration(scanner) {
    if (checkKeywordToken(scanner.token, 'const') || checkKeywordToken(scanner.token, 'let')) {
        const declarationType = scanner.token.keyword;
        scanner.next();

        const bindings = [];
        while (true) {
            const binding = LexicalBinding(scanner);
            if (binding) {
                if (declarationType == 'const' && binding.type != 'INITIALIZE') {
                    throw new SyntaxError('const but no initializer');
                }
                bindings.push(binding);
            } else {
                break;
            }
            skipCharToken(scanner, ',');
        }
        if (bindings.length == 0) {
            throw new SyntaxError(`${declarationType} but there is no variable declaration`);
        }
        assertSemicolon(scanner);
        const node = {
            type: 'BINDINGS',
            declarationType,
            bindings
        }
        return node;
    }
}

function Declaration(scanner) {
    let node;
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
    const statements = [];
    while (true) {
        const item = StatementListItem(scanner);
        if (item) {
            statements.push(item);
        } else {
            break;
        }
        // how to regognize end?
        if (scanner.token.type == 'END' || checkCharToken(scanner.token, '}')) {
            break;
        }
    }
    const node = {
        type: 'STATEMENTS',
        statements
    };
    return node;
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

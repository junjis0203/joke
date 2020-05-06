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
    return Identifier(scanner);
    // support yield?
}

function PrimaryExpression(scanner) {
    let node;
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
    return LeftHandSideExpression(scanner);
    // TODO
}

function UnaryExpression(scanner) {
    return PostfixExpression(scanner);
    // TODO
}

function MultiplicativeExpression(scanner) {
    return UnaryExpression(scanner);
    // TODO
}

function AdditiveExpression(scanner) {
    return MultiplicativeExpression(scanner);
    // TODO
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
    return ConditionalExpression(scanner);
    // TODO
}

function Expression(scanner) {
    return AssignmentExpression(scanner);
    // support comma?
}

function ExpressionStatement(scanner) {
    // TODO: check current token is not {, function, class, let [
    const node = Expression(scanner);
    assertSemicolon(scanner);
    return node;
}

function Statement(scanner) {
    let node;
    node = ExpressionStatement(scanner);
    if (node) {
        return node;
    }
    // TODO: other *Statement
}

function StatementListItem(scanner) {
    let node;
    node = Statement(scanner);
    if (node) {
        return node;
    }
    // TODO: Declaration
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
        if (scanner.token.type == 'END') {
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
        return Script(this.scanner);
    }
}

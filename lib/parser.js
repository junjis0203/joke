import * as Token from './token.js';
import * as Node from './node.js';

function checkCharToken(token, c) {
    if (c instanceof Array) {
        return token.type == Token.CHAR && c.includes(token.char);
    } else {
        return token.type == Token.CHAR && token.char == c;
    }
}

function checkAndStepCharToken(scanner, c) {
    const ret = checkCharToken(scanner.token, c);
    if (ret) {
        scanner.next();
    }
    return ret;
}

function checkKeywordToken(token, keyword) {
    return token.type == Token.KEYWORD && token.keyword == keyword;
}

function selectBNF(BNFs, scanner) {
    for (const BNF of BNFs) {
        const state = scanner.saveState();
        const node = BNF(scanner);
        if (node) {
            return node;
        } else {
            scanner.restoreState(state);
        }
    }    
}

function NumericLiteral(scanner) {
    if (scanner.token.type == Token.NUMBER) {
        const node = {
            type: Node.NUMBER,
            number: scanner.token.number,
            srcInfo: scanner.tokenPosInfo()
        };
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
        };
        scanner.next();
        return node;
    }
}

function Literal(scanner) {
    // TODO: other literal
    const BNFs = [
        NumericLiteral,
        StringLiteral
    ];
    return selectBNF(BNFs, scanner);
}

function Identifier(scanner) {
    if (scanner.token.type == Token.IDENTIFIER) {
        const node = {
            type: Node.IDENTIFIER,
            identifier: scanner.token.identifier,
            srcInfo: scanner.tokenPosInfo()
        };
        scanner.next();
        return node;
    }
}

function IdentifierReference(scanner) {
    const node = Identifier(scanner);
    if (node) {
        return {
            ...node,
            type: Node.IDENTIFIER_REFERENCE
        };
    }
    // support yield?
}

function SpreadElement(scanner) {
    if (checkCharToken(scanner.token, '...')) {
        scanner.next();
        const expr = AssignmentExpression(scanner);
        if (expr) {
            return {
                type: Node.SPREAD,
                expr,
                srcInfo: expr.srcInfo
            };
        } else {
            throw new SyntaxError(`[JOKE] Spread but no AssignmentExpression at ${scanner.tokenPosInfo()}`);
        }
    }
}

function ElementList(scanner) {
    const BNFs = [
        SpreadElement,
        AssignmentExpression
    ];
    const elements = [];
    while (true) {
        const element = selectBNF(BNFs, scanner);
        if (element) {
            elements.push(element);
            // also consume trailing comma
            checkAndStepCharToken(scanner, ',');
        } else {
            break;
        }
    }
    return elements;
}

function ArrayLiteral(scanner) {
    if (checkCharToken(scanner.token, '[')) {
        const srcInfo = scanner.tokenPosInfo();
        scanner.next();
        // unsupport Elision
        const elements = ElementList(scanner);
        if (checkCharToken(scanner.token, ']')) {
            scanner.next();
            return {
                type: Node.ARRAY,
                elements,
                srcInfo
            };
        }
    }
}

function LiteralPropertyName(scanner) {
    const BNFs = [
        Identifier,
        StringLiteral,
        NumericLiteral
    ];
    return selectBNF(BNFs, scanner);
}

function PropertyName(scanner) {
    return LiteralPropertyName(scanner);
    // unsupport ComputedPropertyName
}

function PropertyDefinition(scanner) {
    const createIdentifierNode = (identifier) => (
        {
            type: Node.IDENTIFIER,
            identifier
        }
    );
    const createPropertyDefinitionNode = (name, expr) => (
        {
            type: Node.PROPERTY_NAME,
            name,
            expr,
            srcInfo: name.srcInfo
        }
    );

    function TraditinalPropertyDefinition(scanner) {
        const name = PropertyName(scanner);
        if (checkCharToken(scanner.token, ':')) {
            scanner.next();
            const expr = AssignmentExpression(scanner);
            return createPropertyDefinitionNode(name, expr);
        }
    }

    // shorthand property names
    function IdentifierReferenceEx(scanner) {
        const expr = IdentifierReference(scanner);
        if (expr) {
            const name = createIdentifierNode(expr.identifier);
            return createPropertyDefinitionNode(name, expr);
        }
    }

    // shorthand method names
    function MethodDefinitionEx(scanner) {
        const method = MethodDefinition(scanner);
        if (method) {
            const name = createIdentifierNode(method.name);
            // convert to FunctionExpression
            const expr = {
                ...method,
                type: Node.FUNCTION_EXPRESSION
            };
            return createPropertyDefinitionNode(name, expr);
        }
    }

    // ES2018
    function SpreadPropertyDefinition(scanner) {
        if (checkCharToken(scanner.token, '...')) {
            const srcInfo = scanner.tokenPosInfo();
            scanner.next();
            const expr = AssignmentExpression(scanner);
            return {
                type: Node.SPREAD,
                expr,
                srcInfo
            };
        }
    }

    const BNFs = [
        TraditinalPropertyDefinition,
        MethodDefinitionEx,
        IdentifierReferenceEx,
        SpreadPropertyDefinition
    ];
    return selectBNF(BNFs, scanner);
}

function PropertyDeinitionList(scanner) {
    const props = [];
    while (true) {
        const prop = PropertyDefinition(scanner);
        if (prop) {
            props.push(prop);
            // also consume trailing comma
            checkAndStepCharToken(scanner, ',');
        } else {
            break;
        }
    }
    return props;
}

function ObjectLiteral(scanner) {
    if (checkCharToken(scanner.token, '{')) {
        const srcInfo = scanner.tokenPosInfo();
        scanner.next();
        const props = PropertyDeinitionList(scanner);
        if (checkAndStepCharToken(scanner, '}')) {
            return {
                type: Node.OBJECT,
                props,
                srcInfo
            };
        }
    }
}

function PrimaryExpression(scanner) {
    function This(scanner) {
        if (checkKeywordToken(scanner.token, 'this')) {
            const srcInfo = scanner.tokenPosInfo();
            scanner.next();
            return {
                type: Node.THIS,
                srcInfo
            };
        }
    }

    function ParenthesizedExpression(scanner) {
        if (checkCharToken(scanner.token, '(')) {
            scanner.next();
            const expr = Expression(scanner);
            if (checkAndStepCharToken(scanner, ')')) {
                return expr;
            }
        }
    }

    // TODO: other varietion
    const BNFs = [
        This,
        ParenthesizedExpression,
        IdentifierReference,
        Literal,
        ArrayLiteral,
        ObjectLiteral,
        FunctionExpression
    ];
    return selectBNF(BNFs, scanner);
}

function SuperProperty(scanner) {
    if (checkKeywordToken(scanner.token, 'super')) {
        const srcInfo = scanner.tokenPosInfo();
        scanner.next();
        // support array access?
        if (checkAndStepCharToken(scanner, '.')) {
            const prop = Identifier(scanner);
            return {
                type: Node.SUPER_PROPERTY,
                property: prop.identifier,
                srcInfo
            };
        }
    }
}

// used by MemberExpression and LeftHandSideExpression
function PropertyReference(scanner, node) {
    if (checkCharToken(scanner.token, '.')) {
        scanner.next();
        if (scanner.token.type == Token.IDENTIFIER) {
            const newNode = {
                type: Node.PROPERTY_REF,
                object: node,
                property: scanner.token.identifier,
                srcInfo: node.srcInfo
            }
            scanner.next();
            return newNode;
        } else {
            throw new SyntaxError(`[JOKE] No identifier at ${scanner.tokenPosInfo()}`);
        }
    }
}

function ArrayReference(scanner, node) {
    if (checkCharToken(scanner.token, '[')) {
        scanner.next();
        const expr = Expression(scanner);
        if (checkAndStepCharToken(scanner, ']')) {
            return {
                type: Node.ARRAY_REF,
                object: node,
                index: expr,
                srcInfo: node.srcInfo
            }
        } else {
            throw new SyntaxError(`[JOKE] No ] at ${scanner.tokenPosInfo()}`);
        }
    }
}

function updateNode(candidates, scanner, node) {
    for (const candidate of candidates) {
        const newNode = candidate(scanner, node);
        if (newNode) {
            return newNode;
        }
    }
}

function MemberExpression(scanner) {
    function NewCall(scanner) {
        if (checkKeywordToken(scanner.token, 'new')) {
            const srcInfo = scanner.tokenPosInfo();
            scanner.next();
            const target = MemberExpression(scanner);
            const args = Arguments(scanner);
            return {
                type: Node.NEW,
                target,
                arguments: args.arguments,
                srcInfo
            };
        }
    }

    const BNFs = [
        NewCall,
        SuperProperty
    ];
    let node;
    node = selectBNF(BNFs, scanner);
    if (node) {
        return node;
    }

    // build reference recursively
    node  = PrimaryExpression(scanner);
    if (node) {
        const candidates = [
            PropertyReference,
            ArrayReference
        ];
        while (true) {
            const newNode = updateNode(candidates, scanner, node);
            if (newNode) {
                node = newNode;
                continue;
            }
            break;
        }
        return node;
    }
}

function NewExpression(scanner) {
    // unsupport new without parentheses
    return MemberExpression(scanner);
}

function ArgumentList(scanner) {
    function SpreadArgument(scanner) {
        // not in specification, but same syntax
        return SpreadElement(scanner);
    }

    const BNFs = [
        SpreadElement,
        AssignmentExpression
    ];
    // cannot use 'arguments' in strict mode
    const args = [];
    while (true) {
        const arg = selectBNF(BNFs, scanner);
        if (arg) {
            args.push(arg);
            // allowing trailing comma in ES2017
            // but that behaivor is side effect:-P
            checkAndStepCharToken(scanner, ',');
        } else {
            break;
        }
    }
    return {
        arguments: args
    };
}

function Arguments(scanner) {
    if (checkAndStepCharToken(scanner, '(')) {
        const node = ArgumentList(scanner);
        if (checkAndStepCharToken(scanner, ')')) {
            return node;
        }
    }
}

function SuperCall(scanner) {
    if (checkKeywordToken(scanner.token, 'super')) {
        const srcInfo = scanner.tokenPosInfo();
        scanner.next();
        if (checkCharToken(scanner.token, '(')) {
            const args = Arguments(scanner);
            return {
                type: Node.SUPER_CALL,
                arguments: args.arguments,
                srcInfo
            };
        }
    }
}

function LeftHandSideExpression(scanner) {
    // use selectBNFs for backtrack
    const BNFs = [SuperCall];
    let node;
    node = selectBNF(BNFs, scanner);
    if (node) {
        return node;
    }

    function FunctionCall(scanner, node) {
        if (checkCharToken(scanner.token, '(')) {
            // treat as not NewExpression but CallExpression
            const args = Arguments(scanner);
            return {
                type: Node.CALL,
                target: node,
                arguments: args.arguments,
                srcInfo: node.srcInfo
            };
        }
    }

    node = NewExpression(scanner);
    if (node) {
        const candidates = [
            FunctionCall,
            PropertyReference,
            ArrayReference
        ];
        while (true) {
            const newNode = updateNode(candidates, scanner, node);
            if (newNode) {
                node = newNode;
                continue;
            }
            break;
        }
        return node;
    }
}

const ASSIGNABLE_NODE_TYPE = [
    Node.IDENTIFIER_REFERENCE, Node.PROPERTY_REF, Node.ARRAY_REF
];

function PostfixExpression(scanner) {
    function Increment(scanner, node) {
        if (checkCharToken(scanner.token, '++')) {
            if (!ASSIGNABLE_NODE_TYPE.includes(node.type)) {
                throw new ReferenceError('[JOKE] Invalid left hand side in postfix operation');
            }
            const newNode = {
                type: Node.INCREMENT,
                kind: 'postfix',
                operand: node,
                srcInfo: node.srcInfo
            };
            scanner.next();
            return newNode;
        }
    }

    function Decrement(scanner, node) {
        if (checkCharToken(scanner, '--')) {
            if (!ASSIGNABLE_NODE_TYPE.includes(node.type)) {
                throw new ReferenceError('[JOKE] Invalid left hand side in postfix operation');
            }
            const newNode = {
                type: Node.DECREMENT,
                kind: 'postfix',
                operand: node,
                srcInfo: node.srcInfo
            };
            scanner.next();
            return newNode;
        }
    }

    let node = LeftHandSideExpression(scanner);

    const candidates = [
        Increment,
        Decrement
    ]
    const newNode = updateNode(candidates, scanner, node);
    if (newNode) {
        node = newNode;
    }

    return node;
}

function UnaryExpression(scanner) {
    if (checkCharToken(scanner.token, ['-', '!'])) {
        const operator = scanner.token.char;
        scanner.next();
        const operand = PostfixExpression(scanner);
        return {
            type: Node.UNARY_OPERATOR,
            operator,
            operand,
            srcInfo: operand.srcInfo
        };
    }
    return PostfixExpression(scanner);
    // TODO
}

function processBinaryExpression(BNF, operators, scanner) {
    let node = BNF(scanner);
    while (checkCharToken(scanner.token, operators)) {
        const operator = scanner.token.char;
        scanner.next();
        const right = BNF(scanner);
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

function MultiplicativeExpression(scanner) {
    return processBinaryExpression(UnaryExpression, ['*', '/', '%'], scanner);
}

function AdditiveExpression(scanner) {
    return processBinaryExpression(MultiplicativeExpression, ['+', '-'], scanner);
}

function RelationalExpression(scanner) {
    // unsupport bitwise operator and jump to additive expression
    return processBinaryExpression(AdditiveExpression, ['>', '<', '>=', '<='], scanner);
    // TODO: instanceof
    // support in?
}

function EqualityExpression(scanner) {
    return processBinaryExpression(RelationalExpression, ['==', '!=', '===', '!=='], scanner);
}

function LogicalANDExpression(scanner) {
    // unsupport bitwise operator and jump to equality expression
    return processBinaryExpression(EqualityExpression, '&&', scanner);
}

function LogicalORExpression(scanner) {
    return processBinaryExpression(LogicalANDExpression, '||', scanner);
}

function ConditionalExpression(scanner) {
    return LogicalORExpression(scanner);
    // TODO
}

function AssignmentExpression(scanner) {
    function Assignment(scanner) {
        const left = LeftHandSideExpression(scanner);
        if (checkCharToken(scanner.token, '=')) {
            if (!ASSIGNABLE_NODE_TYPE.includes(left.type)) {
                throw new ReferenceError('[JOKE] Invalid left hand side in assignment');
            }

            scanner.next();
            const right = AssignmentExpression(scanner);
            return {
                type: Node.ASSIGNMENT,
                left,
                right,
                srcInfo: left.srcInfo
            };
        }
    }

    function AssignmentOperator(scanner) {
        const left = LeftHandSideExpression(scanner);
        if (checkCharToken(scanner.token, ['+=', '-=', '*=', '/=', '%='])) {
            if (!ASSIGNABLE_NODE_TYPE.includes(left.type)) {
                throw new ReferenceError('[JOKE] Invalid left hand side in assignment');
            }

            const operator = scanner.token.char[0];
            scanner.next();
            const right = AssignmentExpression(scanner);

            // expand
            return {
                type: Node.ASSIGNMENT,
                left,
                right: {
                    type: Node.BINARY_OPERATOR,
                    operator,
                    left,
                    right,
                    srcInfo: left.srcInfo
                },
                srcInfo: left.srcInfo
            };
        }
    }

    const BNFs = [
        ArrowFunction,
        Assignment,
        AssignmentOperator,
        ConditionalExpression
    ];
    return selectBNF(BNFs, scanner);
}

function Expression(scanner) {
    let node = AssignmentExpression(scanner);
    while (checkCharToken(scanner.token, ',')) {
        scanner.next();
        const right = AssignmentExpression(scanner);
        node = {
            type: Node.COMMA,
            left: node,
            right,
            srcInfo: node.srcInfo
        };
    }
    return node;
}

function Block(scanner) {
    if (checkCharToken(scanner.token, '{')) {
        const srcInfo = scanner.tokenPosInfo();
        scanner.next();
        const statements = StatementList(scanner);
        if (checkAndStepCharToken(scanner, '}')) {
            return {
                type: Node.BLOCK,
                block: statements,
                srcInfo
            };
        }
    }
}

function BlockStatement(scanner) {
    return Block(scanner);
}

function ExpressionStatement(scanner) {
    // TODO: check current token is not {, function, class, let [
    const expression = Expression(scanner);
    if (expression) {
        if (checkAndStepCharToken(scanner, ';')) {
            return {
                type: Node.EXPRESSION_STATEMENT,
                expression,
                srcInfo: expression.srcInfo
            };
        }
    }
}

function IfStatement(scanner) {
    if (checkKeywordToken(scanner.token, 'if')) {
        const srcInfo = scanner.tokenPosInfo();
        scanner.next();

        if (!checkAndStepCharToken(scanner, '(')) {
            return;
        }
        const expr = Expression(scanner);
        if (!checkAndStepCharToken(scanner, ')')) {
            return;
        }

        const thenStmt = Statement(scanner);
        let elseStmt;
        if (checkKeywordToken(scanner.token, 'else')) {
            scanner.next();
            elseStmt = Statement(scanner);
        }

        return {
            type: Node.IF,
            expr,
            thenStmt,
            elseStmt,
            srcInfo
        };
    }    
}

function ForDeclaration(scanner) {
    if (checkKeywordToken(scanner.token, 'const')) {
        scanner.next();
        return BindingIdentifier(scanner);
    }
}

function IterationStatement(scanner) {
    function WhileStatement(scanner) {
        if (checkKeywordToken(scanner.token, 'while')) {
            const srcInfo = scanner.tokenPosInfo();
            scanner.next();

            if (!checkAndStepCharToken(scanner, '(')) {
                return;
            }
            const expr = Expression(scanner);
            if (!checkAndStepCharToken(scanner, ')')) {
                return;
            }

            const stmt = Statement(scanner);
            return {
                type: Node.WHILE,
                expr,
                stmt,
                srcInfo
            };
        }    
    }

    function ForStatement(scanner) {
        if (checkKeywordToken(scanner.token, 'for')) {
            const srcInfo = scanner.tokenPosInfo();
            scanner.next();

            if (!checkAndStepCharToken(scanner, '(')) {
                return;
            }
            let decr, expr1;
            if (checkKeywordToken(scanner.token, 'const') || checkKeywordToken(scanner.token, 'let')) {
                decr = LexicalDeclaration(scanner);
            } else {
                expr1 = Expression(scanner);
                if (!checkAndStepCharToken(scanner, ';')) {
                    return;
                }
            }
            const expr2 = Expression(scanner);
            if (!checkAndStepCharToken(scanner, ';')) {
                return;
            }
            const expr3 = Expression(scanner);
            if (!checkAndStepCharToken(scanner, ')')) {
                return;
            }

            const stmt = Statement(scanner);
            return {
                type: Node.FOR,
                decr,
                expr1,
                expr2,
                expr3,
                stmt,
                srcInfo
            };
        }
    }

    function ForOfStatement(scanner) {
        if (checkKeywordToken(scanner.token, 'for')) {
            const srcInfo = scanner.tokenPosInfo();
            scanner.next();

            if (!checkAndStepCharToken(scanner, '(')) {
                return;
            }
            const decr = ForDeclaration(scanner);
            if (checkKeywordToken(scanner.token, 'of')) {
                scanner.next();
            } else {
                return;
            }
            const expr2 = AssignmentExpression(scanner);
            if (!checkAndStepCharToken(scanner, ')')) {
                return;
            }

            const stmt = Statement(scanner);
            return {
                type: Node.FOR_OF,
                decr,
                expr2,
                stmt,
                srcInfo
            };
        }
    }

    const BNFs = [
        WhileStatement,
        ForStatement,
        ForOfStatement
    ]
    return selectBNF(BNFs, scanner);
}

function CaseBlock(scanner) {
    if (!checkAndStepCharToken(scanner, '{')) {
        return;
    }

    const cases = [];
    let seenDefault = false;
    while (true) {
        const srcInfo = scanner.tokenPosInfo();
        if (checkKeywordToken(scanner.token, 'case')) {
            scanner.next();
            const expr = Expression(scanner);
            if (checkAndStepCharToken(scanner, ':')) {
                const stmts = StatementList(scanner);
                const node = {
                    expr,
                    stmts,
                    srcInfo
                };
                cases.push(node);
            }
        } else if (checkKeywordToken(scanner.token, 'default')) {
            // BNF not allow multiple default
            if (seenDefault) {
                throw new SyntaxError('[JOKE] multiple default clause');
            }
            seenDefault = true;

            scanner.next();
            if (checkAndStepCharToken(scanner, ':')) {
                const stmts = StatementList(scanner);
                const node = {
                    default: true,
                    stmts,
                    srcInfo
                };
                cases.push(node);
            }
        } else {
            break;
        }
    }

    if (checkAndStepCharToken(scanner, '}')) {
        return cases;
    }
}

function SwitchStatement(scanner) {
    if (checkKeywordToken(scanner.token, 'switch')) {
        const srcInfo = scanner.tokenPosInfo();
        scanner.next();

        if (!checkAndStepCharToken(scanner, '(')) {
            return;
        }
        const expr = Expression(scanner);
        if (!checkAndStepCharToken(scanner, ')')) {
            return;
        }

        const cases = CaseBlock(scanner);
        return {
            type: Node.SWITCH,
            expr,
            cases,
            srcInfo
        };
    }
}

function BreakableStatement(scanner) {
    const BNFs = [
        IterationStatement,
        SwitchStatement
    ];
    return selectBNF(BNFs, scanner);
}

function ContinueStatement(scanner) {
    if (checkKeywordToken(scanner.token, 'continue')) {
        const srcInfo = scanner.tokenPosInfo();
        scanner.next();
        // unsupport label
        if (checkAndStepCharToken(scanner, ';')) {
            return {
                type: Node.CONTINUE,
                srcInfo
            };
        }
    }
}

function BreakStatement(scanner) {
    if (checkKeywordToken(scanner.token, 'break')) {
        const srcInfo = scanner.tokenPosInfo();
        scanner.next();
        // unsupport label
        if (checkAndStepCharToken(scanner, ';')) {
            return {
                type: Node.BREAK,
                srcInfo
            };
        }
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
        if (checkAndStepCharToken(scanner, ';')) {
            return {
                type: Node.RETURN,
                expr,
                srcInfo
            };
        }
    }
}

function Statement(scanner) {
    // TODO: other *Statement
    const BNFs = [
        BlockStatement,
        ExpressionStatement,
        IfStatement,
        BreakableStatement,
        ContinueStatement,
        BreakStatement,
        ReturnStatement
    ];
    return selectBNF(BNFs, scanner);
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

function BindingProperty(scanner) {
    // TODO: rename and nest
    return SingleNameBinding(scanner);
}

function ObjectBindingPattern(scanner) {
    if (checkCharToken(scanner.token, '{')) {
        const srcInfo = scanner.tokenPosInfo();
        scanner.next();
        const properties = [];
        while (true) {
            const property = BindingProperty(scanner);
            if (property) {
                properties.push(property);
                checkAndStepCharToken(scanner, ',');
            } else {
                break;
            }
        }
        if (checkAndStepCharToken(scanner, '}')) {
            return {
                properties,
                srcInfo
            };
        }
    }
}

function BindingPattern(scanner) {
    // unsupport ArrayBinding
    return ObjectBindingPattern(scanner);
}

function LexicalBinding(scanner) {
    function BindingIdentifierEx(scanner) {
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

    function BindingPatternEx(scanner) {
        const pattern = BindingPattern(scanner);
        const initializer = Initializer(scanner);
        if (pattern && initializer) {
            return {
                type: Node.PATTERN_INITIALIZE,
                properties: pattern.properties,
                initializer,
                srcInfo: pattern.srcInfo
            };
        }
    }

    const BNFs = [
        BindingIdentifierEx,
        BindingPatternEx
    ];
    return selectBNF(BNFs, scanner);
}

function HoistableDeclaration(scanner) {
    return FunctionDeclaration(scanner);
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
                bindings.push(binding);
                // TODO: trailing comma is not allowed at LexicalDeclaration
                checkAndStepCharToken(scanner, ',');
            } else {
                break;
            }
        }
        if (bindings.length == 0) {
            throw new SyntaxError(`[JOKE] ${declarationType} but there is no variable declaration`);
        }
        if (checkAndStepCharToken(scanner, ';')) {
            return {
                type: Node.BINDINGS,
                declarationType,
                bindings,
                srcInfo
            };
        }
    }
}

function Declaration(scanner) {
    const BNFs = [
        ClassDeclaration,
        HoistableDeclaration,
        LexicalDeclaration
    ];
    return selectBNF(BNFs, scanner);
}

function StatementListItem(scanner) {
    // try Declaration first for FunctionDeclaration
    const BNFs = [
        Declaration,
        Statement
    ];
    return selectBNF(BNFs, scanner);
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
    return {
        type: Node.STATEMENTS,
        statements,
        srcInfo
    };
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
    function BindingPatternEx(scanner) {
        const pattern = BindingPattern(scanner);
        if (pattern) {
            const initializer = Initializer(scanner);
            return {
                type: Node.PATTERN_INITIALIZE,
                properties: pattern.properties,
                initializer,
                srcInfo: pattern.srcInfo
            };
        }
    }

    const BNFs = [
        SingleNameBinding,
        BindingPatternEx
    ];
    return selectBNF(BNFs, scanner);
}

function FormalParameter(scanner) {
    return BindingElement(scanner);
}

function BindingRestElement(scanner) {
    if (checkCharToken(scanner.token, '...')) {
        scanner.next();
        const identifier = BindingIdentifier(scanner);
        return {
            type: Node.REST_PARAMETER,
            identifier: identifier.identifier,
            srcInfo: identifier.srcInfo
        };
    }
}

function FunctionRestParameter(scanner) {
    return BindingRestElement(scanner);
}

function FormalParameterList(scanner) {
    const params = [];
    while (true) {
        const param = FormalParameter(scanner);
        if (param) {
            params.push(param);
            checkAndStepCharToken(scanner, ',');
        } else {
            break;
        }
    }
    const rest = FunctionRestParameter(scanner);
    if (rest) {
        params.push(rest);
    }
    return {
        params
    };
}

function FormalParameters(scanner) {
    return FormalParameterList(scanner);
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

        if (!checkAndStepCharToken(scanner, '(')) {
            return;
        }
        const params = FormalParameters(scanner);
        if (!checkAndStepCharToken(scanner, ')')) {
            return;
        }

        if (!checkAndStepCharToken(scanner, '{')) {
            return;
        }
        const body = FunctionBody(scanner);
        if (!checkAndStepCharToken(scanner, '}')) {
            return;
        }

        return {
            type: Node.FUNCTION_DECLARATION,
            name: name.identifier,
            params: params.params,
            body,
            srcInfo
        };
    }
}

// almost same but separate for readable
function FunctionExpression(scanner) {
    if (checkKeywordToken(scanner.token, 'function')) {
        const srcInfo = scanner.tokenPosInfo();
        scanner.next();
        const name = BindingIdentifier(scanner);

        if (!checkAndStepCharToken(scanner, '(')) {
            return;
        }
        const params = FormalParameters(scanner);
        if (!checkAndStepCharToken(scanner, ')')) {
            return;
        }

        if (!checkAndStepCharToken(scanner, '{')) {
            return;
        }
        const body = FunctionBody(scanner);
        if (!checkAndStepCharToken(scanner, '}')) {
            return;
        }

        return {
            type: Node.FUNCTION_EXPRESSION,
            name: name && name.identifier, // name is option for FunctionExpression
            params: params.params,
            body,
            srcInfo
        };
    }
}

function ArrowParameter(scanner) {
    if (checkCharToken(scanner.token, '(')) {
        scanner.next();

        // Specification says CoverParenthesizedExpressionAndArrowParameterList is recognized as ( StrictFormalParameters ).
        const params = StrictFormalParameters(scanner);
        if (checkAndStepCharToken(scanner, ')')) {
            return {
                params: params.params
            };
        }
    } else {
        const identifier = BindingIdentifier(scanner);
        if (identifier) {
            return {
                params: [identifier]
            };
        }
    }
}

function ConciseBody(scanner) {
    if (checkCharToken(scanner.token, '{')) {
        scanner.next();
        const body = FunctionBody(scanner);
        if (checkAndStepCharToken(scanner, '}')) {
            return body;
        }
    } else {
        const expr = AssignmentExpression(scanner);
        if (expr) {
            // add return
            const node = {
                type: Node.RETURN,
                expr,
                srcInfo: expr.srcInfo
            };
            return {
                type: Node.STATEMENTS,
                statements: [node],
                srcInfo: node.srcInfo
            };
        }
    }
}

function ArrowFunction(scanner) {
    const srcInfo = scanner.tokenPosInfo();
    const params = ArrowParameter(scanner);
    if (checkCharToken(scanner.token, '=>')) {
        scanner.next();
        const body = ConciseBody(scanner);
        return {
            type: Node.ARROW_FUNCTION,
            params: params.params,
            body,
            srcInfo
        };
    }
}

function MethodDefinition(scanner) {
    function Getter(scanner) {
        if (checkKeywordToken(scanner.token, 'get')) {
            const srcInfo = scanner.tokenPosInfo();
            scanner.next();

            const name = PropertyName(scanner);
            if (!checkAndStepCharToken(scanner, '(')) {
                return;
            }
            if (!checkAndStepCharToken(scanner, ')')) {
                return;
            }
    
            if (!checkAndStepCharToken(scanner, '{')) {
                return;
            }
            const body = FunctionBody(scanner);
            if (!checkAndStepCharToken(scanner, '}')) {
                return;
            }
    
            return {
                type: Node.GETTER_METHOD_DEFINITION,
                name: name.identifier,
                params: [],
                body,
                srcInfo
            };
        }
    }

    function Setter(scanner) {
        if (checkKeywordToken(scanner.token, 'set')) {
            const srcInfo = scanner.tokenPosInfo();
            scanner.next();

            const name = PropertyName(scanner);
            if (!checkAndStepCharToken(scanner, '(')) {
                return;
            }
            // PropertySetParameterList : FormalParameter
            const param = FormalParameter(scanner);
            if (!checkAndStepCharToken(scanner, ')')) {
                return;
            }

            if (!checkAndStepCharToken(scanner, '{')) {
                return;
            }
            const body = FunctionBody(scanner);
            if (!checkAndStepCharToken(scanner, '}')) {
                return;
            }

            return {
                type: Node.SETTER_METHOD_DEFINITION,
                name: name.identifier,
                params: [param],
                body,
                srcInfo
            };
        }
    }

    function NormalMethod(scanner) {
        const name = PropertyName(scanner);
        if (name) {
            if (!checkAndStepCharToken(scanner, '(')) {
                return;
            }
            const params = StrictFormalParameters(scanner);
            if (!checkAndStepCharToken(scanner, ')')) {
                return;
            }
    
            if (!checkAndStepCharToken(scanner, '{')) {
                return;
            }
            const body = FunctionBody(scanner);
            if (!checkAndStepCharToken(scanner, '}')) {
                return;
            }
    
            return {
                type: Node.METHOD_DEFINITION,
                name: name.identifier,
                params: params.params,
                body,
                srcInfo: name.srcInfo
            };
        }
    }

    const BNFs = [
        Getter,
        Setter,
        NormalMethod
    ];
    return selectBNF(BNFs, scanner);
}

function ClassHeritage(scanner) {
    if (checkKeywordToken(scanner.token, 'extends')) {
        scanner.next();
        const lhs = LeftHandSideExpression(scanner);
        return {
            superClass: lhs
        };
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
    return {
        constructor,
        elements
    };
}

function ClassBody(scanner) {
    return ClassElementList(scanner);
}

function ClassTail(scanner) {
    const heritage = ClassHeritage(scanner);

    if (!checkAndStepCharToken(scanner, '{')) {
        return;
    }
    const body = ClassBody(scanner);
    if (!checkAndStepCharToken(scanner, '}')) {
        return;
    }

    return {
        heritage,
        body
    };
}

function ClassDeclaration(scanner) {
    if (checkKeywordToken(scanner.token, 'class')) {
        const srcInfo = scanner.tokenPosInfo();
        scanner.next();
        const name = BindingIdentifier(scanner);
        const tail = ClassTail(scanner);
        return {
            type: Node.CLASS_DECLARATION,
            name: name.identifier,
            superClass: tail.heritage && tail.heritage.superClass,
            constructor: tail.body.constructor,
            methods: tail.body.elements,
            srcInfo
        };
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

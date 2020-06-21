import * as Token from './token.js';

function processSingleLineComment(scanner) {
    scanner.ptr += 2;
    while (scanner.data[scanner.ptr++] != '\n') {
    }
    scanner.lineno++;
}

function processMultiLineComment(scanner) {
    scanner.ptr += 2;
    while (true) {
        while (scanner.data[scanner.ptr] != '*') {
            if (scanner.data[scanner.ptr] == '\n') {
                scanner.lineno++;
            }
            scanner.ptr++;
        }
        if (scanner.data[scanner.ptr+1] == '/') {
            scanner.ptr += 2;
            break;
        } else {
            scanner.ptr++;
        }
    }
}

function getString(scanner, quot) {
    scanner.ptr++;
    let s = '';
    while (scanner.data[scanner.ptr] != quot) {
        // TODO: escape sequence and error check
        s += scanner.data[scanner.ptr++];
    }
    scanner.ptr++;
    return {
        type: Token.STRING,
        string: s,
        lineno: scanner.lineno
    }
}

function isIdentifierStartChar(c) {
    return (
        c == '$' || c == '_' ||
        ('a' <= c && c <= 'z') ||
        ('A' <= c && c <= 'Z')
    );
}

function isIdentifierChar(c) {
    return isIdentifierStartChar(c) || ('0' <= c && c <= '9');
}

const KEYWORDS = [
    'const',
    'let', // let is not keyword in ECMAScript. but treat as keyword in JOKE for simplicity
    'function', 'return',
    'if', 'else',
    'while', 'for',
    'break', 'continue',
    'switch', 'case', 'default',
];

function getIdentifierOrKeyword(scanner) {
    let id = '';
    let c = scanner.data[scanner.ptr++];
    // start char check is already done
    while (isIdentifierChar(c)) {
        id += c;
        c = scanner.data[scanner.ptr++];
    }
    scanner.ptr--;
    if (KEYWORDS.includes(id)) {
        return {
            type: Token.KEYWORD,
            keyword: id,
            lineno: scanner.lineno
        }
    } else {
        return {
            type: Token.IDENTIFIER,
            identifier: id,
            lineno: scanner.lineno
        }
    }
}

function isDecimalDigitChar(c) {
    return ('0' <= c && c <= '9');
}

function getDecimalInteger(scanner) {
    let number = scanner.data[scanner.ptr++];
    if (number != '0') {
        let c = scanner.data[scanner.ptr++];
        while (isDecimalDigitChar(c)) {
            number += c;
            c = scanner.data[scanner.ptr++];
        }
        scanner.ptr--;
    }
    return number;
}

function getNumber(scanner) {
    // don't support '.5', '0x123', etc
    let number = getDecimalInteger(scanner);
    let c;
    c = scanner.data[scanner.ptr++];
    if (c == '.') {
        number += c;
        // don't consider '12.'
        number += getDecimalInteger(scanner);
    } else {
        scanner.ptr--;
    }
    c = scanner.data[scanner.ptr++];
    if (c == 'e' || c == 'E') {
        number += c;
        c = scanner.data[scanner.ptr++];
        if (isDecimalDigitChar(c) || c == '+' || c == '-') {
            number += c;
            c = scanner.data[scanner.ptr++];
            while (isDecimalDigitChar(c)) {
                number += c;
                c = scanner.data[scanner.ptr++];
            }
        }
    }
    scanner.ptr--;
    return {
        type: Token.NUMBER,
        number: parseFloat(number),
        lineno: scanner.lineno
    }
}

function getCharToken(scanner) {
    let c = scanner.data[scanner.ptr++];
    if (c == '+' && scanner.data[scanner.ptr] == '+') {
        c += '+'; 
        scanner.ptr++;
    } else if (c == '-' && scanner.data[scanner.ptr] == '-') {
        c += '-'; 
        scanner.ptr++;
    } else if (['+', '-', '*', '/', '%'].includes(c) && scanner.data[scanner.ptr] == '=') {
        c += '=';
        scanner.ptr++;
    } else if (['!', '='].includes(c) && scanner.data[scanner.ptr] == '=') {
        c += '=';
        scanner.ptr++;
        if (scanner.data[scanner.ptr] == '=') {
            c += '=';
            scanner.ptr++;
        }
    } else if (['>', '<'].includes(c) && scanner.data[scanner.ptr] == '=') {
        c += '=';
        scanner.ptr++;
    } else if (c == '&' && scanner.data[scanner.ptr] == '&') {
        c += '&'; 
        scanner.ptr++;
    } else if (c == '|' && scanner.data[scanner.ptr] == '|') {
        c += '|'; 
        scanner.ptr++;
    }
    return {
        type: Token.CHAR,
        char: c,
        lineno: scanner.lineno
    }
}

function scannerMain(scanner) {
    while (true) {
        if (scanner.ptr == scanner.data.length) {
            return {
                type: Token.END,
                lineno: scanner.lineno
            };
        }
        const c = scanner.data[scanner.ptr];
        switch (c) {
        case ' ': case '\t': case '\r': case '\n':
            if (c == '\n') {
                scanner.lineno++;
            }
            scanner.ptr++;
            break;
        case '\'': case '"':
            return getString(scanner, c);
        case '/':
            if (scanner.data[scanner.ptr+1] == '*') {
                processMultiLineComment(scanner);
                break;
            } else if (scanner.data[scanner.ptr+1] == '/') {
                processSingleLineComment(scanner);
                break;
            }
            // fallthrough
        default:
            if (isIdentifierStartChar(c)) {
                return getIdentifierOrKeyword(scanner);
            } else if (isDecimalDigitChar(c)) {
                return getNumber(scanner);
            } else {
                return getCharToken(scanner);
            }
        }
    }
}

export default class Scanner {
    constructor(sourceFile, data) {
        this.sourceFile = sourceFile;
        this.data = data;

        this.ptr = 0;
        this.lineno = 1;

        this.tokens = [];
        this.tokenptr = 0;
        this.token = null;
    }

    scan() {
        while (true) {
            const token = scannerMain(this);
            this.tokens.push(token);
            if (token.type == Token.END) {
                break;
            }            
        }
    }

    next() {
        this.token = this.tokens[this.tokenptr++];
        return this.token;
    }

    saveState() {
        return {
            tokenptr: this.tokenptr - 1
        };
    }

    restoreState(state) {
        this.tokenptr = state.tokenptr;
        this.next();
    }

    tokenPosInfo() {
        return `${this.sourceFile}:${this.token.lineno}`;
    }

    validate() {
        if (this.tokenptr != this.tokens.length) {
            // BUG: token dump looks like [object Object]
            throw new Error(`[JOKE] Unconsumed tokens: ${this.tokens.slice(this.tokenptr - 1)}`);
        }
    }
}

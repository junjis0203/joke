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
        type: 'STRING',
        string: s
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

function getIdentifier(scanner) {
    let id = '';
    let c = scanner.data[scanner.ptr++];
    // start char check is already done
    while (isIdentifierChar(c)) {
        id += c;
        c = scanner.data[scanner.ptr++];
    }
    scanner.ptr--;
    return {
        type: 'IDENTIFIER',
        identifier: id
    }
}

function scannerMain(scanner) {
    while (true) {
        if (scanner.ptr == scanner.data.length) {
            return {
                type: 'END'
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
        case '/':
            if (scanner.data[scanner.ptr+1] == '*') {
                processMultiLineComment(scanner);
            } else if (scanner.data[scanner.ptr+1] == '/') {
                processSingleLineComment(scanner);
            }
            break;
        case '\'': case '"':
            return getString(scanner, c);
        default:
            if (isIdentifierStartChar(c)) {
                return getIdentifier(scanner);
            } else {
                return {
                    type: 'CHAR',
                    char: scanner.data[scanner.ptr++]
                };
            }
        }
    }
}

export default class Scanner {
    constructor(sourceFile, data) {
        this.sourceFile = sourceFile;
        this.data = data;
        this.ptr = 0;
        this.token = null;
        this.lineno = 1;
    }

    next() {
        this.token = scannerMain(this);
        return this.token;
    }

    tokenPosInfo() {
        return `${this.sourceFile}:${this.lineno}`;
    }
}

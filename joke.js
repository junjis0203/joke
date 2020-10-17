import JokeEngine from 'joke';
import fs from 'fs';
import readline from 'readline';

let script; // cannot use 'eval' in strict mode
let dumpParserResult = false;
let dumpAssemblerResult = false;
let traceVm = false;
let argc = 2;
while (true) {
    if (!process.argv[argc] || process.argv[argc][0] != '-') {
        break;
    }

    switch (process.argv[argc]) {
    case '-e':
        argc++;
        script = process.argv[argc];
        break;
    case '-d':
        dumpParserResult = true;
        dumpAssemblerResult = true;
        traceVm = true;
        break;
    case '-P':
        dumpParserResult = true;
        break;
    case '-A':
        dumpAssemblerResult = true;
        break;
    case '-T':
        traceVm = true;
        break;
    case '-h':
        console.log('Usage: node joke.js [options] [sourceFile]\n');
        console.log('Options:');
        console.group();
        console.log('-e script\tRun script');
        console.log('-d\t\tEnable below three options');
        console.log('-P\t\tDump parser result');
        console.log('-A\t\tDump assembler result');
        console.log('-T\t\tTrace VM');
        console.groupEnd();
        process.exit(0);
    }
    argc++;
}

const debug = {
    dumpParserResult,
    dumpAssemblerResult,
    traceVm
};

function printError(e) {
    if (e instanceof Error) {
        if (e.message.startsWith('[JOKE]')) {
            // program's bug. show only message
            console.error(`${e.name}: ${e.message}`);
        } else {
            // JOKE's bug. show stack trace
            console.error(e);
        }
    } else {
        console.error(e);
    }
}

function runScript(sourceFile, data) {
    try {
        const joke = new JokeEngine(debug);
        joke.run(sourceFile, data);
    } catch (e) {
        printError(e);
    }
}

function runSourceFile(sourceFile) {
    fs.readFile(sourceFile, 'utf8', (err, data) => {
        if (err) {
            console.error(err);
            return;
        }

        runScript(sourceFile, data);
    });
}

function executeRepl() {
    const joke = new JokeEngine(debug);
    const rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout,
        prompt: '> '
    });
    rl.on('line', (line) => {
        try {
            joke.run('<stdin>', line);
        } catch (e) {
            printError(e);
        }
        rl.prompt();
    });
    rl.on('close', () => {
        process.exit(0);
    })
    rl.prompt();
}

const sourceFile = process.argv[argc];
if (sourceFile) {
    runSourceFile(sourceFile);    
} else if (script) {
    runScript('<eval>', script);
} else {
    executeRepl();
}

import JokeEngine from 'joke';
import fs from 'fs';
import readline from 'readline';

let debug = false;
let script; // cannot use 'eval' in strict mode
let argc = 2;
while (true) {
    if (!process.argv[argc] || process.argv[argc][0] != '-') {
        break;
    }

    switch (process.argv[argc]) {
    case '-d':
        debug = true;
        break;
    case '-e':
        argc++;
        script = process.argv[argc];
        break;
    case '-h':
        console.log('Usage: node joke.js [options] [sourceFile]\n');
        console.log('Options:');
        console.group();
        console.log('-d\t\tEnable debug mode (dump compiler output)');
        console.log('-e script\tRun script');
        console.groupEnd();
        process.exit(0);
    }
    argc++;
}

function printError(e) {
    if (e.message.startsWith('[JOKE]')) {
        // program's bug. show only message
        console.error(`${e.name}: ${e.message}`);
    } else {
        // JOKE's bug. show stack trace
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

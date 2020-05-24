import JokeEngine from 'joke';
import fs from 'fs';
import readline from 'readline';

let debug = false;
let argc = 2;
while (true) {
    if (!process.argv[argc] || process.argv[argc][0] != '-') {
        break;
    }

    switch (process.argv[argc]) {
    case '-d':
        debug = true;
        break;
    case '-h':
        console.log('Usage: node joke.js [options] [sourceFile]\n');
        console.log('Options:');
        console.group();
        console.log('-d\tEnable debug mode (dump compiler output)')
        console.groupEnd();
        process.exit(0);
    }
    argc++;
}

function runSourceFile(sourceFile) {
    fs.readFile(sourceFile, 'utf8', (err, data) => {
        if (err) {
            console.error(err);
            return;
        }
    
        try {
            const joke = new JokeEngine(debug);
            joke.run(sourceFile, data);
        } catch (e) {
            console.error(`${e.name}: ${e.message}`);
        }
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
            console.error(`${e.name}: ${e.message}`);
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
} else {
    executeRepl();
}

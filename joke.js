import JokeEngine from 'joke';
import fs from 'fs';

if (!process.argv[2]) {
    console.log(`Usage: node joke.js sourceFile`);
    process.exit(0);
}

let debug = false;
let argc = 2;
while (true) {
    if (process.argv[argc][0] != '-') {
        break;
    }

    switch (process.argv[argc]) {
    case '-d':
        debug = true;
        break;
    }
    argc++;
}

const sourceFile = process.argv[argc];
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

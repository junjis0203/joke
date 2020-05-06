import JokeEngine from 'joke';
import fs from 'fs';

if (!process.argv[2]) {
    console.log(`Usage: node joke.js sourceFile`);
    process.exit(0);
}

const sourceFile = process.argv[2];
fs.readFile(sourceFile, 'utf8', (err, data) => {
    if (err) {
        console.error(err);
        return;
    }

    try {
        const joke = new JokeEngine();
        joke.run(sourceFile, data);
    } catch (e) {
        console.error(`${e.name}: ${e.message}`);
    }
});

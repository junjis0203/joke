import JokeEngine from 'joke';
import fs from 'fs';
import path from 'path';

async function check(checkProgramDir) {
    const dir = await fs.promises.opendir(checkProgramDir);
    for await (const dirent of dir) {
        const sourceFile = dirent.name;
        const sourcePath = path.join(checkProgramDir, sourceFile);
        const data = await fs.promises.readFile(sourcePath, 'utf8');
        try {
            const joke = new JokeEngine();
            joke.run(sourcePath, data);
            console.log(`${sourceFile}: OK`);
        } catch(e) {
            console.log(`${sourceFile}: NG`);
            console.error(`${e.name}: ${e.message}`);
            throw e;
        }
    }
}

check('./step')
.catch(err => {
    process.exit(1);
});

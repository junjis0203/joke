import JokeEngine from 'joke';
import fs from 'fs';
import path from 'path';

function runAndVerify(checkProgramDir, sourceFile) {
    return new Promise(async (resolve, reject) => {
        // swap console to vewrify program output
        const trueConsole = console;
        const fakeStdoutFile = `${sourceFile}.stdout`;
        const fakeStdout = fs.createWriteStream(fakeStdoutFile);
        const fakeConsole = new trueConsole.Console({stdout: fakeStdout});
        console = fakeConsole;

        const sourcePath = path.join(checkProgramDir, sourceFile);
        const data = await fs.promises.readFile(sourcePath, 'utf8');
        let ok = true;
        try {
            const joke = new JokeEngine();
            joke.run(sourcePath, data);
        } catch(e) {
            ok = false;
            reject(e);
        } finally {
            console = trueConsole;
        }

        // verify whether output is expect
        fakeStdout.on('finish', async () => {
            if (ok) {
                const expectPath = path.join(checkProgramDir, `${sourceFile}.expect`);
                let expect = await fs.promises.readFile(expectPath, 'utf8');
                let actual = await fs.promises.readFile(fakeStdoutFile, 'utf8');
        
                // consider CRLF
                expect = expect.replace(/\r\n/g, '\n');
                actual = actual.replace(/\r\n/g, '\n');
                if (expect == actual) {
                    resolve();
                } else {
                    ok = false;
                    reject(new Error('Program output is not expected'));
                }
            }

            if (ok) {
                fs.promises.unlink(fakeStdoutFile)
            }
        });
        fakeStdout.end();
    });
}

async function check(checkProgramDir) {
    const dir = await fs.promises.opendir(checkProgramDir);
    let okCount = 0;
    let ngCount = 0;
    for await (const dirent of dir) {
        const subdirName = dirent.name;
        console.log(subdirName);
        console.group();

        const subdirPath = path.join(checkProgramDir, subdirName);
        const subdir = await fs.promises.opendir(subdirPath);
        for await (const subdirent of subdir) {
            if (!subdirent.name.endsWith('.js')) {
                continue;
            }
    
            const sourceFile = subdirent.name;
            try {
                await runAndVerify(subdirPath, sourceFile);
                console.log(`${sourceFile}: OK`);
                okCount++;
            } catch(e) {
                console.log(`${sourceFile}: NG`);
                console.error(`${e.name}: ${e.message}`);
                ngCount++;
            }
        }

        console.groupEnd();
    }
    console.log(`total: ${okCount + ngCount}, OK: ${okCount}, NG: ${ngCount}`);
    return ngCount > 0 ? 1 : 0;
}

check('./step')
.then(exitCode => {
    process.exit(exitCode);
});

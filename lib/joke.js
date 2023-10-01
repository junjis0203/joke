import * as runtime from './runtime.js';
const { SourceText } = runtime;

export default class JokeEngine {
    constructor(debug = {}) {
        this.debug = debug;
    }

    /*
    caller must pass source code using data.
    sourceFile is used for showing error only.
    */
    run(sourceFile, data) {
        runtime.setDebugOption(this.debug);
        const sourceText = new SourceText(sourceFile, data);
        runtime.pushSourceText(sourceText);
        runtime.initialization();
    } 
}

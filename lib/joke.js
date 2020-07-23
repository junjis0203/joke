import Scanner from './scanner.js';
import Parser from './parser.js';
import Validator from './validator.js';
import Assembler from './assembler.js';
import Vm from './vm.js';
import { initializeGlobalScope } from './object.js';

export default class JokeEngine {
    constructor(debug = {}) {
        this.debug = debug;
        // preserve scope for REPL
        this.globalScope = initializeGlobalScope();
    }

    makeScopeForValidator() {
        let names = this.globalScope.getVariableNames();
        const scope = {};
        for (const name of names) {
            scope[name] = true;
        }
        return scope;
    }

    /*
    caller must pass source code using data.
    sourceFile is used for showing error only.
    */
    run(sourceFile, data) {
        const scanner = new Scanner(sourceFile, data);
        scanner.scan();
        if (this.debug.dumpParserResult) {
            console.log('Scanner result:');
            console.group();
            console.log(scanner.tokens);
            console.groupEnd();
            console.log();
        }

        const parser = new Parser(scanner);
        const node = parser.parse();
        if (this.debug.dumpParserResult) {
            console.log('Parser result:');
            console.group();
            // second argument is for Node.js
            console.dir(node, {depth: null});
            console.groupEnd();
            console.log();
        }

        const validator = new Validator();
        validator.validate(node, this.makeScopeForValidator());

        const assembler = new Assembler();
        const insnsList = assembler.assemble(node);
        if (this.debug.dumpAssemblerResult) {
            console.log('Assembler result:');
            console.group();
            // loop to show list no.
            for (let i = 0; i < insnsList.length; i++) {
                console.log(`#${i}:`);
                console.dir(insnsList[i], {depth: null});
                if (i != insnsList.length - 1) {
                    console.log();
                }
            }
            console.groupEnd();
            console.log();
        }

        const vm = new Vm(this.debug);
        vm.run(insnsList, this.globalScope);
    } 
}

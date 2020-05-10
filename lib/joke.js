import Scanner from './scanner.js';
import Parser from './parser.js';
import Assembler from './assembler.js';
import Vm from './vm.js';
import { initializeGlobalScope } from './object.js';

export default class JokeEngine {
    constructor(debug = false) {
        this.debug = debug;
    }

    /*
    caller must pass source code using data.
    sourceFile is used for showing error onnly.
    */
    run(sourceFile, data) {
        const scanner = new Scanner(sourceFile, data, this.debug);
        if (this.debug) {
            console.log('Scanner result:');
            console.group();
        }
        const parser = new Parser(scanner);
        const node = parser.parse();
        if (this.debug) {
            console.groupEnd();
            console.log();
        }
        if (this.debug) {
            console.log('Parser result:');
            console.group();
            // second argument is for Node.js
            console.dir(node, {depth: null});
            console.groupEnd();
            console.log();
        }

        const assembler = new Assembler();
        const insns = assembler.assemble(node);
        if (this.debug) {
            console.log('Assembler result:');
            console.group();
            console.log(insns);
            console.groupEnd();
            console.log();
        }

        const vm = new Vm();
        const globalScope = initializeGlobalScope();
        vm.run(insns, globalScope);
    } 
}

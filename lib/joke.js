import Scanner from './scanner.js';
import Parser from './parser.js';
import Assembler from './assembler.js';
import Vm from './vm.js';
import { initializeGlobalScope } from './object.js';

export default class JokeEngine {
    /*
    caller must pass source code using data.
    sourceFile is used for showing error onnly.
    */
    run(sourceFile, data) {
        const scanner = new Scanner(sourceFile, data);
        const parser = new Parser(scanner);
        const node = parser.parse();

        const assembler = new Assembler();
        const insns = assembler.assemble(node);

        const vm = new Vm();
        const globalScope = initializeGlobalScope();
        vm.run(insns, globalScope);
    } 
}

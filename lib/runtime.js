import { createRealm, setRealmGlobalObject, setDefaultGlobalBindings } from './runtime/realm.js';
import { ExecutionContext, getRunningExecutionContext, pushExecutionContext } from './runtime/execution_context.js';
import { enqueueJob, nextJob } from './runtime/job.js';
import { OrdinaryObject } from './runtime/ordinary_object.js';
import { NativeFunction } from './runtime/native_function.js';

let debugOption = {};
export function setDebugOption(opt) {
    debugOption = opt;
};

export class SourceText {
    constructor(path, text) {
        this.path = path;
        this.text = text;
    }
};

const sourceTexts = [];
export function pushSourceText(sourceText) {
    sourceTexts.push(sourceText);
}

export function initialization() {
    const realm = createRealm();
    const newContext = new ExecutionContext();
    newContext.functionObject = null;
    newContext.realm = realm;
    pushExecutionContext(newContext);
    initializeHostDefinedRealm(realm);
    for (const sourceText of sourceTexts) {
        enqueueJob('ScriptJobs', scriptEvaluationJob, [sourceText]);
    }
    // clear enqueued source
    sourceTexts.length = 0;
    nextJob();
};

function initializeHostDefinedRealm(realm) {
    const _global = undefined;
    setRealmGlobalObject(realm, _global);
    const globalObj = setDefaultGlobalBindings(realm);

    // implementation defined global object properties
    {
        const jkConsole = new OrdinaryObject();
        jkConsole.set('log', new NativeFunction(
            (...args) => console.log(...args)
        ));
        globalObj.set('console', jkConsole);
    }
}

import Scanner from './scanner.js';
import Parser from './parser.js';
import Validator from './validator.js';
import Assembler from './assembler.js';
import Vm from './vm.js';

function scriptEvaluationJob(sourceText) {
    const scanner = new Scanner(sourceText.path, sourceText.text);
    scanner.scan();
    if (debugOption.dumpParserResult) {
        console.log('Scanner result:');
        console.group();
        console.log(scanner.tokens);
        console.groupEnd();
        console.log();
    }

    const parser = new Parser(scanner);
    const node = parser.parse();
    if (debugOption.dumpParserResult) {
        console.log('Parser result:');
        console.group();
        // second argument is for Node.js
        console.dir(node, {depth: null});
        console.groupEnd();
        console.log();
    }

    const validator = new Validator();
    validator.validate(node);

    const assembler = new Assembler();
    const insnsList = assembler.assemble(node);
    if (debugOption.dumpAssemblerResult) {
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

    const executionContext = getRunningExecutionContext();
    const realm = executionContext.realm;

    const vm = new Vm(debugOption);
    vm.run(insnsList, realm);

    nextJob();
}

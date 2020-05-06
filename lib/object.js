export function createScope() {
    return {
        getObject(name) {
            return this[name];
        }
    };
}
 
export function createObject() {
    return {
        getProperty(name) {
            return this[name];
        }
    };
}

export function initializeGlobalScope() {
    const jkConsole = createObject();
    jkConsole['log'] = (...args) => console.log(...args);
    
    const globalScope = createScope();
    globalScope['console'] = jkConsole;

    return globalScope;
}

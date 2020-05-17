export function createScope() {
    return {
        getObject(name) {
            return this[name];
        },
        defineObject(name, declarationType) {
            this[name] = {declarationType};
        },
        setObject(name, value, initialize=false) {
            const object = this[name];
            if (!object) {
                throw new ReferenceError(name);
            }
            if (!initialize && object.declarationType == 'const') {
                throw new TypeError('Assignment to const');
            }
            this[name].value = value;
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
    globalScope.defineObject('console');
    globalScope.setObject('console', jkConsole);

    return globalScope;
}

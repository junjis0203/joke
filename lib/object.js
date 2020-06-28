export function createScope() {
    return {
        names: [],
        
        getObjectNames() {
            return [...this.names];
        },
        getObject(name) {
            return this[name];
        },
        defineObject(name, declarationType) {
            this.names.push(name);
            this[name] = {declarationType};
        },
        setObject(name, value, initialize=false) {
            const object = this[name];
            if (!object) {
                throw new ReferenceError(`[JOKE] ${name}`);
            }
            if (!initialize && object.declarationType == 'const') {
                throw new TypeError('[JOKE] Assignment to const');
            }
            this[name].value = value;
        }
    };
}

export function createObject() {
    return {
        names: [],

        getPropertyNames() {
            return [...this.names];
        },
        getProperty(name) {
            return this[name];
        },
        setProperty(name, value) {
            if (!this.names.includes(name)) {
                this.names.push(name);
            }
            this[name] = value;
        }
    };
}

export function initializeGlobalScope() {
    const globalScope = createScope();

    // undefined is variable, not literal
    globalScope.defineObject('undefined');

    const jkConsole = createObject();
    jkConsole['log'] = (...args) => console.log(...args);
    
    globalScope.defineObject('console');
    globalScope.setObject('console', jkConsole);

    return globalScope;
}

export class Scope {
    constructor() {
        this.names = [];
        this.objects = {};
    }

    getObjectNames() {
        return [...this.names];
    }

    getObject(name) {
        return this.objects[name];
    }

    defineObject(name, declarationType) {
        this.names.push(name);
        this.objects[name] = {declarationType};
    }

    setObject(name, value, initialize=false) {
        const object = this.objects[name];
        if (!object) {
            throw new ReferenceError(`[JOKE] ${name}`);
        }
        if (!initialize && object.declarationType == 'const') {
            throw new TypeError('[JOKE] Assignment to const');
        }
        this.objects[name].value = value;
    }
}

export class JokeObject {
    constructor() {
        this.names = [];
        this.properties = {};
    }

    getPropertyNames() {
        return [...this.names];
    }

    getProperty(name) {
        return this.properties[name];
    }

    setProperty(name, value) {
        if (!this.names.includes(name)) {
            this.names.push(name);
        }
        if (typeof(value) == "object") {
            value.thisValue = this;
        }
        this.properties[name] = value;
    }
}

export function initializeGlobalScope() {
    const globalScope = new Scope();

    // undefined is variable, not literal
    globalScope.defineObject('undefined');

    const jkConsole = new JokeObject();
    jkConsole.setProperty('log', (...args) => console.log(...args));

    globalScope.defineObject('console');
    globalScope.setObject('console', jkConsole);

    return globalScope;
}

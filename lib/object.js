export class Scope {
    constructor() {
        this.names = [];
        this.variables = {};
    }

    getVariableNames() {
        return [...this.names];
    }

    getVariable(name) {
        return this.variables[name];
    }

    defineVariable(name, declarationType) {
        this.names.push(name);
        this.variables[name] = {declarationType};
    }

    setVariable(name, value, initialize=false) {
        const object = this.variables[name];
        if (!object) {
            throw new ReferenceError(`[JOKE] ${name}`);
        }
        if (!initialize && object.declarationType == 'const') {
            throw new TypeError('[JOKE] Assignment to const');
        }
        this.variables[name].value = value;
    }
}

export class JokeObject {
    constructor() {
        this.names = [];
        this.properties = {};
    }

    clone() {
        // "this" may not be JokeObject
        const newObj = new this.constructor();
        Object.assign(newObj, this);
        return newObj;
    }

    getPropertyNames() {
        return [...this.names];
    }

    getProperty(name) {
        let value;
        // need because native "constructor" is found if not set
        if (this.names.includes(name)) {
           value  = this.properties[name];
        }
        if (!value && this.names.includes('constructor')) {
            const constructor = this.properties['constructor'];
            value = constructor.searchProperty(name);
            if (value instanceof JokeObject) {
                // duplicate object and set as own property(also set thisValue)
                value = value.clone();
                this.setProperty(name, value);
            }
        }
        return value;
    }

    getSuperProperty(name) {
        const superClass = this.getProperty('constructor').superClass;
        return superClass.searchProperty(name);
    }

    setProperty(name, value) {
        if (!this.names.includes(name)) {
            this.names.push(name);
        }
        if (value instanceof JokeObject) {
            value.thisValue = this;
        }
        this.properties[name] = value;
    }
}

export class JokeFunction extends JokeObject {
    constructor() {
        super();
        this.setProperty('prototype', new JokeObject());
    }

    searchProperty(name) {
        let value;
        let target = this;
        while (target) {
            const prototype = target.getProperty('prototype');
            value = prototype.getProperty(name);
            if (value) {
                break;
            }
            target = target.superClass;
        }
        return value;
    }
}

export class JokeArray extends JokeFunction {
    constructor() {
        super();
        this.setProperty('length', 0);
    }

    addElement(elem) {
        const length = this.getProperty('length');
        this.setProperty(length, elem);
        this.setProperty('length', length + 1);
    }
}

export function initializeGlobalScope() {
    const globalScope = new Scope();

    // undefined is variable, not literal
    globalScope.defineVariable('undefined');

    const jkConsole = new JokeObject();
    jkConsole.setProperty('log', (...args) => console.log(...args));

    globalScope.defineVariable('console');
    globalScope.setVariable('console', jkConsole);

    return globalScope;
}

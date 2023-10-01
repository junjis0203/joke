export class PropertyDescriptor {
    constructor({value}) {
        this.value = value;
    }
};

export class OrdinaryObject {
    constructor() {
        this.prototype = null;
        this.properties = {};
    }

    getPrototypeOf() {
        return this.prototype;
    }

    setPrototypeOf(prototype) {
        this.prototype = prototype;
    }

    getOwnProperty(name) {
        if (this.properties.hasOwnProperty(name)) {
            return this.properties[name];
        }
    }

    defineOwnProperty(name, desc) {
        this.properties[name] = desc;
    }

    hasProperty(name) {
        const hasOwn = this.getOwnProperty(name);
        if (hasOwn !== undefined) {
            return true;
        }
        const parent = this.getPrototypeOf();
        if (parent != null) {
            return parent.hasProperty(name);
        }
        return false;
    }

    get(name, receiver) {
        const desc = this.getOwnProperty(name);
        if (desc === undefined) {
            const parent = this.getPrototypeOf();
            if (parent === null) {
                return undefined;
            }
            return parent.get(name);
        }
        if (desc.hasOwnProperty('value')) {
            return desc.value;
        }
        const getter = desc.get;
        return getter.call(receiver);
    }

    set(name, value, receiver) {
        // for internal use
        if (!receiver) {
            receiver = this;
        }

        let ownDesc = this.getOwnProperty(name);
        if (ownDesc === undefined) {
            const parent = this.getPrototypeOf();
            if (parent !== null) {
                return parent.set(name, value, receiver);
            } else {
                ownDesc = new PropertyDescriptor({value: undefined});
            }
        }
        if (ownDesc.hasOwnProperty('value')) {
            const desc = new PropertyDescriptor({value});
            return receiver.defineOwnProperty(name, desc);
        }
        const setter = ownDesc.set;
        return setter.call(receiver, [value]);
    }
};

export function objectCreate(proto, internalSlotsList) {
    if (internalSlotsList === undefined) {
        internalSlotsList = [];
    }
    const obj = new OrdinaryObject(internalSlotsList);
    obj.setPrototypeOf(proto);
    return obj;
}

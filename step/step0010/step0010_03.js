/*
Sub class.
*/
class Foo {
    constructor() {
        this.foo = 123;
    }

    method() {
        console.log(this.foo);
    }

    method2() {
        console.log(this.foo * 2);
    }
}

class Bar extends Foo {
    constructor() {
        super();
        this.bar = 345;
    }

    method() {
        super.method();
        console.log(this.bar);
    }
}

const b = new Bar();
b.method();
b.method2();

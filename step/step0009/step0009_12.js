/*
Shorthand method names.
*/
const obj = {
    foo: 123,
    bar: 'abc',
    method() {
        console.log(this.foo);
    }
};

obj.method();

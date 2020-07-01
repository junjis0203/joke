/*
Method.
*/
const obj = {
    foo: 123,
    bar: 'abc',
    method: function() {
        console.log(this.foo);
    }
};

obj.method();

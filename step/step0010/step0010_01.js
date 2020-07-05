/*
Prototype.
*/
function Foo(foo, bar) {
    this.foo = foo;
    this.bar = bar;
}

Foo.prototype.method = function() {
    console.log(this.foo, this.bar);
};

const f1 = new Foo(123, 'abc');
const f2 = new Foo(345, 'xyz');

f1.method();
f2.method();

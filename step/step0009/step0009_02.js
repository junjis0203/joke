/*
Reference same object.
*/
const obj1 = {foo: 123, bar: 'abc'};
const obj2 = obj1;

console.log(obj1 === obj2);

obj2.foo = 345;
console.log(obj1.foo);

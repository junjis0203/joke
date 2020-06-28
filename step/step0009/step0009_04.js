/*
Spread(ES2018)
*/
const obj1 = {foo: 123, bar: 'abc'};
const obj2 = {...obj1};

console.log(obj1 === obj2);
console.log(obj2.foo);

// override
const obj3 = {...obj1, foo: 345};
console.log(obj3.foo);

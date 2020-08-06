/*
Arrow function.
*/
const f1 = (a, b) => { return a + b; };
const f2 = (a, b) => a + b;

console.log(f1(1, 2));
console.log(f2(1, 2));

const g1 = a => a * a;
console.log(g1(3));

const h1 = () => console.log('hello');
h1();

const i1 = (a, b=1) => console.log(a, b);
i1(2);
i1(2, 3);

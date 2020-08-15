/*
Spread.
*/
const a = [1, 2, 3];
const b = [...a];

console.log(a === b);
for (let i = 0; i < a.length; i++) {
    console.log(a[i] === b[i]);
}

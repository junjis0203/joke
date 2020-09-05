/*
Array method(callback).
*/
const arr1 = [1, 2, 3, 4, 5];

const arr2 = arr1.filter(e => e % 2 == 0);
console.log(arr2.toString());

console.log(arr1.find(e => e > 0));
console.log(arr1.find(e => e > 5));

const arr3 = arr1.map(e => e * e);
console.log(arr3.toString());

console.log(arr1.reduce((prev, curr) => prev + curr));
console.log(arr1.reduce((prev, curr) => prev + curr, 0));

/*
Array method.
*/
const arr1 = [1, 2, 3, 4, 5];

console.log(arr1.includes(1));
console.log(arr1.includes(9));

console.log(arr1.indexOf(1));
console.log(arr1.indexOf(9));

console.log(arr1.join(','));

const arr2 = arr1.slice(1, 3);
for (const e of arr2) {
    console.log(e);
}

console.log(arr2.toString());

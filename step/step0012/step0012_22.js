/*
Array method(in-place).
*/
const arr1 = [1, 2, 3];
arr1.reverse();
for (const e of arr1) {
    console.log(e);
}

const arr2 = [2, 1, 3];
arr2.sort((a, b) => a - b);
for (const e of arr2) {
    console.log(e);
}

const arr3 = [1, 2, 3];
const arr4 = [7, 8, 9];
//arr3.splice(1, 1, ...arr4);
// argument spread is not implmented yet
arr3.splice(1, 1, 7, 8, 9);
for (const e of arr3) {
    console.log(e);
}

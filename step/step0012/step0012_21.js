/*
Basic array method.
*/
const arr = [];
arr.push(1);
arr.unshift(2);
for (let i = 0; i < arr.length; i++) {
    console.log(arr[i]);
}
console.log(arr.shift());
console.log(arr.pop());

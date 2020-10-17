/*
try-catch.
*/
try {
    console.log(1);
    throw 'exception';
    console.log(2);
} catch(e) {
    console.log(e);
}
console.log(3);

/*
throw in function.
*/
function func() {
    console.log(1);
    throw 'exception';
    console.log(2);
}

try {
    func();
} catch (e) {
    console.log(e);
}

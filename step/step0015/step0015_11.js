/*
Error object.
*/
try {
    throw new Error('some message');
} catch (e) {
    //console.log(e instanceof Error);
    console.log(e.name);
    console.log(e.message);
}

/*
rethrow.
*/
try {
    try {
        throw 'exception';
    } catch (e) {
        console.log('inner:', e);
        throw e;
    }
    console.log('inner after try-catch');
} catch (e) {
    console.log('outer:', e);
}

/*
if-else if-else.
*/
function test(a, b) {
    console.log('start');
    if (a > b) {
        console.log('a is greather than b');
    } else if (a == b) {
        console.log('a is equal to b');
    } else {
        console.log('a is less than b');
    }
    console.log('end');
}

test(5, 3);
test(3, 3);
test(3, 5);

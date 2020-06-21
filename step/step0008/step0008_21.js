/*
switch and break.
*/
function test(a) {
    switch (a) {
    case 1:
        console.log('Apple');
        break;
    case 2:
        console.log('Banana');
        // fallthrough(intendedly)
    case 3:
        console.log('Cherry');
        break;
    default:
        console.log('Other');
        break;
    }
}

test(1);
test(2);
test(3);
test(4);

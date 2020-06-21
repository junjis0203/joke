/*
continuee in switch.
*/
for (let i = 1; i <= 5; i++) {
    switch (i) {
    case 2:
        console.log('foo');
        continue; // goto next for
    case 4:
        console.log('bar');
        break; // goto switch end
    }
    console.log(i);
}

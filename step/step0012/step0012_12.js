/*
break/continue test.
*/
const arr = [1, 2, 3, 4, 5];
for (const e of arr) {
    if (e == 2) {
        continue;
    } else if (e == 4) {
        break;
    }
    console.log(e);
}

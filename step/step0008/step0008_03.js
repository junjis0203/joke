/*
while-continue.
*/
let i = 0;
while (i < 10) {
    if (i == 5) {
        i++; // redundant but need
        continue;
    }
    console.log(i);
    i++;
}

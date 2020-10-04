/*
Destructing assignment at function arguments.
*/
function func({a, b, c}) {
    console.log(a);
    console.log(b);
    console.log(c);
}

const obj = {a: 1, b: 2};
func(obj);

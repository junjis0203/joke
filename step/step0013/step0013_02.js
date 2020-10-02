/*
Rest parameter.
*/
function func(a, b, ...c) {
    console.log(c.length);
    console.log(c.toString());
}

func(1, 2);
func(1, 2, 4, 8);

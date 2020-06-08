/*
Function call with less arguments and default value.
*/
function func(a, b=1) {
    console.log(a, b);
}

func();
func(2);
func(2, 3);

/*
Lexical scope.
*/
const s1 = "foo";
const s2 = "bar";

{
    const s1 = "FOO";
    console.log(s1, s2);
}

/*
Callback.
*/
function hello(callback) {
  console.log("Hello");
  callback();
}

hello(function() {
  console.log("World");
});

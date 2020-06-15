/*
Self hosting!
*/
import JokeEngine from 'joke';

const program = `
function hello(callback) {
  console.log("Hello");
  callback();
}

hello(() => {
  console.log("World");
});
`;

const joke = new JokeEngine();
joke.run('<program>', program);

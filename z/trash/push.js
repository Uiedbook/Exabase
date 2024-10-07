const a = [1, 2, 3];
const b = [4, 5, 6];
Array.prototype.push.apply(a, b);
console.log(a);

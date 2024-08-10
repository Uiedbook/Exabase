const days = {
  mon: {},
  monw: {},
  mond: {},
  monc: {},
  monfg: {},
  monr: {},
  mone: {},
  mona: {},
  tue: [4],
  wed: {},
  thur: [1, 2, 4, 5, 6, 6],
  friday: [55_000_000_000_0000],
};
const keys = Object.keys(days);
const keyschains: any[] = [];
let kilet: any[] = [];
for (let i = 0; i < keys.length; i++) {
  const cv = keys[i];
  if (days[cv].length) {
    keyschains.push(days[cv]);
  } else {
    kilet.push(days[cv]);
    if (kilet.length === 10) {
      keyschains.push([...kilet.splice(0)]);
    }
  }
}
keyschains.push([...kilet.splice(0)]);
console.log(keyschains);

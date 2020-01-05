function boxMuller(x, y, sigma, a, k) {
  const twoPI = 2 * Math.PI;

  let u1;
  let u2;
  do {
    u1 = Math.random();
    u2 = Math.random();
  } while (u1 <= Number.EPSILON);

  const angle = twoPI * u2;
  const radius = Math.sqrt(-2 * Math.log(u1));

  let z0 = radius * Math.cos(angle);
  let z1 = radius * Math.sin(angle);

  const cosA = Math.cos(a);
  const sinA = Math.sin(a);

  const kcos2Psin2 = k * cosA ** 2 + sinA ** 2;
  const kcossinMcossin = cosA * sinA * (k - 1);
  const cos2Pksin2 = cosA ** 2 + k * sinA ** 2;

  // elliptic shape is accomplished by rotating and stretching
  // https://www.wolframalpha.com/input/?i=%7B%7Bcos%28a%29%2C-sin%28a%29%2C0%7D%2C%7Bsin%28a%29%2Ccos%28a%29%2C0%7D%2C%7B0%2C0%2C1%7D%7D*%7B%7Bk%2C0%2C0%7D%2C%7B0%2C1%2C0%7D%2C%7B0%2C0%2C1%7D%7D*%7B%7Bcos%28a%29%2Csin%28a%29%2C0%7D%2C%7B-sin%28a%29%2Ccos%28a%29%2C0%7D%2C%7B0%2C0%2C1%7D%7D
  z0 = kcos2Psin2 * z0 + kcossinMcossin * z1;
  z1 = kcossinMcossin * z0 + cos2Pksin2 * z1;

  return [z0 * sigma + x, z1 * sigma + y];
}

export default function gen({ x = 0, y = 0, sigma, angle = 0, amplitude = 2, n, category }) {
  const data = [];

  // generate normal distribution from uniform distribution using box muller algorithm and stretch it so it's elliptic
  for (let i = 0; i < n; ++i) {
    data.push([
      ...boxMuller(x, y, sigma, angle, amplitude),
      category,
      0
    ]);
  }

  return data;
}

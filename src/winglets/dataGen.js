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

  // the first transformation probably ins't needed?
  // https://www.wolframalpha.com/input/?i=%7B%7Bcos%28a%29%2C-sin%28a%29%2C0%7D%2C%7Bsin%28a%29%2Ccos%28a%29%2C0%7D%2C%7B0%2C0%2C1%7D%7D*%7B%7Bk%2C0%2C0%7D%2C%7B0%2C1%2C0%7D%2C%7B0%2C0%2C1%7D%7D*%7B%7Bcos%28a%29%2Csin%28a%29%2C0%7D%2C%7B-sin%28a%29%2Ccos%28a%29%2C0%7D%2C%7B0%2C0%2C1%7D%7D
  z0 = kcos2Psin2 * z0 + kcossinMcossin * z1;
  z1 = kcossinMcossin * z0 + cos2Pksin2 * z1;

  return [z0 * sigma + x, z1 * sigma + y];
}

export default function gen({
  x = 0,
  y = 0,
  sigma,
  angle = 0,
  amplitude = 2,
  n,
  category
}) {
  const data = [];

  // step 1 -> generate normal distribution from uniform distribution using box muller algorithm
  // step 2 -> apply transofmrations to stretch (translate (center) -> rotate -> stretch -> rotate back -> translate back)
  for (let i = 0; i < n; ++i) {
    const point = [
      ...boxMuller(x, y, sigma, angle, amplitude),
      category,
      Math.random()
    ];

    // NOTE: this leads to points being removed if out-of-bounds, if exactly n points are wanted, change from "for" to "do-while"
    if (Math.abs(point[0]) < 1 && Math.abs(point[1]) < 1) data.push(point);
  }

  return data;
}

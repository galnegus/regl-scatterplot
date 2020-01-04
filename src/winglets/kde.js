function gaussKernel([x, y]) {
  return (1 / Math.sqrt(2 * Math.PI)) * Math.exp(-0.5 * (x * x + y * y));
}

// i:0 = x-axis
// i:1 = y-axis
function mean(data, i) {
  return data.reduce((sum, point) => sum + point[i], 0) / data.length;
}

function stdDev(data) {
  const xMean = mean(data, 0);
  const yMean = mean(data, 1);
  const N = data.length; // X and Y should be the same length

  let xSum = 0;
  let ySum = 0;
  data.forEach(d => {
    xSum += (d[0] - xMean) ** 2;
    ySum += (d[1] - yMean) ** 2;
  });

  return [Math.sqrt((1 / (N - 1)) * xSum), Math.sqrt((1 / (N - 1)) * ySum)];
}

// this is supposed to be a diagonal matrix, but screw it, just imagine each element [i] is [i, i]
// see https://en.wikipedia.org/wiki/Multivariate_kernel_density_estimation#Rule_of_thumb
// OR
// equation 6.44 in "Scott, D. W. (2015). Multivariate density estimation: theory, practice, and visualization."
function getBandwidth(data) {
  const N = data.length;
  const [sdX, sdY] = stdDev(data);

  return [N ** (-1 / 6) * sdX, N ** (-1 / 6) * sdY];
}

function diff([x1, y1], [x2, y2]) {
  return [x2 - x1, y2 - y1];
}

function applyBandwidth(x, bandwidth) {
  return [x[0] / bandwidth[0], x[1] / bandwidth[1]];
}

export default function kde(
  data,
  { xMin = -1, xMax = 1, yMin = -1, yMax = 1, N }
) {
  // grid size is N x N, N >= 2

  // TODO, GPGPU
  // http://www.vizitsolutions.com/portfolio/webgl/gpgpu/

  const grid = Array(N)
    .fill()
    .map(() => Array(N).fill());

  const cellWidth = (xMax - xMin) / (N - 1);
  const cellHeight = (yMax - yMin) / (N - 1);

  const xPos = [];
  const yPos = [];
  for (let i = 0; i < N; ++i) {
    xPos.push(xMin + i * cellWidth);
    yPos.push(yMin + i * cellHeight);
  }

  const bandwidth = getBandwidth(data);

  for (let j = 0; j < N; ++j) {
    for (let i = 0; i < N; ++i) {
      grid[j][i] =
        data.reduce(
          (sum, d) =>
            sum +
            gaussKernel(applyBandwidth(diff([xPos[i], yPos[j]], d), bandwidth)),
          0
        ) /
        (data.length * bandwidth[0] * bandwidth[1]);

      // this line could be useful for debugging, but should not be used otherwise
      // if (grid[j][i] < 0.1) grid[j][i] = 0;
    }
  }

  return grid;
}

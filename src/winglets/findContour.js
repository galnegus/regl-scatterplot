import * as MarchingSquares from 'marchingsquares';

const xMin = -1;
const xMax = 1;
const yMin = -1;
const yMax = 1;

function bilinearInterpolation(x1, x2, y1, y2, f11, f21, f12, f22, x, y) {
  return (
    (f11 * (x2 - x) * (y2 - y) +
      f21 * (x - x1) * (y2 - y) +
      f12 * (x2 - x) * (y - y1) +
      f22 * (x - x1) * (y - y1)) /
    ((x2 - x1) * (y2 - y1))
  );
}

// returns bounding indices [i1, i2, j1, j2],
// assumption is made that x, y is within grid boundary and that x, y not a grid vertex.
function findClosestIndices([x, y], N) {
  const i = ((x - xMin) / (xMax - xMin)) * (N - 1);
  const j = ((y - yMin) / (yMax - yMin)) * (N - 1);

  return [Math.floor(i), Math.ceil(i), Math.floor(j), Math.ceil(j)];
}

function computePointValue(grid, point, xPos, yPos) {
  const [i1, i2, j1, j2] = findClosestIndices(point, grid.length);

  return bilinearInterpolation(
    xPos[i1],
    xPos[i2],
    yPos[j1],
    yPos[j2],
    grid[j1][i1],
    grid[j1][i2],
    grid[j2][i1],
    grid[j2][i2],
    point[0],
    point[1]
  );
}

function computePointValues(grid, points) {
  const N = grid.length;

  const cellWidth = (xMax - xMin) / (N - 1);
  const cellHeight = (yMax - yMin) / (N - 1);

  const xPos = [];
  const yPos = [];
  for (let i = 0; i < N; ++i) {
    xPos.push(xMin + i * cellWidth);
    yPos.push(yMin + i * cellHeight);
  }

  return points.map(point => computePointValue(grid, point, xPos, yPos));
}

function nPointsGreaterThanIsoValue(pointValues, isoValue) {
  // binary search
  let start = 0;
  let end = pointValues.length - 1;
  while (start !== end) {
    const middle = Math.ceil((start + end) / 2);
    if (pointValues[middle] > isoValue) end = middle - 1;
    else start = middle;
  }
  return pointValues.length - start + (pointValues[start] < isoValue ? -1 : 0);
}

export default function findContour(grid, points) {
  const sortBy = (a, b) => a - b;

  const pointValues = computePointValues(grid, points).sort(sortBy);

  // "Those density values are equidistantly sampled from low to high." -Winglets
  const minValue = pointValues[Math.floor(pointValues.length * 0.1)];
  const maxValue = pointValues[Math.floor(pointValues.length * 0.9)];
  const steps = 20;
  const dist = (maxValue - minValue) / steps;
  const isoValuesToTry = new Array(steps)
    .fill()
    .map((_, i) => minValue + i * dist);

  // "Our strategy is to trace isocontours from low density to
  //  high (i.e., outside to inside), and halt at a significant drop in the magnitude
  //  of contained points, picking the contour right before it. The drop
  //  is heuristically set to 5%."
  const optimizedGrid = new MarchingSquares.QuadTree(grid);
  let contour = null;
  let nPoints = nPointsGreaterThanIsoValue(pointValues, isoValuesToTry[0]);
  let isoLine = MarchingSquares.isoLines(optimizedGrid, isoValuesToTry[0], {
    noFrame: true
  });

  for (let i = 1; i < steps; ++i) {
    const newNPoints = nPointsGreaterThanIsoValue(
      pointValues,
      isoValuesToTry[i]
    );
    const drop = 1 - newNPoints / nPoints;

    if (isoLine.length === 1) contour = isoLine[0];
    if (drop >= 0.05) break;

    nPoints = newNPoints;
    isoLine = MarchingSquares.isoLines(optimizedGrid, isoValuesToTry[i], {
      noFrame: true
    });
  }

  if (contour === null) throw new Error("Can't find contour.");

  const cellWidth = (xMax - xMin) / (grid.length - 1);
  const cellHeight = (yMax - yMin) / (grid.length - 1);
  for (let i = 0; i < contour.length; ++i) {
    contour[i][0] = xMin + contour[i][0] * cellWidth;
    contour[i][1] = yMin + contour[i][1] * cellHeight;
  }

  return contour;
}

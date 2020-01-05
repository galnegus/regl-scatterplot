import createLine from 'regl-line';
import KDBush from 'kdbush';
import * as Yallist  from 'yallist';
import nearestNeighbor from './nearestNeighbor';

// in javascript (-1 % 2) === -1, this mod works for negative numbers
function mod(n, m) {
  return ((n % m) + m) % m;
}

function distance([x1, y1], [x2, y2]) {
  const dx = x1 - x2;
  const dy = y1 - y2;
  return Math.sqrt(dx * dx + dy * dy);
}

function buildLeftSide(
  contour,
  initIndex,
  initLength,
  distanceToPoint,
  results
) {
  let length = initLength / 2;
  let currentPoint;
  let currentIndex;
  let prevPoint = contour[initIndex];
  let prevIndex = initIndex;
  let distanceToPrev;

  while (length > 0.001) {
    // something small
    currentIndex = mod(prevIndex - 1, contour.length);
    currentPoint = contour[currentIndex];
    distanceToPrev = distance(currentPoint, prevPoint);

    if (length - distanceToPrev >= 0) {
      length -= distanceToPrev;
      prevPoint = currentPoint;
      prevIndex = currentIndex;
    } else {
      const dx = (currentPoint[0] - prevPoint[0]) / distanceToPrev;
      const dy = (currentPoint[1] - prevPoint[1]) / distanceToPrev;
      currentPoint[0] = prevPoint[0] + dx * length;
      currentPoint[1] = prevPoint[1] + dy * length;
      length = 0;
    }

    results.unshift(currentPoint[1] + distanceToPoint[1]);
    results.unshift(currentPoint[0] + distanceToPoint[0]);
  }
}

function buildRightSide(
  contour,
  initIndex,
  initLength,
  distanceToPoint,
  results
) {
  let length = initLength / 2;
  let currentPoint;
  let currentIndex;
  let prevPoint = contour[initIndex];
  let prevIndex = initIndex;
  let distanceToPrev;

  while (length > 0.001) {
    currentIndex = (prevIndex + 1) % contour.length;
    currentPoint = contour[currentIndex];
    distanceToPrev = distance(currentPoint, prevPoint);

    if (length - distanceToPrev >= 0) {
      length -= distanceToPrev;
      prevPoint = currentPoint;
      prevIndex = currentIndex;
    } else {
      const dx = (currentPoint[0] - prevPoint[0]) / distanceToPrev;
      const dy = (currentPoint[1] - prevPoint[1]) / distanceToPrev;
      currentPoint[0] = prevPoint[0] + dx * length;
      currentPoint[1] = prevPoint[1] + dy * length;
      length = 0;
    }

    results.push(currentPoint[0] + distanceToPoint[0]);
    results.push(currentPoint[1] + distanceToPoint[1]);
  }
}

// the idea with the connections is to draw all the winglets for one category with as a single line
// with invisible segments, or connections (width: 0) separating the winglets, the connections
// were created in makeWinglet, here the widths are set properly so that they are hidden!
function makeConnections(connectionIndices, width) {
  const widths = [];
  let wingletLength;
  for (let i = 0; i < connectionIndices.length; i += 2) {
    // first connect start and winglet
    widths.push(0);

    // then add widths for the winglet in between start and end
    wingletLength = (connectionIndices[i+1] - connectionIndices[i] - 2) / 2; // number of points in winglet
    for (let j = 0; j < wingletLength; ++j) {
      widths.push(width);
    }
    
    // finally add connection between winglet and end
    widths.push(0);
  }

  return widths;
}

// TODO: potential optimization, instead of one line for each point,
// one line for all of them, either using width or color property to make intermediary lines invisible
function makeWinglet(contour, index, point, length, wingletPoints, connectionIndices) {
  const results = new Yallist();

  const distanceToPoint = [
    point[0] - contour[index][0],
    point[1] - contour[index][1]
  ];
  const middle = contour[index];

  results.push(middle[0] + distanceToPoint[0]);
  results.push(middle[1] + distanceToPoint[1]);

  buildLeftSide(contour, index, length, distanceToPoint, results);
  buildRightSide(contour, index, length, distanceToPoint, results);

  // make start connection
  const first = results.shift();
  const second = results.shift();

  // todo write: results.unshift(second, first, second, first); when it works
  results.unshift(second);
  results.unshift(first);
  results.unshift(second);
  results.unshift(first);

  // make end connection
  const last = results.pop();
  const secondLast = results.pop();

  results.push(secondLast);
  results.push(last);
  results.push(secondLast);
  results.push(last);

  const startIndex = wingletPoints.length;
  wingletPoints.push(...results); // yallist is iterable, so spread operator should work
  const endIndex = wingletPoints.length - 2;
  connectionIndices.push(startIndex, endIndex);
}

export default function createWinglets(regl, contours, points, width) {
  const spatialPoints = new Array(contours.length * contours[0].length);
  const nContourPoints = contours[0].length;

  for (let i = 0; i < contours.length; ++i) {
    for (let j = 0; j < contours[i].length; ++j) {
      spatialPoints[i * nContourPoints + j] = {
        position: contours[i][j],
        contour: contours[i],
        index: j
      };
    }
  }

  const kdTree = new KDBush(
    spatialPoints,
    p => p.position[0],
    p => p.position[1],
    64
  );

  const wings = points.map(point => nearestNeighbor(kdTree, point));
  // new Array(points.length).fill().map((_, i) =>

  const wingletPoints = [];
  const connectionIndices = [];

  for (let i = 0; i < points.length; ++i) {
    makeWinglet(wings[i].contour, wings[i].index, points[i], 0.05, wingletPoints, connectionIndices);
  }
  const widths = makeConnections(connectionIndices, width);

  return createLine(regl, {
    widths,
    is2d: true,
    points: wingletPoints
  });
}

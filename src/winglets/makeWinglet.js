import * as LinkedList from 'mnemonist/linked-list';

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

// TODO: potential optimization, instead of one line for each point,
// one line for all of them, either using width or color property to make intermediary lines invisible
export default function makeWinglet(contour, index, point, length) {
  const results = new LinkedList();

  const distanceToPoint = [
    point[0] - contour[index][0],
    point[1] - contour[index][1]
  ];
  const middle = contour[index];

  results.push(middle[0] + distanceToPoint[0]);
  results.push(middle[1] + distanceToPoint[1]);

  buildLeftSide(contour, index, length, distanceToPoint, results);
  buildRightSide(contour, index, length, distanceToPoint, results);

  return results.toArray();
}

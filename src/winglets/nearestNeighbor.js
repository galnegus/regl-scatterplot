function sqDist(ax, ay, bx, by) {
  const dx = ax - bx;
  const dy = ay - by;
  return dx * dx + dy * dy;
}

// see https://en.wikipedia.org/wiki/K-d_tree#Nearest_neighbour_search
// copied a lot from https://github.com/mourner/kdbush/blob/master/src/within.js
export default function nearestNeighbor(kdBush, [qx, qy]) {
  const stack = [0, kdBush.ids.length - 1, 0];
  let minSqDist = Number.MAX_VALUE;
  let minDist = Number.MAX_VALUE;
  let nearest = null;

  // recursively search for items within radius in the kd-sorted arrays
  while (stack.length) {
    const axis = stack.pop();
    const right = stack.pop();
    const left = stack.pop();

    // if we reached "tree node", search linearly
    if (right - left <= kdBush.nodeSize) {
      for (let i = left; i <= right; i++) {
        const tempSqDist = sqDist(
          kdBush.coords[2 * i],
          kdBush.coords[2 * i + 1],
          qx,
          qy
        );
        if (tempSqDist <= minSqDist) {
          nearest = kdBush.ids[i];
          minSqDist = tempSqDist;
          minDist = Math.sqrt(minSqDist);
        }
      }
      continue; // eslint-disable-line no-continue
    }

    // otherwise find the middle index
    const m = (left + right) >> 1; // eslint-disable-line no-bitwise

    // include the middle item if it's in range
    const x = kdBush.coords[2 * m];
    const y = kdBush.coords[2 * m + 1];
    const tempSqDist = sqDist(x, y, qx, qy);
    if (tempSqDist <= minSqDist) {
      nearest = kdBush.ids[m];
      minSqDist = tempSqDist;
      minDist = Math.sqrt(minSqDist);
    }

    // queue search in halves that intersect the query
    if (axis === 0 ? qx - minDist <= x : qy - minDist <= y) {
      stack.push(left);
      stack.push(m - 1);
      stack.push(1 - axis);
    }
    if (axis === 0 ? qx + minDist >= x : qy + minDist >= y) {
      stack.push(m + 1);
      stack.push(right);
      stack.push(1 - axis);
    }
  }

  return kdBush.points[nearest];
}

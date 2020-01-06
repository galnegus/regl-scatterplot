function distance([x1, y1], [x2, y2]) {
  const dx = x1 - x2;
  const dy = y1 - y2;
  return Math.sqrt(dx * dx + dy * dy);
}

function getNPointsInCategory(points) {
  const nPointsInCategory = {};
  for (let i = 0; i < points.length; ++i) {
    nPointsInCategory[points[i][2]] = (nPointsInCategory[points[i][2]] || 0) + 1;
  }
  return nPointsInCategory;
}

// sets the value of each point (fourth index, points[i][3]) to its silhouette index
// https://en.wikipedia.org/wiki/Silhouette_(clustering)
export default function silhouetteIndex(points) {
  const nPointsInCategory = getNPointsInCategory(points);
  const categories = Object.keys(nPointsInCategory);

  if (categories.length < 2) {
    points.forEach((point) => point[3] = 1);
    return;
  }

  const sumByCategory = {};
  categories.forEach((category) => {
    sumByCategory[category] = new Array(points.length).fill(0);
  });

  let dist;
  for (let i = 0; i < points.length; ++i) {
    for (let j = i + 1; j < points.length; ++j) {
      dist = distance(points[i], points[j]);
      sumByCategory[points[j][2]][i] += dist;
      sumByCategory[points[i][2]][j] += dist;
    }
  }

  let a;
  let b;
  let s;
  for (let i = 0; i < points.length; ++i) {
    a = sumByCategory[points[i][2]][i] / (nPointsInCategory[points[i][2]] - 1);
    const bSums = [];
    for (let j = 0; j < categories.length; ++j) {
      if (categories[j] !== String(points[i][2]))
        bSums.push(sumByCategory[categories[j]][i] / nPointsInCategory[categories[j]]);
    }
    b = Math.min(...bSums);
    s = (nPointsInCategory[points[i][2]] > 1 ? (b - a) / Math.max(a, b) : 0);

    // s will be between -1 and 1, we want it between 0 and 1, so normalize!
    s = (s + 1) / 2;
    points[i][3] = s;
  }
}

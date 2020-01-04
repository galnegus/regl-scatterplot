import _groupBy from 'lodash-es/groupBy';
import _flatten from 'lodash-es/flatten';
import createLine from 'regl-line';
import KDBush from 'kdbush';
import kde from './kde';
import findContour from './findContour';
import nearestNeighbor from './nearestNeighbor';
import makeWinglet from './makeWinglet';

const contourScales = [0.1, 0.19, 0.31, 0.47, 0.65, 0.86, 1.1, 1.37, 1.67, 2];

const defaultColors = [
  [255, 255, 255, 1],
  [240, 240, 240, 1],
  [217, 217, 217, 1],
  [189, 189, 189, 1],
  [150, 150, 150, 1],
  [115, 115, 115, 1],
  [82, 82, 82, 1],
  [37, 37, 37, 1],
  [0, 0, 0, 1]
];

function computeCentroid(points) {
  const centroid = [0, 0];
  points.forEach(point => {
    centroid[0] += point[0];
    centroid[1] += point[1];
  });
  centroid[0] /= points.length;
  centroid[1] /= points.length;

  return centroid;
}

// https://www.wolframalpha.com/input/?i=%7B%7B1%2C0%2Ca%7D%2C%7B0%2C1%2Cb%7D%2C%7B0%2C0%2C1%7D%7D+*+%7B%7Bk%2C0%2C0%7D%2C%7B0%2Ck%2C0%7D%2C%7B0%2C0%2C1%7D%7D+*+%7B%7B1%2C0%2C-a%7D%2C%7B0%2C1%2C-b%7D%2C%7B0%2C0%2C1%7D%7D
function interpolateContour(globalReferenceContour, [cX, cY], k) {
  const newContour = new Array(globalReferenceContour.length);
  for (let i = 0; i < globalReferenceContour.length; ++i) {
    newContour[i] = [
      k * (globalReferenceContour[i][0] - cX) + cX,
      k * (globalReferenceContour[i][1] - cY) + cY
    ];
  }
  return newContour;
}

function darkenColor([r, g, b, a], k) {
  if (k < 0) throw new Error('k must be positive');
  return [r * k, g * k, b * k, a];
}

export default class Winglets {
  constructor({ regl }) {
    this.regl = regl;
    this.categories = [];
    this.contourLines = {};
    this.wingletLines = {};
    this.colors = defaultColors;
    this.appliedColors = null;
  }

  draw(projection, model, view) {
    this.categories.forEach(category => {
      /* for (let i = 0; i < this.contourLines[category].length; ++i) {
        this.contourLines[category][i].draw({ projection, model, view });
      } */

      for (let i = 0; i < this.wingletLines[category].length; ++i) {
        this.wingletLines[category][i].draw({ projection, model, view });
      }
    });
  }

  processCategory(points, category) {
    const kdeGrid = kde(points, { N: 100 });
    const globalReferenceContour = findContour(kdeGrid, points);

    const centroid = computeCentroid(points);
    const contours = [];
    this.contourLines[category] = new Array(contourScales.length)
      .fill()
      .map(() => createLine(this.regl, { width: 1, is2d: true }));
    contourScales.forEach((scale, i) => {
      const newContour = interpolateContour(
        globalReferenceContour,
        centroid,
        scale
      );
      contours.push(newContour);
      this.contourLines[category][i].setPoints(_flatten(newContour));
    });

    const spatialPoints = new Array(contours.length * contourScales.length);
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
    this.wingletLines[category] = new Array(points.length).fill().map((_, i) =>
      createLine(this.regl, {
        width: 1,
        is2d: true,
        points: makeWinglet(wings[i].contour, wings[i].index, points[i], 0.08)
      })
    );
  }

  setPoints(points) {
    // separate categories
    const pointsByCategory = _groupBy(points, 2);
    this.categories = Object.keys(pointsByCategory);
    this.contourLines = {};
    this.wingletLines = {};

    this.categories.forEach(category => {
      this.processCategory(pointsByCategory[category], category);
    });

    this.applyColors(true);

    // run kde on each class
    // const kdeGrids = categories.map((category) => kde(pointsByCategory[category], { N: 100 }));

    // find centroid
    // interpolate ten contours in, ten contours out
  }

  setColors(newColors) {
    this.colors = newColors;
    this.applyColors();
  }

  // This method is needed because setColors happens before setPoints.
  // So if we try to set the colors in setColors, it won't work, as no lines (or points) exist yet.
  // But if colors are changed during runtime, they still need to update, so applyColors!
  applyColors(force = false) {
    if (
      !force &&
      (this.appliedColors === this.colors || this.categories.length === 0)
    )
      return;

    this.categories.forEach((category, categoryIndex) => {
      for (let i = 0; i < this.contourLines[category].length; ++i) {
        this.contourLines[category][i].setStyle({
          color: darkenColor(this.colors[categoryIndex * 4], 0.5) ||
            darkenColor(defaultColors[categoryIndex], 0.5) || [255, 255, 255, 1]
        });
      }
      for (let i = 0; i < this.wingletLines[category].length; ++i) {
        this.wingletLines[category][i].setStyle({
          color: this.colors[categoryIndex * 4] ||
            defaultColors[categoryIndex] || [255, 255, 255, 1]
        });
      }
    });

    this.appliedColors = this.colors;
  }

  /*
  destroy() {
    // TODO maybe?
  }
  */
}

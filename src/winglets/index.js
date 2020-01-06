import _groupBy from 'lodash-es/groupBy';
import _flatten from 'lodash-es/flatten';
import createLine from 'regl-line';
import kde from './kde';
import findContour from './findContour';
import createWinglets from './createWinglets';
import silhouetteIndex from './silhouetteIndex';

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
  if (k > 1) throw new Error('k must be < 1');
  return [r * k, g * k, b * k, a];
}

function getBBox(points, margin) {
  let xMin = Number.MAX_VALUE;
  let xMax = Number.MIN_VALUE;
  let yMin = Number.MAX_VALUE;
  let yMax = Number.MIN_VALUE;

  for (let i = 0; i < points.length; ++i) {
    if (points[i][0] < xMin) xMin = points[i][0];
    if (points[i][0] > xMax) xMax = points[i][0];
    if (points[i][1] < yMin) yMin = points[i][1];
    if (points[i][1] > yMax) yMax = points[i][1];
  }

  return {
    xMin: xMin - margin,
    xMax: xMax + margin,
    yMin: yMin - margin,
    yMax: yMax + margin
  };
}

const defaultOptions = {
  showWinglets: true,
  showContours: false,
  lineWidth: 1,
  a: 0.01,
  b: 0.08,
  n: 1,
  contourDropoff: 0.05
};

// either draw or process for now, could be more if needed (for performance)
const optionActions = {
  showWinglets: 'draw',
  showContours: 'draw',
  lineWidth: 'draw',
  a: 'process',
  b: 'process',
  n: 'process',
  contourDropoff: 'process'
};

export default class Winglets {
  constructor(regl, options) { // see defaultOptions above for existing options!
    this.regl = regl;
    this.categories = [];
    this.pointsByCategory = {};
    this.kdeGridsByCategory = {};
    this.contourLines = {};
    this.wingletLines = {};
    this.colors = defaultColors;
    this.appliedColors = null;
    this.bbox = null;
    this.mvp = null;

    this.options = { ...defaultOptions, ...options };
  }

  draw(mvp = null) {
    let realMvp = mvp;
    if (!mvp && !this.mvp) {
      console.error('winglets.draw() missing mvp');
      return;
    }
    if (!mvp) realMvp = this.mvp;
    else this.mvp = mvp;

    this.categories.forEach(category => {
      if (this.options.showContours) {
        for (let i = 0; i < this.contourLines[category].length; ++i) {
          this.contourLines[category][i].draw(realMvp);
        }
      }

      if (this.options.showWinglets)
        this.wingletLines[category].draw(realMvp);
    });
  }

  processPoints(forceKde = true) {
    this.contourLines = {};
    this.wingletLines = {};
    this.categories.forEach(category => {
      const points = this.pointsByCategory[category];
      if (forceKde || !this.kdeGridsByCategory[category])
        this.kdeGridsByCategory[category] = kde(points, this.bbox, 100);

      const globalReferenceContour = findContour(this.kdeGridsByCategory[category], this.bbox, points, this.options);

      const centroid = computeCentroid(points);
      const contours = [];
      this.contourLines[category] = new Array(contourScales.length).fill()
        .map(() => createLine(this.regl, { width: 1, is2d: true }));
      contourScales.forEach((scale, i) => {
        const newContour = interpolateContour(globalReferenceContour, centroid, scale);
        contours.push(newContour);
        this.contourLines[category][i].setPoints(_flatten(newContour));
      });

      this.wingletLines[category] = createWinglets(this.regl, contours, points, this.options);
    });
  }

  setPoints(points) {
    silhouetteIndex(points);
    this.bbox = getBBox(points, 0.1);

    // separate categories
    this.pointsByCategory = _groupBy(points, 2);
    this.categories = Object.keys(this.pointsByCategory);
    this.kdeGridsByCategory = {};

    this.processPoints(true); // Very Important
    this.applyColors(true);
  }

  setColors(newColors) {
    this.colors = newColors;
    this.applyColors();
  }

  // This method is needed because setColors happens before setPoints.
  // So if we try to set the colors in setColors, it won't work, as no lines (or points) exist yet.
  // But if colors are changed during runtime, they still need to update, so applyColors!
  applyColors(force = false) {
    if (!force && (this.appliedColors === this.colors || this.categories.length === 0))
      return;

    this.categories.forEach((category, categoryIndex) => {
      for (let i = 0; i < this.contourLines[category].length; ++i) {
        this.contourLines[category][i].setStyle({
          color: darkenColor(this.colors[categoryIndex * 4], 0.5) ||
            darkenColor(defaultColors[categoryIndex], 0.5) || [255, 255, 255, 1]
        });
      }
      this.wingletLines[category].setStyle({
        color: this.colors[categoryIndex * 4] ||
          defaultColors[categoryIndex] || [255, 255, 255, 1]
      });
    });

    this.appliedColors = this.colors;
  }

  // see defaultOptions higher up
  setOptions(options) {
    this.options = { ...this.options, ...options };

    // this feels really stupid
    const action = {
      draw: false,
      process: false
    }
    Object.keys(options).forEach((option) => {
      action[optionActions[option]] = true;
    });

    if (action.process) this.processPoints(false);
    this.draw();
  }

  // don't know if this is needed, but why the hell not?
  destroy() {
    this.categories.forEach(category => {
      for (let i = 0; i < this.contourLines[category].length; ++i) {
        this.contourLines[category][i].destroy();
      }
      this.wingletLines[category].destroy();
    });
  }

}

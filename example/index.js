/* eslint no-console: 0 */

import createScatterplot from '../src';
import gen from '../src/winglets/dataGen';

const canvas = document.querySelector('#canvas');
const numPointsEl = document.querySelector('#num-points');
const numPointsValEl = document.querySelector('#num-points-value');
const pointSizeEl = document.querySelector('#point-size');
const pointSizeValEl = document.querySelector('#point-size-value');
const opacityEl = document.querySelector('#opacity');
const opacityValEl = document.querySelector('#opacity-value');
const resetEl = document.querySelector('#reset');

let { width, height } = canvas.getBoundingClientRect();

let points = [];
let numPoints = 100;
let pointSize = 5;
let opacity = 0.9;
let selection = [];

const lassoMinDelay = 10;
const lassoMinDist = 2;
const showRecticle = true;
const recticleColor = [1, 1, 0.878431373, 0.33];

const pointoverHandler = pointId => {
  console.log('Over point:', pointId);
  const [x, y, category, value] = points[pointId];
  console.log(`X: ${x}\nY: ${y}\nCategory: ${category}\nValue: ${value}`);
};

const pointoutHandler = pointId => {
  console.log('Out point:', pointId);
  const [x, y, category, value] = points[pointId];
  console.log(`X: ${x}\nY: ${y}\nCategory: ${category}\nValue: ${value}`);
};

const selectHandler = ({ points: selectedPoints }) => {
  console.log('Selected:', selectedPoints);
  selection = selectedPoints;
  if (selection.length === 1) {
    const point = points[selection[0]];
    console.log(
      `X: ${point[0]}\nY: ${point[1]}\nCategory: ${point[2]}\nValue: ${
        point[3]
      }`
    );
  }
};

const deselectHandler = () => {
  console.log('Deselected:', selection);
  selection = [];
};

const scatterplot = createScatterplot({
  canvas,
  width,
  height,
  lassoMinDelay,
  lassoMinDist,
  pointSize,
  showRecticle,
  recticleColor
});

console.log(`Scatterplot v${scatterplot.get('version')}`);

scatterplot.subscribe('pointover', pointoverHandler);
scatterplot.subscribe('pointout', pointoutHandler);
scatterplot.subscribe('select', selectHandler);
scatterplot.subscribe('deselect', deselectHandler);

const resizeHandler = () => {
  ({ width, height } = canvas.getBoundingClientRect());
  scatterplot.set({ width, height });
};

window.addEventListener('resize', resizeHandler);

const generatePoints = (num, category) => {
  const sigma = Math.random() / 3 + 0.1;
  const max = 1 - sigma * 2 - 0.2; // want x, y mean in interval (-max, max) to avoid points outside of canvas boundary.

  return gen({
    x: Math.random() * max * 2 - max,
    y: Math.random() * max * 2 - max,
    sigma,
    angle: Math.random() * Math.PI,
    amplitude: Math.random(),
    n: num,
    category
  });
};

/* new Array(num).fill().map(() => [
  -1 + Math.random() * 2, // x
  -1 + Math.random() * 2, // y
  Math.round(Math.random()), // category
  Math.random() // value
]); */

const setNumPoint = newNumPoints => {
  numPoints = newNumPoints;
  numPointsEl.value = numPoints;
  numPointsValEl.innerHTML = numPoints;
  points = new Array(2)
    .fill()
    .map((_, i) => generatePoints(numPoints, i))
    .reduce((acc, curr) => acc.concat(curr), []);
  scatterplot.draw(points);

  // const winglets = createWinglets({ points });
};

const numPointsInputHandler = event => {
  numPointsValEl.innerHTML = `${+event.target
    .value} <em>release to redraw</em>`;
};

numPointsEl.addEventListener('input', numPointsInputHandler);

const numPointsChangeHandler = event => setNumPoint(+event.target.value);

numPointsEl.addEventListener('change', numPointsChangeHandler);

const setPointSize = newPointSize => {
  pointSize = newPointSize;
  pointSizeEl.value = pointSize;
  pointSizeValEl.innerHTML = pointSize;
  scatterplot.set({ pointSize });
};

const pointSizeInputHandler = event => setPointSize(+event.target.value);

pointSizeEl.addEventListener('input', pointSizeInputHandler);

const setOpacity = newOpacity => {
  opacity = newOpacity;
  opacityEl.value = opacity;
  opacityValEl.innerHTML = opacity;
  scatterplot.set({ opacity });
};

const opacityInputHandler = event => setOpacity(+event.target.value);

opacityEl.addEventListener('input', opacityInputHandler);

const resetClickHandler = () => {
  scatterplot.reset();
};

resetEl.addEventListener('click', resetClickHandler);

// http://colorbrewer2.org/?type=qualitative&scheme=Set3&n=10
const colorsCat = [
  '#fccde5',
  '#8dd3c7',
  '#ffffb3',
  '#bebada',
  '#fb8072',
  '#80b1d3',
  '#fdb462',
  '#b3de69',
  '#d9d9d9',
  '#bc80bd'
];
scatterplot.set({ colorBy: 'category', colors: colorsCat });

/*
const colorsScale = [
  '#002072',
  '#162b79',
  '#233680',
  '#2e4186',
  '#394d8d',
  '#425894',
  '#4b649a',
  '#5570a1',
  '#5e7ca7',
  '#6789ae',
  '#7195b4',
  '#7ba2ba',
  '#85aec0',
  '#90bbc6',
  '#9cc7cc',
  '#a9d4d2',
  '#b8e0d7',
  '#c8ecdc',
  '#ddf7df',
  '#ffffe0'
];
*/
// scatterplot.set({ colorBy: 'value', colors: colorsScale });

setPointSize(pointSize);
setOpacity(opacity);
setNumPoint(numPoints);

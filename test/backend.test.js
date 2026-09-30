'use strict';

const { test } = require('node:test');
const assert = require('node:assert/strict');
const { loadFactories, instantiate } = require('./load-angular');

const backend = instantiate(loadFactories(['backend.factory.js']).Backend);

test('fromXY: center of the field is the 50 yardline', () => {
  const loc = backend.fromXY(192, 0, false);
  assert.equal(loc.yardline, 50);
  assert.equal(loc.marker, 0);
});

test('fromXY: marker depends on y and field type', () => {
  assert.equal(backend.fromXY(100, 10, true).marker, 0);
  assert.equal(backend.fromXY(100, 150, true).marker, 3);
  assert.equal(backend.fromXY(100, 10, false).marker, 0);
});

test('toXY: front-sideline, 50 yardline, on-the-line, high school', () => {
  const { x, y } = backend.toXY(0, 0, 0, 50, false, true, false, true);
  assert.deepEqual({ x, y }, { x: 192, y: 0 });
});

test('toXY: marker offsets y by steps (2 units per step)', () => {
  const behind = backend.toXY(0, 2, 1, 50, false, true, false, true);
  const front = backend.toXY(0, 2, 1, 50, true, true, false, true);
  assert.equal(behind.y - front.y, 8);
});

test('calculate: returns a delay for every field point, time source highlighted', () => {
  const ts = { x: 192, y: 0 };
  const fp = { x: 192, y: -150 };
  const delays = backend.calculate(ts, fp, 0.05, false);
  const cell = delays.find((d) => d && d.x === 192 && d.y === 0);
  assert.equal(cell.color, '#ffff00');
  assert.ok(delays.filter(Boolean).every((d) => typeof d.value === 'number'));
});

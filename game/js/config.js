// LAMPBLACK — config: constants, seeded RNG, themes.
// Written fresh for this entry. No external assets, no network.
(function (global) {
  'use strict';

  var TILE = 40;            // px per tile
  var COLS = 32;            // map width in tiles
  var ROWS = 15;            // map height in tiles
  var MAP_W = COLS * TILE;  // 1280
  var MAP_H = ROWS * TILE;  // 600
  var MAP_X = 0;            // map drawn at canvas x 0
  var MAP_Y = 80;           // map top offset (below the 64px HUD bar + 16px gap)
  var CANVAS_W = 1280;
  var CANVAS_H = 720;

  // Seeded RNG (mulberry32) — every decorative random choice comes from a
  // fixed seed, so renders are reproducible shot to shot.
  function mulberry32(seed) {
    var a = seed >>> 0;
    return function () {
      a |= 0; a = (a + 0x6D2B79F5) | 0;
      var t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  function clamp(v, lo, hi) { return v < lo ? lo : v > hi ? hi : v; }
  function lerp(a, b, t) { return a + (b - a) * t; }
  function dist(x1, y1, x2, y2) {
    var dx = x2 - x1, dy = y2 - y1;
    return Math.sqrt(dx * dx + dy * dy);
  }
  function angleTo(x1, y1, x2, y2) { return Math.atan2(y2 - y1, x2 - x1); }
  function angleDiff(a, b) {
    var d = a - b;
    while (d > Math.PI) d -= Math.PI * 2;
    while (d < -Math.PI) d += Math.PI * 2;
    return d;
  }

  // Per-level visual themes. Each job has its own palette so the three
  // levels never look monotonous.
  var THEMES = {
    vault: {
      name: 'vault',
      floorA: '#252f42', floorB: '#212a3b', darkA: '#1a2231', darkB: '#171e2b',
      wall: '#33405a', wallTop: '#4a5a78', wallLine: '#232c3e',
      crate: '#7a5a34', crateDark: '#5d4426', crateLight: '#9c7a4a',
      barrel: '#6b4e2e', lampGlow: '255,190,90', grassA: '#4d7a3a', grassB: '#6a9a4a',
      accent: '#c9a86a', water: null, stone: '#5a6472'
    },
    glasshouse: {
      name: 'glasshouse',
      floorA: '#24382c', floorB: '#1f3026', darkA: '#16241c', darkB: '#12201a',
      wall: '#2c4636', wallTop: '#42604e', wallLine: '#1e2e24',
      crate: '#6a5a3a', crateDark: '#52452c', crateLight: '#8a7a52',
      barrel: '#5d4a2c', lampGlow: '190,230,140', grassA: '#3f8f3f', grassB: '#67b85a',
      accent: '#9fc98a', water: '#2a5266', stone: '#6a7078'
    },
    gala: {
      name: 'gala',
      floorA: '#54402e', floorB: '#3d2c1e', darkA: '#3a2a1e', darkB: '#33261a',
      wall: '#5a4030', wallTop: '#7a5a40', wallLine: '#3a2a1e',
      crate: '#7a5a34', crateDark: '#5d4426', crateLight: '#9c7a4a',
      barrel: '#6b4e2e', lampGlow: '255,200,110', grassA: '#4d7a3a', grassB: '#6a9a4a',
      accent: '#d8b25e', water: null, stone: '#6a6472'
    }
  };

  global.LAMP = global.LAMP || {};
  global.LAMP.cfg = {
    TILE: TILE, COLS: COLS, ROWS: ROWS, MAP_W: MAP_W, MAP_H: MAP_H,
    MAP_X: MAP_X, MAP_Y: MAP_Y, CANVAS_W: CANVAS_W, CANVAS_H: CANVAS_H,
    mulberry32: mulberry32, clamp: clamp, lerp: lerp, dist: dist,
    angleTo: angleTo, angleDiff: angleDiff, THEMES: THEMES
  };
})(typeof window !== 'undefined' ? window : globalThis);

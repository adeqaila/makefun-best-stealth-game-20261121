// LAMPBLACK — level definitions: 3 jobs, 3 distinct themes/palettes.
// Map legend: # wall . floor , dark floor g tall grass C crate B barrel
// L lamp P pond S stone T table ~ creaky boards * valuable E exit hatch p player
// Written fresh for this entry.
(function (global) {
  'use strict';
  var cfg = global.LAMP.cfg;

  function parseMap(rows) {
    var grid = [];
    for (var r = 0; r < rows.length; r++) grid.push(rows[r].split(''));
    return grid;
  }
  function findAll(grid, ch) {
    var out = [];
    for (var r = 0; r < grid.length; r++)
      for (var c = 0; c < grid[r].length; c++)
        if (grid[r][c] === ch) out.push({ tx: c, ty: r });
    return out;
  }

  var LEVELS = [
    {
      id: 1, job: 'JOB 1: THE ROPEWALK',
      name: 'The Ropewalk', theme: 'vault',
      objective: 'STEAL THE BRASS SEAL, THEN ESCAPE',
      sub: 'The Brass Seal taken, out through the hatch.',
      valuables: ['Brass Seal', 'Clockmaker\u2019s Key'],
      wardenNames: ['Warden Bram', 'Warden Odo'],
      map: parseMap([
        '################################',
        '#......#.....#.......#.........#',
        '#.p....#..C..#...L...#...*.....#',
        '#......#.....#.......#.........#',
        '#..g...#.....#.......#...C.....#',
        '#......#..L..#...g...#.........#',
        '###.####.....#####.####..###.###',
        '#.....,..........,....,,.......#',
        '#..C..,....g.....,....L........#',
        '#.....,..........,....,,.......#',
        '#..L..#.....C....#.......*.....#',
        '#.....#..........#....C........#',
        '#..g..#..L.......#.............#',
        '#..E..#..........#....C........#',
        '################################'
      ]),
      guards: [
        { waypoints: [[6, 2], [6, 5], [11, 5], [11, 2]], pause: 1.2, speed: 1.5, name: 'Warden Bram' },
        { waypoints: [[20, 8], [27, 8], [27, 12], [20, 12]], pause: 1.0, speed: 1.5, name: 'Warden Odo' }
      ]
    },
    {
      id: 2, job: 'JOB 2: THE GLASSHOUSE',
      name: 'The Glasshouse', theme: 'glasshouse',
      objective: 'STEAL THE MOONPETAL ORCHID',
      sub: 'The orchid, left unguarded — in and out through the ferns.',
      valuables: ['Moonpetal Orchid', 'Glass Vial'],
      wardenNames: ['Warden Fern', 'Warden Wren'],
      map: parseMap([
        '################################',
        '#....g.....#......g......g.....#',
        '#.p...g....#..P...#....S.......#',
        '#....g.....#......#.....S......#',
        '#..........#..P...#............#',
        '#.g....S...#......#..g....*....#',
        '###.#####..#####.#####..####..##',
        '#......g.........P.....g.......#',
        '#.L....g....S.........g...L....#',
        '#......g.........P.....g.......#',
        '#..g...#.....P....#.....g......#',
        '#......#..........#..S....*....#',
        '#.g....#..L.......#............#',
        '#...E..#..........#....g.......#',
        '################################'
      ]),
      guards: [
        { waypoints: [[15, 2], [15, 4], [22, 4], [22, 2]], pause: 1.4, speed: 1.4, name: 'Warden Fern' },
        { waypoints: [[6, 9], [11, 9], [11, 13], [6, 13]], pause: 1.0, speed: 1.4, name: 'Warden Wren' }
      ]
    },
    {
      id: 3, job: 'JOB 3: THE LANTERN GALA',
      name: 'The Lantern Gala', theme: 'gala',
      objective: 'STEAL THE LANTERN RUBY',
      sub: 'Three prizes under the lanterns — then out, unseen.',
      valuables: ['Lantern Ruby', 'Gala Mask', 'Silver Bell'],
      wardenNames: ['Warden Corvin', 'Warden Marlow', 'Warden Pike'],
      map: parseMap([
        '################################',
        '#......#......L......#.........#',
        '#.p....#..T...#..T...#....*....#',
        '#......#......#......#.........#',
        '#..g...#..T...#..T...#...g.....#',
        '#......#......L......#.........#',
        '###.#####....#####.#####.####..#',
        '#.....~..........~......~......#',
        '#..T.....L....T......L....T....#',
        '#.....~..........~......~......#',
        '#..g...#....*....#.....T.......#',
        '#......#.........#......#......#',
        '#..T...#....L....#..g...#..*...#',
        '#..E...#.........#......#......#',
        '################################'
      ]),
      guards: [
        { waypoints: [[8, 8], [16, 8], [16, 11], [8, 11]], pause: 0.9, speed: 1.7, name: 'Warden Corvin' },
        { waypoints: [[20, 3], [26, 3], [26, 7], [20, 7]], pause: 1.1, speed: 1.7, name: 'Warden Marlow' },
        { waypoints: [[4, 10], [4, 13], [10, 13], [10, 10]], pause: 1.3, speed: 1.5, name: 'Warden Pike' }
      ]
    }
  ];

  // Validate + derive entity lists once at load.
  LEVELS.forEach(function (lv) {
    if (lv.map.length !== cfg.ROWS) throw new Error('level ' + lv.id + ' rows=' + lv.map.length);
    lv.map.forEach(function (row, i) {
      if (row.length !== cfg.COLS) throw new Error('level ' + lv.id + ' row ' + i + ' len=' + row.length);
    });
    lv.playerStart = findAll(lv.map, 'p')[0];
    lv.exit = findAll(lv.map, 'E')[0];
    lv.lootSpots = findAll(lv.map, '*');
    lv.lamps = findAll(lv.map, 'L');
    if (!lv.playerStart || !lv.exit) throw new Error('level ' + lv.id + ' missing p/E');
    if (lv.lootSpots.length !== lv.valuables.length)
      throw new Error('level ' + lv.id + ' loot mismatch');
  });

  function tileAt(lv, tx, ty) {
    if (tx < 0 || ty < 0 || tx >= cfg.COLS || ty >= cfg.ROWS) return '#';
    return lv.map[ty][tx];
  }
  function blocksSight(lv, tx, ty) {
    var t = tileAt(lv, tx, ty);
    return t === '#' || t === 'C' || t === 'B' || t === 'T' || t === 'S';
  }
  function blocksMove(lv, tx, ty) {
    var t = tileAt(lv, tx, ty);
    return t === '#' || t === 'C' || t === 'B' || t === 'T' || t === 'S' || t === 'P';
  }

  global.LAMP.levels = { LEVELS: LEVELS, tileAt: tileAt, blocksSight: blocksSight, blocksMove: blocksMove };
})(typeof window !== 'undefined' ? window : globalThis);

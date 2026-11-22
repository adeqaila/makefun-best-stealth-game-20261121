// LAMPBLACK — deterministic screenshot states (?shot=start|play|alert|end).
// Each shot builds a fixed, hand-placed scene from the real game state, so
// screenshots are reproducible and show the game itself, not a mockup.
// Written fresh for this entry.
(function (global) {
  'use strict';
  var cfg = global.LAMP.cfg;

  function tileCenter(tx, ty) {
    return { x: cfg.MAP_X + (tx + 0.5) * cfg.TILE, y: cfg.MAP_Y + (ty + 0.5) * cfg.TILE };
  }

  function apply(game, shot) {
    if (shot === 'start') {
      game.state = 'title';
      game.selectedJob = 1; // Glasshouse highlighted, like a mid-board moment.
      game.renderOnce();
      return;
    }
    if (shot === 'play') {
      // Job 2, the Glasshouse: moth hidden in the ferns, a pebble has just
      // pulled a warden off her post, field notes open.
      game.startJob(1, { silent: true });
      var p = game.player;
      var fern = tileCenter(22, 8); // a real grass tile: hidden for real
      p.x = fern.x; p.y = fern.y;
      p.pebbles = 2; p.pebblesThrown = 1;
      game.time = 53;
      var g0 = game.guards[0];
      var gp = tileCenter(19, 3);
      g0.x = gp.x; g0.y = gp.y;
      g0.dir = cfg.angleTo(g0.x, g0.y, p.x, p.y);
      g0.state = 'investigate';
      g0.bubble = '?'; g0.bubbleT = 99;
      g0.target = tileCenter(15, 9);
      var g1 = game.guards[1];
      var g1p = tileCenter(10, 10);
      g1.x = g1p.x; g1.y = g1p.y;
      g1.dir = 0.6;
      g1.state = 'patrol';
      game.alert = 0.45;
      game.fieldNotesOpen = true;
      // A fresh noise ring where the pebble landed.
      game.player.rings = [{ x: tileCenter(15, 9).x, y: tileCenter(15, 9).y, r: 42, max: 150, a: 0.85 }];
      var orchid = tileCenter(game.loot[0].tx, game.loot[0].ty);
      var ringPt = tileCenter(15, 9);
      game.callouts = [
        { x: 640, y: 300, text: 'THE ORCHID, left unguarded', ax: orchid.x, ay: orchid.y },
        { x: 700, y: 420, text: 'PEBBLE: pulls a warden off her post', ax: ringPt.x, ay: ringPt.y },
        { x: 780, y: 560, text: 'YOU: in the ferns, unseen', ax: p.x, ay: p.y },
        { x: 800, y: 150, text: 'What was that?', ax: g0.x + 10, ay: g0.y - 30 }
      ];
      game.renderOnce();
      return;
    }
    if (shot === 'alert') {
      // Job 3, the Lantern Gala: spotted mid-ballroom, red cones everywhere.
      game.startJob(2, { silent: true });
      var pl = game.player;
      var mid = tileCenter(13, 8);
      pl.x = mid.x; pl.y = mid.y;
      pl.loot = 1;
      game.loot[0].taken = true;
      game.time = 99;
      game.alert = 1;
      game.banner = true;
      game.spottedBy = 'Warden Corvin';
      var spots = [
        { tx: 10, ty: 6, dir: 0.5 },
        { tx: 17, ty: 10, dir: 2.6 },
        { tx: 6, ty: 11, dir: -0.9 }
      ];
      game.guards.forEach(function (g, i) {
        var s = spots[i];
        var c = tileCenter(s.tx, s.ty);
        g.x = c.x; g.y = c.y;
        g.dir = cfg.angleTo(c.x, c.y, mid.x, mid.y);
        g.state = 'chase';
        g.bubble = '!'; g.bubbleT = 99;
      });
      game.callouts = [
        { x: 480, y: 330, text: 'Coming!', ax: tileCenter(10, 6).x, ay: tileCenter(10, 6).y - 30 },
        { x: 620, y: 420, text: 'Thief! There!', ax: tileCenter(17, 10).x, ay: tileCenter(17, 10).y - 30 },
        { x: 430, y: 600, text: 'Coming!', ax: tileCenter(6, 11).x, ay: tileCenter(6, 11).y - 30 }
      ];
      game.renderOnce();
      return;
    }
    if (shot === 'end') {
      // Job 1 done: clean getaway, GHOST stamp, route map.
      game.startJob(0, { silent: true });
      var routeTiles = [[2, 2], [2, 5], [5, 5], [5, 8], [9, 8], [9, 11], [13, 11], [13, 13], [9, 13], [5, 13], [3, 13]];
      var route = routeTiles.map(function (t) { return tileCenter(t[0], t[1]); });
      var lv = game.level;
      game.end = {
        jobId: 1, levelName: lv.name, sub: lv.sub,
        ghost: true, theme: game.theme, map: lv.map,
        lamps: lv.lamps, exit: lv.exit, route: route,
        guardEnds: game.guards.map(function (g) { return { x: g.x, y: g.y }; }),
        stats: { time: '0:54', spotted: 0, closeCalls: 0, pebbles: 0, valuables: '2 / 2', allLoot: true, under75: true }
      };
      game.state = 'win';
      game.renderOnce();
      return;
    }
    // Unknown shot: fall back to the title.
    game.state = 'title';
    game.renderOnce();
  }

  global.LAMP.shots = { apply: apply };
})(typeof window !== 'undefined' ? window : globalThis);

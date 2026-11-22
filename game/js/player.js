// LAMPBLACK — player: movement, sneak, pebble throw, visibility, loot.
// Written fresh for this entry.
(function (global) {
  'use strict';
  var cfg = global.LAMP.cfg;
  var levels = global.LAMP.levels;

  var WALK_SPEED = 132;   // px/s
  var SNEAK_SPEED = 64;   // px/s
  var PEBBLE_RANGE = 270; // px
  var NOISE_RADIUS = 150; // px a pebble landing is heard within

  function Player(lv) {
    var s = lv.playerStart;
    this.lv = lv;
    this.x = cfg.MAP_X + (s.tx + 0.5) * cfg.TILE;
    this.y = cfg.MAP_Y + (s.ty + 0.5) * cfg.TILE;
    this.r = 11;
    this.dir = 0;          // facing angle
    this.moving = false;
    this.sneaking = false;
    this.onCreaky = false;
    this.pebbles = 3;
    this.loot = 0;
    this.lives = 3;
    this.route = [{ x: this.x, y: this.y }];
    this.routeT = 0;
    this.pebble = null;    // {x0,y0,x1,y1,t,tx,ty} flying pebble
    this.rings = [];       // expanding noise rings {x,y,r,max,a}
    this.stepT = 0;
    this.spotted = 0;      // times spotted this job
    this.closeCalls = 0;
    this.pebblesThrown = 0;
  }

  Player.prototype.tile = function () {
    return {
      tx: Math.floor((this.x - cfg.MAP_X) / cfg.TILE),
      ty: Math.floor((this.y - cfg.MAP_Y) / cfg.TILE)
    };
  };

  Player.prototype.isHiddenInCover = function () {
    var t = this.tile();
    var ch = levels.tileAt(this.lv, t.tx, t.ty);
    return ch === 'g';
  };

  Player.prototype.inDark = function () {
    var t = this.tile();
    var ch = levels.tileAt(this.lv, t.tx, t.ty);
    if (ch === ',') return true;
    // Inside a lamp pool counts as lit.
    for (var i = 0; i < this.lv.lamps.length; i++) {
      var L = this.lv.lamps[i];
      var lx = cfg.MAP_X + (L.tx + 0.5) * cfg.TILE;
      var ly = cfg.MAP_Y + (L.ty + 0.5) * cfg.TILE;
      if (cfg.dist(this.x, this.y, lx, ly) < 118) return false;
    }
    return ch === ',';
  };

  // Visibility label for the HUD: SEEN / HIDDEN / SHADOW.
  Player.prototype.visibility = function (anyGuardSees) {
    if (anyGuardSees) return 'SEEN';
    if (this.isHiddenInCover()) return 'HIDDEN';
    if (this.inDark()) return 'SHADOW';
    return 'HIDDEN';
  };

  Player.prototype.move = function (dx, dy, dt, game) {
    var speed = this.sneaking ? SNEAK_SPEED : WALK_SPEED;
    this.moving = (dx !== 0 || dy !== 0);
    if (!this.moving) return;
    var len = Math.sqrt(dx * dx + dy * dy);
    var nx = this.x + (dx / len) * speed * dt;
    var ny = this.y + (dy / len) * speed * dt;
    this.dir = Math.atan2(dy, dx);
    var r = this.r;
    // Axis-separated collision against blocking tiles.
    var tx = Math.floor((nx + Math.sign(dx) * r - cfg.MAP_X) / cfg.TILE);
    var ty = Math.floor((this.y - cfg.MAP_Y) / cfg.TILE);
    if (!levels.blocksMove(this.lv, tx, ty)) this.x = nx;
    var tx2 = Math.floor((this.x - cfg.MAP_X) / cfg.TILE);
    var ty2 = Math.floor((ny + Math.sign(dy) * r - cfg.MAP_Y) / cfg.TILE);
    if (!levels.blocksMove(this.lv, tx2, ty2)) this.y = ny;
    // Creaky boards are loud even when sneaking.
    var t = this.tile();
    this.onCreaky = levels.tileAt(this.lv, t.tx, t.ty) === '~';
    if (this.moving) {
      this.stepT -= dt;
      if (this.stepT <= 0) {
        this.stepT = this.sneaking ? 0.42 : 0.3;
        game.onFootstep(this);
      }
    }
    // Record the route for the end screen.
    this.routeT += dt;
    if (this.routeT > 0.22) {
      this.routeT = 0;
      var last = this.route[this.route.length - 1];
      if (cfg.dist(last.x, last.y, this.x, this.y) > 14) this.route.push({ x: this.x, y: this.y });
    }
  };

  Player.prototype.throwPebble = function (mx, my, game) {
    if (this.pebbles <= 0 || this.pebble) return false;
    var d = cfg.dist(this.x, this.y, mx, my);
    var a = cfg.angleTo(this.x, this.y, mx, my);
    var len = Math.min(d, PEBBLE_RANGE);
    this.pebbles--;
    this.pebblesThrown++;
    this.pebble = {
      x0: this.x, y0: this.y,
      x1: this.x + Math.cos(a) * len, y1: this.y + Math.sin(a) * len,
      t: 0, dur: 0.32
    };
    game.onPebbleThrow(this);
    return true;
  };

  Player.prototype.update = function (dt, game) {
    if (this.pebble) {
      var p = this.pebble;
      p.t += dt / p.dur;
      if (p.t >= 1) {
        this.rings.push({ x: p.x1, y: p.y1, r: 8, max: NOISE_RADIUS, a: 0.9 });
        game.onPebbleLand(p.x1, p.y1, NOISE_RADIUS);
        this.pebble = null;
      }
    }
    for (var i = this.rings.length - 1; i >= 0; i--) {
      var rg = this.rings[i];
      rg.r += dt * 260;
      rg.a -= dt * 1.1;
      if (rg.a <= 0 || rg.r > rg.max) this.rings.splice(i, 1);
    }
  };

  Player.prototype.pebblePos = function () {
    var p = this.pebble;
    if (!p) return null;
    var t = Math.min(1, p.t);
    return {
      x: p.x0 + (p.x1 - p.x0) * t,
      y: p.y0 + (p.y1 - p.y0) * t - Math.sin(t * Math.PI) * 26
    };
  };

  global.LAMP.player = {
    Player: Player, WALK_SPEED: WALK_SPEED, SNEAK_SPEED: SNEAK_SPEED,
    PEBBLE_RANGE: PEBBLE_RANGE, NOISE_RADIUS: NOISE_RADIUS
  };
})(typeof window !== 'undefined' ? window : globalThis);

// LAMPBLACK — guards: patrol, vision cone with raycast clipping, alert states.
// Written fresh for this entry.
(function (global) {
  'use strict';
  var cfg = global.LAMP.cfg;
  var levels = global.LAMP.levels;

  var CONE_RANGE = 205;        // px
  var CONE_HALF = 0.62;        // radians (~35 deg each side)
  var CONE_RAYS = 26;

  function tileCenter(tx, ty) {
    return { x: cfg.MAP_X + (tx + 0.5) * cfg.TILE, y: cfg.MAP_Y + (ty + 0.5) * cfg.TILE };
  }

  // Walk the ray in 6px steps; blocked if it enters a sight-blocking tile.
  function losBlocked(lv, x0, y0, x1, y1) {
    var dx = x1 - x0, dy = y1 - y0;
    var d = Math.sqrt(dx * dx + dy * dy);
    var steps = Math.max(1, Math.ceil(d / 6));
    for (var i = 1; i < steps; i++) {
      var t = i / steps;
      var x = x0 + dx * t, y = y0 + dy * t;
      var tx = Math.floor((x - cfg.MAP_X) / cfg.TILE);
      var ty = Math.floor((y - cfg.MAP_Y) / cfg.TILE);
      if (levels.blocksSight(lv, tx, ty)) return true;
    }
    return false;
  }

  function rayLen(lv, x0, y0, ang, maxLen) {
    var step = 6;
    for (var d = step; d <= maxLen; d += step) {
      var x = x0 + Math.cos(ang) * d, y = y0 + Math.sin(ang) * d;
      var tx = Math.floor((x - cfg.MAP_X) / cfg.TILE);
      var ty = Math.floor((y - cfg.MAP_Y) / cfg.TILE);
      if (levels.blocksSight(lv, tx, ty)) return d;
    }
    return maxLen;
  }

  // Build the cone polygon (raycast fan) for rendering.
  function conePolygon(lv, g) {
    var pts = [{ x: g.x, y: g.y }];
    for (var i = 0; i <= CONE_RAYS; i++) {
      var a = g.dir - CONE_HALF + (2 * CONE_HALF * i) / CONE_RAYS;
      var len = rayLen(lv, g.x, g.y, a, CONE_RANGE);
      pts.push({ x: g.x + Math.cos(a) * len, y: g.y + Math.sin(a) * len });
    }
    return pts;
  }

  function canSee(lv, g, px, py, playerHidden) {
    var d = cfg.dist(g.x, g.y, px, py);
    if (d > CONE_RANGE) return false;
    var ang = cfg.angleTo(g.x, g.y, px, py);
    if (Math.abs(cfg.angleDiff(ang, g.dir)) > CONE_HALF + 0.08) return false;
    if (losBlocked(lv, g.x, g.y, px, py)) return false;
    // In tall grass the player is hidden unless the warden is very close.
    if (playerHidden && d > 46) return false;
    return true;
  }

  function Guard(def, lv) {
    this.name = def.name;
    this.lv = lv;
    this.waypoints = def.waypoints.map(function (w) {
      var c = tileCenter(w[0], w[1]);
      return { x: c.x, y: c.y };
    });
    this.wpi = 0;
    this.x = this.waypoints[0].x;
    this.y = this.waypoints[0].y;
    this.dir = 0;
    this.speed = def.speed * cfg.TILE; // px/s
    this.pause = def.pause;
    this.pauseT = 0;
    this.state = 'patrol';   // patrol | suspicious | investigate | chase
    this.stateT = 0;
    this.suspicion = 0;      // 0..1 per-guard
    this.target = null;      // {x,y} investigate point
    this.bubble = null;      // '?' or '!'
    this.bubbleT = 0;
    this.homeDir = 0;
  }

  Guard.prototype.update = function (dt, player, game) {
    var lv = this.lv;
    var seen = canSee(lv, this, player.x, player.y, player.isHiddenInCover());
    if (seen) {
      this.suspicion = Math.min(1, this.suspicion + dt * 1.4);
      game.alert = Math.min(1, game.alert + dt * 0.9);
      game.lastSeen = { x: player.x, y: player.y };
    } else {
      this.suspicion = Math.max(0, this.suspicion - dt * 0.25);
    }

    if (this.suspicion > 0.85) {
      if (this.state !== 'chase') { this.state = 'chase'; this.stateT = 0; this.bubble = '!'; this.bubbleT = 1.6; game.onSpotted(this); }
    } else if (this.suspicion > 0.35) {
      if (this.state === 'patrol') { this.state = 'suspicious'; this.stateT = 0; this.bubble = '?'; this.bubbleT = 1.4; }
    }

    var speed = this.speed;
    var dest = null;
    if (this.state === 'chase') {
      dest = { x: player.x, y: player.y };
      speed = this.speed * 1.55;
      if (!seen && this.stateT > 2.2) { this.state = 'investigate'; this.target = game.lastSeen || { x: player.x, y: player.y }; this.stateT = 0; }
    } else if (this.state === 'investigate') {
      dest = this.target;
      if (dest && cfg.dist(this.x, this.y, dest.x, dest.y) < 14) {
        this.state = 'suspicious'; this.stateT = 0;
      }
      if (this.stateT > 6) { this.state = 'patrol'; this.stateT = 0; }
    } else if (this.state === 'suspicious') {
      // Stand and look toward the last seen / heard point.
      var look = this.target || game.lastSeen;
      if (look) this.dir = cfg.angleTo(this.x, this.y, look.x, look.y);
      if (this.stateT > 2.4) { this.state = 'investigate'; this.target = look || this.waypoints[this.wpi]; this.stateT = 0; }
    } else {
      dest = this.waypoints[this.wpi];
      if (cfg.dist(this.x, this.y, dest.x, dest.y) < 10) {
        if (this.pauseT <= 0) this.pauseT = this.pause;
        else {
          this.pauseT -= dt;
          if (this.pauseT <= 0) this.wpi = (this.wpi + 1) % this.waypoints.length;
        }
      }
    }

    if (dest && this.state !== 'suspicious') {
      var d = cfg.dist(this.x, this.y, dest.x, dest.y);
      if (d > 2) {
        var a = cfg.angleTo(this.x, this.y, dest.x, dest.y);
        this.dir = a;
        var step = Math.min(d, speed * dt);
        var nx = this.x + Math.cos(a) * step;
        var ny = this.y + Math.sin(a) * step;
        var tx = Math.floor((nx - cfg.MAP_X) / cfg.TILE);
        var ty = Math.floor((ny - cfg.MAP_Y) / cfg.TILE);
        if (!levels.blocksMove(lv, tx, ty)) { this.x = nx; this.y = ny; }
        else {
          // Slide along one axis if the diagonal is blocked.
          var tx2 = Math.floor((nx - cfg.MAP_X) / cfg.TILE);
          var ty2 = Math.floor((this.y - cfg.MAP_Y) / cfg.TILE);
          if (!levels.blocksMove(lv, tx2, ty2)) this.x = nx;
          var tx3 = Math.floor((this.x - cfg.MAP_X) / cfg.TILE);
          var ty3 = Math.floor((ny - cfg.MAP_Y) / cfg.TILE);
          if (!levels.blocksMove(lv, tx3, ty3)) this.y = ny;
        }
      }
    }
    this.stateT += dt;
    if (this.bubbleT > 0) this.bubbleT -= dt;
    if (this.bubbleT <= 0) this.bubble = null;
  };

  Guard.prototype.hearNoise = function (x, y, radius) {
    if (this.state === 'chase') return;
    var d = cfg.dist(this.x, this.y, x, y);
    if (d < radius) {
      this.target = { x: x, y: y };
      this.state = 'investigate';
      this.stateT = 0;
      this.bubble = '?';
      this.bubbleT = 1.8;
    }
  };

  global.LAMP.guard = {
    Guard: Guard, CONE_RANGE: CONE_RANGE, CONE_HALF: CONE_HALF,
    tileCenter: tileCenter, losBlocked: losBlocked, rayLen: rayLen,
    conePolygon: conePolygon, canSee: canSee
  };
})(typeof window !== 'undefined' ? window : globalThis);

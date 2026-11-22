// LAMPBLACK — game state machine, loop, wiring. Written fresh for this entry.
(function (global) {
  'use strict';
  var cfg = global.LAMP.cfg;
  var levels = global.LAMP.levels;
  var Guard = global.LAMP.guard.Guard;
  var Player = global.LAMP.player.Player;
  var AudioSys = global.LAMP.audio;
  var Input = global.LAMP.input.Input;
  var render = global.LAMP.render;
  var shots = global.LAMP.shots;

  function Game(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.state = 'title'; // title | play | pause | win | lose
    this.selectedJob = 0;
    this.level = null;
    this.theme = null;
    this.player = null;
    this.guards = [];
    this.loot = [];
    this.alert = 0;
    this.time = 0;
    this.fieldNotesOpen = false;
    this.callouts = [];
    this.banner = false;
    this.bannerT = 0;
    this.spottedBy = null;
    this.end = null;
    this.lastSeen = null;
    this.shotMode = false;
    this.input = new Input(canvas, this);
    this.loadLevel(0);
  }

  Game.prototype.loadLevel = function (idx) {
    var lv = levels.LEVELS[idx];
    this.level = lv;
    this.theme = cfg.THEMES[lv.theme];
    this.player = new Player(lv);
    this.guards = lv.guards.map(function (g) { return new Guard(g, lv); });
    this.loot = lv.lootSpots.map(function (s, i) {
      return { tx: s.tx, ty: s.ty, name: lv.valuables[i], taken: false };
    });
    this.alert = 0;
    this.time = 0;
    this.fieldNotesOpen = false;
    this.callouts = [];
    this.banner = false;
    this.end = null;
    this.lastSeen = null;
  };

  Game.prototype.startJob = function (idx, opts) {
    opts = opts || {};
    this.loadLevel(idx);
    this.state = 'play';
    if (!opts.silent) AudioSys.unlock();
  };

  Game.prototype.renderOnce = function () {
    render.draw(this.ctx, this);
  };

  Game.prototype.onKey = function (key) {
    AudioSys.unlock();
    if (this.state === 'title') {
      if (key === 'enter') { this.startJob(this.selectedJob); AudioSys.click(); }
      else if (key === '1' || key === '2' || key === '3') {
        this.selectedJob = Number(key) - 1;
        this.renderOnce();
      } else if (key === 'arrowright' || key === 'arrowleft') {
        this.selectedJob = (this.selectedJob + (key === 'arrowright' ? 1 : 2)) % 3;
        this.renderOnce();
      }
      return;
    }
    if (this.state === 'play') {
      if (key === 'h') { this.fieldNotesOpen = !this.fieldNotesOpen; AudioSys.click(); }
      else if (key === 'm') { AudioSys.toggleMute(); }
      else if (key === 'escape') { this.state = 'pause'; }
      else if (key === 'r') { this.startJob(this.level.id - 1); }
      return;
    }
    if (this.state === 'pause') {
      if (key === 'escape') this.state = 'play';
      else if (key === 'r') this.startJob(this.level.id - 1);
      return;
    }
    if (this.state === 'win' || this.state === 'lose') {
      if (key === 'enter') {
        var next = this.level.id % 3;
        this.startJob(next);
      } else if (key === 'r') this.startJob(this.level.id - 1);
      else if (key === 'j' || key === 'escape') { this.state = 'title'; this.renderOnce(); }
      return;
    }
  };

  Game.prototype.onClick = function (x, y) {
    AudioSys.unlock();
    if (this.state === 'title') {
      // Click a job card to start it.
      var bw = 340, bh = 150, gap = 24;
      var x0 = 640 - (bw * 3 + gap * 2) / 2;
      for (var i = 0; i < 3; i++) {
        var cx = x0 + i * (bw + gap);
        if (x >= cx && x <= cx + bw && y >= 250 && y <= 250 + bh) {
          this.startJob(i);
          return;
        }
      }
      return;
    }
    if (this.state === 'play') {
      // Aim at the map; click throws a pebble.
      if (y > cfg.MAP_Y && y < cfg.MAP_Y + cfg.MAP_H) {
        this.player.throwPebble(x, y, this);
      }
      return;
    }
    if (this.state === 'win' || this.state === 'lose') {
      if (x >= 760 && x <= 1060 && y >= 590 && y <= 630) {
        this.startJob(this.level.id % 3);
      } else if (x >= 760 && x <= 904 && y >= 644 && y <= 678) {
        this.startJob(this.level.id - 1);
      } else if (x >= 916 && x <= 1060 && y >= 644 && y <= 678) {
        this.state = 'title';
        this.renderOnce();
      }
    }
  };

  Game.prototype.onFootstep = function (player) {
    AudioSys.footstep(player.sneaking, player.onCreaky);
    if (player.onCreaky && !player.sneaking) {
      // Loud boards draw wardens.
      this.guards.forEach(function (g) { g.hearNoise(player.x, player.y, 110); });
    }
  };

  Game.prototype.onPebbleThrow = function () { AudioSys.pebbleThrow(); };

  Game.prototype.onPebbleLand = function (x, y, radius) {
    AudioSys.pebbleLand();
    this.guards.forEach(function (g) { g.hearNoise(x, y, radius); });
  };

  Game.prototype.onSpotted = function (guard) {
    this.spottedBy = guard.name;
    this.banner = true;
    this.bannerT = 1.8;
    this.player.spotted++;
    AudioSys.spotted();
  };

  Game.prototype.update = function (dt) {
    if (this.state !== 'play') return;
    this.time += dt;
    var mv = this.input.moveVector();
    this.player.sneaking = mv.sneak;
    this.player.move(mv.dx, mv.dy, dt, this);
    this.player.update(dt, this);
    var anySeen = false;
    var self = this;
    this.guards.forEach(function (g) {
      var before = g.state;
      g.update(dt, self.player, self);
      if (before !== 'chase' && g.state === 'chase') self.player.closeCalls++;
      if (g.state === 'chase') anySeen = true;
    });
    // Alert decays when nobody sees the player.
    if (!anySeen) this.alert = Math.max(0, this.alert - dt * 0.12);
    if (this.bannerT > 0) {
      this.bannerT -= dt;
      if (this.bannerT <= 0) this.banner = false;
    }
    // Loot pickup.
    this.loot.forEach(function (lo) {
      if (lo.taken) return;
      var lx = cfg.MAP_X + (lo.tx + 0.5) * cfg.TILE;
      var ly = cfg.MAP_Y + (lo.ty + 0.5) * cfg.TILE;
      if (cfg.dist(self.player.x, self.player.y, lx, ly) < 24) {
        lo.taken = true;
        self.player.loot++;
        AudioSys.pickup();
      }
    });
    // Caught: a chasing warden touches the player.
    var caught = false;
    this.guards.forEach(function (g) {
      if (g.state === 'chase' && cfg.dist(g.x, g.y, self.player.x, self.player.y) < 20) caught = true;
    });
    if (caught) {
      this.player.lives--;
      AudioSys.caught();
      if (this.player.lives <= 0) { this.finish(false); return; }
      // Respawn at the job start, wardens reset to patrol.
      var s = this.level.playerStart;
      this.player.x = cfg.MAP_X + (s.tx + 0.5) * cfg.TILE;
      this.player.y = cfg.MAP_Y + (s.ty + 0.5) * cfg.TILE;
      this.player.route = [{ x: this.player.x, y: this.player.y }];
      this.alert = 0.4;
      this.guards.forEach(function (g) {
        g.state = 'patrol'; g.suspicion = 0; g.bubble = null;
        g.x = g.waypoints[0].x; g.y = g.waypoints[0].y; g.wpi = 0;
      });
      return;
    }
    // Exit: all valuables + reach the hatch.
    var allLoot = this.loot.every(function (lo) { return lo.taken; });
    if (allLoot) {
      var ex = cfg.MAP_X + (this.level.exit.tx + 0.5) * cfg.TILE;
      var ey = cfg.MAP_Y + (this.level.exit.ty + 0.5) * cfg.TILE;
      if (cfg.dist(this.player.x, this.player.y, ex, ey) < 26) this.finish(true);
    }
  };

  Game.prototype.finish = function (won) {
    var ghost = won && this.player.spotted === 0;
    var under75 = this.time < 75;
    this.end = {
      jobId: this.level.id,
      levelName: this.level.name,
      sub: this.level.sub,
      ghost: ghost,
      theme: this.theme,
      map: this.level.map,
      lamps: this.level.lamps,
      exit: this.level.exit,
      route: this.player.route.slice(),
      guardEnds: this.guards.map(function (g) { return { x: g.x, y: g.y }; }),
      stats: {
        time: render.fmtTime(this.time),
        spotted: this.player.spotted,
        closeCalls: this.player.closeCalls,
        pebbles: this.player.pebblesThrown,
        valuables: this.player.loot + ' / ' + this.level.valuables.length,
        allLoot: this.player.loot === this.level.valuables.length,
        under75: under75
      }
    };
    this.state = won ? 'win' : 'lose';
    if (won) AudioSys.win();
  };

  Game.prototype.frame = function (dt) {
    this.update(dt);
    this.renderOnce();
  };

  function boot() {
    var canvas = document.getElementById('game');
    var game = new Game(canvas);
    global.LAMP.game = game;
    var params = new URLSearchParams(global.location.search);
    var shot = params.get('shot');
    if (shot) {
      game.shotMode = true;
      shots.apply(game, shot);
      return; // render once, no loop — deterministic screenshot
    }
    var last = performance.now();
    function loop(now) {
      var dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      game.frame(dt);
      requestAnimationFrame(loop);
    }
    game.renderOnce();
    requestAnimationFrame(loop);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }
})(typeof window !== 'undefined' ? window : globalThis);

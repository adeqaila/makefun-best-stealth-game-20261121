// LAMPBLACK — keyboard + mouse input.
// Written fresh for this entry.
(function (global) {
  'use strict';

  function Input(canvas, game) {
    this.keys = {};
    this.mouse = { x: 0, y: 0, down: false };
    this.canvas = canvas;
    this.game = game;
    var self = this;

    global.addEventListener('keydown', function (e) {
      if (e.repeat) return;
      self.keys[e.key.toLowerCase()] = true;
      if (e.key === ' ' || e.key.indexOf('Arrow') === 0) e.preventDefault();
      game.onKey(e.key.toLowerCase());
    });
    global.addEventListener('keyup', function (e) {
      self.keys[e.key.toLowerCase()] = false;
    });
    canvas.addEventListener('mousemove', function (e) {
      var r = canvas.getBoundingClientRect();
      self.mouse.x = (e.clientX - r.left) * (canvas.width / r.width);
      self.mouse.y = (e.clientY - r.top) * (canvas.height / r.height);
    });
    canvas.addEventListener('mousedown', function (e) {
      if (e.button !== 0) return;
      var r = canvas.getBoundingClientRect();
      self.mouse.x = (e.clientX - r.left) * (canvas.width / r.width);
      self.mouse.y = (e.clientY - r.top) * (canvas.height / r.height);
      game.onClick(self.mouse.x, self.mouse.y);
    });
    canvas.addEventListener('contextmenu', function (e) { e.preventDefault(); });
  }

  Input.prototype.moveVector = function () {
    var k = this.keys;
    var dx = 0, dy = 0;
    if (k['a'] || k['arrowleft']) dx -= 1;
    if (k['d'] || k['arrowright']) dx += 1;
    if (k['w'] || k['arrowup']) dy -= 1;
    if (k['s'] || k['arrowdown']) dy += 1;
    return { dx: dx, dy: dy, sneak: !!(k['shift']) };
  };

  global.LAMP.input = { Input: Input };
})(typeof window !== 'undefined' ? window : globalThis);

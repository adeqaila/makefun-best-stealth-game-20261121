// LAMPBLACK — WebAudio synth sounds, no external files.
// Written fresh for this entry. All calls are safe when audio is unavailable.
(function (global) {
  'use strict';

  var ctx = null;
  var muted = false;
  var master = null;

  function ensure() {
    if (ctx) return ctx;
    try {
      var AC = global.AudioContext || global.webkitAudioContext;
      if (!AC) return null;
      ctx = new AC();
      master = ctx.createGain();
      master.gain.value = 0.5;
      master.connect(ctx.destination);
    } catch (e) { ctx = null; }
    return ctx;
  }

  function tone(freq, dur, type, vol, slideTo) {
    if (muted) return;
    var c = ensure();
    if (!c) return;
    try {
      var o = c.createOscillator();
      var g = c.createGain();
      o.type = type || 'sine';
      o.frequency.setValueAtTime(freq, c.currentTime);
      if (slideTo) o.frequency.exponentialRampToValueAtTime(slideTo, c.currentTime + dur);
      g.gain.setValueAtTime(vol || 0.12, c.currentTime);
      g.gain.exponentialRampToValueAtTime(0.001, c.currentTime + dur);
      o.connect(g); g.connect(master);
      o.start(); o.stop(c.currentTime + dur + 0.02);
    } catch (e) { /* audio is best-effort */ }
  }

  function noiseBurst(dur, vol, low) {
    if (muted) return;
    var c = ensure();
    if (!c) return;
    try {
      var len = Math.max(1, Math.floor(c.sampleRate * dur));
      var buf = c.createBuffer(1, len, c.sampleRate);
      var data = buf.getChannelData(0);
      for (var i = 0; i < len; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / len);
      var src = c.createBufferSource();
      src.buffer = buf;
      var f = c.createBiquadFilter();
      f.type = 'lowpass';
      f.frequency.value = low || 900;
      var g = c.createGain();
      g.gain.value = vol || 0.08;
      src.connect(f); f.connect(g); g.connect(master);
      src.start();
    } catch (e) { /* best-effort */ }
  }

  var AudioSys = {
    unlock: function () { ensure(); if (ctx && ctx.state === 'suspended') ctx.resume(); },
    toggleMute: function () { muted = !muted; return muted; },
    isMuted: function () { return muted; },
    footstep: function (sneak, creaky) {
      if (sneak && !creaky) return; // silent while sneaking
      noiseBurst(0.07, creaky ? 0.22 : 0.07, creaky ? 1600 : 700);
    },
    pickup: function () { tone(660, 0.12, 'sine', 0.14); setTimeout(function () { tone(990, 0.18, 'sine', 0.14); }, 90); },
    pebbleThrow: function () { noiseBurst(0.05, 0.1, 2400); },
    pebbleLand: function () { tone(1900, 0.05, 'triangle', 0.1, 1200); setTimeout(function () { tone(1500, 0.06, 'triangle', 0.08, 900); }, 70); },
    suspicious: function () { tone(520, 0.16, 'triangle', 0.12, 660); },
    spotted: function () { tone(220, 0.5, 'sawtooth', 0.14, 440); tone(233, 0.5, 'sawtooth', 0.1, 466); },
    caught: function () { tone(330, 0.4, 'sawtooth', 0.14, 110); },
    win: function () {
      var notes = [523, 659, 784, 1046];
      notes.forEach(function (n, i) { setTimeout(function () { tone(n, 0.22, 'sine', 0.13); }, i * 110); });
    },
    click: function () { tone(880, 0.05, 'square', 0.06); }
  };

  global.LAMP.audio = AudioSys;
})(typeof window !== 'undefined' ? window : globalThis);

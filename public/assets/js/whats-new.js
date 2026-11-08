/* What's new gallery: skips left and right, plays each preview, then moves on. */
(function () {
  "use strict";
  var root = document.querySelector("[data-wn]");
  if (!root) return;
  var track = root.querySelector("[data-wn-track]");
  var cards = Array.prototype.slice.call(track.children);
  var dots = Array.prototype.slice.call(root.querySelectorAll("[data-wn-dot]"));
  var playBtn = root.querySelector("[data-wn-play]");
  var reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var STILL = 6000;                       // ms on a slide with a picture
  var i = 0, playing = !reduce, inView = false, t0 = 0, raf = 0, lock = 0;

  function vid(k) { return cards[k].querySelector("video"); }
  function setP(p) { var d = dots[i]; if (d) d.style.setProperty("--p", Math.max(0, Math.min(1, p)).toFixed(3)); }

  function mark(k) {
    cards.forEach(function (c, n) { c.classList.toggle("is-active", n === k); });
    dots.forEach(function (d, n) { d.classList.toggle("is-active", n === k); d.setAttribute("aria-current", n === k ? "true" : "false"); d.style.setProperty("--p", n < k ? 1 : 0); });
  }

  function start() {
    cancelAnimationFrame(raf);
    cards.forEach(function (c, n) { var v = vid(n); if (v && n !== i) { v.pause(); } });
    var v = vid(i);
    setP(0);
    if (!(playing && inView)) { if (v) v.pause(); return; }
    if (v) {
      if (v.ended || v.currentTime > v.duration - 0.2) v.currentTime = 0;
      var pr = v.play(); if (pr && pr.catch) pr.catch(function () {});
    } else { t0 = performance.now(); }
    loop();
  }
  function loop() {
    raf = requestAnimationFrame(function () {
      var v = vid(i);
      if (v) { if (v.duration) setP(v.currentTime / v.duration); }
      else { var p = (performance.now() - t0) / STILL; setP(p); if (p >= 1) return go(i + 1); }
      loop();
    });
  }

  function go(k, fromScroll) {
    k = (k + cards.length) % cards.length;
    var v = vid(i); if (v && k !== i) v.pause();
    i = k; mark(i);
    if (!fromScroll) {
      lock = Date.now();
      var c = cards[i];
      track.scrollTo({ left: c.offsetLeft - (track.clientWidth - c.offsetWidth) / 2, behavior: reduce ? "auto" : "smooth" });
    }
    if (v && vid(i) !== v) v.currentTime = 0;
    start();
  }

  cards.forEach(function (c, n) {
    var v = vid(n);
    if (v) v.addEventListener("ended", function () { if (n === i && playing) go(i + 1); });
  });

  // Swipes and trackpad scrolls: follow the card nearest the centre.
  var st;
  track.addEventListener("scroll", function () {
    clearTimeout(st);
    st = setTimeout(function () {
      if (Date.now() - lock < 700) return;
      var mid = track.scrollLeft + track.clientWidth / 2, best = 0, bd = Infinity;
      cards.forEach(function (c, n) { var d = Math.abs(c.offsetLeft + c.offsetWidth / 2 - mid); if (d < bd) { bd = d; best = n; } });
      if (best !== i) go(best, true);
    }, 120);
  }, { passive: true });

  root.querySelector("[data-wn-prev]").addEventListener("click", function () { go(i - 1); });
  root.querySelector("[data-wn-next]").addEventListener("click", function () { go(i + 1); });
  dots.forEach(function (d, n) { d.addEventListener("click", function () { go(n); }); });
  cards.forEach(function (c, n) { c.addEventListener("click", function () { if (n !== i) go(n); }); });
  track.setAttribute("tabindex", "0");
  track.setAttribute("aria-label", "Features, use the left and right arrow keys");
  track.addEventListener("keydown", function (e) {
    if (e.key === "ArrowRight") { e.preventDefault(); go(i + 1); }
    if (e.key === "ArrowLeft") { e.preventDefault(); go(i - 1); }
  });

  function setPlaying(on) {
    playing = on;
    root.classList.toggle("is-paused", !on);
    playBtn.setAttribute("aria-label", on ? "Pause" : "Play");
    var v = vid(i);
    if (on) { if (!v) { t0 = performance.now() - (parseFloat(dots[i].style.getPropertyValue("--p")) || 0) * STILL; loop(); } else { var pr = v.play(); if (pr && pr.catch) pr.catch(function () {}); loop(); } }
    else { cancelAnimationFrame(raf); if (v) v.pause(); }
  }
  playBtn.addEventListener("click", function () { setPlaying(!playing); });

  if ("IntersectionObserver" in window) {
    new IntersectionObserver(function (es) {
      var was = inView; inView = es[0].isIntersecting;
      if (inView && !was) start(); else if (!inView && was) { cancelAnimationFrame(raf); var v = vid(i); if (v) v.pause(); }
    }, { threshold: 0.35 }).observe(track);
  } else { inView = true; }

  document.addEventListener("visibilitychange", function () { if (document.hidden) { cancelAnimationFrame(raf); var v = vid(i); if (v) v.pause(); } else start(); });

  root.classList.toggle("is-paused", !playing);
  playBtn.setAttribute("aria-label", playing ? "Pause" : "Play");
  mark(0);
  var first = vid(0); if (first) first.preload = "auto";
  start();
})();

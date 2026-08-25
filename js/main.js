(function () {
  "use strict";

  var reduceMotion = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  /* ---------- Load bar ---------- */
  function initLoadBar() {
    var bar = document.querySelector("[data-load-bar]");
    if (!bar) return;
    function finish() {
      bar.classList.add("is-done");
      setTimeout(function () { bar.style.display = "none"; }, 700);
    }
    if (document.readyState === "complete") setTimeout(finish, 420);
    else window.addEventListener("load", finish, { once: true });
  }

  /* ---------- Header dropdown menus ---------- */
  function initNav() {
    var nav = document.querySelector("[data-nav]");
    if (!nav) return;
    var menus = Array.prototype.slice.call(nav.querySelectorAll("[data-menu]"));
    var isTouch = window.matchMedia && window.matchMedia("(hover: none)").matches;

    function closeAll(except) {
      menus.forEach(function (m) { if (m !== except) m.classList.remove("is-open"); });
    }

    menus.forEach(function (menu) {
      var trigger = menu.querySelector("[data-trigger]");
      if (!isTouch) {
        menu.addEventListener("mouseenter", function () {
          closeAll(menu);
          menu.classList.add("is-open");
        });
        menu.addEventListener("mouseleave", function () {
          menu.classList.remove("is-open");
        });
      }
      if (trigger) {
        trigger.addEventListener("click", function (e) {
          e.preventDefault();
          var willOpen = !menu.classList.contains("is-open");
          closeAll(menu);
          menu.classList.toggle("is-open", willOpen);
        });
      }
    });

    document.addEventListener("pointerdown", function (e) {
      if (!nav.contains(e.target)) closeAll(null);
    });
    document.addEventListener("keydown", function (e) {
      if (e.key === "Escape") closeAll(null);
    });
  }

  /* ---------- Scroll reveal ---------- */
  function initReveal() {
    var targets = Array.prototype.slice.call(document.querySelectorAll("[data-reveal]"));
    if (!targets.length) return;
    if (reduceMotion) {
      targets.forEach(function (t) { t.classList.add("is-visible"); });
      return;
    }
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (!entry.isIntersecting) return;
        entry.target.classList.add("is-visible");
        io.unobserve(entry.target);
      });
    }, { rootMargin: "0px 0px -12% 0px", threshold: 0.08 });
    targets.forEach(function (t) { io.observe(t); });
  }

  /* ---------- Work card pointer-tracking lift ---------- */
  function initWorkCards() {
    var cards = Array.prototype.slice.call(document.querySelectorAll(".work-card"));
    if (!cards.length || window.matchMedia("(hover: none)").matches) return;
    cards.forEach(function (card) {
      card.addEventListener("mousemove", function (e) {
        var panel = card.querySelector(".work-card__panel");
        var imgWrap = card.querySelector(".work-card__image");
        var zones = [];
        if (panel) zones.push(panel);
        if (imgWrap) zones.push(imgWrap);
        if (!zones.length) return;
        var x = e.clientX, y = e.clientY;
        var hot = zones.some(function (z) {
          var r = z.getBoundingClientRect();
          return x >= r.left && x <= r.right && y >= r.top && y <= r.bottom;
        });
        card.classList.toggle("is-hot", hot);
      });
      card.addEventListener("mouseleave", function () {
        card.classList.remove("is-hot");
      });
    });
  }

  /* ---------- Slideshow (about page off-the-clock, CG layers) ---------- */
  function initSlideshows() {
    var shows = Array.prototype.slice.call(document.querySelectorAll("[data-slideshow]"));
    shows.forEach(function (show) {
      var slides = Array.prototype.slice.call(show.querySelectorAll("img"));
      if (slides.length < 2) return;
      var interval = parseInt(show.getAttribute("data-interval"), 10) || 2000;
      var i = 0;
      slides[0].classList.add("is-active");
      if (reduceMotion) return;
      var timer = null;
      function start() {
        timer = setInterval(function () {
          slides[i].classList.remove("is-active");
          i = (i + 1) % slides.length;
          slides[i].classList.add("is-active");
        }, interval);
      }
      start();
      show.addEventListener("mouseenter", function () { clearInterval(timer); });
      show.addEventListener("mouseleave", function () { start(); });
    });
  }

  document.addEventListener("DOMContentLoaded", function () {
    initLoadBar();
    initNav();
    initReveal();
    initWorkCards();
    initSlideshows();
  });
})();

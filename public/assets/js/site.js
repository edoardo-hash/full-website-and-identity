/* Invenio Homes — site behaviour (no dependencies) */
(() => {
  "use strict";

  const $ = (sel, root = document) => root.querySelector(sel);
  const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));
  const body = document.body;
  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  /* Header ------------------------------------------------------------- */
  const header = $("[data-header]");
  if (header) {
    const onScroll = () => header.classList.toggle("is-stuck", window.scrollY > 40);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
  }

  /* Menu --------------------------------------------------------------- */
  const toggle = $("[data-menu-toggle]");
  const menu = $("#site-menu");
  let lastFocus = null;

  const setMenu = (open) => {
    if (!menu || !toggle) return;
    body.classList.toggle("menu-open", open);
    toggle.setAttribute("aria-expanded", String(open));
    menu.setAttribute("aria-hidden", String(!open));
    if (open) {
      lastFocus = document.activeElement;
      const first = $("a", menu);
      if (first) setTimeout(() => first.focus(), 120);
    } else if (lastFocus) {
      lastFocus.focus();
    }
  };

  if (toggle && menu) {
    toggle.addEventListener("click", () => setMenu(!body.classList.contains("menu-open")));
    $$("a", menu).forEach((link) => link.addEventListener("click", () => setMenu(false)));
    document.addEventListener("keydown", (event) => {
      if (event.key === "Escape" && body.classList.contains("menu-open")) setMenu(false);
    });
  }

  /* Reveal ------------------------------------------------------------- */
  const revealEls = $$(".reveal");
  if (revealEls.length && "IntersectionObserver" in window && !reduceMotion) {
    const groups = new Map();
    revealEls.forEach((el) => {
      const parent = el.parentElement;
      const position = groups.get(parent) || 0;
      groups.set(parent, position + 1);
      el.style.setProperty("--d", `${Math.min(position * 70, 280)}ms`);
    });
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add("is-in");
            observer.unobserve(entry.target);
          }
        });
      },
      { rootMargin: "0px 0px -8% 0px", threshold: 0.06 }
    );
    revealEls.forEach((el) => observer.observe(el));
  } else {
    revealEls.forEach((el) => el.classList.add("is-in"));
  }

  /* Forms — compose an email ------------------------------------------ */
  $$("[data-form]").forEach((form) => {
    const status = $("[data-form-status]", form);
    const email = form.dataset.email || "find@inveniohomes.com";
    const message = $("#f-message", form);

    const params = new URLSearchParams(window.location.search);
    const type = params.get("type");
    if (message && !message.value) {
      if (type === "owner") message.value = "I would like to talk about my property and the owners' service.";
      else if (type === "agent") message.value = "I would like to talk about the portal and working with Invenio Homes as an agent.";
      else if (type === "partner") message.value = "I would like to book a partner call about the Invenio Homes portfolio.";
    }

    const setStatus = (text) => {
      if (!status) return;
      status.textContent = text;
      status.classList.add("is-visible");
    };

    form.addEventListener("submit", (event) => {
      event.preventDefault();
      let valid = true;
      const mark = (el, ok) => {
        if (!el) return;
        const wrap = el.closest(".field") || el.closest(".check-line");
        if (wrap) wrap.classList.toggle("field--error", !ok);
        if (!ok) valid = false;
      };

      const name = $('[name="name"]', form);
      const mail = $('[name="email"]', form);
      const note = $('[name="message"]', form);
      const consent = $('[name="consent"]', form);
      mark(name, name && name.value.trim().length > 1);
      mark(mail, mail && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(mail.value.trim()));
      mark(note, note && note.value.trim().length > 3);
      mark(consent, consent && consent.checked);

      if (!valid) {
        setStatus("Please check the fields marked in red.");
        return;
      }

      const data = new FormData(form);
      const get = (key) => String(data.get(key) || "").trim();
      const lines = [
        `Name: ${get("name")}`,
        `Email: ${get("email")}`,
        get("phone") ? `Phone: ${get("phone")}` : "",
        get("company") ? `Company: ${get("company")}` : "",
        type ? `Enquiry type: ${type}` : "",
        "",
        get("message"),
      ].filter((line) => line !== "");

      // Sent to the site's own server first, which saves it (31 Oct 2026). Only if that fails does the visitor's
      // email app open with the message ready, as before.
      const subject = `Website enquiry — ${get("name")}`;
      const openMail = () => {
        window.location.href = `mailto:${email}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(lines.join("\n"))}`;
        setStatus(`We could not send it from the page, so your email app should open with the message ready. If it does not, write to ${email} — or message us on WhatsApp.`);
      };
      const button = $('button[type="submit"]', form);
      if (button) button.disabled = true;
      setStatus("Sending…");
      fetch("/api/contact", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          name: get("name"), email: get("email"), phone: get("phone"), company: get("company"), message: get("message"),
          type: type || "", consent: !!(consent && consent.checked), website: get("website"), page: window.location.pathname,
        }),
      })
        .then((r) => {
          if (!r.ok) throw new Error(String(r.status));
          form.reset();
          setStatus(`Thank you, ${get("name").split(" ")[0]}. Your message has reached the Invenio team — we usually reply the same day.`);
        })
        .catch(openMail)
        .finally(() => { if (button) button.disabled = false; });
    });

    form.addEventListener("input", (event) => {
      const wrap = event.target.closest(".field") || event.target.closest(".check-line");
      if (wrap) wrap.classList.remove("field--error");
    });
  });
})();

/* Live figures (home hero handoff spec, 1 Nov 2026). Elements with data-stat get today's numbers from /api/stats
   (portal database, cached a day). The page never waits: fallbacks are in the HTML, the request gives up after 2 s,
   and an implausible value (villas under 500, users under 1) is ignored. No aria-live: updates are silent.
   The numbers band ([data-count]) counts up once when scrolled into view, unless reduced motion is asked for;
   its aria-label always carries the final value, so screen readers never hear the intermediate numbers. */
(function () {
  var fmt = function (n) { return Number(n).toLocaleString("en-GB"); };
  var reduce = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var MIN = { villas: 500, users: 1 };
  function countUp(el) {
    var to = parseInt(String(el.textContent).replace(/[^0-9]/g, ""), 10);
    if (!to || reduce || !("IntersectionObserver" in window)) return;
    el.setAttribute("aria-label", fmt(to));
    var io = new IntersectionObserver(function (es) {
      es.forEach(function (e) {
        if (!e.isIntersecting) return;
        io.disconnect();
        var t0 = performance.now(), D = 1200;
        (function step(t) {
          var k = Math.min(1, (t - t0) / D), ease = 1 - Math.pow(1 - k, 3);
          el.textContent = fmt(Math.round(to * ease));
          if (k < 1) requestAnimationFrame(step); else el.textContent = fmt(to);
        })(t0);
      });
    }, { threshold: 0.4 });
    io.observe(el);
  }
  var els = document.querySelectorAll("[data-stat]");
  function done() { document.querySelectorAll("[data-count]").forEach(countUp); }
  if (!els.length || !window.fetch) return done();
  var ctl = window.AbortController ? new AbortController() : null;
  var timer = setTimeout(function () { if (ctl) ctl.abort(); }, 2000);
  fetch("/api/stats/", { headers: { accept: "application/json" }, signal: ctl ? ctl.signal : undefined })
    .then(function (r) { return r.ok ? r.json() : null; })
    .then(function (d) {
      if (!d || !d.ok) return;
      els.forEach(function (el) {
        var k = el.getAttribute("data-stat"), n = d[k];
        if (typeof n === "number" && n >= (MIN[k] || 1)) el.textContent = fmt(n);
      });
    })
    .catch(function (e) { if (window.console) console.info("stats: keeping the figures in the page", e && e.name); })
    .then(function () { clearTimeout(timer); done(); });
})();

/* Teaser popup: home only, once per visitor (again after 14 days); ?teaser=1 always shows it */
(function () {
  var dlg = document.querySelector("[data-teaser]");
  if (!dlg || typeof dlg.showModal !== "function") return;
  var KEY = "invenio-teaser-v2", DAYS = 14;
  var force = /[?&]teaser=1\b/.test(location.search);
  var seen = 0;
  try { seen = Number(localStorage.getItem(KEY)) || 0; } catch (e) { seen = 0; }
  if (!force && seen && Date.now() - seen < DAYS * 864e5) return;
  function remember() { try { localStorage.setItem(KEY, String(Date.now())); } catch (e) { /* storage blocked */ } }
  function close() { remember(); if (dlg.open) dlg.close(); }
  dlg.querySelectorAll("[data-teaser-close]").forEach(function (el) { el.addEventListener("click", close); });
  dlg.addEventListener("cancel", remember);
  dlg.addEventListener("click", function (e) { if (e.target === dlg) close(); });
  setTimeout(function () {
    if (document.body.classList.contains("menu-open")) return;
    dlg.showModal();
    var btn = dlg.querySelector(".teaser__close");
    if (btn) btn.focus();
  }, force ? 300 : 1400);
})();

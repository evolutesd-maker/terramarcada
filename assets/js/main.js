(function () {
  "use strict";

  var doc = document;
  var root = doc.documentElement;
  var cfg = window.TERRA_MARCADA || {};
  var waNumber = String(cfg.whatsapp || "").replace(/\D/g, "");
  var reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var finePointer = window.matchMedia("(hover: hover) and (pointer: fine)").matches;

  function $(s, c) { return (c || doc).querySelector(s); }
  function $$(s, c) { return Array.prototype.slice.call((c || doc).querySelectorAll(s)); }
  function store(k, v) { try { if (v === undefined) return sessionStorage.getItem(k); sessionStorage.setItem(k, v); } catch (e) {} return null; }

  /* ---------- WhatsApp e dados de contato ---------- */
  function waLink(message) {
    var text = encodeURIComponent(message || "Olá! Vim pelo site da Terra Marcada.");
    return waNumber ? "https://wa.me/" + waNumber + "?text=" + text : "https://wa.me/?text=" + text;
  }
  $$("[data-whatsapp]").forEach(function (el) {
    el.href = waLink(el.getAttribute("data-whatsapp"));
    el.target = "_blank";
    el.rel = "noopener";
  });
  function fill(key, value) {
    if (!value) return;
    $$('[data-fill="' + key + '"]').forEach(function (el) { el.textContent = value; });
  }
  fill("phone", waNumber ? cfg.whatsappDisplay : "");
  fill("address", cfg.address);
  fill("hours", cfg.hours);
  fill("cnpj", cfg.cnpj);
  if (cfg.email) {
    $$('[data-fill="email"]').forEach(function (el) { el.textContent = cfg.email; el.href = "mailto:" + cfg.email; });
  }

  /* ---------- Formulário -> mensagem pronta no WhatsApp ---------- */
  var form = $("#wa-form");
  if (form) {
    form.addEventListener("submit", function (e) {
      e.preventDefault();
      var nome = form.nome.value.trim();
      if (!nome) {
        form.nome.focus();
        form.nome.setAttribute("aria-invalid", "true");
        return;
      }
      form.nome.removeAttribute("aria-invalid");
      var msg = "Olá! Meu nome é " + nome + ".\n" +
        "Assunto: " + form.assunto.value + "\n" +
        (form.cidade.value.trim() ? "Cidade do imóvel: " + form.cidade.value.trim() + "\n" : "") +
        "Gostaria de agendar um atendimento.";
      window.open(waLink(msg), "_blank", "noopener");
    });
    form.nome.addEventListener("input", function () { form.nome.removeAttribute("aria-invalid"); });
  }

  /* ---------- Menu mobile ---------- */
  var toggle = $(".nav-toggle");
  var nav = $("#menu");
  function closeMenu() {
    if (!toggle) return;
    toggle.setAttribute("aria-expanded", "false");
    toggle.setAttribute("aria-label", "Abrir menu");
    doc.body.classList.remove("nav-open");
  }
  if (toggle && nav) {
    toggle.addEventListener("click", function () {
      var open = toggle.getAttribute("aria-expanded") === "true";
      toggle.setAttribute("aria-expanded", String(!open));
      toggle.setAttribute("aria-label", open ? "Abrir menu" : "Fechar menu");
      doc.body.classList.toggle("nav-open", !open);
    });
    nav.addEventListener("click", function (e) { if (e.target.closest("a")) closeMenu(); });
    doc.addEventListener("keydown", function (e) { if (e.key === "Escape") closeMenu(); });
    window.addEventListener("resize", function () { if (window.innerWidth > 980) closeMenu(); });
  }

  /* ---------- Scroll: progresso, cabeçalho, parallax, voltar ao topo (um único rAF) ---------- */
  var header = $(".site-header");
  var progress = $(".progress");
  var toTop = $(".to-top");
  var heroBg = $(".hero-bg");
  var hero = $(".hero");
  var lastY = window.scrollY, ticking = false;

  function onScroll() {
    var y = window.scrollY;
    var max = root.scrollHeight - window.innerHeight;
    if (progress) progress.style.setProperty("--p", max > 0 ? Math.min(1, y / max).toFixed(4) : 0);
    header.classList.toggle("is-scrolled", y > 8);
    // esconde ao descer, mostra ao subir
    if (y > 240 && y > lastY + 4) header.classList.add("is-hidden");
    else if (y < lastY - 4 || y <= 240) header.classList.remove("is-hidden");
    if (toTop) toTop.classList.toggle("is-on", y > 900);
    if (heroBg && !reduce && hero && y < hero.offsetHeight) heroBg.style.setProperty("--py", (y * 0.12).toFixed(1) + "px");
    lastY = y;
    ticking = false;
  }
  window.addEventListener("scroll", function () {
    if (!ticking) { ticking = true; requestAnimationFrame(onScroll); }
  }, { passive: true });
  onScroll();
  if (toTop) toTop.addEventListener("click", function () { window.scrollTo({ top: 0, behavior: reduce ? "auto" : "smooth" }); });

  /* ---------- Menu ativo conforme a seção (scrollspy) ---------- */
  var links = $$('.nav a[href^="#"]:not(.btn)');
  var map = {};
  links.forEach(function (a) { map[a.getAttribute("href").slice(1)] = a; });
  if ("IntersectionObserver" in window) {
    var spy = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (!en.isIntersecting) return;
        links.forEach(function (a) { a.classList.remove("is-active"); a.removeAttribute("aria-current"); });
        var a = map[en.target.id];
        if (a) { a.classList.add("is-active"); a.setAttribute("aria-current", "true"); }
      });
    }, { rootMargin: "-45% 0px -50% 0px" });
    Object.keys(map).forEach(function (id) { var s = doc.getElementById(id); if (s) spy.observe(s); });
  }

  /* ---------- Revelar ao rolar, com escalonamento ---------- */
  var revealSel = ".section-head, .card, .type-card, .benefits h3, .benefit, .steps h3, .step-list li, .inline-cta, .pf-filters, .pf-card, .about-copy, .attend-media, .attend-copy, .tech-copy, .tech-card, .mvv-card, .faq details, .cta-copy, .contact-card";
  var items = $$(revealSel);
  if ("IntersectionObserver" in window && !reduce) {
    items.forEach(function (el) {
      el.classList.add("reveal");
      var sib = el.parentElement ? $$(":scope > " + (el.tagName.toLowerCase()), el.parentElement) : [];
      var i = sib.indexOf(el);
      if (i > 0) el.style.setProperty("--d", Math.min(i, 5) * 70 + "ms");
    });
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (en.isIntersecting) { en.target.classList.add("is-visible"); io.unobserve(en.target); }
      });
    }, { rootMargin: "0px 0px -8% 0px", threshold: 0.05 });
    items.forEach(function (el) { io.observe(el); });
    // rede de segurança: nada fica escondido se o observador falhar
    setTimeout(function () { items.forEach(function (el) { el.classList.add("is-visible"); }); }, 4000);
  }

  /* ---------- Interações de ponteiro (somente mouse/trackpad) ---------- */
  if (finePointer && !reduce) {
    // destaque que segue o cursor nos cartões
    var spots = $$(".card, .type-card, .benefit, .step-list li, .pf-card, .mvv-card");
    spots.forEach(function (el) {
      el.setAttribute("data-spot", "");
      var raf = 0;
      el.addEventListener("pointermove", function (e) {
        if (raf) return;
        raf = requestAnimationFrame(function () {
          var r = el.getBoundingClientRect();
          el.style.setProperty("--sx", (e.clientX - r.left).toFixed(0) + "px");
          el.style.setProperty("--sy", (e.clientY - r.top).toFixed(0) + "px");
          raf = 0;
        });
      }, { passive: true });
    });

    // botões "magnéticos"
    $$(".btn-lg, .btn-gold").forEach(function (b) {
      b.addEventListener("pointermove", function (e) {
        var r = b.getBoundingClientRect();
        var x = (e.clientX - (r.left + r.width / 2)) / r.width;
        var y = (e.clientY - (r.top + r.height / 2)) / r.height;
        b.style.setProperty("--mx", (x * 8).toFixed(1) + "px");
        b.style.setProperty("--my", (y * 6).toFixed(1) + "px");
      }, { passive: true });
      b.addEventListener("pointerleave", function () { b.style.removeProperty("--mx"); b.style.removeProperty("--my"); });
    });

    // inclinação suave do mapa do hero
    var art = $(".hero-art"), card = $(".map-card");
    if (art && card) {
      var tilt = 0;
      art.addEventListener("pointermove", function (e) {
        card.classList.add("is-tilting");
        if (tilt) return;
        tilt = requestAnimationFrame(function () {
          var r = art.getBoundingClientRect();
          var x = (e.clientX - r.left) / r.width - 0.5;
          var y = (e.clientY - r.top) / r.height - 0.5;
          card.style.setProperty("--ry", (x * 9).toFixed(2) + "deg");
          card.style.setProperty("--rx", (-y * 7).toFixed(2) + "deg");
          tilt = 0;
        });
      }, { passive: true });
      art.addEventListener("pointerleave", function () {
        card.classList.remove("is-tilting");
        card.style.setProperty("--rx", "0deg");
        card.style.setProperty("--ry", "0deg");
      });
    }
  }

  /* ---------- Filtro do portfólio com animação FLIP ---------- */
  var chips = $$(".pf-filters .chip");
  var cards = $$(".pf-card");
  var grid = $(".pf-grid");
  function applyFilter(f) {
    var first = new Map();
    cards.forEach(function (c) { if (!c.hidden) first.set(c, c.getBoundingClientRect()); });
    cards.forEach(function (c) { c.hidden = !(f === "todos" || c.getAttribute("data-cat") === f); });
    if (reduce || !grid.animate) return;
    cards.forEach(function (c) {
      if (c.hidden) return;
      var now = c.getBoundingClientRect();
      var was = first.get(c);
      if (was) {
        var dx = was.left - now.left, dy = was.top - now.top;
        if (dx || dy) c.animate([{ transform: "translate(" + dx + "px," + dy + "px)" }, { transform: "none" }], { duration: 450, easing: "cubic-bezier(.22,.8,.24,1)" });
      } else {
        c.animate([{ opacity: 0, transform: "translateY(16px) scale(.97)" }, { opacity: 1, transform: "none" }], { duration: 450, easing: "cubic-bezier(.22,.8,.24,1)" });
      }
    });
  }
  chips.forEach(function (chip) {
    chip.addEventListener("click", function () {
      chips.forEach(function (c) {
        var on = c === chip;
        c.classList.toggle("is-active", on);
        c.setAttribute("aria-selected", String(on));
      });
      applyFilter(chip.getAttribute("data-filter"));
    });
  });
  // setas do teclado entre os filtros
  var filters = $(".pf-filters");
  if (filters) filters.addEventListener("keydown", function (e) {
    if (e.key !== "ArrowRight" && e.key !== "ArrowLeft") return;
    var i = chips.indexOf(doc.activeElement);
    if (i < 0) return;
    var n = chips[(i + (e.key === "ArrowRight" ? 1 : chips.length - 1)) % chips.length];
    n.focus(); n.click();
  });

  /* ---------- FAQ: abre e fecha com altura animada; só uma aberta por vez ---------- */
  var faqs = $$(".faq details");
  faqs.forEach(function (d) {
    var sum = $("summary", d), body = $("p", d), anim = null;
    sum.addEventListener("click", function (e) {
      e.preventDefault();
      var opening = !d.open;
      if (opening) faqs.forEach(function (o) { if (o !== d && o.open) o.querySelector("summary").click(); });
      if (reduce || !body.animate) { d.open = opening; return; }
      if (anim) anim.cancel();
      if (opening) {
        d.open = true;
        var h = body.offsetHeight;
        anim = body.animate({ height: ["0px", h + "px"], opacity: [0, 1] }, { duration: 320, easing: "cubic-bezier(.22,.8,.24,1)" });
        anim.onfinish = function () { anim = null; };
      } else {
        var h0 = body.offsetHeight;
        anim = body.animate({ height: [h0 + "px", "0px"], opacity: [1, 0] }, { duration: 240, easing: "ease-in" });
        anim.onfinish = function () { d.open = false; anim = null; };
      }
    });
  });

  /* ---------- Balão do WhatsApp (uma vez por sessão) ---------- */
  var bubble = $(".wa-bubble");
  if (bubble && !store("tm-bubble")) {
    var shown = false;
    var showBubble = function () {
      if (shown) return; shown = true;
      bubble.hidden = false;
      store("tm-bubble", "1");
      setTimeout(function () { bubble.hidden = true; }, 12000);
    };
    setTimeout(function () { if (window.scrollY > 300) showBubble(); else window.addEventListener("scroll", function once() { if (window.scrollY > 300) { window.removeEventListener("scroll", once); setTimeout(showBubble, 1500); } }, { passive: true }); }, 6000);
    $(".wa-bubble-x", bubble).addEventListener("click", function () { bubble.hidden = true; });
    bubble.addEventListener("click", function (e) { if (!e.target.closest(".wa-bubble-x")) { var f = $(".wa-float"); if (f) f.click(); } });
  }

  /* ---------- Rolagem suave com foco acessível nas âncoras ---------- */
  doc.addEventListener("click", function (e) {
    var a = e.target.closest('a[href^="#"]');
    if (!a || a.hasAttribute("data-whatsapp")) return;
    var id = a.getAttribute("href").slice(1);
    var target = id ? doc.getElementById(id) : null;
    if (!target) return;
    e.preventDefault();
    target.scrollIntoView({ behavior: reduce ? "auto" : "smooth", block: "start" });
    try { history.replaceState(null, "", "#" + id); } catch (err) {}
  });

  /* ---------- Carrossel flutuante ---------- */
  (function () {
    var fc = $("#fc");
    if (!fc) return;
    var track = $(".fc-track", fc);
    var slides = $$(".fc-slide", fc);
    var dots = $$(".fc-dot");
    var wrap = fc.parentElement;
    var DELAY = 6500;
    var idx = 0, timer = null, inView = false, hovering = false, dragging = false, raf = 0, jump = 0;

    function centerOf(i) { var el = slides[i]; return el.offsetLeft - (track.clientWidth - el.offsetWidth) / 2; }
    function setActive(i) {
      if (i === idx && slides[i].classList.contains("is-active")) return;
      idx = i;
      slides.forEach(function (s, n) { s.classList.toggle("is-active", n === i); s.setAttribute("aria-hidden", n === i ? "false" : "true"); });
      dots.forEach(function (d, n) {
        d.classList.toggle("is-active", n === i);
        d.setAttribute("aria-current", n === i ? "true" : "false");
        d.firstElementChild.style.animation = "none";
        if (n === i) { void d.offsetWidth; d.firstElementChild.style.animation = ""; }
      });
    }
    function go(i, instant) {
      i = (i + slides.length) % slides.length;
      jump = Date.now();
      track.scrollTo({ left: centerOf(i), behavior: (instant || reduce) ? "auto" : "smooth" });
      setActive(i);
    }
    function nearest() {
      var mid = track.scrollLeft + track.clientWidth / 2, best = 0, d = 1e9;
      slides.forEach(function (s, n) { var c = s.offsetLeft + s.offsetWidth / 2, x = Math.abs(c - mid); if (x < d) { d = x; best = n; } });
      return best;
    }
    track.addEventListener("scroll", function () {
      if (raf) return;
      raf = requestAnimationFrame(function () { raf = 0; setActive(nearest()); });
    }, { passive: true });

    function play() {
      stop();
      if (reduce || !inView || hovering || dragging || doc.hidden) { wrap.classList.add("is-paused"); return; }
      wrap.classList.remove("is-paused");
      timer = setTimeout(function () { go(idx + 1); play(); }, DELAY);
    }
    function stop() { if (timer) { clearTimeout(timer); timer = null; } }

    $(".fc-prev", fc).addEventListener("click", function () { go(idx - 1); play(); });
    $(".fc-next", fc).addEventListener("click", function () { go(idx + 1); play(); });
    dots.forEach(function (d, n) { d.addEventListener("click", function () { go(n); play(); }); });
    slides.forEach(function (s, n) { s.addEventListener("click", function () { if (n !== idx && !dragging) { go(n); play(); } }); });
    track.addEventListener("keydown", function (e) {
      if (e.key === "ArrowRight") { e.preventDefault(); go(idx + 1); play(); }
      else if (e.key === "ArrowLeft") { e.preventDefault(); go(idx - 1); play(); }
    });

    // pausa ao passar o mouse ou focar
    wrap.addEventListener("pointerenter", function (e) { if (e.pointerType === "mouse") { hovering = true; play(); } });
    wrap.addEventListener("pointerleave", function () { hovering = false; play(); });
    wrap.addEventListener("focusin", function () { hovering = true; play(); });
    wrap.addEventListener("focusout", function () { hovering = false; play(); });
    doc.addEventListener("visibilitychange", play);
    if ("IntersectionObserver" in window) {
      new IntersectionObserver(function (en) { inView = en[0].isIntersecting; play(); }, { threshold: 0.35 }).observe(wrap);
    } else { inView = true; }

    // arrastar com o mouse (toque já é nativo)
    var sx = 0, sl = 0, moved = 0;
    track.addEventListener("pointerdown", function (e) {
      if (e.pointerType !== "mouse" || e.button !== 0) return;
      dragging = true; moved = 0; sx = e.clientX; sl = track.scrollLeft;
      track.classList.add("is-dragging");
      track.setPointerCapture(e.pointerId);
    });
    track.addEventListener("pointermove", function (e) {
      if (!dragging) return;
      moved = Math.abs(e.clientX - sx);
      track.scrollLeft = sl - (e.clientX - sx);
    });
    function endDrag() {
      if (!dragging) return;
      var n = nearest(), dx = track.scrollLeft - sl;
      track.classList.remove("is-dragging");
      if (Math.abs(dx) > 40) n = Math.max(0, Math.min(slides.length - 1, idx + (dx > 0 ? 1 : -1)));
      go(n);
      setTimeout(function () { dragging = false; play(); }, 60);
    }
    track.addEventListener("pointerup", endDrag);
    track.addEventListener("pointercancel", endDrag);
    window.addEventListener("resize", function () { go(idx, true); });

    setActive(0);
    go(0, true);
    play();
  })();

  /* ---------- Aviso de privacidade ---------- */
  var cookie = $("#cookieBanner");
  if (cookie) {
    var seen = false;
    try { seen = localStorage.getItem("tm-privacy") === "1"; } catch (e) {}
    if (!seen) setTimeout(function () { cookie.hidden = false; }, 1200);
    $("#cookieAccept").addEventListener("click", function () {
      cookie.hidden = true;
      try { localStorage.setItem("tm-privacy", "1"); } catch (e) {}
    });
  }

  var ano = $("#ano");
  if (ano) ano.textContent = new Date().getFullYear();
})();

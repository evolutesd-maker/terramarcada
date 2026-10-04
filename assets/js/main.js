(function () {
  "use strict";

  var doc = document;
  var root = doc.documentElement;
  var cfg = window.TERRA_MARCADA || {};
  var reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var finePointer = window.matchMedia("(hover: hover) and (pointer: fine)").matches;

  function $(s, c) { return (c || doc).querySelector(s); }
  function $$(s, c) { return Array.prototype.slice.call((c || doc).querySelectorAll(s)); }

  /* ---------- Segurança: validação e limpeza de tudo que vem de configuração ou de campos ---------- */
  // remove caracteres de controle e de direção de texto (usados em golpes de "texto invertido"), limita o tamanho
  function clean(v, max) {
    return String(v == null ? "" : v)
      .replace(/[\u0000-\u001f\u007f-\u009f\u200b-\u200f\u202a-\u202e\u2060-\u2069\ufeff]/g, " ")
      .replace(/\s+/g, " ").trim().slice(0, max || 80);
  }
  var waNumber = String(cfg.whatsapp || "").replace(/\D/g, "");
  if (!/^\d{10,15}$/.test(waNumber)) waNumber = "";
  var email = String(cfg.email || "").trim();
  if (!/^[^\s@<>"'()\[\]\\,;:]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$/.test(email) || email.length > 120) email = "";

  /* ---------- WhatsApp e dados de contato ---------- */
  function waLink(message) {
    var text = encodeURIComponent(clean(message || "Olá! Vim pelo site da Terra Marcada.", 600).replace(/ ?\|\| ?/g, "\n"));
    return waNumber ? "https://wa.me/" + waNumber + "?text=" + text : "https://wa.me/?text=" + text;
  }
  $$("[data-whatsapp]").forEach(function (el) {
    el.href = waLink(el.getAttribute("data-whatsapp"));
    el.target = "_blank";
    el.rel = "noopener noreferrer";
  });
  function fill(key, value, max) {
    value = clean(value, max || 120);
    if (!value) return;
    $$('[data-fill="' + key + '"]').forEach(function (el) { el.textContent = value; });
  }
  fill("phone", waNumber ? cfg.whatsappDisplay : "", 30);
  fill("address", cfg.address, 140);
  fill("hours", cfg.hours, 80);
  fill("cnpj", cfg.cnpj, 40);
  if (email) {
    $$('[data-fill="email"]').forEach(function (el) { el.textContent = email; el.href = "mailto:" + email; });
  }

  /* ---------- Formulário -> mensagem pronta no WhatsApp ---------- */
  var form = $("#wa-form");
  if (form) {
    // o assunto só pode ser uma das opções existentes
    function assunto() {
      var ok = $$("option", form.assunto).map(function (o) { return o.value; });
      return ok.indexOf(form.assunto.value) > -1 ? form.assunto.value : ok[0];
    }
    function msgText(placeholder) {
      var nome = clean(form.nome.value, 80), cidade = clean(form.cidade.value, 80);
      return "Olá! Meu nome é " + (nome || (placeholder ? "[seu nome]" : "")) + ".\n" + "Assunto: " + assunto() + "\n" +
        (cidade ? "Cidade do imóvel: " + cidade + "\n" : "") + "Gostaria de agendar um atendimento.";
    }
    var prev = $("#waPreview");
    function paintPreview() { if (prev) prev.textContent = msgText(true); }
    form.addEventListener("submit", function (e) {
      e.preventDefault();
      var err = $("#err-nome");
      if (!clean(form.nome.value, 80)) {
        form.nome.focus();
        form.nome.setAttribute("aria-invalid", "true");
        if (err) err.hidden = false;
        return;
      }
      form.nome.removeAttribute("aria-invalid");
      if (err) err.hidden = true;
      var msg = msgText(false);
      // waLink limpa o texto; as quebras de linha são preservadas separadamente
      var url = (waNumber ? "https://wa.me/" + waNumber : "https://wa.me/") + "?text=" + encodeURIComponent(msg);
      window.open(url, "_blank", "noopener,noreferrer");
    });
    form.addEventListener("input", paintPreview); form.addEventListener("change", paintPreview); paintPreview();
    form.nome.addEventListener("input", function () { form.nome.removeAttribute("aria-invalid"); var e = $("#err-nome"); if (e) e.hidden = true; });
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
  var timeline = $(".step-list");
  var stepItems = $$(".step-list li");
  var attendImg = $(".attend-media img");
  var floaters = $$(".attend-media, .tech-visual");

  function onScroll() {
    var y = window.scrollY;
    var max = root.scrollHeight - window.innerHeight;
    root.style.setProperty("--sp", max > 0 ? Math.min(1, y / max).toFixed(4) : 0);
    if (progress) progress.style.setProperty("--p", max > 0 ? Math.min(1, y / max).toFixed(4) : 0);
    if (header) header.classList.toggle("is-scrolled", y > 8);
    // esconde ao descer, mostra ao subir
    if (header) {
      if (y > 240 && y > lastY + 4) header.classList.add("is-hidden");
      else if (y < lastY - 4 || y <= 240) header.classList.remove("is-hidden");
    }
    if (toTop) {
      applyTop();
      toTop.style.setProperty("--tp", max > 0 ? Math.min(1, y / max).toFixed(3) : 0);
    }
    var vh = window.innerHeight;
    kickTimeline();
    if (!reduce) {
      for (var fi = 0; fi < floaters.length; fi++) {
        var fr = floaters[fi].getBoundingClientRect();
        if (fr.bottom > -100 && fr.top < vh + 100) floaters[fi].style.setProperty("--fy", ((((fr.top + fr.height / 2) - vh / 2) / vh) * -22).toFixed(1) + "px");
      }
    }
    if (attendImg && !reduce) {
      var ar = attendImg.getBoundingClientRect();
      if (ar.bottom > 0 && ar.top < vh) attendImg.style.setProperty("--pp", (((ar.top + ar.height / 2) - vh / 2) / vh * -14).toFixed(2));
    }
    if (heroBg && !reduce && hero && y < hero.offsetHeight) heroBg.style.setProperty("--py", (y * 0.12).toFixed(1) + "px");
    lastY = y;
    ticking = false;
  }

  /* ---------- Linha do tempo: a linha dourada acompanha a rolagem de forma contínua ---------- */
  var tlRef = null, tlRaf = 0;
  function tlTick() {
    tlRaf = 0;
    var y = window.scrollY, vh = window.innerHeight;
    var target = y + vh * 0.6;                       // ponto de leitura: 60% da altura da tela
    if (tlRef === null || reduce) tlRef = target;
    tlRef += (target - tlRef) * 0.18;                // desliza em vez de pular
    if (Math.abs(target - tlRef) < 0.4) tlRef = target;
    var c = stepItems.map(function (li) { var r = li.firstElementChild.getBoundingClientRect(); return r.top + r.height / 2 + y; });
    stepItems.forEach(function (li, i) {
      var lp = i < c.length - 1 ? Math.max(0, Math.min(1, (tlRef - c[i]) / (c[i + 1] - c[i]))) : 0;
      li.style.setProperty("--lp", lp.toFixed(4));
      li.classList.toggle("is-done", tlRef >= c[i]);
    });
    if (tlRef !== target) tlRaf = requestAnimationFrame(tlTick);
  }
  function kickTimeline() {
    if (!timeline || tlRaf) return;
    var r = timeline.getBoundingClientRect(), vh = window.innerHeight;
    if (r.bottom < -vh * 0.5 && tlRef !== null) { tlRef = null; }      // longe da tela: recomeça do ponto certo ao voltar
    if (r.top > vh * 1.5 || r.bottom < -vh * 1.5) return;
    tlRaf = requestAnimationFrame(tlTick);
  }
  window.addEventListener("scroll", function () {
    if (!ticking) { ticking = true; requestAnimationFrame(onScroll); }
  }, { passive: true });
  onScroll();
  /* ---------- Rolagem animada: o clique "leva" a página até o destino ---------- */
  var glideCancel = null;
  function glideTo(getY, fallbackEl, trigger) {
    var max = function () { return Math.max(0, root.scrollHeight - window.innerHeight); };
    var clampY = function (y) { return Math.max(0, Math.min(max(), Math.round(y))); };
    var targetY = clampY(typeof getY === "function" ? getY() : getY);
    var startY = window.scrollY, dist = targetY - startY;
    if (glideCancel) glideCancel();
    if (Math.abs(dist) < 3) return;
    // com "reduzir movimento" no sistema: deslize curto e sem aceleração; sem isso: viagem mais longa e suave
    var dur = reduce ? Math.min(450, Math.max(220, Math.abs(dist) * 0.2)) : Math.min(1700, Math.max(700, Math.abs(dist) * 0.42));
    var ease = reduce ? function (t) { return 1 - Math.pow(1 - t, 3); }
                      : function (t) { return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2; };
    var t0 = null, raf = 0, ev = ["wheel", "touchstart", "keydown", "mousedown"];
    if (trigger) trigger.classList.add("is-gliding");
    function stop() {
      cancelAnimationFrame(raf); glideCancel = null;
      ev.forEach(function (n) { window.removeEventListener(n, stop); });
      if (trigger) trigger.classList.remove("is-gliding");
    }
    ev.forEach(function (n) { window.addEventListener(n, stop, { passive: true }); }); // o usuário assume o controle
    glideCancel = stop;
    function step(ts) {
      if (t0 === null) t0 = ts;
      var p = Math.min(1, (ts - t0) / dur);
      if (typeof getY === "function") targetY = clampY(getY());   // acompanha mudanças de layout durante a viagem
      window.scrollTo(0, startY + (targetY - startY) * ease(p));
      // quadros incorporados (ex.: prévia) podem não deixar a janela rolar: usa a rolagem nativa do navegador
      if (ts - t0 > 120 && Math.abs(window.scrollY - startY) < 1) {
        stop();
        if (fallbackEl && fallbackEl.scrollIntoView) fallbackEl.scrollIntoView({ behavior: "smooth", block: "start" });
        return;
      }
      if (p < 1) raf = requestAnimationFrame(step); else stop();
    }
    raf = requestAnimationFrame(step);
  }
  doc.addEventListener("click", function (e) {
    var b = e.target.closest("[data-top]");
    if (b) { e.preventDefault(); glideTo(0, doc.getElementById("topo"), b); }
  });
  var heroOut = false;
  function applyTop() { if (toTop) toTop.classList.toggle("is-on", heroOut || window.scrollY > 900); }
  if (hero && "IntersectionObserver" in window) {
    new IntersectionObserver(function (en) { heroOut = !en[0].isIntersecting; applyTop(); }, { threshold: 0 }).observe(hero);
  }

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
        if (!a && typeof moveIndicator === "function") moveIndicator(null);
        if (a) { a.classList.add("is-active"); a.setAttribute("aria-current", "true"); if (typeof moveIndicator === "function") moveIndicator(a); }
      });
    }, { rootMargin: "-45% 0px -50% 0px" });
    Object.keys(map).forEach(function (id) { var s = doc.getElementById(id); if (s) spy.observe(s); });
    $$(".hero, main section[id]").forEach(function (s) { spy.observe(s); });
  }

  /* ---------- Indicador deslizante do menu (desktop) ---------- */
  var indicator = $(".nav-indicator");
  var desk = window.matchMedia("(min-width: 981px)");
  function moveIndicator(el) {
    if (!indicator) return;
    if (!el || !desk.matches) { indicator.style.opacity = "0"; return; }
    indicator.style.setProperty("--x", el.offsetLeft + "px");
    indicator.style.setProperty("--w", el.offsetWidth + "px");
    indicator.style.opacity = "1";
  }
  function currentLink() { return $(".nav a.is-active:not(.btn)") || null; }
  if (indicator) {
    links.forEach(function (a) {
      a.addEventListener("pointerenter", function () { moveIndicator(a); });
      a.addEventListener("focus", function () { moveIndicator(a); });
      a.addEventListener("pointerleave", function () { moveIndicator(currentLink()); });
      a.addEventListener("blur", function () { moveIndicator(currentLink()); });
    });
    window.addEventListener("resize", function () { moveIndicator(currentLink()); });
    moveIndicator(currentLink());
  }

  /* ---------- Revelar ao rolar, com escalonamento ---------- */
  var revealSel = ".section-head, .card, .type-card, .benefits h3, .benefit, .steps h3, .step-list li, .inline-cta, .pf-filters, .pf-card, .contour-divider, .about-copy, .attend-media, .attend-copy, .tech-copy, .tech-card, .mvv-card, .faq details, .cta-copy, .contact-card";
  var items = $$(revealSel);
  if ("IntersectionObserver" in window && !reduce) {
    items.forEach(function (el) {
      el.classList.add("reveal");
      var sib = el.parentElement ? $$(":scope > " + (el.tagName.toLowerCase()), el.parentElement) : [];
      var i = sib.indexOf(el);
      if (i > 0) el.style.setProperty("--d", Math.min(i, 4) * 60 + "ms");
    });
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (en.isIntersecting) { en.target.classList.add("is-visible"); io.unobserve(en.target); }
      });
    }, { rootMargin: "0px 0px -8% 0px", threshold: 0.05 });
    items.forEach(function (el) { io.observe(el); });
    // rede de segurança: nada fica escondido se o observador falhar
    setTimeout(function () { items.forEach(function (el) { el.classList.add("is-visible"); }); }, 3500);
  }

  /* ---------- Interações de ponteiro (somente mouse/trackpad) ---------- */
  if (finePointer && !reduce) {
    // destaque que segue o cursor nos cartões
    var spots = $$(".card, .type-card, .benefit, .pf-card, .mvv-card");
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
  }

  if (finePointer && !reduce) {
    // ímã discreto nos botões principais
    $$(".btn-lg").forEach(function (b) {
      b.addEventListener("pointermove", function (e) {
        var r = b.getBoundingClientRect();
        b.style.setProperty("--mx", (((e.clientX - (r.left + r.width / 2)) / r.width) * 7).toFixed(1) + "px");
        b.style.setProperty("--my", (((e.clientY - (r.top + r.height / 2)) / r.height) * 5).toFixed(1) + "px");
      }, { passive: true });
      b.addEventListener("pointerleave", function () { b.style.removeProperty("--mx"); b.style.removeProperty("--my"); });
    });

    // mapa do início: inclinação suave com profundidade
    var art = $(".hero-art"), mcard = $(".map-card");
    if (art && mcard) {
      var tilt = 0;
      art.addEventListener("pointermove", function (e) {
        mcard.classList.add("is-tilting");
        if (tilt) return;
        tilt = requestAnimationFrame(function () {
          var r = art.getBoundingClientRect();
          mcard.style.setProperty("--ry", (((e.clientX - r.left) / r.width - 0.5) * 8).toFixed(2) + "deg");
          mcard.style.setProperty("--rx", ((-((e.clientY - r.top) / r.height - 0.5)) * 6).toFixed(2) + "deg");
          tilt = 0;
        });
      }, { passive: true });
      art.addEventListener("pointerleave", function () {
        mcard.classList.remove("is-tilting");
        mcard.style.setProperty("--rx", "0deg"); mcard.style.setProperty("--ry", "0deg");
      });
    }

    // drone acompanha o cursor
    var tcard = $(".tech-card");
    if (tcard) {
      tcard.addEventListener("pointermove", function (e) {
        var r = tcard.getBoundingClientRect();
        var x = (e.clientX - r.left) / r.width - 0.5, y = (e.clientY - r.top) / r.height - 0.5;
        tcard.style.setProperty("--dx", (x * 22).toFixed(1) + "px");
        tcard.style.setProperty("--dy", (y * 16).toFixed(1) + "px");
        tcard.style.setProperty("--dr", (x * 5).toFixed(2) + "deg");
      }, { passive: true });
      tcard.addEventListener("pointerleave", function () {
        tcard.style.setProperty("--dx", "0px"); tcard.style.setProperty("--dy", "0px"); tcard.style.setProperty("--dr", "0deg");
      });
    }
  }
  if (reduce) { $$("svg.flight").forEach(function (sv) { if (sv.pauseAnimations) sv.pauseAnimations(); }); }

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

  /* ---------- Âncoras da página: levam até a seção com animação e foco acessível ---------- */
  doc.addEventListener("click", function (e) {
    if (e.defaultPrevented) return;
    var a = e.target.closest('a[href^="#"]');
    if (!a || a.hasAttribute("data-whatsapp")) return;
    var id = a.getAttribute("href").slice(1);
    var target = id ? doc.getElementById(id) : null;
    if (!target) return;
    e.preventDefault();
    var pad = parseFloat(getComputedStyle(root).scrollPaddingTop) || 0;
    glideTo(id === "topo" ? 0 : function () { return target.getBoundingClientRect().top + window.scrollY - pad; }, target, a);
    try { history.replaceState(null, "", "#" + id); } catch (err) {}
    if (!target.hasAttribute("tabindex")) target.setAttribute("tabindex", "-1");
    try { target.focus({ preventScroll: true }); } catch (err2) {}
  });

  /* ---------- Detalhes temáticos ---------- */
  // ondulação ao clicar nos botões
  doc.addEventListener("pointerdown", function (e) {
    var b = e.target.closest(".btn");
    if (!b || reduce) return;
    var r = b.getBoundingClientRect(), d = doc.createElement("span");
    d.className = "ripple"; d.style.left = (e.clientX - r.left) + "px"; d.style.top = (e.clientY - r.top) + "px";
    b.appendChild(d); setTimeout(function () { d.remove(); }, 650);
  });

  // lotes do mapa: o cartão aparece só enquanto o cursor está sobre um lote
  var tagA = $(".map-tag-a"), lotName = $("#lotName"), lotArea = $("#lotArea"), mapSvg = $(".map-svg"), mapCard = $(".map-card");
  if (mapSvg && tagA && mapCard) {
    var hideT = 0;
    var showLot = function (p, touch) {
      clearTimeout(hideT);
      lotName.textContent = "Lote " + p.getAttribute("data-lot") + " · Quadra " + p.getAttribute("data-q");
      lotArea.textContent = "Área: " + p.getAttribute("data-area") + " m²";
      var cr = mapCard.getBoundingClientRect(), pr = p.getBoundingClientRect();
      var half = tagA.offsetWidth / 2, h = tagA.offsetHeight;
      var x = Math.max(half + 8, Math.min(cr.width - half - 8, pr.left + pr.width / 2 - cr.left));
      var y = pr.top - cr.top - 10;
      if (y - h < 6) y = pr.bottom - cr.top + h + 10; // lote na borda de cima: o cartão vai abaixo
      tagA.style.left = x + "px"; tagA.style.top = y + "px";
      tagA.classList.add("is-on");
      if (touch) hideT = setTimeout(hideLot, 2200);
    };
    var hideLot = function () { clearTimeout(hideT); hideT = setTimeout(function () { tagA.classList.remove("is-on"); }, 90); };
    mapSvg.addEventListener("pointerover", function (e) {
      var p = e.target.closest("path[data-lot]");
      if (p) showLot(p, e.pointerType === "touch"); else hideLot();
    });
    mapSvg.addEventListener("pointerleave", hideLot);
  }

  // altitude do visor do drone
  var alt = $("#hudAlt");
  if (alt && !reduce) {
    var a = 86, hudOn = false;
    if ("IntersectionObserver" in window) new IntersectionObserver(function (en) { hudOn = en[0].isIntersecting; }).observe(alt.closest(".tech-card"));
    setInterval(function () {
      if (!hudOn || doc.hidden) return;
      a = Math.max(62, Math.min(118, a + Math.round((Math.random() - 0.5) * 6)));
      alt.textContent = a;
    }, 900);
  }


  /* ---------- Floats: poeira dourada e pinos em camadas ---------- */
  if (!reduce) {
    $$(".section-dark, .cta-final").forEach(function (sec, si) {
      var d = doc.createElement("div");
      d.className = "dust"; d.setAttribute("aria-hidden", "true");
      for (var i = 0; i < 9; i++) {
        var p = doc.createElement("i");
        p.style.setProperty("--x", ((i * 11 + si * 7 + 6) % 96) + "%");
        p.style.setProperty("--s", (2 + (i % 3)) + "px");
        p.style.setProperty("--t", (16 + (i * 3) % 11) + "s");
        p.style.setProperty("--d", "-" + ((i * 2.3 + si) % 14).toFixed(1) + "s");
        p.style.setProperty("--dx", ((i % 2 ? 1 : -1) * (14 + i * 4)) + "px");
        d.appendChild(p);
      }
      sec.insertBefore(d, sec.firstChild);
    });
    var heroEl2 = $(".hero");
    if (heroEl2 && finePointer) {
      var hraf = 0;
      heroEl2.addEventListener("pointermove", function (e) {
        if (hraf) return;
        hraf = requestAnimationFrame(function () {
          var r = heroEl2.getBoundingClientRect();
          heroEl2.style.setProperty("--hx", (((e.clientX - r.left) / r.width - 0.5) * 2).toFixed(3));
          heroEl2.style.setProperty("--hy", (((e.clientY - r.top) / r.height - 0.5) * 2).toFixed(3));
          hraf = 0;
        });
      }, { passive: true });
      heroEl2.addEventListener("pointerleave", function () { heroEl2.style.setProperty("--hx", "0"); heroEl2.style.setProperty("--hy", "0"); });
    }
  }

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

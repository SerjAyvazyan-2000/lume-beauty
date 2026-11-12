/* =========================================================================
   LUMÉ — логика лендинга. Контент берётся из assets/js/config.js
   ========================================================================= */
(function () {
  "use strict";

  const C = window.SITE_CONFIG || {};
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));
  const get = (path) => path.split(".").reduce((o, k) => (o == null ? o : o[k]), C);
  const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const pad = (n) => String(n).padStart(2, "0");
  const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const finePointer = window.matchMedia("(hover: hover) and (pointer: fine)").matches;
  const store = {
    get(k) { try { return localStorage.getItem(k); } catch (e) { return null; } },
    set(k, v) { try { localStorage.setItem(k, v); } catch (e) { /* хранилище недоступно */ } }
  };

  /* ---------- 1. Тема и SEO ---------- */
  function applyTheme() {
    const t = C.theme || {};
    const root = document.documentElement.style;
    if (t.accent) root.setProperty("--accent", t.accent);
    if (t.ink) root.setProperty("--ink", t.ink);
    if (t.paper) root.setProperty("--paper", t.paper);
    if (t.blush) root.setProperty("--blush", t.blush);
    if (C.seo) {
      if (C.seo.title) document.title = C.seo.title;
      const d = $('meta[name="description"]');
      if (d && C.seo.description) d.setAttribute("content", C.seo.description);
    }
  }

  /* ---------- 2. Привязка простых полей ---------- */
  function bindFields() {
    $$("[data-bind]").forEach((el) => {
      const v = get(el.dataset.bind);
      if (v != null) el.textContent = v;
    });
    $$("[data-src-bind]").forEach((el) => {
      const v = get(el.dataset.srcBind);
      if (v) el.src = v;
    });
    $$("[data-href-bind]").forEach((el) => {
      const v = get(el.dataset.hrefBind);
      if (v) el.href = v;
    });
    $$('[data-href="tel"]').forEach((el) => { el.href = "tel:" + String(get("contacts.phone") || "").replace(/[^\d+]/g, ""); });
    $$('[data-href="mailto"]').forEach((el) => { el.href = "mailto:" + (get("contacts.email") || ""); });
    $$("[data-year]").forEach((el) => { el.textContent = new Date().getFullYear(); });
  }

  /* ---------- 3. Рендер списков ---------- */
  const renderers = {
    socials: () => (C.socials || []).map((s) => `<a href="${esc(s.url)}" target="_blank" rel="noopener">${esc(s.name)}</a>`).join(""),

    marquee: () => {
      const items = (C.marquee || []).map((m) => `<span class="marquee__item">${esc(m)}</span>`).join("");
      return items + items; // дубль для бесшовной прокрутки
    },

    stats: () => (get("about.stats") || []).map((s) =>
      `<li class="reveal"><b><span data-count="${Number(s.value) || 0}">0</span>${esc(s.suffix)}</b><span>${esc(s.label)}</span></li>`).join(""),

    serviceTabs: () => (C.services || []).map((c, i) =>
      `<button class="tab" role="tab" id="tab-${i}" aria-controls="panel-${i}" aria-selected="${i === 0}" tabindex="${i === 0 ? 0 : -1}">${esc(c.category)}<sup>${pad(c.items.length)}</sup></button>`).join(""),

    servicePanels: () => (C.services || []).map((c, i) =>
      `<div class="price__panel${i === 0 ? " is-active" : ""}" role="tabpanel" id="panel-${i}" aria-labelledby="tab-${i}" data-img="${esc(c.image)}">` +
      c.items.map((s, j) =>
        `<a class="price__row" href="#booking" data-service="${esc(s.name)}">
           <span class="price__idx">${pad(j + 1)}</span>
           <span class="price__name">${esc(s.name)}</span>
           <span class="price__desc">${esc(s.desc)}</span>
           <span class="price__time">${esc(s.time)}</span>
           <span class="price__cost">${esc(s.price)}</span>
           <span class="price__plus" aria-hidden="true">+</span>
         </a>`).join("") + "</div>").join(""),

    facts: () => (get("results.facts") || []).map((f) => `<div><dt>${esc(f.k)}</dt><dd>${esc(f.v)}</dd></div>`).join(""),

    ritual: () => (C.ritual || []).map((s, i) => `<li class="step" data-step="${i + 1}"><h3>${esc(s.title)}</h3><p>${esc(s.text)}</p></li>`).join(""),

    team: () => (C.team || []).map((m, i) =>
      `<article class="master reveal" style="--d:${i * 0.08}s">
         <figure class="master__photo"><img src="${esc(m.photo)}" alt="${esc(m.name)}" loading="lazy"><span class="master__exp">${esc(m.exp)}</span></figure>
         <h3>${esc(m.name)}</h3><p>${esc(m.role)}</p>
       </article>`).join(""),

    reviews: () => (C.reviews || []).map((r, i) =>
      `<article class="review${i === 0 ? " is-current" : ""}">
         <div><div class="review__quote" aria-hidden="true">“</div><p class="review__text">${esc(r.text)}</p></div>
         <div class="review__who"><span class="review__ava" aria-hidden="true">${esc((r.name || "?")[0])}</span>
           <div><b>${esc(r.name)}</b><small>${esc(r.service)}</small></div>
           <span class="review__stars" aria-label="5 из 5">★★★★★</span></div>
       </article>`).join(""),

    giftAmounts: () => (get("gift.amounts") || []).map((a, i) =>
      `<button type="button" class="chip" role="radio" aria-checked="${i === 1}" data-amount="${esc(a)}">${esc(a)}</button>`).join(""),

    faq: () => (C.faq || []).map((f, i) =>
      `<div class="acc reveal${i === 0 ? " is-open" : ""}">
         <button class="acc__btn" type="button" aria-expanded="${i === 0}" aria-controls="faq-${i}" id="faq-b-${i}">${esc(f.q)}<span class="acc__icon" aria-hidden="true"></span></button>
         <div class="acc__body" id="faq-${i}" role="region" aria-labelledby="faq-b-${i}"><div><p>${esc(f.a)}</p></div></div>
       </div>`).join(""),

    serviceOptions: () => (C.services || []).map((c) =>
      `<optgroup label="${esc(c.category)}">` + c.items.map((s) => `<option value="${esc(s.name)}">${esc(s.name)} — ${esc(s.price)}</option>`).join("") + "</optgroup>").join(""),

    masterOptions: () => `<option value="Любой">Любой свободный мастер</option>` +
      (C.team || []).map((m) => `<option value="${esc(m.name)}">${esc(m.name)} · ${esc(m.role)}</option>`).join(""),

    slots: () => (get("booking.timeSlots") || []).map((t) =>
      `<button type="button" class="slot" role="radio" aria-checked="false" data-time="${esc(t)}">${esc(t)}</button>`).join(""),

    hours: () => (get("contacts.hours") || []).map((h) => `<span class="hours-row"><span>${esc(h.days)}</span><span>${esc(h.time)}</span></span>`).join(""),

    map: () => {
      const src = get("contacts.mapEmbed");
      if (src) return `<iframe src="${esc(src)}" loading="lazy" title="Карта проезда" allowfullscreen></iframe>`;
      return `<svg class="map__svg" viewBox="0 0 600 460" preserveAspectRatio="xMidYMid slice" aria-hidden="true">
          <rect width="600" height="460" fill="#efe4da"/>
          <path d="M-20 330 C120 300 200 360 330 320 S520 250 640 280" stroke="#d9c6b8" stroke-width="40" fill="none"/>
          <g stroke="#fff" stroke-width="14" fill="none" stroke-linecap="round">
            <path d="M0 120 L620 160"/><path d="M80 -10 L180 480"/><path d="M380 -10 L330 480"/><path d="M0 250 L620 210"/><path d="M520 -10 L600 480"/>
          </g>
          <g stroke="#fff" stroke-width="6" fill="none" opacity=".8"><path d="M0 60 L620 90"/><path d="M250 -10 L240 480"/><path d="M0 400 L620 380"/><path d="M460 -10 L440 480"/></g>
          <g fill="#e4d4c7"><rect x="200" y="160" width="120" height="70" rx="8"/><rect x="400" y="260" width="90" height="90" rx="8"/><rect x="100" y="270" width="110" height="60" rx="8"/><rect x="410" y="100" width="80" height="80" rx="8"/></g>
          <circle cx="140" cy="420" r="60" fill="#dfe3cf"/><circle cx="560" cy="60" r="70" fill="#dfe3cf"/>
        </svg>
        <div class="map__pin"><b>${esc(get("brand.name"))} · ${esc(get("contacts.address"))}</b><i></i></div>
        <a class="btn btn--dark btn--sm map__open" href="${esc(get("contacts.mapLink") || "#")}" target="_blank" rel="noopener"><span>Построить маршрут</span></a>`;
    }
  };

  function renderAll() {
    $$("[data-render]").forEach((el) => {
      const fn = renderers[el.dataset.render];
      if (fn) el.innerHTML = fn();
    });
  }

  /* ---------- 4. Интро и запуск hero ---------- */
  function intro() {
    const go = () => document.body.classList.add("is-ready");
    if (reduced) return go();
    setTimeout(go, 1300);
    setTimeout(() => { const i = $(".intro"); if (i) i.remove(); }, 2300);
  }

  /* ---------- 5. Смена слов в заголовке ---------- */
  function rotator() {
    const el = $(".rotator__word");
    const words = get("hero.rotatingWords") || [];
    if (!el || !words.length) return;
    let i = 0;
    const paint = (w) => {
      el.innerHTML = [...w].map((ch, k) => `<span class="ch" style="animation-delay:${k * 0.035}s">${ch === " " ? "&nbsp;" : esc(ch)}</span>`).join("");
      el.setAttribute("aria-label", w);
    };
    paint(words[0]);
    if (reduced || words.length < 2) return;
    setInterval(() => {
      el.classList.add("is-out");
      setTimeout(() => { i = (i + 1) % words.length; el.classList.remove("is-out"); paint(words[i]); }, 450);
    }, 3000);
  }

  /* ---------- 6. Шапка ---------- */
  function header() {
    const h = $(".header");
    const fab = $(".fab");
    let last = 0;
    const onScroll = () => {
      const y = window.scrollY;
      h.classList.toggle("is-scrolled", y > 20);
      h.classList.toggle("is-hidden", y > 400 && y > last && !document.body.classList.contains("is-locked"));
      last = y;
      if (fab) {
        const b = $("#booking").getBoundingClientRect();
        fab.classList.toggle("is-on", y > 600 && (b.top > window.innerHeight || b.bottom < 0));
      }
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    onScroll();

    // подсветка активного пункта меню
    const links = $$(".nav a");
    const io = new IntersectionObserver((entries) => {
      entries.forEach((e) => {
        if (e.isIntersecting) links.forEach((a) => a.classList.toggle("is-active", a.getAttribute("href") === "#" + e.target.id));
      });
    }, { rootMargin: "-45% 0px -50% 0px" });
    links.forEach((a) => { const s = $(a.getAttribute("href")); if (s) io.observe(s); });
  }

  /* ---------- 7. Мобильное меню ---------- */
  function mobileMenu() {
    const btn = $(".burger"), menu = $("#mobileMenu");
    if (!btn) return;
    const set = (open) => {
      btn.setAttribute("aria-expanded", open);
      btn.setAttribute("aria-label", open ? "Закрыть меню" : "Открыть меню");
      menu.classList.toggle("is-open", open);
      menu.setAttribute("aria-hidden", !open);
      document.body.classList.toggle("is-locked", open);
    };
    btn.addEventListener("click", () => set(btn.getAttribute("aria-expanded") !== "true"));
    $$("a", menu).forEach((a) => a.addEventListener("click", () => set(false)));
    document.addEventListener("keydown", (e) => { if (e.key === "Escape") set(false); });
  }

  /* ---------- 8. Появление при скролле + счётчики ---------- */
  function reveals() {
    const els = $$(".reveal, .reveal-img");
    if (reduced || !("IntersectionObserver" in window)) { els.forEach((e) => e.classList.add("is-in")); }
    else {
      const io = new IntersectionObserver((entries) => {
        entries.forEach((e) => { if (e.isIntersecting) { e.target.classList.add("is-in"); io.unobserve(e.target); } });
      }, { threshold: 0.12, rootMargin: "0px 0px -6% 0px" });
      els.forEach((e) => io.observe(e));
    }

    const counters = $$("[data-count]");
    const run = (el) => {
      const to = +el.dataset.count;
      if (reduced) { el.textContent = to; return; }
      const t0 = performance.now(), dur = 1800;
      const tick = (t) => {
        const p = Math.min(1, (t - t0) / dur), e = 1 - Math.pow(1 - p, 4);
        el.textContent = Math.round(to * e);
        if (p < 1) requestAnimationFrame(tick);
      };
      requestAnimationFrame(tick);
    };
    const cio = new IntersectionObserver((entries) => {
      entries.forEach((e) => { if (e.isIntersecting) { run(e.target); cio.unobserve(e.target); } });
    }, { threshold: 0.6 });
    counters.forEach((c) => cio.observe(c));
  }

  /* ---------- 9. Текст, проявляющийся по словам при скролле ---------- */
  function wordsOnScroll() {
    const el = $("[data-words]");
    if (!el) return;
    el.innerHTML = el.textContent.split(/\s+/).map((w) => `<span class="w">${esc(w)}</span>`).join(" ");
    const words = $$(".w", el);
    const update = () => {
      const r = el.getBoundingClientRect(), vh = window.innerHeight;
      const p = Math.min(1, Math.max(0, (vh * 0.85 - r.top) / (r.height + vh * 0.4)));
      const n = Math.round(p * words.length);
      words.forEach((w, i) => w.classList.toggle("is-on", i < n));
    };
    window.addEventListener("scroll", update, { passive: true });
    update();
  }

  /* ---------- 10. Параллакс ---------- */
  function parallax() {
    if (reduced) return;
    const els = $$(".parallax");
    const update = () => els.forEach((el) => {
      const r = el.getBoundingClientRect();
      const off = (r.top + r.height / 2 - window.innerHeight / 2) * (+el.dataset.speed || 0.05);
      const img = $("img", el); if (img) img.style.translate = `0 ${off}px`;
    });
    window.addEventListener("scroll", () => requestAnimationFrame(update), { passive: true });
  }

  /* ---------- 11. Магнитные кнопки ---------- */
  function magnetic() {
    if (!finePointer || reduced) return;
    $$(".magnetic").forEach((b) => {
      b.addEventListener("mousemove", (e) => {
        const r = b.getBoundingClientRect();
        b.style.transform = `translate(${(e.clientX - r.left - r.width / 2) * 0.18}px, ${(e.clientY - r.top - r.height / 2) * 0.28}px)`;
      });
      b.addEventListener("mouseleave", () => { b.style.transform = ""; });
    });
  }

  /* ---------- 12. Услуги: вкладки + превью у курсора ---------- */
  function services() {
    const tabs = $$(".tab"), panels = $$(".price__panel");
    const select = (i) => {
      tabs.forEach((t, k) => { t.setAttribute("aria-selected", k === i); t.tabIndex = k === i ? 0 : -1; });
      panels.forEach((p, k) => p.classList.toggle("is-active", k === i));
    };
    tabs.forEach((t, i) => {
      t.addEventListener("click", () => select(i));
      t.addEventListener("keydown", (e) => {
        if (e.key === "ArrowRight" || e.key === "ArrowLeft") {
          const n = (i + (e.key === "ArrowRight" ? 1 : -1) + tabs.length) % tabs.length;
          select(n); tabs[n].focus();
        }
      });
    });

    // клик по услуге — подставляем её в форму записи
    $$(".price__row").forEach((row) => row.addEventListener("click", () => {
      const s = $("#f-service"); if (s) s.value = row.dataset.service;
    }));

    if (!finePointer || reduced) return;
    const prev = $(".cursor-preview"), img = $("img", prev);
    let x = 0, y = 0, cx = 0, cy = 0, raf;
    const loop = () => { cx += (x - cx) * 0.14; cy += (y - cy) * 0.14; prev.style.left = cx + "px"; prev.style.top = cy + "px"; raf = requestAnimationFrame(loop); };
    panels.forEach((p) => {
      $$(".price__row", p).forEach((row) => {
        row.addEventListener("mouseenter", (e) => {
          if (img.getAttribute("src") !== p.dataset.img) img.src = p.dataset.img;
          x = cx = e.clientX + 150; y = cy = e.clientY;
          prev.classList.add("is-on"); cancelAnimationFrame(raf); loop();
        });
        row.addEventListener("mousemove", (e) => { x = e.clientX + 150; y = e.clientY; });
        row.addEventListener("mouseleave", () => { prev.classList.remove("is-on"); setTimeout(() => cancelAnimationFrame(raf), 400); });
      });
    });
  }

  /* ---------- 13. До / После ---------- */
  function compare() {
    const box = $(".compare"); if (!box) return;
    const range = $(".compare__range", box);
    const set = (v) => box.style.setProperty("--pos", v + "%");
    range.addEventListener("input", () => set(range.value));
    // лёгкая демонстрация при первом показе
    if (reduced) return;
    const io = new IntersectionObserver((en) => {
      if (!en[0].isIntersecting) return;
      io.disconnect();
      const t0 = performance.now();
      const anim = (t) => {
        const p = Math.min(1, (t - t0) / 1800);
        const v = 50 + Math.sin(p * Math.PI * 2) * 22 * (1 - p);
        set(v); range.value = v;
        if (p < 1) requestAnimationFrame(anim);
      };
      setTimeout(() => requestAnimationFrame(anim), 600);
    }, { threshold: 0.5 });
    io.observe(box);
  }

  /* ---------- 14. Шаги визита ---------- */
  function ritual() {
    const steps = $$(".step"), list = $(".steps"), num = $(".ritual__num"), total = $(".ritual__total");
    if (!steps.length) return;
    if (total) total.textContent = "/ " + pad(steps.length);
    let current = 0;
    const update = () => {
      const mid = window.innerHeight * 0.5;
      let active = 0;
      steps.forEach((s, i) => { if (s.getBoundingClientRect().top < mid) active = i; });
      steps.forEach((s, i) => s.classList.toggle("is-active", i <= active));
      const r = list.getBoundingClientRect();
      list.style.setProperty("--progress", Math.min(1, Math.max(0, (mid - r.top) / r.height)).toFixed(3));
      if (num && active !== current) {
        current = active;
        num.classList.add("is-swap");
        setTimeout(() => { num.textContent = pad(active + 1); num.classList.remove("is-swap"); }, 220);
      }
    };
    window.addEventListener("scroll", update, { passive: true });
    update();
  }

  /* ---------- 15. Карусель отзывов ---------- */
  function reviews() {
    const track = $(".reviews__track"); if (!track) return;
    const cards = $$(".review", track), count = $(".slider-nav__count b"), totalEl = $(".slider-nav__count i"), bar = $(".reviews__progress span");
    const n = cards.length; let i = 0, timer;
    totalEl.textContent = pad(n);
    bar.style.width = 100 / n + "%";
    const go = (k) => {
      i = (k + n) % n;
      const max = Math.max(0, track.scrollWidth - track.parentElement.clientWidth);
      track.style.transform = `translateX(${-Math.min(cards[i].offsetLeft, max)}px)`;
      cards.forEach((c, j) => c.classList.toggle("is-current", j === i));
      count.textContent = pad(i + 1);
      bar.style.transform = `translateX(${i * 100}%)`;
    };
    const auto = () => { clearInterval(timer); if (!reduced) timer = setInterval(() => go(i + 1), 6000); };
    $$(".slider-nav [data-dir]").forEach((b) => b.addEventListener("click", () => { go(i + +b.dataset.dir); auto(); }));
    // свайп
    let sx = null;
    track.addEventListener("touchstart", (e) => { sx = e.touches[0].clientX; }, { passive: true });
    track.addEventListener("touchend", (e) => {
      if (sx == null) return;
      const dx = e.changedTouches[0].clientX - sx;
      if (Math.abs(dx) > 40) { go(i + (dx < 0 ? 1 : -1)); auto(); }
      sx = null;
    });
    window.addEventListener("resize", () => go(i));
    auto();
  }

  /* ---------- 16. Сертификат: 3D-наклон + суммы ---------- */
  function gift() {
    const card = $(".gift-card"), amount = $("[data-gift-amount]");
    const chips = $$(".chip");
    const pick = (chip) => {
      chips.forEach((c) => c.setAttribute("aria-checked", c === chip));
      amount.textContent = chip.dataset.amount;
      amount.classList.remove("is-pop"); void amount.offsetWidth; amount.classList.add("is-pop");
    };
    chips.forEach((c) => c.addEventListener("click", () => pick(c)));
    const def = chips.find((c) => c.getAttribute("aria-checked") === "true") || chips[0];
    if (def) pick(def);

    const cta = $("[data-gift-cta]");
    if (cta) cta.addEventListener("click", () => {
      const s = $("#f-service");
      const chosen = $('.chip[aria-checked="true"]');
      if (s && chosen) {
        let opt = $('option[value^="Подарочный сертификат"]', s);
        if (!opt) { opt = document.createElement("option"); s.prepend(opt); }
        opt.value = opt.textContent = "Подарочный сертификат " + chosen.dataset.amount;
        s.value = opt.value;
      }
    });

    if (!finePointer || reduced || !card) return;
    card.addEventListener("mousemove", (e) => {
      const r = card.getBoundingClientRect();
      const px = (e.clientX - r.left) / r.width, py = (e.clientY - r.top) / r.height;
      card.style.transform = `rotateY(${(px - 0.5) * 18}deg) rotateX(${(0.5 - py) * 14}deg)`;
      card.style.setProperty("--mx", px * 100 + "%");
      card.style.setProperty("--my", py * 100 + "%");
    });
    card.addEventListener("mouseleave", () => { card.style.transform = ""; });
  }

  /* ---------- 17. FAQ ---------- */
  function faq() {
    $$(".acc").forEach((acc) => {
      const btn = $(".acc__btn", acc);
      btn.addEventListener("click", () => {
        const open = !acc.classList.contains("is-open");
        $$(".acc").forEach((a) => { a.classList.remove("is-open"); $(".acc__btn", a).setAttribute("aria-expanded", "false"); });
        acc.classList.toggle("is-open", open);
        btn.setAttribute("aria-expanded", open);
      });
    });
  }

  /* ---------- 18. Модалки ---------- */
  let lastFocus = null;
  function openModal(m) {
    lastFocus = document.activeElement;
    m.hidden = false; document.body.classList.add("is-locked");
    const f = $("button, [href], input", m); if (f) setTimeout(() => f.focus(), 50);
  }
  function closeModal(m) {
    m.hidden = true;
    if (!$$(".modal").some((x) => !x.hidden)) document.body.classList.remove("is-locked");
    if (lastFocus) lastFocus.focus();
  }
  function modals() {
    $$(".modal").forEach((m) => $$("[data-close]", m).forEach((b) => b.addEventListener("click", () => closeModal(m))));
    document.addEventListener("keydown", (e) => { if (e.key === "Escape") $$(".modal").filter((m) => !m.hidden).forEach(closeModal); });
  }

  /* ---------- 19. Форма записи ---------- */
  function booking() {
    const form = $(".form"); if (!form) return;
    const date = $("#f-date"), phone = $("#f-phone"), name = $("#f-name");
    const slots = $$(".slot");
    let time = "";

    // дата: сегодня по умолчанию, прошлое недоступно
    const iso = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
    const today = new Date();
    date.min = iso(today); date.value = iso(today);

    // прошедшие слоты сегодня отключаем
    const refreshSlots = () => {
      const isToday = date.value === iso(new Date());
      const now = new Date().getHours() * 60 + new Date().getMinutes();
      slots.forEach((s) => {
        const [h, m] = s.dataset.time.split(":").map(Number);
        s.disabled = isToday && h * 60 + m <= now;
        if (s.disabled && s.getAttribute("aria-checked") === "true") { s.setAttribute("aria-checked", "false"); time = ""; }
      });
      if (!time) { const free = slots.find((s) => !s.disabled); if (free) { free.setAttribute("aria-checked", "true"); time = free.dataset.time; } }
    };
    slots.forEach((s) => s.addEventListener("click", () => {
      slots.forEach((x) => x.setAttribute("aria-checked", x === s)); time = s.dataset.time;
    }));
    date.addEventListener("change", refreshSlots);
    refreshSlots();
    // сегодня свободных окон нет — переносим на завтра
    if (slots.length && slots.every((x) => x.disabled)) {
      const t = new Date(); t.setDate(t.getDate() + 1);
      date.value = iso(t); refreshSlots();
    }

    // маска телефона +7 (___) ___-__-__
    phone.addEventListener("input", () => {
      let d = phone.value.replace(/\D/g, "");
      if (!d) { phone.value = ""; return; }
      if (d[0] === "8") d = "7" + d.slice(1);
      if (d[0] !== "7") d = "7" + d;
      d = d.slice(0, 11);
      let out = "+7";
      if (d.length > 1) out += " (" + d.slice(1, 4);
      if (d.length >= 4) out += ")";
      if (d.length > 4) out += " " + d.slice(4, 7);
      if (d.length > 7) out += "-" + d.slice(7, 9);
      if (d.length > 9) out += "-" + d.slice(9, 11);
      phone.value = out;
    });

    const err = (input, bad) => input.closest(".field").classList.toggle("is-error", bad);
    [name, phone].forEach((i) => i.addEventListener("input", () => err(i, false)));

    form.addEventListener("submit", async (e) => {
      e.preventDefault();
      const badName = name.value.trim().length < 2;
      const badPhone = phone.value.replace(/\D/g, "").length < 11;
      err(name, badName); err(phone, badPhone);
      if (badName || badPhone) { (badName ? name : phone).focus(); return; }

      const data = {
        service: $("#f-service").value, master: $("#f-master").value,
        date: date.value.split("-").reverse().join("."), time: time || "—",
        name: name.value.trim(), phone: phone.value, agree: $('[name="agree"]', form).checked
      };
      const text = `Здравствуйте! Хочу записаться.\nУслуга: ${data.service}\nМастер: ${data.master}\nДата: ${data.date}, ${data.time}\nИмя: ${data.name}\nТелефон: ${data.phone}`;
      const b = C.booking || {};
      const okText = $("#successModal .ok-text");
      let link = "";

      form.classList.add("is-sending");
      try {
        if (b.mode === "endpoint" && b.endpoint) {
          await fetch(b.endpoint, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(data) });
        } else if (b.mode === "whatsapp" && b.whatsapp) {
          link = `https://wa.me/${b.whatsapp}?text=${encodeURIComponent(text)}`;
        } else if (b.mode === "telegram" && b.telegram) {
          link = `https://t.me/${b.telegram}?text=${encodeURIComponent(text)}`;
        }
      } catch (ex) { /* сеть недоступна — всё равно показываем подтверждение */ }
      form.classList.remove("is-sending");

      okText.innerHTML = `${esc(data.name)}, ждём вас ${esc(data.date)} в ${esc(data.time)}.<br>Администратор перезвонит на ${esc(data.phone)} для подтверждения.` +
        (link ? `<br><br><a href="${esc(link)}" target="_blank" rel="noopener">Отправить заявку в мессенджер →</a>` : "");
      if (link) { try { window.open(link, "_blank", "noopener"); } catch (ex) { /* откроется по ссылке */ } }
      openModal($("#successModal"));
      name.value = ""; phone.value = "";
    });
  }

  /* ---------- 20. Cookie ---------- */
  function cookies() {
    const KEY = "cookie_consent_v1";
    const bar = $(".cookie"), modal = $("#cookieModal");
    const saved = (() => { try { return JSON.parse(store.get(KEY)); } catch (e) { return null; } })();

    const save = (prefs) => {
      store.set(KEY, JSON.stringify({ ...prefs, necessary: true, date: new Date().toISOString() }));
      hideBar();
      if (!modal.hidden) closeModal(modal);
      // Здесь подключайте счётчики, если пользователь разрешил:
      // if (prefs.analytics) { /* код Яндекс Метрики */ }
    };
    const showBar = () => { bar.hidden = false; requestAnimationFrame(() => requestAnimationFrame(() => bar.classList.add("is-on"))); };
    const hideBar = () => { bar.classList.remove("is-on"); setTimeout(() => { bar.hidden = true; }, 600); };
    const openSettings = () => {
      const cur = (() => { try { return JSON.parse(store.get(KEY)) || {}; } catch (e) { return {}; } })();
      $$("[data-cookie-type]", modal).forEach((i) => { i.checked = !!cur[i.dataset.cookieType]; });
      openModal(modal);
    };

    $$('[data-cookie="accept"]').forEach((b) => b.addEventListener("click", () => save({ analytics: true, marketing: true })));
    $$('[data-cookie="settings"]').forEach((b) => b.addEventListener("click", openSettings));
    $$('[data-cookie="save"]').forEach((b) => b.addEventListener("click", () => {
      const p = {}; $$("[data-cookie-type]", modal).forEach((i) => { p[i.dataset.cookieType] = i.checked; }); save(p);
    }));
    $$("[data-open-cookies]").forEach((b) => b.addEventListener("click", openSettings));

    if (!saved) setTimeout(showBar, reduced ? 0 : 2600);
  }

  /* ---------- Запуск ---------- */
  document.addEventListener("DOMContentLoaded", () => {
    applyTheme();
    bindFields();
    renderAll();
    intro();
    rotator();
    header();
    mobileMenu();
    wordsOnScroll();
    reveals();
    parallax();
    magnetic();
    services();
    compare();
    ritual();
    reviews();
    gift();
    faq();
    modals();
    booking();
    cookies();
  });
})();

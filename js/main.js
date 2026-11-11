/* Beauty Code · демо-сайт */
(() => {
  const BOOK = 'http://n1015529.yclients.ru';   // онлайн-запись салона из карточки 2ГИС
  const WA = '79117193080';
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];

  /* ---------- загрузочный экран «Журнал»: слоган, работы мастеров, счётчик; ждёт загрузку, но не меньше 2,4 с ---------- */
  const bootEl = document.getElementById('boot');
  const booting = !!bootEl && !document.documentElement.classList.contains('boot-skip');
  const bootDone = new Promise(resolve => {
    if (!booting) { bootEl && bootEl.remove(); return resolve(); }
    const num = document.getElementById('bootNum');
    const shots = [...bootEl.querySelectorAll('.boot__win img')];
    const MIN = reduce ? 600 : 2400, MAX = 6000, t0 = performance.now();
    let loaded = document.readyState === 'complete', shown = 0;
    addEventListener('load', () => { loaded = true; });
    // слоган набран шрифтом салона: ждём его, чтобы не мигнул запасной
    Promise.race([document.fonts ? document.fonts.load('40px "Vetrino"') : null, new Promise(r => setTimeout(r, 700))])
      .then(() => requestAnimationFrame(() => bootEl.classList.add('is-go')));
    (function step(now) {
      const el = now - t0;
      const target = Math.min(el / MIN, (loaded || el > MAX) ? 1 : 0.86);
      shown += (target - shown) * 0.08;
      if (target === 1 && shown > 0.995) shown = 1;
      num.textContent = Math.round(shown * 100);
      // работы сменяются по ходу загрузки, последней встаёт фото с главного экрана
      const k = Math.min(shots.length - 1, Math.floor(shown * shots.length * 1.04));
      shots.forEach((im, i) => im.classList.toggle('is-on', i <= k));
      if (shown < 1) return requestAnimationFrame(step);
      setTimeout(() => {
        bootEl.classList.add('is-out');
        try { sessionStorage.setItem('bc-boot', '1'); } catch (e) {}
        setTimeout(() => { document.documentElement.classList.remove('boot-on'); resolve(); }, 450);
        setTimeout(() => bootEl.remove(), 1300);
      }, 250);
    })(t0);
  });

  // Все кнопки записи ведут в YCLIENTS
  $$('[data-book]').forEach(a => { a.href = BOOK; a.target = '_blank'; a.rel = 'noopener'; });

  /* ---------- плавный скролл ---------- */
  let lenis = null;
  if (!reduce && window.Lenis) {
    lenis = new Lenis({ duration: 1.15, easing: t => Math.min(1, 1.001 - Math.pow(2, -10 * t)) });
    window.lenis = lenis;
    if (booting) { lenis.stop(); bootDone.then(() => lenis.start()); }
  }
  const scrollY = () => (lenis ? lenis.scroll : window.scrollY);
  const goTo = (target) => {
    const el = typeof target === 'string' ? $(target) : target;
    if (!el) return;
    if (lenis) lenis.scrollTo(el, { offset: el.id === 'top' ? 0 : -76, duration: 1.4 });
    else el.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth' });
  };
  $$('a[href^="#"]').forEach(a => a.addEventListener('click', e => {
    const id = a.getAttribute('href');
    if (id.length < 2 || a.hasAttribute('data-sheet')) return;
    e.preventDefault();
    if (a.dataset.filter) { const fb = $(`#filters [data-f="${a.dataset.filter}"]`); fb && fb.click(); }
    closeMenu();
    goTo(id);
  }));

  /* ---------- разбивка на слова (подъём из маски) ---------- */
  $$('[data-split]').forEach(el => {
    const words = el.textContent.trim().split(/[ \t\n]+/);  // неразрывный пробел не режем: «с домом» остаётся вместе
    el.innerHTML = words.map((w, i) => `<span class="w"><span style="transition-delay:${i * 60}ms">${w}</span></span>`).join(' ');
  });

  /* ---------- появление по скроллу ---------- */
  const io = new IntersectionObserver((entries) => {
    let n = 0;
    entries.forEach(en => {
      if (!en.isIntersecting) return;
      const el = en.target;
      if (el.hasAttribute('data-reveal')) el.style.transitionDelay = `${(n++) * 90}ms`;
      el.classList.add('is-in');
      io.unobserve(el);
    });
  }, { rootMargin: '0px 0px -8% 0px', threshold: 0.12 });
  $$('[data-split], [data-reveal], .img-reveal, [data-vis], .dip__pair .px').forEach(el => io.observe(el));

  /* ---------- абзац по строкам (verostudio: строки выезжают снизу) ---------- */
  const lineEls = $$('[data-lines]').map(el => ({ el, html: el.innerHTML }));
  function buildLines() {
    lineEls.forEach(({ el, html }) => {
      el.innerHTML = html.split(/<br\s*\/?>/i)
        .map(part => part.trim().split(/\s+/).filter(Boolean).map(w => `<span class="wt">${w}</span>`).join(' '))
        .join('<br>');
      const lines = [];
      let top = null;
      $$('.wt', el).forEach(w => {
        if (top === null || Math.abs(w.offsetTop - top) > 3) { lines.push([]); top = w.offsetTop; }
        lines[lines.length - 1].push(w.innerHTML);
      });
      el.innerHTML = lines.map((l, i) => `<span class="ln"><span style="--s:${i}">${l.join(' ')}</span></span>`).join('');
    });
  }
  (document.fonts ? document.fonts.ready : Promise.resolve()).then(buildLines);
  let resizeT, lastW = innerWidth;
  addEventListener('resize', () => {
    clearTimeout(resizeT);
    resizeT = setTimeout(() => { if (innerWidth !== lastW) { lastW = innerWidth; buildLines(); } }, 200);
  });

  /* ---------- текст, который «заливается» по скроллу ---------- */
  const fill = $('[data-fill]');
  let fillWords = [];
  if (fill) {
    const walk = (node) => {
      [...node.childNodes].forEach(ch => {
        if (ch.nodeType === 3) {
          const parts = ch.textContent.split(/(\s+)/);
          const frag = document.createDocumentFragment();
          parts.forEach(p => {
            if (!p) return;
            if (/^\s+$/.test(p)) frag.appendChild(document.createTextNode(p));
            else { const s = document.createElement('span'); s.className = 'fw'; s.textContent = p; frag.appendChild(s); }
          });
          ch.replaceWith(frag);
        } else if (ch.classList && ch.classList.contains('chip-img')) {
          ch.classList.add('fw');
        }
      });
    };
    walk(fill);
    fillWords = $$('.fw', fill);
  }

  /* ---------- шапка, параллакс, раскрытие кадра ---------- */
  const header = $('#header');
  const hero = $('.hero');
  const heroImg = $('.hero__media img');
  const mbar = $('#mbar');
  const salon = $('#salonFrame');
  const pxEls = $$('.px');
  const smm = $('#smm');
  const salonImg = salon && $('img', salon);
  let lastY = 0;

  const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));
  function onFrame() {
    const y = scrollY();
    const vh = innerHeight;
    const heroH = hero.offsetHeight;

    // шапка: светлые плашки после первого экрана, логотип прячется при скролле вниз
    header.classList.toggle('is-light', y > heroH - 80);
    header.classList.toggle('is-hidden', y > heroH && y > lastY + 2);
    if (y < lastY - 2) header.classList.remove('is-hidden');
    mbar && mbar.classList.toggle('is-on', y > heroH * 0.6 && y < document.body.scrollHeight - vh * 2.2);
    lastY = y;

    // параллакс фото на первом экране
    if (heroImg && y < heroH) heroImg.style.translate = `0 ${y * 0.25}px`;

    // заливка текста «О салоне»
    if (fillWords.length) {
      const r = fill.getBoundingClientRect();
      const p = clamp((vh * 0.85 - r.top) / (r.height + vh * 0.35));
      const lit = Math.round(p * fillWords.length);
      fillWords.forEach((w, i) => w.classList.toggle('on', i < lit));
    }

    // параллакс внутри масок (verostudio: диапазон 80px, масштаб 1 + диапазон / высота)
    pxEls.forEach(px => {
      const r = px.getBoundingClientRect();
      if (r.bottom < -100 || r.top > vh + 100) return;
      const p = clamp((vh - r.top) / (vh + r.height));
      const range = 80;
      px.firstElementChild.style.transform = `translate3d(0, ${(range / 2) * (p * 2 - 1)}px, 0) scale(${1 + range / r.height})`;
    });
    // маленькое фото раскрывается из рамки по мере прокрутки
    if (smm) {
      const r = smm.getBoundingClientRect();
      const mp = clamp((vh - r.top) / (vh + r.height));
      const k = clamp(mp / 0.4, 0.1, 1);
      smm.style.clipPath = `polygon(${25 - 25 * k}% ${10 - 10 * k}%, ${85 + 15 * k}% ${10 - 10 * k}%, ${85 + 15 * k}% ${90 + 10 * k}%, ${25 - 25 * k}% ${90 + 10 * k}%)`;
    }

    // кадр салона раскрывается до краёв
    if (salon) {
      const r = salon.getBoundingClientRect();
      const p = clamp((vh - r.top) / (vh * 0.9));
      const ix = 5 * (1 - p), iy = 6 * (1 - p);
      salon.style.clipPath = `inset(${iy}% ${ix}% ${iy}% ${ix}% round 6px)`;
      salonImg.style.transform = `scale(${1.15 - 0.15 * p})`;
    }
  }

  function raf(t) {
    lenis && lenis.raf(t);
    onFrame();
    requestAnimationFrame(raf);
  }
  requestAnimationFrame(raf);

  window.addEventListener('load', () => document.documentElement.classList.add('is-loaded'));
  setTimeout(() => document.documentElement.classList.add('is-loaded'), 1200);
  // первый экран: заголовок поднимается сразу
  bootDone.then(() => requestAnimationFrame(() => $$('.hero [data-split], .hero [data-reveal]').forEach(el => el.classList.add('is-in'))));

  /* ---------- первый экран «Сторис» ---------- */
  const hsTabs = $$('#hsTabs button');
  if (hsTabs.length) {
    const bgs = $$('#hsBgs img');
    const pronBox = $('#hsPron'), wordBox = $('#hsWord');
    const DUR = 4800;
    const chars = (t) => [...t].map((c, i) => `<span class="c" style="transition-delay:${i * 35}ms">${c}</span>`).join('');
    // первые слова тоже разбиваем на буквы
    [pronBox, wordBox].forEach(b => { const w = b.firstElementChild; w.classList.remove('is-on'); w.innerHTML = chars(w.textContent); });
    const swapWord = (box, text) => {
      const cur = box.querySelector('.hs__w:not(.is-out)');
      if (cur && cur.textContent === text) { requestAnimationFrame(() => requestAnimationFrame(() => cur.classList.add('is-on'))); return; }
      if (cur) { cur.classList.remove('is-on'); cur.classList.add('is-out'); setTimeout(() => cur.remove(), 900); }
      const w = document.createElement('span');
      w.className = 'hs__w';
      w.innerHTML = chars(text);
      box.appendChild(w);
      requestAnimationFrame(() => requestAnimationFrame(() => w.classList.add('is-on')));
    };
    let idx = 0, t0 = performance.now(), paused = false;
    const go = (i) => {
      const prev = bgs[idx];
      idx = (i + hsTabs.length) % hsTabs.length;
      bgs.forEach(im => im.classList.remove('is-prev'));
      if (prev !== bgs[idx]) { prev.classList.remove('is-on'); prev.classList.add('is-prev'); setTimeout(() => prev.classList.remove('is-prev'), 1400); }
      bgs[idx].classList.add('is-on');
      hsTabs.forEach((b, k) => { b.classList.toggle('is-on', k === idx); b.setAttribute('aria-selected', k === idx); b.style.setProperty('--p', k < idx ? 1 : 0); });
      swapWord(pronBox, hsTabs[idx].dataset.pron);
      swapWord(wordBox, hsTabs[idx].dataset.word);
      t0 = performance.now();
    };
    hsTabs.forEach((b, k) => b.addEventListener('click', () => go(k)));
    // пауза, когда первый экран ушёл из вида или вкладка свернута
    new IntersectionObserver(es => { paused = !es[0].isIntersecting; if (!paused) t0 = performance.now() - (parseFloat(hsTabs[idx].style.getPropertyValue('--p')) || 0) * DUR; }).observe($('#hero'));
    bootDone.then(() => { go(0); t0 = performance.now(); });
    (function tick(now) {
      if (!paused && !document.hidden && !reduce) {
        const p = Math.min(1, (now - t0) / DUR);
        hsTabs[idx].style.setProperty('--p', p);
        if (p >= 1) go(idx + 1);
      }
      requestAnimationFrame(tick);
    })(performance.now());
  }

  /* ---------- меню ---------- */
  const menu = $('#menu');
  const menuPhoto = $('#menuPhoto');
  const openBtn = $('#menuOpen');
  const links = $$('.menu__link');
  // задержки появления: только на время открытия (см. .is-ready в CSS)
  $$('.menu__list li').forEach((li, i) => li.style.setProperty('--d', `${260 + i * 55}ms`));
  $$('.menu__sub li').forEach((li, i) => li.style.setProperty('--d', `${640 + i * 40}ms`));
  links.forEach(a => {
    a.innerHTML = [...a.textContent].map((c, j) => c === ' ' ? ' ' : `<span class="ch" style="transition-delay:${j * 14}ms">${c}</span>`).join('');
    a.addEventListener('mouseenter', () => swapPhoto(a.dataset.photo));
    a.addEventListener('focus', () => swapPhoto(a.dataset.photo));
  });
  // все фото меню создаются один раз и уже декодированы: при наведении ничего не грузится
  menuPhoto.innerHTML = '';
  const photoPool = {};
  links.forEach(a => {
    const src = a.dataset.photo;
    if (!src || photoPool[src]) return;
    const im = new Image(); im.src = src; im.alt = ''; im.decoding = 'async';
    im.decode && im.decode().catch(() => {});
    menuPhoto.appendChild(im); photoPool[src] = im;
  });
  let curPhoto = null;
  function swapPhoto(src) {
    const next = photoPool[src];
    if (!next || next === curPhoto) return;
    Object.values(photoPool).forEach(im => { if (im !== curPhoto && im !== next) im.classList.remove('is-top', 'is-under'); });
    if (curPhoto) { curPhoto.classList.remove('is-top'); curPhoto.classList.add('is-under'); curPhoto.style.zIndex = 1; }
    next.classList.remove('is-under', 'is-top');
    void next.offsetWidth; // перезапуск анимации появления
    next.style.zIndex = 2;
    next.classList.add('is-top');
    curPhoto = next;
  }
  swapPhoto(links[0] && links[0].dataset.photo);

  let readyT = 0;
  function openMenu() {
    clearTimeout(readyT);
    menu.classList.add('is-open');
    menu.setAttribute('aria-hidden', 'false');
    openBtn.setAttribute('aria-expanded', 'true');
    readyT = setTimeout(() => menu.classList.add('is-ready'), 1150);
    lenis && lenis.stop();
  }
  function closeMenu() {
    if (!menu.classList.contains('is-open')) return;
    clearTimeout(readyT);
    menu.classList.remove('is-open', 'is-ready');
    menu.setAttribute('aria-hidden', 'true');
    openBtn.setAttribute('aria-expanded', 'false');
    lenis && lenis.start();
  }
  openBtn.addEventListener('click', openMenu);
  $('#menuClose').addEventListener('click', closeMenu);

  /* ---------- серебряная 3D-монета с логотипом ----------
     Крутится от прокрутки: угол и положение по высоте зависят от того,
     насколько блок прокручен. Монета едет вдоль строк, ближайшая строка подсвечивается. */
  const coinWrap = $('#coin');
  const coinBody = $('#coinBody');
  const nums = $('#nums');
  if (coinWrap) {
    // рельеф: тень снизу-справа, блик сверху-слева, сам рисунок посередине
    const art = (id) => `
      <defs>
        <path id="ta${id}" d="M 35,100 A 65,65 0 0 1 165,100"/>
        <path id="tb${id}" d="M 22,100 A 78,78 0 0 0 178,100"/>
      </defs>
      <circle cx="100" cy="100" r="85" fill="none" stroke-width="1"/>
      <circle cx="100" cy="100" r="53" fill="none" stroke-width="1.4"/>
      <text font-size="14" letter-spacing="2.8"><textPath href="#ta${id}" startOffset="50%" text-anchor="middle">ПРОСТРАНСТВО</textPath></text>
      <text font-size="14" letter-spacing="2.8"><textPath href="#tb${id}" startOffset="50%" text-anchor="middle">КРАСОТЫ</textPath></text>
      <text x="100" y="121" font-size="58" text-anchor="middle" letter-spacing="-15">BC</text>
      <circle cx="31" cy="100" r="2.3" stroke="none"/><circle cx="169" cy="100" r="2.3" stroke="none"/>`;
    const face = (id) => `
      <i class="coin__field"></i><i class="coin__rim"></i>
      <svg viewBox="0 0 200 200" aria-hidden="true">
        <g class="rel-sh" transform="translate(1.1 1.3)">${art(id + 's')}</g>
        <g class="rel-hi" transform="translate(-.7 -.8)">${art(id + 'h')}</g>
        <g class="rel">${art(id)}</g>
      </svg><i class="coin__sheen"></i>`;
    $('.coin__front', coinBody).innerHTML = face('f');
    $('.coin__back', coinBody).innerHTML = face('b');
    // ребро: стопка дисков с рифлением
    const edge = $('.coin__edge', coinBody);
    const LAYERS = 16;
    for (let i = 0; i < LAYERS; i++) {
      const d = document.createElement('i');
      d.style.transform = `translateZ(${i - (LAYERS - 1) / 2}px)`;
      edge.appendChild(d);
    }

    const rows = $$('.nrow', nums);
    let angle = 0, y = null, tilt = 0;
    (function spin() {
      const r = nums.getBoundingClientRect();
      const vh = innerHeight;
      // 0, когда блок только появляется снизу; 1, когда уходит вверх
      const p = clamp((vh - r.top) / (vh + r.height));
      // целевой угол: два с половиной оборота за проход блока
      const targetAngle = -30 + p * 900;
      angle += (targetAngle - angle) * 0.12;
      // по высоте монета едет от первой строки к последней
      const first = rows[0], lastRow = rows[rows.length - 1];
      const y0 = first.offsetTop + first.offsetHeight / 2;
      const y1 = lastRow.offsetTop + lastRow.offsetHeight / 2;
      const k = clamp((p - 0.18) / 0.62);
      const targetY = y0 + (y1 - y0) * k;
      y = y === null ? targetY : y + (targetY - y) * 0.12;
      coinWrap.style.top = `${y}px`;
      // лёгкий наклон зависит от скорости вращения
      tilt += (((targetAngle - angle) * 0.15) - tilt) * 0.1;
      coinBody.style.transform = `rotateX(${clamp(tilt, -18, 18)}deg) rotateY(${angle}deg)`;
      if (window.BCcoin) window.BCcoin.set(angle, clamp(tilt, -18, 18));
      coinBody.style.setProperty('--sheen', `${((angle % 360) + 360) % 360}deg`);
      // подсвечиваем строку, рядом с которой монета
      let best = null, bd = Infinity;
      rows.forEach(row => { const d = Math.abs(row.offsetTop + row.offsetHeight / 2 - y); if (d < bd) { bd = d; best = row; } });
      rows.forEach(row => row.classList.toggle('is-on', row === best));
      requestAnimationFrame(spin);
    })();
  }

  // цифры досчитываются при появлении
  if (nums) {
    const cio = new IntersectionObserver(es => es.forEach(en => {
      if (!en.isIntersecting) return;
      cio.disconnect();
      $$('[data-count]', nums).forEach(el => {
        const to = parseFloat(el.dataset.count); const dec = (el.dataset.count.split('.')[1] || '').length;
        const t0 = performance.now(), dur = 1500;
        (function tick(t) {
          const p = Math.min(1, (t - t0) / dur); const e = 1 - Math.pow(1 - p, 4);
          el.textContent = (to * e).toFixed(dec);
          if (p < 1) requestAnimationFrame(tick);
        })(t0);
      });
    }), { threshold: 0.3 });
    cio.observe(nums);
  }

  /* ---------- мастера: список имён + арка с портретом ---------- */
  const mrows = $$('#crewList .mrow');
  if (mrows.length) {
    const slides = $$('#arch .arch__slide');
    const setMaster = (i) => {
      mrows.forEach((r, k) => { r.classList.toggle('is-on', k === i); $('.mrow__head', r).setAttribute('aria-expanded', k === i); });
      slides.forEach((s, k) => s.classList.toggle('is-on', k === i));
      const row = mrows[i];
      $('#archName').textContent = $('.mrow__name', row).textContent;
      $('#archRole').textContent = $('.mrow__role', row).textContent;
      $('#archNum').textContent = String(i + 1).padStart(2, '0');
      setTimeout(() => lenis && lenis.resize(), 750);
    };
    mrows.forEach((r, i) => {
      $('.mrow__head', r).addEventListener('click', () => setMaster(i));
      r.addEventListener('mouseenter', () => { if (matchMedia('(hover: hover) and (min-width: 901px)').matches) setMaster(i); });
    });
  }

  /* ---------- магнолия на плашке: раскрывается, когда плашка появляется в кадре ---------- */
  const blooms = $$('.bloom');
  if (blooms.length) {
    const ua = navigator.userAgent;
    const isSafari = /^((?!chrome|android|crios|fxios|edg).)*safari/i.test(ua);
    // прозрачный WebM (VP9) понимают Chrome, Edge, Firefox; Safari получает анимированный WebP с прозрачностью
    const webmOk = !isSafari && document.createElement('video').canPlayType('video/webm; codecs="vp9"') !== '';
    let media = [];
    if (reduce) {
      blooms.forEach(b => b.classList.add('is-static'));
    } else if (webmOk) {
      media = blooms.map(b => {
        const v = document.createElement('video');
        v.muted = true; v.defaultMuted = true; v.playsInline = true; v.preload = 'auto';
        v.setAttribute('muted', ''); v.setAttribute('playsinline', '');
        v.src = 'img/magnolia.webm?v=2';
        b.appendChild(v);
        return v;
      });
      // передний слой всегда идёт кадр в кадр с задним
      (function sync() {
        const [a, b] = media;
        if (a && b && !a.paused && Math.abs(a.currentTime - b.currentTime) > 0.08) b.currentTime = a.currentTime;
        requestAnimationFrame(sync);
      })();
    } else {
      media = blooms.map(b => { const i = new Image(); i.alt = ''; i.src = 'img/magnolia-bud.webp?v=2'; b.appendChild(i); return i; });
    }
    const startBloom = () => {
      if (webmOk) media.forEach(v => { v.currentTime = 0; v.play().catch(() => blooms.forEach(b => b.classList.add('is-static'))); });
      else media.forEach(i => { i.src = 'img/magnolia.webp?v=2'; });
    };
    if (media.length) {
      new IntersectionObserver((es, o) => { if (es[0].isIntersecting) { startBloom(); o.disconnect(); } }, { threshold: 0.3 }).observe($('.promo__card'));
    }
  }

  /* ---------- свои выпадающие списки вместо системных ---------- */
  $$('.sheet select').forEach(sel => {
    const wrap = document.createElement('div'); wrap.className = 'dd';
    sel.parentNode.insertBefore(wrap, sel); wrap.appendChild(sel);
    sel.tabIndex = -1;
    const btn = document.createElement('button');
    btn.type = 'button'; btn.className = 'dd__btn';
    btn.setAttribute('aria-haspopup', 'listbox'); btn.setAttribute('aria-expanded', 'false');
    const lab = document.querySelector(`label[for="${sel.id}"]`);
    if (lab) { btn.id = sel.id + '-btn'; lab.setAttribute('for', btn.id); }
    btn.innerHTML = `<span>${sel.options[sel.selectedIndex].text}</span><i aria-hidden="true"></i>`;
    const list = document.createElement('ul'); list.className = 'dd__list'; list.setAttribute('role', 'listbox'); list.dataset.lenisPrevent = '';
    [...sel.options].forEach((o, i) => {
      const li = document.createElement('li'); li.className = 'dd__opt'; li.setAttribute('role', 'option');
      li.textContent = o.text; li.dataset.i = i; li.setAttribute('aria-selected', i === sel.selectedIndex);
      list.appendChild(li);
    });
    wrap.append(btn, list);
    const opts = [...list.children];
    let focus = sel.selectedIndex;
    const setFocus = (i, scroll) => {
      focus = (i + opts.length) % opts.length;
      opts.forEach((o, k) => o.classList.toggle('is-focus', k === focus));
      if (scroll) { const o = opts[focus]; if (o.offsetTop < list.scrollTop) list.scrollTop = o.offsetTop - 6; else if (o.offsetTop + o.offsetHeight > list.scrollTop + list.clientHeight) list.scrollTop = o.offsetTop + o.offsetHeight - list.clientHeight + 6; }
    };
    const open = () => { wrap.classList.add('is-open'); btn.setAttribute('aria-expanded', 'true'); list.scrollTop = 0; setFocus(sel.selectedIndex, true); };
    const close = () => { wrap.classList.remove('is-open'); btn.setAttribute('aria-expanded', 'false'); };
    const choose = (i) => {
      sel.selectedIndex = i; sel.dispatchEvent(new Event('change', { bubbles: true }));
      btn.firstElementChild.textContent = sel.options[i].text;
      opts.forEach((o, k) => o.setAttribute('aria-selected', k === i));
      close(); btn.focus();
    };
    btn.addEventListener('click', () => (wrap.classList.contains('is-open') ? close() : open()));
    opts.forEach((o, i) => { o.addEventListener('click', () => choose(i)); o.addEventListener('mouseenter', () => setFocus(i)); });
    btn.addEventListener('keydown', e => {
      const isOpen = wrap.classList.contains('is-open');
      if (e.key === 'ArrowDown') { e.preventDefault(); isOpen ? setFocus(focus + 1, true) : open(); }
      else if (e.key === 'ArrowUp') { e.preventDefault(); isOpen ? setFocus(focus - 1, true) : open(); }
      else if ((e.key === 'Enter' || e.key === ' ') && isOpen) { e.preventDefault(); choose(focus); }
      else if (e.key === 'Escape' && isOpen) { e.preventDefault(); e.stopPropagation(); close(); }
    });
    document.addEventListener('click', e => { if (!wrap.contains(e.target)) close(); });
  });

  /* ---------- окно «Весь прайс» ---------- */
  const pl = $('#pl');
  if (pl) {
    const openPl = (cat) => {
      $$('.pl__grp', pl).forEach(g => { g.open = cat ? g.dataset.cat === cat : false; });
      pl.classList.add('is-open'); pl.setAttribute('aria-hidden', 'false');
      lenis && lenis.stop();
      const target = cat && $(`.pl__grp[data-cat="${cat}"]`, pl);
      const list = $('.pl__list', pl);
      requestAnimationFrame(() => { list.scrollTop = target ? target.getBoundingClientRect().top - list.getBoundingClientRect().top + list.scrollTop - 4 : 0; });
    };
    const closePl = () => { pl.classList.remove('is-open'); pl.setAttribute('aria-hidden', 'true'); lenis && lenis.start(); };
    $$('[data-price]').forEach(b => b.addEventListener('click', () => openPl(b.dataset.price)));
    $$('[data-pl-close]', pl).forEach(b => b.addEventListener('click', closePl));
    document.addEventListener('keydown', e => { if (e.key === 'Escape' && pl.classList.contains('is-open')) closePl(); });
  }

  /* ---------- мастера: «+» раскрывает рассказ о мастере ---------- */
  $$('.tm').forEach(card => {
    const btn = $('.tm__more', card), info = $('.tm__info', card);
    btn.addEventListener('click', () => {
      const open = !card.classList.contains('is-open');
      card.classList.toggle('is-open', open);
      btn.setAttribute('aria-expanded', open);
      info.setAttribute('aria-hidden', !open);
    });
  });

  /* ---------- отзывы: вкладки авторов, автопереключение с полоской прогресса ---------- */
  const vcTabs = $$('#vcTabs .vc__tab');
  if (vcTabs.length) {
    const vcSlides = $$('#vcStage .vc__slide');
    const VDUR = 7000;
    let vi = 0, vt0 = performance.now(), vpause = false, vvisible = false;
    const vgo = (i) => {
      vi = (i + vcTabs.length) % vcTabs.length;
      vcTabs.forEach((t, k) => { t.classList.toggle('is-on', k === vi); t.style.setProperty('--p', 0); });
      vcSlides.forEach((s, k) => s.classList.toggle('is-on', k === vi));
      vt0 = performance.now();
    };
    vcTabs.forEach((t, k) => t.addEventListener('click', () => vgo(k)));
    const card = $('.vc__card');
    card.addEventListener('mouseenter', () => { vpause = true; });
    card.addEventListener('mouseleave', () => { vpause = false; vt0 = performance.now() - (parseFloat(vcTabs[vi].style.getPropertyValue('--p')) || 0) * VDUR; });
    new IntersectionObserver(es => { vvisible = es[0].isIntersecting; }).observe(card);
    (function vtick(now) {
      if (vvisible && !vpause && !reduce && !document.hidden) {
        const p = Math.min(1, (now - vt0) / VDUR);
        vcTabs[vi].style.setProperty('--p', p);
        if (p >= 1) vgo(vi + 1);
      } else if (!vvisible || document.hidden) { vt0 = now - (parseFloat(vcTabs[vi].style.getPropertyValue('--p')) || 0) * VDUR; }
      requestAnimationFrame(vtick);
    })(performance.now());
  }

  /* ---------- карточки направлений с ценами ---------- */
  const track = $('#track');
  $$('[data-scroll]').forEach(b => b.addEventListener('click', () => {
    const card = $('.dcard', track);
    track.scrollBy({ left: (card.offsetWidth) * +b.dataset.scroll, behavior: 'smooth' });
  }));

  /* ---------- работы: фильтр и просмотр ---------- */
  const figs = $$('#gallery figure');
  $$('#filters button').forEach(b => b.addEventListener('click', () => {
    $$('#filters button').forEach(x => x.classList.toggle('is-on', x === b));
    figs.forEach(f => f.classList.toggle('is-hidden', b.dataset.f !== 'all' && f.dataset.c !== b.dataset.f));
    lenis && lenis.resize();
  }));
  const lb = $('#lightbox');
  figs.forEach(f => f.addEventListener('click', () => {
    $('img', lb).src = $('img', f).src;
    $('img', lb).alt = $('img', f).alt;
    lb.classList.add('is-open'); lb.setAttribute('aria-hidden', 'false');
    lenis && lenis.stop();
  }));
  lb.addEventListener('click', () => { lb.classList.remove('is-open'); lb.setAttribute('aria-hidden', 'true'); lenis && lenis.start(); });

  /* ---------- форма вопроса ---------- */
  const sheet = $('#sheet');
  function openSheet(e) { e && e.preventDefault(); closeMenu(); sheet.classList.add('is-open'); sheet.setAttribute('aria-hidden', 'false'); lenis && lenis.stop(); setTimeout(() => $('#f-name').focus({ preventScroll: true }), 500); }
  function closeSheet() { sheet.classList.remove('is-open'); sheet.setAttribute('aria-hidden', 'true'); lenis && lenis.start(); }
  $$('[data-sheet]').forEach(b => b.addEventListener('click', openSheet));
  $$('[data-sheet-close]').forEach(b => b.addEventListener('click', closeSheet));

  $('#ask').addEventListener('submit', e => {
    e.preventDefault();
    const f = e.target;
    let ok = true;
    ['name', 'phone'].forEach(n => {
      const inp = f.elements[n];
      const bad = n === 'phone' ? inp.value.replace(/\D/g, '').length < 10 : !inp.value.trim();
      inp.closest('.field').classList.toggle('is-err', bad);
      if (bad) ok = false;
    });
    const agree = f.elements.agree;
    agree.closest('.agree').classList.toggle('is-err', !agree.checked);
    if (!agree.checked) ok = false;
    if (!ok) return;
    const text = [
      'Здравствуйте! Вопрос с сайта Beauty Code.',
      `Имя: ${f.elements.name.value.trim()}`,
      `Телефон: ${f.elements.phone.value.trim()}`,
      f.elements.svc.value && `Услуга: ${f.elements.svc.value}`,
      f.elements.msg.value.trim() && `Вопрос: ${f.elements.msg.value.trim()}`
    ].filter(Boolean).join('\n');
    $('#askOk').classList.add('is-on');
    window.open(`https://wa.me/${WA}?text=${encodeURIComponent(text)}`, '_blank', 'noopener');
  });

  $('#f-agree') && $('#f-agree').addEventListener('change', e => e.target.closest('.agree').classList.remove('is-err'));

  /* ---------- cookie и карта: сторонний сервис только после согласия ---------- */
  const CK = 'bc-cookie';
  const ckGet = () => { try { return localStorage.getItem(CK); } catch (e) { return null; } };
  const ckSet = v => { try { localStorage.setItem(CK, v); } catch (e) {} };
  const ck = $('#ck');
  const gate = $('.map__gate');
  const loadMap = () => {
    if (!gate || gate.parentNode.classList.contains('is-live')) return;
    const fr = document.createElement('iframe');
    fr.src = gate.dataset.mapSrc; fr.title = 'Beauty Code на Яндекс Картах'; fr.loading = 'lazy'; fr.allowFullscreen = true;
    gate.parentNode.insertBefore(fr, gate);
    gate.parentNode.classList.add('is-live');
  };
  const showCk = () => { ck.classList.add('is-on'); ck.setAttribute('aria-hidden', 'false'); };
  const hideCk = () => { ck.classList.remove('is-on'); ck.setAttribute('aria-hidden', 'true'); };
  if (ck) {
    const saved = ckGet();
    if (saved === 'all') loadMap();
    else if (!saved) setTimeout(showCk, 1400);
    $$('[data-ck]', ck).forEach(b => b.addEventListener('click', () => { ckSet(b.dataset.ck); hideCk(); if (b.dataset.ck === 'all') loadMap(); }));
    $$('[data-cookie-open]').forEach(b => b.addEventListener('click', showCk));
  }
  $$('[data-map-load]').forEach(b => b.addEventListener('click', loadMap));

  document.addEventListener('keydown', e => {
    if (e.key !== 'Escape') return;
    closeMenu(); closeSheet();
    if (lb.classList.contains('is-open')) lb.click();
  });
})();

/* =========================================================
   DC Broker — interazioni
   ========================================================= */
(function () {
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const finePointer = window.matchMedia('(hover: hover) and (pointer: fine)').matches;
  const hasGsap = typeof window.gsap !== 'undefined';

  document.getElementById('year').textContent = new Date().getFullYear();

  /* ---------- Ogni pagina si apre dall'inizio ---------- */
  // il browser tende a riaprire la pagina alla posizione di scroll precedente: lo disattiviamo
  if ('scrollRestoration' in history) history.scrollRestoration = 'manual';
  const toTop = () => window.scrollTo(0, 0);
  // eccezione: i link con ancora (#contatti) devono scendere alla sezione
  const goesToForm = () => !!location.hash || /[?&](area|prodotto)=/.test(location.search);
  if (!goesToForm()) {
    toTop();
    window.addEventListener('load', toTop);
  }

  /* ---------- Scroll fluido (Lenis) ---------- */
  let lenis = null;
  if (!reduceMotion && typeof window.Lenis !== 'undefined') {
    lenis = new Lenis({ duration: 1.15, easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)) });
    if (!goesToForm()) lenis.scrollTo(0, { immediate: true, force: true });
  }
  // anche tornando indietro/avanti col browser (pagina ripresa dalla cache) si riparte dall'alto
  window.addEventListener('pageshow', (e) => {
    if (!e.persisted || goesToForm()) return;
    if (lenis) lenis.scrollTo(0, { immediate: true, force: true });
    toTop();
  });
  if (lenis) {
    if (hasGsap && window.ScrollTrigger) {
      lenis.on('scroll', ScrollTrigger.update);
      gsap.ticker.add((time) => lenis.raf(time * 1000));
      gsap.ticker.lagSmoothing(0);
    } else {
      const raf = (time) => { lenis.raf(time); requestAnimationFrame(raf); };
      requestAnimationFrame(raf);
    }
  }

  // ancore interne
  document.querySelectorAll('a[href^="#"]').forEach((a) => {
    a.addEventListener('click', (e) => {
      const id = a.getAttribute('href');
      if (id.length < 2) return;
      const el = document.querySelector(id);
      if (!el) return;
      e.preventDefault();
      closeMenu();
      if (lenis) lenis.scrollTo(el, { offset: -70 });
      else el.scrollIntoView({ behavior: reduceMotion ? 'auto' : 'smooth' });
    });
  });

  /* ---------- Navbar ---------- */
  const nav = document.getElementById('nav');
  let lastY = 0;
  function onScroll() {
    const y = window.scrollY;
    nav.classList.toggle('is-scrolled', y > 40);
    nav.classList.toggle('is-hidden', y > 400 && y > lastY && !document.body.classList.contains('menu-open'));
    lastY = y;
  }
  window.addEventListener('scroll', onScroll, { passive: true });
  onScroll();

  const burger = document.getElementById('burger');
  function closeMenu() {
    document.body.classList.remove('menu-open');
    burger.setAttribute('aria-expanded', 'false');
    if (lenis) lenis.start();
  }
  burger.addEventListener('click', () => {
    const open = document.body.classList.toggle('menu-open');
    burger.setAttribute('aria-expanded', String(open));
    if (lenis) open ? lenis.stop() : lenis.start();
  });
  document.querySelectorAll('#menu a').forEach((a) => a.addEventListener('click', closeMenu));

  const drop = document.querySelector('.nav__drop');
  drop.querySelector('button').addEventListener('click', () => {
    const open = drop.classList.toggle('is-open');
    drop.querySelector('button').setAttribute('aria-expanded', String(open));
  });

  /* ---------- Loader + animazioni d'ingresso ---------- */
  let started = false;
  function start() {
    if (started) return;
    started = true;
    document.body.classList.add('is-loaded');
    if (!hasGsap || reduceMotion) {
      document.querySelectorAll('.reveal, .reveal-hero').forEach((el) => { el.style.opacity = 1; });
      startCounters(true);
      return;
    }
    gsap.registerPlugin(ScrollTrigger);
    // ScrollTrigger rimette il "ricorda posizione" del browser: lo spegniamo di nuovo
    ScrollTrigger.clearScrollMemory('manual');
    if (!goesToForm()) { toTop(); if (lenis) lenis.scrollTo(0, { immediate: true, force: true }); }

    // hero
    const tl = gsap.timeline({ defaults: { ease: 'expo.out' }, delay: 0.25 });
    const rest = gsap.utils.toArray('.hero__lead, .hero__actions, .hero__stats');
    tl.fromTo('.hero .eyebrow', { opacity: 0, y: 20 }, { opacity: 1, y: 0, duration: 1 })
      .fromTo('.hero__title .reveal-hero', { opacity: 1, yPercent: 110, rotate: 3 }, { yPercent: 0, rotate: 0, duration: 1.4, stagger: 0.1 }, '-=0.8')
      .fromTo(rest, { opacity: 0, y: 30 }, { opacity: 1, y: 0, duration: 1.2, stagger: 0.12 }, '-=1');

    // il testo della hero sfuma verso l'alto allo scroll
    gsap.to('.hero__content', {
      yPercent: -25, opacity: 0, ease: 'none',
      scrollTrigger: { trigger: '.hero', start: 'top top', end: 'bottom top', scrub: true },
    });

    // reveal generici a gruppi
    ScrollTrigger.batch('.reveal', {
      start: 'top 88%',
      onEnter: (els) => gsap.fromTo(els,
        { opacity: 0, y: 50 },
        { opacity: 1, y: 0, duration: 1.2, ease: 'expo.out', stagger: 0.08, overwrite: true }),
    });

    // parallax delle immagini
    gsap.utils.toArray('.about__img img, .why__img img').forEach((img) => {
      gsap.fromTo(img, { scale: 1.15, yPercent: -6 }, {
        scale: 1.15, yPercent: 6, ease: 'none',
        scrollTrigger: { trigger: img, start: 'top bottom', end: 'bottom top', scrub: true },
      });
    });
    if (document.querySelector('.about__orb')) gsap.to('.about__orb', { yPercent: 40, ease: 'none', scrollTrigger: { trigger: '.about', start: 'top bottom', end: 'bottom top', scrub: true } });

    startCounters(false);
  }

  if (document.getElementById('loader')) window.addEventListener('load', () => setTimeout(start, 350));
  else if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start);
  else start();
  // sicurezza: se "load" tarda (CDN lenti), parti comunque
  setTimeout(() => { if (!started) start(); }, 4000);

  /* ---------- Contatori ---------- */
  let countersStarted = false;
  function startCounters(instant) {
    if (countersStarted) return;
    countersStarted = true;
    document.querySelectorAll('[data-count]').forEach((el) => {
      const end = parseInt(el.dataset.count, 10);
      if (instant) { el.textContent = end; return; }
      const obs = new IntersectionObserver(([e]) => {
        if (!e.isIntersecting) return;
        obs.disconnect();
        const obj = { v: 0 };
        gsap.to(obj, { v: end, duration: 2.2, ease: 'power3.out', onUpdate: () => { el.textContent = Math.round(obj.v); } });
      }, { threshold: 0.6 });
      obs.observe(el);
    });
  }

  /* ---------- Tilt 3D + spotlight ---------- */
  if (finePointer && !reduceMotion) {
    document.querySelectorAll('.tilt').forEach((el) => {
      let raf = null;
      el.addEventListener('pointermove', (e) => {
        const r = el.getBoundingClientRect();
        const px = (e.clientX - r.left) / r.width;
        const py = (e.clientY - r.top) / r.height;
        cancelAnimationFrame(raf);
        raf = requestAnimationFrame(() => {
          el.style.transition = 'transform .15s ease-out';
          el.style.transform = `perspective(1000px) rotateX(${(0.5 - py) * 10}deg) rotateY(${(px - 0.5) * 12}deg) translateZ(0)`;
          el.style.setProperty('--mx', px * 100 + '%');
          el.style.setProperty('--my', py * 100 + '%');
        });
      });
      el.addEventListener('pointerleave', () => {
        cancelAnimationFrame(raf);
        el.style.transition = 'transform .8s cubic-bezier(.22,1,.36,1)';
        el.style.transform = 'perspective(1000px) rotateX(0) rotateY(0)';
      });
    });

    /* ---------- Bottoni magnetici ---------- */
    document.querySelectorAll('.magnetic').forEach((btn) => {
      btn.addEventListener('pointermove', (e) => {
        const r = btn.getBoundingClientRect();
        const x = e.clientX - r.left - r.width / 2;
        const y = e.clientY - r.top - r.height / 2;
        btn.style.transform = `translate(${x * 0.25}px, ${y * 0.35}px)`;
      });
      btn.addEventListener('pointerleave', () => { btn.style.transform = ''; });
    });

    /* ---------- Cursore ---------- */
    const cursor = document.querySelector('.cursor');
    let cx = 0, cy = 0, tx = 0, ty = 0;
    window.addEventListener('pointermove', (e) => { tx = e.clientX; ty = e.clientY; cursor.classList.add('is-active'); }, { passive: true });
    document.addEventListener('pointerleave', () => cursor.classList.remove('is-active'));
    (function loop() {
      cx += (tx - cx) * 0.18; cy += (ty - cy) * 0.18;
      cursor.style.transform = `translate(${cx}px, ${cy}px)`;
      requestAnimationFrame(loop);
    })();
    document.querySelectorAll('a, button, .card, input, select, textarea').forEach((el) => {
      el.addEventListener('pointerenter', () => cursor.classList.add('is-hover'));
      el.addEventListener('pointerleave', () => cursor.classList.remove('is-hover'));
    });
  }

  /* ---------- Dissolvenza tra le pagine ---------- */
  if (!reduceMotion) {
    document.querySelectorAll('a[href$=".html"], a[href*=".html?"]').forEach((a) => {
      a.addEventListener('click', (e) => {
        if (e.metaKey || e.ctrlKey || e.shiftKey || a.target === '_blank') return;
        e.preventDefault();
        document.body.classList.add('is-leaving');
        setTimeout(() => { window.location.href = a.href; }, 320);
      });
    });
    // tornando indietro col browser la pagina può essere ripresa dalla cache: togli la dissolvenza
    window.addEventListener('pageshow', () => document.body.classList.remove('is-leaving'));
  }
})();

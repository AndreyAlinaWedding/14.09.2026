(function () {
  'use strict';

  const WEDDING_DATE = new Date('2026-09-14T15:00:00+05:00');

  // --- Countdown ---
  function updateCountdown() {
    const now = Date.now();
    const diff = WEDDING_DATE - now;

    const units = {
      days: Math.floor(diff / (1000 * 60 * 60 * 24)),
      hours: Math.floor((diff / (1000 * 60 * 60)) % 24),
      minutes: Math.floor((diff / (1000 * 60)) % 60),
      seconds: Math.floor((diff / 1000) % 60),
    };

    if (diff <= 0) {
      document.querySelectorAll('.countdown__value').forEach((el) => {
        el.textContent = '0';
      });
      return;
    }

    Object.entries(units).forEach(([unit, value]) => {
      const el = document.querySelector(`[data-unit="${unit}"]`);
      if (el) el.textContent = String(value).padStart(2, '0');
    });
  }

  updateCountdown();
  setInterval(updateCountdown, 1000);

  // --- Mobile nav ---
  const toggle = document.querySelector('.nav__toggle');
  const navList = document.querySelector('.nav__list');

  if (toggle && navList) {
    toggle.addEventListener('click', () => {
      const isOpen = navList.classList.toggle('open');
      toggle.setAttribute('aria-expanded', String(isOpen));
    });

    navList.querySelectorAll('a').forEach((link) => {
      link.addEventListener('click', () => {
        navList.classList.remove('open');
        toggle.setAttribute('aria-expanded', 'false');
      });
    });
  }

  // --- Scroll reveal ---
  const revealEls = document.querySelectorAll('.reveal');

  if ('IntersectionObserver' in window) {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add('visible');
            observer.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.15, rootMargin: '0px 0px -40px 0px' }
    );

    revealEls.forEach((el) => observer.observe(el));
  } else {
    revealEls.forEach((el) => el.classList.add('visible'));
  }

  // Hero is visible immediately
  const heroContent = document.querySelector('.hero__content');
  if (heroContent) heroContent.classList.add('visible');

  // --- Gallery lightbox ---
  const lightbox = document.getElementById('lightbox');
  const lightboxImg = lightbox?.querySelector('.lightbox__img');
  const closeBtn = lightbox?.querySelector('.lightbox__close');

  function openLightbox(src, alt) {
    if (!lightbox || !lightboxImg) return;
    lightboxImg.src = src;
    lightboxImg.alt = alt || '';
    lightbox.hidden = false;
    document.body.style.overflow = 'hidden';
  }

  function closeLightbox() {
    if (!lightbox) return;
    lightbox.hidden = true;
    document.body.style.overflow = '';
  }

  document.querySelectorAll('.gallery__item img').forEach((img) => {
    img.closest('.gallery__item')?.addEventListener('click', () => {
      openLightbox(img.src, img.alt);
    });
  });

  closeBtn?.addEventListener('click', closeLightbox);
  lightbox?.addEventListener('click', (e) => {
    if (e.target === lightbox) closeLightbox();
  });
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') closeLightbox();
  });

  // --- RSVP form (demo) ---
  const rsvpForm = document.getElementById('rsvp-form');
  const rsvpNote = document.getElementById('rsvp-note');

  rsvpForm?.addEventListener('submit', (e) => {
    e.preventDefault();

    const data = new FormData(rsvpForm);
    const payload = Object.fromEntries(data.entries());
    console.log('RSVP:', payload);

    if (rsvpNote) {
      rsvpNote.textContent = 'Спасибо! Ваш ответ сохранён (пока только локально — подключим отправку позже).';
      rsvpNote.classList.add('form-note--success');
    }

    rsvpForm.reset();
  });
})();

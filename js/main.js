(function () {
  'use strict';

  const WEDDING_DATE = new Date('2026-09-14T15:00:00+05:00');
  const ENVELOPE_STORAGE_KEY = 'wedding-envelope-opened';

  // --- Envelope intro ---
  const envelopeGate = document.getElementById('envelope-gate');
  const envelopeOpenBtn = document.getElementById('envelope-open');
  const siteWrap = document.getElementById('site-wrap');

  function setSiteInert(locked) {
    if (!siteWrap) return;
    if (locked) {
      siteWrap.setAttribute('inert', '');
      siteWrap.setAttribute('aria-hidden', 'true');
    } else {
      siteWrap.removeAttribute('inert');
      siteWrap.removeAttribute('aria-hidden');
    }
  }

  function revealSite() {
    document.body.classList.remove('is-envelope-locked');
    setSiteInert(false);
    if (!envelopeGate) return;
    envelopeGate.hidden = true;
    envelopeGate.setAttribute('aria-hidden', 'true');
  }

  function openEnvelope() {
    if (!envelopeGate || envelopeGate.classList.contains('is-opening')) return;

    try {
      sessionStorage.setItem(ENVELOPE_STORAGE_KEY, '1');
    } catch (_) { /* ignore */ }

    envelopeGate.classList.add('is-opening');
    document.body.classList.remove('is-envelope-locked');
    setSiteInert(false);

    const finish = () => {
      envelopeGate.classList.add('is-done');
      window.setTimeout(revealSite, 600);
    };

    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    window.setTimeout(finish, reducedMotion ? 50 : 900);
  }

  function shouldSkipEnvelope() {
    if (!envelopeGate) return true;
    if (document.documentElement.classList.contains('envelope-skip')) return true;

    try {
      if (sessionStorage.getItem(ENVELOPE_STORAGE_KEY) === '1') return true;
    } catch (_) { /* ignore */ }

    // Deep links (e.g. #rsvp) open the site directly
    if (window.location.hash && window.location.hash !== '#top') return true;

    return false;
  }

  if (shouldSkipEnvelope()) {
    revealSite();
  } else {
    setSiteInert(true);
    envelopeGate?.addEventListener('click', openEnvelope);
    envelopeOpenBtn?.focus();
  }

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
  document.querySelectorAll('.hero .reveal').forEach((el) => {
    el.classList.add('visible');
  });

  // --- RSVP → Google Sheets (via Apps Script) ---
  const RSVP_SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbxlm86cA7v1Q7kaD8oKnN_Plgh7tbEkbRmLu3iAJ4Q4fzKUYGpdQ5VLcgFqXk2Z6y38IQ/exec';

  const rsvpForm = document.getElementById('rsvp-form');
  const rsvpNote = document.getElementById('rsvp-note');
  const rsvpSubmit = rsvpForm?.querySelector('[type="submit"]');
  const rsvpGuestsSelect = document.getElementById('rsvp-guests');
  const rsvpGuestsGroup = document.getElementById('rsvp-guests-group');
  const rsvpNamesGroup = document.getElementById('rsvp-names-group');
  const rsvpGuestNames = document.getElementById('rsvp-guest-names');

  function setRsvpNote(message, type) {
    if (!rsvpNote) return;
    rsvpNote.textContent = message;
    rsvpNote.classList.remove('form-note--success', 'form-note--error');
    if (type) rsvpNote.classList.add(`form-note--${type}`);
  }

  function getRsvpAttendance() {
    return rsvpForm?.querySelector('input[name="attendance"]:checked')?.value || '';
  }

  const DRINK_OPTIONS = [
    { value: 'strong', label: 'Крепкий алкоголь' },
    { value: 'wine', label: 'Вино' },
    { value: 'none', label: 'Не пью алкоголь' },
  ];

  function renderGuestNameFields(count, declining = false) {
    if (!rsvpGuestNames) return;

    const guestCount = declining ? 1 : Math.min(4, Math.max(1, parseInt(count, 10) || 1));
    rsvpGuestNames.innerHTML = '';

    for (let i = 1; i <= guestCount; i += 1) {
      const row = document.createElement('div');
      row.className = declining ? 'guest-row guest-row--single' : 'guest-row';

      const nameField = document.createElement('div');
      nameField.className = 'form-group form-group--nested';

      const nameLabel = document.createElement('label');
      nameLabel.setAttribute('for', `rsvp-guest-name-${i}`);
      nameLabel.textContent = declining || i === 1 ? 'Ваше имя и фамилия' : `Имя и фамилия гостя ${i}`;

      const nameInput = document.createElement('input');
      nameInput.type = 'text';
      nameInput.id = `rsvp-guest-name-${i}`;
      nameInput.name = `guest_name_${i}`;
      nameInput.required = true;
      nameInput.placeholder = 'Иван Иванов';
      nameInput.autocomplete = i === 1 ? 'name' : 'off';
      nameInput.setAttribute('aria-required', 'true');

      nameField.append(nameLabel, nameInput);
      row.appendChild(nameField);

      if (!declining) {
        const drinkField = document.createElement('div');
        drinkField.className = 'form-group form-group--nested';

        const drinkLabel = document.createElement('label');
        drinkLabel.setAttribute('for', `rsvp-guest-drink-${i}`);
        drinkLabel.innerHTML = 'Напитки <span class="form-label-hint">(Что вы больше предпочитаете?)</span>';

        const drinkSelect = document.createElement('select');
        drinkSelect.id = `rsvp-guest-drink-${i}`;
        drinkSelect.name = `guest_drink_${i}`;
        drinkSelect.required = true;
        drinkSelect.setAttribute('aria-required', 'true');

        const placeholder = document.createElement('option');
        placeholder.value = '';
        placeholder.textContent = 'Выберите…';
        placeholder.disabled = true;
        placeholder.selected = true;
        drinkSelect.appendChild(placeholder);

        DRINK_OPTIONS.forEach(({ value, label }) => {
          const option = document.createElement('option');
          option.value = value;
          option.textContent = label;
          drinkSelect.appendChild(option);
        });

        drinkField.append(drinkLabel, drinkSelect);
        row.appendChild(drinkField);
      }

      rsvpGuestNames.appendChild(row);
    }
  }

  function collectGuestEntries() {
    return [...(rsvpGuestNames?.querySelectorAll('.guest-row') || [])].map((row) => ({
      name: row.querySelector('input[type="text"]')?.value.trim() || '',
      drink: row.querySelector('select')?.value || '',
    }));
  }

  function updateRsvpGuestFields() {
    const attendance = getRsvpAttendance();
    const attending = attendance === 'yes';
    const declining = attendance === 'no';
    const commentLabel = document.getElementById('rsvp-comment-label');

    if (rsvpGuestsGroup) rsvpGuestsGroup.hidden = !attending;
    if (rsvpNamesGroup) rsvpNamesGroup.hidden = !attending && !declining;

    if (commentLabel) {
      commentLabel.textContent = declining
        ? 'Комментарий'
        : 'Комментарий (аллергии, пожелания)';
    }

    if (attending) {
      renderGuestNameFields(rsvpGuestsSelect?.value || '1');
    } else if (declining) {
      renderGuestNameFields(1, true);
    } else if (rsvpGuestNames) {
      rsvpGuestNames.innerHTML = '';
    }
  }

  rsvpForm?.querySelectorAll('input[name="attendance"]').forEach((radio) => {
    radio.addEventListener('change', updateRsvpGuestFields);
  });

  rsvpGuestsSelect?.addEventListener('change', () => {
    if (getRsvpAttendance() === 'yes') {
      renderGuestNameFields(rsvpGuestsSelect.value);
    }
  });

  updateRsvpGuestFields();

  const rsvpThanks = document.getElementById('rsvp-thanks');
  const rsvpThanksTitle = document.getElementById('rsvp-thanks-title');
  const rsvpThanksText = rsvpThanks?.querySelector('.modal__text');

  function openRsvpThanks(attending) {
    if (!rsvpThanks) return;

    if (rsvpThanksTitle) {
      rsvpThanksTitle.textContent = attending ? 'Спасибо!' : 'Спасибо за Ваш ответ';
    }

    if (rsvpThanksText) {
      rsvpThanksText.textContent = attending
        ? 'Благодарим Вас за подтверждение присутствия. Будем с радостью ждать на нашем мероприятии!'
        : 'Нам очень жаль, что у Вас не получится прийти.';
    }

    rsvpThanks.hidden = false;
    document.body.style.overflow = 'hidden';
  }

  function closeRsvpThanks() {
    if (!rsvpThanks) return;
    rsvpThanks.hidden = true;
    document.body.style.overflow = '';
  }

  rsvpThanks?.querySelectorAll('[data-close-modal], .modal__close').forEach((btn) => {
    btn.addEventListener('click', closeRsvpThanks);
  });

  rsvpThanks?.addEventListener('click', (e) => {
    if (e.target === rsvpThanks) closeRsvpThanks();
  });

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && rsvpThanks && !rsvpThanks.hidden) {
      closeRsvpThanks();
    }
  });

  rsvpForm?.addEventListener('submit', async (e) => {
    e.preventDefault();

    if (!RSVP_SCRIPT_URL) {
      setRsvpNote(
        'Отправка ещё не подключена: укажите RSVP_SCRIPT_URL в js/main.js (инструкция в rsvp/Code.gs).',
        'error'
      );
      return;
    }

    const attendance = getRsvpAttendance();
    const attending = attendance === 'yes';

    if (!attendance) {
      setRsvpNote('Пожалуйста, укажите, сможете ли вы прийти.', 'error');
      return;
    }

    const guestEntries = collectGuestEntries();
    const drinkLabels = Object.fromEntries(DRINK_OPTIONS.map(({ value, label }) => [value, label]));
    const nameInputs = [...(rsvpGuestNames?.querySelectorAll('input[type="text"]') || [])];
    const drinkSelects = [...(rsvpGuestNames?.querySelectorAll('select') || [])];

    const emptyNameInput = nameInputs.find((input) => !input.value.trim());
    if (emptyNameInput) {
      emptyNameInput.focus();
      setRsvpNote('Заполните пожалуйста поле Имя и фамилия', 'error');
      return;
    }

    if (attending) {
      const emptyDrinkSelect = drinkSelects.find((select) => !select.value);
      if (emptyDrinkSelect) {
        emptyDrinkSelect.focus();
        setRsvpNote('Заполните пожалуйста поле Напитки', 'error');
        return;
      }
    }

    const guestNames = guestEntries.map((entry) => entry.name).filter(Boolean);
    const namesJoined = guestNames.join('; ');
    const drinksJoined = attending
      ? guestEntries.map((entry) => drinkLabels[entry.drink] || entry.drink).join('; ')
      : '';

    const data = {
      attendance,
      guests: attending ? rsvpGuestsSelect?.value || '1' : '0',
      name: namesJoined,
      names: namesJoined,
      drinks: drinksJoined,
      comment: rsvpForm.querySelector('[name="comment"]')?.value.trim() || '',
    };

    const previousLabel = rsvpSubmit?.textContent;

    if (rsvpSubmit) {
      rsvpSubmit.disabled = true;
      rsvpSubmit.textContent = 'Отправляем…';
    }

    try {
      await fetch(RSVP_SCRIPT_URL, {
        method: 'POST',
        mode: 'no-cors',
        headers: { 'Content-Type': 'text/plain;charset=utf-8' },
        body: JSON.stringify(data),
      });

      setRsvpNote(
        attending
          ? 'Спасибо! Ваш ответ записан. Ждём вас на празднике.'
          : 'Спасибо! Ваш ответ записан.',
        'success'
      );
      rsvpForm.reset();
      updateRsvpGuestFields();

      openRsvpThanks(attending);
    } catch (err) {
      console.error('RSVP error:', err);
      setRsvpNote(
        'Не удалось отправить ответ. Проверьте интернет и попробуйте ещё раз — или напишите нам напрямую.',
        'error'
      );
    } finally {
      if (rsvpSubmit) {
        rsvpSubmit.disabled = false;
        rsvpSubmit.textContent = previousLabel || 'Отправить ответ';
      }
    }
  });
})();

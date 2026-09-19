const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const checkerTargets = document.querySelectorAll('.shot, .portrait-wrap, .instagram-grid a');

checkerTargets.forEach((target, targetIndex) => {
  target.classList.add('checker-reveal');

  if (reducedMotion) {
    target.classList.add('visible');
    return;
  }

  const grid = document.createElement('span');
  grid.className = 'checker-reveal-grid';
  grid.setAttribute('aria-hidden', 'true');

  for (let row = 0; row < 6; row += 1) {
    for (let column = 0; column < 10; column += 1) {
      const tile = document.createElement('i');
      const sequence = (row * 7 + column * 11 + targetIndex * 5) % 22;
      tile.style.setProperty('--tile-delay', `${sequence * 17}ms`);
      tile.style.setProperty('--tile-tone', (row + column + targetIndex) % 2 ? 'var(--ink)' : 'var(--acid)');
      grid.appendChild(tile);
    }
  }

  target.appendChild(grid);
});

const observer = new IntersectionObserver((entries) => {
  entries.forEach((entry) => {
    if (entry.isIntersecting) {
      const reveal = () => entry.target.classList.add('visible');
      const image = entry.target.matches('.checker-reveal') ? entry.target.querySelector('img') : null;

      if (image && !image.complete) {
        image.addEventListener('load', reveal, { once: true });
        image.addEventListener('error', reveal, { once: true });
      } else {
        reveal();
      }

      observer.unobserve(entry.target);
    }
  });
}, { threshold: 0.14 });

document.querySelectorAll('.reveal, .checker-reveal').forEach((item) => observer.observe(item));

const clock = document.querySelector('.clock');
if (clock) {
  const updateClock = () => {
    const time = new Intl.DateTimeFormat('en-US', {
      timeZone: 'America/New_York',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false
    }).format(new Date());
    clock.textContent = `NEW YORK / ${time}`;
  };
  updateClock();
  window.setInterval(updateClock, 1000);
}

const hero = document.querySelector('.hero');
const heroSlides = Array.from(document.querySelectorAll('.hero-slide'));
const heroSequence = document.querySelector('.hero-sequence span');
if (hero && heroSlides.length > 1 && !reducedMotion) {
  let activeIndex = 0;
  let timer;

  const activateSlide = (nextIndex) => {
    const current = heroSlides[activeIndex];
    const next = heroSlides[nextIndex];

    if (current instanceof HTMLVideoElement) {
      current.pause();
      current.currentTime = 0;
    }

    current.classList.remove('is-active');
    next.classList.add('is-active');
    activeIndex = nextIndex;

    if (heroSequence) {
      heroSequence.textContent = String(activeIndex + 1).padStart(2, '0');
    }

    hero.classList.remove('is-switching');
    void hero.offsetWidth;
    hero.classList.add('is-switching');

    if (next instanceof HTMLVideoElement) {
      next.currentTime = 0;
      next.play().catch(() => {});
    }

    const duration = Number(next.dataset.duration) || 1100;
    window.clearTimeout(timer);
    timer = window.setTimeout(() => {
      activateSlide((activeIndex + 1) % heroSlides.length);
    }, duration);
  };

  timer = window.setTimeout(() => activateSlide(1), Number(heroSlides[0].dataset.duration) || 1100);
}

const contactDialog = document.querySelector('.contact-dialog');
const contactForm = document.querySelector('.contact-form');
const contactStatus = document.querySelector('.contact-form-status');
const contactServiceField = document.querySelector('[data-service-field]');
const contactProjectType = document.querySelector('[data-project-type]');

if (contactDialog && contactForm) {
  document.querySelectorAll('[data-contact-form]').forEach((trigger) => {
    trigger.addEventListener('click', (event) => {
      event.preventDefault();
      const service = trigger.dataset.service || '';

      if (contactServiceField) contactServiceField.value = service || 'General inquiry';
      if (contactProjectType) contactProjectType.value = service;
      if (contactStatus) {
        contactStatus.textContent = '';
        contactStatus.classList.remove('is-error');
      }

      contactDialog.showModal();
      document.body.classList.add('dialog-open');
      window.setTimeout(() => contactForm.querySelector('input:not([type="hidden"])')?.focus(), 0);
    });
  });

  const closeContactDialog = () => {
    contactDialog.close();
    document.body.classList.remove('dialog-open');
  };

  contactDialog.querySelector('.contact-dialog-close')?.addEventListener('click', closeContactDialog);
  contactDialog.addEventListener('click', (event) => {
    if (event.target === contactDialog) closeContactDialog();
  });
  contactDialog.addEventListener('close', () => document.body.classList.remove('dialog-open'));

  contactForm.addEventListener('submit', async (event) => {
    event.preventDefault();
    const submitButton = contactForm.querySelector('button[type="submit"]');
    const formData = new FormData(contactForm);
    const payload = Object.fromEntries(formData.entries());

    submitButton.disabled = true;
    if (contactStatus) {
      contactStatus.textContent = 'Sending your inquiry…';
      contactStatus.classList.remove('is-error');
    }

    try {
      const response = await fetch('https://formsubmit.co/ajax/info@thebalddude.co', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify(payload)
      });
      const result = await response.json();
      if (!response.ok || result.success === false) throw new Error('Submission failed');

      contactForm.reset();
      if (contactServiceField) contactServiceField.value = 'General inquiry';
      if (contactStatus) contactStatus.textContent = 'Inquiry sent. Justin will reply directly.';
    } catch (error) {
      if (contactStatus) {
        contactStatus.textContent = 'That did not send. Email info@thebalddude.co directly and I’ll get back to you.';
        contactStatus.classList.add('is-error');
      }
    } finally {
      submitButton.disabled = false;
    }
  });
}

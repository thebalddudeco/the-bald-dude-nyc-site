const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
let checkerTargetIndex = 0;

const initializeCheckerReveal = (target) => {
  if (target.classList.contains('checker-reveal')) return;
  const targetIndex = checkerTargetIndex;
  checkerTargetIndex += 1;
  target.classList.add('checker-reveal');

  if (reducedMotion) {
    target.classList.add('visible');
    return target;
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
  return target;
};

document.querySelectorAll('.shot, .portrait-wrap, .instagram-grid a').forEach(initializeCheckerReveal);

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

const instagramFeed = document.querySelector('[data-instagram-feed]');
const instagramStatus = document.querySelector('[data-instagram-status]');
if (instagramFeed) {
  fetch('/api/instagram-feed', { headers: { Accept: 'application/json' } })
    .then((response) => {
      if (!response.ok) throw new Error('Instagram feed unavailable');
      return response.json();
    })
    .then(({ images }) => {
      if (!Array.isArray(images) || images.length === 0) throw new Error('Instagram feed empty');

      const fragment = document.createDocumentFragment();
      images.slice(0, 12).forEach((item, index) => {
        const link = document.createElement('a');
        link.href = 'https://www.instagram.com/thebalddude.dng/';
        link.target = '_blank';
        link.rel = 'noopener noreferrer';
        link.setAttribute('aria-label', `Open @thebalddude.dng on Instagram — recent post ${index + 1}`);

        const image = document.createElement('img');
        image.src = item.url;
        image.alt = `Recent Instagram post from @thebalddude.dng, item ${index + 1}`;
        image.loading = 'lazy';
        image.decoding = 'async';
        link.appendChild(image);
        initializeCheckerReveal(link);
        fragment.appendChild(link);
      });

      instagramFeed.replaceChildren(fragment);
      instagramFeed.querySelectorAll('.checker-reveal').forEach((item) => observer.observe(item));
      if (instagramStatus) instagramStatus.textContent = 'Live from Instagram';
    })
    .catch(() => {
      instagramFeed.closest('.instagram-feed')?.classList.add('is-fallback');
      if (instagramStatus) instagramStatus.textContent = 'Latest selected work';
    });
}

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

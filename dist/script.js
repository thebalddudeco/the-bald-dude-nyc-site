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

const enhancedSelects = [];

const enhanceSelect = (select, index) => {
  const wrapper = document.createElement('div');
  const trigger = document.createElement('button');
  const triggerText = document.createElement('span');
  const menu = document.createElement('div');
  const menuId = `contact-select-menu-${index + 1}`;
  const options = Array.from(select.options);
  let activeIndex = Math.max(select.selectedIndex, 0);

  wrapper.className = 'custom-select is-enhanced';
  trigger.className = 'custom-select-trigger';
  trigger.type = 'button';
  trigger.setAttribute('aria-haspopup', 'listbox');
  trigger.setAttribute('aria-expanded', 'false');
  trigger.setAttribute('aria-controls', menuId);
  menu.className = 'custom-select-menu';
  menu.id = menuId;
  menu.hidden = true;
  menu.setAttribute('role', 'listbox');

  select.parentNode.insertBefore(wrapper, select);
  wrapper.append(select, trigger, menu);
  trigger.appendChild(triggerText);

  const optionButtons = options.map((option, optionIndex) => {
    const button = document.createElement('button');
    button.className = 'custom-select-option';
    button.type = 'button';
    button.setAttribute('role', 'option');
    button.setAttribute('aria-selected', option.selected ? 'true' : 'false');
    button.tabIndex = -1;
    button.textContent = option.textContent;
    button.addEventListener('click', () => selectOption(optionIndex));
    menu.appendChild(button);
    return button;
  });

  const syncFromNative = () => {
    const selectedIndex = Math.max(select.selectedIndex, 0);
    activeIndex = selectedIndex;
    triggerText.textContent = options[selectedIndex]?.textContent || 'Choose one';
    optionButtons.forEach((button, optionIndex) => {
      button.setAttribute('aria-selected', optionIndex === selectedIndex ? 'true' : 'false');
    });
  };

  const setActive = (nextIndex, focus = true) => {
    activeIndex = Math.min(Math.max(nextIndex, 0), optionButtons.length - 1);
    optionButtons.forEach((button, optionIndex) => button.classList.toggle('is-active', optionIndex === activeIndex));
    if (focus) {
      optionButtons[activeIndex]?.focus();
      optionButtons[activeIndex]?.scrollIntoView({ block: 'nearest' });
    }
  };

  const close = (restoreFocus = false) => {
    wrapper.classList.remove('is-open');
    trigger.setAttribute('aria-expanded', 'false');
    menu.hidden = true;
    optionButtons.forEach((button) => button.classList.remove('is-active'));
    if (restoreFocus) trigger.focus();
  };

  const open = (preferredIndex = select.selectedIndex) => {
    enhancedSelects.forEach((item) => {
      if (item.wrapper !== wrapper) item.close();
    });
    wrapper.classList.add('is-open');
    trigger.setAttribute('aria-expanded', 'true');
    menu.hidden = false;
    setActive(Math.max(preferredIndex, 0));
  };

  function selectOption(optionIndex) {
    select.selectedIndex = optionIndex;
    select.dispatchEvent(new Event('change', { bubbles: true }));
    close(true);
  }

  trigger.addEventListener('click', () => {
    if (wrapper.classList.contains('is-open')) close();
    else open();
  });

  trigger.addEventListener('keydown', (event) => {
    if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
      event.preventDefault();
      open(event.key === 'ArrowDown' ? Math.max(select.selectedIndex, 0) : optionButtons.length - 1);
    }
  });

  menu.addEventListener('keydown', (event) => {
    if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
      event.preventDefault();
      setActive(activeIndex + (event.key === 'ArrowDown' ? 1 : -1));
    } else if (event.key === 'Home' || event.key === 'End') {
      event.preventDefault();
      setActive(event.key === 'Home' ? 0 : optionButtons.length - 1);
    } else if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      selectOption(activeIndex);
    } else if (event.key === 'Escape' || event.key === 'Tab') {
      close(event.key === 'Escape');
    }
  });

  select.addEventListener('change', syncFromNative);
  select.addEventListener('invalid', (event) => {
    event.preventDefault();
    open();
  });
  syncFromNative();
  enhancedSelects.push({ wrapper, close, syncFromNative });
};

document.querySelectorAll('.contact-form select').forEach(enhanceSelect);
document.addEventListener('click', (event) => {
  enhancedSelects.forEach((item) => {
    if (!item.wrapper.contains(event.target)) item.close();
  });
});

if (contactDialog && contactForm) {
  document.querySelectorAll('[data-contact-form]').forEach((trigger) => {
    trigger.addEventListener('click', (event) => {
      event.preventDefault();
      const service = trigger.dataset.service || '';

      if (contactServiceField) contactServiceField.value = service || 'General inquiry';
      if (contactProjectType) {
        contactProjectType.value = service;
        contactProjectType.dispatchEvent(new Event('change', { bubbles: true }));
      }
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
      window.requestAnimationFrame(() => enhancedSelects.forEach((item) => item.syncFromNative()));
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

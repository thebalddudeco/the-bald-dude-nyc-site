const observer = new IntersectionObserver((entries) => {
  entries.forEach((entry) => {
    if (entry.isIntersecting) {
      entry.target.classList.add('visible');
      observer.unobserve(entry.target);
    }
  });
}, { threshold: 0.14 });

document.querySelectorAll('.reveal').forEach((item) => observer.observe(item));

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
const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

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

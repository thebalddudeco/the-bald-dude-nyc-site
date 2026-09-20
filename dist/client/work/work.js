const archiveUrl = 'https://huggingface.co/datasets/TheBaldDudeCo/website-gallery/resolve/main/archive.json';

const carousels = Array.from(document.querySelectorAll('[data-carousel]'));

const moveCarousel = (track, direction) => {
  const distance = Math.max(track.clientWidth * 0.78, 300);
  track.scrollBy({ left: direction * distance, behavior: 'smooth' });
};

carousels.forEach((carousel) => {
  const track = carousel.querySelector('[data-carousel-track]');
  if (!track) return;

  carousel.querySelector('[data-carousel-prev]')?.addEventListener('click', () => moveCarousel(track, -1));
  carousel.querySelector('[data-carousel-next]')?.addEventListener('click', () => moveCarousel(track, 1));
  track.addEventListener('keydown', (event) => {
    if (event.key === 'ArrowLeft') { event.preventDefault(); moveCarousel(track, -1); }
    if (event.key === 'ArrowRight') { event.preventDefault(); moveCarousel(track, 1); }
  });
});

const createMediaCard = (item, albumName, index) => {
  const figure = document.createElement('figure');
  if (item.height > item.width) figure.classList.add('gallery-tall');

  if (item.type === 'video') {
    const video = document.createElement('video');
    video.src = item.url;
    video.muted = true;
    video.loop = true;
    video.playsInline = true;
    video.preload = 'metadata';
    video.setAttribute('aria-label', `${albumName} motion frame ${index + 1}`);
    figure.appendChild(video);
    figure.addEventListener('pointerenter', () => video.play().catch(() => {}));
    figure.addEventListener('pointerleave', () => video.pause());
  } else {
    const image = document.createElement('img');
    image.src = item.url;
    image.alt = `${albumName} photograph ${index + 1}`;
    image.loading = 'lazy';
    image.decoding = 'async';
    figure.appendChild(image);
  }

  const caption = document.createElement('figcaption');
  const number = document.createElement('span');
  number.textContent = String(index + 1).padStart(3, '0');
  caption.append(number, document.createTextNode(albumName));
  figure.appendChild(caption);
  return figure;
};

const loadArchive = async () => {
  try {
    const response = await fetch(`${archiveUrl}?v=3`, { mode: 'cors' });
    if (!response.ok) throw new Error(`Archive request failed with ${response.status}`);
    const archive = await response.json();

    carousels.forEach((carousel) => {
      const category = carousel.dataset.gallery;
      const track = carousel.querySelector('[data-carousel-track]');
      const count = carousel.querySelector('[data-gallery-count]');
      const albums = archive.albums.filter((album) => album.id === category || album.id.startsWith(`${category}--`));
      const entries = albums.flatMap((album) => album.items.map((item) => ({ item, albumName: album.name.split(' — ').slice(1).join(' / ') || album.name })));

      const fragment = document.createDocumentFragment();
      entries.forEach(({ item, albumName }, index) => fragment.appendChild(createMediaCard(item, albumName, index)));
      track.replaceChildren(fragment);
      count.textContent = `${entries.length} frame${entries.length === 1 ? '' : 's'}`;
    });
  } catch (error) {
    carousels.forEach((carousel) => {
      const track = carousel.querySelector('[data-carousel-track]');
      const count = carousel.querySelector('[data-gallery-count]');
      count.textContent = 'Archive unavailable';
      const message = document.createElement('p');
      message.className = 'gallery-error';
      message.innerHTML = 'The archive could not load. <a href="https://www.instagram.com/thebalddude.dng/" target="_blank" rel="noopener noreferrer">View recent work on Instagram</a>.';
      track.replaceChildren(message);
    });
  }
};

loadArchive();

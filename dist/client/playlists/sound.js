const list = document.querySelector('[data-playlist-index]');

const buildPlaylist = (playlist) => {
  const article = document.createElement('article');
  article.className = 'sound-row';

  const number = document.createElement('span');
  number.className = 'sound-row-number';
  number.textContent = playlist.number;

  const art = document.createElement('img');
  art.className = 'sound-row-art';
  art.src = playlist.imageUrl;
  art.alt = `${playlist.title} playlist artwork`;
  art.loading = 'lazy';

  const copy = document.createElement('div');
  copy.className = 'sound-row-copy';
  const category = document.createElement('span');
  category.textContent = playlist.category;
  const title = document.createElement('h3');
  title.textContent = playlist.title;
  const description = document.createElement('p');
  description.textContent = playlist.description;
  copy.append(category, title, description);

  const link = document.createElement('a');
  link.className = 'sound-row-link';
  link.href = playlist.spotifyUrl;
  link.target = '_blank';
  link.rel = 'noopener noreferrer';
  link.setAttribute('aria-label', `Open ${playlist.title} in Spotify`);
  const linkText = document.createElement('span');
  linkText.textContent = 'Open Spotify';
  const icon = document.createElement('i');
  icon.className = 'material-symbols-outlined';
  icon.setAttribute('aria-hidden', 'true');
  icon.textContent = 'arrow_outward';
  link.append(linkText, icon);

  article.append(number, art, copy, link);
  return article;
};

if (list) {
  fetch('../playlists.json', { headers: { Accept: 'application/json' } })
    .then((response) => {
      if (!response.ok) throw new Error('Playlist index unavailable');
      return response.json();
    })
    .then(({ playlists }) => {
      if (!Array.isArray(playlists) || playlists.length === 0) throw new Error('Playlist index empty');
      list.replaceChildren(...playlists.map(buildPlaylist));
    })
    .catch(() => {
      const fallback = document.createElement('a');
      fallback.className = 'sound-noscript';
      fallback.href = 'https://open.spotify.com/playlist/0LhM5t4RpB4R3aYvGeKY3e';
      fallback.target = '_blank';
      fallback.rel = 'noopener noreferrer';
      fallback.textContent = '01 — IN THE CAVERN — Open in Spotify';
      list.replaceChildren(fallback);
    });
}

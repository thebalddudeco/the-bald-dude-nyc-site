const PROFILE_URL = 'https://www.instagram.com/thebalddude.dng/';
const PIXIESET_FEED_URL = 'https://www.thebalddude.co/contact/';

function json(payload, status = 200) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: {
      'content-type': 'application/json; charset=utf-8',
      'cache-control': status === 200 ? 'public, max-age=300, s-maxage=900, stale-while-revalidate=86400' : 'no-store',
      'x-content-type-options': 'nosniff',
    },
  });
}

function extractInstagramImages(html) {
  const images = [];
  const seen = new Set();
  const pattern = /data-src=(https:\/\/[^\s"']*cdninstagram\.com[^\s"']+)/gi;
  let match;

  while ((match = pattern.exec(html)) && images.length < 12) {
    const url = match[1].replaceAll('&amp;', '&');
    const identity = url.split('?')[0];
    if (seen.has(identity)) continue;
    seen.add(identity);
    images.push({ url, profileUrl: PROFILE_URL });
  }

  return images;
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    if (url.pathname === '/api/instagram-feed') {
      try {
        const upstream = await fetch(PIXIESET_FEED_URL, {
          headers: {
            accept: 'text/html',
            'user-agent': 'The Bald Dude Co. website feed/1.0',
          },
          cf: { cacheEverything: true, cacheTtl: 900 },
        });
        if (!upstream.ok) return json({ error: 'Feed source unavailable' }, 502);

        const images = extractInstagramImages(await upstream.text());
        if (images.length === 0) return json({ error: 'No feed images found' }, 502);
        return json({ profile: '@thebalddude.dng', profileUrl: PROFILE_URL, images });
      } catch {
        return json({ error: 'Feed temporarily unavailable' }, 502);
      }
    }

    if (env.ASSETS && typeof env.ASSETS.fetch === 'function') {
      return env.ASSETS.fetch(request);
    }

    return new Response('Site assets unavailable', { status: 503 });
  },
};

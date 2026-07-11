const { execSync } = require('child_process');

const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';

function curlFetch(url) {
  try {
    return execSync(`curl -sL -A "${UA}" -H "Accept: text/html" -H "Accept-Language: ar,en;q=0.9" -H "Referer: https://3asq.online/" --compressed --max-time 25 "${url}"`, { encoding: 'utf-8', timeout: 30000 });
  } catch (e) { return ''; }
}

exports.handler = async (event) => {
  const slug = event.queryStringParameters.slug;
  const chapter = event.queryStringParameters.chapter;
  if (!slug || !chapter) return { statusCode: 400, body: JSON.stringify({ error: 'missing params' }) };

  const html = curlFetch(`https://3asq.online/manga/${slug}/${chapter}/`);
  const pages = [];
  const seen = new Set();
  let i = 0;

  function addPage(url) {
    url = url.trim();
    if (url && !url.includes('placeholder') && !seen.has(url)) {
      seen.add(url);
      // Return DIRECT image URL (not proxied) — the app will load via Glide
      pages.push({ index: i, url });
      i++;
    }
  }

  // Pattern 1: wp-manga-chapter-img with src
  let regex = /<img[^>]*class="[^"]*wp-manga-chapter-img[^"]*"[^>]*src="\s*([^"]+)"[^>]*>/gi;
  let m;
  while ((m = regex.exec(html)) !== null) addPage(m[1]);

  // Pattern 2: data-src (lazy loaded)
  if (pages.length === 0) {
    regex = /<img[^>]*class="[^"]*wp-manga-chapter-img[^"]*"[^>]*data-src="\s*([^"]+)"[^>]*>/gi;
    while ((m = regex.exec(html)) !== null) addPage(m[1]);
  }

  // Pattern 3: id="image-N" with src
  if (pages.length === 0) {
    regex = /<img[^>]*id="image-\d+"[^>]*src="\s*([^"]+)"[^>]*>/gi;
    while ((m = regex.exec(html)) !== null) addPage(m[1]);
  }

  // Pattern 4: Any src with uploads/WP-manga/data
  if (pages.length === 0) {
    regex = /src="\s*(https?:\/\/3asq\.[a-z]+\/wp-content\/uploads\/WP-manga\/data\/[^"]+\.(?:jpg|jpeg|png|webp)[^"]*)"/gi;
    while ((m = regex.exec(html)) !== null) addPage(m[1]);
  }

  return { statusCode: 200, headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }, body: JSON.stringify({ slug, chapter, totalPages: pages.length, pages }) };
};

const { execSync } = require('child_process');

const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';

function curlFetch(url) {
  try {
    return execSync(`curl -sL -A "${UA}" -H "Accept: text/html" -H "Accept-Language: ar,en;q=0.9" -H "Referer: https://3asq.pro/" --compressed --max-time 25 "${url}"`, { encoding: 'utf-8', timeout: 30000 });
  } catch (e) { return ''; }
}

exports.handler = async (event) => {
  const slug = event.queryStringParameters.slug;
  const chapter = event.queryStringParameters.chapter;
  if (!slug || !chapter) return { statusCode: 400, body: JSON.stringify({ error: 'missing params' }) };

  const html = curlFetch(`https://3asq.pro/manga/${slug}/${chapter}/`);
  const pages = [];
  const seen = new Set();
  let i = 0;

  // Pattern 1: wp-manga-chapter-img with src
  let regex = /<img[^>]*class="[^"]*wp-manga-chapter-img[^"]*"[^>]*src="\s*([^"]+)"[^>]*>/gi;
  let m;
  while ((m = regex.exec(html)) !== null) {
    const url = m[1].trim();
    if (url && !url.includes('placeholder') && !seen.has(url)) {
      seen.add(url);
      pages.push({ index: i, url });
      i++;
    }
  }

  // Pattern 2: wp-manga-chapter-img with data-src (lazy loaded)
  if (pages.length === 0) {
    regex = /<img[^>]*class="[^"]*wp-manga-chapter-img[^"]*"[^>]*data-src="\s*([^"]+)"[^>]*>/gi;
    while ((m = regex.exec(html)) !== null) {
      const url = m[1].trim();
      if (url && !url.includes('placeholder') && !seen.has(url)) {
        seen.add(url);
        pages.push({ index: i, url });
        i++;
      }
    }
  }

  // Pattern 3: Any img with data-src containing uploads/WP-manga
  if (pages.length === 0) {
    regex = /<img[^>]*data-src="([^"]*uploads[^"]*WP-manga[^"]*\.(?:jpg|jpeg|png|webp)[^"]*)"/gi;
    while ((m = regex.exec(html)) !== null) {
      const url = m[1].trim();
      if (url && !seen.has(url)) {
        seen.add(url);
        pages.push({ index: i, url });
        i++;
      }
    }
  }

  // Pattern 4: id="image-N" with src or data-src
  if (pages.length === 0) {
    regex = /<img[^>]*id="image-\d+"[^>]*(?:src|data-src)="\s*([^"]+)"[^>]*>/gi;
    while ((m = regex.exec(html)) !== null) {
      const url = m[1].trim();
      if (url && !url.includes('placeholder') && !seen.has(url)) {
        seen.add(url);
        pages.push({ index: i, url });
        i++;
      }
    }
  }

  // Pattern 5: Any img src containing WP-manga/data
  if (pages.length === 0) {
    regex = /<img[^>]*src="([^"]*WP-manga[^"]*data[^"]*\.(?:jpg|jpeg|png|webp)[^"]*)"/gi;
    while ((m = regex.exec(html)) !== null) {
      const url = m[1].trim();
      if (url && !seen.has(url)) {
        seen.add(url);
        pages.push({ index: i, url });
        i++;
      }
    }
  }

  // Pattern 6: Look for image URLs in script tags or data attributes
  if (pages.length === 0) {
    regex = /"(https?:\/\/[^"]*WP-manga\/data\/[^"]*\.(?:jpg|jpeg|png|webp)[^"]*)"/gi;
    while ((m = regex.exec(html)) !== null) {
      const url = m[1].trim();
      if (url && !seen.has(url)) {
        seen.add(url);
        pages.push({ index: i, url });
        i++;
      }
    }
  }

  // Fix URLs
  pages.forEach(p => {
    if (p.url.startsWith('//')) p.url = 'https:' + p.url;
  });

  return {
    statusCode: 200,
    headers: { 'Access-Control-Allow-Origin': '*', 'Content-Type': 'application/json' },
    body: JSON.stringify({ slug, chapter, totalPages: pages.length, pages })
  };
};

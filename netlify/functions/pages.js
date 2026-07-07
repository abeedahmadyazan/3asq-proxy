const { execSync } = require('child_process');

const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';

function curlFetch(url) {
  try {
    return execSync(`curl -sL -A "${UA}" -H "Accept: text/html" --compressed --max-time 20 "${url}"`, { encoding: 'utf-8', timeout: 25000 });
  } catch (e) { return ''; }
}

exports.handler = async (event) => {
  const slug = event.queryStringParameters.slug;
  const chapter = event.queryStringParameters.chapter;
  if (!slug || !chapter) return { statusCode: 400, body: JSON.stringify({ error: 'missing params' }) };

  const html = curlFetch(`https://3asq.pro/manga/${slug}/${chapter}/`);
  const pages = [];
  const regex = /<img[^>]*class="[^"]*wp-manga-chapter-img[^"]*"[^>]*src="\s*([^"]+)"[^>]*>/gi;
  let m; let i = 0;
  while ((m = regex.exec(html)) !== null) {
    const url = m[1].trim();
    if (url && !url.includes('placeholder')) { pages.push({ index: i, url }); i++; }
  }
  if (pages.length === 0) {
    const alt = /<img[^>]*id="image-\d+"[^>]*src="\s*([^"]+)"[^>]*>/gi;
    while ((m = alt.exec(html)) !== null) {
      const url = m[1].trim();
      if (url && !url.includes('placeholder')) { pages.push({ index: i, url }); i++; }
    }
  }

  return {
    statusCode: 200,
    headers: { 'Access-Control-Allow-Origin': '*', 'Content-Type': 'application/json' },
    body: JSON.stringify({ slug, chapter, totalPages: pages.length, pages })
  };
};

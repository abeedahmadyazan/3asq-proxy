const { execSync } = require('child_process');

const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';

function curlFetch(url) {
  try {
    return execSync(`curl -sL -A "${UA}" -H "Accept: text/html" --compressed --max-time 20 "${url}"`, { encoding: 'utf-8', timeout: 25000 });
  } catch (e) { return ''; }
}

exports.handler = async (event) => {
  const slug = event.queryStringParameters.slug;
  if (!slug) return { statusCode: 400, body: JSON.stringify({ error: 'missing slug' }) };

  const html = curlFetch(`https://3asq.pro/manga/${slug}/`);
  let latest = 0;
  const p1 = new RegExp(`href="https?://3asq\\.[a-z]+/manga/${slug}/(\\d+)/?"[^>]*id="btn-read-first"`, 'i');
  const m1 = html.match(p1);
  if (m1) latest = parseInt(m1[1]) || 0;
  if (latest === 0) {
    const p2 = new RegExp(`href="https?://3asq\\.[a-z]+/manga/${slug}/(\\d{1,5})/?"`, 'gi');
    let m;
    while ((m = p2.exec(html)) !== null) { const n = parseInt(m[1]) || 0; if (n > latest) latest = n; }
  }

  if (latest === 0) return { statusCode: 200, body: JSON.stringify({ error: 'no chapters', chapters: [], totalChapters: 0, latestChapter: 0 }) };

  const chapters = [];
  for (let i = latest; i >= 1; i--) {
    chapters.push({ id: String(i), number: String(i), title: `الفصل ${i}`, source: '3asq' });
  }

  return {
    statusCode: 200,
    headers: { 'Access-Control-Allow-Origin': '*', 'Content-Type': 'application/json' },
    body: JSON.stringify({ slug, latestChapter: latest, totalChapters: chapters.length, chapters })
  };
};

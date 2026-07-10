const http = require('http');
const https = require('https');
const { execSync } = require('child_process');

const PORT = process.env.PORT || 3000;
const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';

function curlFetch(url) {
  try {
    return execSync(`curl -sL -A "${UA}" -H "Accept: text/html" --compressed --max-time 20 "${url}"`, {
      encoding: 'utf-8',
      timeout: 25000
    });
  } catch (e) {
    return '';
  }
}

function extractLatestChapter(html, slug) {
  let latest = 0;
  const p1 = new RegExp(`href="https?://3asq\\.[a-z]+/manga/${slug}/(\\d+)/?"[^>]*id="btn-read-first"`, 'i');
  const m1 = html.match(p1);
  if (m1) latest = parseInt(m1[1]) || 0;
  if (latest === 0) {
    const p2 = new RegExp(`href="https?://3asq\\.[a-z]+/manga/${slug}/(\\d{1,5})/?"`, 'gi');
    let m;
    while ((m = p2.exec(html)) !== null) {
      const n = parseInt(m[1]) || 0;
      if (n > latest) latest = n;
    }
  }
  return latest;
}

function extractPages(html) {
  const pages = [];
  const regex = /<img[^>]*class="[^"]*wp-manga-chapter-img[^"]*"[^>]*src="\s*([^"]+)"[^>]*>/gi;
  let m;
  let i = 0;
  while ((m = regex.exec(html)) !== null) {
    const url = m[1].trim();
    if (url && !url.includes('placeholder')) {
      pages.push({ index: i, url: url });
      i++;
    }
  }
  if (pages.length === 0) {
    const alt = /<img[^>]*id="image-\d+"[^>]*src="\s*([^"]+)"[^>]*>/gi;
    while ((m = alt.exec(html)) !== null) {
      const url = m[1].trim();
      if (url && !url.includes('placeholder')) {
        pages.push({ index: i, url: url });
        i++;
      }
    }
  }
  return pages;
}

const server = http.createServer((req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Content-Type', 'application/json; charset=utf-8');

  if (req.method === 'OPTIONS') {
    res.writeHead(200);
    res.end();
    return;
  }

  const url = new URL(req.url, `http://localhost:${PORT}`);

  if (url.pathname === '/chapters') {
    const slug = url.searchParams.get('slug');
    if (!slug) {
      res.writeHead(400);
      res.end(JSON.stringify({ error: 'missing slug' }));
      return;
    }
    const html = curlFetch(`https://3asq.online/manga/${slug}/`);
    const latest = extractLatestChapter(html, slug);
    if (latest === 0) {
      res.writeHead(200);
      res.end(JSON.stringify({ error: 'no chapters', chapters: [], totalChapters: 0, latestChapter: 0 }));
      return;
    }
    const chapters = [];
    for (let i = latest; i >= 1; i--) {
      chapters.push({ id: String(i), number: String(i), title: `الفصل ${i}`, source: '3asq' });
    }
    res.writeHead(200);
    res.end(JSON.stringify({ slug, latestChapter: latest, totalChapters: chapters.length, chapters }));
    return;
  }

  if (url.pathname === '/pages') {
    const slug = url.searchParams.get('slug');
    const chapter = url.searchParams.get('chapter');
    if (!slug || !chapter) {
      res.writeHead(400);
      res.end(JSON.stringify({ error: 'missing params' }));
      return;
    }
    const html = curlFetch(`https://3asq.online/manga/${slug}/${chapter}/`);
    const pages = extractPages(html);
    res.writeHead(200);
    res.end(JSON.stringify({ slug, chapter, totalPages: pages.length, pages }));
    return;
  }

  if (url.pathname === '/health') {
    res.writeHead(200);
    res.end(JSON.stringify({ status: 'ok' }));
    return;
  }

  res.writeHead(404);
  res.end(JSON.stringify({ error: 'not found', endpoints: ['/chapters?slug=', '/pages?slug=&chapter='] }));
});

server.listen(PORT, () => {
  console.log(`3asq proxy running on port ${PORT}`);
});

const { execSync } = require('child_process');

const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';

function curlFetch(url) {
  return execSync(`curl -sL -A "${UA}" -H "Accept: text/html" -H "Accept-Language: ar,en;q=0.9" -H "Referer: https://3asq.online/" --compressed --max-time 25 "${url}"`, { encoding: 'utf-8', timeout: 30000 });
}

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();

  const page = req.query.page || '1';
  const url = page === '1' ? 'https://3asq.online/manga/' : `https://3asq.online/manga/page/${page}/`;
  
  try {
    const html = curlFetch(url);
    const items = [];
    const seen = new Set();
    
    // Extract manga slug + title + cover from the listing HTML
    const pattern = /href="https?:\/\/3asq\.[a-z]+\/manga\/([\w-]+)\/?"[^>]*>[\s\S]{0,500}?<img[^>]+src="([^"]+)"[\s\S]{0,800}?<a[^>]*>([^<]+)<\/a>/gi;
    
    let match;
    while ((match = pattern.exec(html)) !== null) {
      const slug = match[1];
      if (slug === 'feed' || !slug || seen.has(slug)) continue;
      seen.add(slug);
      
      let cover = match[2];
      if (cover.startsWith('//')) cover = 'https:' + cover;
      
      let title = match[3].trim();
      title = title.replace(/&#8211;/g, '—').replace(/&#8217;/g, "'")
                   .replace(/&#8220;/g, '"').replace(/&#8221;/g, '"')
                   .replace(/&amp;/g, '&').replace(/&#038;/g, '&');
      
      if (title) {
        items.push({ id: '3asq-' + slug, title, cover, source: '3asq', status: 'ongoing' });
      }
      if (items.length >= 22) break;
    }
    
    res.json({ page: parseInt(page), items, total: items.length });
  } catch (e) {
    res.status(500).json({ error: e.message, items: [] });
  }
};

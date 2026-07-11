const { execSync } = require('child_process');

const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';

exports.handler = async (event) => {
  const imageUrl = event.queryStringParameters.url;
  if (!imageUrl) return { statusCode: 400, body: 'missing url' };

  try {
    // Download the image server-side (bypasses Cloudflare)
    const buffer = execSync(`curl -sL -A "${UA}" -H "Referer: https://3asq.online/" --max-time 20 "${imageUrl}"`, { timeout: 25000, maxBuffer: 10 * 1024 * 1024 });
    
    // Determine content type
    let contentType = 'image/jpeg';
    if (imageUrl.endsWith('.png')) contentType = 'image/png';
    else if (imageUrl.endsWith('.webp')) contentType = 'image/webp';
    else if (imageUrl.endsWith('.gif')) contentType = 'image/gif';
    
    return {
      statusCode: 200,
      headers: {
        'Content-Type': contentType,
        'Cache-Control': 'public, max-age=86400',
        'Access-Control-Allow-Origin': '*'
      },
      body: buffer.toString('base64'),
      isBase64Encoded: true
    };
  } catch (e) {
    return { statusCode: 500, body: 'image fetch failed: ' + e.message };
  }
};

const { SitemapStream } = require('sitemap');
const { createWriteStream } = require('fs');
const { resolve } = require('path');

const BASE_URL = 'https://physicsnook.com';

// Use path-based routes only (no hashes). Keep these in sync with your Router.
const routes = [
  '/',                // homepage
  '/chaos',
  '/oscillations',
  '/electric-fields',
  '/momentum',
  '/sound',
  '/kinematics',
];

(async function generate() {
  const outPath = resolve(__dirname, 'public', 'sitemap.xml');
  const sitemap = new SitemapStream({ hostname: BASE_URL });
  const writeStream = createWriteStream(outPath);

  sitemap.pipe(writeStream);

  // Add URLs. You can tweak changefreq/priority, and add lastmod if you want.
  const nowISO = new Date().toISOString();
  routes.forEach((url, i) => {
    sitemap.write({
      url,
      changefreq: 'weekly',
      priority: url === '/' ? 1.0 : 0.8,
      lastmod: nowISO,
    });
  });

  sitemap.end();

  await new Promise((res, rej) => {
    writeStream.on('finish', res);
    writeStream.on('error', rej);
  });

  console.log(`✅ sitemap.xml written to ${outPath}`);
})();

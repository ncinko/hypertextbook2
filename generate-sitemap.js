const { SitemapStream, streamToPromise } = require('sitemap');
const { createWriteStream } = require('fs');

// Define your domain
const BASE_URL = 'https://physicsnook.com';

// Define the list of routes manually
const routes = [
    '/',
    '/double-pendulum',
    '/oscillations',
    '/electric-fields',
    '/ideal-gas',
];

async function generateSitemap() {
    const writeStream = createWriteStream('./public/sitemap.xml'); // Ensure the public directory exists
    const sitemapStream = new SitemapStream({ hostname: BASE_URL });

    // Pipe sitemap stream into the file
    sitemapStream.pipe(writeStream);

    for (const route of routes) {
        sitemapStream.write({ url: route, changefreq: 'weekly', priority: 0.8 });
    }

    sitemapStream.end(); // Close the stream properly

    streamToPromise(sitemapStream)
        .then(() => console.log('Sitemap generated successfully!'))
        .catch(console.error);
}

// Run the function
generateSitemap();

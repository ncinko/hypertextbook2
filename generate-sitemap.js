// This script generates a sitemap.xml file for a website with dynamic content.
// It uses the sitemap package to create a stream of URLs and writes them to a file.

const { SitemapStream, streamToPromise } = require('sitemap');
const { createWriteStream } = require('fs');
const axios = require('axios');

// Define your domain
const BASE_URL = 'https://physicsnook.com';

// Define pages manually or fetch dynamically if needed
const pages = [
    '/',
    '/simulations',
    '/oscillations',
    '/about', // Add more as needed
];

// Generate the sitemap
async function generateSitemap() {
    const stream = new SitemapStream({ hostname: BASE_URL });
    const writeStream = createWriteStream('./public/sitemap.xml');

    for (const page of pages) {
        stream.write({ url: page, changefreq: 'weekly', priority: 0.8 });
    }

    stream.end();

    streamToPromise(stream).then(() => {
        console.log('Sitemap generated successfully!');
    }).catch(console.error);
}

generateSitemap();

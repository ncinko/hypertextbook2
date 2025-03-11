const SitemapGenerator = require('sitemap-generator');

// Replace this with your custom domain
const generator = SitemapGenerator('https://physicsnook.com', {
    stripQuerystring: false,
    filepath: './public/sitemap.xml', // Output path
});

// Register event listeners
generator.on('done', () => {
    console.log('Sitemap generated!');
});

// Start the generator
generator.start();

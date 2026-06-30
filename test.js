const { scrapeProductPrice } = require('./src/lib/scraper');
const url = 'https://www.hsnstore.pt/marcas/raw-series/creatina-monoidrato-em-po-200-mesh';

async function test() {
  const price = await scrapeProductPrice(url, '1Kg');
  console.log('Price:', price);
}

test();

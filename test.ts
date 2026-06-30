import * as fs from 'fs';
const envFile = fs.readFileSync('.env.local', 'utf8');
envFile.split('\n').filter(line => line && !line.startsWith('#')).forEach(line => {
  const parts = line.split('=');
  const key = parts[0];
  let val = parts.slice(1).join('=');
  if (val.startsWith('"') && val.endsWith('"')) val = val.slice(1, -1);
  process.env[key] = val;
});

import { scrapeProductPrice } from './src/lib/scraper';

const url = 'https://www.hsnstore.pt/marcas/raw-series/creatina-monoidrato-em-po-200-mesh';

async function test() {
  const price = await scrapeProductPrice(url, '1Kg');
  console.log('Price:', price);
}

test();

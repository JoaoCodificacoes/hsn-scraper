import { extractPriceFromHtml } from './parser';

/**
 * Fetches the raw HTML from a target URL using ScrapingAnt or ScraperAPI proxy.
 *
 * @param targetUrl The URL to scrape.
 * @returns The raw HTML text.
 */
export async function fetchProxyHtml(targetUrl: string): Promise<string> {
  let fetchUrl = targetUrl;
  
  if (process.env.SCRAPINGANT_API_KEY) {
    // browser=false disables headless chrome, significantly reducing latency and preventing 502 Bad Gateway timeouts.
    fetchUrl = `https://api.scrapingant.com/v2/general?url=${encodeURIComponent(targetUrl)}&x-api-key=${process.env.SCRAPINGANT_API_KEY}&browser=false`;
  } else if (process.env.SCRAPER_API_KEY) {
    fetchUrl = `http://api.scraperapi.com?api_key=${process.env.SCRAPER_API_KEY}&url=${encodeURIComponent(targetUrl)}`;
  }
  
  const response = await fetch(fetchUrl, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    },
  });

  if (!response.ok) {
    throw new Error(`Proxy Fetch failed: ${response.status} ${response.statusText}`);
  }

  return response.text();
}

/**
 * High-level orchestration function to scrape a product and get its price.
 */
export async function scrapeProductPrice(url: string): Promise<number | null> {
  const html = await fetchProxyHtml(url);
  return extractPriceFromHtml(html);
}

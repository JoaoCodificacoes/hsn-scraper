import { fetchProxyHtml } from './scraper';

// Mock global fetch
global.fetch = jest.fn();

describe('scraper service', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    jest.resetModules();
    process.env = { ...originalEnv };
    (global.fetch as jest.Mock).mockClear();
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  it('should use ScrapingAnt with browser=false when SCRAPINGANT_API_KEY is present', async () => {
    process.env.SCRAPINGANT_API_KEY = 'sa-key';
    delete process.env.SCRAPER_API_KEY;

    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      text: async () => '<html>fake html</html>'
    });

    const html = await fetchProxyHtml('https://example.com');
    expect(html).toBe('<html>fake html</html>');
    expect(global.fetch).toHaveBeenCalledWith(
      'https://api.scrapingant.com/v2/general?url=https%3A%2F%2Fexample.com&x-api-key=sa-key&browser=false',
      expect.any(Object)
    );
  });

  it('should use ScraperAPI when SCRAPER_API_KEY is present and ScrapingAnt is missing', async () => {
    delete process.env.SCRAPINGANT_API_KEY;
    process.env.SCRAPER_API_KEY = 'sa-api-key';

    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      text: async () => '<html>fake html 2</html>'
    });

    const html = await fetchProxyHtml('https://example.com');
    expect(html).toBe('<html>fake html 2</html>');
    expect(global.fetch).toHaveBeenCalledWith(
      'http://api.scraperapi.com?api_key=sa-api-key&url=https%3A%2F%2Fexample.com',
      expect.any(Object)
    );
  });

  it('should throw an error if fetch fails', async () => {
    process.env.SCRAPINGANT_API_KEY = 'sa-key';

    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: false,
      status: 500,
      statusText: 'Internal Server Error'
    });

    await expect(fetchProxyHtml('https://example.com')).rejects.toThrow('Proxy Fetch failed: 500 Internal Server Error');
  });
});

import { extractPriceFromHtml } from './parser';

describe('extractPriceFromHtml', () => {
  it('should extract the correct price when valid HTML is provided', () => {
    const mockHtml = `
      <html>
        <body>
          <script>
            var productOptions = {"attributes":{"216":{"id":"216","code":"content_weight","label":"Formato","options":[{"id":"873","label":"500g","products":["24141","24233"]},{"id":"883","label":"2Kg","products":["24142"]}]}},"template":"$#{price}","optionPrices":{"24142":{"finalPrice":{"amount":55.99}}}};
          </script>
        </body>
      </html>
    `;
    const price = extractPriceFromHtml(mockHtml);
    expect(price).toBe(55.99);
  });

  it('should return null if the option is not found', () => {
    const mockHtml = `
      <html>
        <body>
          <script>
            var productOptions = {"attributes":{"216":{"id":"216","code":"content_weight","label":"Formato","options":[{"id":"873","label":"500g","products":["24141"]}]}},"template":"$#{price}","optionPrices":{"24141":{"finalPrice":{"amount":19.99}}}};
          </script>
        </body>
      </html>
    `;
    const price = extractPriceFromHtml(mockHtml);
    expect(price).toBeNull();
  });

  it('should return null if HTML is malformed or irrelevant', () => {
    const mockHtml = `<html><body><h1>No data here</h1></body></html>`;
    const price = extractPriceFromHtml(mockHtml);
    expect(price).toBeNull();
  });
});

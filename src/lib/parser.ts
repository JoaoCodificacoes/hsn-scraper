export function extractPriceFromHtml(html: string, weightLabel?: string): number | null {
  const lines = html.split('\n');
  let currentPrice: number | null = null;

  for (let line of lines) {
    if (line.includes('{"attributes":{') && line.includes('content_weight')) {
      line = line.trim();
      const start = line.indexOf('{"attributes":{');
      if (start !== -1) {
        const jsonStr = line.substring(start);
        let count = 0, end = 0;
        for (let i = 0; i < jsonStr.length; i++) {
          if (jsonStr[i] === '{') count++;
          else if (jsonStr[i] === '}') {
            count--;
            if (count === 0) { end = i + 1; break; }
          }
        }
        if (end > 0) {
          try {
            const data = JSON.parse(jsonStr.substring(0, end));
            // Ensure 216 exists (weight attribute)
            if (data.attributes && data.attributes['216']) {
              const weightAttr = data.attributes['216'];
              // If a weightLabel was provided, use it. Otherwise default to the first available option.
              const targetOpt = weightLabel 
                ? weightAttr.options.find((opt: any) => opt.label === weightLabel)
                : weightAttr.options[0];
                
              if (targetOpt && targetOpt.products.length > 0) {
                const pid = targetOpt.products[0];
                if (data.optionPrices && data.optionPrices[pid] && data.optionPrices[pid].finalPrice) {
                  currentPrice = data.optionPrices[pid].finalPrice.amount;
                }
              }
            }
          } catch (err) {
            // Parsing error
          }
        }
      }
    }
  }

  return currentPrice;
}

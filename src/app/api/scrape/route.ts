import { NextResponse } from 'next/server';

export async function GET() {
  try {
    const targetUrl = 'https://www.hsnstore.pt/marcas/sport-series/evowhey-protein';
    
    const response = await fetch(targetUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      },
    });

    if (!response.ok) {
      return NextResponse.json({ error: `Failed to fetch page: ${response.statusText}` }, { status: 500 });
    }

    const html = await response.text();
    const lines = html.split('\n');
    let priceData = null;

    for (let line of lines) {
      if (line.includes('{"attributes":{') && line.includes('content_weight')) {
        line = line.trim();
        const start = line.indexOf('{"attributes":{');
        if (start !== -1) {
          const jsonStr = line.substring(start);
          let count = 0;
          let end = 0;
          for (let i = 0; i < jsonStr.length; i++) {
            if (jsonStr[i] === '{') count++;
            else if (jsonStr[i] === '}') {
              count--;
              if (count === 0) {
                end = i + 1;
                break;
              }
            }
          }

          if (end > 0) {
            try {
              const data = JSON.parse(jsonStr.substring(0, end));
              const weightAttr = data.attributes['216']; // content_weight
              const twokgOpt = weightAttr.options.find((opt: any) => opt.label === '2Kg');
              
              if (twokgOpt) {
                const pid = twokgOpt.products[0]; // first flavor
                const priceInfo = data.optionPrices[pid];
                priceData = {
                  productId: pid,
                  currentPrice: priceInfo.finalPrice.amount,
                  oldPrice: priceInfo.oldPrice.amount,
                };
              }
              break;
            } catch (err) {
              console.error('Error parsing inline JSON:', err);
            }
          }
        }
      }
    }

    if (!priceData) {
      return NextResponse.json({ error: 'Could not extract price data' }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      data: priceData,
      message: `Extracted price for 2Kg: ${priceData.currentPrice} €`
    });

  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

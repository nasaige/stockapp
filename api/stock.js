export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');

  const { symbol } = req.query;
  if (!symbol) return res.status(400).json({ error: 'symbol required' });

  try {
    const url = `https://query2.finance.yahoo.com/v8/finance/chart/${symbol}?interval=1d&range=3mo&corsDomain=finance.yahoo.com`;
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'application/json',
        'Accept-Language': 'en-US,en;q=0.9',
        'Referer': 'https://finance.yahoo.com',
        'Origin': 'https://finance.yahoo.com'
      }
    });

    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const data = await response.json();

    if (!data.chart?.result?.[0]) throw new Error('No data returned');

    const result = data.chart.result[0];
    const meta = result.meta;
    const quotes = result.indicators.quote[0];
    const timestamps = result.timestamp || [];

    const candles = timestamps.map((t, i) => ({
      t: new Date(t * 1000).toLocaleDateString('zh-CN', { month: 'numeric', day: 'numeric' }),
      o: +( quotes.open[i] || 0).toFixed(0),
      h: +( quotes.high[i] || 0).toFixed(0),
      l: +( quotes.low[i] || 0).toFixed(0),
      c: +( quotes.close[i] || 0).toFixed(0),
      v: Math.round((quotes.volume[i] || 0) / 10000),
    })).filter(c => c.c > 0);

    res.status(200).json({
      symbol: meta.symbol,
      price: +meta.regularMarketPrice.toFixed(0),
      open: +(meta.regularMarketOpen || 0).toFixed(0),
      high: +(meta.regularMarketDayHigh || 0).toFixed(0),
      low: +(meta.regularMarketDayLow || 0).toFixed(0),
      prevClose: +(meta.chartPreviousClose || meta.previousClose || 0).toFixed(0),
      volume: Math.round((meta.regularMarketVolume || 0) / 10000),
      currency: meta.currency,
      candles,
    });

  } catch (e) {
    res.status(500).json({ error: e.message });
  }
}

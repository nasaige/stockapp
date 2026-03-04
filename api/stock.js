export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET');

  const { symbol } = req.query;
  if (!symbol) return res.status(400).json({ error: 'symbol required' });

  try {
    const url = `https://query1.finance.yahoo.com/v8/finance/chart/${symbol}?interval=1d&range=3mo`;
    const response = await fetch(url, {
      headers: { 'User-Agent': 'Mozilla/5.0' }
    });
    const data = await response.json();
    const result = data.chart.result[0];
    const meta = result.meta;
    const quotes = result.indicators.quote[0];
    const timestamps = result.timestamp;

    const candles = timestamps.map((t, i) => ({
      t: new Date(t * 1000).toLocaleDateString('zh-CN', { month: 'numeric', day: 'numeric' }),
      o: +quotes.open[i]?.toFixed(0) || 0,
      h: +quotes.high[i]?.toFixed(0) || 0,
      l: +quotes.low[i]?.toFixed(0) || 0,
      c: +quotes.close[i]?.toFixed(0) || 0,
      v: Math.round((quotes.volume[i] || 0) / 10000),
    })).filter(c => c.c > 0);

    res.json({
      symbol: meta.symbol,
      price: +meta.regularMarketPrice.toFixed(0),
      open: +meta.regularMarketOpen?.toFixed(0),
      high: +meta.regularMarketDayHigh?.toFixed(0),
      low: +meta.regularMarketDayLow?.toFixed(0),
      prevClose: +meta.chartPreviousClose?.toFixed(0),
      volume: Math.round(meta.regularMarketVolume / 10000),
      currency: meta.currency,
      candles,
    });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
}

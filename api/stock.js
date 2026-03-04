export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  const { symbol } = req.query;
  try {
    const url = `https://query1.finance.yahoo.com/v8/finance/chart/${symbol}?interval=1d&range=3mo`;
    const response = await fetch(url, { headers: { 'User-Agent': 'Mozilla/5.0' } });
    const data = await response.json();
    const result = data.chart.result[0];
    const quotes = result.indicators.quote[0];
    const candles = result.timestamp.map((t, i) => ({
      t: new Date(t * 1000).toLocaleDateString('zh-CN', { month: 'numeric', day: 'numeric' }),
      c: +quotes.close[i]?.toFixed(0) || 0,
    })).filter(c => c.c > 0);
    res.json({ symbol: result.meta.symbol, price: result.meta.regularMarketPrice, candles });
  } catch (e) { res.status(500).json({ error: e.message }); }
}

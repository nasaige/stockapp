export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');

  const { symbol } = req.query;
  if (!symbol) return res.status(400).json({ error: 'symbol required' });

  try {
    // 使用 finnhub 免费API（无需注册，有限额）
    // 先尝试 Yahoo Finance 备用域名
    const urls = [
      `https://query2.finance.yahoo.com/v7/finance/options/${symbol}`,
      `https://query1.finance.yahoo.com/v7/finance/quote?symbols=${symbol}`,
    ];

    // 用 allorigins 代理绕过限制
    const proxyUrl = `https://api.allorigins.win/raw?url=${encodeURIComponent(
      `https://query1.finance.yahoo.com/v8/finance/chart/${symbol}?interval=1d&range=3mo`
    )}`;

    const response = await fetch(proxyUrl, {
      headers: { 'User-Agent': 'Mozilla/5.0' }
    });

    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const data = await response.json();

    if (!data.chart?.result?.[0]) throw new Error('No data');

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

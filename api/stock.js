import yahooFinance from 'yahoo-finance2';

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  const { symbol } = req.query;
  
  if (!symbol) return res.status(400).json({ error: 'Missing symbol' });

  try {
    // 获取实时行情和历史K线（3个月）
    const queryOptions = { period1: '2025-12-01', interval: '1d' }; // 自动处理时间段
    const result = await yahooFinance.quote(symbol);
    const history = await yahooFinance.chart(symbol, { interval: '1d', range: '3mo' });

    const candles = history.quotes.map(q => ({
      t: new Date(q.date).toLocaleDateString('zh-CN', { month: 'numeric', day: 'numeric' }),
      o: q.open,
      h: q.high,
      l: q.low,
      c: q.close,
      v: Math.round(q.volume / 10000)
    })).filter(c => c.c > 0);

    res.json({
      symbol: result.symbol,
      price: result.regularMarketPrice,
      open: result.regularMarketOpen,
      high: result.regularMarketDayHigh,
      low: result.regularMarketDayLow,
      prevClose: result.regularMarketPreviousClose,
      volume: Math.round(result.regularMarketVolume / 10000),
      currency: result.currency,
      candles: candles
    });
  } catch (e) {
    res.status(500).json({ error: '数据抓取失败: ' + e.message });
  }
}

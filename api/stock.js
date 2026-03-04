export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');

  const { symbol } = req.query;
  if (!symbol) return res.status(400).json({ error: 'symbol required' });

  const API_KEY = 'v9TuvhgAWyILDWb26E2GpbBQPLDFmd8k';

  try {
    const quoteRes = await fetch(
      `https://www.alphavantage.co/query?function=GLOBAL_QUOTE&symbol=${symbol}&apikey=${API_KEY}`
    );
    const quoteData = await quoteRes.json();
    const q = quoteData['Global Quote'];
    if (!q || !q['05. price']) throw new Error('No quote data');

    const histRes = await fetch(
      `https://www.alphavantage.co/query?function=TIME_SERIES_DAILY&symbol=${symbol}&outputsize=compact&apikey=${API_KEY}`
    );
    const histData = await histRes.json();
    const series = histData['Time Series (Daily)'] || {};

    const candles = Object.entries(series)
      .slice(0, 60)
      .reverse()
      .map(([date, v]) => ({
        t: date.slice(5),
        o: +parseFloat(v['1. open']).toFixed(0),
        h: +parseFloat(v['2. high']).toFixed(0),
        l: +parseFloat(v['3. low']).toFixed(0),
        c: +parseFloat(v['4. close']).toFixed(0),
        v: Math.round(parseInt(v['5. volume']) / 10000),
      }));

    const price = parseFloat(q['05. price']);
    const prevClose = parseFloat(q['08. previous close']);

    res.status(200).json({
      symbol: q['01. symbol'],
      price: +price.toFixed(2),
      open: +parseFloat(q['02. open']).toFixed(2),
      high: +parseFloat(q['03. high']).toFixed(2),
      low: +parseFloat(q['04. low']).toFixed(2),
      prevClose: +prevClose.toFixed(2),
      volume: Math.round(parseInt(q['06. volume']) / 10000),
      currency: symbol.includes('.KS') ? 'KRW' : 'USD',
      candles,
    });

  } catch (e) {
    res.status(500).json({ error: e.message });
  }
}

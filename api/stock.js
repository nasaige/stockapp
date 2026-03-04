export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');

  const { symbol, type } = req.query;
  const API_KEY = 'LHJ3GFM8QIKDI3RD';

  // FX汇率接口 — 顺序请求避免超限
  if (type === 'fx') {
    const pairs = [
      { from: 'USD', to: 'CNY', label: '美元/人民币' },
      { from: 'USD', to: 'KRW', label: '美元/韩元' },
      { from: 'USD', to: 'JPY', label: '美元/日元' },
      { from: 'HKD', to: 'CNY', label: '港币/人民币' },
    ];
    const results = [];
    for (const p of pairs) {
      try {
        const r = await fetch(
          `https://www.alphavantage.co/query?function=CURRENCY_EXCHANGE_RATE&from_currency=${p.from}&to_currency=${p.to}&apikey=${API_KEY}`
        );
        const d = await r.json();
        const rate = d['Realtime Currency Exchange Rate'];
        results.push({
          pair: `${p.from}/${p.to}`,
          label: p.label,
          val: rate ? parseFloat(rate['5. Exchange Rate']) : null,
        });
        // 每次请求间隔300ms避免超限
        await new Promise(r => setTimeout(r, 300));
      } catch (e) {
        results.push({ pair: `${p.from}/${p.to}`, label: p.label, val: null });
      }
    }
    return res.status(200).json(results);
  }

  if (!symbol) return res.status(400).json({ error: 'symbol required' });

  try {
    // 顺序请求，避免同时触发限制
    const qRes = await fetch(
      `https://www.alphavantage.co/query?function=GLOBAL_QUOTE&symbol=${symbol}&apikey=${API_KEY}`
    );
    const qData = await qRes.json();

    // 检查是否超限
    if (qData.Note || qData.Information) {
      return res.status(429).json({ error: '请求频率超限，请1分钟后重试' });
    }

    const q = qData['Global Quote'];
    if (!q || !q['05. price']) {
      return res.status(404).json({ error: `不支持该股票代码：${symbol}` });
    }

    await new Promise(r => setTimeout(r, 300));

    const hRes = await fetch(
      `https://www.alphavantage.co/query?function=TIME_SERIES_DAILY&symbol=${symbol}&outputsize=compact&apikey=${API_KEY}`
    );
    const hData = await hRes.json();
    const series = hData['Time Series (Daily)'] || {};

    const candles = Object.entries(series).slice(0, 60).reverse().map(([date, v]) => ({
      t: date.slice(5),
      o: parseFloat(v['1. open']),
      h: parseFloat(v['2. high']),
      l: parseFloat(v['3. low']),
      c: parseFloat(v['4. close']),
      v: Math.round(parseInt(v['5. volume']) / 10000),
    }));

    let currency = 'USD';
    if (symbol.endsWith('.KS')) currency = 'KRW';
    else if (symbol.endsWith('.T')) currency = 'JPY';
    else if (symbol.endsWith('.HK')) currency = 'HKD';
    else if (symbol.endsWith('.SHH') || symbol.endsWith('.SHZ')) currency = 'CNY';

    res.status(200).json({
      symbol: q['01. symbol'],
      price: parseFloat(q['05. price']),
      open: parseFloat(q['02. open']),
      high: parseFloat(q['03. high']),
      low: parseFloat(q['04. low']),
      prevClose: parseFloat(q['08. previous close']),
      chgAbs: parseFloat(q['09. change']),
      chgPct: parseFloat((q['10. change percent'] || '0%').replace('%', '')),
      volume: Math.round(parseInt(q['06. volume']) / 10000),
      latestDay: q['07. latest trading day'],
      currency,
      candles,
    });

  } catch (e) {
    res.status(500).json({ error: e.message });
  }
}

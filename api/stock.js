export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');

  const { symbol, type } = req.query;
  const API_KEY = LHJ3GFM8QIKDI3RD'你的新Key';  // ← 换成你重新生成的Key

  if (type === 'fx') {
    const pairs = [
      { from: 'USD', to: 'CNY', label: '美元/人民币' },
      { from: 'USD', to: 'KRW', label: '美元/韩元' },
      { from: 'USD', to: 'JPY', label: '美元/日元' },
      { from: 'HKD', to: 'CNY', label: '港币/人民币' },
    ];
    try {
      const results = await Promise.all(pairs.map(async (p) => {
        const r = await fetch(
          `https://www.alphavantage.co/query?function=CURRENCY_EXCHANGE_RATE&from_currency=${p.from}&to_currency=${p.to}&apikey=${API_KEY}`
        );
        const d = await r.json();
        const rate = d['Realtime Currency Exchange Rate'];
        return {
          pair: `${p.from}/${p.to}`,
          label: p.label,
          val: rate ? parseFloat(rate['5. Exchange Rate']) : null,
        };
      }));
      return res.status(200).json(results);
    } catch (e) {
      return res.status(500).json({ error: e.message });
    }
  }

  if (!symbol) return res.status(400).json({ error: 'symbol required' });

  try {
    const [qRes, hRes] = await Promise.all([
      fetch(`https://www.alphavantage.co/query?function=GLOBAL_QUOTE&symbol=${symbol}&apikey=${API_KEY}`),
      fetch(`https://www.alphavantage.co/query?function=TIME_SERIES_DAILY&symbol=${symbol}&outputsize=compact&apikey=${API_KEY}`)
    ]);

    const qData = await qRes.json();
    const hData = await hRes.json();
    const q = qData['Global Quote'];

    if (!q || !q['05. price']) {
      const msg = qData.Note ? '请求过于频繁，请1分钟后重试' : '股票代码不支持或无数据';
      throw new Error(msg);
    }

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

/* ========================================
   CLOUDFLARE FUNCTION - PROXY SEGURO
   Auricchio - Monitor de Ações
   ✅ YAHOO FINANCE — gratuito, sem key, sem limite de tickers
======================================== */

export async function onRequest(context) {
  const { request } = context;

  // ========== 1. CORS ==========
  const origin = request.headers.get('Origin');

  const allowedOrigins = [
    'https://auricchio.pages.dev',
  ];

  const isAllowedOrigin =
    !origin
    || allowedOrigins.includes(origin)
    || origin.startsWith('http://localhost')
    || origin.startsWith('http://127.0.0.1');

  if (!isAllowedOrigin && request.method !== 'OPTIONS') {
    return new Response(JSON.stringify({
      error: 'Acesso negado - origem não autorizada'
    }), {
      status: 403,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  const corsHeaders = {
    'Access-Control-Allow-Origin': origin || '*',
    'Access-Control-Allow-Methods': 'GET, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
  };

  if (request.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  // ========== 2. VALIDAÇÃO DE PARÂMETROS ==========
  const url     = new URL(request.url);
  const tickers = url.searchParams.get('tickers');

  if (!tickers) {
    return new Response(JSON.stringify({
      error: 'Parâmetro tickers é obrigatório'
    }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }

  if (!/^[A-Z0-9,]+$/i.test(tickers)) {
    return new Response(JSON.stringify({
      error: 'Tickers inválidos'
    }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }

  // ========== 3. CHAMADA AO YAHOO FINANCE ==========
  try {
    const tickerList   = tickers.split(',');
    const yahooTickers = tickerList.map(t => `${t.trim()}.SA`).join(',');

    const apiUrl = `https://query2.finance.yahoo.com/v8/finance/quote?symbols=${yahooTickers}`;

    console.log('🌐 Chamando Yahoo Finance com', tickerList.length, 'tickers');

    // Headers completos para o Yahoo Finance não bloquear chamadas server-side
    const response = await fetch(apiUrl, {
      headers: {
        'User-Agent':      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept':          'application/json, text/plain, */*',
        'Accept-Language': 'pt-BR,pt;q=0.9,en-US;q=0.8,en;q=0.7',
        'Accept-Encoding': 'gzip, deflate, br',
        'Origin':          'https://finance.yahoo.com',
        'Referer':         'https://finance.yahoo.com/',
      }
    });

    if (!response.ok) {
      const body = await response.text();
      console.error('❌ Yahoo Finance HTTP', response.status, body.slice(0, 200));
      throw new Error(`Erro Yahoo Finance: ${response.status}`);
    }

    const data   = await response.json();
    const quotes = data?.quoteResponse?.result;

    if (!quotes || quotes.length === 0) {
      throw new Error('Nenhum dado retornado pelo Yahoo Finance');
    }

    // Normaliza para o mesmo formato que o app.js espera
    const results = quotes.map(q => ({
      symbol:              q.symbol.replace('.SA', ''),
      shortName:           q.shortName || '',
      longName:            q.longName  || '',
      regularMarketPrice:  q.regularMarketPrice         ?? null,
      regularMarketChange: q.regularMarketChangePercent ?? 0,
      fiftyTwoWeekHigh:    q.fiftyTwoWeekHigh           ?? null,
      fiftyTwoWeekLow:     q.fiftyTwoWeekLow            ?? null,
      priceEarnings:       q.trailingPE                 ?? null,
      defaultKeyStatistics: {
        priceToBook:   q.priceToBook   ?? null,
        dividendYield: q.dividendYield != null ? q.dividendYield * 100 : null,
      }
    }));

    console.log('✅ Retornados', results.length, 'resultados');

    return new Response(JSON.stringify({ results }), {
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/json',
        'Cache-Control': 'public, max-age=300',
      }
    });

  } catch (error) {
    console.error('💥 Erro no proxy:', error);

    return new Response(JSON.stringify({
      error: 'Erro ao buscar dados das ações',
      details: error.message
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
}

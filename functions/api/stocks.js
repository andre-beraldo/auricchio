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
    !origin                                      // same-origin: browser omite o header
    || allowedOrigins.includes(origin)           // match exato de origem autorizada
    || origin.startsWith('http://localhost')      // qualquer porta local (dev)
    || origin.startsWith('http://127.0.0.1');     // idem via IP

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
    // Yahoo Finance exige sufixo .SA para ações brasileiras (B3)
    const tickerList   = tickers.split(',');
    const yahooTickers = tickerList.map(t => `${t.trim()}.SA`).join(',');

    const apiUrl = `https://query1.finance.yahoo.com/v7/finance/quote?symbols=${yahooTickers}&fields=regularMarketPrice,regularMarketChange,regularMarketChangePercent,fiftyTwoWeekHigh,fiftyTwoWeekLow,trailingPE,priceToBook,dividendYield,shortName,longName`;

    console.log('🌐 Chamando Yahoo Finance com', tickerList.length, 'tickers');

    const response = await fetch(apiUrl, {
      headers: {
        // Header necessário para o Yahoo Finance não rejeitar a requisição
        'User-Agent': 'Mozilla/5.0',
      }
    });

    if (!response.ok) {
      throw new Error('Erro Yahoo Finance: ' + response.status);
    }

    const data   = await response.json();
    const quotes = data?.quoteResponse?.result;

    if (!quotes || quotes.length === 0) {
      throw new Error('Nenhum dado retornado pelo Yahoo Finance');
    }

    // Mapeia o formato do Yahoo Finance para o formato que o app.js espera
    // (mesmo contrato da BRAPI — sem precisar mudar nada no app.js)
    const results = quotes.map(q => ({
      symbol:              q.symbol.replace('.SA', ''),    // remove sufixo .SA
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

/* ========================================
   CLOUDFLARE FUNCTION - HISTÓRICO DE PREÇOS
   Auricchio - Monitor de Ações
   Rota: /api/stocks/history?ticker=TOTS3
======================================== */

export async function onRequest(context) {
  const { request, env } = context;

  // ========== 1. CORS ==========
  const origin  = request.headers.get('Origin');
  const referer = request.headers.get('Referer');

  const allowedOrigins = [
    'https://auricchio.pages.dev',
  ];

  // CORREÇÃO: requisições same-origin não enviam header Origin (é null).
  // Antes isso causava 403 silencioso, deixando Valorização 12M/Mês sempre N/A.
  const isAllowedOrigin =
    !origin                                        // same-origin: browser omite o header
    || allowedOrigins.includes(origin)             // match exato de origem autorizada
    || origin.startsWith('http://localhost')        // qualquer porta local (dev)
    || origin.startsWith('http://127.0.0.1');       // idem via IP

  if (!isAllowedOrigin && request.method !== 'OPTIONS') {
    return new Response(JSON.stringify({ error: 'Acesso negado - origem não autorizada' }), {
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

  // ========== 2. VALIDAÇÃO ==========
  const url    = new URL(request.url);
  const ticker = url.searchParams.get('ticker');

  if (!ticker) {
    return new Response(JSON.stringify({ error: 'Parâmetro ticker é obrigatório' }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }

  if (!/^[A-Z0-9]+$/i.test(ticker)) {
    return new Response(JSON.stringify({ error: 'Ticker inválido' }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }

  // ========== 3. CHAMADA À BRAPI ==========
  try {
    const API_KEY = env.BRAPI_API_KEY;

    if (!API_KEY) {
      console.error('❌ BRAPI_API_KEY não configurada!');
      return new Response(JSON.stringify({ error: 'API key não configurada' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    const apiUrl = `https://brapi.dev/api/quote/${ticker}?range=1y&interval=1mo&token=${API_KEY}`;

    console.log('🌐 Buscando histórico de', ticker);
    const response = await fetch(apiUrl);

    if (!response.ok) {
      throw new Error('Erro brapi.dev: ' + response.status);
    }

    const data = await response.json();

    console.log('✅ Histórico de', ticker, 'retornado com sucesso');

    return new Response(JSON.stringify(data), {
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/json',
        'Cache-Control': 'public, max-age=3600', // 1h — histórico muda pouco
      }
    });

  } catch (error) {
    console.error('💥 Erro ao buscar histórico:', error);

    return new Response(JSON.stringify({
      error: 'Erro ao buscar histórico da ação',
      details: error.message
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
}

/* ========================================
   CLOUDFLARE FUNCTION - PROXY SEGURO
   Auricchio - Monitor de Ações
   ✅ BRAPI — 1 ticker por requisição (plano free)
======================================== */

export async function onRequest(context) {
  const { request, env } = context;

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

  // ========== 2. VALIDAÇÃO ==========
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

  // ========== 3. CHAMADA À BRAPI ==========
  try {
    const API_KEY = env.BRAPI_API_KEY;

    if (!API_KEY) {
      console.error('❌ BRAPI_API_KEY não configurada!');
      return new Response(JSON.stringify({
        error: 'API key não configurada'
      }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Plano free da BRAPI aceita 1 ticker por requisição
    const apiUrl = `https://brapi.dev/api/quote/${tickers}?token=${API_KEY}&fundamental=true&modules=defaultKeyStatistics`;

    console.log('🌐 Chamando BRAPI para', tickers);
    const response = await fetch(apiUrl);

    if (!response.ok) {
      const body = await response.text();
      console.error('❌ BRAPI HTTP', response.status, body.slice(0, 200));
      throw new Error(`Erro BRAPI: ${response.status}`);
    }

    const data = await response.json();

    if (data.error) {
      throw new Error(data.message || 'Erro retornado pela BRAPI');
    }

    console.log('✅ BRAPI retornou', data.results?.length || 0, 'resultado(s)');

    return new Response(JSON.stringify(data), {
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

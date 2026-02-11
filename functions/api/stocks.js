/* ========================================
   CLOUDFLARE FUNCTION - PROXY SEGURO V3
   Seguro, Validado e Corrigido
======================================== */

export async function onRequest(context) {
  const { request, env } = context;

  // ========================================
  // 1. CORS SEGURO (ORIGIN EXATO)
  // ========================================

  const origin = request.headers.get('Origin');

  const allowedOrigins = [
    'https://auricchio.pages.dev',
    'http://localhost:3000',
  ];

  const isAllowedOrigin = allowedOrigins.includes(origin);

  // Permite preflight OPTIONS sempre
  if (request.method === 'OPTIONS') {
    return new Response(null, {
      headers: {
        'Access-Control-Allow-Origin': origin || '',
        'Access-Control-Allow-Methods': 'GET, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type',
      }
    });
  }

  // Bloqueia origens não autorizadas
  if (!isAllowedOrigin) {
    return new Response(JSON.stringify({
      error: 'Acesso negado - origem não autorizada'
    }), {
      status: 403,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  const corsHeaders = {
    'Access-Control-Allow-Origin': origin,
    'Access-Control-Allow-Methods': 'GET, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
  };

  // ========================================
  // 2. VALIDAÇÃO DE PARÂMETROS
  // ========================================

  const url = new URL(request.url);
  const tickersParam = url.searchParams.get('tickers');

  if (!tickersParam) {
    return new Response(JSON.stringify({
      error: 'Parâmetro tickers é obrigatório'
    }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }

  // Permite apenas letras, números e vírgula
  if (!/^[A-Z0-9,]+$/i.test(tickersParam)) {
    return new Response(JSON.stringify({
      error: 'Tickers inválidos'
    }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }

  const tickerList = tickersParam
    .split(',')
    .map(t => t.trim().toUpperCase())
    .filter(Boolean);

  if (tickerList.length > 15) {
    return new Response(JSON.stringify({
      error: 'Máximo de 15 tickers por requisição'
    }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }

  // ========================================
  // 3. NORMALIZAÇÃO (.SA AUTOMÁTICO)
  // ========================================

  const formattedTickers = tickerList
    .map(t => t.endsWith('.SA') ? t : `${t}.SA`)
    .join(',');

  // ========================================
  // 4. CHAMADA À BRAPI
  // ========================================

  try {
    const API_KEY = env.BRAPI_API_KEY;

    if (!API_KEY) {
      return new Response(JSON.stringify({
        error: 'API key não configurada'
      }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    const apiUrl = `https://brapi.dev/api/quote/${formattedTickers}?token=${API_KEY}&fundamental=true`;

    const response = await fetch(apiUrl);

    if (!response.ok) {
      throw new Error(`Erro na BRAPI: ${response.status}`);
    }

    const data = await response.json();

    return new Response(JSON.stringify(data), {
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/json',
        'Cache-Control': 'public, max-age=300'
      }
    });

  } catch (error) {
    console.error('Erro no proxy:', error);

    return new Response(JSON.stringify({
      error: 'Erro ao buscar dados das ações',
      details: error.message
    }), {
      status: 500,
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/json'
      }
    });
  }
}

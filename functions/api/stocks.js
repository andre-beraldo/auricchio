/* ========================================
   CLOUDFLARE FUNCTION - PROXY SEGURO
   Auricchio - Monitor de Ações
   ✅ VERSÃO CORRIGIDA E TESTADA
======================================== */

export async function onRequest(context) {
  const { request, env } = context;
  
  // ========== 1. CORS ==========
  const origin = request.headers.get('Origin');
  const referer = request.headers.get('Referer');
  
  const allowedOrigins = [
    'https://auricchio.pages.dev',
    'http://localhost:3000',
    'http://127.0.0.1:3000'
  ];
  
  const isAllowedOrigin = allowedOrigins.some(allowed => 
    origin?.includes(allowed) || referer?.includes(allowed)
  );
  
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
  const url = new URL(request.url);
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

  const tickerList = tickers.split(',');
  if (tickerList.length > 15) {
    return new Response(JSON.stringify({ 
      error: 'Máximo de 15 tickers por requisição' 
    }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }

  // ========== 3. LOGGING ==========
  const ip = request.headers.get('CF-Connecting-IP');
  console.log('📊 Requisição de', ip, 'para', tickerList.length, 'tickers');

  // ========== 4. CHAMADA À API BRAPI ==========
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

    const apiUrl = `https://brapi.dev/api/quote/${tickers}?token=${API_KEY}&fundamental=true`;
    
    console.log('🌐 Chamando brapi.dev com', tickerList.length, 'tickers');
    const response = await fetch(apiUrl);

    if (!response.ok) {
      console.error('❌ Erro brapi.dev: HTTP', response.status);
      throw new Error('Erro na API brapi.dev: ' + response.status);
    }

    const data = await response.json();
    
    console.log('✅ Retornados', data.results?.length || 0, 'resultados');

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
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/json'
      }
    });
  }
}

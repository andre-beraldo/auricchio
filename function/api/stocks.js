/* ========================================
   CLOUDFLARE FUNCTION - PROXY SEGURO V2
   Com Rate Limiting e Proteções
======================================== */

export async function onRequest(context) {
  const { request, env } = context;
  
  // ========== 1. CORS RESTRITIVO ==========
  const origin = request.headers.get('Origin');
  const referer = request.headers.get('Referer');
  
  // ✅ SUBSTITUA pelos seus domínios reais!
  const allowedOrigins = [
    'https://https://auricchio.pages.dev/',        // ← MUDE AQUI    
    'http://localhost:3000',              // Para testes locais
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

  // Validação: apenas tickers válidos
  if (!/^[A-Z0-9,]+$/i.test(tickers)) {
    return new Response(JSON.stringify({ 
      error: 'Tickers inválidos' 
    }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }

  // Limite de tickers por requisição
  const tickerList = tickers.split(',');
  if (tickerList.length > 15) {
    return new Response(JSON.stringify({ 
      error: 'Máximo de 15 tickers por requisição' 
    }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }

  // ========== 3. RATE LIMITING SIMPLES ==========
  const ip = request.headers.get('CF-Connecting-IP');
  
  // Aqui você poderia adicionar lógica mais robusta com KV
  // Por enquanto, apenas log
  console.log(`Requisição de IP: ${ip} para tickers: ${tickers}`);

  // ========== 4. CHAMADA À API ==========
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

    const apiUrl = `https://brapi.dev/api/quote/${tickers}?token=${API_KEY}&fundamental=true`;
    const response = await fetch(apiUrl);

    if (!response.ok) {
      throw new Error(`Erro na API brapi.dev: ${response.status}`);
    }

    const data = await response.json();

    return new Response(JSON.stringify(data), {
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/json',
        'Cache-Control': 'public, max-age=300', // Cache de 5 minutos
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

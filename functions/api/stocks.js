/* ========================================
   CLOUDFLARE FUNCTION - PROXY SEGURO
   Auricchio - Monitor de Ações
======================================== */

export async function onRequest(context) {
  const { request, env } = context;
  
  // ========== 1. CORS RESTRITIVO ==========
  const origin = request.headers.get('Origin');
  const referer = request.headers.get('Referer');
  
  // ✅ SEUS DOMÍNIOS AUTORIZADOS
  const allowedOrigins = [
    'https://auricchio.pages.dev',        // ✅ CORRIGIDO - URL sem duplicação
    'http://localhost:3000',              // Para testes locais
    'http://127.0.0.1:3000',              // Localhost alternativo
  ];
  
  const isAllowedOrigin = allowedOrigins.some(allowed => 
    origin?.includes(allowed) || referer?.includes(allowed)
  );
  
  // Bloqueia acessos não autorizados
  if (!isAllowedOrigin && request.method !== 'OPTIONS') {
    console.log(`🚫 Acesso negado - Origin: ${origin}, Referer: ${referer}`);
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

  // Responde requisições OPTIONS (preflight)
  if (request.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  // ========== 2. VALIDAÇÃO DE PARÂMETROS ==========
  const url = new URL(request.url);
  const tickers = url.searchParams.get('tickers');
  
  if (!tickers) {
    return new Response(JSON.stringify({ 
      error: 'Parâmetro tickers é obrigatório (ex: ?tickers=PETR4,VALE3)' 
    }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }

  // Validação: apenas letras, números e vírgulas
  if (!/^[A-Z0-9,]+$/i.test(tickers)) {
    return new Response(JSON.stringify({ 
      error: 'Tickers inválidos - use apenas letras, números e vírgulas' 
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

  // ========== 3. LOGGING ==========
  const ip = request.headers.get('CF-Connecting-IP');
  console.log(`📊 Requisição de ${ip} para ${tickerList.length} tickers`);

  // ========== 4. CHAMADA À API BRAPI ==========
  try {
    const API_KEY = env.BRAPI_API_KEY;
    
    if (!API_KEY) {
      console.error('❌ BRAPI_API_KEY não configurada no Cloudflare Pages!');
      return new Response(JSON.stringify({ 
        error: 'API key não configurada - configure BRAPI_API_KEY nas variáveis de ambiente' 
      }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Monta URL da brapi.dev
    const apiUrl = `https://brapi.dev/api/quote/${tickers}?token=${API_KEY}&fundamental=true`;
    
    console.log(`🌐 Chamando brapi.dev com ${tickerList.length} tickers`);
    const response = await fetch(apiUrl);

    if (!response.ok) {
      console.error(`❌ Erro brapi.dev: HTTP ${response.status}`);
      throw new Error(`Erro na API brapi.dev: ${response.status}`);
    }

    const data = await response.json();
    
    console.log(`✅ Retornados ${data.results?.length || 0} resultados`);

    return new Response(JSON.stringify(data), {
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/json',
        'Cache-Control': 'public, max-age=300', // Cache de 5 minutos
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

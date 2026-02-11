export async function onRequest(context) {
  const { request, env } = context;

  // ==========================
  // 🔐 Validação de Origem
  // ==========================
  const origin = request.headers.get("Origin");

  const allowedOrigins = [
    "https://auricchio.pages.dev",
    "http://localhost:3000"
  ];

  // Se existir origin e não for permitido → bloqueia
  if (origin && !allowedOrigins.includes(origin)) {
    return new Response(
      JSON.stringify({ error: "Acesso negado - origem não autorizada" }),
      { status: 403 }
    );
  }

  // ==========================
  // 📥 Ler parâmetros
  // ==========================
  const url = new URL(request.url);
  const tickersParam = url.searchParams.get("tickers");

  if (!tickersParam) {
    return new Response(
      JSON.stringify({ error: "Parâmetro 'tickers' é obrigatório" }),
      { status: 400 }
    );
  }

  // ==========================
  // 🧠 Formatar Tickers
  // ==========================
  const tickerList = tickersParam.split(",");

  const formattedTickers = tickerList
    .map(t =>
      t.toUpperCase().endsWith(".SA")
        ? t.toUpperCase()
        : `${t.toUpperCase()}.SA`
    )
    .join(",");

  // ==========================
  // 🌎 Chamada BRAPI
  // ==========================
  const apiUrl = `https://brapi.dev/api/quote/${formattedTickers}?token=${env.BRAPI_API_KEY}&fundamental=true`;

  try {
    const response = await fetch(apiUrl);
    const data = await response.json();

    if (!response.ok) {
      return new Response(
        JSON.stringify({ error: "Erro ao consultar BRAPI", details: data }),
        { status: 500 }
      );
    }

    // ==========================
    // 📤 Resposta final
    // ==========================
    return new Response(JSON.stringify(data), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": origin || "*"
      }
    });

  } catch (error) {
    return new Response(
      JSON.stringify({ error: "Erro interno no servidor", details: error.message }),
      { status: 500 }
    );
  }
}

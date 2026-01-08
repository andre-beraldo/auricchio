export async function onRequest(context) {
  const url = new URL(context.request.url);
  const ticker = url.searchParams.get('ticker');
  const range = url.searchParams.get('range') || '1d';
  const interval = url.searchParams.get('interval') || '1d';

  if (!ticker) {
    return new Response(JSON.stringify({ error: 'Ticker obrigatório' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  const apiUrl = `https://query1.finance.yahoo.com/v8/finance/chart/${ticker}?range=${range}&interval=${interval}`;

  try {
    const res = await fetch(apiUrl, {
      headers: { 'User-Agent': 'Mozilla/5.0' }
    });

    if (!res.ok) {
      return new Response(JSON.stringify({ error: 'Falha ao buscar dados' }), {
        status: res.status,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const data = await res.json();

    return new Response(JSON.stringify(data), {
      status: 200,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Content-Type': 'application/json'
      }
    });

  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}

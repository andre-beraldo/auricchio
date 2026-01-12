const app = document.getElementById('app');

/* ================= CONFIG ================= */

const API_BASE = 'https://brapi.dev/api/quote';
const API_KEY = '4GPeeg5frU4MAtdp44bEqZ';

const QUOTE_CACHE_KEY = 'quoteCache_v6';
const HISTORY_CACHE_PREFIX = 'historyCache_v2';

const QUOTE_CACHE_TIME = 30 * 60 * 1000;      // 30 min
const HISTORY_CACHE_TIME = 24 * 60 * 60 * 1000; // 24h

const INITIAL_LIMIT = 10;

/* ================= AÇÕES ================= */

const stocks = [
  { ticker: 'ITUB4', name: 'Itaú', sector: 'Bancos' },
  { ticker: 'BBDC4', name: 'Bradesco', sector: 'Bancos' },
  { ticker: 'BBAS3', name: 'Banco do Brasil', sector: 'Bancos' },
  { ticker: 'PETR4', name: 'Petrobras', sector: 'Petróleo' },
  { ticker: 'VALE3', name: 'Vale', sector: 'Mineração' },
  { ticker: 'WEGE3', name: 'WEG', sector: 'Indústria' },
  { ticker: 'ABEV3', name: 'Ambev', sector: 'Bebidas' },
  { ticker: 'RADL3', name: 'Raia Drogasil', sector: 'Saúde' },
  { ticker: 'TOTS3', name: 'Totvs', sector: 'Tecnologia' },
  { ticker: 'EMBR3', name: 'Embraer', sector: 'Aeronáutica' }
];

/* ================= CACHE ================= */

function getCache(key, ttl) {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return null;
    const data = JSON.parse(raw);
    if (Date.now() - data.time < ttl) return data.value;
    return null;
  } catch {
    return null;
  }
}

function setCache(key, value) {
  localStorage.setItem(
    key,
    JSON.stringify({ time: Date.now(), value })
  );
}

/* ================= API ================= */

async function fetchQuote(ticker) {
  try {
    const res = await fetch(`${API_BASE}/${ticker}?token=${API_KEY}`);

    if (!res.ok) {
      console.warn(`Ticker ignorado: ${ticker} (${res.status})`);
      return null;
    }

    const json = await res.json();
    return json.results?.[0] || null;
  } catch (e) {
    console.warn(`Erro de rede: ${ticker}`);
    return null;
  }
}

async function fetchHistory(ticker) {
  const cacheKey = `${HISTORY_CACHE_PREFIX}_${ticker}`;
  const cached = getCache(cacheKey, HISTORY_CACHE_TIME);
  if (cached) return cached;

  try {
    const res = await fetch(
      `${API_BASE}/${ticker}?range=6mo&interval=1d&token=${API_KEY}`
    );

    if (!res.ok) return [];

    const json = await res.json();
    const history = json.results?.[0]?.historicalDataPrice || [];

    setCache(cacheKey, history);
    return history;
  } catch {
    return [];
  }
}

/* ================= MARKET LOGIC ================= */

function calcScore(price, low, high) {
  if (!low || !high || high <= low) return 0.5;
  return (price - low) / (high - low);
}

function getBorder(score) {
  if (score <= 0.33) return 'border-green-500';
  if (score <= 0.66) return 'border-yellow-500';
  return 'border-slate-600';
}

/* ================= GRÁFICO ================= */

function drawChart(canvas, data) {
  if (!data.length) return;

  const ctx = canvas.getContext('2d');
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  const prices = data.map(d => d.close);
  const min = Math.min(...prices);
  const max = Math.max(...prices);

  ctx.strokeStyle = '#22c55e';
  ctx.lineWidth = 2;
  ctx.beginPath();

  prices.forEach((p, i) => {
    const x = (i / (prices.length - 1)) * canvas.width;
    const y = canvas.height - ((p - min) / (max - min)) * canvas.height;
    i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
  });

  ctx.stroke();
}

/* ================= RENDER ================= */

function render(list) {
  app.innerHTML = list.slice(0, INITIAL_LIMIT).map(s => `
    <div class="bg-slate-800 border ${getBorder(s.score)} rounded-xl p-4 mb-4">
      <h2 class="text-lg font-bold">${s.ticker}</h2>
      <p class="text-sm text-slate-300">${s.name}</p>

      <div class="mt-2 h-2 bg-slate-700 rounded">
        <div class="h-2 bg-green-400 rounded" style="width:${(s.score * 100).toFixed(0)}%"></div>
      </div>

      <p class="mt-2 text-sm">
        Preço: R$ ${s.price.toFixed(2)}
      </p>

      <button
        class="mt-3 text-xs text-green-400 underline"
        onclick="loadHistory('${s.ticker}', this)">
        Ver histórico
      </button>

      <canvas
        id="chart-${s.ticker}"
        class="hidden mt-3 w-full"
        height="120">
      </canvas>
    </div>
  `).join('');
}

/* ================= HISTÓRICO ================= */

window.loadHistory = async function (ticker, btn) {
  const canvas = document.getElementById(`chart-${ticker}`);

  if (!canvas.classList.contains('hidden')) {
    canvas.classList.add('hidden');
    btn.textContent = 'Ver histórico';
    return;
  }

  btn.textContent = 'Carregando...';
  btn.disabled = true;

  const data = await fetchHistory(ticker);
  if (data.length) {
    canvas.classList.remove('hidden');
    drawChart(canvas, data);
    btn.textContent = 'Ocultar histórico';
  } else {
    btn.textContent = 'Histórico indisponível';
  }

  btn.disabled = false;
};

/* ================= APP ================= */

async function loadApp() {
  app.innerHTML = '<p class="text-center text-slate-400">Carregando ações...</p>';

  const cached = getCache(QUOTE_CACHE_KEY, QUOTE_CACHE_TIME);
  if (cached) {
    render(cached);
    return;
  }

  const result = [];

  for (const s of stocks) {
    const d = await fetchQuote(s.ticker);
    if (!d || !d.regularMarketPrice) continue;

    result.push({
      ...s,
      price: d.regularMarketPrice,
      score: calcScore(
        d.regularMarketPrice,
        d.regularMarketDayLow,
        d.regularMarketDayHigh
      )
    });
  }

  if (!result.length) {
    app.innerHTML = `
      <p class="text-center text-red-400">
        Falha ao carregar dados da API
      </p>
    `;
    return;
  }

  result.sort((a, b) => a.score - b.score);
  setCache(QUOTE_CACHE_KEY, result);
  render(result);
}

loadApp();

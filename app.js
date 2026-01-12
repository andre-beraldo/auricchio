const app = document.getElementById('app');

/* ================= CONFIG ================= */

const API_BASE = 'https://brapi.dev/api/quote';
const API_KEY = '4GPeeg5frU4MAtdp44bEqZ';

const CACHE_KEY = 'stocksCache_v5';
const HISTORY_CACHE_KEY = 'historyCache_v1';

const CACHE_TIME = 30 * 60 * 1000;
const HISTORY_CACHE_TIME = 24 * 60 * 60 * 1000;

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
  const res = await fetch(`${API_BASE}/${ticker}?token=${API_KEY}`);
  if (!res.ok) throw new Error(res.status);
  const json = await res.json();
  return json.results[0];
}

async function fetchHistory(ticker) {
  const cache = getCache(`${HISTORY_CACHE_KEY}_${ticker}`, HISTORY_CACHE_TIME);
  if (cache) return cache;

  const res = await fetch(
    `${API_BASE}/${ticker}?range=6mo&interval=1d&token=${API_KEY}`
  );

  if (!res.ok) throw new Error(res.status);

  const json = await res.json();
  const prices = json.results[0]?.historicalDataPrice || [];

  setCache(`${HISTORY_CACHE_KEY}_${ticker}`, prices);
  return prices;
}

/* ================= MARKET LOGIC ================= */

function getScore(price, low, high) {
  if (!low || !high || high === low) return 0.5;
  return (price - low) / (high - low);
}

function getBorder(score) {
  if (score <= 0.33) return 'border-green-500';
  if (score <= 0.66) return 'border-yellow-500';
  return 'border-red-500';
}

/* ================= GRÁFICO ================= */

function drawChart(canvas, data) {
  const ctx = canvas.getContext('2d');
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  if (!data.length) return;

  const prices = data.map(p => p.close);
  const min = Math.min(...prices);
  const max = Math.max(...prices);

  ctx.strokeStyle = '#22c55e';
  ctx.lineWidth = 2;
  ctx.beginPath();

  prices.forEach((price, i) => {
    const x = (i / (prices.length - 1)) * canvas.width;
    const y = canvas.height - ((price - min) / (max - min)) * canvas.height;
    i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
  });

  ctx.stroke();
}

/* ================= RENDER ================= */

function render(list) {
  app.innerHTML = list.slice(0, INITIAL_LIMIT).map(s => `
    <div class="bg-slate-800 border ${getBorder(s.score)} rounded-xl p-4 mb-4">
      <h2 class="text-xl font-bold">${s.ticker}</h2>
      <p class="text-sm">${s.name}</p>

      <div class="mt-3 h-2 bg-slate-700 rounded">
        <div class="h-2 bg-green-400 rounded" style="width:${(s.score * 100).toFixed(0)}%"></div>
      </div>

      <p class="mt-2 text-sm">Preço: R$ ${s.price.toFixed(2)}</p>

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
  btn.textContent = 'Carregando...';
  btn.disabled = true;

  try {
    const data = await fetchHistory(ticker);
    const canvas = document.getElementById(`chart-${ticker}`);
    canvas.classList.remove('hidden');
    drawChart(canvas, data);
    btn.textContent = 'Ocultar histórico';
  } catch {
    btn.textContent = 'Erro ao carregar';
  }
};

/* ================= APP ================= */

async function loadApp() {
  app.innerHTML = '<p class="text-center text-slate-400">Carregando dados...</p>';

  try {
    const cached = getCache(CACHE_KEY, CACHE_TIME);
    if (cached) return render(cached);

    const data = [];

    for (const s of stocks) {
      const d = await fetchQuote(s.ticker);
      data.push({
        ...s,
        price: d.regularMarketPrice,
        score: getScore(
          d.regularMarketPrice,
          d.regularMarketDayLow,
          d.regularMarketDayHigh
        )
      });
    }

    data.sort((a, b) => a.score - b.score);
    setCache(CACHE_KEY, data);
    render(data);

  } catch (e) {
    console.error(e);
    app.innerHTML = `
      <p class="text-center text-red-400">
        Falha ao carregar dados da API
      </p>
    `;
  }
}

loadApp();

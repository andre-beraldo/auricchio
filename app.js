const app = document.getElementById('app');

/* ================= CONFIG ================= */

const API_BASE = 'https://brapi.dev/api/quote';
const API_KEY = '4GPeeg5frU4MAtdp44bEqZ';

const CACHE_QUOTES = 'stocks_quotes_v1';
const CACHE_HISTORY_PREFIX = 'stocks_history_';
const CACHE_QUOTES_TIME = 30 * 60 * 1000; // 30 min
const CACHE_HISTORY_TIME = 24 * 60 * 60 * 1000; // 24h

const INITIAL_LIMIT = 10;

/* ================= AÇÕES ================= */

const stocks = [
  { ticker: 'ITUB4', name: 'Itaú', sector: 'Bancos', category: 'perene' },
  { ticker: 'BBDC4', name: 'Bradesco', sector: 'Bancos', category: 'perene' },
  { ticker: 'BBAS3', name: 'Banco do Brasil', sector: 'Bancos', category: 'perene' },
  { ticker: 'PETR4', name: 'Petrobras', sector: 'Petróleo', category: 'ciclica' },
  { ticker: 'VALE3', name: 'Vale', sector: 'Mineração', category: 'ciclica' },
  { ticker: 'WEGE3', name: 'WEG', sector: 'Indústria', category: 'perene' },
  { ticker: 'ABEV3', name: 'Ambev', sector: 'Bebidas', category: 'perene' },
  { ticker: 'RADL3', name: 'Raia Drogasil', sector: 'Saúde', category: 'perene' },
  { ticker: 'TOTS3', name: 'Totvs', sector: 'Tecnologia', category: 'perene' },
  { ticker: 'EMBR3', name: 'Embraer', sector: 'Aeronáutica', category: 'ciclica' }
];

/* ================= VALUATION ================= */

function discountRate(category) {
  return category === 'perene' ? 0.12 : 0.20;
}

function targetPrice(price, category) {
  return price * (1 - discountRate(category));
}

function discountPercent(price, target) {
  return ((target - price) / target) * 100;
}

function borderColor(discount) {
  if (discount >= 16.6) return 'border-green-500';
  if (discount >= 8.3) return 'border-yellow-500';
  return 'border-slate-700';
}

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

async function fetchQuotes() {
  const cached = getCache(CACHE_QUOTES, CACHE_QUOTES_TIME);
  if (cached) return cached;

  const symbols = stocks.map(s => s.ticker).join(',');
  const res = await fetch(`${API_BASE}/${symbols}?token=${API_KEY}`);
  if (!res.ok) throw new Error('API error');

  const json = await res.json();
  setCache(CACHE_QUOTES, json.results);
  return json.results;
}

async function fetchHistory(ticker) {
  const key = CACHE_HISTORY_PREFIX + ticker;
  const cached = getCache(key, CACHE_HISTORY_TIME);
  if (cached) return cached;

  const res = await fetch(
    `${API_BASE}/${ticker}?range=6mo&interval=1d&token=${API_KEY}`
  );

  if (!res.ok) return [];

  const json = await res.json();
  const history = json.results?.[0]?.historicalDataPrice || [];

  setCache(key, history);
  return history;
}

/* ================= GRÁFICO ================= */

function drawChart(canvas, history) {
  if (!history.length) return;

  const ctx = canvas.getContext('2d');
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  const prices = history.map(p => p.close);
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
    <div class="relative bg-slate-800 border ${borderColor(s.discount)} rounded-xl p-4 mb-4">
      
      <button
        onclick="toggleChart('${s.ticker}')"
        class="absolute top-3 right-3 text-slate-400 text-sm">
        📈
      </button>

      <h2 class="text-xl font-bold">${s.ticker}</h2>
      <p class="text-sm">${s.name}</p>
      <p class="text-xs text-slate-400">${s.sector}</p>

      <p class="mt-2 text-sm">
        Preço atual: <strong>R$ ${s.price.toFixed(2)}</strong>
      </p>

      <p class="text-sm text-slate-400">
        Preço-alvo (${(discountRate(s.category) * 100).toFixed(0)}%): 
        R$ ${s.target.toFixed(2)}
      </p>

      <p class="mt-1 font-semibold">
        ${s.discount.toFixed(1)}% abaixo do preço-alvo
      </p>

      <div id="chart-${s.ticker}" class="hidden mt-4">
        <canvas height="120"></canvas>
      </div>
    </div>
  `).join('');
}

/* ================= INTERAÇÃO ================= */

window.toggleChart = async function (ticker) {
  const box = document.getElementById(`chart-${ticker}`);
  const canvas = box.querySelector('canvas');

  if (!box.classList.contains('hidden')) {
    box.classList.add('hidden');
    return;
  }

  box.classList.remove('hidden');

  if (canvas.dataset.loaded) return;

  const history = await fetchHistory(ticker);
  drawChart(canvas, history);
  canvas.dataset.loaded = 'true';
};

/* ================= APP ================= */

async function loadApp() {
  app.innerHTML = '<p class="text-center text-slate-400">Carregando ações...</p>';

  try {
    const quotes = await fetchQuotes();
    const result = [];

    for (const s of stocks) {
      const q = quotes.find(r => r.symbol === s.ticker);
      if (!q || !q.regularMarketPrice) continue;

      const target = targetPrice(q.regularMarketPrice, s.category);
      const discount = discountPercent(q.regularMarketPrice, target);

      result.push({
        ...s,
        price: q.regularMarketPrice,
        target,
        discount
      });
    }

    result.sort((a, b) => b.discount - a.discount);
    render(result);

  } catch {
    app.innerHTML = '<p class="text-center text-red-400">Falha ao carregar dados da API</p>';
  }
}

loadApp();

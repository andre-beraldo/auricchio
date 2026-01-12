const app = document.getElementById('app');

/* ================= CONFIG ================= */

const API_BASE = 'https://brapi.dev/api/quote';
const API_KEY = '4GPeeg5frU4MAtdp44bEqZ';
const CACHE_KEY = 'stocksCache_market_safe';
const CACHE_TIME = 30 * 60 * 1000;
const INITIAL_LIMIT = 10;
const REQUEST_DELAY = 350; // ms entre requisições (ANTI-429)

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

/* ================= MERCADO ================= */

function margin(category) {
  return category === 'perene' ? 0.15 : 0.25;
}

function borderColor(discount) {
  if (discount >= 16.6) return 'border-green-500';
  if (discount >= 8.3) return 'border-yellow-500';
  return 'border-slate-700';
}

const brl = v => `R$ ${v.toFixed(2)}`;

/* ================= CACHE ================= */

function getCache() {
  try {
    const raw = localStorage.getItem(CACHE_KEY);
    if (!raw) return null;
    const data = JSON.parse(raw);
    if (Date.now() - data.time < CACHE_TIME) return data.value;
    return null;
  } catch {
    return null;
  }
}

function setCache(value) {
  localStorage.setItem(CACHE_KEY, JSON.stringify({
    time: Date.now(),
    value
  }));
}

/* ================= API (ANTI 429) ================= */

const sleep = ms => new Promise(r => setTimeout(r, ms));

async function fetchOne(ticker) {
  const url = `${API_BASE}/${ticker}?token=${API_KEY}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`API ${res.status}`);
  const json = await res.json();
  return json.results[0];
}

async function fetchAll() {
  const cached = getCache();
  if (cached) return cached;

  const data = [];

  for (const s of stocks) {
    try {
      const d = await fetchOne(s.ticker);
      data.push(d);
      await sleep(REQUEST_DELAY); // ← evita 429
    } catch (e) {
      console.warn('Falha:', s.ticker);
    }
  }

  setCache(data);
  return data;
}

/* ================= RENDER ================= */

function render(list) {
  app.innerHTML = list.slice(0, INITIAL_LIMIT).map(s => `
    <div class="bg-slate-800 border ${borderColor(s.discount)} rounded-xl p-4 mb-4">
      <h2 class="text-xl font-bold">${s.ticker}</h2>
      <p class="text-sm">${s.name}</p>
      <p class="text-xs text-slate-400">${s.sector}</p>

      <p class="mt-2 font-semibold">
        ${s.discount.toFixed(1)}% abaixo do alvo
      </p>

      <p class="text-sm">Preço atual: ${brl(s.price)}</p>
      <p class="text-xs text-slate-400">
        Preço-alvo estimado: ${brl(s.target)}
      </p>
    </div>
  `).join('');
}

/* ================= APP ================= */

async function loadApp() {
  app.innerHTML = '<p class="text-center text-slate-400">Carregando ações...</p>';

  try {
    const api = await fetchAll();

    const result = stocks.map(s => {
      const d = api.find(a => a.symbol === s.ticker);
      if (!d) return null;

      const target = d.regularMarketPrice / (1 - margin(s.category));
      const discount = ((target - d.regularMarketPrice) / target) * 100;

      return {
        ...s,
        price: d.regularMarketPrice,
        target,
        discount
      };
    }).filter(Boolean);

    result.sort((a, b) => b.discount - a.discount);
    render(result);

  } catch (e) {
    console.error(e);
    app.innerHTML = `
      <p class="text-center text-red-400">
        Limite da API atingido. Aguarde alguns minutos.
      </p>
    `;
  }
}

loadApp();

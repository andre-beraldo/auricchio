const app = document.getElementById('app');
const searchInput = document.getElementById('search');

/* ================= CONFIG ================= */

const API_BASE = 'https://brapi.dev/api/quote';
const API_KEY = '4GPeeg5frU4MAtdp44bEqZ'
const CACHE_KEY = 'stocksCache_market_v1';
const CACHE_TIME = 30 * 60 * 1000; // 30 minutos
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

/**
 * Margem de segurança usada para calcular preço-alvo
 * perene = 15%
 * ciclica = 25%
 */
function getMargin(category) {
  return category === 'perene' ? 0.15 : 0.25;
}

/* ================= CORES ================= */

function getBorder(discount) {
  if (discount >= 16.6) return 'border-green-500';
  if (discount >= 8.3) return 'border-yellow-500';
  return 'border-slate-700';
}

/* ================= UTIL ================= */

function formatBRL(v) {
  return `R$ ${v.toFixed(2)}`;
}

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
  localStorage.setItem(
    CACHE_KEY,
    JSON.stringify({ time: Date.now(), value })
  );
}

/* ================= API ================= */

async function fetchStocks() {
  const cached = getCache();
  if (cached) return cached;

  const symbols = stocks.map(s => s.ticker).join(',');
  const url = `${API_BASE}/${symbols}?token=${API_KEY}`;

  const res = await fetch(url);
  if (!res.ok) throw new Error(`API error ${res.status}`);

  const json = await res.json();
  setCache(json.results);
  return json.results;
}

/* ================= RENDER ================= */

function render(list) {
  const visible = list.slice(0, INITIAL_LIMIT);

  app.innerHTML = visible.map(s => `
    <div class="bg-slate-800 border ${getBorder(s.discount)} rounded-xl p-4 mb-4">
      <h2 class="text-xl font-bold text-green-400">${s.ticker}</h2>
      <p class="text-sm">${s.name}</p>
      <p class="text-xs text-slate-400">${s.sector}</p>

      <p class="mt-2 font-semibold">
        ${s.discount.toFixed(1)}% abaixo do preço-alvo
      </p>

      <p class="text-sm">Preço atual: ${formatBRL(s.price)}</p>
      <p class="text-xs text-slate-400">
        Preço-alvo estimado: ${formatBRL(s.target)}
      </p>
    </div>
  `).join('');
}

/* ================= APP ================= */

async function loadApp() {
  app.innerHTML = '<p class="text-center text-slate-400">Carregando ações...</p>';

  try {
    const apiData = await fetchStocks();

    const result = stocks.map(s => {
      const d = apiData.find(r => r.symbol === s.ticker);
      if (!d || !d.regularMarketPrice) return null;

      const margin = getMargin(s.category);

      // PREÇO-ALVO CORRETO (ACIMA DO ATUAL)
      const target = d.regularMarketPrice / (1 - margin);

      const discount =
        ((target - d.regularMarketPrice) / target) * 100;

      return {
        ...s,
        price: d.regularMarketPrice,
        target,
        discount
      };
    }).filter(Boolean);

    result.sort((a, b) => b.discount - a.discount);
    render(result);

  } catch (err) {
    console.error(err);
    app.innerHTML = `
      <p class="text-center text-red-400">
        Falha ao carregar dados da API.
      </p>
    `;
  }
}

loadApp();

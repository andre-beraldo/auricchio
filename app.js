const app = document.getElementById('app');
const searchInput = document.getElementById('search');

/* ================= CONFIG ================= */

const API_BASE = 'https://brapi.dev/api/quote';
const API_KEY = ''; // opcional — cole sua key se quiser
const CACHE_KEY = 'stocksCache_v3';
const CACHE_TIME = 30 * 60 * 1000; // 30 minutos
const INITIAL_LIMIT = 10;

/* ================= AÇÕES BR (40) ================= */

const stocks = [
  { ticker: 'ITUB4', name: 'Itaú', sector: 'Bancos', category: 'perene' },
  { ticker: 'BBDC4', name: 'Bradesco', sector: 'Bancos', category: 'perene' },
  { ticker: 'BBAS3', name: 'Banco do Brasil', sector: 'Bancos', category: 'perene' },
  { ticker: 'SANB11', name: 'Santander', sector: 'Bancos', category: 'perene' },
  { ticker: 'BBSE3', name: 'BB Seguridade', sector: 'Seguros', category: 'perene' },

  { ticker: 'LREN3', name: 'Renner', sector: 'Varejo', category: 'perene' },
  { ticker: 'MGLU3', name: 'Magazine Luiza', sector: 'Varejo', category: 'ciclica' },
  { ticker: 'ASAI3', name: 'Assaí', sector: 'Varejo', category: 'perene' },
  { ticker: 'CRFB3', name: 'Carrefour', sector: 'Varejo', category: 'perene' },

  { ticker: 'EGIE3', name: 'Engie', sector: 'Energia', category: 'perene' },
  { ticker: 'TAEE11', name: 'Taesa', sector: 'Energia', category: 'perene' },
  { ticker: 'CPLE6', name: 'Copel', sector: 'Energia', category: 'perene' },
  { ticker: 'CMIG4', name: 'Cemig', sector: 'Energia', category: 'perene' },

  { ticker: 'PETR4', name: 'Petrobras PN', sector: 'Petróleo', category: 'ciclica' },
  { ticker: 'PETR3', name: 'Petrobras ON', sector: 'Petróleo', category: 'ciclica' },
  { ticker: 'PRIO3', name: 'Prio', sector: 'Petróleo', category: 'ciclica' },

  { ticker: 'VALE3', name: 'Vale', sector: 'Mineração', category: 'ciclica' },
  { ticker: 'GGBR4', name: 'Gerdau', sector: 'Siderurgia', category: 'ciclica' },

  { ticker: 'SUZB3', name: 'Suzano', sector: 'Papel', category: 'ciclica' },
  { ticker: 'KLBN11', name: 'Klabin', sector: 'Papel', category: 'perene' },

  { ticker: 'WEGE3', name: 'WEG', sector: 'Indústria', category: 'perene' },
  { ticker: 'TOTS3', name: 'Totvs', sector: 'Tecnologia', category: 'perene' },

  { ticker: 'ABEV3', name: 'Ambev', sector: 'Bebidas', category: 'perene' },
  { ticker: 'JBSS3', name: 'JBS', sector: 'Alimentos', category: 'ciclica' },

  { ticker: 'RADL3', name: 'Raia Drogasil', sector: 'Saúde', category: 'perene' },
  { ticker: 'FLRY3', name: 'Fleury', sector: 'Saúde', category: 'perene' },

  { ticker: 'CCRO3', name: 'CCR', sector: 'Concessões', category: 'perene' },
  { ticker: 'RAIL3', name: 'Rumo', sector: 'Logística', category: 'ciclica' },

  { ticker: 'MULT3', name: 'Multiplan', sector: 'Shoppings', category: 'perene' },
  { ticker: 'IGTI11', name: 'Iguatemi', sector: 'Shoppings', category: 'perene' },

  { ticker: 'EMBR3', name: 'Embraer', sector: 'Aeronáutica', category: 'ciclica' },
  { ticker: 'SBSP3', name: 'Sabesp', sector: 'Saneamento', category: 'perene' },
  { ticker: 'UGPA3', name: 'Ultrapar', sector: 'Distribuição', category: 'perene' },
  { ticker: 'SLCE3', name: 'SLC Agrícola', sector: 'Agro', category: 'ciclica' }
];

/* ================= UTIL ================= */

function getDiscountRate(category) {
  return category === 'perene' ? 0.12 : 0.20;
}

/* NOVA REGRA DE CORES */
function getBorder(discount) {
  if (discount >= 16.6) return 'border-green-500';
  if (discount >= 8.3) return 'border-yellow-500';
  return 'border-slate-700';
}

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
  const url = API_KEY
    ? `${API_BASE}/${symbols}?token=${API_KEY}`
    : `${API_BASE}/${symbols}`;

  const res = await fetch(url);
  if (!res.ok) throw new Error('API error');

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
        ${s.discount.toFixed(1)}% abaixo do alvo
      </p>

      <p class="text-sm">Preço: ${formatBRL(s.price)}</p>
      <p class="text-xs text-slate-400">
        Preço-alvo: ${formatBRL(s.target)}
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

      const rate = getDiscountRate(s.category);
      const target = d.regularMarketPrice * (1 - rate);
      const discount = ((target - d.regularMarketPrice) / target) * 100;

      return {
        ...s,
        price: d.regularMarketPrice,
        target,
        discount: Math.abs(discount)
      };
    }).filter(Boolean);

    if (!result.length) throw new Error('Sem dados');

    result.sort((a, b) => b.discount - a.discount);
    render(result);

  } catch {
    app.innerHTML = `
      <p class="text-center text-red-400">
        Falha ao carregar dados. Tente novamente.
      </p>
    `;
  }
}

loadApp();

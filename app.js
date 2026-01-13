const app = document.getElementById('app');
const searchInput = document.getElementById('search');

/* ================= CONFIG ================= */

const API_BASE = 'https://brapi.dev/api/quote';
const API_KEY = '4GPeeg5frU4MAtdp44bEqZ';
const CACHE_KEY = 'stocksCache_market_safe_v2';
const CACHE_TIME = 30 * 60 * 1000;
const INITIAL_LIMIT = 12;
const REQUEST_DELAY = 350;

/* ================= ESTADO ================= */

let marketData = [];
let isSearching = false;

/* ================= AÇÕES (30) ================= */

const stocks = [
  { ticker: 'ITUB4', name: 'Itaú', sector: 'Bancos', category: 'perene' },
  { ticker: 'BBDC4', name: 'Bradesco', sector: 'Bancos', category: 'perene' },
  { ticker: 'BBAS3', name: 'Banco do Brasil', sector: 'Bancos', category: 'perene' },
  { ticker: 'SANB11', name: 'Santander', sector: 'Bancos', category: 'perene' },
  { ticker: 'BPAC11', name: 'BTG Pactual', sector: 'Bancos', category: 'perene' },
  { ticker: 'ITSA4', name: 'Itaúsa', sector: 'Bancos', category: 'perene' },

  { ticker: 'PETR4', name: 'Petrobras', sector: 'Petróleo', category: 'ciclica' },
  { ticker: 'PRIO3', name: 'Prio', sector: 'Petróleo', category: 'ciclica' },

  { ticker: 'VALE3', name: 'Vale', sector: 'Mineração', category: 'ciclica' },
  { ticker: 'GGBR4', name: 'Gerdau', sector: 'Siderurgia', category: 'ciclica' },

  { ticker: 'WEGE3', name: 'WEG', sector: 'Indústria', category: 'perene' },
  { ticker: 'EMBR3', name: 'Embraer', sector: 'Aeronáutica', category: 'ciclica' },

  { ticker: 'ABEV3', name: 'Ambev', sector: 'Bebidas', category: 'perene' },
  { ticker: 'JBSS3', name: 'JBS', sector: 'Alimentos', category: 'ciclica' },

  { ticker: 'RADL3', name: 'Raia Drogasil', sector: 'Saúde', category: 'perene' },
  { ticker: 'FLRY3', name: 'Fleury', sector: 'Saúde', category: 'perene' },

  { ticker: 'TOTS3', name: 'Totvs', sector: 'Tecnologia', category: 'perene' },

  { ticker: 'CCRO3', name: 'CCR', sector: 'Concessões', category: 'perene' },
  { ticker: 'RAIL3', name: 'Rumo', sector: 'Logística', category: 'ciclica' },

  { ticker: 'MULT3', name: 'Multiplan', sector: 'Shoppings', category: 'perene' },
  { ticker: 'IGTI11', name: 'Iguatemi', sector: 'Shoppings', category: 'perene' },

  { ticker: 'ELET3', name: 'Eletrobras', sector: 'Energia', category: 'perene' },
  { ticker: 'TAEE11', name: 'Taesa', sector: 'Energia', category: 'perene' },

  { ticker: 'VIVT3', name: 'Vivo', sector: 'Telecom', category: 'perene' },
  { ticker: 'TIMS3', name: 'TIM', sector: 'Telecom', category: 'perene' }
];

/* ================= MERCADO ================= */

function margin(category) {
  return category === 'perene' ? 0.15 : 0.25;
}

function borderColor(discount) {
  if (discount >= 16.6) return 'border-green-500';
  if (discount >= 8.3) return 'border-yellow-500';
  if (discount >= 0.5) return 'border-gray-500';
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

/* ================= API ================= */

const sleep = ms => new Promise(r => setTimeout(r, ms));

async function fetchOne(ticker) {
  const res = await fetch(`${API_BASE}/${ticker}?token=${API_KEY}`);
  if (!res.ok) throw new Error(res.status);
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
      await sleep(REQUEST_DELAY);
    } catch {
      console.warn('Falha:', s.ticker);
    }
  }

  setCache(data);
  return data;
}

/* ================= BUSCA + RANKING ================= */

function normalize(t) {
  return t.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
}

function searchAndRank(query) {
  const q = normalize(query);
  isSearching = !!q;

  if (!q) return marketData;

  return [...marketData]
    .map(s => {
      let score = 0;
      if (normalize(s.ticker) === q) score += 100;
      else if (normalize(s.ticker).startsWith(q)) score += 50;
      else if (normalize(s.ticker).includes(q)) score += 30;
      if (normalize(s.name).includes(q)) score += 20;
      if (normalize(s.sector).includes(q)) score += 10;
      return { ...s, score };
    })
    .filter(s => s.score > 0)
    .sort((a, b) => b.score - a.score);
}

/* ================= RENDER ================= */

function render(list) {
  app.innerHTML = list.slice(0, INITIAL_LIMIT).map(s => `
    <div class="bg-slate-800 border ${isSearching ? 'border-white' : borderColor(s.discount)} rounded-xl p-4 mb-4">
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

    marketData = stocks.map(s => {
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
    }).filter(Boolean).sort((a, b) => b.discount - a.discount);

    render(marketData);

  } catch {
    app.innerHTML = `
      <p class="text-center text-red-400">
        Limite da API atingido. Aguarde alguns minutos.
      </p>
    `;
  }
}

searchInput.addEventListener('input', e => {
  const filtered = searchAndRank(e.target.value);
  render(filtered);
});

loadApp();

const app = document.getElementById('app');
const searchInput = document.getElementById('search');

/* ================= CONFIG ================= */

const API_BASE = 'https://brapi.dev/api/quote';
const API_KEY = '4GPeeg5frU4MAtdp44bEqZ';
const CACHE_KEY = 'stocksCache_40_final';
const CACHE_TIME = 30 * 60 * 1000;
const INITIAL_LIMIT = 15;
const REQUEST_DELAY = 350;

/* ================= AÇÕES (40) ================= */

const stocks = [
  { ticker: 'ITUB4', name: 'Itaú', sector: 'Bancos', category: 'perene' },
  { ticker: 'BBDC4', name: 'Bradesco', sector: 'Bancos', category: 'perene' },
  { ticker: 'BBAS3', name: 'Banco do Brasil', sector: 'Bancos', category: 'perene' },
  { ticker: 'SANB11', name: 'Santander', sector: 'Bancos', category: 'perene' },

  { ticker: 'TAEE11', name: 'Taesa', sector: 'Energia', category: 'perene' },
  { ticker: 'EGIE3', name: 'Engie', sector: 'Energia', category: 'perene' },
  { ticker: 'CPLE6', name: 'Copel', sector: 'Energia', category: 'perene' },
  { ticker: 'CMIG4', name: 'Cemig', sector: 'Energia', category: 'perene' },

  { ticker: 'PETR4', name: 'Petrobras', sector: 'Petróleo', category: 'ciclica' },
  { ticker: 'PRIO3', name: 'Prio', sector: 'Petróleo', category: 'ciclica' },
  { ticker: 'VALE3', name: 'Vale', sector: 'Mineração', category: 'ciclica' },
  { ticker: 'GGBR4', name: 'Gerdau', sector: 'Siderurgia', category: 'ciclica' },

  { ticker: 'ABEV3', name: 'Ambev', sector: 'Bebidas', category: 'perene' },
  { ticker: 'JBSS3', name: 'JBS', sector: 'Alimentos', category: 'ciclica' },
  { ticker: 'BRFS3', name: 'BRF', sector: 'Alimentos', category: 'ciclica' },
  { ticker: 'MRFG3', name: 'Marfrig', sector: 'Alimentos', category: 'ciclica' },

  { ticker: 'LREN3', name: 'Renner', sector: 'Varejo', category: 'perene' },
  { ticker: 'MGLU3', name: 'Magazine Luiza', sector: 'Varejo', category: 'ciclica' },
  { ticker: 'ASAI3', name: 'Assaí', sector: 'Varejo', category: 'perene' },
  { ticker: 'CRFB3', name: 'Carrefour', sector: 'Varejo', category: 'perene' },

  { ticker: 'RADL3', name: 'Raia Drogasil', sector: 'Saúde', category: 'perene' },
  { ticker: 'FLRY3', name: 'Fleury', sector: 'Saúde', category: 'perene' },
  { ticker: 'HYPE3', name: 'Hypera', sector: 'Saúde', category: 'perene' },

  { ticker: 'WEGE3', name: 'WEG', sector: 'Indústria', category: 'perene' },
  { ticker: 'EMBR3', name: 'Embraer', sector: 'Indústria', category: 'ciclica' },

  { ticker: 'TOTS3', name: 'Totvs', sector: 'Tecnologia', category: 'perene' },
  { ticker: 'LWSA3', name: 'Locaweb', sector: 'Tecnologia', category: 'ciclica' },

  { ticker: 'MULT3', name: 'Multiplan', sector: 'Shoppings', category: 'perene' },
  { ticker: 'IGTI11', name: 'Iguatemi', sector: 'Shoppings', category: 'perene' },

  { ticker: 'CCRO3', name: 'CCR', sector: 'Concessões', category: 'perene' },
  { ticker: 'RAIL3', name: 'Rumo', sector: 'Logística', category: 'ciclica' },

  { ticker: 'SBSP3', name: 'Sabesp', sector: 'Saneamento', category: 'perene' },
  { ticker: 'UGPA3', name: 'Ultrapar', sector: 'Distribuição', category: 'perene' },
  { ticker: 'SLCE3', name: 'SLC Agrícola', sector: 'Agro', category: 'ciclica' },

  { ticker: 'B3SA3', name: 'B3', sector: 'Mercado Financeiro', category: 'perene' },
  { ticker: 'BBSE3', name: 'BB Seguridade', sector: 'Seguros', category: 'perene' },
  { ticker: 'VIVT3', name: 'Vivo', sector: 'Telecom', category: 'perene' },
  { ticker: 'TIMS3', name: 'TIM', sector: 'Telecom', category: 'perene' },
  { ticker: 'KLBN11', name: 'Klabin', sector: 'Papel', category: 'perene' },
  { ticker: 'SUZB3', name: 'Suzano', sector: 'Papel', category: 'ciclica' }
];

/* ================= MODELO HISTÓRICO ================= */

function targetFromHistory(min, max, category) {
  const range = max - min;
  const factor = category === 'perene' ? 0.6 : 0.5;
  return min + range * factor;
}

function borderColor(discount) {
  if (discount >= 16.6) return 'border-green-500';
  if (discount >= 8.3) return 'border-yellow-500';
  if (discount > 0) return 'border-gray-400';
  return 'border-white';
}

const brl = v => `R$ ${v.toFixed(2)}`;

/* ================= CACHE ================= */

function getCache() {
  const raw = localStorage.getItem(CACHE_KEY);
  if (!raw) return null;
  const data = JSON.parse(raw);
  return Date.now() - data.time < CACHE_TIME ? data.value : null;
}

function setCache(value) {
  localStorage.setItem(CACHE_KEY, JSON.stringify({ time: Date.now(), value }));
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
      data.push(await fetchOne(s.ticker));
      await sleep(REQUEST_DELAY);
    } catch {}
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

      <p class="mt-2 font-semibold">${s.discount.toFixed(1)}% abaixo do alvo</p>

      <p class="text-sm">Preço atual: ${brl(s.price)}</p>
      <p class="text-xs text-slate-400">
        Preço-alvo estimado<br>
        Últimos 3 anos: ${brl(s.target)}
      </p>
    </div>
  `).join('');
}

/* ================= APP ================= */

async function loadApp(filter = '') {
  app.innerHTML = 'Carregando ações...';

  const api = await fetchAll();

  const result = stocks.map(s => {
    const d = api.find(a => a.symbol === s.ticker);
    if (!d) return null;

    const target = targetFromHistory(
      d.fiftyTwoWeekLow,
      d.fiftyTwoWeekHigh,
      s.category
    );

    const discount = ((target - d.regularMarketPrice) / target) * 100;

    return { ...s, price: d.regularMarketPrice, target, discount };
  }).filter(Boolean);

  const filtered = filter
    ? result.filter(r =>
        r.ticker.includes(filter) ||
        r.name.toLowerCase().includes(filter)
      )
    : result;

  filtered.sort((a, b) => b.discount - a.discount);
  render(filtered);
}

loadApp();

searchInput.addEventListener('input', e => {
  loadApp(e.target.value.toUpperCase());
});

const app = document.getElementById('app');
const searchInput = document.getElementById('search');

const BRAPI_API_KEY = '4GPeeg5frU4MAtdp44bEqZ';
const CACHE_DURATION = 60 * 60 * 1000;
const REQUEST_DELAY = 1500;
const INITIAL_LIMIT = 10;

// ======================
// 34 AÇÕES BR (as do print)
// ======================
const stocks = [
  'ITUB4','BBDC4','BBAS3','SANB11','BBSE3',
  'LREN3','MGLU3','PETZ3','ASAI3',
  'EGIE3','TAEE11','CMIG4','CPLE6','CPFE3',
  'PETR4','PRIO3','VALE3',
  'WEGE3','GGBR4',
  'RDOR3','HAPV3','FLRY3',
  'ABEV3','JBSS3','BRFS3',
  'RENT3','RAIL3','CCRO3',
  'TOTS3','LWSA3',
  'MULT3','SBSP3',
  'EMBR3','RADL3'
];

// ======================
// CACHE
// ======================
function getCache() {
  const raw = localStorage.getItem('stocksCache');
  if (!raw) return null;
  const data = JSON.parse(raw);
  if (Date.now() - data.time < CACHE_DURATION) return data.data;
  return null;
}

function setCache(data) {
  localStorage.setItem('stocksCache', JSON.stringify({
    time: Date.now(),
    data
  }));
}

const sleep = ms => new Promise(r => setTimeout(r, ms));

// ======================
// API (1 POR 1)
// ======================
async function fetchStocks() {
  const cached = getCache();
  if (cached) {
    console.log('✅ Cache ativo');
    return cached;
  }

  console.log('📡 Buscando dados da BRAPI (1 ticker por request)');
  let results = [];

  for (const ticker of stocks) {
    const url = `https://brapi.dev/api/quote/${ticker}?token=${BRAPI_API_KEY}`;

    try {
      const res = await fetch(url);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json = await res.json();

      if (json.results && json.results[0]) {
        results.push(json.results[0]);
        console.log(`✔️ ${ticker} ok`);
      }
    } catch (err) {
      console.error(`❌ ${ticker}`, err.message);
    }

    await sleep(REQUEST_DELAY);
  }

  setCache(results);
  return results;
}

// ======================
// APP
// ======================
async function loadStocks() {
  app.innerHTML = `<p class="text-slate-400 text-center">Carregando ações...</p>`;

  const data = await fetchStocks();
  if (!data.length) {
    app.innerHTML = `<p class="text-slate-400 text-center">Falha ao carregar dados.</p>`;
    return;
  }

  const processed = data
    .filter(s => s.regularMarketPrice)
    .map(s => {
      const price = s.regularMarketPrice;
      const target = price * 0.85;
      return {
        ticker: s.symbol,
        price,
        target,
        discount: ((price - target) / price) * 100
      };
    })
    .sort((a, b) => b.discount - a.discount);

  window.stockResults = processed;
  render(processed);
}

function render(list) {
  const visible = list.slice(0, INITIAL_LIMIT);
  app.innerHTML = visible.map(s => `
    <div class="bg-slate-800 p-4 rounded-xl mb-3 border border-slate-700">
      <h2 class="text-green-400 font-bold">${s.ticker}</h2>
      <p>${s.discount.toFixed(1)}% abaixo do alvo</p>
      <p class="text-sm">Preço: R$ ${s.price.toFixed(2)}</p>
      <p class="text-xs text-slate-400">Alvo: R$ ${s.target.toFixed(2)}</p>
    </div>
  `).join('');
}

// ======================
// SEARCH
// ======================
searchInput.addEventListener('input', e => {
  const term = e.target.value.toLowerCase();
  if (!term) return render(window.stockResults);
  render(window.stockResults.filter(s =>
    s.ticker.toLowerCase().includes(term)
  ));
});

// INIT
console.log('🚀 Auricchio iniciado');
console.log('📊 Total ações:', stocks.length);
loadStocks();

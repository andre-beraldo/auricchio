const app = document.getElementById('app');
const searchInput = document.getElementById('search');

const BRAPI_API_KEY = '4GPeeg5frU4MAtdp44bEqZ';
const CACHE_DURATION = 30 * 60 * 1000; // 30 minutos
const INITIAL_LIMIT = 10;

// Desconto por categoria
const DISCOUNT_TARGETS = {
  'perene-br': 0.12,
  'ciclica-br': 0.20
};

// ======================
// 40 AÇÕES BRASILEIRAS
// ======================
const stocks = [
  // BANCOS
  { ticker: 'ITUB4', name: 'Itaú Unibanco', sector: 'Bancos · BR', category: 'perene-br' },
  { ticker: 'BBDC4', name: 'Bradesco', sector: 'Bancos · BR', category: 'perene-br' },
  { ticker: 'BBAS3', name: 'Banco do Brasil', sector: 'Bancos · BR', category: 'perene-br' },
  { ticker: 'SANB11', name: 'Santander', sector: 'Bancos · BR', category: 'perene-br' },
  { ticker: 'BBSE3', name: 'BB Seguridade', sector: 'Seguros · BR', category: 'perene-br' },

  // VAREJO
  { ticker: 'LREN3', name: 'Lojas Renner', sector: 'Varejo · BR', category: 'perene-br' },
  { ticker: 'MGLU3', name: 'Magazine Luiza', sector: 'Varejo · BR', category: 'ciclica-br' },
  { ticker: 'PETZ3', name: 'Petz', sector: 'Varejo · BR', category: 'ciclica-br' },
  { ticker: 'ASAI3', name: 'Assaí', sector: 'Varejo · BR', category: 'perene-br' },

  // ENERGIA
  { ticker: 'EGIE3', name: 'Engie Brasil', sector: 'Energia · BR', category: 'perene-br' },
  { ticker: 'TAEE11', name: 'Taesa', sector: 'Energia · BR', category: 'perene-br' },
  { ticker: 'CMIG4', name: 'Cemig', sector: 'Energia · BR', category: 'perene-br' },
  { ticker: 'CPLE6', name: 'Copel', sector: 'Energia · BR', category: 'perene-br' },
  { ticker: 'CPFE3', name: 'CPFL Energia', sector: 'Energia · BR', category: 'perene-br' },

  // PETRÓLEO / MINERAÇÃO
  { ticker: 'PETR4', name: 'Petrobras', sector: 'Petróleo · BR', category: 'ciclica-br' },
  { ticker: 'PRIO3', name: 'Prio', sector: 'Petróleo · BR', category: 'ciclica-br' },
  { ticker: 'VALE3', name: 'Vale', sector: 'Mineração · BR', category: 'ciclica-br' },

  // INDÚSTRIA
  { ticker: 'WEGE3', name: 'WEG', sector: 'Indústria · BR', category: 'perene-br' },
  { ticker: 'GGBR4', name: 'Gerdau', sector: 'Siderurgia · BR', category: 'ciclica-br' },

  // SAÚDE
  { ticker: 'RDOR3', name: 'Rede D’Or', sector: 'Saúde · BR', category: 'perene-br' },
  { ticker: 'HAPV3', name: 'Hapvida', sector: 'Saúde · BR', category: 'perene-br' },
  { ticker: 'FLRY3', name: 'Fleury', sector: 'Saúde · BR', category: 'perene-br' },

  // ALIMENTOS
  { ticker: 'ABEV3', name: 'Ambev', sector: 'Bebidas · BR', category: 'perene-br' },
  { ticker: 'JBSS3', name: 'JBS', sector: 'Alimentos · BR', category: 'ciclica-br' },
  { ticker: 'BRFS3', name: 'BRF', sector: 'Alimentos · BR', category: 'ciclica-br' },

  // SERVIÇOS / LOGÍSTICA
  { ticker: 'RENT3', name: 'Localiza', sector: 'Serviços · BR', category: 'perene-br' },
  { ticker: 'RAIL3', name: 'Rumo', sector: 'Logística · BR', category: 'ciclica-br' },
  { ticker: 'CCRO3', name: 'CCR', sector: 'Concessões · BR', category: 'perene-br' },

  // TECNOLOGIA
  { ticker: 'TOTS3', name: 'Totvs', sector: 'Tecnologia · BR', category: 'perene-br' },
  { ticker: 'LWSA3', name: 'Locaweb', sector: 'Tecnologia · BR', category: 'ciclica-br' },

  // SHOPS / SANEAMENTO
  { ticker: 'MULT3', name: 'Multiplan', sector: 'Shoppings · BR', category: 'perene-br' },
  { ticker: 'SBSP3', name: 'Sabesp', sector: 'Saneamento · BR', category: 'perene-br' },

  // OUTRAS
  { ticker: 'EMBR3', name: 'Embraer', sector: 'Aeronáutica · BR', category: 'ciclica-br' },
  { ticker: 'RADL3', name: 'Raia Drogasil', sector: 'Farmácias · BR', category: 'perene-br' }
];

// ======================
// CACHE
// ======================
function getCache() {
  try {
    const raw = localStorage.getItem('stocksCache');
    if (!raw) return null;
    const data = JSON.parse(raw);
    if (Date.now() - data.timestamp < CACHE_DURATION) return data.data;
    return null;
  } catch {
    return null;
  }
}

function setCache(data) {
  localStorage.setItem(
    'stocksCache',
    JSON.stringify({ timestamp: Date.now(), data })
  );
}

// ======================
// API
// ======================
async function fetchStocks() {
  const cached = getCache();
  if (cached) {
    console.log('✅ Cache ativo');
    return cached;
  }

  try {
    const tickers = stocks.map(s => s.ticker).join(',');
    const url = `https://brapi.dev/api/quote/${tickers}?token=${BRAPI_API_KEY}`;
    console.log('📡 Buscando dados da BRAPI');

    const res = await fetch(url);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);

    const json = await res.json();
    const results = json.results || [];
    setCache(results);
    return results;
  } catch (err) {
    console.error('Erro na BRAPI:', err);
    return [];
  }
}

// ======================
// APP
// ======================
async function loadStocks() {
  app.innerHTML = `<p class="text-center text-slate-400">Carregando ações...</p>`;

  const apiData = await fetchStocks();
  if (!apiData.length) {
    app.innerHTML = `<p class="text-center text-slate-400">Falha ao carregar dados.</p>`;
    return;
  }

  const results = stocks
    .map(stock => {
      const data = apiData.find(d => d.symbol === stock.ticker);
      if (!data || !data.regularMarketPrice) return null;

      const price = data.regularMarketPrice;
      const rate = DISCOUNT_TARGETS[stock.category] || 0.15;
      const target = price * (1 - rate);
      const discount = ((price - target) / price) * 100;

      return {
        ...stock,
        price,
        target,
        discount
      };
    })
    .filter(Boolean)
    .sort((a, b) => b.discount - a.discount);

  window.stockResults = results;
  render(results);
}

function render(list) {
  const visible = list.slice(0, INITIAL_LIMIT);

  app.innerHTML = visible.map(s => `
    <div class="bg-slate-800 border border-slate-700 rounded-xl p-4 mb-3">
      <h2 class="text-lg font-bold text-green-400">${s.ticker}</h2>
      <p>${s.name}</p>
      <p class="text-xs text-slate-500">${s.sector}</p>
      <p class="text-green-400 mt-2">${s.discount.toFixed(1)}% abaixo do alvo</p>
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

  const filtered = window.stockResults.filter(s =>
    s.ticker.toLowerCase().includes(term) ||
    s.name.toLowerCase().includes(term)
  );

  render(filtered);
});

// INIT
console.log('🚀 App iniciado');
console.log('📊 Total de ações:', stocks.length);
loadStocks();

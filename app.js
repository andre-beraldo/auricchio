/* ========================================
   AUTO-LIMPEZA DO SERVICE WORKER ANTIGO
======================================== */
(async function autoCleanup() {
  const SW_VERSION = 'v4';
  const lastCleanup = localStorage.getItem('sw-cleanup-version');

  if (lastCleanup !== SW_VERSION) {
    console.log('🧹 Detectado service worker antigo - iniciando limpeza...');
    try {
      if ('serviceWorker' in navigator) {
        const registrations = await navigator.serviceWorker.getRegistrations();
        for (let reg of registrations) await reg.unregister();
      }
      if ('caches' in window) {
        const cacheNames = await caches.keys();
        for (let name of cacheNames) await caches.delete(name);
      }
      const keysToKeep = ['stocksCache_v4'];  // versão atual do cache
      Object.keys(localStorage).forEach(key => {
        if (!keysToKeep.includes(key) && key !== 'sw-cleanup-version') {
          localStorage.removeItem(key);
        }
      });
      localStorage.setItem('sw-cleanup-version', SW_VERSION);
      setTimeout(() => window.location.reload(true), 500);
      return;
    } catch (error) {
      console.error('❌ Erro na limpeza:', error);
      localStorage.setItem('sw-cleanup-version', SW_VERSION);
    }
  }
})();

/* ========================================
   AURICCHIO - Monitor de Ações
   App.js integrado com HTML v2
======================================== */

/* ================= ELEMENTOS DOM ================= */
const app         = document.getElementById('app');
const searchInput = document.getElementById('search');

/* ================= CONFIGURAÇÕES ================= */
const CONFIG = {
  API_ENDPOINT:  '/api/stocks',
  CACHE_KEY:     'stocksCache_v4',
  CACHE_TIME:    4 * 60 * 60 * 1000,   // 4 horas
  REQUEST_DELAY: 2500,               // BRAPI free tem rate limit — 1 req/2.5s evita bloqueio
  BATCH_SIZE:    1                       // BRAPI plano free = 1 ticker por requisição
};

/* ================= ESTADO DA APLICAÇÃO ================= */
let currentDiscountFilter = 'light';
let currentSectorFilter   = 'Todos';
let allProcessedStocks    = [];

const sectorByFilter = { light: 'Todos', moderate: 'Todos', strong: 'Todos' };

/* ================= SETORES DO DROPDOWN ================= */
const DROPDOWN_SECTORS = [
  'Todos',
  'Bancos',
  'Energia',
  'Seguros',
  'Comunicação',
  'Petróleo',
  'Varejo',
  'Saúde',
  'Construção Civil',
];

/* ================= AÇÕES (20 CURADAS — BLUE CHIPS POR SETOR) =================
   Critério: maior liquidez por setor.
   BRAPI plano free = 1 ticker/req → 20 requisições com cache de 4h.
   Carregamento: ~8s apenas na primeira abertura do dia.
======================================== */
const stocks = [
  // ========== BANCOS (3) ==========
  { ticker: 'ITUB4',  name: 'Itaú',               sector: 'Bancos',             category: 'perene'  },
  { ticker: 'BBAS3',  name: 'Banco do Brasil',     sector: 'Bancos',             category: 'perene'  },
  { ticker: 'BBDC4',  name: 'Bradesco',            sector: 'Bancos',             category: 'perene'  },

  // ========== ENERGIA (3) ==========
  { ticker: 'TAEE11', name: 'Taesa',               sector: 'Energia',            category: 'perene'  },
  { ticker: 'EGIE3',  name: 'Engie',               sector: 'Energia',            category: 'perene'  },
  { ticker: 'CMIG4',  name: 'Cemig',               sector: 'Energia',            category: 'perene'  },

  // ========== PETRÓLEO E MINERAÇÃO (2) ==========
  { ticker: 'PETR4',  name: 'Petrobras',           sector: 'Petróleo',           category: 'ciclica' },
  { ticker: 'VALE3',  name: 'Vale',                sector: 'Mineração',          category: 'ciclica' },

  // ========== SAÚDE (2) ==========
  { ticker: 'RADL3',  name: 'Raia Drogasil',       sector: 'Saúde',              category: 'perene'  },
  { ticker: 'FLRY3',  name: 'Fleury',              sector: 'Saúde',              category: 'perene'  },

  // ========== VAREJO (2) ==========
  { ticker: 'LREN3',  name: 'Renner',              sector: 'Varejo',             category: 'perene'  },
  { ticker: 'ASAI3',  name: 'Assaí',               sector: 'Varejo',             category: 'perene'  },

  // ========== INDÚSTRIA (2) ==========
  { ticker: 'WEGE3',  name: 'WEG',                 sector: 'Indústria',          category: 'perene'  },
  { ticker: 'GGBR4',  name: 'Gerdau',              sector: 'Siderurgia',         category: 'ciclica' },

  // ========== SEGUROS (1) ==========
  { ticker: 'BBSE3',  name: 'BB Seguridade',       sector: 'Seguros',            category: 'perene'  },

  // ========== TELECOM (1) ==========
  { ticker: 'VIVT3',  name: 'Vivo',                sector: 'Telecom',            category: 'perene'  },

  // ========== SANEAMENTO (1) ==========
  { ticker: 'SBSP3',  name: 'Sabesp',              sector: 'Saneamento',         category: 'perene'  },

  // ========== PAPEL (1) ==========
  { ticker: 'KLBN11', name: 'Klabin',              sector: 'Papel',              category: 'perene'  },

  // ========== SHOPPINGS (1) ==========
  { ticker: 'MULT3',  name: 'Multiplan',           sector: 'Shoppings',          category: 'perene'  },

  // ========== HOLDINGS (1) ==========
  { ticker: 'ITSA4',  name: 'Itaúsa',              sector: 'Holdings',           category: 'perene'  },
];

/* ================= FUNÇÕES UTILITÁRIAS ================= */
function targetFromHistory(min, max, category) {
  const factor = category === 'perene' ? 0.6 : 0.5;
  return min + (max - min) * factor;
}

function getBorderClass(discount) {
  if (discount >= 16.6) return 'border-red-500';
  if (discount >= 8.3)  return 'border-yellow-500';
  if (discount > 0)     return 'border-blue-500';
  return 'border-gray-400';
}

function getDiscountLevel(discount) {
  if (discount >= 16.6) return 'strong';
  if (discount >= 8.3)  return 'moderate';
  return 'light';
}

function getBadgeText(level) {
  if (level === 'strong')   return 'Desconto Forte';
  if (level === 'moderate') return 'Desconto Moderado';
  return 'Desconto Leve';
}

function formatBRL(value) {
  return `R$ ${value.toFixed(2)}`;
}

const sleep = ms => new Promise(r => setTimeout(r, ms));

/* ================= DROPDOWN DE SETORES ================= */
function buildDropdowns() {
  ['light', 'moderate', 'strong'].forEach(filter => {
    const container = document.getElementById(`dropdown-${filter}`);
    if (!container) return;

    container.innerHTML = DROPDOWN_SECTORS.map(sector => `
      <div
        class="sector-option${sector === 'Todos' ? ' selected' : ''}"
        data-sector="${sector}"
        onclick="selectSector('${filter}', '${sector}', this)"
      >
        ${sector}
      </div>
    `).join('');
  });
}

function toggleSectorDropdown(filter) {
  const dropdown = document.getElementById(`dropdown-${filter}`);
  if (!dropdown) return;

  const isOpen = dropdown.classList.contains('open');
  closeAllDropdowns();

  if (!isOpen) {
    dropdown.classList.add('open');
    activateFilterBtn(filter);
  }
}

function closeAllDropdowns() {
  document.querySelectorAll('.sector-dropdown').forEach(d => d.classList.remove('open'));
}

document.addEventListener('click', (e) => {
  if (!e.target.closest('.filter-btn-wrapper')) closeAllDropdowns();
});

function selectSector(filter, sector, clickedEl) {
  sectorByFilter[filter] = sector;

  if (currentDiscountFilter === filter) currentSectorFilter = sector;

  const container = document.getElementById(`dropdown-${filter}`);
  container.querySelectorAll('.sector-option').forEach(opt => {
    opt.classList.toggle('selected', opt.dataset.sector === sector);
  });

  const btn = document.querySelector(`.filter-btn[data-filter="${filter}"]`);
  let label = btn.querySelector('.filter-btn-sector');

  if (sector === 'Todos') {
    if (label) label.remove();
  } else {
    if (!label) {
      label = document.createElement('span');
      label.className = 'filter-btn-sector';
      btn.appendChild(label);
    }
    label.textContent = sector;
  }

  closeAllDropdowns();
  activateFilterBtn(filter);
  filterAndRender(searchInput.value.toUpperCase());
}

function activateFilterBtn(filter) {
  document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
  const btn = document.querySelector(`.filter-btn[data-filter="${filter}"]`);
  if (btn) btn.classList.add('active');

  currentDiscountFilter = filter;
  currentSectorFilter   = sectorByFilter[filter] || 'Todos';
}

/* ================= ANÁLISE DE SAÚDE FINANCEIRA ================= */
function analyzeHealth(fundamentals, priceHistory = null) {
  if (!fundamentals) return { items: [], performanceItems: [] };

  const stats = fundamentals.defaultKeyStatistics || {};
  const items = [];

  const pe = fundamentals.priceEarnings;
  items.push({
    label: 'P/L',
    value:  (pe && pe > 0) ? pe.toFixed(2) : 'N/A',
    status: (pe > 0 && pe < 20) ? 'positive' : (pe >= 20 && pe <= 30) ? 'warning' : 'negative'
  });

  const pvp = stats.priceToBook;
  items.push({
    label: 'P/VP',
    value:  (pvp && pvp > 0) ? pvp.toFixed(2) : 'N/A',
    status: (pvp > 0 && pvp < 3) ? 'positive' : (pvp >= 3 && pvp <= 5) ? 'warning' : 'negative'
  });

  const dy = stats.dividendYield;
  items.push({
    label: 'Dividend Yield',
    value:  (dy && dy > 0) ? `${dy.toFixed(2)}%` : 'N/A',
    status: (dy >= 4) ? 'positive' : (dy > 0) ? 'warning' : 'negative'
  });

  const performanceItems = [];
  const precoAtual = fundamentals.regularMarketPrice ?? null;

  function calcVariacao(atual, anterior) {
    if (!atual || !anterior || anterior === 0) return null;
    return ((atual - anterior) / anterior) * 100;
  }

  function formatVariacao(valor) {
    if (valor === null) return { value: 'N/A', status: 'negative' };
    const sinal = valor >= 0 ? '+' : '';
    return { value: `${sinal}${valor.toFixed(2)}%`, status: valor >= 5 ? 'positive' : valor >= 0 ? 'warning' : 'negative' };
  }

  performanceItems.push({ label: 'Valorização 12M', ...formatVariacao(calcVariacao(precoAtual, priceHistory?.price12mAgo)) });
  performanceItems.push({ label: 'Valorização Mês',  ...formatVariacao(calcVariacao(precoAtual, priceHistory?.price1mAgo))  });

  return { items, performanceItems };
}

/* ================= CACHE ================= */
function getCache() {
  try {
    const raw = localStorage.getItem(CONFIG.CACHE_KEY);
    if (!raw) return null;
    const data = JSON.parse(raw);
    return (Date.now() - data.time < CONFIG.CACHE_TIME) ? data.value : null;
  } catch {
    return null;
  }
}

function setCache(value) {
  try {
    localStorage.setItem(CONFIG.CACHE_KEY, JSON.stringify({ time: Date.now(), value }));
  } catch (e) {
    console.warn('⚠️ Cache não pôde ser salvo:', e.message);
  }
}

/* ================= API ================= */
async function fetchDataFromAPI(tickers) {
  try {
    const response = await fetch(`/api/stocks?tickers=${tickers}`);
    const data = await response.json();
    if (data.error) throw new Error(data.error);
    return data;
  } catch (error) {
    console.error('Erro ao buscar dados:', error);
    return { error: 'Erro ao buscar dados da API' };
  }
}

async function fetchAllStocks() {
  const data = [];
  const totalBatches = Math.ceil(stocks.length / CONFIG.BATCH_SIZE);

  for (let i = 0; i < stocks.length; i += CONFIG.BATCH_SIZE) {
    const batch    = stocks.slice(i, i + CONFIG.BATCH_SIZE);
    const tickers  = batch.map(s => s.ticker).join(',');
    const batchNum = Math.floor(i / CONFIG.BATCH_SIZE) + 1;

    try {
      const apiData = await fetchDataFromAPI(tickers);
      if (apiData?.results) {
        data.push(...apiData.results);
        console.log(`✓ Lote ${batchNum}/${totalBatches} carregado (${batch.length} ações)`);
      }
      // Delay apenas entre lotes, não após o último
      if (batchNum < totalBatches) await sleep(CONFIG.REQUEST_DELAY);
    } catch (error) {
      console.warn(`⚠️ Erro no lote ${batchNum}:`, error.message);
    }
  }

  return data;
}

async function fetchPriceHistory(ticker) {
  try {
    const response = await fetch(`/api/stocks/history?ticker=${ticker}`);
    const data     = await response.json();
    const results  = data?.results?.[0]?.historicalDataPrice;
    if (!results || results.length < 2) return null;

    const sorted = [...results].sort((a, b) => a.date - b.date);
    const hoje   = Date.now();
    const dozeM  = hoje - 365 * 24 * 60 * 60 * 1000;
    const umM    = hoje - 30  * 24 * 60 * 60 * 1000;

    const nearest = (target) =>
      sorted.reduce((prev, curr) =>
        Math.abs(curr.date * 1000 - target) < Math.abs(prev.date * 1000 - target) ? curr : prev
      )?.close ?? null;

    return { price12mAgo: nearest(dozeM), price1mAgo: nearest(umM) };
  } catch (err) {
    console.error(`Erro histórico ${ticker}:`, err);
    return null;
  }
}

/* ================= RENDERIZAÇÃO ================= */
async function renderStocks(stockList) {
  if (stockList.length === 0) {
    app.innerHTML = `
      <div class="empty-state">
        <div class="empty-icon">🔍</div>
        <h3>Nenhuma ação encontrada</h3>
        <p>Tente buscar outro termo ou ajuste os filtros</p>
      </div>
    `;
    return;
  }

  app.innerHTML = stockList.map((stock, index) => {
    const level         = getDiscountLevel(stock.discount);
    const badgeText     = getBadgeText(level);
    const borderClass   = getBorderClass(stock.discount);
    const discountColor = level === 'light' ? '#3b82f6' : level === 'moderate' ? '#f59e0b' : '#dc2626';

    const { items } = analyzeHealth(stock.fundamentals, null);

    return `
      <div class="stock-card ${borderClass}" data-index="${index}">
        <div class="stock-header">
          <div>
            <div class="stock-ticker">${stock.ticker}</div>
            <div class="stock-name">${stock.name}</div>
          </div>
          <div class="discount-badge ${level}">${badgeText}</div>
        </div>

        <span class="stock-sector">${stock.sector}</span>
        ${stock.change !== undefined ? `
          <div class="daily-change ${stock.change >= 0 ? 'positive' : 'negative'}">
            ${stock.change >= 0 ? '▲' : '▼'} ${Math.abs(stock.change).toFixed(2)}% hoje
          </div>` : ''}

        <div class="stock-info">
          <div class="info-row">
            <span class="info-label">Preço Atual</span>
            <span class="price-current">${formatBRL(stock.price)}</span>
          </div>
          <div class="info-row">
            <span class="info-label">Média Histórica (3 anos)</span>
            <span class="info-value">${formatBRL(stock.target)}</span>
          </div>
          <div class="info-row">
            <span class="info-label">Desconto</span>
            <span class="info-value" style="color:${discountColor}">
              ${stock.discount.toFixed(1)}%
            </span>
          </div>
        </div>

        <div class="expand-arrow" onclick="toggleHealth(${index})">
          <span class="arrow-icon">▼</span>
        </div>

        <div class="health-section" id="health-${index}">
          <div class="health-content">
            <div class="health-title">📊 Indicadores Fundamentalistas</div>
            ${items.map(item => `
              <div class="health-item">
                <span class="health-label">${item.label}</span>
                <span class="health-value ${item.status}">${item.value}</span>
              </div>
            `).join('')}
            <div class="health-title" style="margin-top:12px">📈 Performance</div>
            <div id="performance-${index}">
              <div class="health-item">
                <span class="health-label" style="color:#6b7280;font-size:0.8rem">⏳ Carregando...</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    `;
  }).join('');

  // Histórico em background
  stockList.forEach((stock, index) => {
    fetchPriceHistory(stock.ticker).then(history => {
      const el = document.getElementById(`performance-${index}`);
      if (!el) return;
      const { performanceItems } = analyzeHealth(stock.fundamentals, history);
      el.innerHTML = performanceItems.map(item => `
        <div class="health-item">
          <span class="health-label">${item.label}</span>
          <span class="health-value ${item.status}">${item.value}</span>
        </div>
      `).join('');
    });
  });
}

/* ================= FILTROS ================= */
function applyFilters(stockList, searchTerm = '') {
  if (searchTerm) {
    const norm = searchTerm.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
    return stockList.filter(stock => {
      const fields = [stock.ticker, stock.name, stock.sector, ...(stock.aliases || [])]
        .join(' ').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
      return fields.includes(norm);
    });
  }

  let filtered = stockList;

  if (currentDiscountFilter) {
    filtered = filtered.filter(stock => {
      if (currentDiscountFilter === 'strong')   return stock.discount >= 16.6;
      if (currentDiscountFilter === 'moderate') return stock.discount >= 8.3 && stock.discount < 16.6;
      if (currentDiscountFilter === 'light')    return stock.discount > 0 && stock.discount < 8.3;
      return true;
    });
  }

  if (currentSectorFilter && currentSectorFilter !== 'Todos') {
    filtered = filtered.filter(stock =>
      stock.sector.toLowerCase() === currentSectorFilter.toLowerCase()
    );
  }

  return filtered;
}

function filterAndRender(searchTerm = '') {
  const filtered = applyFilters(allProcessedStocks, searchTerm);
  filtered.sort((a, b) => b.discount - a.discount);
  renderStocks(filtered);
}

/* ================= ESTATÍSTICAS ================= */
function updateStatistics(allStocks) {
  const s = {
    total:    allStocks.length,
    strong:   allStocks.filter(s => s.discount >= 16.6).length,
    moderate: allStocks.filter(s => s.discount >= 8.3 && s.discount < 16.6).length,
    light:    allStocks.filter(s => s.discount > 0 && s.discount < 8.3).length
  };

  document.getElementById('totalStocks').textContent       = s.total;
  document.getElementById('strongDiscounts').textContent   = s.strong;
  document.getElementById('moderateDiscounts').textContent = s.moderate;
  document.getElementById('lightDiscounts').textContent    = s.light;
  document.getElementById('headerTotal').textContent       = s.total;

  const cacheRaw = localStorage.getItem(CONFIG.CACHE_KEY);
  if (cacheRaw) {
    const mins  = Math.floor((Date.now() - JSON.parse(cacheRaw).time) / 60000);
    const hours = Math.floor(mins / 60);
    document.getElementById('cacheTime').textContent = hours > 0 ? `${hours}h` : `${mins}min`;
  } else {
    document.getElementById('cacheTime').textContent = 'agora';
  }
}

/* ================= PROCESSAMENTO DOS DADOS DA API ================= */
function processApiData(apiData) {
  return stocks.map(stock => {
    const api = apiData.find(d => d.symbol === stock.ticker);
    if (!api)                                             { console.warn(`❌ ${stock.ticker}: não encontrado`);     return null; }
    if (!api.regularMarketPrice || api.regularMarketPrice <= 0)
                                                          { console.warn(`⚠️ ${stock.ticker}: preço inválido`);    return null; }
    if (!api.fiftyTwoWeekLow || !api.fiftyTwoWeekHigh ||
        api.fiftyTwoWeekHigh <= api.fiftyTwoWeekLow)     { console.warn(`⚠️ ${stock.ticker}: histórico inválido`); return null; }

    const target   = targetFromHistory(api.fiftyTwoWeekLow, api.fiftyTwoWeekHigh, stock.category);
    const discount = ((target - api.regularMarketPrice) / target) * 100;

    return { ...stock, price: api.regularMarketPrice, target, discount, change: api.regularMarketChange || 0, fundamentals: api };
  }).filter(Boolean);
}

/* ================= APLICAÇÃO PRINCIPAL ================= */
async function loadApp() {
  app.innerHTML = `
    <div class="loading">
      <div class="spinner"></div>
      <p>Carregando dados das ações...</p>
    </div>
  `;

  // CORREÇÃO: cache era implementado mas nunca lido — o app batia na API toda vez.
  const cached = getCache();
  if (cached) {
    allProcessedStocks = cached;
    console.log(`📦 Cache válido — ${cached.length} ações carregadas sem requisição à API`);
    filterAndRender();
    updateStatistics(cached);
    return;
  }

  // Cache ausente ou expirado: busca na API
  console.log('🌐 Cache ausente/expirado — buscando na BRAPI...');
  const apiData = await fetchAllStocks();

  const processedStocks = processApiData(apiData);

  console.log(`📊 Lista: ${stocks.length} | API: ${apiData.length} | OK: ${processedStocks.length}`);

  // Nunca cacheia resultado vazio — evita travar o app em loop
  if (processedStocks.length > 0) {
    setCache(processedStocks);
  } else {
    console.warn('⚠️ Nenhuma ação processada — cache não salvo, próximo load vai tentar API novamente');
  }

  allProcessedStocks = processedStocks;
  filterAndRender();
  updateStatistics(processedStocks);
}

/* ================= EVENT LISTENERS ================= */
searchInput.addEventListener('input', (e) => {
  filterAndRender(e.target.value.toUpperCase());
});

/* ================= EXPANSÃO DE CARDS ================= */
function toggleHealth(index) {
  const section = document.getElementById(`health-${index}`);
  const arrow   = document.querySelector(`[data-index="${index}"] .expand-arrow`);
  if (!section || !arrow) return;

  const expanded = section.classList.contains('expanded');
  section.classList.toggle('expanded', !expanded);
  arrow.classList.toggle('expanded', !expanded);

  const icon = arrow.querySelector('.arrow-icon');
  if (icon) {
    icon.style.display    = 'inline-block';
    icon.style.transition = 'transform 0.3s ease';
    icon.style.transform  = expanded ? 'rotate(0deg)' : 'rotate(180deg)';
  }
}

/* ================= EXPOR FUNÇÕES GLOBAIS (usadas no HTML) ================= */
window.toggleHealth         = toggleHealth;
window.toggleSectorDropdown = toggleSectorDropdown;
window.selectSector         = selectSector;

/* ================= INICIALIZAÇÃO ================= */
buildDropdowns();
loadApp();
console.log('🚀 Auricchio inicializado com sucesso!');

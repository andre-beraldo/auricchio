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
      const keysToKeep = ['stocksCache_v4', 'auricchio_config'];
      Object.keys(localStorage).forEach(key => {
        if (!keysToKeep.includes(key) && key !== 'sw-cleanup-version') localStorage.removeItem(key);
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
======================================== */

const app         = document.getElementById('app');
const searchInput = document.getElementById('search');

const CONFIG = {
  API_ENDPOINT:  '/api/stocks',
  CACHE_KEY:     'stocksCache_v4',
  CACHE_TIME:    4 * 60 * 60 * 1000,
  REQUEST_DELAY: 1000,
  BATCH_SIZE:    1
};

/* ── CONFIGURAÇÃO DE DESCONTOS (persistida) ── */
const CONFIG_KEY = 'auricchio_config';

const DEFAULT_DISCOUNT_CONFIG = {
  periodo: 3,
  plMax: null,
  levels: [
    { name: 'Desconto Leve',     from: 8.3  },
    { name: 'Desconto Moderado', from: 16.6 },
    { name: 'Desconto Forte',    auto: true  }
  ]
};

function loadDiscountConfig() {
  try {
    const raw = localStorage.getItem(CONFIG_KEY);
    if (!raw) return JSON.parse(JSON.stringify(DEFAULT_DISCOUNT_CONFIG));
    return JSON.parse(raw);
  } catch {
    return JSON.parse(JSON.stringify(DEFAULT_DISCOUNT_CONFIG));
  }
}

function saveDiscountConfig(cfg) {
  localStorage.setItem(CONFIG_KEY, JSON.stringify(cfg));
}

let discountConfig = loadDiscountConfig();

/* ── ESTADO ── */
let currentDiscountFilter = 'light';
let currentSectorFilter   = 'Todos';
let allProcessedStocks    = [];
const sectorByFilter      = { light: 'Todos', moderate: 'Todos', strong: 'Todos' };

const stocks = [
  { ticker: 'ITUB4',  name: 'Itaú',            sector: 'Bancos',    category: 'perene'  },
  { ticker: 'BBAS3',  name: 'Banco do Brasil',  sector: 'Bancos',    category: 'perene'  },
  { ticker: 'BBDC4',  name: 'Bradesco',         sector: 'Bancos',    category: 'perene'  },
  { ticker: 'TAEE11', name: 'Taesa',            sector: 'Energia',   category: 'perene'  },
  { ticker: 'EGIE3',  name: 'Engie',            sector: 'Energia',   category: 'perene'  },
  { ticker: 'CMIG4',  name: 'Cemig',            sector: 'Energia',   category: 'perene'  },
  { ticker: 'PETR4',  name: 'Petrobras',        sector: 'Petróleo',  category: 'ciclica' },
  { ticker: 'VALE3',  name: 'Vale',             sector: 'Mineração', category: 'ciclica' },
  { ticker: 'RADL3',  name: 'Raia Drogasil',    sector: 'Saúde',     category: 'perene'  },
  { ticker: 'FLRY3',  name: 'Fleury',           sector: 'Saúde',     category: 'perene'  },
  { ticker: 'LREN3',  name: 'Renner',           sector: 'Varejo',    category: 'perene'  },
  { ticker: 'ASAI3',  name: 'Assaí',            sector: 'Varejo',    category: 'perene'  },
  { ticker: 'WEGE3',  name: 'WEG',              sector: 'Indústria', category: 'perene'  },
  { ticker: 'GGBR4',  name: 'Gerdau',           sector: 'Siderurgia',category: 'ciclica' },
  { ticker: 'BBSE3',  name: 'BB Seguridade',    sector: 'Seguros',   category: 'perene'  },
  { ticker: 'VIVT3',  name: 'Vivo',             sector: 'Telecom',   category: 'perene'  },
  { ticker: 'SBSP3',  name: 'Sabesp',           sector: 'Saneamento',category: 'perene'  },
  { ticker: 'KLBN11', name: 'Klabin',           sector: 'Papel',     category: 'perene'  },
  { ticker: 'MULT3',  name: 'Multiplan',        sector: 'Shoppings', category: 'perene'  },
  { ticker: 'ITSA4',  name: 'Itaúsa',           sector: 'Holdings',  category: 'perene'  },
];

const DROPDOWN_SECTORS = [
  'Todos','Bancos','Energia','Seguros','Comunicação',
  'Petróleo','Varejo','Saúde','Construção Civil',
];

/* ── HELPERS ── */
function getManualLevels() {
  return discountConfig.levels.filter(l => !l.auto);
}

function hasModerato() {
  return getManualLevels().length >= 2;
}

function getBadgeText(discount) {
  const levels = discountConfig.levels;
  const manual = getManualLevels();
  for (let i = manual.length - 1; i >= 0; i--) {
    if (discount >= manual[i].from) return manual[i].name;
  }
  if (discount > 0) return manual[0].name;
  return levels[levels.length - 1].name;
}

function getBadgeClass(discount) {
  const manual = getManualLevels();
  for (let i = manual.length - 1; i >= 0; i--) {
    if (discount >= manual[i].from) {
      if (i === 0) return 'light';
      if (i === 1) return 'moderate';
      return 'strong';
    }
  }
  if (discount > 0) return 'light';
  return 'strong';
}

function getBorderClass(discount) {
  const cls = getBadgeClass(discount);
  if (cls === 'strong')   return 'border-red-500';
  if (cls === 'moderate') return 'border-yellow-500';
  if (cls === 'light' && discount > 0) return 'border-blue-500';
  return 'border-gray-400';
}

function getDiscountColor(discount) {
  const cls = getBadgeClass(discount);
  if (cls === 'strong')   return '#dc2626';
  if (cls === 'moderate') return '#f59e0b';
  return '#3b82f6';
}

function formatBRL(value) { return `R$ ${value.toFixed(2)}`; }
const sleep = ms => new Promise(r => setTimeout(r, ms));

/* ── ATUALIZA LABELS E VISIBILIDADE COM CONFIG ── */
function applyConfigLabels() {
  const levels = discountConfig.levels;
  const manual = getManualLevels();
  const temMod = hasModerato();

  const btnLight  = document.getElementById('btn-label-light');
  const statLight = document.getElementById('stat-label-light');
  if (btnLight)  btnLight.textContent  = manual[0]?.name ?? 'Desconto Leve';
  if (statLight) statLight.textContent = manual[0]?.name ?? 'Desconto Leve';

  const wrapMod  = document.getElementById('wrapper-moderate');
  const statMod  = document.getElementById('stat-card-moderate');
  const btnMod   = document.getElementById('btn-label-moderate');
  const statModL = document.getElementById('stat-label-moderate');

  if (temMod) {
    if (wrapMod)  wrapMod.classList.remove('hidden');
    if (statMod)  statMod.classList.remove('hidden');
    if (btnMod)   btnMod.textContent  = manual[1].name;
    if (statModL) statModL.textContent = manual[1].name;
  } else {
    if (wrapMod)  wrapMod.classList.add('hidden');
    if (statMod)  statMod.classList.add('hidden');
    if (currentDiscountFilter === 'moderate') {
      currentDiscountFilter = 'light';
      activateFilterBtn('light');
    }
  }

  const autoLevel = levels[levels.length - 1];
  const btnStrong  = document.getElementById('btn-label-strong');
  const statStrong = document.getElementById('stat-label-strong');
  if (btnStrong)  btnStrong.textContent  = autoLevel?.name ?? 'Desconto Forte';
  if (statStrong) statStrong.textContent = autoLevel?.name ?? 'Desconto Forte';
}

/* ═══════════════════════════════════════
   TELA DE CONFIGURAÇÃO
═══════════════════════════════════════ */
let tempConfig = null;

function openConfig() {
  tempConfig = JSON.parse(JSON.stringify(discountConfig));
  renderConfigScreen();
  document.getElementById('config-screen').classList.add('visible');
  window.scrollTo(0, 0);
}

function closeConfig() {
  document.getElementById('config-screen').classList.remove('visible');
}

function selectPeriodo(anos) {
  tempConfig.periodo = anos;
  document.querySelectorAll('.periodo-btn').forEach(btn => {
    btn.classList.toggle('sel', parseInt(btn.dataset.anos) === anos);
  });
}

function renderConfigScreen() {
  document.querySelectorAll('.periodo-btn').forEach(btn => {
    btn.classList.toggle('sel', parseInt(btn.dataset.anos) === tempConfig.periodo);
  });

  const plInput = document.getElementById('pl-input');
  if (plInput) plInput.value = tempConfig.plMax ?? '';

  const container = document.getElementById('niveis-container');
  const levels    = tempConfig.levels;
  const classes   = ['leve', 'mod', 'forte'];

  container.innerHTML = levels.map((lvl, i) => {
    const isAuto    = !!lvl.auto;
    const canRemove = !isAuto && levels.filter(l => !l.auto).length > 1;

    return `
      <div class="nivel-row ${classes[Math.min(i, 2)]}" data-index="${i}">
        <div class="nivel-top">
          <div class="nivel-dot"></div>
          <span class="nivel-name-preview">${lvl.name}</span>
          ${canRemove ? `<button class="btn-remover" onclick="removerNivel(${i})">✕</button>` : ''}
        </div>
        <div class="nivel-fields">
          <div class="field-group">
            <label>Nome (máx. 15)</label>
            <input class="field-input" type="text" value="${lvl.name}" maxlength="15"
              oninput="tempConfig.levels[${i}].name = this.value; this.closest('.nivel-row').querySelector('.nivel-name-preview').textContent = this.value;">
          </div>
          <div class="field-group" style="max-width:110px">
            <label>${isAuto ? 'A partir de' : 'Até'}</label>
            ${isAuto
              ? `<input class="field-input auto-calc" type="text"
                   value="acima de ${levels[i-1] ? levels[i-1].from : 0}%" disabled>
                 <div class="auto-note">calculado automaticamente</div>`
              : `<input class="field-input" type="number" min="0" max="99" step="0.1"
                   value="${lvl.from}"
                   oninput="updateFrom(${i}, this.value)">`
            }
          </div>
        </div>
      </div>
    `;
  }).join('');
}

function updateFrom(index, value) {
  const num = parseFloat(value);
  if (!isNaN(num)) {
    tempConfig.levels[index].from = num;
    const autoInput = document.querySelector('.field-input.auto-calc');
    if (autoInput) {
      const lastManual = tempConfig.levels.filter(l => !l.auto).pop();
      autoInput.value = `acima de ${lastManual ? lastManual.from : 0}%`;
    }
  }
}

function removerNivel(index) {
  const manual = tempConfig.levels.filter(l => !l.auto);
  if (manual.length <= 1) return;
  tempConfig.levels.splice(index, 1);
  renderConfigScreen();
}

function salvarConfig() {
  const manualLevels = tempConfig.levels.filter(l => !l.auto);
  for (let i = 0; i < manualLevels.length - 1; i++) {
    if (manualLevels[i].from >= manualLevels[i+1].from) {
      alert(`⚠️ O percentual do Nível ${i+1} deve ser menor que o Nível ${i+2}.`);
      return;
    }
  }

  discountConfig = JSON.parse(JSON.stringify(tempConfig));
  saveDiscountConfig(discountConfig);
  applyConfigLabels();

  closeConfig();
  filterAndRender(searchInput.value.toUpperCase());
  updateStatistics(allProcessedStocks);

  const toast = document.getElementById('toast');
  toast.classList.add('show');
  setTimeout(() => toast.classList.remove('show'), 2500);
}

function adicionarNivel() {
  const manual = tempConfig.levels.filter(l => !l.auto);
  if (manual.length >= 3) {
    alert('⚠️ Máximo de 3 níveis manuais.');
    return;
  }
  const lastFrom = manual[manual.length - 1]?.from ?? 8.3;
  const novoFrom = parseFloat((lastFrom + 8).toFixed(1));
  const autoIndex = tempConfig.levels.findIndex(l => l.auto);
  tempConfig.levels.splice(autoIndex, 0, { name: 'Novo Nível', from: novoFrom });
  renderConfigScreen();
}

function restaurarPadrao() {
  if (!confirm('Restaurar configuração padrão?')) return;
  tempConfig = JSON.parse(JSON.stringify(DEFAULT_DISCOUNT_CONFIG));
  renderConfigScreen();
}

window.openConfig         = openConfig;
window.closeConfig        = closeConfig;
window.selectPeriodo      = selectPeriodo;
window.removerNivel       = removerNivel;
window.updateFrom         = updateFrom;
window.salvarConfig       = salvarConfig;
window.adicionarNivel     = adicionarNivel;
window.restaurarPadrao    = restaurarPadrao;

/* ── DROPDOWNS DE SETOR ── */
function buildDropdowns() {
  ['light', 'moderate', 'strong'].forEach(filter => {
    const container = document.getElementById(`dropdown-${filter}`);
    if (!container) return;
    container.innerHTML = DROPDOWN_SECTORS.map(sector => `
      <div class="sector-option${sector === 'Todos' ? ' selected' : ''}"
        data-sector="${sector}"
        onclick="selectSector('${filter}', '${sector}', this)">
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
  if (!isOpen) { dropdown.classList.add('open'); activateFilterBtn(filter); }
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
  container.querySelectorAll('.sector-option').forEach(opt =>
    opt.classList.toggle('selected', opt.dataset.sector === sector)
  );
  const btn = document.querySelector(`.filter-btn[data-filter="${filter}"]`);
  let label = btn.querySelector('.filter-btn-sector');
  if (sector === 'Todos') {
    if (label) label.remove();
  } else {
    if (!label) { label = document.createElement('span'); label.className = 'filter-btn-sector'; btn.appendChild(label); }
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

/* ── ANÁLISE DE SAÚDE ── */
function analyzeHealth(fundamentals, priceHistory = null) {
  if (!fundamentals) return { items: [], performanceItems: [] };
  const stats = fundamentals.defaultKeyStatistics || {};
  const items = [];
  const pe = fundamentals.priceEarnings;
  items.push({ label: 'P/L', value: (pe && pe > 0) ? pe.toFixed(2) : 'N/A', status: (pe > 0 && pe < 20) ? 'positive' : (pe >= 20 && pe <= 30) ? 'warning' : 'negative' });
  const pvp = stats.priceToBook;
  items.push({ label: 'P/VP', value: (pvp && pvp > 0) ? pvp.toFixed(2) : 'N/A', status: (pvp > 0 && pvp < 3) ? 'positive' : (pvp >= 3 && pvp <= 5) ? 'warning' : 'negative' });
  const dy = stats.dividendYield;
  items.push({ label: 'Dividend Yield', value: (dy && dy > 0) ? `${dy.toFixed(2)}%` : 'N/A', status: (dy >= 4) ? 'positive' : (dy > 0) ? 'warning' : 'negative' });
  const performanceItems = [];
  const precoAtual = fundamentals.regularMarketPrice ?? null;
  function calcVariacao(atual, anterior) { if (!atual || !anterior || anterior === 0) return null; return ((atual - anterior) / anterior) * 100; }
  function formatVariacao(valor) { if (valor === null) return { value: 'N/A', status: 'negative' }; const sinal = valor >= 0 ? '+' : ''; return { value: `${sinal}${valor.toFixed(2)}%`, status: valor >= 5 ? 'positive' : valor >= 0 ? 'warning' : 'negative' }; }
  performanceItems.push({ label: 'Valorização 12M', ...formatVariacao(calcVariacao(precoAtual, priceHistory?.price12mAgo)) });
  performanceItems.push({ label: 'Valorização Mês',  ...formatVariacao(calcVariacao(precoAtual, priceHistory?.price1mAgo)) });
  return { items, performanceItems };
}

/* ── CACHE ── */
function getCache() {
  try {
    const raw = localStorage.getItem(CONFIG.CACHE_KEY);
    if (!raw) return null;
    const data = JSON.parse(raw);
    return (Date.now() - data.time < CONFIG.CACHE_TIME) ? data.value : null;
  } catch { return null; }
}
function setCache(value) {
  try { localStorage.setItem(CONFIG.CACHE_KEY, JSON.stringify({ time: Date.now(), value })); }
  catch (e) { console.warn('⚠️ Cache não pôde ser salvo:', e.message); }
}

/* ── API ── */
const BRAPI_TOKEN = 'fT19untzZdLhuoC5y4aQxn';

async function fetchDataFromAPI(tickers) {
  try {
    const url = `https://brapi.dev/api/quote/${tickers}?token=${BRAPI_TOKEN}`;
    const response = await fetch(url);
    const data = await response.json();
    if (data.error) throw new Error(data.message || data.error);
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
    const batch   = stocks.slice(i, i + CONFIG.BATCH_SIZE);
    const tickers = batch.map(s => s.ticker).join(',');
    const batchNum = Math.floor(i / CONFIG.BATCH_SIZE) + 1;
    try {
      const apiData = await fetchDataFromAPI(tickers);
      if (apiData?.results) { data.push(...apiData.results); console.log(`✓ Lote ${batchNum}/${totalBatches}`); }
      if (batchNum < totalBatches) await sleep(CONFIG.REQUEST_DELAY);
    } catch (error) { console.warn(`⚠️ Erro lote ${batchNum}:`, error.message); }
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
    const nearest = (target) => sorted.reduce((prev, curr) =>
      Math.abs(curr.date * 1000 - target) < Math.abs(prev.date * 1000 - target) ? curr : prev
    )?.close ?? null;
    return { price12mAgo: nearest(dozeM), price1mAgo: nearest(umM) };
  } catch (err) { console.error(`Erro histórico ${ticker}:`, err); return null; }
}

/* ── RENDERIZAÇÃO ── */
async function renderStocks(stockList) {
  if (stockList.length === 0) {
    app.innerHTML = `
      <div class="empty-state">
        <div class="empty-icon">🔍</div>
        <h3>Nenhuma ação encontrada</h3>
        <p>Tente buscar outro termo ou ajuste os filtros</p>
      </div>`;
    return;
  }

  app.innerHTML = stockList.map((stock, index) => {
    const badgeText   = getBadgeText(stock.discount);
    const badgeClass  = getBadgeClass(stock.discount);
    const borderClass = getBorderClass(stock.discount);
    const discColor   = getDiscountColor(stock.discount);
    const { items }   = analyzeHealth(stock.fundamentals, null);

    return `
      <div class="stock-card ${borderClass}" data-index="${index}">
        <div class="stock-header">
          <div>
            <div class="stock-ticker">${stock.ticker}</div>
            <div class="stock-name">${stock.name}</div>
          </div>
          <div class="discount-badge ${badgeClass}">${badgeText}</div>
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
            <span class="info-label">Média Histórica (${discountConfig.periodo} anos)</span>
            <span class="info-value">${formatBRL(stock.target)}</span>
          </div>
          <div class="info-row">
            <span class="info-label">Desconto</span>
            <span class="info-value" style="color:${discColor}">${stock.discount.toFixed(1)}%</span>
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
              </div>`).join('')}
            <div class="health-title" style="margin-top:12px">📈 Performance</div>
            <div id="performance-${index}">
              <div class="health-item">
                <span class="health-label" style="color:#6b7280;font-size:0.8rem">⏳ Carregando...</span>
              </div>
            </div>
          </div>
        </div>
      </div>`;
  }).join('');

  stockList.forEach((stock, index) => {
    fetchPriceHistory(stock.ticker).then(history => {
      const el = document.getElementById(`performance-${index}`);
      if (!el) return;
      const { performanceItems } = analyzeHealth(stock.fundamentals, history);
      el.innerHTML = performanceItems.map(item => `
        <div class="health-item">
          <span class="health-label">${item.label}</span>
          <span class="health-value ${item.status}">${item.value}</span>
        </div>`).join('');
    });
  });
}

/* ── FILTROS ── */
function applyFilters(stockList, searchTerm = '') {
  if (searchTerm) {
    const norm = searchTerm.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
    return stockList.filter(stock => {
      const fields = [stock.ticker, stock.name, stock.sector, ...(stock.aliases || [])]
        .join(' ').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
      return fields.includes(norm);
    });
  }

  const manual = getManualLevels();
  const l0from = manual[0]?.from ?? 8.3;
  const l1from = manual[1]?.from ?? 16.6;
  const temMod = hasModerato();

  let filtered = stockList.filter(stock => {
    const d = stock.discount;
    if (d <= 0) return false;

    if (currentDiscountFilter === 'strong') {
      const lastFrom = manual[manual.length - 1]?.from ?? l0from;
      return d >= lastFrom;
    }
    if (currentDiscountFilter === 'moderate') {
      if (!temMod) return false;
      return d >= l0from && d < l1from;
    }
    if (currentDiscountFilter === 'light') {
      return d > 0 && d < l0from;
    }
    return false;
  });

  if (currentSectorFilter && currentSectorFilter !== 'Todos') {
    filtered = filtered.filter(stock =>
      stock.sector.toLowerCase() === currentSectorFilter.toLowerCase()
    );
  }

  // Exclui P/L negativo sempre (armadilha de valor)
  filtered = filtered.filter(stock => {
    const pl = stock.fundamentals?.priceEarnings;
    return !(pl !== null && pl !== undefined && pl <= 0);
  });

  // Teto de 25% — acima disso o sinal não é confiável
  filtered = filtered.filter(stock => stock.discount <= 25);

  // Filtro P/L opcional
  if (discountConfig.plMax !== null && discountConfig.plMax !== undefined) {
    const maxPL = parseFloat(discountConfig.plMax);
    if (!isNaN(maxPL) && maxPL > 0) {
      filtered = filtered.filter(stock => {
        const pl = stock.fundamentals?.priceEarnings;
        if (!pl || pl <= 0) return false; // exclui N/A e negativo (negativo já foi barrado acima)
        return pl <= maxPL;
      });
    }
  }

  return filtered;
}

function filterAndRender(searchTerm = '') {
  const filtered = applyFilters(allProcessedStocks, searchTerm);
  filtered.sort((a, b) => b.discount - a.discount);
  renderStocks(filtered);
}

/* ── ESTATÍSTICAS ── */
function updateStatistics(allStocks) {
  const manual = getManualLevels();
  const l0from = manual[0]?.from ?? 8.3;
  const l1from = manual[1]?.from ?? 16.6;
  const temMod = hasModerato();

  const s = {
    total:    allStocks.length,
    strong:   allStocks.filter(s => s.discount >= (temMod ? l1from : l0from)).length,
    moderate: temMod ? allStocks.filter(s => s.discount >= l0from && s.discount < l1from).length : 0,
    light:    allStocks.filter(s => s.discount > 0 && s.discount < l0from).length
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

/* ── PROCESSAMENTO ── */
function targetFromHistory(min, max, category) {
  const factor = category === 'perene' ? 0.6 : 0.5;
  return min + (max - min) * factor;
}

function processApiData(apiData) {
  return stocks.map(stock => {
    const api = apiData.find(d => d.symbol === stock.ticker);
    if (!api)                                              { console.warn(`❌ ${stock.ticker}: não encontrado`);     return null; }
    if (!api.regularMarketPrice || api.regularMarketPrice <= 0) { console.warn(`⚠️ ${stock.ticker}: preço inválido`); return null; }
    if (!api.fiftyTwoWeekLow || !api.fiftyTwoWeekHigh || api.fiftyTwoWeekHigh <= api.fiftyTwoWeekLow) { console.warn(`⚠️ ${stock.ticker}: histórico inválido`); return null; }
    const target   = targetFromHistory(api.fiftyTwoWeekLow, api.fiftyTwoWeekHigh, stock.category);
    const discount = ((target - api.regularMarketPrice) / target) * 100;
    return { ...stock, price: api.regularMarketPrice, target, discount, change: api.regularMarketChange || 0, fundamentals: api };
  }).filter(Boolean);
}

/* ── EXPANSÃO DE CARDS ── */
function toggleHealth(index) {
  const section = document.getElementById(`health-${index}`);
  const arrow   = document.querySelector(`[data-index="${index}"] .expand-arrow`);
  if (!section || !arrow) return;
  const expanded = section.classList.contains('expanded');
  section.classList.toggle('expanded', !expanded);
  arrow.classList.toggle('expanded', !expanded);
  const icon = arrow.querySelector('.arrow-icon');
  if (icon) { icon.style.display = 'inline-block'; icon.style.transition = 'transform 0.3s ease'; icon.style.transform = expanded ? 'rotate(0deg)' : 'rotate(180deg)'; }
}

/* ── INICIALIZAÇÃO ── */
async function loadApp() {
  app.innerHTML = `<div class="loading"><div class="spinner"></div><p>Carregando dados das ações...</p></div>`;

  const cached = getCache();
  if (cached) {
    allProcessedStocks = cached;
    console.log(`📦 Cache válido — ${cached.length} ações`);
    filterAndRender();
    updateStatistics(cached);
    return;
  }

  console.log('🌐 Buscando na BRAPI...');
  const apiData = await fetchAllStocks();
  const processedStocks = processApiData(apiData);
  console.log(`📊 OK: ${processedStocks.length}`);

  if (processedStocks.length > 0) setCache(processedStocks);
  allProcessedStocks = processedStocks;
  filterAndRender();
  updateStatistics(processedStocks);
}

/* ── EVENTOS ── */
searchInput.addEventListener('input', (e) => filterAndRender(e.target.value.toUpperCase()));

/* ── EXPOR GLOBAIS ── */
window.toggleHealth         = toggleHealth;
window.toggleSectorDropdown = toggleSectorDropdown;
window.selectSector         = selectSector;

/* ── START ── */
buildDropdowns();
applyConfigLabels();
loadApp();
console.log('🚀 Auricchio inicializado com sucesso!');

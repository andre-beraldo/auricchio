/* ========================================
   AURICCHIO - Monitor de Ações
   App.js Refatorado e Organizado
======================================== */

/* ================= ELEMENTOS DOM ================= */
const app = document.getElementById('app');
const searchInput = document.getElementById('search');

/* ================= CONFIGURAÇÕES ================= */
const CONFIG = {
  API_BASE: 'https://brapi.dev/api/quote',
  API_KEY: '4GPeeg5frU4MAtdp44bEqZ', // TODO: Mover para backend quando for produção
  CACHE_KEY: 'stocksCache_40_final',
  CACHE_TIME: 30 * 60 * 1000, // 30 minutos
  REQUEST_DELAY: 350 // 350ms entre requests
};

/* ================= ESTADO DA APLICAÇÃO ================= */
let currentDiscountFilter = 'strong'; // Filtro ativo (strong, moderate, light)

/* ================= AÇÕES (70) ================= */
const stocks = [
  // Bancos
  { ticker: 'ITUB4', name: 'Itaú', sector: 'Bancos', category: 'perene' },
  { ticker: 'BBDC4', name: 'Bradesco', sector: 'Bancos', category: 'perene' },
  { ticker: 'BBAS3', name: 'Banco do Brasil', sector: 'Bancos', category: 'perene' },
  { ticker: 'SANB11', name: 'Santander', sector: 'Bancos', category: 'perene' },
  { ticker: 'BPAC11', name: 'BTG Pactual', sector: 'Bancos', category: 'perene' },
  { ticker: 'BRSR6', name: 'Banrisul', sector: 'Bancos', category: 'perene' },
  
  // Energia
  { ticker: 'TAEE11', name: 'Taesa', sector: 'Energia', category: 'perene' },
  { ticker: 'EGIE3', name: 'Engie', sector: 'Energia', category: 'perene' },
  { ticker: 'CPLE6', name: 'Copel', sector: 'Energia', category: 'perene' },
  { ticker: 'CMIG4', name: 'Cemig', sector: 'Energia', category: 'perene' },
  { ticker: 'EQTL3', name: 'Equatorial', sector: 'Energia', category: 'perene' },
  { ticker: 'ELET3', name: 'Eletrobras', sector: 'Energia', category: 'perene' },
  { ticker: 'TRPL4', name: 'Tran Paulist', sector: 'Energia', category: 'perene' },
  { ticker: 'ENEV3', name: 'Eneva', sector: 'Energia', category: 'ciclica' },
  { ticker: 'CSAN3', name: 'Cosan', sector: 'Energia/Combustíveis', category: 'ciclica' },
  
  // Petróleo e Mineração
  { ticker: 'PETR4', name: 'Petrobras', sector: 'Petróleo', category: 'ciclica' },
  { ticker: 'PRIO3', name: 'Prio', sector: 'Petróleo', category: 'ciclica' },
  { ticker: 'RECV3', name: 'PetroReconcavo', sector: 'Petróleo', category: 'ciclica' },
  { ticker: 'VALE3', name: 'Vale', sector: 'Mineração', category: 'ciclica' },
  
  // Siderurgia
  { ticker: 'GGBR4', name: 'Gerdau', sector: 'Siderurgia', category: 'ciclica' },
  { ticker: 'CSNA3', name: 'CSN', sector: 'Siderurgia', category: 'ciclica' },
  { ticker: 'USIM5', name: 'Usiminas', sector: 'Siderurgia', category: 'ciclica' },
  
  // Alimentos e Bebidas
  { ticker: 'ABEV3', name: 'Ambev', sector: 'Bebidas', category: 'perene' },
  { ticker: 'JBSS3', name: 'JBS', sector: 'Alimentos', category: 'ciclica' },
  { ticker: 'BRFS3', name: 'BRF', sector: 'Alimentos', category: 'ciclica' },
  { ticker: 'MRFG3', name: 'Marfrig', sector: 'Alimentos', category: 'ciclica' },
  { ticker: 'BEEF3', name: 'Minerva', sector: 'Alimentos', category: 'ciclica' },
  
  // Varejo
  { ticker: 'LREN3', name: 'Renner', sector: 'Varejo', category: 'perene' },
  { ticker: 'MGLU3', name: 'Magazine Luiza', sector: 'Varejo', category: 'ciclica' },
  { ticker: 'ASAI3', name: 'Assaí', sector: 'Varejo', category: 'perene' },
  { ticker: 'CRFB3', name: 'Carrefour', sector: 'Varejo', category: 'perene' },
  { ticker: 'PCAR3', name: 'GPA', sector: 'Varejo', category: 'ciclica' },
  { ticker: 'ARZZ3', name: 'Arezzo', sector: 'Varejo', category: 'perene' },
  { ticker: 'SOMA3', name: 'Grupo Soma', sector: 'Varejo', category: 'perene' },
  
  // Saúde
  { ticker: 'RADL3', name: 'Raia Drogasil', sector: 'Saúde', category: 'perene' },
  { ticker: 'FLRY3', name: 'Fleury', sector: 'Saúde', category: 'perene' },
  { ticker: 'HYPE3', name: 'Hypera', sector: 'Saúde', category: 'perene' },
  { ticker: 'QUAL3', name: 'Qualicorp', sector: 'Saúde', category: 'perene' },
  
  // Indústria
  { ticker: 'WEGE3', name: 'WEG', sector: 'Indústria', category: 'perene' },
  { ticker: 'EMBR3', name: 'Embraer', sector: 'Indústria', category: 'ciclica' },
  
  // Tecnologia
  { ticker: 'TOTS3', name: 'Totvs', sector: 'Tecnologia', category: 'perene' },
  { ticker: 'LWSA3', name: 'Locaweb', sector: 'Tecnologia', category: 'ciclica' },
  
  // Shoppings
  { ticker: 'MULT3', name: 'Multiplan', sector: 'Shoppings', category: 'perene' },
  { ticker: 'IGTI11', name: 'Iguatemi', sector: 'Shoppings', category: 'perene' },
  { ticker: 'ALSO3', name: 'Aliansce Sonae', sector: 'Shoppings', category: 'perene' },
  { ticker: 'ALOS3', name: 'Allos', sector: 'Shoppings', category: 'perene' },
  
  // Infraestrutura e Logística
  { ticker: 'CCRO3', name: 'CCR', sector: 'Concessões', category: 'perene' },
  { ticker: 'RAIL3', name: 'Rumo', sector: 'Logística', category: 'ciclica' },
  
  // Saneamento e Utilities
  { ticker: 'SBSP3', name: 'Sabesp', sector: 'Saneamento', category: 'perene' },
  { ticker: 'UGPA3', name: 'Ultrapar', sector: 'Distribuição', category: 'perene' },
  
  // Agronegócio
  { ticker: 'SLCE3', name: 'SLC Agrícola', sector: 'Agro', category: 'ciclica' },
  
  // Mercado Financeiro
  { ticker: 'B3SA3', name: 'B3', sector: 'Mercado Financeiro', category: 'perene' },
  
  // Seguros
  { ticker: 'BBSE3', name: 'BB Seguridade', sector: 'Seguros', category: 'perene' },
  { ticker: 'SULA11', name: 'Sul América', sector: 'Seguros', category: 'perene' },
  { ticker: 'PSSA3', name: 'Porto Seguro', sector: 'Seguros', category: 'perene' },
  
  // Telecom
  { ticker: 'VIVT3', name: 'Vivo', sector: 'Telecom', category: 'perene' },
  { ticker: 'TIMS3', name: 'TIM', sector: 'Telecom', category: 'perene' },
  
  // Papel e Celulose
  { ticker: 'KLBN11', name: 'Klabin', sector: 'Papel', category: 'perene' },
  { ticker: 'SUZB3', name: 'Suzano', sector: 'Papel', category: 'ciclica' },
  { ticker: 'RANI3', name: 'Irani', sector: 'Papel', category: 'ciclica' },
  
  // Outros
  { ticker: 'RENT3', name: 'Localiza', sector: 'Aluguel de Veículos', category: 'ciclica' },
  { ticker: 'CYRE3', name: 'Cyrela', sector: 'Construção Civil', category: 'ciclica' },
  { ticker: 'MRVE3', name: 'MRV', sector: 'Construção Civil', category: 'ciclica' },
  { ticker: 'NTCO3', name: 'Natura', sector: 'Cosméticos', category: 'perene' },
  { ticker: 'YDUQ3', name: 'Yduqs', sector: 'Educação', category: 'perene' },
  { ticker: 'COGN3', name: 'Cogna', sector: 'Educação', category: 'perene' },
  { ticker: 'VBBR3', name: 'Vibra Energia', sector: 'Combustíveis', category: 'ciclica' },
  { ticker: 'RAIZ4', name: 'Raízen', sector: 'Combustíveis', category: 'ciclica' }
];

/* ================= FUNÇÕES UTILITÁRIAS ================= */

// Calcula preço-alvo baseado no histórico
function targetFromHistory(min, max, category) {
  const range = max - min;
  const factor = category === 'perene' ? 0.6 : 0.5;
  return min + range * factor;
}

// Retorna classe CSS da borda baseado no desconto
function getBorderClass(discount) {
  if (discount >= 16.6) return 'border-green-500';
  if (discount >= 8.3) return 'border-yellow-500';
  if (discount > 0) return 'border-gray-400';
  return 'border-red-500';
}

// Retorna nível de desconto (strong, moderate, light)
function getDiscountLevel(discount) {
  if (discount >= 16.6) return 'strong';
  if (discount >= 8.3) return 'moderate';
  return 'light';
}

// Retorna texto do badge
function getBadgeText(discountLevel) {
  if (discountLevel === 'strong') return 'Desconto Forte';
  if (discountLevel === 'moderate') return 'Desconto Moderado';
  return 'Desconto Leve';
}

// Formata valor em reais
function formatBRL(value) {
  return `R$ ${value.toFixed(2)}`;
}

// Sleep para delay entre requests
const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));

/* ================= CACHE ================= */

function getCache() {
  const raw = localStorage.getItem(CONFIG.CACHE_KEY);
  if (!raw) return null;
  
  const data = JSON.parse(raw);
  const isCacheValid = Date.now() - data.time < CONFIG.CACHE_TIME;
  
  return isCacheValid ? data.value : null;
}

function setCache(value) {
  const cacheData = {
    time: Date.now(),
    value: value
  };
  localStorage.setItem(CONFIG.CACHE_KEY, JSON.stringify(cacheData));
}

/* ================= API ================= */

async function fetchStockData(ticker) {
  const url = `${CONFIG.API_BASE}/${ticker}?token=${CONFIG.API_KEY}`;
  const response = await fetch(url);
  
  if (!response.ok) {
    throw new Error(`HTTP ${response.status}`);
  }
  
  const json = await response.json();
  return json.results[0];
}

async function fetchAllStocks() {
  // Tenta pegar do cache primeiro
  const cached = getCache();
  if (cached) {
    console.log('📦 Dados carregados do cache');
    return cached;
  }

  console.log('🌐 Buscando dados da API...');
  const data = [];
  
  for (const stock of stocks) {
    try {
      const stockData = await fetchStockData(stock.ticker);
      data.push(stockData);
      await sleep(CONFIG.REQUEST_DELAY);
    } catch (error) {
      console.warn(`⚠️  Erro ao buscar ${stock.ticker}:`, error.message);
    }
  }
  
  setCache(data);
  console.log('✅ Dados salvos no cache');
  return data;
}

/* ================= RENDERIZAÇÃO ================= */

function renderStocks(stockList) {
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

  app.innerHTML = stockList.map(stock => {
    const discountLevel = getDiscountLevel(stock.discount);
    const badgeText = getBadgeText(discountLevel);
    const borderClass = getBorderClass(stock.discount);
    const discountColor = discountLevel === 'strong' ? '#10b981' : 
                         discountLevel === 'moderate' ? '#f59e0b' : '#9ca3af';
    
    return `
      <div class="stock-card ${borderClass}">
        <div class="stock-header">
          <div>
            <div class="stock-ticker">${stock.ticker}</div>
            <div class="stock-name">${stock.name}</div>
          </div>
          <div class="discount-badge ${discountLevel}">
            ${badgeText}
          </div>
        </div>
        
        <span class="stock-sector">${stock.sector}</span>
        
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
            <span class="info-value" style="color: ${discountColor}">
              ${stock.discount.toFixed(1)}%
            </span>
          </div>
        </div>
      </div>
    `;
  }).join('');
}

function updateStatistics(allStocks) {
  const stats = {
    total: allStocks.length,
    strong: allStocks.filter(s => s.discount >= 16.6).length,
    moderate: allStocks.filter(s => s.discount >= 8.3 && s.discount < 16.6).length,
    light: allStocks.filter(s => s.discount > 0 && s.discount < 8.3).length
  };
  
  document.getElementById('totalStocks').textContent = stats.total;
  document.getElementById('strongDiscounts').textContent = stats.strong;
  document.getElementById('moderateDiscounts').textContent = stats.moderate;
  document.getElementById('lightDiscounts').textContent = stats.light;
}

/* ================= FILTROS ================= */

function applyFilters(stockList, searchTerm = '') {
  let filtered = stockList;
  
  // Filtro de busca
  if (searchTerm) {
    filtered = filtered.filter(stock =>
      stock.ticker.includes(searchTerm) ||
      stock.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      stock.sector.toLowerCase().includes(searchTerm.toLowerCase())
    );
    // Se tem busca, retorna SEM aplicar filtro de desconto
    return filtered;
  }
  
  // Filtro de desconto (SÓ aplica se NÃO tiver busca)
  if (currentDiscountFilter) {
    filtered = filtered.filter(stock => {
      if (currentDiscountFilter === 'strong') return stock.discount >= 16.6;
      if (currentDiscountFilter === 'moderate') return stock.discount >= 8.3 && stock.discount < 16.6;
      if (currentDiscountFilter === 'light') return stock.discount > 0 && stock.discount < 8.3;
      return true;
    });
  }
  
  return filtered;
}

/* ================= APLICAÇÃO PRINCIPAL ================= */

async function loadApp(searchTerm = '') {
  // Mostra loading
  app.innerHTML = `
    <div class="loading">
      <div class="spinner"></div>
      <p>Carregando dados das ações...</p>
    </div>
  `;

  // Busca dados da API
  const apiData = await fetchAllStocks();

  // Processa dados
  const processedStocks = stocks
    .map(stock => {
      const apiStock = apiData.find(data => data.symbol === stock.ticker);
      if (!apiStock) return null;

      const target = targetFromHistory(
        apiStock.fiftyTwoWeekLow,
        apiStock.fiftyTwoWeekHigh,
        stock.category
      );

      const discount = ((target - apiStock.regularMarketPrice) / target) * 100;

      return {
        ...stock,
        price: apiStock.regularMarketPrice,
        target: target,
        discount: discount
      };
    })
    .filter(Boolean); // Remove nulls

  // Aplica filtros
  const filteredStocks = applyFilters(processedStocks, searchTerm);

  // Ordena por desconto (maior primeiro)
  filteredStocks.sort((a, b) => b.discount - a.discount);

  // Renderiza
  renderStocks(filteredStocks);
  updateStatistics(processedStocks);
}

/* ================= EVENT LISTENERS ================= */

// Busca
searchInput.addEventListener('input', (e) => {
  const searchTerm = e.target.value.toUpperCase();
  loadApp(searchTerm);
});

// Filtros de desconto
document.querySelectorAll('.filter-btn').forEach(button => {
  button.addEventListener('click', () => {
    // Atualiza botão ativo
    document.querySelectorAll('.filter-btn').forEach(btn => {
      btn.classList.remove('active');
    });
    button.classList.add('active');
    
    // Atualiza filtro e recarrega
    currentDiscountFilter = button.dataset.filter;
    const searchTerm = searchInput.value.toUpperCase();
    loadApp(searchTerm);
  });
});

/* ================= INICIALIZAÇÃO ================= */

// Carrega app ao iniciar
loadApp();

console.log('🚀 Auricchio inicializado com sucesso!');

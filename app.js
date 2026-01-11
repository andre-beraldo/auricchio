const app = document.getElementById('app');
const searchInput = document.getElementById('search');

const BRAPI_API_KEY = '4GPeeg5frU4MAtdp44bEqZ';
const CACHE_DURATION = 30 * 60 * 1000; // 30 minutos em milissegundos
const INITIAL_LIMIT = 10; // Mostra TOP 10 na tela inicial

// Definir descontos personalizados por categoria
const DISCOUNT_TARGETS = {
  'perene-br': 0.12,  // 12% para perenes BR
  'ciclica-br': 0.20, // 20% para cíclicas BR
  'tech-us': 0.10     // 10% para tech US
};

// ~90 ações mais líquidas da B3 organizadas por setor
const stocks = [
  // BANCOS
  { ticker: 'ITUB4', name: 'Itaú Unibanco', sector: 'Bancos · BR', type: 'BR', category: 'perene-br' },
  { ticker: 'BBDC4', name: 'Bradesco', sector: 'Bancos · BR', type: 'BR', category: 'perene-br' },
  { ticker: 'BBAS3', name: 'Banco do Brasil', sector: 'Bancos · BR', type: 'BR', category: 'perene-br' },
  { ticker: 'SANB11', name: 'Santander', sector: 'Bancos · BR', type: 'BR', category: 'perene-br' },
  { ticker: 'BBSE3', name: 'BB Seguridade', sector: 'Seguros · BR', type: 'BR', category: 'perene-br' },
  
  // VAREJO
  { ticker: 'LREN3', name: 'Lojas Renner', sector: 'Varejo · BR', type: 'BR', category: 'perene-br' },
  { ticker: 'MGLU3', name: 'Magazine Luiza', sector: 'Varejo · BR', type: 'BR', category: 'ciclica-br' },
  { ticker: 'AMER3', name: 'Americanas', sector: 'Varejo · BR', type: 'BR', category: 'ciclica-br' },
  { ticker: 'PETZ3', name: 'Petz', sector: 'Varejo · BR', type: 'BR', category: 'ciclica-br' },
  { ticker: 'CRFB3', name: 'Carrefour Brasil', sector: 'Varejo · BR', type: 'BR', category: 'perene-br' },
  { ticker: 'ASAI3', name: 'Assaí', sector: 'Varejo · BR', type: 'BR', category: 'perene-br' },
  { ticker: 'PCAR3', name: 'Grupo Pão de Açúcar', sector: 'Varejo · BR', type: 'BR', category: 'ciclica-br' },
  { ticker: 'VIIA3', name: 'Via', sector: 'Varejo · BR', type: 'BR', category: 'ciclica-br' },
  
  // ENERGIA ELÉTRICA
  { ticker: 'EGIE3', name: 'Engie Brasil', sector: 'Energia · BR', type: 'BR', category: 'perene-br' },
  { ticker: 'TAEE11', name: 'Taesa', sector: 'Energia · BR', type: 'BR', category: 'perene-br' },
  { ticker: 'ENBR3', name: 'EDP Brasil', sector: 'Energia · BR', type: 'BR', category: 'perene-br' },
  { ticker: 'CMIG4', name: 'Cemig', sector: 'Energia · BR', type: 'BR', category: 'perene-br' },
  { ticker: 'CPLE6', name: 'Copel', sector: 'Energia · BR', type: 'BR', category: 'perene-br' },
  { ticker: 'TRPL4', name: 'Transmissão Paulista', sector: 'Energia · BR', type: 'BR', category: 'perene-br' },
  { ticker: 'NEOE3', name: 'Neoenergia', sector: 'Energia · BR', type: 'BR', category: 'perene-br' },
  { ticker: 'CPFE3', name: 'CPFL Energia', sector: 'Energia · BR', type: 'BR', category: 'perene-br' },
  
  // PETRÓLEO E GÁS
  { ticker: 'PETR4', name: 'Petrobras', sector: 'Petróleo · BR', type: 'BR', category: 'ciclica-br' },
  { ticker: 'PETR3', name: 'Petrobras ON', sector: 'Petróleo · BR', type: 'BR', category: 'ciclica-br' },
  { ticker: 'PRIO3', name: 'Prio', sector: 'Petróleo · BR', type: 'BR', category: 'ciclica-br' },
  { ticker: 'RECV3', name: 'PetroReconcavo', sector: 'Petróleo · BR', type: 'BR', category: 'ciclica-br' },
  
  // MINERAÇÃO E SIDERURGIA
  { ticker: 'VALE3', name: 'Vale', sector: 'Mineração · BR', type: 'BR', category: 'ciclica-br' },
  { ticker: 'GGBR4', name: 'Gerdau', sector: 'Siderurgia · BR', type: 'BR', category: 'ciclica-br' },
  { ticker: 'GOAU4', name: 'Gerdau Metalúrgica', sector: 'Siderurgia · BR', type: 'BR', category: 'ciclica-br' },
  { ticker: 'CSNA3', name: 'CSN', sector: 'Siderurgia · BR', type: 'BR', category: 'ciclica-br' },
  { ticker: 'USIM5', name: 'Usiminas', sector: 'Siderurgia · BR', type: 'BR', category: 'ciclica-br' },
  
  // PAPEL E CELULOSE
  { ticker: 'SUZB3', name: 'Suzano', sector: 'Papel e Celulose · BR', type: 'BR', category: 'ciclica-br' },
  { ticker: 'KLBN11', name: 'Klabin', sector: 'Papel e Celulose · BR', type: 'BR', category: 'perene-br' },
  
  // CONSTRUÇÃO E IMÓVEIS
  { ticker: 'CYRE3', name: 'Cyrela', sector: 'Construção · BR', type: 'BR', category: 'ciclica-br' },
  { ticker: 'MRVE3', name: 'MRV', sector: 'Construção · BR', type: 'BR', category: 'ciclica-br' },
  { ticker: 'EZTC3', name: 'EZTec', sector: 'Construção · BR', type: 'BR', category: 'ciclica-br' },
  { ticker: 'JHSF3', name: 'JHSF', sector: 'Construção · BR', type: 'BR', category: 'ciclica-br' },
  { ticker: 'TEND3', name: 'Tenda', sector: 'Construção · BR', type: 'BR', category: 'ciclica-br' },
  
  // TELECOMUNICAÇÕES
  { ticker: 'VIVT3', name: 'Vivo', sector: 'Telecom · BR', type: 'BR', category: 'perene-br' },
  { ticker: 'TIMS3', name: 'TIM', sector: 'Telecom · BR', type: 'BR', category: 'perene-br' },
  
  // ALIMENTOS E BEBIDAS
  { ticker: 'ABEV3', name: 'Ambev', sector: 'Bebidas · BR', type: 'BR', category: 'perene-br' },
  { ticker: 'JBSS3', name: 'JBS', sector: 'Alimentos · BR', type: 'BR', category: 'ciclica-br' },
  { ticker: 'BRFS3', name: 'BRF', sector: 'Alimentos · BR', type: 'BR', category: 'ciclica-br' },
  { ticker: 'MRFG3', name: 'Marfrig', sector: 'Alimentos · BR', type: 'BR', category: 'ciclica-br' },
  { ticker: 'BEEF3', name: 'Minerva', sector: 'Alimentos · BR', type: 'BR', category: 'ciclica-br' },
  { ticker: 'SMTO3', name: 'São Martinho', sector: 'Alimentos · BR', type: 'BR', category: 'ciclica-br' },
  
  // SAÚDE
  { ticker: 'RDOR3', name: 'Rede D\'Or', sector: 'Saúde · BR', type: 'BR', category: 'perene-br' },
  { ticker: 'HAPV3', name: 'Hapvida', sector: 'Saúde · BR', type: 'BR', category: 'perene-br' },
  { ticker: 'QUAL3', name: 'Qualicorp', sector: 'Saúde · BR', type: 'BR', category: 'perene-br' },
  { ticker: 'GNDI3', name: 'NotreDame Intermédica', sector: 'Saúde · BR', type: 'BR', category: 'perene-br' },
  { ticker: 'FLRY3', name: 'Fleury', sector: 'Saúde · BR', type: 'BR', category: 'perene-br' },
  
  // EDUCAÇÃO
  { ticker: 'COGN3', name: 'Cogna', sector: 'Educação · BR', type: 'BR', category: 'ciclica-br' },
  { ticker: 'YDUQ3', name: 'Yduqs', sector: 'Educação · BR', type: 'BR', category: 'ciclica-br' },
  
  // TECNOLOGIA E SERVIÇOS
  { ticker: 'TOTS3', name: 'Totvs', sector: 'Tecnologia · BR', type: 'BR', category: 'perene-br' },
  { ticker: 'LWSA3', name: 'Locaweb', sector: 'Tecnologia · BR', type: 'BR', category: 'ciclica-br' },
  { ticker: 'POSI3', name: 'Positivo', sector: 'Tecnologia · BR', type: 'BR', category: 'ciclica-br' },
  { ticker: 'RENT3', name: 'Localiza', sector: 'Serviços · BR', type: 'BR', category: 'perene-br' },
  { ticker: 'MOVI3', name: 'Movida', sector: 'Serviços · BR', type: 'BR', category: 'ciclica-br' },
  
  // LOGÍSTICA E TRANSPORTE
  { ticker: 'RAIL3', name: 'Rumo', sector: 'Logística · BR', type: 'BR', category: 'ciclica-br' },
  { ticker: 'CCRO3', name: 'CCR', sector: 'Concessões · BR', type: 'BR', category: 'perene-br' },
  { ticker: 'CSAN3', name: 'Cosan', sector: 'Logística · BR', type: 'BR', category: 'ciclica-br' },
  { ticker: 'AZUL4', name: 'Azul', sector: 'Aéreas · BR', type: 'BR', category: 'ciclica-br' },
  { ticker: 'GOLL4', name: 'Gol', sector: 'Aéreas · BR', type: 'BR', category: 'ciclica-br' },
  
  // SHOPPINGS
  { ticker: 'MULT3', name: 'Multiplan', sector: 'Shoppings · BR', type: 'BR', category: 'perene-br' },
  { ticker: 'IGTI11', name: 'Iguatemi', sector: 'Shoppings · BR', type: 'BR', category: 'perene-br' },
  { ticker: 'ALSO3', name: 'Aliansce Sonae', sector: 'Shoppings · BR', type: 'BR', category: 'perene-br' },
  
  // OUTRAS RELEVANTES
  { ticker: 'WEGE3', name: 'WEG', sector: 'Máquinas · BR', type: 'BR', category: 'perene-br' },
  { ticker: 'EMBR3', name: 'Embraer', sector: 'Aeronáutica · BR', type: 'BR', category: 'ciclica-br' },
  { ticker: 'RAIZ4', name: 'Raízen', sector: 'Combustíveis · BR', type: 'BR', category: 'ciclica-br' },
  { ticker: 'UGPA3', name: 'Ultrapar', sector: 'Combustíveis · BR', type: 'BR', category: 'perene-br' },
  { ticker: 'SBSP3', name: 'Sabesp', sector: 'Saneamento · BR', type: 'BR', category: 'perene-br' },
  { ticker: 'CSMG3', name: 'Copasa', sector: 'Saneamento · BR', type: 'BR', category: 'perene-br' },
  { ticker: 'RADL3', name: 'Raia Drogasil', sector: 'Farmácias · BR', type: 'BR', category: 'perene-br' },
  { ticker: 'POMO4', name: 'Marcopolo', sector: 'Veículos · BR', type: 'BR', category: 'ciclica-br' },
  { ticker: 'RAPT4', name: 'Randon', sector: 'Veículos · BR', type: 'BR', category: 'ciclica-br' },
  { ticker: 'SLCE3', name: 'SLC Agrícola', sector: 'Agronegócio · BR', type: 'BR', category: 'ciclica-br' },
  { ticker: 'BRML3', name: 'BR Malls', sector: 'Shoppings · BR', type: 'BR', category: 'perene-br' },
  
  // TECH US (mantendo as originais)
  { ticker: 'AAPL', name: 'Apple', sector: 'Tech · US', type: 'US', category: 'tech-us' },
  { ticker: 'MSFT', name: 'Microsoft', sector: 'Tech · US', type: 'US', category: 'tech-us' }
];

function getColor(discount) {
  if (discount >= 20) return 'border-green-500';
  if (discount >= 10) return 'border-yellow-500';
  return 'border-slate-700';
}

function formatPrice(v, c) {
  return `${c === 'BRL' ? 'R$' : '$'} ${v.toFixed(2)}`;
}

// Sistema de cache inteligente
function getCachedData() {
  try {
    const cached = localStorage.getItem('stocksCache');
    if (!cached) return null;
    
    const data = JSON.parse(cached);
    const now = Date.now();
    
    // Verifica se o cache ainda é válido (30 minutos)
    if (now - data.timestamp < CACHE_DURATION) {
      console.log('✅ Usando dados do cache (economizando API!)');
      return data.stocks;
    }
    
    console.log('⏰ Cache expirado, buscando dados novos...');
    return null;
  } catch (error) {
    console.error('Erro ao ler cache:', error);
    return null;
  }
}

function setCachedData(stocks) {
  try {
    const data = {
      timestamp: Date.now(),
      stocks: stocks
    };
    localStorage.setItem('stocksCache', JSON.stringify(data));
    console.log('💾 Dados salvos no cache por 30 minutos');
  } catch (error) {
    console.error('Erro ao salvar cache:', error);
  }
}

// Buscar múltiplas ações de uma vez na Brapi (dividindo em lotes)
async function fetchStocks() {
  // Primeiro tenta pegar do cache
  const cached = getCachedData();
  if (cached) return cached;
  
  try {
    // Divide as ações em lotes de 40 (evita URL muito longa)
    const batchSize = 40;
    const batches = [];
    
    for (let i = 0; i < stocks.length; i += batchSize) {
      batches.push(stocks.slice(i, i + batchSize));
    }
    
    console.log(`📡 Buscando ${stocks.length} ações em ${batches.length} requisições...`);
    
    // Busca cada lote
    const allResults = [];
    
    for (let i = 0; i < batches.length; i++) {
      const batch = batches[i];
      const tickers = batch.map(s => s.ticker).join(',');
      const url = `https://brapi.dev/api/quote/${tickers}?range=1mo&interval=1d&token=${BRAPI_API_KEY}`;
      
      console.log(`📊 Requisição ${i + 1}/${batches.length}: ${batch.length} ações...`);
      
      const res = await fetch(url);
      
      if (!res.ok) {
        console.error(`Erro na requisição ${i + 1}:`, res.status);
        continue; // Continua mesmo se uma falhar
      }
      
      const data = await res.json();
      const results = data.results || [];
      allResults.push(...results);
      
      // Aguarda 500ms entre requisições para não sobrecarregar a API
      if (i < batches.length - 1) {
        await new Promise(resolve => setTimeout(resolve, 500));
      }
    }
    
    console.log(`✅ Total carregado: ${allResults.length} ações`);
    
    // Salva no cache
    setCachedData(allResults);
    
    return allResults;
  } catch (error) {
    console.error('Erro ao buscar ações:', error);
    return null;
  }
}

async function loadStocks() {
  app.innerHTML = `<p class="text-center text-slate-400">Buscando oportunidades...</p>`;
  
  const apiResults = await fetchStocks();
  
  if (!apiResults || apiResults.length === 0) {
    app.innerHTML = `<p class="text-center text-slate-400">Não foi possível carregar as ações. Tente novamente em alguns instantes.</p>`;
    return;
  }
  
  const results = [];
  
  // Processar cada ação
  for (const stock of stocks) {
    const apiData = apiResults.find(r => r.symbol === stock.ticker);
    
    if (!apiData || !apiData.regularMarketPrice) {
      console.log(`⚠️ Falha ao carregar: ${stock.ticker}`);
      continue;
    }
    
    const currentPrice = apiData.regularMarketPrice;
    const discountRate = DISCOUNT_TARGETS[stock.category] || 0.15;
    const targetPrice = currentPrice * (1 - discountRate);
    const discount = ((targetPrice - currentPrice) / targetPrice) * 100;
    
    // Dados para o gráfico (últimos 30 dias)
    const historicalPrices = apiData.historicalDataPrice || [];
    
    results.push({
      ...stock,
      price: currentPrice,
      target: targetPrice,
      discountRate: discountRate * 100,
      currency: stock.type === 'BR' ? 'BRL' : 'USD',
      discount: Math.abs(discount),
      chart: historicalPrices.slice(-30) // Últimos 30 dias
    });
  }
  
  if (results.length === 0) {
    app.innerHTML = `<p class="text-center text-slate-400">Nenhuma ação foi carregada com sucesso.</p>`;
    return;
  }
  
  // Salva resultados processados globalmente para busca
  window.stockResults = results;
  
  results.sort((a, b) => b.discount - a.discount);
  render(results);
}

function render(list) {
  // Usa limite temporário se foi definido pela busca, senão usa o padrão
  const limit = window.INITIAL_LIMIT_TEMP || INITIAL_LIMIT;
  const visible = list.slice(0, limit);
  
  if (!visible.length) {
    app.innerHTML = `<p class="text-center text-slate-400">Nenhuma ação encontrada</p>`;
    return;
  }
  
  const showingAll = list.length === visible.length;
  const totalCount = list.length;
  const isSearching = searchInput.value.trim() !== '';
  
  app.innerHTML = `
    <div class="mb-4 text-center">
      <p class="text-slate-400 text-sm">
        ${isSearching ? 
          `🔍 ${totalCount} ${totalCount === 1 ? 'ação encontrada' : 'ações encontradas'}` :
          `🏆 TOP ${visible.length} maiores descontos (de ${window.stockResults?.length || 0} ações monitoradas)`
        }
      </p>
      ${!showingAll && !isSearching ? `<p class="text-slate-500 text-xs mt-1">💡 Use a busca para encontrar ações específicas</p>` : ''}
    </div>
    
    ${visible.map(stock => `
    <div class="bg-slate-800 border ${getColor(stock.discount)} rounded-xl p-5 relative mb-4">
      
      <button onclick="toggleChart('${stock.ticker}')"
        class="absolute top-4 right-4 bg-slate-700 p-2 rounded-lg hover:bg-slate-600 transition">
        📈
      </button>
      
      <h2 class="text-xl font-bold text-green-400">${stock.ticker}</h2>
      <p class="font-semibold">${stock.name}</p>
      <p class="text-xs text-slate-500 mb-2">${stock.sector}</p>
      
      <p class="text-green-400 font-semibold text-lg">${stock.discount.toFixed(1)}% abaixo do alvo</p>
      <p class="text-sm">Preço atual: ${formatPrice(stock.price, stock.currency)}</p>
      <p class="text-sm text-slate-400">Preço alvo (${stock.discountRate.toFixed(0)}% desc): ${formatPrice(stock.target, stock.currency)}</p>
      
      <div id="details-${stock.ticker}" class="hidden mt-4 pt-4 border-t border-slate-700">
        <canvas id="chart-${stock.ticker}" height="120"></canvas>
        <p class="text-slate-400 text-xs mt-2">📊 Últimos 30 dias</p>
        <button onclick="toggleChart('${stock.ticker}')"
          class="text-blue-400 mt-2 text-sm">Fechar gráfico</button>
      </div>
    </div>
  `).join('')}
  `;
}

function toggleChart(ticker) {
  const el = document.getElementById(`details-${ticker}`);
  const isHidden = el.classList.contains('hidden');
  
  el.classList.toggle('hidden');
  
  // Se está abrindo o gráfico, desenha ele
  if (isHidden) {
    drawChart(ticker);
  }
}

function drawChart(ticker) {
  const stock = window.stockResults.find(s => s.ticker === ticker);
  if (!stock || !stock.chart || stock.chart.length === 0) {
    console.log('Sem dados de gráfico para', ticker);
    return;
  }
  
  const canvas = document.getElementById(`chart-${ticker}`);
  if (!canvas) return;
  
  const prices = stock.chart.map(d => d.close);
  const labels = stock.chart.map(d => {
    const date = new Date(d.date * 1000);
    return `${date.getDate()}/${date.getMonth() + 1}`;
  });
  
  new Chart(canvas, {
    type: 'line',
    data: {
      labels: labels,
      datasets: [{
        label: stock.ticker,
        data: prices,
        borderColor: '#10b981',
        backgroundColor: 'rgba(16, 185, 129, 0.1)',
        borderWidth: 2,
        tension: 0.4, // Curva suave (0 = reta, 1 = muito curva)
        fill: true,
        pointRadius: 0
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { display: false },
        tooltip: {
          mode: 'index',
          intersect: false,
          callbacks: {
            label: function(context) {
              return `${stock.currency === 'BRL' ? 'R$' : '$'} ${context.parsed.y.toFixed(2)}`;
            }
          }
        }
      },
      scales: {
        x: { 
          display: true,
          grid: { color: '#334155' }
        },
        y: { 
          display: true,
          grid: { color: '#334155' },
          ticks: {
            callback: function(value) {
              return `${stock.currency === 'BRL' ? 'R$' : '$'}${value.toFixed(0)}`;
            }
          }
        }
      }
    }
  });
}

searchInput.addEventListener('input', e => {
  const term = e.target.value.toLowerCase().trim();
  
  if (!term) {
    // Se limpar a busca, volta pro TOP 10
    const topResults = (window.stockResults || []).slice(0, 10);
    render(window.stockResults || []);
    return;
  }
  
  // Busca em todas as ações (não só TOP 10)
  const filtered = (window.stockResults || []).filter(stock =>
    stock.ticker.toLowerCase().includes(term) ||
    stock.name.toLowerCase().includes(term) ||
    stock.sector.toLowerCase().includes(term)
  );
  
  // Mostra TODAS as que encontrou na busca (não limita em 10)
  const tempLimit = INITIAL_LIMIT;
  window.INITIAL_LIMIT_TEMP = 1000; // Remove limite temporariamente
  render(filtered);
  window.INITIAL_LIMIT_TEMP = tempLimit;
});

// INICIAR O APP - ESTA LINHA É CRÍTICA!
console.log('🚀 Auricchio - Monitor de Oportunidades em Ações');
console.log('💾 Sistema de cache: 30 minutos');
console.log('📊 Total de ações monitoradas:', stocks.length);
loadStocks();

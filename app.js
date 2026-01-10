const app = document.getElementById('app');
const searchInput = document.getElementById('search');

const INITIAL_LIMIT = 10;

const stocks = [
  { ticker: 'LREN3', name: 'Lojas Renner', sector: 'Perene · BR', target: 25, type: 'BR' },
  { ticker: 'KLBN11', name: 'Klabin', sector: 'Perene · BR', target: 27, type: 'BR' },
  { ticker: 'EGIE3', name: 'Engie', sector: 'Perene · BR', target: 40, type: 'BR' },
  { ticker: 'TAEE11', name: 'Taesa', sector: 'Perene · BR', target: 42, type: 'BR' },
  { ticker: 'VALE3', name: 'Vale', sector: 'Cíclica · BR', target: 90, type: 'BR' },
  { ticker: 'GGBR4', name: 'Gerdau', sector: 'Cíclica · BR', target: 32, type: 'BR' },
  { ticker: 'AAPL', name: 'Apple', sector: 'Tech · US', target: 220, type: 'US' },
  { ticker: 'MSFT', name: 'Microsoft', sector: 'Tech · US', target: 450, type: 'US' }
];

function getColor(discount) {
  if (discount >= 20) return 'border-green-500';
  if (discount >= 10) return 'border-yellow-500';
  return 'border-slate-700';
}

function formatPrice(v, c) {
  return `${c === 'BRL' ? 'R$' : '$'} ${v.toFixed(2)}`;
}

// Buscar qualquer ação na Brapi (100% gratuita, sem bloqueios)
// A Brapi suporta ações brasileiras e americanas!
async function fetchStock(stock) {
  try {
    const res = await fetch(`https://brapi.dev/api/quote/${stock.ticker}`);
    if (!res.ok) return null;
    const data = await res.json();
    
    if (!data.results || data.results.length === 0) return null;
    
    const stockData = data.results[0];
    return {
      price: stockData.regularMarketPrice,
      currency: stock.type === 'BR' ? 'BRL' : 'USD'
    };
  } catch (error) {
    console.error(`Erro ao buscar ${stock.ticker}:`, error);
    return null;
  }
}

async function loadStocks() {
  app.innerHTML = `<p class="text-center text-slate-400">Buscando oportunidades...</p>`;
  const results = [];

  for (const stock of stocks) {
    const data = await fetchStock(stock);
    if (!data) {
      console.log(`Falha ao carregar: ${stock.ticker}`);
      continue;
    }

    const price = data.price;
    const discount = ((stock.target - price) / stock.target) * 100;

    results.push({ 
      ...stock, 
      price, 
      currency: data.currency, 
      discount 
    });
  }

  if (results.length === 0) {
    app.innerHTML = `<p class="text-center text-slate-400">Não foi possível carregar nenhuma ação. Tente novamente em alguns instantes.</p>`;
    return;
  }

  results.sort((a, b) => b.discount - a.discount);
  render(results);
}

function render(list) {
  const visible = list.slice(0, INITIAL_LIMIT);

  if (!visible.length) {
    app.innerHTML = `<p class="text-center text-slate-400">Nenhuma ação encontrada</p>`;
    return;
  }

  app.innerHTML = visible.map(stock => `
    <div class="bg-slate-800 border ${getColor(stock.discount)} rounded-xl p-5 relative">

      <button onclick="toggleChart('${stock.ticker}')"
        class="absolute top-4 right-4 bg-slate-700 p-2 rounded-lg hover:bg-slate-600">
        📈
      </button>

      <h2 class="text-xl font-bold text-green-400">${stock.ticker}</h2>
      <p>${stock.name}</p>
      <p class="text-xs text-slate-500 mb-2">${stock.sector}</p>

      <p class="text-green-400 font-semibold">${stock.discount.toFixed(1)}% abaixo do alvo</p>
      <p>Preço atual: ${formatPrice(stock.price, stock.currency)}</p>
      <p>Preço alvo: ${formatPrice(stock.target, stock.currency)}</p>

      <div id="details-${stock.ticker}" class="hidden mt-4">
        <p class="text-slate-400 text-sm">Gráfico temporariamente indisponível</p>
        <button onclick="toggleChart('${stock.ticker}')"
          class="text-blue-400 mt-2">Fechar</button>
      </div>
    </div>
  `).join('');
}

function toggleChart(ticker) {
  const el = document.getElementById(`details-${ticker}`);
  el.classList.toggle('hidden');
}

searchInput.addEventListener('input', e => {
  const term = e.target.value.toLowerCase();
  
  // Buscar nos resultados já carregados
  const allCards = document.querySelectorAll('.bg-slate-800');
  allCards.forEach(card => {
    const text = card.textContent.toLowerCase();
    if (text.includes(term)) {
      card.style.display = 'block';
    } else {
      card.style.display = 'none';
    }
  });
});

loadStocks();

const app = document.getElementById('app');
const searchInput = document.getElementById('search');

const INITIAL_LIMIT = 10;

const stocks = [
  { ticker: 'LREN3.SA', name: 'Lojas Renner', sector: 'Perene · BR', target: 25 },
  { ticker: 'KLBN11.SA', name: 'Klabin', sector: 'Perene · BR', target: 27 },
  { ticker: 'EGIE3.SA', name: 'Engie', sector: 'Perene · BR', target: 40 },
  { ticker: 'TAEE11.SA', name: 'Taesa', sector: 'Perene · BR', target: 42 },
  { ticker: 'VALE3.SA', name: 'Vale', sector: 'Cíclica · BR', target: 90 },
  { ticker: 'GGBR4.SA', name: 'Gerdau', sector: 'Cíclica · BR', target: 32 },
  { ticker: 'AAPL', name: 'Apple', sector: 'Tech · US', target: 220 },
  { ticker: 'MSFT', name: 'Microsoft', sector: 'Tech · US', target: 450 }
];

function getColor(discount) {
  if (discount >= 20) return 'border-green-500';
  if (discount >= 10) return 'border-yellow-500';
  return 'border-slate-700';
}

function formatPrice(v, c) {
  return `${c === 'BRL' ? 'R$' : '$'} ${v.toFixed(2)}`;
}

async function fetchStock(ticker, range = '1d', interval = '1d') {
  try {
    const res = await fetch(
      `/.netlify/functions/yahoo?ticker=${ticker}&range=${range}&interval=${interval}`
    );
    const data = await res.json();
    return data.chart.result[0];
  } catch {
    return null;
  }
}

async function loadStocks() {
  app.innerHTML = `<p class="text-center text-slate-400">Buscando oportunidades...</p>`;
  const results = [];

  for (const stock of stocks) {
    const data = await fetchStock(stock.ticker);
    if (!data) continue;

    const price = data.meta.regularMarketPrice;
    const discount = ((stock.target - price) / stock.target) * 100;

    results.push({ ...stock, price, currency: data.meta.currency, discount });
  }

  results.sort((a, b) => b.discount - a.discount);
  render(results);
}

function render(list) {
  const visible = list.slice(0, INITIAL_LIMIT);

  if (!visible.length) {
    app.innerHTML = `<p class="text-center text-slate-400">Falha ao carregar dados</p>`;
    return;
  }

  app.innerHTML = visible.map(stock => `
    <div class="bg-slate-800 border ${getColor(stock.discount)} rounded-xl p-5 relative">

      <button onclick="toggle('${stock.ticker}')"
        class="absolute top-4 right-4 bg-slate-700 p-2 rounded-lg">
        📈
      </button>

      <h2 class="text-xl font-bold text-green-400">${stock.ticker.replace('.SA','')}</h2>
      <p>${stock.name}</p>
      <p class="text-xs text-slate-500 mb-2">${stock.sector}</p>

      <p class="text-green-400 font-semibold">${stock.discount.toFixed(1)}% abaixo do alvo</p>
      <p>Preço atual: ${formatPrice(stock.price, stock.currency)}</p>
      <p>Preço alvo: ${formatPrice(stock.target, stock.currency)}</p>

      <div id="details-${stock.ticker}" class="hidden mt-4">
        <canvas id="chart-${stock.ticker}" height="120"></canvas>
        <button onclick="toggle('${stock.ticker}')"
          class="text-blue-400 mt-2">Fechar</button>
      </div>
    </div>
  `).join('');
}

async function toggle(ticker) {
  const el = document.getElementById(`details-${ticker}`);
  el.classList.toggle('hidden');

  if (!el.classList.contains('hidden')) {
    const data = await fetchStock(ticker, '5y', '1mo');
    const prices = data.indicators.quote[0].close;
    const labels = data.timestamp.map(t =>
      new Date(t * 1000).getFullYear()
    );

    new Chart(document.getElementById(`chart-${ticker}`), {
      type: 'line',
      data: {
        labels,
        datasets: [{
          data: prices,
          borderWidth: 2,
          fill: false
        }]
      },
      options: {
        plugins: { legend: { display: false } },
        scales: { x: { display: false } }
      }
    });
  }
}

searchInput.addEventListener('input', e => {
  const term = e.target.value.toLowerCase();
  const filtered = stocks.filter(s =>
    s.ticker.toLowerCase().includes(term) ||
    s.name.toLowerCase().includes(term) ||
    s.sector.toLowerCase().includes(term)
  );
  render(filtered);
});

loadStocks();
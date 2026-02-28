/* ========================================
   AURICCHIO 2 — Setups Personalizados
   auricchio2.js
======================================== */

/* ================= CONFIGURAÇÕES ================= */
const CONFIG = {
  API_ENDPOINT:  '/api/stocks',
  CACHE_KEY:     'a2_stocksCache_v1',
  CACHE_TIME:    4 * 60 * 60 * 1000,
  REQUEST_DELAY: 400,
  BATCH_SIZE:    10
};

/* ================= ESTADO ================= */
let allProcessedStocks = [];
let activeSetup        = null; // 1, 2 ou 3
let searchTerm         = '';

// Estado dos setups — persistido no localStorage
const defaultSetups = {
  1: { name: 'Desconto Leve',    saved: false, desc: 5,  dy: 0,  pl: 100, pvp: 20, setor: 'Todos' },
  2: { name: 'Desconto Moderado', saved: false, desc: 8,  dy: 0,  pl: 100, pvp: 20, setor: 'Todos' },
  3: { name: 'Radar Dividendos', saved: false, desc: 0,  dy: 6,  pl: 100, pvp: 20, setor: 'Todos' }
};

let setups = JSON.parse(JSON.stringify(defaultSetups));

/* ================= SETORES DISPONÍVEIS ================= */
const SETORES = [
  'Todos', 'Bancos', 'Energia', 'Seguros', 'Telecom', 'Petróleo',
  'Mineração', 'Siderurgia', 'Varejo', 'Saúde', 'Construção Civil',
  'Shoppings', 'Logística', 'Saneamento', 'Papel', 'Agro',
  'Tecnologia', 'Indústria', 'Holdings', 'Alimentos', 'Educação'
];

/* ================= AÇÕES (mesma lista do app.js) ================= */
const stocks = [
  // BANCOS
  { ticker: 'ITUB4',  name: 'Itaú',               sector: 'Bancos',              category: 'perene'  },
  { ticker: 'ITUB3',  name: 'Itaú PN',             sector: 'Bancos',              category: 'perene'  },
  { ticker: 'BBDC4',  name: 'Bradesco',             sector: 'Bancos',              category: 'perene'  },
  { ticker: 'BBDC3',  name: 'Bradesco PN',          sector: 'Bancos',              category: 'perene'  },
  { ticker: 'BBAS3',  name: 'Banco do Brasil',      sector: 'Bancos',              category: 'perene'  },
  { ticker: 'SANB11', name: 'Santander',            sector: 'Bancos',              category: 'perene'  },
  { ticker: 'BPAC11', name: 'BTG Pactual',          sector: 'Bancos',              category: 'perene'  },
  { ticker: 'BRSR6',  name: 'Banrisul',             sector: 'Bancos',              category: 'perene'  },
  { ticker: 'BMGB4',  name: 'Banco BMG',            sector: 'Bancos',              category: 'perene'  },
  { ticker: 'NORD3',  name: 'Banco Nordeste',       sector: 'Bancos',              category: 'perene'  },
  // ENERGIA
  { ticker: 'TAEE11', name: 'Taesa',                sector: 'Energia',             category: 'perene'  },
  { ticker: 'EGIE3',  name: 'Engie',                sector: 'Energia',             category: 'perene'  },
  { ticker: 'CPLE3',  name: 'Copel',                sector: 'Energia',             category: 'perene'  },
  { ticker: 'CMIG4',  name: 'Cemig',                sector: 'Energia',             category: 'perene'  },
  { ticker: 'EQTL3',  name: 'Equatorial',           sector: 'Energia',             category: 'perene'  },
  { ticker: 'NEOE3',  name: 'Neoenergia',           sector: 'Energia',             category: 'perene'  },
  { ticker: 'CPFE3',  name: 'CPFL Energia',         sector: 'Energia',             category: 'perene'  },
  { ticker: 'ENEV3',  name: 'Eneva',                sector: 'Energia',             category: 'ciclica' },
  { ticker: 'LIGT3',  name: 'Light',                sector: 'Energia',             category: 'perene'  },
  { ticker: 'EMAE4',  name: 'Emae',                 sector: 'Energia',             category: 'perene'  },
  // PETRÓLEO
  { ticker: 'PETR4',  name: 'Petrobras',            sector: 'Petróleo',            category: 'ciclica' },
  { ticker: 'PETR3',  name: 'Petrobras ON',         sector: 'Petróleo',            category: 'ciclica' },
  { ticker: 'PRIO3',  name: 'Prio',                 sector: 'Petróleo',            category: 'ciclica' },
  { ticker: 'RECV3',  name: 'PetroReconcavo',       sector: 'Petróleo',            category: 'ciclica' },
  // MINERAÇÃO
  { ticker: 'VALE3',  name: 'Vale',                 sector: 'Mineração',           category: 'ciclica' },
  { ticker: 'CMIN3',  name: 'CSN Mineração',        sector: 'Mineração',           category: 'ciclica' },
  { ticker: 'FESA4',  name: 'Ferbasa',              sector: 'Mineração',           category: 'ciclica' },
  // SIDERURGIA
  { ticker: 'GGBR4',  name: 'Gerdau',               sector: 'Siderurgia',          category: 'ciclica' },
  { ticker: 'GGBR3',  name: 'Gerdau ON',            sector: 'Siderurgia',          category: 'ciclica' },
  { ticker: 'CSNA3',  name: 'CSN',                  sector: 'Siderurgia',          category: 'ciclica' },
  { ticker: 'USIM5',  name: 'Usiminas',             sector: 'Siderurgia',          category: 'ciclica' },
  { ticker: 'GOAU4',  name: 'Metalúrgica Gerdau',   sector: 'Siderurgia',          category: 'ciclica' },
  // SEGUROS
  { ticker: 'BBSE3',  name: 'BB Seguridade',        sector: 'Seguros',             category: 'perene'  },
  { ticker: 'PSSA3',  name: 'Porto Seguro',         sector: 'Seguros',             category: 'perene'  },
  { ticker: 'WIZC3',  name: 'Wiz Co',               sector: 'Seguros',             category: 'perene'  },
  { ticker: 'CXSE3',  name: 'Caixa Seguridade',     sector: 'Seguros',             category: 'perene'  },
  // TELECOM
  { ticker: 'VIVT3',  name: 'Vivo',                 sector: 'Telecom',             category: 'perene'  },
  { ticker: 'TIMS3',  name: 'TIM',                  sector: 'Telecom',             category: 'perene'  },
  // VAREJO
  { ticker: 'LREN3',  name: 'Renner',               sector: 'Varejo',              category: 'perene'  },
  { ticker: 'ASAI3',  name: 'Assaí',                sector: 'Varejo',              category: 'perene'  },
  { ticker: 'AZZA3',  name: 'Azzas 2154',           sector: 'Varejo',              category: 'perene'  },
  { ticker: 'VIVA3',  name: 'Vivara',               sector: 'Varejo',              category: 'perene'  },
  { ticker: 'MGLU3',  name: 'Magazine Luiza',       sector: 'Varejo',              category: 'ciclica' },
  { ticker: 'VULC3',  name: 'Vulcabras',            sector: 'Varejo',              category: 'perene'  },
  { ticker: 'GRND3',  name: 'Grendene',             sector: 'Varejo',              category: 'perene'  },
  // SAÚDE
  { ticker: 'RADL3',  name: 'Raia Drogasil',        sector: 'Saúde',               category: 'perene'  },
  { ticker: 'FLRY3',  name: 'Fleury',               sector: 'Saúde',               category: 'perene'  },
  { ticker: 'HYPE3',  name: 'Hypera',               sector: 'Saúde',               category: 'perene'  },
  { ticker: 'HAPV3',  name: 'Hapvida',              sector: 'Saúde',               category: 'perene'  },
  { ticker: 'ODPV3',  name: 'Odontoprev',           sector: 'Saúde',               category: 'perene'  },
  // CONSTRUÇÃO CIVIL
  { ticker: 'CYRE3',  name: 'Cyrela',               sector: 'Construção Civil',    category: 'ciclica' },
  { ticker: 'MRVE3',  name: 'MRV',                  sector: 'Construção Civil',    category: 'ciclica' },
  { ticker: 'EZTC3',  name: 'EZ Tec',               sector: 'Construção Civil',    category: 'ciclica' },
  { ticker: 'DIRR3',  name: 'Direcional',           sector: 'Construção Civil',    category: 'ciclica' },
  { ticker: 'EVEN3',  name: 'Even',                 sector: 'Construção Civil',    category: 'ciclica' },
  // SHOPPINGS
  { ticker: 'MULT3',  name: 'Multiplan',            sector: 'Shoppings',           category: 'perene'  },
  { ticker: 'IGTI11', name: 'Iguatemi',             sector: 'Shoppings',           category: 'perene'  },
  { ticker: 'ALOS3',  name: 'Allos',                sector: 'Shoppings',           category: 'perene'  },
  // LOGÍSTICA
  { ticker: 'RAIL3',  name: 'Rumo',                 sector: 'Logística',           category: 'ciclica' },
  { ticker: 'EQPA3',  name: 'Ecorodovias',          sector: 'Logística',           category: 'perene'  },
  { ticker: 'TGMA3',  name: 'Tegma',                sector: 'Logística',           category: 'ciclica' },
  // SANEAMENTO
  { ticker: 'SBSP3',  name: 'Sabesp',               sector: 'Saneamento',          category: 'perene'  },
  { ticker: 'SAPR11', name: 'Sanepar',              sector: 'Saneamento',          category: 'perene'  },
  { ticker: 'CSMG3',  name: 'Copasa',               sector: 'Saneamento',          category: 'perene'  },
  { ticker: 'UGPA3',  name: 'Ultrapar',             sector: 'Saneamento',          category: 'perene'  },
  // PAPEL
  { ticker: 'KLBN11', name: 'Klabin',               sector: 'Papel',               category: 'perene'  },
  { ticker: 'SUZB3',  name: 'Suzano',               sector: 'Papel',               category: 'ciclica' },
  // AGRO
  { ticker: 'SLCE3',  name: 'SLC Agrícola',         sector: 'Agro',                category: 'ciclica' },
  { ticker: 'AGRO3',  name: 'BrasilAgro',           sector: 'Agro',                category: 'ciclica' },
  { ticker: 'SMTO3',  name: 'São Martinho',         sector: 'Agro',                category: 'ciclica' },
  // TECNOLOGIA
  { ticker: 'TOTS3',  name: 'Totvs',                sector: 'Tecnologia',          category: 'perene'  },
  { ticker: 'INTB3',  name: 'Intelbras',            sector: 'Tecnologia',          category: 'perene'  },
  // INDÚSTRIA
  { ticker: 'WEGE3',  name: 'WEG',                  sector: 'Indústria',           category: 'perene'  },
  { ticker: 'RAPT4',  name: 'Randon',               sector: 'Indústria',           category: 'ciclica' },
  { ticker: 'POMO4',  name: 'Marcopolo',            sector: 'Indústria',           category: 'ciclica' },
  { ticker: 'TUPY3',  name: 'Tupy',                 sector: 'Indústria',           category: 'ciclica' },
  { ticker: 'FRAS3',  name: 'Fras-le',              sector: 'Indústria',           category: 'ciclica' },
  { ticker: 'LEVE3',  name: 'Mahle Metal Leve',     sector: 'Indústria',           category: 'ciclica' },
  // HOLDINGS
  { ticker: 'ITSA4',  name: 'Itaúsa',               sector: 'Holdings',            category: 'perene'  },
  { ticker: 'BRAP4',  name: 'Bradespar',            sector: 'Holdings',            category: 'ciclica' },
  // ALIMENTOS
  { ticker: 'ABEV3',  name: 'Ambev',                sector: 'Alimentos',           category: 'perene'  },
  { ticker: 'MDIA3',  name: 'M.Dias Branco',        sector: 'Alimentos',           category: 'perene'  },
  { ticker: 'BEEF3',  name: 'Minerva',              sector: 'Alimentos',           category: 'ciclica' },
  { ticker: 'CAML3',  name: 'Camil',                sector: 'Alimentos',           category: 'perene'  },
  // EDUCAÇÃO
  { ticker: 'YDUQ3',  name: 'Yduqs',                sector: 'Educação',            category: 'perene'  },
  { ticker: 'COGN3',  name: 'Cogna',                sector: 'Educação',            category: 'perene'  },
  { ticker: 'ANIM3',  name: 'Ânima',                sector: 'Educação',            category: 'perene'  },
  // MERCADO FINANCEIRO
  { ticker: 'B3SA3',  name: 'B3',                   sector: 'Tecnologia',          category: 'perene'  },
];

/* ================= UTILITÁRIOS ================= */
const sleep = ms => new Promise(r => setTimeout(r, ms));

function formatBRL(v) {
  return `R$ ${v.toFixed(2)}`;
}

function targetFromHistory(min, max, category) {
  const factor = category === 'perene' ? 0.6 : 0.5;
  return min + (max - min) * factor;
}

/* ================= CACHE ================= */
function getCache() {
  try {
    const raw = localStorage.getItem(CONFIG.CACHE_KEY);
    if (!raw) return null;
    const data = JSON.parse(raw);
    return (Date.now() - data.time < CONFIG.CACHE_TIME) ? data.value : null;
  } catch { return null; }
}

function setCache(value) {
  try {
    localStorage.setItem(CONFIG.CACHE_KEY, JSON.stringify({ time: Date.now(), value }));
  } catch {}
}

function getCacheTime() {
  try {
    const raw = localStorage.getItem(CONFIG.CACHE_KEY);
    if (!raw) return 'agora';
    const mins  = Math.floor((Date.now() - JSON.parse(raw).time) / 60000);
    const hours = Math.floor(mins / 60);
    return hours > 0 ? `${hours}h` : `${mins}min`;
  } catch { return 'agora'; }
}

/* ================= API ================= */
async function fetchBatch(tickers) {
  try {
    const r = await fetch(`${CONFIG.API_ENDPOINT}?tickers=${tickers}`);
    const d = await r.json();
    if (d.error) throw new Error(d.error);
    return d;
  } catch (e) {
    console.error('Erro batch:', e);
    return { error: e.message };
  }
}

async function fetchAllStocks() {
  const cached = getCache();
  if (cached) { console.log('📦 Cache hit'); return cached; }

  const data = [];
  for (let i = 0; i < stocks.length; i += CONFIG.BATCH_SIZE) {
    const batch   = stocks.slice(i, i + CONFIG.BATCH_SIZE);
    const tickers = batch.map(s => s.ticker).join(',');
    try {
      const api = await fetchBatch(tickers);
      if (api?.results) data.push(...api.results);
      await sleep(CONFIG.REQUEST_DELAY);
    } catch (e) {
      console.warn(`Erro lote ${i}:`, e);
    }
  }
  setCache(data);
  return data;
}

/* ================= SCORE DE ADERÊNCIA ================= */
// Pesos fixos: desconto 40%, DY 25%, P/L 20%, P/VP 15%
// Setup 3 usa apenas DY (60%) e desconto (40%) — P/L e P/VP ignorados

function calcScore(stock, setupNum) {
  const s = setups[setupNum];
  const fund = stock.fundamentals;

  const dy  = fund?.defaultKeyStatistics?.dividendYield ?? 0;
  const pl  = fund?.priceEarnings ?? null;
  const pvp = fund?.defaultKeyStatistics?.priceToBook ?? null;

  let score = 0;
  const breakdown = [];

  if (setupNum === 3) {
    // Setup 3: DY 60% + Desconto 40%
    // DY
    const dyMin = s.dy;
    let dyScore = 0;
    if (dy >= dyMin) {
      dyScore = Math.min(1, dy / (dyMin * 2 || 12)) * 60;
    } else {
      dyScore = (dy / dyMin) * 60 * 0.4; // parcial
    }
    score += dyScore;
    breakdown.push({
      label: `DY ${dy.toFixed(1)}%`,
      status: dy >= dyMin ? 'ok' : dy > 0 ? 'mid' : 'low'
    });

    // Desconto
    const descMin = s.desc;
    let descScore = 0;
    if (stock.discount >= descMin) {
      descScore = Math.min(1, stock.discount / (descMin * 2 || 20)) * 40;
    } else if (stock.discount > 0) {
      descScore = (stock.discount / (descMin || 1)) * 40 * 0.4;
    }
    score += descScore;
    breakdown.push({
      label: `Desc ${stock.discount.toFixed(1)}%`,
      status: stock.discount >= descMin ? 'ok' : stock.discount > 0 ? 'mid' : 'low'
    });

  } else {
    // Setup 1 e 2: Desconto 40%, DY 25%, P/L 20%, P/VP 15%

    // Desconto (40 pts)
    const descMin = s.desc;
    let descScore = 0;
    if (stock.discount >= descMin) {
      descScore = Math.min(1, stock.discount / (descMin * 2 || 20)) * 40;
    } else if (stock.discount > 0) {
      descScore = (stock.discount / (descMin || 1)) * 40 * 0.4;
    }
    score += descScore;
    breakdown.push({
      label: `Desc ${stock.discount.toFixed(1)}%`,
      status: stock.discount >= descMin ? 'ok' : stock.discount > 0 ? 'mid' : 'low'
    });

    // DY (25 pts)
    const dyMin = s.dy;
    let dyScore = 0;
    if (dy >= dyMin) {
      dyScore = Math.min(1, dy / (dyMin * 2 || 10)) * 25;
    } else if (dy > 0) {
      dyScore = (dy / (dyMin || 1)) * 25 * 0.4;
    } else if (dyMin === 0) {
      dyScore = 25; // se não exige DY, dá pontos cheios
    }
    score += dyScore;
    if (dyMin > 0) {
      breakdown.push({
        label: `DY ${dy.toFixed(1)}%`,
        status: dy >= dyMin ? 'ok' : dy > 0 ? 'mid' : 'low'
      });
    }

    // P/L (20 pts)
    const plMax = s.pl; // 100 = sem limite (∞)
    let plScore = 0;
    if (plMax >= 100) {
      plScore = 20; // sem limite → pontos cheios
    } else if (pl && pl > 0) {
      if (pl <= plMax) {
        plScore = Math.min(1, (plMax - pl) / plMax + 0.5) * 20;
      } else {
        plScore = 0; // fora do critério
      }
    }
    score += plScore;
    if (plMax < 100) {
      breakdown.push({
        label: `P/L ${pl ? pl.toFixed(1) : 'N/A'}`,
        status: (pl && pl <= plMax) ? 'ok' : (!pl) ? 'mid' : 'low'
      });
    }

    // P/VP (15 pts)
    const pvpMax = s.pvp; // 20 = sem limite (∞)
    let pvpScore = 0;
    if (pvpMax >= 20) {
      pvpScore = 15; // sem limite → pontos cheios
    } else if (pvp && pvp > 0) {
      const pvpReal = pvpMax / 2; // slider de 0-20 = 0-10
      if (pvp <= pvpReal) {
        pvpScore = Math.min(1, (pvpReal - pvp) / pvpReal + 0.5) * 15;
      }
    }
    score += pvpScore;
    if (pvpMax < 20) {
      const pvpReal = (pvpMax / 2).toFixed(1);
      breakdown.push({
        label: `P/VP ${pvp ? pvp.toFixed(1) : 'N/A'}`,
        status: (pvp && pvp <= parseFloat(pvpReal)) ? 'ok' : (!pvp) ? 'mid' : 'low'
      });
    }
  }

  return { score: Math.round(Math.min(100, Math.max(0, score))), breakdown };
}

/* ================= FILTROS DE SETUP ================= */
function passesSetup(stock, setupNum) {
  const s = setups[setupNum];
  if (!s.saved) return false;

  const fund = stock.fundamentals;
  const dy   = fund?.defaultKeyStatistics?.dividendYield ?? 0;
  const pl   = fund?.priceEarnings ?? null;
  const pvp  = fund?.defaultKeyStatistics?.priceToBook ?? null;

  // Setor
  if (s.setor !== 'Todos') {
    if (stock.sector.toLowerCase() !== s.setor.toLowerCase()) return false;
  }

  // Desconto mínimo
  if (stock.discount < s.desc) return false;

  // DY mínimo
  if (dy < s.dy) return false;

  if (setupNum !== 3) {
    // P/L máximo (100 = sem limite)
    if (s.pl < 100 && pl && pl > s.pl) return false;

    // P/VP máximo (20 = sem limite, slider 0-20 = 0-10)
    if (s.pvp < 20 && pvp) {
      const pvpReal = s.pvp / 2;
      if (pvp > pvpReal) return false;
    }
  }

  return true;
}

/* ================= RENDERIZAÇÃO DOS CARDS ================= */
function renderCards(filteredStocks, setupNum) {
  const app = document.getElementById('app');

  if (!app) return;

  app.className = 'visible';

  if (filteredStocks.length === 0) {
    app.innerHTML = `
      <div style="text-align:center; padding:40px; color:#64748b;">
        <div style="font-size:2.5rem; margin-bottom:12px;">🔍</div>
        <div style="font-size:1rem; color:#94a3b8;">Nenhuma ação encontrada com esses critérios.</div>
        <div style="font-size:0.82rem; margin-top:8px;">Tente ajustar os sliders do Setup ${setupNum}.</div>
      </div>
    `;
    return;
  }

  const colorMap = { 1: 's1', 2: 's2', 3: 's3' };
  const cls = colorMap[setupNum];

  app.innerHTML = `
    <div class="order-label">↑ maior aderência ao Setup ${setupNum} · ${setups[setupNum].name}</div>
    ${filteredStocks.map((stock, index) => {
      const { score, breakdown } = calcScore(stock, setupNum);
      const dy  = stock.fundamentals?.defaultKeyStatistics?.dividendYield ?? 0;
      const pl  = stock.fundamentals?.priceEarnings;
      const pvp = stock.fundamentals?.defaultKeyStatistics?.priceToBook;

      return `
        <div class="stock-card card-${cls}" data-index="${index}">
          <div class="rank-badge">${index + 1}</div>
          <div class="stock-header">
            <div>
              <div class="stock-ticker">${stock.ticker}</div>
              <div class="stock-name">${stock.name}</div>
            </div>
            <div class="match-badge badge-${cls}">${score} pts</div>
          </div>

          <div class="tags">
            <span class="tag-sector">${stock.sector}</span>
            ${stock.change !== undefined
              ? `<span class="${stock.change >= 0 ? 'tag-up' : 'tag-down'}">
                   ${stock.change >= 0 ? '▲' : '▼'} ${Math.abs(stock.change).toFixed(2)}% hoje
                 </span>`
              : ''}
          </div>

          <div class="info-row">
            <span class="info-label">Preço Atual</span>
            <span class="info-value price-val">${formatBRL(stock.price)}</span>
          </div>
          <div class="info-row">
            <span class="info-label">Média Histórica (52 sem)</span>
            <span class="info-value">${formatBRL(stock.target)}</span>
          </div>
          <div class="info-row">
            <span class="info-label">Desconto</span>
            <span class="info-value" style="color:var(--c-${cls})">${stock.discount.toFixed(1)}%</span>
          </div>

          <div class="score-section">
            <div class="score-header">
              <span class="score-label">Score de Aderência</span>
              <span class="score-numero">${score}/100</span>
            </div>
            <div class="score-bar-bg">
              <div class="score-bar-fill" style="width:${score}%"></div>
            </div>
            <div class="score-breakdown">
              ${breakdown.map(b => `<span class="sc ${b.status}">
                ${b.status === 'ok' ? '✓' : b.status === 'mid' ? '~' : '✗'} ${b.label}
              </span>`).join('')}
            </div>
          </div>

          <div class="expand-arrow" onclick="toggleHealth(${index})">
            <span class="arrow-icon" style="display:inline-block;transition:transform 0.3s ease">▼</span>
          </div>
          <div class="health-section" id="health-${index}">
            <div class="health-content">
              <div class="health-title">📊 Indicadores Fundamentalistas</div>
              ${pl ? `<div class="health-item"><span class="health-label">P/L</span><span class="health-value ${pl < 20 ? 'positive' : pl < 30 ? 'warning' : 'negative'}">${pl.toFixed(2)}</span></div>` : ''}
              ${pvp ? `<div class="health-item"><span class="health-label">P/VP</span><span class="health-value ${pvp < 3 ? 'positive' : pvp < 5 ? 'warning' : 'negative'}">${pvp.toFixed(2)}</span></div>` : ''}
              ${dy ? `<div class="health-item"><span class="health-label">Dividend Yield</span><span class="health-value ${dy >= 4 ? 'positive' : dy > 0 ? 'warning' : 'negative'}">${dy.toFixed(2)}%</span></div>` : ''}
              <div id="perf-${index}">
                <div class="health-title" style="margin-top:12px">📈 Performance</div>
                <div class="health-item"><span class="health-label" style="color:#6b7280;font-size:0.8rem">⏳ Carregando...</span></div>
              </div>
            </div>
          </div>
        </div>
      `;
    }).join('')}
  `;

  // CSS vars para cores por setup
  document.documentElement.style.setProperty('--c-s1', '#3b82f6');
  document.documentElement.style.setProperty('--c-s2', '#f59e0b');
  document.documentElement.style.setProperty('--c-s3', '#10b981');

  // Carrega performance em background
  filteredStocks.forEach((stock, index) => {
    fetchPriceHistory(stock.ticker).then(history => {
      const el = document.getElementById(`perf-${index}`);
      if (!el) return;
      if (!history) { el.innerHTML = ''; return; }

      const atual = stock.price;
      const calc  = (anterior) => anterior ? ((atual - anterior) / anterior * 100) : null;
      const fmt   = (v) => {
        if (v === null) return { val: 'N/A', cls: 'negative' };
        const s = v >= 0 ? '+' : '';
        return { val: `${s}${v.toFixed(2)}%`, cls: v >= 5 ? 'positive' : v >= 0 ? 'warning' : 'negative' };
      };

      const v12 = fmt(calc(history.price12mAgo));
      const v1  = fmt(calc(history.price1mAgo));

      el.innerHTML = `
        <div class="health-title" style="margin-top:12px">📈 Performance</div>
        <div class="health-item">
          <span class="health-label">Valorização 12M</span>
          <span class="health-value ${v12.cls}">${v12.val}</span>
        </div>
        <div class="health-item">
          <span class="health-label">Valorização Mês</span>
          <span class="health-value ${v1.cls}">${v1.val}</span>
        </div>
      `;
    });
  });
}

async function fetchPriceHistory(ticker) {
  try {
    const r = await fetch(`/api/stocks/history?ticker=${ticker}`);
    const d = await r.json();
    const results = d?.results?.[0]?.historicalDataPrice;
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
  } catch { return null; }
}

/* ================= LÓGICA PRINCIPAL ================= */
function filterAndRender() {
  const resultado = document.getElementById('resultado');
  const emptyState = document.getElementById('empty-state');
  const app = document.getElementById('app');

  const hasAnySaved = [1, 2, 3].some(n => setups[n].saved);

  if (!hasAnySaved) {
    resultado.style.display = 'none';
    emptyState.classList.add('visible');
    app.className = '';
    app.innerHTML = '';
    return;
  }

  emptyState.classList.remove('visible');

  if (!activeSetup) {
    resultado.style.display = 'none';
    app.className = '';
    app.innerHTML = '';
    return;
  }

  // Filtra
  let filtered = allProcessedStocks.filter(stock => {
    if (searchTerm) {
      const norm = searchTerm.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
      const fields = [stock.ticker, stock.name, stock.sector].join(' ')
        .toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
      return fields.includes(norm);
    }
    return passesSetup(stock, activeSetup);
  });

  // Ordena por score de aderência
  filtered = filtered
    .map(stock => ({ ...stock, _score: calcScore(stock, activeSetup).score }))
    .sort((a, b) => b._score - a._score);

  // Resultado
  resultado.style.display = 'block';
  resultado.className = `resultado s${activeSetup}-active`;
  document.getElementById('resultado-num').textContent = filtered.length;
  document.getElementById('resultado-setup').textContent =
    `pelo Setup ${activeSetup} · ${setups[activeSetup].name} · ordenadas por aderência`;

  renderCards(filtered, activeSetup);
}

/* ================= UI DOS SETUPS ================= */
function toggleSetup(n) {
  const card = document.getElementById(`card-s${n}`);
  const wasActive = activeSetup === n && card.classList.contains('active');

  // Fecha todos
  [1, 2, 3].forEach(i => {
    document.getElementById(`card-s${i}`).classList.remove('active');
    const arrow = document.querySelector(`#card-s${i} .setup-arrow`);
    if (arrow) arrow.style.transform = '';
  });

  if (!wasActive) {
    card.classList.add('active');
    activeSetup = n;
  } else {
    activeSetup = null;
  }

  filterAndRender();
}

function onSlider(setupNum, field, value) {
  setups[setupNum][field] = parseInt(value);

  const displayEl = document.getElementById(`v-s${setupNum}-${field}`);
  if (!displayEl) return;

  if (field === 'desc') displayEl.textContent = value + '%';
  else if (field === 'dy')  displayEl.textContent = value + '%';
  else if (field === 'pl')  displayEl.textContent = value == 100 ? '∞' : value;
  else if (field === 'pvp') displayEl.textContent = value == 20  ? '∞' : (value / 2).toFixed(1);
}

function saveSetup(n) {
  // Lê nome atual
  setups[n].name   = document.getElementById(`name-s${n}`).value || `Setup ${n}`;
  setups[n].desc   = parseInt(document.getElementById(`r-s${n}-desc`)?.value ?? setups[n].desc);
  setups[n].dy     = parseInt(document.getElementById(`r-s${n}-dy`)?.value   ?? setups[n].dy);
  if (n !== 3) {
    setups[n].pl   = parseInt(document.getElementById(`r-s${n}-pl`)?.value   ?? setups[n].pl);
    setups[n].pvp  = parseInt(document.getElementById(`r-s${n}-pvp`)?.value  ?? setups[n].pvp);
  }
  setups[n].saved = true;

  // Persiste
  localStorage.setItem('a2_setups', JSON.stringify(setups));

  // Atualiza nome exibido
  document.getElementById(`nd-s${n}`).textContent = setups[n].name;

  // Atualiza summary
  updateSummary(n);

  // Fecha card
  document.getElementById(`card-s${n}`).classList.add('configured');
  document.getElementById(`card-s${n}`).classList.remove('active');
  activeSetup = n;

  // Se API ainda nao terminou de carregar, mostra aviso e aguarda
  if (allProcessedStocks.length === 0) {
    const resultado = document.getElementById("resultado");
    resultado.style.display = "block";
    resultado.className = `resultado s${n}-active`;
    document.getElementById("resultado-num").textContent = "...";
    document.getElementById("resultado-setup").textContent = "Aguardando dados da API...";
    return;
  }

  filterAndRender();
}

function updateSummary(n) {
  const s   = setups[n];
  const el  = document.getElementById(`summary-s${n}`);
  if (!el) return;

  const tags = [];
  tags.push(`Desc: ${s.desc}%+`);
  tags.push(`DY: ${s.dy > 0 ? s.dy + '%+' : 'qualquer'}`);
  if (n !== 3) {
    tags.push(`P/L: ${s.pl >= 100 ? 'qualquer' : 'até ' + s.pl}`);
    tags.push(`P/VP: ${s.pvp >= 20 ? 'qualquer' : 'até ' + (s.pvp / 2).toFixed(1)}`);
  }
  tags.push(s.setor !== 'Todos' ? s.setor : 'Todos setores');
  tags.push('52 sem');

  el.innerHTML = tags.map(t => `<span class="setup-tag">${t}</span>`).join('');
}

/* ================= DROPDOWN DE SETOR ================= */
function buildSetorDropdowns() {
  [1, 2, 3].forEach(n => {
    const el = document.getElementById(`setor-dropdown-s${n}`);
    if (!el) return;
    el.innerHTML = SETORES.map(s => `
      <div class="setor-opt${s === setups[n].setor ? ' sel' : ''}"
           onclick="selectSetor(${n}, '${s}', event)">
        ${s}
      </div>
    `).join('');
  });
}

function toggleSetorDropdown(n) {
  const dd = document.getElementById(`setor-dropdown-s${n}`);
  if (!dd) return;
  const isOpen = dd.classList.contains('open');
  closeAllSetorDropdowns();
  if (!isOpen) dd.classList.add('open');
}

function closeAllSetorDropdowns() {
  document.querySelectorAll('.setor-dropdown').forEach(d => d.classList.remove('open'));
}

function selectSetor(n, setor, e) {
  e.stopPropagation();
  setups[n].setor = setor;
  document.getElementById(`setor-val-s${n}`).textContent = setor + ' ▾';

  // Atualiza selected no dropdown
  const dd = document.getElementById(`setor-dropdown-s${n}`);
  dd.querySelectorAll('.setor-opt').forEach(opt => {
    opt.classList.toggle('sel', opt.textContent.trim() === setor);
  });

  closeAllSetorDropdowns();
}

document.addEventListener('click', (e) => {
  if (!e.target.closest('.setup-sector')) closeAllSetorDropdowns();
});

/* ================= EXPANSÃO DE CARDS ================= */
function toggleHealth(index) {
  const section = document.getElementById(`health-${index}`);
  const card    = document.querySelector(`[data-index="${index}"]`);
  if (!section || !card) return;

  const expanded = section.classList.contains('expanded');
  section.classList.toggle('expanded', !expanded);

  const arrow = card.querySelector('.expand-arrow');
  const icon  = card.querySelector('.arrow-icon');
  if (arrow) arrow.classList.toggle('expanded', !expanded);
  if (icon)  icon.style.transform = expanded ? 'rotate(0deg)' : 'rotate(180deg)';
}

/* ================= HEADER STATS ================= */
function updateHeader() {
  const total = document.getElementById('headerTotal');
  const cache = document.getElementById('cacheTime');
  if (total) total.textContent = allProcessedStocks.length;
  if (cache) cache.textContent = `Atualizado há ${getCacheTime()}`;
}

/* ================= BUSCA ================= */
function setupSearch() {
  const input = document.getElementById('search');
  if (!input) return;
  input.addEventListener('input', (e) => {
    searchTerm = e.target.value.trim();
    filterAndRender();
  });
}

/* ================= RESTAURAR ESTADO SALVO ================= */
function restoreState() {
  try {
    const saved = localStorage.getItem('a2_setups');
    if (saved) {
      const parsed = JSON.parse(saved);
      [1, 2, 3].forEach(n => {
        if (parsed[n]) {
          setups[n] = { ...setups[n], ...parsed[n] };

          // Restaura inputs
          const nameEl = document.getElementById(`name-s${n}`);
          if (nameEl) nameEl.value = setups[n].name;

          const ndEl = document.getElementById(`nd-s${n}`);
          if (ndEl) ndEl.textContent = setups[n].name;

          const descEl = document.getElementById(`r-s${n}-desc`);
          if (descEl) { descEl.value = setups[n].desc; onSlider(n, 'desc', setups[n].desc); }

          const dyEl = document.getElementById(`r-s${n}-dy`);
          if (dyEl) { dyEl.value = setups[n].dy; onSlider(n, 'dy', setups[n].dy); }

          if (n !== 3) {
            const plEl = document.getElementById(`r-s${n}-pl`);
            if (plEl) { plEl.value = setups[n].pl; onSlider(n, 'pl', setups[n].pl); }

            const pvpEl = document.getElementById(`r-s${n}-pvp`);
            if (pvpEl) { pvpEl.value = setups[n].pvp; onSlider(n, 'pvp', setups[n].pvp); }
          }

          document.getElementById(`setor-val-s${n}`).textContent = setups[n].setor + ' ▾';

          if (setups[n].saved) {
            document.getElementById(`card-s${n}`).classList.add('configured');
            updateSummary(n);
          }
        }
      });
    }
  } catch (e) {
    console.warn('Erro restaurando estado:', e);
  }
}

/* ================= INICIALIZAÇÃO ================= */
async function init() {
  // Mostra loading
  document.getElementById('loading').style.display = 'block';
  document.getElementById('empty-state').classList.remove('visible');

  restoreState();
  buildSetorDropdowns();
  setupSearch();

  // Busca dados
  const apiData = await fetchAllStocks();

  // Processa
  allProcessedStocks = stocks.map(stock => {
    const api = apiData.find(d => d.symbol === stock.ticker);
    if (!api || !api.regularMarketPrice || api.regularMarketPrice <= 0) return null;
    if (!api.fiftyTwoWeekLow || !api.fiftyTwoWeekHigh ||
        api.fiftyTwoWeekHigh <= api.fiftyTwoWeekLow) return null;

    const target   = targetFromHistory(api.fiftyTwoWeekLow, api.fiftyTwoWeekHigh, stock.category);
    const discount = ((target - api.regularMarketPrice) / target) * 100;

    return {
      ...stock,
      price:        api.regularMarketPrice,
      target,
      discount,
      change:       api.regularMarketChange || 0,
      fundamentals: api
    };
  }).filter(Boolean);

  document.getElementById('loading').style.display = 'none';
  updateHeader();

  const hasAnySaved = [1, 2, 3].some(n => setups[n].saved);
  if (!hasAnySaved) {
    document.getElementById('empty-state').classList.add('visible');
  } else {
    // Se usuário salvou enquanto API ainda carregava, activeSetup já está definido
    // Caso contrário ativa o primeiro salvo
    if (!activeSetup) {
      activeSetup = [1, 2, 3].find(n => setups[n].saved);
    }
    filterAndRender();
  }

  console.log(`🎯 Auricchio 2 — ${allProcessedStocks.length} ações carregadas`);
}

/* ================= EXPÕE GLOBAIS (chamados pelo HTML) ================= */
window.toggleSetup          = toggleSetup;
window.saveSetup            = saveSetup;
window.onSlider             = onSlider;
window.toggleHealth         = toggleHealth;
window.toggleSetorDropdown  = toggleSetorDropdown;
window.selectSetor          = selectSetor;

/* ================= START ================= */
init();

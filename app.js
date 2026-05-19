/* ========================================
   AUTO-LIMPEZA DO SERVICE WORKER ANTIGO
======================================== */
(async function autoCleanup() {
  const SW_VERSION = 'v4';
  const lastCleanup = localStorage.getItem('sw-cleanup-version');
  if (lastCleanup !== SW_VERSION) {
    try {
      if ('serviceWorker' in navigator) {
        const regs = await navigator.serviceWorker.getRegistrations();
        for (let r of regs) await r.unregister();
      }
      if ('caches' in window) {
        const names = await caches.keys();
        for (let n of names) await caches.delete(n);
      }
      const keep = ['stocksCache_v4','auricchio_config'];
      Object.keys(localStorage).forEach(k => { if (!keep.includes(k) && k !== 'sw-cleanup-version') localStorage.removeItem(k); });
      localStorage.setItem('sw-cleanup-version', SW_VERSION);
      setTimeout(() => window.location.reload(true), 500);
      return;
    } catch (e) {
      localStorage.setItem('sw-cleanup-version', SW_VERSION);
    }
  }
})();

/* ========================================
   AURICCHIO — Monitor de Ações
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

const CONFIG_KEY = 'auricchio_config';

const DEFAULT_DISCOUNT_CONFIG = {
  periodo: 3,
  levels: [
    { name: 'Desconto Leve',     from: 8.3,  plMax: null },
    { name: 'Desconto Moderado', from: 16.6, plMax: null },
    { name: 'Desconto Forte',    auto: true,  plMax: null }
  ]
};

function loadDiscountConfig() {
  try {
    const raw = localStorage.getItem(CONFIG_KEY);
    if (!raw) return JSON.parse(JSON.stringify(DEFAULT_DISCOUNT_CONFIG));
    const cfg = JSON.parse(raw);
    cfg.levels = cfg.levels.map(l => ({ ...l, plMax: l.plMax ?? null }));
    if ('plMax' in cfg) delete cfg.plMax;
    return cfg;
  } catch { return JSON.parse(JSON.stringify(DEFAULT_DISCOUNT_CONFIG)); }
}

function saveDiscountConfig(cfg) { localStorage.setItem(CONFIG_KEY, JSON.stringify(cfg)); }

let discountConfig = loadDiscountConfig();

/* ── ESTADO ── */
let currentDiscountFilter = 'light';
let currentSectorFilter   = 'Todos';
let allProcessedStocks    = [];
let modoTop               = null;
const sectorByFilter      = { light:'Todos', moderate:'Todos', strong:'Todos' };

const stocks = [
  { ticker:'ITUB4',  name:'Itaú',           sector:'Bancos',    category:'perene'  },
  { ticker:'BBAS3',  name:'Banco do Brasil', sector:'Bancos',    category:'perene'  },
  { ticker:'BBDC4',  name:'Bradesco',        sector:'Bancos',    category:'perene'  },
  { ticker:'TAEE11', name:'Taesa',           sector:'Energia',   category:'perene'  },
  { ticker:'EGIE3',  name:'Engie',           sector:'Energia',   category:'perene'  },
  { ticker:'CMIG4',  name:'Cemig',           sector:'Energia',   category:'perene'  },
  { ticker:'PETR4',  name:'Petrobras',       sector:'Petróleo',  category:'ciclica' },
  { ticker:'VALE3',  name:'Vale',            sector:'Mineração', category:'ciclica' },
  { ticker:'RADL3',  name:'Raia Drogasil',   sector:'Saúde',     category:'perene'  },
  { ticker:'FLRY3',  name:'Fleury',          sector:'Saúde',     category:'perene'  },
  { ticker:'LREN3',  name:'Renner',          sector:'Varejo',    category:'perene'  },
  { ticker:'ASAI3',  name:'Assaí',           sector:'Varejo',    category:'perene'  },
  { ticker:'WEGE3',  name:'WEG',             sector:'Indústria', category:'perene'  },
  { ticker:'GGBR4',  name:'Gerdau',          sector:'Siderurgia',category:'ciclica' },
  { ticker:'BBSE3',  name:'BB Seguridade',   sector:'Seguros',   category:'perene'  },
  { ticker:'VIVT3',  name:'Vivo',            sector:'Telecom',   category:'perene'  },
  { ticker:'SBSP3',  name:'Sabesp',          sector:'Saneamento',category:'perene'  },
  { ticker:'KLBN11', name:'Klabin',          sector:'Papel',     category:'perene'  },
  { ticker:'MULT3',  name:'Multiplan',       sector:'Shoppings', category:'perene'  },
  { ticker:'ITSA4',  name:'Itaúsa',          sector:'Holdings',  category:'perene'  },
];

const DROPDOWN_SECTORS = ['Todos','Bancos','Energia','Seguros','Comunicação','Petróleo','Varejo','Saúde','Construção Civil'];

const TOPS_DATA = {
  'ITUB4':  { dy:6.2,  pvp:1.42, pl:8.1  }, 'BBAS3':  { dy:8.8,  pvp:0.92, pl:4.1  },
  'BBDC4':  { dy:5.4,  pvp:0.88, pl:7.2  }, 'TAEE11': { dy:12.4, pvp:1.10, pl:8.2  },
  'EGIE3':  { dy:8.1,  pvp:2.20, pl:10.4 }, 'CMIG4':  { dy:9.6,  pvp:1.05, pl:6.2  },
  'PETR4':  { dy:14.2, pvp:1.80, pl:3.8  }, 'VALE3':  { dy:7.8,  pvp:1.60, pl:5.2  },
  'RADL3':  { dy:1.2,  pvp:4.10, pl:28.4 }, 'FLRY3':  { dy:3.4,  pvp:2.40, pl:18.6 },
  'LREN3':  { dy:4.8,  pvp:2.10, pl:14.2 }, 'ASAI3':  { dy:2.1,  pvp:3.20, pl:24.9 },
  'WEGE3':  { dy:1.8,  pvp:6.40, pl:32.1 }, 'GGBR4':  { dy:5.6,  pvp:0.88, pl:6.4  },
  'BBSE3':  { dy:9.8,  pvp:3.10, pl:9.2  }, 'VIVT3':  { dy:6.4,  pvp:1.90, pl:11.8 },
  'SBSP3':  { dy:3.2,  pvp:1.40, pl:16.2 }, 'KLBN11': { dy:4.1,  pvp:1.20, pl:12.4 },
  'MULT3':  { dy:3.8,  pvp:2.80, pl:20.1 }, 'ITSA4':  { dy:5.9,  pvp:1.60, pl:9.8  },
};

/* ── HELPERS ── */
function getManualLevels() { return discountConfig.levels.filter(l => !l.auto); }
function hasModerato() { return getManualLevels().length >= 2; }

function getBadgeText(discount) {
  const manual = getManualLevels();
  for (let i = manual.length-1; i >= 0; i--) { if (discount >= manual[i].from) return manual[i].name; }
  if (discount > 0) return manual[0].name;
  return discountConfig.levels[discountConfig.levels.length-1].name;
}

function getBadgeClass(discount) {
  const manual = getManualLevels();
  for (let i = manual.length-1; i >= 0; i--) {
    if (discount >= manual[i].from) { if (i===0) return 'light'; if (i===1) return 'moderate'; return 'strong'; }
  }
  if (discount > 0) return 'light';
  return 'strong';
}

function getBorderClass(discount) {
  const cls = getBadgeClass(discount);
  if (cls==='strong')   return 'border-red-500';
  if (cls==='moderate') return 'border-yellow-500';
  if (cls==='light' && discount>0) return 'border-blue-500';
  return 'border-gray-400';
}

function getDiscountColor(discount) {
  const cls = getBadgeClass(discount);
  if (cls==='strong')   return '#ef4444';
  if (cls==='moderate') return '#f59e0b';
  return '#3b82f6';
}

function getTopsData(stock, campo) { return TOPS_DATA[stock.ticker]?.[campo] ?? 999; }
function formatBRL(value) { return `R$ ${value.toFixed(2)}`; }
const sleep = ms => new Promise(r => setTimeout(r, ms));

/* ── INDICADOR: labels semânticos ── */
function getIndicadorPL(pe) {
  if (!pe || pe <= 0) return { valor:'N/A', cls:'azul',    sub:'sem dados' };
  if (pe < 10)        return { valor:pe.toFixed(1), cls:'verde',   sub:'ótimo' };
  if (pe < 20)        return { valor:pe.toFixed(1), cls:'verde',   sub:'bom' };
  if (pe < 30)        return { valor:pe.toFixed(1), cls:'amarelo', sub:'razoável' };
  return               { valor:pe.toFixed(1), cls:'vermelho', sub:'caro' };
}

function getIndicadorPVP(pvp) {
  if (!pvp || pvp <= 0) return { valor:'N/A', cls:'azul',    sub:'sem dados' };
  if (pvp < 1.5)         return { valor:pvp.toFixed(2), cls:'verde',   sub:'bom' };
  if (pvp < 3)           return { valor:pvp.toFixed(2), cls:'amarelo', sub:'razoável' };
  return                  { valor:pvp.toFixed(2), cls:'vermelho', sub:'elevado' };
}

function getIndicadorDY(dy) {
  if (!dy || dy <= 0) return { valor:'N/A',          cls:'azul',    sub:'sem dividendo' };
  if (dy >= 8)         return { valor:`${dy.toFixed(1)}%`, cls:'verde',   sub:'excelente' };
  if (dy >= 4)         return { valor:`${dy.toFixed(1)}%`, cls:'verde',   sub:'bom' };
  return                { valor:`${dy.toFixed(1)}%`, cls:'amarelo', sub:'baixo' };
}

/* ── LABELS ── */
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
    if (btnMod)   btnMod.textContent   = manual[1].name;
    if (statModL) statModL.textContent = manual[1].name;
  } else {
    if (wrapMod)  wrapMod.classList.add('hidden');
    if (statMod)  statMod.classList.add('hidden');
    if (currentDiscountFilter === 'moderate') { currentDiscountFilter='light'; activateFilterBtn('light'); }
  }

  const autoLevel = levels[levels.length-1];
  const btnStrong  = document.getElementById('btn-label-strong');
  const statStrong = document.getElementById('stat-label-strong');
  if (btnStrong)  btnStrong.textContent  = autoLevel?.name ?? 'Desconto Forte';
  if (statStrong) statStrong.textContent = autoLevel?.name ?? 'Desconto Forte';
}

/* ══ CONFIG ══ */
let tempConfig = null;

function openConfig() {
  tempConfig = JSON.parse(JSON.stringify(discountConfig));
  renderConfigScreen();
  document.getElementById('config-screen').classList.add('visible');
  window.scrollTo(0,0);
}
function closeConfig() { document.getElementById('config-screen').classList.remove('visible'); }

function selectPeriodo(anos) {
  tempConfig.periodo = anos;
  document.querySelectorAll('.periodo-btn').forEach(b => b.classList.toggle('sel', parseInt(b.dataset.anos)===anos));
}

function renderConfigScreen() {
  document.querySelectorAll('.periodo-btn').forEach(b => b.classList.toggle('sel', parseInt(b.dataset.anos)===tempConfig.periodo));
  const container = document.getElementById('niveis-container');
  const levels = tempConfig.levels;
  const classes = ['leve','mod','forte'];
  container.innerHTML = levels.map((lvl,i) => {
    const isAuto = !!lvl.auto;
    const canRemove = levels.filter(l=>!l.auto).length > 1;
    const ateLabel = isAuto ? 'de' : 'até';
    const pctValue = isAuto ? (levels[i-1]?.from ?? 0) : lvl.from;
    const plVal = lvl.plMax ?? '';
    return `
      <div class="nivel-row ${classes[Math.min(i,2)]}" data-index="${i}">
        <div class="nivel-row-1">
          <div class="nivel-dot"></div>
          <input class="nivel-nome-input" type="text" value="${lvl.name}" maxlength="15" oninput="tempConfig.levels[${i}].name=this.value">
          <span class="nivel-ate-label">${ateLabel}</span>
          <input class="nivel-pct-input" type="number" min="0" max="99" step="0.1" value="${pctValue}" oninput="updateFrom(${i},this.value,${isAuto})">
          ${canRemove ? `<button class="btn-remover" onclick="removerNivel(${i})">✕</button>` : ''}
        </div>
        <div class="nivel-row-2">
          <span class="nivel-pl-label">P/L até</span>
          <input class="nivel-pl-input" type="number" min="0" max="999" step="1" value="${plVal}" placeholder="—" oninput="tempConfig.levels[${i}].plMax=this.value===''?null:parseFloat(this.value)">
          <span class="nivel-pl-hint">filtro opcional</span>
        </div>
      </div>`;
  }).join('');
}

function updateFrom(index, value, isAuto) { const num=parseFloat(value); if(!isNaN(num)) tempConfig.levels[index].from=num; }
function removerNivel(index) { const m=tempConfig.levels.filter(l=>!l.auto); if(m.length<=1)return; tempConfig.levels.splice(index,1); renderConfigScreen(); }

function salvarConfig() {
  const manual = tempConfig.levels.filter(l=>!l.auto);
  for (let i=0;i<manual.length-1;i++) {
    if (manual[i].from >= manual[i+1].from) { alert(`⚠️ Nível ${i+1} deve ser menor que Nível ${i+2}.`); return; }
  }
  discountConfig = JSON.parse(JSON.stringify(tempConfig));
  saveDiscountConfig(discountConfig);
  applyConfigLabels();
  closeConfig();
  filterAndRender(searchInput.value.toUpperCase());
  updateStatistics(allProcessedStocks);
  const toast = document.getElementById('toast');
  toast.classList.add('show');
  setTimeout(()=>toast.classList.remove('show'),2500);
}

function adicionarNivel() {
  const manual = tempConfig.levels.filter(l=>!l.auto);
  if (manual.length>=3) { alert('⚠️ Máximo de 3 níveis manuais.'); return; }
  const lastFrom = manual[manual.length-1]?.from ?? 8.3;
  const novoFrom = parseFloat((lastFrom+8).toFixed(1));
  const autoIndex = tempConfig.levels.findIndex(l=>l.auto);
  tempConfig.levels.splice(autoIndex,0,{name:'Novo Nível',from:novoFrom,plMax:null});
  renderConfigScreen();
}

function restaurarPadrao() {
  if (!confirm('Restaurar configuração padrão?')) return;
  tempConfig = JSON.parse(JSON.stringify(DEFAULT_DISCOUNT_CONFIG));
  renderConfigScreen();
}

window.openConfig=openConfig; window.closeConfig=closeConfig; window.selectPeriodo=selectPeriodo;
window.removerNivel=removerNivel; window.updateFrom=updateFrom; window.salvarConfig=salvarConfig;
window.adicionarNivel=adicionarNivel; window.restaurarPadrao=restaurarPadrao;

/* ── MENU ── */
const SOBRE_TEXTO = 'O Auricchio compara o preço atual de cada ação com sua própria média histórica de até 5 anos. Quando o preço está abaixo dessa média, a ação pode estar em desconto — uma possível oportunidade para o investidor de longo prazo.';
let sobreAberto=false, favAberto=false, sobreTypingDone=false;

function toggleMenu() {
  const overlay=document.getElementById('menuOverlay'), drawer=document.getElementById('menuDrawer');
  if (drawer.classList.contains('open')) closeMenu();
  else { overlay.classList.add('open'); drawer.classList.add('open'); }
}
function closeMenu() {
  document.getElementById('menuOverlay').classList.remove('open');
  document.getElementById('menuDrawer').classList.remove('open');
}
function toggleSobre() {
  sobreAberto=!sobreAberto;
  const exp=document.getElementById('sobreExpandable'),arrow=document.getElementById('sobreArrow'),item=document.getElementById('sobreItem');
  exp.classList.toggle('open',sobreAberto); arrow.classList.toggle('open',sobreAberto); item.classList.toggle('active',sobreAberto);
  if (sobreAberto && !sobreTypingDone) { typewriterEffect('sobreText',SOBRE_TEXTO,22); sobreTypingDone=true; }
}
function typewriterEffect(id,text,speed) {
  const el=document.getElementById(id); el.innerHTML=''; let i=0;
  const cursor='<span class="sobre-cursor"></span>';
  function type() { if(i<text.length){el.innerHTML=text.slice(0,i+1)+cursor;i++;setTimeout(type,speed);}else{el.innerHTML=text;} }
  type();
}
function toggleFavoritas() {
  favAberto=!favAberto;
  const exp=document.getElementById('favExpandable'),arrow=document.getElementById('favArrow'),item=document.getElementById('favItem');
  exp.classList.toggle('open',favAberto); arrow.classList.toggle('open',favAberto); item.classList.toggle('active',favAberto);
  if (favAberto) renderFavoritas();
}
function renderFavoritas() {
  const content=document.getElementById('favContent'), favs=getFavoritas();
  if (favs.length===0) { content.innerHTML='<div class="fav-empty">Nenhuma ação favoritada ainda.</div>'; return; }
  content.innerHTML=favs.map(fav=>{
    const stock=allProcessedStocks.find(s=>s.ticker===fav.ticker);
    const color=stock?getDiscountColor(stock.discount):'#64748b';
    const levelName=stock?getBadgeText(stock.discount):'—';
    return `<div class="fav-item" onclick="closeMenu()"><div class="fav-dot" style="background:${color}"></div><span class="fav-ticker">${fav.ticker}</span><span class="fav-name">${fav.name||''}</span><span class="fav-level" style="background:${color}22;color:${color};">${levelName}</span></div>`;
  }).join('');
}
function getFavoritas() { try { return JSON.parse(localStorage.getItem('auricchio_favoritas')||'[]'); } catch { return []; } }

window.toggleMenu=toggleMenu; window.closeMenu=closeMenu; window.toggleSobre=toggleSobre; window.toggleFavoritas=toggleFavoritas;

/* ── DROPDOWNS ── */
function buildDropdowns() {
  ['light','moderate','strong'].forEach(filter => {
    const container=document.getElementById(`dropdown-${filter}`);
    if (!container) return;
    container.innerHTML=DROPDOWN_SECTORS.map(sector=>`<div class="sector-option${sector==='Todos'?' selected':''}" data-sector="${sector}" onclick="selectSector('${filter}','${sector}',this)">${sector}</div>`).join('');
  });
}

function toggleSectorDropdown(filter) {
  const dropdown=document.getElementById(`dropdown-${filter}`);
  if (!dropdown) return;
  const isOpen=dropdown.classList.contains('open');
  closeAllDropdowns();
  if (!isOpen) { dropdown.classList.add('open'); activateFilterBtn(filter); }
}
function closeAllDropdowns() { document.querySelectorAll('.sector-dropdown').forEach(d=>d.classList.remove('open')); }
document.addEventListener('click',e=>{ if(!e.target.closest('.filter-btn-wrapper')) closeAllDropdowns(); });

function selectSector(filter, sector, clickedEl) {
  sectorByFilter[filter]=sector;
  if (currentDiscountFilter===filter) currentSectorFilter=sector;
  const container=document.getElementById(`dropdown-${filter}`);
  container.querySelectorAll('.sector-option').forEach(opt=>opt.classList.toggle('selected',opt.dataset.sector===sector));
  const btn=document.querySelector(`.filter-btn[data-filter="${filter}"]`);
  let label=btn.querySelector('.filter-btn-sector');
  if (sector==='Todos') { if(label) label.remove(); }
  else { if(!label){label=document.createElement('span');label.className='filter-btn-sector';btn.appendChild(label);} label.textContent=sector; }
  closeAllDropdowns(); activateFilterBtn(filter); filterAndRender(searchInput.value.toUpperCase());
}

function activateFilterBtn(filter) {
  document.querySelectorAll('.filter-btn').forEach(b=>b.classList.remove('active'));
  const btn=document.querySelector(`.filter-btn[data-filter="${filter}"]`);
  if (btn) btn.classList.add('active');
  currentDiscountFilter=filter;
  currentSectorFilter=sectorByFilter[filter]||'Todos';
}

/* ── SAÚDE ── */
function analyzeHealth(fundamentals, priceHistory=null) {
  if (!fundamentals) return {items:[],performanceItems:[]};
  const stats=fundamentals.defaultKeyStatistics||{};
  const items=[];
  const pe=fundamentals.priceEarnings;
  items.push({label:'P/L',value:(pe&&pe>0)?pe.toFixed(2):'N/A',status:(pe>0&&pe<20)?'positive':(pe>=20&&pe<=30)?'warning':'negative'});
  const pvp=stats.priceToBook;
  items.push({label:'P/VP',value:(pvp&&pvp>0)?pvp.toFixed(2):'N/A',status:(pvp>0&&pvp<3)?'positive':(pvp>=3&&pvp<=5)?'warning':'negative'});
  const dy=stats.dividendYield;
  items.push({label:'Dividend Yield',value:(dy&&dy>0)?`${dy.toFixed(2)}%`:'N/A',status:(dy>=4)?'positive':(dy>0)?'warning':'negative'});
  const performanceItems=[];
  const precoAtual=fundamentals.regularMarketPrice??null;
  function calcVar(a,b){if(!a||!b||b===0)return null;return((a-b)/b)*100;}
  function fmtVar(v){if(v===null)return{value:'N/A',status:'negative'};const s=v>=0?'+':'';return{value:`${s}${v.toFixed(2)}%`,status:v>=5?'positive':v>=0?'warning':'negative'};}
  performanceItems.push({label:'Valorização 12M',...fmtVar(calcVar(precoAtual,priceHistory?.price12mAgo))});
  performanceItems.push({label:'Valorização Mês', ...fmtVar(calcVar(precoAtual,priceHistory?.price1mAgo))});
  return {items,performanceItems};
}

/* ── CACHE ── */
function getCache() {
  try { const raw=localStorage.getItem(CONFIG.CACHE_KEY); if(!raw)return null; const data=JSON.parse(raw); return(Date.now()-data.time<CONFIG.CACHE_TIME)?data.value:null; }
  catch { return null; }
}
function setCache(value) { try{localStorage.setItem(CONFIG.CACHE_KEY,JSON.stringify({time:Date.now(),value}));}catch(e){} }

/* ── API ── */
const BRAPI_TOKEN = 'fT19untzZdLhuoC5y4aQxn';

async function fetchDataFromAPI(tickers) {
  try {
    const resp = await fetch(`https://brapi.dev/api/quote/${tickers}?token=${BRAPI_TOKEN}`);
    const data = await resp.json();
    if (data.error) throw new Error(data.message||data.error);
    return data;
  } catch(e) { console.error('Erro API:',e); return {error:true}; }
}

async function fetchAllStocks() {
  const data=[];
  const totalBatches=Math.ceil(stocks.length/CONFIG.BATCH_SIZE);
  for (let i=0;i<stocks.length;i+=CONFIG.BATCH_SIZE) {
    const batch=stocks.slice(i,i+CONFIG.BATCH_SIZE);
    const tickers=batch.map(s=>s.ticker).join(',');
    const batchNum=Math.floor(i/CONFIG.BATCH_SIZE)+1;
    try {
      const apiData=await fetchDataFromAPI(tickers);
      if(apiData?.results){data.push(...apiData.results);console.log(`✓ Lote ${batchNum}/${totalBatches}`);}
      if(batchNum<totalBatches) await sleep(CONFIG.REQUEST_DELAY);
    } catch(e){console.warn(`⚠️ Erro lote ${batchNum}:`,e.message);}
  }
  return data;
}

async function fetchPriceHistory(ticker) {
  try {
    const resp=await fetch(`/api/stocks/history?ticker=${ticker}`);
    const data=await resp.json();
    const results=data?.results?.[0]?.historicalDataPrice;
    if(!results||results.length<2)return null;
    const sorted=[...results].sort((a,b)=>a.date-b.date);
    const hoje=Date.now();
    const dozeM=hoje-365*24*60*60*1000, umM=hoje-30*24*60*60*1000;
    const nearest=target=>sorted.reduce((prev,curr)=>Math.abs(curr.date*1000-target)<Math.abs(prev.date*1000-target)?curr:prev)?.close??null;
    return {price12mAgo:nearest(dozeM),price1mAgo:nearest(umM)};
  } catch(e){return null;}
}

/* ── RENDER CARDS ── */
async function renderStocks(stockList) {
  if (stockList.length===0) {
    app.innerHTML=`<div class="empty-state"><div class="empty-icon">🔍</div><h3>Nenhuma ação encontrada</h3><p>Tente buscar outro termo ou ajuste os filtros</p></div>`;
    return;
  }

  app.innerHTML=stockList.map((stock,index)=>{
    const badgeText=getBadgeText(stock.discount);
    const badgeClass=getBadgeClass(stock.discount);
    const borderClass=getBorderClass(stock.discount);
    const discColor=getDiscountColor(stock.discount);
    const {items}=analyzeHealth(stock.fundamentals,null);

    return `
      <div class="stock-card ${borderClass}" data-index="${index}">
        <div class="stock-header">
          <div>
            <div class="stock-ticker">${stock.ticker}</div>
            <div class="stock-name">${stock.name}</div>
          </div>
          <div style="display:flex;align-items:center;gap:8px;">
            <button class="btn-grafico" id="btn-grafico-${index}"
              onclick="toggleGrafico(${index},${stock.price},${stock.target})">
              📈 <span class="gseta">▾</span>
            </button>
            <div class="discount-badge ${badgeClass}">${badgeText}</div>
          </div>
        </div>

        <div class="grafico-area" id="grafico-area-${index}">
          <div class="grafico-wrap">
            <button class="btn-expandir-modal"
              title="Abrir gráfico ampliado"
              onclick="event.stopPropagation();abrirModalGrafico('${stock.ticker}')">⤢</button>
            <canvas id="grafico-canvas-${index}"></canvas>
          </div>
          <div class="grafico-footer">
            <div class="grafico-legenda">
              <div class="leg-item"><div class="leg-line-solid"></div>Preço</div>
              <div class="leg-item"><div class="leg-line-dash"></div>Média histórica</div>
            </div>
            <div class="grafico-periodo">
              ${[1,2,3,4,5].map(a=>`<button class="gpbtn${a===discountConfig.periodo?' sel':''}" onclick="setGraficoPeriodo(${index},${a},this,${stock.price},${stock.target})">${a}a</button>`).join('')}
            </div>
          </div>
        </div>

        <span class="stock-sector">${stock.sector}</span>
        ${stock.change!==undefined?`<div class="daily-change ${stock.change>=0?'positive':'negative'}">${stock.change>=0?'▲':'▼'} ${Math.abs(stock.change).toFixed(2)}% hoje</div>`:''}
        <div class="stock-info">
          <div class="info-row"><span class="info-label">Preço Atual</span><span class="price-current">${formatBRL(stock.price)}</span></div>
          <div class="info-row"><span class="info-label">Média Histórica (${discountConfig.periodo} anos)</span><span class="info-value">${formatBRL(stock.target)}</span></div>
          <div class="info-row"><span class="info-label">Desconto</span><span class="info-value" style="color:${discColor}">${stock.discount.toFixed(1)}%</span></div>
        </div>
        <div class="expand-arrow" onclick="toggleHealth(${index})"><span class="arrow-icon">▼</span></div>
        <div class="health-section" id="health-${index}">
          <div class="health-content">
            <div class="health-title">📊 Indicadores Fundamentalistas</div>
            ${items.map(item=>`<div class="health-item"><span class="health-label">${item.label}</span><span class="health-value ${item.status}">${item.value}</span></div>`).join('')}
            <div class="health-title" style="margin-top:12px">📈 Performance</div>
            <div id="performance-${index}"><div class="health-item"><span class="health-label" style="color:#6b7280;font-size:0.8rem">⏳ Carregando...</span></div></div>
          </div>
        </div>
      </div>`;
  }).join('');

  stockList.forEach((stock,index)=>{
    fetchPriceHistory(stock.ticker).then(history=>{
      const el=document.getElementById(`performance-${index}`);
      if(!el)return;
      const {performanceItems}=analyzeHealth(stock.fundamentals,history);
      el.innerHTML=performanceItems.map(item=>`<div class="health-item"><span class="health-label">${item.label}</span><span class="health-value ${item.status}">${item.value}</span></div>`).join('');
    });
  });
}

/* ── RENDER TOPs ── */
function renderTopCards(stockList,tipo,cls) {
  if (stockList.length===0) {
    app.innerHTML=`<div class="empty-state"><div class="empty-icon">🔍</div><h3>Nenhuma ação encontrada</h3><p>Tente ajustar os filtros de desconto</p></div>`;
    return;
  }
  const configs={
    dividendos:{campo:'dy',label:'Dividend Yield',sub:'rendimento sobre o preço atual',fmt:v=>`${v.toFixed(1)}%`},
    patrimonial:{campo:'pvp',label:'P/VP',sub:'preço sobre patrimônio líquido',fmt:v=>v.toFixed(2)},
    valuation:{campo:'pl',label:'P/L',sub:'preço sobre lucro por ação',fmt:v=>`${v.toFixed(1)}x`},
  };
  const cfg=configs[tipo];
  const badgeColors={div:{bg:'rgba(16,185,129,0.2)',color:'#10b981'},pat:{bg:'rgba(139,92,246,0.2)',color:'#a78bfa'},val:{bg:'rgba(245,158,11,0.2)',color:'#f59e0b'}};
  const bc=badgeColors[cls];

  app.innerHTML=stockList.map((stock,index)=>{
    const topVal=getTopsData(stock,cfg.campo);
    const topFmt=topVal===999?'N/A':cfg.fmt(topVal);
    const discount=stock.discount;
    const manual=getManualLevels();
    const l0=manual[0]?.from??8.3, l1=manual[1]?.from??16.6;
    const badgeText=getBadgeText(discount);
    let nivelCls='leve';
    if(discount>=l1)nivelCls='forte';else if(discount>=l0)nivelCls='mod';
    const borderCls=`border-top-${cls}-${nivelCls}`;
    const {items}=analyzeHealth(stock.fundamentals,null);
    const chartBtnDY = tipo === 'dividendos' ? `
      <button class="btn-grafico dy" id="btn-grafico-dy-${index}"
        onclick="toggleGraficoBarras(${index},'${stock.ticker}')">
        💰 <span class="gseta">▾</span>
      </button>` : '';

    const chartAreaDY = tipo === 'dividendos' ? `
      <div class="grafico-area" id="grafico-area-dy-${index}">
        <div class="grafico-wrap">
          <button class="btn-expandir-modal dy" title="Ver pagamentos detalhados" onclick="event.stopPropagation();abrirModalDY('${stock.ticker}')">⤢</button>
          <canvas id="grafico-canvas-dy-${index}"></canvas>
        </div>
        <div class="grafico-footer">
          <div class="grafico-legenda">
            <div class="leg-item"><div class="leg-bar-dy"></div>DY anual</div>
            <div class="leg-item"><div class="leg-line-dash"></div>Média</div>
          </div>
          <div class="grafico-periodo">
            <button class="gpbtn sel" onclick="setBarrasPeriodo(${index},'${stock.ticker}',3,this)">3a</button>
            <button class="gpbtn" onclick="setBarrasPeriodo(${index},'${stock.ticker}',4,this)">4a</button>
            <button class="gpbtn" onclick="setBarrasPeriodo(${index},'${stock.ticker}',5,this)">5a</button>
          </div>
        </div>
      </div>` : '';

    const pvpAtual = TOPS_DATA[stock.ticker]?.pvp ?? 1.0;
    const pvpMin   = parseFloat((pvpAtual * 0.58).toFixed(2));
    const pvpMax   = parseFloat((pvpAtual * 1.55).toFixed(2));
    const pvpMed   = parseFloat((pvpAtual * 0.96).toFixed(2));
    const pvpPct   = Math.round(((pvpAtual - pvpMin) / (pvpMax - pvpMin)) * 100);

    const chartBtnPat = tipo === 'patrimonial' ? `
      <button class="btn-grafico pat" id="btn-grafico-pat-${index}"
        onclick="toggleGaugePat(${index},'${stock.ticker}',${pvpAtual},${pvpMin},${pvpMax})">
        🏛️ <span class="gseta">▾</span>
      </button>` : '';

    const chartAreaPat = tipo === 'patrimonial' ? `
      <div class="grafico-area" id="grafico-area-pat-${index}">
        <div class="grafico-wrap">
          <button class="btn-expandir-modal" style="border-color:rgba(139,92,246,0.3);color:#c4b5fd;"
            title="Ver histórico P/VP"
            onclick="event.stopPropagation();abrirModalPat('${stock.ticker}')">⤢</button>
          <div class="gauge-top-labels">
            <div class="gauge-top-label">Mínimo<strong style="color:#10b981">${pvpMin}</strong></div>
            <div class="gauge-top-label center">Média 3a<strong style="color:#a78bfa">${pvpMed}</strong></div>
            <div class="gauge-top-label right">Máximo<strong style="color:#ef4444">${pvpMax}</strong></div>
          </div>
          <div class="gauge-track">
            <div class="gauge-marker" id="gauge-marker-${index}" style="left:0%">
              <div class="gauge-marker-tag" id="gauge-tag-${index}">Atual ${pvpAtual}</div>
            </div>
          </div>
          <div class="gauge-zones">
            <div class="gz barato">Barato</div>
            <div class="gz justo">Justo</div>
            <div class="gz elevado">Elevado</div>
            <div class="gz caro">Caro</div>
          </div>
        </div>
      </div>` : '';

    const plAtual = TOPS_DATA[stock.ticker]?.pl ?? 10;
    const plMin   = parseFloat((plAtual * 0.55).toFixed(1));
    const plMax   = parseFloat((plAtual * 1.8).toFixed(1));
    const plMed   = parseFloat((plAtual * 0.92).toFixed(1));

    const chartBtnVal = tipo === 'valuation' ? `
      <button class="btn-grafico val" id="btn-grafico-val-${index}"
        onclick="toggleGaugeVal(${index},'${stock.ticker}',${plAtual},${plMin},${plMax})">
        📊 <span class="gseta">▾</span>
      </button>` : '';

    const chartAreaVal = tipo === 'valuation' ? `
      <div class="grafico-area" id="grafico-area-val-${index}">
        <div class="grafico-wrap">
          <button class="btn-expandir-modal val"
            title="Ver histórico P/L"
            onclick="event.stopPropagation();abrirModalVal('${stock.ticker}')">⤢</button>
          <div class="gauge-top-labels">
            <div class="gauge-top-label">Mínimo<strong style="color:#10b981">${plMin}×</strong></div>
            <div class="gauge-top-label center">Média 3a<strong style="color:#f59e0b">${plMed}×</strong></div>
            <div class="gauge-top-label right">Máximo<strong style="color:#ef4444">${plMax}×</strong></div>
          </div>
          <div class="gauge-track" style="background:linear-gradient(to right,rgba(16,185,129,0.75) 0%,rgba(59,130,246,0.65) 35%,rgba(245,158,11,0.75) 65%,rgba(239,68,68,0.75) 100%)">
            <div class="gauge-marker" id="gauge-val-marker-${index}" style="left:0%;box-shadow:0 0 0 3px rgba(245,158,11,0.65),0 2px 10px rgba(0,0,0,0.5)">
              <div class="gauge-marker-tag" id="gauge-val-tag-${index}" style="background:rgba(245,158,11,0.18);border-color:rgba(245,158,11,0.4);color:#fcd34d">Atual ${plAtual}×</div>
            </div>
          </div>
          <div class="gauge-zones">
            <div class="gz barato">Barato</div>
            <div class="gz justo">Justo</div>
            <div class="gz elevado">Elevado</div>
            <div class="gz caro">Caro</div>
          </div>
        </div>
      </div>` : '';

    return `
      <div class="stock-card ${borderCls}" data-index="${index}">
        <div class="stock-header">
          <div><div class="stock-ticker">${stock.ticker}</div><div class="stock-name">${stock.name}</div></div>
          <div style="display:flex;align-items:center;gap:8px;">
            ${chartBtnDY}${chartBtnPat}${chartBtnVal}
            <div class="discount-badge" style="background:${bc.bg};color:${bc.color};">${badgeText}</div>
          </div>
        </div>
        ${chartAreaDY}${chartAreaPat}${chartAreaVal}
        <span class="stock-sector">${stock.sector}</span>
        ${stock.change!==undefined?`<div class="daily-change ${stock.change>=0?'positive':'negative'}">${stock.change>=0?'▲':'▼'} ${Math.abs(stock.change).toFixed(2)}% hoje</div>`:''}
        <div class="top-highlight ${cls}">
          <div><div class="top-highlight-label">${cfg.label}</div><div class="top-highlight-sub">${cfg.sub}</div></div>
          <div class="top-highlight-value">${topFmt}</div>
        </div>
        <div class="stock-info">
          <div class="info-row"><span class="info-label">Preço Atual</span><span class="price-current">${formatBRL(stock.price)}</span></div>
          <div class="info-row"><span class="info-label">Média Histórica (${discountConfig.periodo} anos)</span><span class="info-value">${formatBRL(stock.target)}</span></div>
          <div class="info-row"><span class="info-label">Desconto</span><span class="info-value" style="color:${getDiscountColor(discount)}">${discount.toFixed(1)}%</span></div>
        </div>
        <div class="expand-arrow" onclick="toggleHealth(${index})"><span class="arrow-icon">▼</span></div>
        <div class="health-section" id="health-${index}">
          <div class="health-content">
            <div class="health-title">📊 Indicadores Fundamentalistas</div>
            ${items.map(item=>`<div class="health-item"><span class="health-label">${item.label}</span><span class="health-value ${item.status}">${item.value}</span></div>`).join('')}
            <div class="health-title" style="margin-top:12px">📈 Performance</div>
            <div id="performance-${index}"><div class="health-item"><span class="health-label" style="color:#6b7280;font-size:0.8rem">⏳ Carregando...</span></div></div>
          </div>
        </div>
      </div>`;
  }).join('');

  stockList.forEach((stock,index)=>{
    fetchPriceHistory(stock.ticker).then(history=>{
      const el=document.getElementById(`performance-${index}`);
      if(!el)return;
      const {performanceItems}=analyzeHealth(stock.fundamentals,history);
      el.innerHTML=performanceItems.map(item=>`<div class="health-item"><span class="health-label">${item.label}</span><span class="health-value ${item.status}">${item.value}</span></div>`).join('');
    });
  });
}

/* ── MODO TOP ── */
function openTop(tipo) { closeMenu(); modoTop=tipo; renderTopMode(); }
function closeTopMode() {
  modoTop=null;
  const totalCard=document.getElementById('totalStocks'),totalLabel=totalCard?.previousElementSibling;
  if(totalLabel)totalLabel.textContent='Total de Ações';
  if(totalCard)totalCard.style.color='#e2e8f0';
  const btn=document.getElementById('btnVoltarPadrao');
  if(btn)btn.style.display='none';
  filterAndRender(searchInput.value.toUpperCase());
  updateStatistics(allProcessedStocks);
}
function renderTopMode() {
  const configs={
    dividendos:{label:'💰 TOPs Dividendos',cls:'div',sort:(a,b)=>getTopsData(b,'dy')-getTopsData(a,'dy')},
    patrimonial:{label:'🏛️ TOPs Patrimonial',cls:'pat',sort:(a,b)=>getTopsData(a,'pvp')-getTopsData(b,'pvp')},
    valuation:{label:'📊 TOPs Valuation',cls:'val',sort:(a,b)=>getTopsData(a,'pl')-getTopsData(b,'pl')},
  };
  const cfg=configs[modoTop]; if(!cfg)return;
  const btn=document.getElementById('btnVoltarPadrao'); if(btn)btn.style.display='block';
  const totalValue=document.getElementById('totalStocks');
  const cores={div:'#10b981',pat:'#a78bfa',val:'#f59e0b'};
  const manual=getManualLevels(), l0from=manual[0]?.from??8.3, l1from=manual[1]?.from??16.6, temMod=hasModerato();
  let filtered=allProcessedStocks.filter(s=>{
    const d=s.discount; if(d<=0)return false;
    if(currentDiscountFilter==='light')return d>0&&d<l0from;
    if(currentDiscountFilter==='moderate')return temMod?(d>=l0from&&d<l1from):false;
    if(currentDiscountFilter==='strong')return d>=(temMod?l1from:l0from);
    return d>0;
  }).filter(s=>{const pl=s.fundamentals?.priceEarnings;return!(pl!==null&&pl!==undefined&&pl<=0);}).sort(cfg.sort);
  if(totalValue){totalValue.textContent=filtered.length;totalValue.style.color=cores[cfg.cls];}
  renderTopCards(filtered,modoTop,cfg.cls);
}
window.openTop=openTop; window.closeTopMode=closeTopMode;

/* ── FILTROS ── */
function getCurrentLevel() {
  const levels=discountConfig.levels, manual=getManualLevels(), temMod=hasModerato();
  if(currentDiscountFilter==='strong')return levels[levels.length-1];
  if(currentDiscountFilter==='moderate')return temMod?manual[1]:null;
  return manual[0];
}

function applyFilters(stockList,searchTerm='') {
  if (searchTerm) {
    const norm=searchTerm.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'');
    return stockList.filter(stock=>{
      const fields=[stock.ticker,stock.name,stock.sector,...(stock.aliases||[])].join(' ').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'');
      return fields.includes(norm);
    });
  }
  const manual=getManualLevels(), l0from=manual[0]?.from??8.3, l1from=manual[1]?.from??16.6, temMod=hasModerato();
  let filtered=stockList.filter(stock=>{
    const d=stock.discount; if(d<=0)return false;
    if(currentDiscountFilter==='strong'){const lf=manual[manual.length-1]?.from??l0from;return d>=lf;}
    if(currentDiscountFilter==='moderate'){if(!temMod)return false;return d>=l0from&&d<l1from;}
    if(currentDiscountFilter==='light')return d>0&&d<l0from;
    return false;
  });
  if(currentSectorFilter&&currentSectorFilter!=='Todos') filtered=filtered.filter(s=>s.sector.toLowerCase()===currentSectorFilter.toLowerCase());
  filtered=filtered.filter(s=>{const pl=s.fundamentals?.priceEarnings;return!(pl!==null&&pl!==undefined&&pl<=0);});
  if(currentDiscountFilter!=='strong')filtered=filtered.filter(s=>s.discount<=25);
  const currentLevel=getCurrentLevel();
  if(currentLevel&&currentLevel.plMax!==null&&currentLevel.plMax!==undefined){
    const maxPL=parseFloat(currentLevel.plMax);
    if(!isNaN(maxPL)&&maxPL>0) filtered=filtered.filter(s=>{const pl=s.fundamentals?.priceEarnings;if(!pl||pl<=0)return false;return pl<=maxPL;});
  }
  return filtered;
}

function filterAndRender(searchTerm='') {
  if (modoTop){renderTopMode();return;}
  const filtered=applyFilters(allProcessedStocks,searchTerm);
  filtered.sort((a,b)=>b.discount-a.discount);
  renderStocks(filtered);
}

/* ── ESTATÍSTICAS ── */
function updateStatistics(allStocks) {
  const manual=getManualLevels(), l0from=manual[0]?.from??8.3, l1from=manual[1]?.from??16.6, temMod=hasModerato();
  const s={total:allStocks.length,strong:allStocks.filter(s=>s.discount>=(temMod?l1from:l0from)).length,moderate:temMod?allStocks.filter(s=>s.discount>=l0from&&s.discount<l1from).length:0,light:allStocks.filter(s=>s.discount>0&&s.discount<l0from).length};
  document.getElementById('totalStocks').textContent=s.total;
  document.getElementById('strongDiscounts').textContent=s.strong;
  document.getElementById('moderateDiscounts').textContent=s.moderate;
  document.getElementById('lightDiscounts').textContent=s.light;
  document.getElementById('headerTotal').textContent=s.total;
  const cacheRaw=localStorage.getItem(CONFIG.CACHE_KEY);
  if(cacheRaw){const mins=Math.floor((Date.now()-JSON.parse(cacheRaw).time)/60000),hours=Math.floor(mins/60);document.getElementById('cacheTime').textContent=hours>0?`${hours}h`:`${mins}min`;}
  else document.getElementById('cacheTime').textContent='agora';
}

/* ── PROCESSAMENTO ── */
function targetFromHistory(min,max,category) { return min+(max-min)*(category==='perene'?0.6:0.5); }

function processApiData(apiData) {
  return stocks.map(stock=>{
    const api=apiData.find(d=>d.symbol===stock.ticker);
    if(!api||!api.regularMarketPrice||api.regularMarketPrice<=0||!api.fiftyTwoWeekLow||!api.fiftyTwoWeekHigh||api.fiftyTwoWeekHigh<=api.fiftyTwoWeekLow)return null;
    const target=targetFromHistory(api.fiftyTwoWeekLow,api.fiftyTwoWeekHigh,stock.category);
    const discount=((target-api.regularMarketPrice)/target)*100;
    return {...stock,price:api.regularMarketPrice,target,discount,change:api.regularMarketChange||0,fundamentals:api};
  }).filter(Boolean);
}

/* ── EXPANSÃO SAÚDE ── */
function toggleHealth(index) {
  const section=document.getElementById(`health-${index}`), arrow=document.querySelector(`[data-index="${index}"] .expand-arrow`);
  if(!section||!arrow)return;
  const expanded=section.classList.contains('expanded');
  section.classList.toggle('expanded',!expanded); arrow.classList.toggle('expanded',!expanded);
  const icon=arrow.querySelector('.arrow-icon');
  if(icon){icon.style.display='inline-block';icon.style.transition='transform 0.3s ease';icon.style.transform=expanded?'rotate(0deg)':'rotate(180deg)';}
}

/* ── INICIALIZAÇÃO ── */
async function loadApp() {
  app.innerHTML=`<div class="loading"><div class="spinner"></div><p>Carregando dados das ações...</p></div>`;
  const cached=getCache();
  if(cached){allProcessedStocks=cached;console.log(`📦 Cache — ${cached.length} ações`);filterAndRender();updateStatistics(cached);return;}
  console.log('🌐 Buscando na BRAPI...');
  const apiData=await fetchAllStocks();
  const processedStocks=processApiData(apiData);
  console.log(`📊 OK: ${processedStocks.length}`);
  if(processedStocks.length>0)setCache(processedStocks);
  allProcessedStocks=processedStocks;
  filterAndRender(); updateStatistics(processedStocks);
}

searchInput.addEventListener('input',e=>filterAndRender(e.target.value.toUpperCase()));

window.toggleHealth=toggleHealth; window.toggleSectorDropdown=toggleSectorDropdown; window.selectSector=selectSector;

/* ══════════════════════════════════════════
   GRÁFICO INLINE (mini-card)
══════════════════════════════════════════ */
const _graficoState={};
const _barrasState={};  /* { [index]: { periodo, raf, aberto } } */

function _gerarDados(anos, preco, media) {
  const pts=anos*12, dados=[];
  let v=media*1.1;
  for(let i=0;i<pts;i++){
    const p=i/(pts-1);
    const alvo=p<0.55?media*(1.1-p*0.16):preco+(media*0.97-preco)*(1-(p-0.55)/0.45);
    v=v*0.73+alvo*0.27+(Math.random()-0.5)*media*0.02;
    dados.push(v);
  }
  dados[dados.length-1]=preco;
  return dados;
}

function _desenharGrafico(index, anos, preco, media) {
  const state=_graficoState[index];
  if(state?.raf)cancelAnimationFrame(state.raf);
  const canvas=document.getElementById(`grafico-canvas-${index}`);
  if(!canvas)return;
  const ctx=canvas.getContext('2d');
  const W=canvas.offsetWidth, H=150;
  canvas.width=W*devicePixelRatio; canvas.height=H*devicePixelRatio;
  ctx.scale(devicePixelRatio,devicePixelRatio);
  const dados=_gerarDados(anos,preco,media);
  const min=Math.min(...dados,media)*0.962, max=Math.max(...dados,media)*1.038;
  const toX=i=>(i/(dados.length-1))*W, toY=v=>H-((v-min)/(max-min))*H*0.84-H*0.06;
  const descPct=(((media-preco)/media)*100).toFixed(1);
  let prog=0;
  function draw(){
    ctx.clearRect(0,0,W,H);
    const mY=toY(media);
    ctx.fillStyle='rgba(59,130,246,0.035)'; ctx.fillRect(0,mY,W,H-mY);
    ctx.save(); ctx.setLineDash([5,5]); ctx.beginPath(); ctx.moveTo(0,mY); ctx.lineTo(W,mY);
    ctx.strokeStyle='rgba(100,116,139,0.4)'; ctx.lineWidth=1; ctx.stroke(); ctx.restore();
    ctx.font='8.5px Inter,-apple-system,sans-serif'; ctx.fillStyle='rgba(100,116,139,0.5)';
    ctx.fillText(`Média  ${formatBRL(media)}`,6,mY-5);
    const ate=Math.max(2,Math.floor(prog*dados.length));
    const grad=ctx.createLinearGradient(0,0,0,H);
    grad.addColorStop(0,'rgba(59,130,246,0.18)'); grad.addColorStop(1,'rgba(59,130,246,0)');
    ctx.beginPath(); ctx.moveTo(toX(0),H);
    for(let i=0;i<ate;i++)ctx.lineTo(toX(i),toY(dados[i]));
    ctx.lineTo(toX(ate-1),H); ctx.closePath(); ctx.fillStyle=grad; ctx.fill();
    ctx.beginPath(); ctx.moveTo(toX(0),toY(dados[0]));
    for(let i=1;i<ate;i++){const x0=toX(i-1),y0=toY(dados[i-1]),x1=toX(i),y1=toY(dados[i]);ctx.bezierCurveTo((x0+x1)/2,y0,(x0+x1)/2,y1,x1,y1);}
    ctx.strokeStyle='#3b82f6'; ctx.lineWidth=2; ctx.lineJoin='round'; ctx.stroke();
    const lx=toX(ate-1),ly=toY(dados[ate-1]);
    const pulse=Math.sin(Date.now()/280)*1.8;
    ctx.beginPath();ctx.arc(lx,ly,3.5,0,Math.PI*2);ctx.fillStyle='#3b82f6';ctx.fill();
    ctx.beginPath();ctx.arc(lx,ly,6+pulse,0,Math.PI*2);ctx.strokeStyle='rgba(59,130,246,0.25)';ctx.lineWidth=1.5;ctx.stroke();
    if(prog>0.9){ctx.font='bold 8.5px Space Mono,monospace';ctx.fillStyle='rgba(59,130,246,0.6)';ctx.fillText(`▼ ${descPct}%`,lx-26,(mY+ly)/2+4);}
    prog=Math.min(1,prog+0.032);
    _graficoState[index].raf=requestAnimationFrame(draw);
  }
  draw();
}

function toggleGrafico(index, preco, media) {
  if(!_graficoState[index])_graficoState[index]={periodo:discountConfig.periodo,raf:null,aberto:false};
  const state=_graficoState[index];
  state.aberto=!state.aberto;
  document.getElementById(`grafico-area-${index}`).classList.toggle('aberto',state.aberto);
  document.getElementById(`btn-grafico-${index}`).classList.toggle('aberto',state.aberto);
  if(state.aberto)setTimeout(()=>_desenharGrafico(index,state.periodo,preco,media),100);
  else cancelAnimationFrame(state.raf);
}

function setGraficoPeriodo(index, anos, el, preco, media) {
  _graficoState[index].periodo=anos;
  el.closest('.grafico-periodo').querySelectorAll('.gpbtn').forEach(b=>b.classList.remove('sel'));
  el.classList.add('sel');
  _desenharGrafico(index,anos,preco,media);
}

window.toggleGrafico=toggleGrafico; window.setGraficoPeriodo=setGraficoPeriodo;

/* ══════════════════════════════════════════
   MODAL GRÁFICO FULLSCREEN — PREMIUM
══════════════════════════════════════════ */
let _modal = { ticker:null, anos:3, raf:null, dados:null, preco:0, media:0 };

function abrirModalGrafico(ticker) {
  const stock = allProcessedStocks.find(s => s.ticker === ticker);
  if (!stock) { console.warn('Stock não encontrado:', ticker); return; }

  _modal.ticker = stock.ticker;
  _modal.preco  = stock.price;
  _modal.media  = stock.target;
  _modal.anos   = discountConfig.periodo;

  /* Header */
  document.getElementById('modalTicker').textContent = stock.ticker;
  document.getElementById('modalNome').textContent   = stock.name;
  document.getElementById('modalPreco').textContent  = formatBRL(stock.price);
  document.getElementById('modalDesc').textContent   = `▼ ${stock.discount.toFixed(1)}% da média`;

  /* Stats */
  document.getElementById('mstatPreco').textContent    = formatBRL(stock.price);
  document.getElementById('mstatMedia').textContent    = formatBRL(stock.target);
  document.getElementById('mstatDesconto').textContent = `${stock.discount.toFixed(1)}%`;
  const change = stock.change ?? 0;
  const mstatChange = document.getElementById('mstatChange');
  mstatChange.textContent = `${change>=0?'▲':'▼'} ${Math.abs(change).toFixed(2)}%`;
  mstatChange.className   = `mstat-value ${change>=0?'positive':'negative'}`;

  /* Indicadores fundamentalistas */
  const tops = TOPS_DATA[ticker] || {};
  const fnd  = stock.fundamentals || {};
  const pe   = fnd.priceEarnings ?? tops.pl ?? null;
  const pvp  = fnd.defaultKeyStatistics?.priceToBook ?? tops.pvp ?? null;
  const dy   = fnd.defaultKeyStatistics?.dividendYield ?? tops.dy ?? null;

  const iPL  = getIndicadorPL(pe);
  const iPVP = getIndicadorPVP(pvp);
  const iDY  = getIndicadorDY(dy);

  const elPL  = document.getElementById('indPL');
  const elPVP = document.getElementById('indPVP');
  const elDY  = document.getElementById('indDY');

  /* limpa classes de cor anteriores */
  ['verde','amarelo','azul','vermelho'].forEach(c => {
    elPL.classList.remove(c); elPVP.classList.remove(c); elDY.classList.remove(c);
  });

  elPL.classList.add(iPL.cls);   document.getElementById('indValPL').textContent  = iPL.valor;  document.getElementById('indSubPL').textContent  = iPL.sub;
  elPVP.classList.add(iPVP.cls); document.getElementById('indValPVP').textContent = iPVP.valor; document.getElementById('indSubPVP').textContent = iPVP.sub;
  elDY.classList.add(iDY.cls);   document.getElementById('indValDY').textContent  = iDY.valor;

  /* Período */
  document.querySelectorAll('#modalPeriodoRow .gpbtn').forEach((b,i) => b.classList.toggle('sel', i+1 === _modal.anos));

  /* Reset indicadores */
  [elPL, elPVP, elDY].forEach(el => el.classList.remove('visivel'));

  /* Abre overlay */
  document.getElementById('modalGraficoOverlay').classList.add('aberto');
  document.body.style.overflow = 'hidden';

  /* Desenha e anima indicadores em cascata */
  setTimeout(() => {
    _desenharGraficoModal(_modal.anos, stock.price, stock.target);
    setTimeout(() => elPL.classList.add('visivel'),  400);
    setTimeout(() => elPVP.classList.add('visivel'), 620);
    setTimeout(() => elDY.classList.add('visivel'),  840);
  }, 80);
}

function fecharModalGrafico(event) {
  /* Se veio do clique no overlay, só fecha se clicou no próprio overlay */
  if (event && event.target !== document.getElementById('modalGraficoOverlay')) return;
  _fecharModal();
}

function _fecharModal() {
  document.getElementById('modalGraficoOverlay').classList.remove('aberto');
  document.body.style.overflow = '';
  if (_modal.raf) { cancelAnimationFrame(_modal.raf); _modal.raf = null; }
  /* Remove animação dos indicadores para próxima abertura */
  ['indPL','indPVP','indDY'].forEach(id => document.getElementById(id).classList.remove('visivel'));
}

function setModalPeriodo(anos, el) {
  _modal.anos = anos;
  document.querySelectorAll('#modalPeriodoRow .gpbtn').forEach(b => b.classList.remove('sel'));
  el.classList.add('sel');
  _desenharGraficoModal(anos, _modal.preco, _modal.media);
}

/* helper canvas */
function _roundRect(ctx,x,y,w,h,r) {
  ctx.beginPath();
  ctx.moveTo(x+r,y);ctx.lineTo(x+w-r,y);ctx.quadraticCurveTo(x+w,y,x+w,y+r);
  ctx.lineTo(x+w,y+h-r);ctx.quadraticCurveTo(x+w,y+h,x+w-r,y+h);
  ctx.lineTo(x+r,y+h);ctx.quadraticCurveTo(x,y+h,x,y+h-r);
  ctx.lineTo(x,y+r);ctx.quadraticCurveTo(x,y,x+r,y);
  ctx.closePath();
}

function _desenharGraficoModal(anos, preco, media) {
  if (_modal.raf) cancelAnimationFrame(_modal.raf);

  const canvas = document.getElementById('grafFull');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  const W = canvas.offsetWidth || canvas.parentElement.offsetWidth;
  const H = canvas.offsetHeight || canvas.parentElement.offsetHeight;
  canvas.width = W * devicePixelRatio;
  canvas.height = H * devicePixelRatio;
  ctx.scale(devicePixelRatio, devicePixelRatio);

  const dados = _gerarDados(anos, preco, media);
  _modal.dados = dados;

  const min = Math.min(...dados, media) * 0.955;
  const max = Math.max(...dados, media) * 1.045;
  const toX = i => (i / (dados.length-1)) * W;
  const toY = v => H - ((v-min)/(max-min)) * H*0.82 - H*0.08;

  let prog = 0;

  function draw() {
    ctx.clearRect(0, 0, W, H);
    const mY = toY(media);

    /* grade */
    ctx.save(); ctx.strokeStyle='rgba(255,255,255,0.03)'; ctx.lineWidth=1;
    for(let i=1;i<5;i++){const y=(H/5)*i;ctx.beginPath();ctx.moveTo(0,y);ctx.lineTo(W,y);ctx.stroke();}
    ctx.restore();

    /* zona abaixo da média */
    ctx.fillStyle='rgba(59,130,246,0.025)'; ctx.fillRect(0,mY,W,H-mY);

    /* média tracejada */
    ctx.save(); ctx.setLineDash([7,6]);
    ctx.beginPath(); ctx.moveTo(0,mY); ctx.lineTo(W,mY);
    ctx.strokeStyle='rgba(100,116,139,0.4)'; ctx.lineWidth=1.3; ctx.stroke(); ctx.restore();
    ctx.font="9px Inter,-apple-system,sans-serif"; ctx.fillStyle='rgba(100,116,139,0.5)';
    ctx.fillText(`Média  ${formatBRL(media)}`, 8, mY-7);

    const ate = Math.max(2, Math.floor(prog*dados.length));

    /* área */
    const grad = ctx.createLinearGradient(0,0,0,H);
    grad.addColorStop(0,'rgba(59,130,246,0.24)');
    grad.addColorStop(0.65,'rgba(59,130,246,0.06)');
    grad.addColorStop(1,'rgba(59,130,246,0)');
    ctx.beginPath(); ctx.moveTo(toX(0),H);
    for(let i=0;i<ate;i++)ctx.lineTo(toX(i),toY(dados[i]));
    ctx.lineTo(toX(ate-1),H); ctx.closePath(); ctx.fillStyle=grad; ctx.fill();

    /* linha bezier suavizada */
    ctx.beginPath(); ctx.moveTo(toX(0),toY(dados[0]));
    for(let i=1;i<ate;i++){
      const x0=toX(i-1),y0=toY(dados[i-1]),x1=toX(i),y1=toY(dados[i]);
      ctx.bezierCurveTo((x0+x1)/2,y0,(x0+x1)/2,y1,x1,y1);
    }
    ctx.strokeStyle='#3b82f6'; ctx.lineWidth=2.8; ctx.lineJoin='round'; ctx.lineCap='round'; ctx.stroke();

    /* ponto final animado + tooltip Hoje */
    if (prog >= 1) {
      const lx=toX(dados.length-1), ly=toY(preco);
      const pulse=Math.sin(Date.now()/280)*2.5;
      ctx.beginPath();ctx.arc(lx,ly,9+pulse,0,Math.PI*2);ctx.strokeStyle='rgba(59,130,246,0.1)';ctx.lineWidth=1.5;ctx.stroke();
      ctx.beginPath();ctx.arc(lx,ly,5,0,Math.PI*2);ctx.strokeStyle='rgba(59,130,246,0.4)';ctx.lineWidth=1.5;ctx.stroke();
      ctx.beginPath();ctx.arc(lx,ly,3.5,0,Math.PI*2);ctx.fillStyle='#3b82f6';ctx.fill();

      const ttW=110, ttH=44;
      const ttX=Math.max(4,Math.min(lx-ttW/2,W-ttW-4));
      const ttY=Math.max(4,ly-ttH-14);
      ctx.fillStyle='rgba(6,13,26,0.94)'; ctx.strokeStyle='rgba(59,130,246,0.32)'; ctx.lineWidth=1;
      _roundRect(ctx,ttX,ttY,ttW,ttH,8); ctx.fill(); ctx.stroke();
      const ps=formatBRL(preco);
      ctx.fillStyle='#3b82f6'; ctx.font="bold 12px Inter,-apple-system,sans-serif";
      ctx.fillText(ps, ttX+(ttW-ctx.measureText(ps).width)/2, ttY+17);
      ctx.fillStyle='#475569'; ctx.font="9px Inter,-apple-system,sans-serif";
      ctx.fillText('Hoje', ttX+(ttW-ctx.measureText('Hoje').width)/2, ttY+31);
    }

    prog = Math.min(1, prog+0.025);
    _modal.raf = requestAnimationFrame(draw);
  }
  draw();

  /* Hover tooltip */
  canvas.onmousemove = e => {
    if (!_modal.dados || prog < 0.3) return;
    const rect=canvas.getBoundingClientRect();
    const idx=Math.round(((e.clientX-rect.left)/rect.width)*(_modal.dados.length-1));
    const safe=Math.min(Math.max(idx,0),_modal.dados.length-1);
    const mAtras=_modal.dados.length-1-safe;
    document.getElementById('modalTooltipVal').textContent  = formatBRL(_modal.dados[safe]);
    document.getElementById('modalTooltipData').textContent = mAtras===0?'Hoje':`há ${mAtras}m`;
    document.getElementById('modalTooltip').classList.add('visible');
  };
  canvas.onmouseleave = () => document.getElementById('modalTooltip').classList.remove('visible');

  canvas.ontouchmove = e => {
    e.preventDefault();
    if (!_modal.dados) return;
    const rect=canvas.getBoundingClientRect();
    const idx=Math.round(((e.touches[0].clientX-rect.left)/rect.width)*(_modal.dados.length-1));
    const safe=Math.min(Math.max(idx,0),_modal.dados.length-1);
    const mAtras=_modal.dados.length-1-safe;
    document.getElementById('modalTooltipVal').textContent  = formatBRL(_modal.dados[safe]);
    document.getElementById('modalTooltipData').textContent = mAtras===0?'Hoje':`há ${mAtras}m`;
    document.getElementById('modalTooltip').classList.add('visible');
  };
  canvas.ontouchend = () => document.getElementById('modalTooltip').classList.remove('visible');
}

window.abrirModalGrafico  = abrirModalGrafico;
window.fecharModalGrafico = fecharModalGrafico;
window.setModalPeriodo    = setModalPeriodo;

/* ══════════════════════════════════════════
   GAUGE + MODAL PREMIUM — TOPs Valuation
══════════════════════════════════════════ */
const _gaugeValState = {};

const RANGE_SETOR = {
  'Bancos':     {min:6,  max:12}, 'Energia':    {min:8,  max:15},
  'Seguros':    {min:8,  max:14}, 'Varejo':     {min:12, max:22},
  'Saúde':      {min:14, max:28}, 'Petróleo':   {min:5,  max:12},
  'Siderurgia': {min:5,  max:14}, 'Mineração':  {min:5,  max:12},
  'Telecom':    {min:10, max:18}, 'Saneamento': {min:14, max:24},
  'Shoppings':  {min:16, max:26}, 'Holdings':   {min:8,  max:16},
  'Papel':      {min:10, max:20}, 'Indústria':  {min:18, max:35},
};

const PL_HISTORICO = {
  'ITUB4': {plAtual:8.1, plMed:9.2, plMin:5.8, plMax:14.2},
  'BBAS3': {plAtual:4.1, plMed:5.8, plMin:3.2, plMax:9.1 },
  'BBDC4': {plAtual:7.2, plMed:8.4, plMin:4.8, plMax:13.2},
  'TAEE11':{plAtual:8.2, plMed:9.1, plMin:5.4, plMax:14.8},
  'EGIE3': {plAtual:10.4,plMed:11.2,plMin:7.2, plMax:16.4},
  'CMIG4': {plAtual:6.2, plMed:7.4, plMin:4.1, plMax:11.8},
  'VALE3': {plAtual:5.2, plMed:6.8, plMin:3.4, plMax:11.2},
  'BBSE3': {plAtual:9.2, plMed:10.4,plMin:6.8, plMax:15.2},
  'VIVT3': {plAtual:11.8,plMed:12.6,plMin:8.4, plMax:18.4},
  'KLBN11':{plAtual:12.4,plMed:13.8,plMin:8.2, plMax:20.6},
};

function _getPLData(ticker) {
  return PL_HISTORICO[ticker] ?? {
    plAtual:TOPS_DATA[ticker]?.pl??10, plMed:(TOPS_DATA[ticker]?.pl??10)*1.12,
    plMin:(TOPS_DATA[ticker]?.pl??10)*0.55, plMax:(TOPS_DATA[ticker]?.pl??10)*1.8,
  };
}

function toggleGaugeVal(index, ticker, plAtual, plMin, plMax) {
  if (!_gaugeValState[index]) _gaugeValState[index]={aberto:false};
  const state=_gaugeValState[index];
  state.aberto=!state.aberto;
  document.getElementById(`grafico-area-val-${index}`).classList.toggle('aberto',state.aberto);
  document.getElementById(`btn-grafico-val-${index}`).classList.toggle('aberto',state.aberto);
  if (state.aberto) {
    setTimeout(()=>{
      const pct=Math.round(((plAtual-plMin)/(plMax-plMin))*100);
      const marker=document.getElementById(`gauge-val-marker-${index}`);
      const tag=document.getElementById(`gauge-val-tag-${index}`);
      if(marker)marker.style.left=`calc(${pct}% - 10px)`;
      if(tag)tag.classList.add('show');
    },150);
  } else {
    const tag=document.getElementById(`gauge-val-tag-${index}`);
    if(tag)tag.classList.remove('show');
  }
}

let _val={ticker:null,periodo:3,raf:null};

function abrirModalVal(ticker) {
  const stock=allProcessedStocks.find(s=>s.ticker===ticker);
  if(!stock)return;
  const d=_getPLData(ticker);
  const range=RANGE_SETOR[stock.sector]??{min:8,max:18};
  _val.ticker=ticker; _val.periodo=3;
  document.getElementById('valModalTicker').textContent=ticker;
  document.getElementById('valModalCompany').textContent=stock.name;
  document.getElementById('valModalValue').textContent=`${d.plAtual.toFixed(1)}×`;
  document.getElementById('valIndMedia').textContent=`${d.plMed.toFixed(1)}×`;
  document.getElementById('valIndMin').textContent=`${d.plMin.toFixed(1)}×`;
  document.getElementById('valIndRange').textContent=`${range.min}–${range.max}×`;
  document.getElementById('valStAtual').textContent=`${d.plAtual.toFixed(1)}×`;
  document.getElementById('valStMedia').textContent=`${d.plMed.toFixed(1)}×`;
  document.getElementById('valStMin').textContent=`${d.plMin.toFixed(1)}×`;
  document.getElementById('valStMax').textContent=`${d.plMax.toFixed(1)}×`;
  document.querySelectorAll('.val-pbtn').forEach((b,i)=>b.classList.toggle('sel',i===2));
  document.querySelectorAll('.val-ind').forEach(el=>el.classList.remove('show'));
  document.getElementById('modalValOverlay').classList.add('aberto');
  document.body.style.overflow='hidden';
  setTimeout(()=>{
    _desenharPL(ticker,3);
    setTimeout(()=>document.getElementById('valInd0').classList.add('show'),600);
    setTimeout(()=>document.getElementById('valInd1').classList.add('show'),780);
    setTimeout(()=>document.getElementById('valInd2').classList.add('show'),960);
  },80);
}

function fecharModalVal() {
  document.getElementById('modalValOverlay').classList.remove('aberto');
  document.body.style.overflow='';
  if(_val.raf){cancelAnimationFrame(_val.raf);_val.raf=null;}
  document.querySelectorAll('.val-ind').forEach(el=>el.classList.remove('show'));
}

function setPeriodoVal(anos,el) {
  _val.periodo=anos;
  document.querySelectorAll('.val-pbtn').forEach(b=>b.classList.remove('sel'));
  el.classList.add('sel');
  if(_val.raf)cancelAnimationFrame(_val.raf);
  _desenharPL(_val.ticker,anos);
}

function _gerarDadosPL(ticker,anos) {
  const d=_getPLData(ticker);
  const pts=anos*12, dados=[];
  let v=d.plMax*0.85;
  for(let i=0;i<pts;i++){
    const p=i/(pts-1);
    const alvo=d.plMax*0.85-p*(d.plMax*0.85-d.plAtual)+Math.sin(p*Math.PI*4)*(d.plMax-d.plMin)*0.1;
    v=v*0.72+alvo*0.28+(Math.random()-0.5)*(d.plMax-d.plMin)*0.05;
    v=Math.max(d.plMin*0.88,Math.min(d.plMax*1.08,v));
    dados.push(parseFloat(v.toFixed(2)));
  }
  dados[dados.length-1]=d.plAtual;
  return dados;
}

function _desenharPL(ticker,anos) {
  if(_val.raf)cancelAnimationFrame(_val.raf);
  const canvas=document.getElementById('grafVal');
  if(!canvas)return;
  const ctx=canvas.getContext('2d');
  const W=canvas.offsetWidth||canvas.parentElement.offsetWidth;
  const H=canvas.offsetHeight||canvas.parentElement.offsetHeight;
  canvas.width=W*devicePixelRatio; canvas.height=H*devicePixelRatio;
  ctx.scale(devicePixelRatio,devicePixelRatio);
  const stock=allProcessedStocks.find(s=>s.ticker===ticker);
  const d=_getPLData(ticker);
  const range=RANGE_SETOR[stock?.sector??'Bancos']??{min:8,max:18};
  const dados=_gerarDadosPL(ticker,anos);
  const media=dados.reduce((s,v)=>s+v,0)/dados.length;
  const PAD={t:20,b:28,l:36,r:14};
  const cW=W-PAD.l-PAD.r, cH=H-PAD.t-PAD.b;
  const allVals=[...dados,range.min,range.max];
  const min=Math.min(...allVals)*0.88, max=Math.max(...allVals)*1.08;
  const toX=i=>PAD.l+(i/(dados.length-1))*cW;
  const toY=v=>PAD.t+cH-((v-min)/(max-min))*cH;
  const mediaY=toY(media);
  let prog=0, tooltipDados=[];

  function frame(){
    ctx.clearRect(0,0,W,H);
    ctx.save();ctx.strokeStyle='rgba(255,255,255,0.03)';ctx.lineWidth=1;
    for(let i=1;i<5;i++){const y=(H/5)*i;ctx.beginPath();ctx.moveTo(PAD.l,y);ctx.lineTo(W-PAD.r,y);ctx.stroke();}
    ctx.restore();
    for(let i=0;i<=4;i++){
      const v=min+(max-min)*(i/4);
      ctx.font='8px Inter,-apple-system,sans-serif';
      ctx.fillStyle='rgba(71,85,105,0.55)';ctx.textAlign='right';
      ctx.fillText(`${v.toFixed(1)}×`,PAD.l-4,toY(v)+3);
    }
    ctx.textAlign='left';
    const bandaTop=toY(range.max),bandaBot=toY(range.min);
    ctx.fillStyle='rgba(16,185,129,0.08)';ctx.fillRect(PAD.l,bandaTop,cW,bandaBot-bandaTop);
    ctx.save();ctx.strokeStyle='rgba(16,185,129,0.22)';ctx.lineWidth=1;ctx.setLineDash([4,4]);
    ctx.beginPath();ctx.moveTo(PAD.l,bandaTop);ctx.lineTo(W-PAD.r,bandaTop);ctx.stroke();
    ctx.beginPath();ctx.moveTo(PAD.l,bandaBot);ctx.lineTo(W-PAD.r,bandaBot);ctx.stroke();
    ctx.restore();
    ctx.font='7.5px Inter,-apple-system,sans-serif';ctx.fillStyle='rgba(16,185,129,0.45)';
    ctx.fillText(`Range ${stock?.sector??''}: ${range.min}–${range.max}×`,PAD.l+6,bandaTop-4);
    ctx.save();ctx.setLineDash([6,5]);
    ctx.beginPath();ctx.moveTo(PAD.l,mediaY);ctx.lineTo(W-PAD.r,mediaY);
    ctx.strokeStyle='rgba(245,158,11,0.45)';ctx.lineWidth=1.3;ctx.stroke();ctx.restore();
    ctx.font='8px Inter,-apple-system,sans-serif';ctx.fillStyle='rgba(245,158,11,0.6)';
    ctx.fillText(`Média  ${media.toFixed(1)}×`,PAD.l+6,mediaY-6);
    const ate=Math.max(2,Math.floor(prog*dados.length));
    const grad=ctx.createLinearGradient(0,PAD.t,0,H-PAD.b);
    grad.addColorStop(0,'rgba(245,158,11,0.2)');grad.addColorStop(0.6,'rgba(245,158,11,0.05)');grad.addColorStop(1,'rgba(245,158,11,0)');
    ctx.beginPath();ctx.moveTo(toX(0),H-PAD.b);
    for(let i=0;i<ate;i++)ctx.lineTo(toX(i),toY(dados[i]));
    ctx.lineTo(toX(ate-1),H-PAD.b);ctx.closePath();ctx.fillStyle=grad;ctx.fill();
    ctx.beginPath();ctx.moveTo(toX(0),toY(dados[0]));
    for(let i=1;i<ate;i++){const x0=toX(i-1),y0=toY(dados[i-1]),x1=toX(i),y1=toY(dados[i]);ctx.bezierCurveTo((x0+x1)/2,y0,(x0+x1)/2,y1,x1,y1);}
    ctx.strokeStyle='#f59e0b';ctx.lineWidth=2.5;ctx.lineJoin='round';ctx.stroke();
    if(prog>=1){
      const lx=toX(dados.length-1),ly=toY(d.plAtual);
      const pulse=Math.sin(Date.now()/280)*2.5;
      ctx.beginPath();ctx.arc(lx,ly,9+pulse,0,Math.PI*2);ctx.strokeStyle='rgba(16,185,129,0.15)';ctx.lineWidth=1.5;ctx.stroke();
      ctx.beginPath();ctx.arc(lx,ly,5,0,Math.PI*2);ctx.strokeStyle='rgba(16,185,129,0.5)';ctx.lineWidth=1.5;ctx.stroke();
      ctx.beginPath();ctx.arc(lx,ly,3.5,0,Math.PI*2);ctx.fillStyle='#10b981';ctx.fill();
      const ttW=112,ttH=40;
      const ttX=Math.max(PAD.l,Math.min(lx-ttW/2,W-PAD.r-ttW));
      const ttY=Math.max(PAD.t,ly-ttH-14);
      ctx.fillStyle='rgba(4,9,18,0.94)';ctx.strokeStyle='rgba(245,158,11,0.32)';ctx.lineWidth=1;
      ctx.beginPath();ctx.roundRect(ttX,ttY,ttW,ttH,8);ctx.fill();ctx.stroke();
      ctx.fillStyle='#f59e0b';ctx.font='bold 11px Inter,-apple-system,sans-serif';ctx.textAlign='center';
      ctx.fillText(`P/L ${d.plAtual.toFixed(1)}×`,ttX+ttW/2,ttY+15);
      ctx.fillStyle='#475569';ctx.font='9px Inter,-apple-system,sans-serif';
      ctx.fillText('Hoje',ttX+ttW/2,ttY+29);ctx.textAlign='left';
    }
    const step=Math.max(1,Math.floor(dados.length/6));
    for(let i=0;i<ate;i+=step){
      const mAtras=dados.length-1-i;
      ctx.font='7px Inter,-apple-system,sans-serif';ctx.fillStyle='rgba(71,85,105,0.5)';
      ctx.fillText(mAtras===0?'Hoje':`${mAtras}m`,toX(i)-8,H-PAD.b+12);
    }
    tooltipDados=dados;
    prog=Math.min(1,prog+0.022);
    _val.raf=requestAnimationFrame(frame);
  }
  frame();

  function handlePos(mx){
    if(!tooltipDados.length)return;
    const idx=Math.round(((mx-PAD.l)/cW)*(tooltipDados.length-1));
    const safe=Math.min(Math.max(idx,0),tooltipDados.length-1);
    const mAtras=tooltipDados.length-1-safe;
    document.getElementById('valTtVal').textContent=`P/L ${tooltipDados[safe].toFixed(2)}×`;
    document.getElementById('valTtData').textContent=mAtras===0?'Hoje':`há ${mAtras}m`;
    document.getElementById('valTooltip').classList.add('visible');
  }
  canvas.onmousemove=e=>{const r=canvas.getBoundingClientRect();handlePos(e.clientX-r.left);};
  canvas.onmouseleave=()=>document.getElementById('valTooltip').classList.remove('visible');
  canvas.ontouchmove=e=>{e.preventDefault();const r=canvas.getBoundingClientRect();handlePos(e.touches[0].clientX-r.left);};
  canvas.ontouchend=()=>document.getElementById('valTooltip').classList.remove('visible');
}

window.toggleGaugeVal=toggleGaugeVal;
window.abrirModalVal =abrirModalVal;
window.fecharModalVal=fecharModalVal;
window.setPeriodoVal =setPeriodoVal;

/* ══════════════════════════════════════════
   GAUGE + MODAL PREMIUM — TOPs Patrimonial
══════════════════════════════════════════ */
const _gaugePatState = {}; /* { [index]: { aberto } } */

function toggleGaugePat(index, ticker, pvpAtual, pvpMin, pvpMax) {
  if (!_gaugePatState[index]) _gaugePatState[index] = { aberto: false };
  const state = _gaugePatState[index];
  state.aberto = !state.aberto;

  document.getElementById(`grafico-area-pat-${index}`).classList.toggle('aberto', state.aberto);
  document.getElementById(`btn-grafico-pat-${index}`).classList.toggle('aberto', state.aberto);

  if (state.aberto) {
    setTimeout(() => {
      const pct = Math.round(((pvpAtual - pvpMin) / (pvpMax - pvpMin)) * 100);
      const marker = document.getElementById(`gauge-marker-${index}`);
      const tag    = document.getElementById(`gauge-tag-${index}`);
      if (marker) marker.style.left = `calc(${pct}% - 10px)`;
      if (tag)    tag.classList.add('show');
    }, 150);
  } else {
    const tag = document.getElementById(`gauge-tag-${index}`);
    if (tag) tag.classList.remove('show');
  }
}

/* ── PVP histórico simulado por ticker ── */
const PVP_HISTORICO = {
  'ITUB4': {pvpAtual:1.42,pvpMed:1.38,pvpMin:0.92,pvpMax:2.10},
  'BBAS3': {pvpAtual:0.92,pvpMed:0.88,pvpMin:0.52,pvpMax:1.42},
  'BBDC4': {pvpAtual:0.88,pvpMed:0.92,pvpMin:0.58,pvpMax:1.38},
  'GGBR4': {pvpAtual:0.88,pvpMed:0.95,pvpMin:0.55,pvpMax:1.60},
  'VALE3': {pvpAtual:1.60,pvpMed:1.72,pvpMin:0.95,pvpMax:2.80},
  'TAEE11':{pvpAtual:1.10,pvpMed:1.18,pvpMin:0.72,pvpMax:1.80},
  'CMIG4': {pvpAtual:1.05,pvpMed:1.12,pvpMin:0.62,pvpMax:1.75},
  'KLBN11':{pvpAtual:1.20,pvpMed:1.28,pvpMin:0.78,pvpMax:2.10},
};

function _getPVPData(ticker) {
  return PVP_HISTORICO[ticker] ?? {
    pvpAtual: TOPS_DATA[ticker]?.pvp ?? 1.0,
    pvpMed:   (TOPS_DATA[ticker]?.pvp ?? 1.0) * 0.96,
    pvpMin:   (TOPS_DATA[ticker]?.pvp ?? 1.0) * 0.58,
    pvpMax:   (TOPS_DATA[ticker]?.pvp ?? 1.0) * 1.55,
  };
}

function _gerarDadosPVP(ticker, anos) {
  const d   = _getPVPData(ticker);
  const pts = anos * 12;
  const dados = [];
  let v = d.pvpMax * 0.88;
  for (let i = 0; i < pts; i++) {
    const p = i / (pts - 1);
    const alvo = d.pvpMax * 0.88 - p * (d.pvpMax * 0.88 - d.pvpAtual) + Math.sin(p * Math.PI * 3) * (d.pvpMax - d.pvpMin) * 0.08;
    v = v * 0.75 + alvo * 0.25 + (Math.random() - 0.5) * (d.pvpMax - d.pvpMin) * 0.04;
    v = Math.max(d.pvpMin * 0.92, Math.min(d.pvpMax * 1.05, v));
    dados.push(parseFloat(v.toFixed(3)));
  }
  dados[dados.length - 1] = d.pvpAtual;
  return dados;
}

let _pat = { ticker: null, periodo: 3, raf: null };

function abrirModalPat(ticker) {
  const stock = allProcessedStocks.find(s => s.ticker === ticker);
  if (!stock) return;
  const d = _getPVPData(ticker);

  _pat.ticker  = ticker;
  _pat.periodo = 3;

  document.getElementById('patModalTicker').textContent  = ticker;
  document.getElementById('patModalCompany').textContent = stock.name;
  document.getElementById('patModalValue').textContent   = d.pvpAtual.toFixed(2);

  /* posição no range: 0-100% */
  const pos = Math.round(((d.pvpAtual - d.pvpMin) / (d.pvpMax - d.pvpMin)) * 100);
  document.getElementById('patIndMedia').textContent = d.pvpMed.toFixed(2);
  document.getElementById('patIndMin').textContent   = d.pvpMin.toFixed(2);
  document.getElementById('patIndPos').textContent   = `${pos}%`;

  document.getElementById('patStAtual').textContent = d.pvpAtual.toFixed(2);
  document.getElementById('patStMedia').textContent = d.pvpMed.toFixed(2);
  document.getElementById('patStMin').textContent   = d.pvpMin.toFixed(2);
  document.getElementById('patStMax').textContent   = d.pvpMax.toFixed(2);

  /* reset período */
  document.querySelectorAll('.pat-pbtn').forEach((b,i) => b.classList.toggle('sel', i === 2));
  document.querySelectorAll('.pat-ind').forEach(el => el.classList.remove('show'));

  document.getElementById('modalPatOverlay').classList.add('aberto');
  document.body.style.overflow = 'hidden';

  setTimeout(() => {
    _desenharPVP(ticker, 3);
    setTimeout(() => document.getElementById('patInd0').classList.add('show'), 600);
    setTimeout(() => document.getElementById('patInd1').classList.add('show'), 780);
    setTimeout(() => document.getElementById('patInd2').classList.add('show'), 960);
  }, 80);
}

function fecharModalPat() {
  document.getElementById('modalPatOverlay').classList.remove('aberto');
  document.body.style.overflow = '';
  if (_pat.raf) { cancelAnimationFrame(_pat.raf); _pat.raf = null; }
  document.querySelectorAll('.pat-ind').forEach(el => el.classList.remove('show'));
}

function setPeriodoPat(anos, el) {
  _pat.periodo = anos;
  document.querySelectorAll('.pat-pbtn').forEach(b => b.classList.remove('sel'));
  el.classList.add('sel');
  if (_pat.raf) cancelAnimationFrame(_pat.raf);
  _desenharPVP(_pat.ticker, anos);
}

function _desenharPVP(ticker, anos) {
  if (_pat.raf) cancelAnimationFrame(_pat.raf);
  const canvas = document.getElementById('grafPat');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  const W = canvas.offsetWidth || canvas.parentElement.offsetWidth;
  const H = canvas.offsetHeight || canvas.parentElement.offsetHeight;
  canvas.width = W * devicePixelRatio; canvas.height = H * devicePixelRatio;
  ctx.scale(devicePixelRatio, devicePixelRatio);

  const dados = _gerarDadosPVP(ticker, anos);
  const d     = _getPVPData(ticker);
  const media = dados.reduce((s,v)=>s+v,0)/dados.length;

  const PAD = {t:20, b:28, l:36, r:14};
  const cW = W-PAD.l-PAD.r, cH = H-PAD.t-PAD.b;
  const min = Math.min(...dados)*0.92, max = Math.max(...dados)*1.08;
  const toX = i => PAD.l+(i/(dados.length-1))*cW;
  const toY = v => PAD.t+cH-((v-min)/(max-min))*cH;
  const mediaY = toY(media);

  let prog = 0, tooltipDados = [];

  function frame() {
    ctx.clearRect(0,0,W,H);

    /* grade */
    ctx.save(); ctx.strokeStyle='rgba(255,255,255,0.03)'; ctx.lineWidth=1;
    for(let i=1;i<5;i++){const y=(H/5)*i;ctx.beginPath();ctx.moveTo(PAD.l,y);ctx.lineTo(W-PAD.r,y);ctx.stroke();}
    ctx.restore();

    /* eixo Y */
    for(let i=0;i<=4;i++){
      const v=min+(max-min)*(i/4);
      ctx.font='8px Inter,-apple-system,sans-serif';
      ctx.fillStyle='rgba(71,85,105,0.55)'; ctx.textAlign='right';
      ctx.fillText(v.toFixed(2),PAD.l-4,toY(v)+3);
    }
    ctx.textAlign='left';

    /* zona abaixo da média */
    ctx.fillStyle='rgba(16,185,129,0.04)';
    ctx.fillRect(PAD.l,mediaY,cW,H-PAD.b-mediaY);

    /* média tracejada */
    ctx.save(); ctx.setLineDash([6,5]);
    ctx.beginPath();ctx.moveTo(PAD.l,mediaY);ctx.lineTo(W-PAD.r,mediaY);
    ctx.strokeStyle='rgba(139,92,246,0.4)'; ctx.lineWidth=1.3; ctx.stroke();
    ctx.restore();
    ctx.font='8px Inter,-apple-system,sans-serif';
    ctx.fillStyle='rgba(139,92,246,0.55)';
    ctx.fillText(`Média  ${media.toFixed(2)}`,PAD.l+6,mediaY-6);

    const ate=Math.max(2,Math.floor(prog*dados.length));

    /* área */
    const grad=ctx.createLinearGradient(0,PAD.t,0,H-PAD.b);
    grad.addColorStop(0,'rgba(139,92,246,0.22)');
    grad.addColorStop(0.6,'rgba(139,92,246,0.05)');
    grad.addColorStop(1,'rgba(139,92,246,0)');
    ctx.beginPath();ctx.moveTo(toX(0),H-PAD.b);
    for(let i=0;i<ate;i++)ctx.lineTo(toX(i),toY(dados[i]));
    ctx.lineTo(toX(ate-1),H-PAD.b);ctx.closePath();
    ctx.fillStyle=grad;ctx.fill();

    /* linha bezier */
    ctx.beginPath();ctx.moveTo(toX(0),toY(dados[0]));
    for(let i=1;i<ate;i++){
      const x0=toX(i-1),y0=toY(dados[i-1]),x1=toX(i),y1=toY(dados[i]);
      ctx.bezierCurveTo((x0+x1)/2,y0,(x0+x1)/2,y1,x1,y1);
    }
    ctx.strokeStyle='#a78bfa';ctx.lineWidth=2.5;ctx.lineJoin='round';ctx.stroke();

    /* ponto atual animado */
    if (prog>=1) {
      const lx=toX(dados.length-1), ly=toY(d.pvpAtual);
      const pulse=Math.sin(Date.now()/280)*2.5;
      ctx.beginPath();ctx.arc(lx,ly,9+pulse,0,Math.PI*2);ctx.strokeStyle='rgba(16,185,129,0.15)';ctx.lineWidth=1.5;ctx.stroke();
      ctx.beginPath();ctx.arc(lx,ly,5,0,Math.PI*2);ctx.strokeStyle='rgba(16,185,129,0.5)';ctx.lineWidth=1.5;ctx.stroke();
      ctx.beginPath();ctx.arc(lx,ly,3.5,0,Math.PI*2);ctx.fillStyle='#10b981';ctx.fill();

      const ttW=108,ttH=40;
      const ttX=Math.max(PAD.l,Math.min(lx-ttW/2,W-PAD.r-ttW));
      const ttY=Math.max(PAD.t,ly-ttH-14);
      ctx.fillStyle='rgba(4,9,18,0.94)';ctx.strokeStyle='rgba(139,92,246,0.32)';ctx.lineWidth=1;
      ctx.beginPath();ctx.roundRect(ttX,ttY,ttW,ttH,8);ctx.fill();ctx.stroke();
      ctx.fillStyle='#a78bfa';ctx.font='bold 11px Inter,-apple-system,sans-serif';ctx.textAlign='center';
      ctx.fillText(`P/VP ${d.pvpAtual.toFixed(2)}`,ttX+ttW/2,ttY+15);
      ctx.fillStyle='#475569';ctx.font='9px Inter,-apple-system,sans-serif';
      ctx.fillText('Hoje',ttX+ttW/2,ttY+29);
      ctx.textAlign='left';
    }

    /* eixo X */
    const step=Math.max(1,Math.floor(dados.length/6));
    for(let i=0;i<ate;i+=step){
      const mAtras=dados.length-1-i;
      ctx.font='7px Inter,-apple-system,sans-serif';ctx.fillStyle='rgba(71,85,105,0.5)';
      ctx.fillText(mAtras===0?'Hoje':`${mAtras}m`,toX(i)-8,H-PAD.b+12);
    }

    tooltipDados=dados;
    prog=Math.min(1,prog+0.022);
    _pat.raf=requestAnimationFrame(frame);
  }
  frame();

  function handlePos(mx) {
    if(!tooltipDados.length)return;
    const idx=Math.round(((mx-PAD.l)/cW)*(tooltipDados.length-1));
    const safe=Math.min(Math.max(idx,0),tooltipDados.length-1);
    const mAtras=tooltipDados.length-1-safe;
    document.getElementById('patTtVal').textContent=`P/VP ${tooltipDados[safe].toFixed(3)}`;
    document.getElementById('patTtData').textContent=mAtras===0?'Hoje':`há ${mAtras}m`;
    document.getElementById('patTooltip').classList.add('visible');
  }
  canvas.onmousemove=e=>{const r=canvas.getBoundingClientRect();handlePos(e.clientX-r.left);};
  canvas.onmouseleave=()=>document.getElementById('patTooltip').classList.remove('visible');
  canvas.ontouchmove=e=>{e.preventDefault();const r=canvas.getBoundingClientRect();handlePos(e.touches[0].clientX-r.left);};
  canvas.ontouchend=()=>document.getElementById('patTooltip').classList.remove('visible');
}

window.toggleGaugePat = toggleGaugePat;
window.abrirModalPat  = abrirModalPat;
window.fecharModalPat = fecharModalPat;
window.setPeriodoPat  = setPeriodoPat;

/* ══════════════════════════════════════════
   GRÁFICO DE BARRAS — TOPs Dividendos
══════════════════════════════════════════ */

/* DY histórico simulado por ticker (substituir por BRAPI Pro) */
const DY_HISTORICO = {
  'TAEE11': [14.2, 13.1, 12.8, 11.9, 12.4],
  'EGIE3':  [7.2,  8.4,  9.1,  8.8,  8.1 ],
  'CMIG4':  [8.8,  9.6,  10.2, 9.1,  9.6 ],
  'BBAS3':  [6.1,  7.4,  8.8,  9.2,  8.8 ],
  'PETR4':  [11.2, 9.8,  14.6, 15.1, 14.2],
  'BBSE3':  [8.4,  9.1,  9.8,  10.2, 9.8 ],
  'ITUB4':  [4.8,  5.2,  5.9,  6.4,  6.2 ],
  'BBDC4':  [4.1,  4.8,  5.2,  5.6,  5.4 ],
  'VIVT3':  [5.8,  6.1,  6.4,  6.8,  6.4 ],
  'VALE3':  [6.4,  7.2,  8.1,  7.8,  7.8 ],
};

function _gerarDadosDY(ticker, anos) {
  const base = DY_HISTORICO[ticker] ?? [5,6,7,6,6];
  const slice = base.slice(base.length - anos);
  const anoAtual = new Date().getFullYear();
  return slice.map((dy, i) => ({
    ano: String(anoAtual - (slice.length - 1 - i)),
    dy
  }));
}

function toggleGraficoBarras(index, ticker) {
  if (!_barrasState[index]) _barrasState[index] = { periodo: 5, raf: null, aberto: false };
  const state = _barrasState[index];
  state.aberto = !state.aberto;

  document.getElementById(`grafico-area-dy-${index}`).classList.toggle('aberto', state.aberto);
  document.getElementById(`btn-grafico-dy-${index}`).classList.toggle('aberto', state.aberto);

  if (state.aberto) setTimeout(() => _desenharBarras(index, state.periodo, ticker), 100);
  else if (state.raf) { cancelAnimationFrame(state.raf); state.raf = null; }
}

function setBarrasPeriodo(index, ticker, anos, el) {
  if (!_barrasState[index]) _barrasState[index] = { periodo: anos, raf: null, aberto: true };
  _barrasState[index].periodo = anos;
  el.closest('.grafico-periodo').querySelectorAll('.gpbtn').forEach(b => b.classList.remove('sel'));
  el.classList.add('sel');
  _desenharBarras(index, anos, ticker);
}

function _desenharBarras(index, anos, ticker) {
  const state = _barrasState[index];
  if (state?.raf) cancelAnimationFrame(state.raf);

  const canvas = document.getElementById(`grafico-canvas-dy-${index}`);
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  const W = canvas.offsetWidth;
  const H = 140;
  canvas.width  = W * devicePixelRatio;
  canvas.height = H * devicePixelRatio;
  ctx.scale(devicePixelRatio, devicePixelRatio);

  const dados = _gerarDadosDY(ticker, anos);
  const maxDY = Math.max(...dados.map(d => d.dy)) * 1.2;
  const media = dados.reduce((s, d) => s + d.dy, 0) / dados.length;

  const PAD   = { t: 14, b: 26, l: 10, r: 10 };
  const cW    = W - PAD.l - PAD.r;
  const cH    = H - PAD.t - PAD.b;
  const barW  = Math.min(cW / dados.length * 0.52, 38);
  const barGap = cW / dados.length;
  const toY   = v => PAD.t + cH - (v / maxDY) * cH;
  const toBarH = v => (v / maxDY) * cH;
  const mediaY = toY(media);

  let prog = 0;

  function frame() {
    ctx.clearRect(0, 0, W, H);

    /* média tracejada */
    ctx.save();
    ctx.setLineDash([5, 5]);
    ctx.beginPath(); ctx.moveTo(PAD.l, mediaY); ctx.lineTo(W - PAD.r, mediaY);
    ctx.strokeStyle = 'rgba(100,116,139,0.4)'; ctx.lineWidth = 1.2; ctx.stroke();
    ctx.restore();
    ctx.font = '8px Inter,-apple-system,sans-serif';
    ctx.fillStyle = 'rgba(100,116,139,0.5)';
    ctx.fillText(`Média  ${media.toFixed(1)}%`, PAD.l + 4, mediaY - 5);

    dados.forEach((d, i) => {
      const x     = PAD.l + i * barGap + (barGap - barW) / 2;
      const hMax  = toBarH(d.dy);
      const h     = hMax * prog;
      const y     = PAD.t + cH - h;
      const acima = d.dy >= media;

      /* gradiente verde/âmbar conforme acima ou abaixo da média */
      const grad = ctx.createLinearGradient(0, y, 0, y + h);
      if (acima) {
        grad.addColorStop(0, 'rgba(16,185,129,0.88)');
        grad.addColorStop(1, 'rgba(16,185,129,0.22)');
      } else {
        grad.addColorStop(0, 'rgba(245,158,11,0.78)');
        grad.addColorStop(1, 'rgba(245,158,11,0.18)');
      }

      /* barra com topo arredondado */
      const r = Math.min(4, barW / 2);
      ctx.beginPath();
      ctx.moveTo(x + r, y);
      ctx.lineTo(x + barW - r, y);
      ctx.quadraticCurveTo(x + barW, y, x + barW, y + r);
      ctx.lineTo(x + barW, y + h);
      ctx.lineTo(x, y + h);
      ctx.lineTo(x, y + r);
      ctx.quadraticCurveTo(x, y, x + r, y);
      ctx.closePath();
      ctx.fillStyle = grad; ctx.fill();

      /* valor DY em cima da barra (aparece no final da animação) */
      if (prog > 0.82) {
        const op = Math.min(1, (prog - 0.82) / 0.18);
        ctx.globalAlpha = op;
        ctx.font = 'bold 9px Inter,-apple-system,sans-serif';
        ctx.fillStyle = acima ? '#34d399' : '#f59e0b';
        const lbl = `${d.dy}%`;
        ctx.fillText(lbl, x + (barW - ctx.measureText(lbl).width) / 2, y - 4);
        ctx.globalAlpha = 1;
      }

      /* ano embaixo */
      ctx.font = '8px Inter,-apple-system,sans-serif';
      ctx.fillStyle = '#475569';
      const anoLbl = d.ano.slice(2); /* ex: "24" */
      ctx.fillText(anoLbl, x + (barW - ctx.measureText(anoLbl).width) / 2, H - PAD.b + 13);
    });

    prog = Math.min(1, prog + 0.042);
    if (prog < 1) state.raf = requestAnimationFrame(frame);
  }

  frame();
}

window.toggleGraficoBarras = toggleGraficoBarras;
window.setBarrasPeriodo    = setBarrasPeriodo;

/* ══════════════════════════════════════════
   MODAL PREMIUM — TOPs Dividendos
══════════════════════════════════════════ */

/* Pagamentos simulados por ticker — substituir por BRAPI Pro */
const PAGAMENTOS_DY = {
  default: [
    {data:'Mar/20',dy:2.1,val:0.24,ano:'2020'},{data:'Jun/20',dy:2.4,val:0.27,ano:'2020'},
    {data:'Set/20',dy:2.0,val:0.22,ano:'2020'},{data:'Dez/20',dy:2.2,val:0.25,ano:'2020'},
    {data:'Mar/21',dy:2.5,val:0.28,ano:'2021'},{data:'Jun/21',dy:2.8,val:0.31,ano:'2021'},
    {data:'Set/21',dy:2.6,val:0.29,ano:'2021'},{data:'Dez/21',dy:2.9,val:0.32,ano:'2021'},
    {data:'Mar/22',dy:3.1,val:0.35,ano:'2022'},{data:'Jun/22',dy:3.8,val:0.43,ano:'2022'},
    {data:'Set/22',dy:3.4,val:0.38,ano:'2022'},{data:'Dez/22',dy:3.2,val:0.36,ano:'2022'},
    {data:'Mar/23',dy:2.9,val:0.33,ano:'2023'},{data:'Jun/23',dy:3.1,val:0.35,ano:'2023'},
    {data:'Set/23',dy:2.8,val:0.31,ano:'2023'},{data:'Dez/23',dy:2.7,val:0.30,ano:'2023'},
    {data:'Mar/24',dy:3.2,val:0.36,ano:'2024'},{data:'Jun/24',dy:3.4,val:0.38,ano:'2024'},
  ]
};

const DY_ANUAL_HIST  = {default:{'2020':8.7,'2021':10.8,'2022':13.5,'2023':11.5,'2024':6.6}};
const VAL_ANUAL_HIST = {default:{'2020':0.98,'2021':1.20,'2022':1.52,'2023':1.29,'2024':0.74}};

const DY_EXTRAS = {
  'TAEE11':{yoc:'14,8%',cons:'5 anos',prox:'~Jun',freq:'~4×'},
  'EGIE3': {yoc:'9,8%', cons:'5 anos',prox:'~Ago',freq:'~2×'},
  'CMIG4': {yoc:'11,2%',cons:'4 anos',prox:'~Jul',freq:'~4×'},
  'BBAS3': {yoc:'10,1%',cons:'5 anos',prox:'~Ago',freq:'~4×'},
  'PETR4': {yoc:'16,4%',cons:'3 anos',prox:'~Set',freq:'~4×'},
  'BBSE3': {yoc:'11,6%',cons:'5 anos',prox:'~Jun',freq:'~4×'},
};

let _dy = {
  ticker:  null,
  modo:    'pct',   /* 'pct' | 'val' */
  periodo: 5,
  raf:     null,
  pagamentos: [],
  barRects:   [],
};

function _dyFiltrar(ticker, anos) {
  const base = PAGAMENTOS_DY[ticker] ?? PAGAMENTOS_DY.default;
  const anoMin = new Date().getFullYear() - anos;
  return base.filter(p => parseInt(p.ano) > anoMin);
}

function _dyBarValor(p)  { return _dy.modo === 'pct' ? p.dy : p.val; }
function _dyBarLabel(v)  { return _dy.modo === 'pct' ? `${v.toFixed(1)}%` : `R$${v.toFixed(2)}`; }
function _dyMedia(pgts)  { return pgts.reduce((s,p)=>s+_dyBarValor(p),0)/pgts.length; }

function abrirModalDY(ticker) {
  const stock = allProcessedStocks.find(s=>s.ticker===ticker);
  if (!stock) return;

  _dy.ticker  = ticker;
  _dy.modo    = 'pct';
  _dy.periodo = 5;
  _dy.pagamentos = _dyFiltrar(ticker, 5);

  /* Header */
  document.getElementById('dyModalTicker').textContent  = ticker;
  document.getElementById('dyModalCompany').textContent = stock.name;
  document.getElementById('dyModalValue').textContent   = `${(TOPS_DATA[ticker]?.dy??0).toFixed(1)}%`;

  /* Stats */
  const tops = TOPS_DATA[ticker] || {};
  const extras = DY_EXTRAS[ticker] || {yoc:'—',cons:'—',prox:'—',freq:'—'};
  document.getElementById('dyStDY').textContent   = `${(tops.dy??0).toFixed(1)}%`;
  document.getElementById('dyStMax').textContent  = `${((tops.dy??0)*1.15).toFixed(1)}%`;
  document.getElementById('dyStYOC').textContent  = extras.yoc;
  document.getElementById('dyStFreq').textContent = extras.freq;
  document.getElementById('dyIndYOC').textContent  = extras.yoc;
  document.getElementById('dyIndCons').textContent = extras.cons;
  document.getElementById('dyIndProx').textContent = extras.prox;

  /* Reset toggle e período */
  document.querySelectorAll('.dy-tmodo').forEach(b=>b.classList.remove('ativo'));
  document.getElementById('dyBtnPct').classList.add('ativo');
  document.querySelectorAll('.dy-pbtn').forEach((b,i)=>b.classList.toggle('sel',i===4));

  /* Reset indicadores */
  document.querySelectorAll('.dy-ind').forEach(el=>el.classList.remove('show'));

  /* Abre */
  document.getElementById('modalDYOverlay').classList.add('aberto');
  document.body.style.overflow='hidden';

  setTimeout(()=>{
    _dyDesenhar();
    setTimeout(()=>document.getElementById('dyInd0').classList.add('show'),700);
    setTimeout(()=>document.getElementById('dyInd1').classList.add('show'),880);
    setTimeout(()=>document.getElementById('dyInd2').classList.add('show'),1060);
  },80);
}

function fecharModalDY() {
  document.getElementById('modalDYOverlay').classList.remove('aberto');
  document.body.style.overflow='';
  if (_dy.raf){cancelAnimationFrame(_dy.raf);_dy.raf=null;}
  document.querySelectorAll('.dy-ind').forEach(el=>el.classList.remove('show'));
}

function setModoDY(modo, el) {
  _dy.modo = modo;
  document.querySelectorAll('.dy-tmodo').forEach(b=>b.classList.remove('ativo'));
  el.classList.add('ativo');
  _dyReinicia();
}

function setPeriodoDY(anos, el) {
  _dy.periodo = anos;
  _dy.pagamentos = _dyFiltrar(_dy.ticker, anos);
  document.querySelectorAll('.dy-pbtn').forEach(b=>b.classList.remove('sel'));
  el.classList.add('sel');
  _dyReinicia();
}

function _dyReinicia() {
  if (_dy.raf){cancelAnimationFrame(_dy.raf);_dy.raf=null;}
  _dyDesenhar();
}

function _dyRoundRect(ctx,x,y,w,h,r){
  if(h<=0||w<=0)return; r=Math.min(r,w/2,h/2);
  ctx.beginPath();
  ctx.moveTo(x+r,y);ctx.lineTo(x+w-r,y);
  ctx.quadraticCurveTo(x+w,y,x+w,y+r);
  ctx.lineTo(x+w,y+h);ctx.lineTo(x,y+h);ctx.lineTo(x,y+r);
  ctx.quadraticCurveTo(x,y,x+r,y);ctx.closePath();
}

function _dyDesenhar() {
  if (_dy.raf) cancelAnimationFrame(_dy.raf);
  const canvas = document.getElementById('grafDY');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  const W = canvas.offsetWidth||canvas.parentElement.offsetWidth;
  const H = canvas.offsetHeight||canvas.parentElement.offsetHeight;
  canvas.width=W*devicePixelRatio; canvas.height=H*devicePixelRatio;
  ctx.scale(devicePixelRatio,devicePixelRatio);

  const pgts  = _dy.pagamentos;
  const n     = pgts.length;
  const PAD   = {t:16,b:28,l:14,r:14};
  const cW    = W-PAD.l-PAD.r, cH=H-PAD.t-PAD.b;
  const vals  = pgts.map(p=>_dyBarValor(p));
  const maxV  = Math.max(...vals)*1.22;
  const media = _dyMedia(pgts);
  const toY   = v=>PAD.t+cH-(v/maxV)*cH;
  const toBH  = v=>(v/maxV)*cH;
  const mediaY= toY(media);
  const barW  = Math.min(cW/n*0.56,26);
  const gap   = cW/n;

  const dyAnualMap  = DY_ANUAL_HIST[_dy.ticker]  ?? DY_ANUAL_HIST.default;
  const valAnualMap = VAL_ANUAL_HIST[_dy.ticker] ?? VAL_ANUAL_HIST.default;

  _dy.barRects=[];
  let prog=0;

  function frame(){
    ctx.clearRect(0,0,W,H);

    /* grade */
    ctx.save(); ctx.strokeStyle='rgba(255,255,255,0.025)'; ctx.lineWidth=1;
    for(let i=1;i<5;i++){const y=(H/5)*i;ctx.beginPath();ctx.moveTo(0,y);ctx.lineTo(W,y);ctx.stroke();}
    ctx.restore();

    /* separadores de ano */
    let anoVisto='';
    pgts.forEach((p,i)=>{
      if(p.ano!==anoVisto){
        anoVisto=p.ano;
        const x=PAD.l+i*gap;
        ctx.save(); ctx.strokeStyle='rgba(255,255,255,0.05)'; ctx.lineWidth=1; ctx.setLineDash([2,4]);
        ctx.beginPath();ctx.moveTo(x,PAD.t);ctx.lineTo(x,H-PAD.b);ctx.stroke();ctx.restore();
        ctx.font='bold 8px Inter,-apple-system,sans-serif';
        ctx.fillStyle='rgba(255,255,255,0.1)';
        ctx.fillText(p.ano,x+2,PAD.t+9);
      }
    });

    /* média tracejada */
    ctx.save(); ctx.setLineDash([5,5]);
    ctx.beginPath();ctx.moveTo(PAD.l,mediaY);ctx.lineTo(W-PAD.r,mediaY);
    ctx.strokeStyle='rgba(100,116,139,0.4)';ctx.lineWidth=1.2;ctx.stroke();ctx.restore();
    ctx.font='8px Inter,-apple-system,sans-serif';
    ctx.fillStyle='rgba(100,116,139,0.45)';
    ctx.fillText(`Média  ${_dyBarLabel(media)}`,PAD.l+4,mediaY-5);

    /* barras */
    const ate=Math.max(1,Math.floor(prog*n));
    pgts.slice(0,ate).forEach((p,i)=>{
      const v    = _dyBarValor(p);
      const frac = Math.min(1,prog*n-i);
      const x    = PAD.l+i*gap+(gap-barW)/2;
      const h    = toBH(v)*frac;
      const y    = PAD.t+cH-h;
      const acima= v>=media;

      const grad=ctx.createLinearGradient(0,y,0,y+h);
      if(acima){grad.addColorStop(0,'rgba(16,185,129,0.9)');grad.addColorStop(1,'rgba(16,185,129,0.2)');}
      else{grad.addColorStop(0,'rgba(245,158,11,0.82)');grad.addColorStop(1,'rgba(245,158,11,0.18)');}
      _dyRoundRect(ctx,x,y,barW,h,3);
      ctx.fillStyle=grad;ctx.fill();

      _dy.barRects.push({x,y:PAD.t,w:barW,h:cH,data:p});

      if(frac>0.92){
        const op=Math.min(1,(frac-0.92)/0.08);
        ctx.globalAlpha=op;
        ctx.font='bold 7.5px Inter,-apple-system,sans-serif';
        ctx.fillStyle=acima?'#34d399':'#f59e0b';
        const lbl=_dyBarLabel(v);
        ctx.fillText(lbl,x+(barW-ctx.measureText(lbl).width)/2,y-3);
        ctx.globalAlpha=1;
      }

      ctx.font='7px Inter,-apple-system,sans-serif';
      ctx.fillStyle='rgba(71,85,105,0.7)';
      const mes=p.data.split('/')[0];
      ctx.fillText(mes,x+(barW-ctx.measureText(mes).width)/2,H-PAD.b+11);
    });

    /* pontos de total anual */
    if(prog>0.45){
      const op=Math.min(1,(prog-0.45)/0.3);
      ctx.globalAlpha=op;
      const anosVis=[...new Set(pgts.map(p=>p.ano))];
      const pontos=[];
      anosVis.forEach(ano=>{
        const pgtsAno=pgts.filter(p=>p.ano===ano);
        const ultimo=pgtsAno[pgtsAno.length-1];
        const idx=pgts.indexOf(ultimo);
        const cx=PAD.l+idx*gap+barW/2;
        const total=_dy.modo==='pct'?(dyAnualMap[ano]??0):(valAnualMap[ano]??0);
        pontos.push({cx,cy:toY(total),total});
      });
      if(pontos.length>1){
        ctx.beginPath();ctx.moveTo(pontos[0].cx,pontos[0].cy);
        pontos.slice(1).forEach(p=>ctx.lineTo(p.cx,p.cy));
        ctx.strokeStyle='rgba(59,130,246,0.3)';ctx.lineWidth=1.5;ctx.setLineDash([3,3]);ctx.stroke();ctx.setLineDash([]);
      }
      pontos.forEach(p=>{
        ctx.beginPath();ctx.arc(p.cx,p.cy,4.5,0,Math.PI*2);
        ctx.fillStyle='rgba(59,130,246,0.85)';ctx.fill();
        ctx.strokeStyle='rgba(59,130,246,0.35)';ctx.lineWidth=1.5;ctx.stroke();
        if(prog>0.75){
          ctx.font='bold 8px Inter,-apple-system,sans-serif';
          ctx.fillStyle='rgba(59,130,246,0.75)';
          const lbl=_dyBarLabel(p.total);
          ctx.fillText(lbl,p.cx-ctx.measureText(lbl).width/2,p.cy-9);
        }
      });
      ctx.globalAlpha=1;
    }

    prog=Math.min(1,prog+0.02);
    _dy.raf=requestAnimationFrame(frame);
  }
  frame();

  /* hover / touch */
  function handlePos(mx,my){
    for(const r of _dy.barRects){
      if(mx>=r.x&&mx<=r.x+r.w&&my>=r.y&&my<=r.y+r.h){
        document.getElementById('dyTtVal').textContent=`${r.data.dy}% · R$${r.data.val.toFixed(2)}/cota`;
        document.getElementById('dyTtData').textContent=r.data.data;
        document.getElementById('dyTooltip').classList.add('visible');
        return;
      }
    }
    document.getElementById('dyTooltip').classList.remove('visible');
  }
  canvas.onmousemove=e=>{const rect=canvas.getBoundingClientRect();handlePos(e.clientX-rect.left,e.clientY-rect.top);};
  canvas.onmouseleave=()=>document.getElementById('dyTooltip').classList.remove('visible');
  canvas.ontouchmove=e=>{e.preventDefault();const rect=canvas.getBoundingClientRect();handlePos(e.touches[0].clientX-rect.left,e.touches[0].clientY-rect.top);};
  canvas.ontouchend=()=>document.getElementById('dyTooltip').classList.remove('visible');
}

window.abrirModalDY  = abrirModalDY;
window.fecharModalDY = fecharModalDY;
window.setModoDY     = setModoDY;
window.setPeriodoDY  = setPeriodoDY;

/* ── START ── */
buildDropdowns();
applyConfigLabels();
loadApp();
console.log('🚀 Auricchio inicializado!');

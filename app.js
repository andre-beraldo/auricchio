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
  CACHE_TIME: 4 * 60 * 60 * 1000, // 30 minutos
  REQUEST_DELAY: 400, // 350ms entre requests
  BATCH_SIZE: 10 // Número de ações por request
};

/* ================= ESTADO DA APLICAÇÃO ================= */
let currentDiscountFilter = 'light'; // Filtro ativo (light, moderate, strong)

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
  { ticker: 'RAIZ4', name: 'Raízen', sector: 'Combustíveis', category: 'ciclica' },

    // ===== ADICIONANDO MAIS 130 AÇÕES =====
  
  // Bancos e Financeiro (adicional)
  { ticker: 'BMGB4', name: 'Banco BMG', sector: 'Bancos', category: 'perene' },
  { ticker: 'PINE4', name: 'Pine', sector: 'Bancos', category: 'perene' },
  { ticker: 'BPAN4', name: 'Banco Pan', sector: 'Bancos', category: 'perene' },
  { ticker: 'CIEL3', name: 'Cielo', sector: 'Serviços Financeiros', category: 'perene' },
  
  // Energia (adicional)
  { ticker: 'ENBR3', name: 'Energias BR', sector: 'Energia', category: 'perene' },
  { ticker: 'LIGT3', name: 'Light', sector: 'Energia', category: 'perene' },
  { ticker: 'NEOE3', name: 'Neoenergia', sector: 'Energia', category: 'perene' },
  { ticker: 'AESB3', name: 'AES Brasil', sector: 'Energia', category: 'perene' },
  { ticker: 'CPFE3', name: 'CPFL Energia', sector: 'Energia', category: 'perene' },
  
  // Petróleo e Gás (adicional)
  { ticker: 'RRRP3', name: '3R Petroleum', sector: 'Petróleo', category: 'ciclica' },
  
  // Mineração (adicional)
  { ticker: 'CMIN3', name: 'CSN Mineração', sector: 'Mineração', category: 'ciclica' },
  
  // Siderurgia (adicional)
  { ticker: 'GOAU4', name: 'Metalúrgica Gerdau', sector: 'Siderurgia', category: 'ciclica' },
  
  // Alimentos (adicional)
  { ticker: 'MDIA3', name: 'M.Dias Branco', sector: 'Alimentos', category: 'perene' },
  { ticker: 'SMTO3', name: 'São Martinho', sector: 'Agro', category: 'ciclica' },
  { ticker: 'CAML3', name: 'Camil', sector: 'Alimentos', category: 'perene' },
  { ticker: 'JALL3', name: 'Jalles Machado', sector: 'Agro', category: 'ciclica' },
  
  // Varejo (adicional)
  { ticker: 'VIIA3', name: 'Via', sector: 'Varejo', category: 'ciclica' },
  { ticker: 'PETZ3', name: 'Petz', sector: 'Varejo', category: 'perene' },
  { ticker: 'GUAR3', name: 'Guararapes', sector: 'Varejo', category: 'perene' },
  { ticker: 'CEAB3', name: 'C&A', sector: 'Varejo', category: 'perene' },
  { ticker: 'BHIA3', name: 'Casas Bahia', sector: 'Varejo', category: 'ciclica' },
  { ticker: 'ALPA4', name: 'Alpargatas', sector: 'Calçados', category: 'perene' },
  { ticker: 'VULC3', name: 'Vulcabras', sector: 'Calçados', category: 'perene' },
  { ticker: 'GRND3', name: 'Grendene', sector: 'Calçados', category: 'perene' },
  
  // Saúde (adicional)
  { ticker: 'HAPV3', name: 'Hapvida', sector: 'Saúde', category: 'perene' },
  { ticker: 'GNDI3', name: 'NotreDame', sector: 'Saúde', category: 'perene' },
  { ticker: 'ONCO3', name: 'Oncoclínicas', sector: 'Saúde', category: 'perene' },
  { ticker: 'ODPV3', name: 'Odontoprev', sector: 'Saúde', category: 'perene' },
  { ticker: 'MATD3', name: 'Mater Dei', sector: 'Saúde', category: 'perene' },
  { ticker: 'DASA3', name: 'Dasa', sector: 'Saúde', category: 'perene' },
  { ticker: 'BLAU3', name: 'Blau Farmacêutica', sector: 'Saúde', category: 'perene' },
  
  // Indústria (adicional)
  { ticker: 'RAPT4', name: 'Randon', sector: 'Indústria', category: 'ciclica' },
  { ticker: 'POMO4', name: 'Marcopolo', sector: 'Indústria', category: 'ciclica' },
  { ticker: 'TUPY3', name: 'Tupy', sector: 'Indústria', category: 'ciclica' },
  { ticker: 'KEPL3', name: 'Kepler Weber', sector: 'Indústria', category: 'ciclica' },
  { ticker: 'FRAS3', name: 'Fras-le', sector: 'Indústria', category: 'ciclica' },
  { ticker: 'LEVE3', name: 'Mahle Metal Leve', sector: 'Indústria', category: 'ciclica' },
  { ticker: 'MYPK3', name: 'Iochpe Maxion', sector: 'Indústria', category: 'ciclica' },
  
  // Tecnologia (adicional)
  { ticker: 'POSI3', name: 'Positivo', sector: 'Tecnologia', category: 'ciclica' },
  { ticker: 'IFCM3', name: 'Infracommerce', sector: 'Tecnologia', category: 'ciclica' },
  { ticker: 'SQIA3', name: 'Sinqia', sector: 'Tecnologia', category: 'perene' },
  { ticker: 'MEAL3', name: 'IMC', sector: 'Tecnologia', category: 'ciclica' },
  
  // Shoppings (adicional)
  { ticker: 'BRML3', name: 'BR Malls', sector: 'Shoppings', category: 'perene' },
  
  // Logística e Concessões (adicional)
  { ticker: 'EQPA3', name: 'Ecorodovias', sector: 'Concessões', category: 'perene' },
  { ticker: 'SIMH3', name: 'Simpar', sector: 'Logística', category: 'ciclica' },
  { ticker: 'STBP3', name: 'Santos Brasil', sector: 'Logística', category: 'ciclica' },
  { ticker: 'LOGN3', name: 'Log-In', sector: 'Logística', category: 'ciclica' },
  { ticker: 'TGMA3', name: 'Tegma', sector: 'Logística', category: 'ciclica' },
  
  // Saneamento (adicional)
  { ticker: 'SAPR11', name: 'Sanepar', sector: 'Saneamento', category: 'perene' },
  { ticker: 'CSMG3', name: 'Copasa', sector: 'Saneamento', category: 'perene' },
  
  // Construção Civil e Imobiliário
  { ticker: 'EZTC3', name: 'EZ Tec', sector: 'Construção Civil', category: 'ciclica' },
  { ticker: 'JHSF3', name: 'JHSF', sector: 'Construção Civil', category: 'ciclica' },
  { ticker: 'LAVV3', name: 'Lavvi', sector: 'Construção Civil', category: 'ciclica' },
  { ticker: 'EVEN3', name: 'Even', sector: 'Construção Civil', category: 'ciclica' },
  { ticker: 'HBOR3', name: 'HBOR', sector: 'Construção Civil', category: 'ciclica' },
  { ticker: 'TEND3', name: 'Tenda', sector: 'Construção Civil', category: 'ciclica' },
  { ticker: 'DIRR3', name: 'Direcional', sector: 'Construção Civil', category: 'ciclica' },
  { ticker: 'PLPL3', name: 'Plano&Plano', sector: 'Construção Civil', category: 'ciclica' },
  { ticker: 'ROMI3', name: 'Romi', sector: 'Indústria', category: 'ciclica' },
  
  // Educação (adicional)
  { ticker: 'ANIM3', name: 'Ânima', sector: 'Educação', category: 'perene' },
  { ticker: 'SEER3', name: 'Ser Educacional', sector: 'Educação', category: 'perene' },
  
  // Seguros (adicional)
  { ticker: 'WIZC3', name: 'Wiz Co', sector: 'Seguros', category: 'perene' },
  { ticker: 'CXSE3', name: 'Caixa Seguridade', sector: 'Seguros', category: 'perene' },
  
  // Papel e Celulose (adicional)
  { ticker: 'MELK3', name: 'Melhor SP', sector: 'Papel', category: 'ciclica' },
  
  // Químico e Petroquímico
  { ticker: 'UNIP6', name: 'Unipar', sector: 'Químico', category: 'ciclica' },
  { ticker: 'BRKM5', name: 'Braskem', sector: 'Petroquímico', category: 'ciclica' },
  
  // Serviços
  { ticker: 'MOVI3', name: 'Movida', sector: 'Aluguel de Veículos', category: 'ciclica' },
  { ticker: 'LOCA3', name: 'Locamerica', sector: 'Aluguel de Veículos', category: 'ciclica' },
  { ticker: 'CASH3', name: 'Méliuz', sector: 'Fintech', category: 'ciclica' },
  
  // Turismo e Lazer
  { ticker: 'CVCB3', name: 'CVC', sector: 'Turismo', category: 'ciclica' },
  { ticker: 'GOLL4', name: 'Gol', sector: 'Aéreo', category: 'ciclica' },
  { ticker: 'AZUL4', name: 'Azul', sector: 'Aéreo', category: 'ciclica' },
  
  // Mídia e Comunicação
  { ticker: 'OIBR3', name: 'Oi', sector: 'Telecom', category: 'ciclica' },
  
  // Holdings e Participações
  { ticker: 'BRAP4', name: 'Bradespar', sector: 'Holdings', category: 'ciclica' },
  { ticker: 'ITSA4', name: 'Itaúsa', sector: 'Holdings', category: 'perene' },
  
  // Energia Renovável
  { ticker: 'MEGA3', name: 'Omega Energia', sector: 'Energia', category: 'perene' },
  
  // Farmacêutico
  { ticker: 'PNVL3', name: 'Dimed', sector: 'Farmacêutico', category: 'perene' },
  
  // Outros setores importantes
  { ticker: 'BAHI3', name: 'Bahema', sector: 'Holdings', category: 'perene' },
  { ticker: 'AZZA3', name: 'Azzas 2154', sector: 'Varejo', category: 'perene' },
  { ticker: 'PGMN3', name: 'Pague Menos', sector: 'Farmacêutico', category: 'perene' },
  { ticker: 'TFCO4', name: 'Track & Field', sector: 'Varejo', category: 'perene' },
  { ticker: 'AGRO3', name: 'BrasilAgro', sector: 'Agro', category: 'ciclica' },
  { ticker: 'ORVR3', name: 'Orizon', sector: 'Saneamento', category: 'perene' },
  { ticker: 'PARD3', name: 'Ihpardini', sector: 'Saúde', category: 'perene' },
  { ticker: 'WEST3', name: 'Westwing', sector: 'Varejo', category: 'ciclica' },
  { ticker: 'AMAR3', name: 'Marisa', sector: 'Varejo', category: 'ciclica' },
  { ticker: 'RLOG3', name: 'Cosan Log', sector: 'Logística', category: 'ciclica' },
  { ticker: 'TECN3', name: 'Technos', sector: 'Varejo', category: 'ciclica' },
  { ticker: 'MTRE3', name: 'Mitre Realty', sector: 'Construção Civil', category: 'ciclica' },
  { ticker: 'SYNE3', name: 'Synergy', sector: 'Farmacêutico', category: 'perene' },
  { ticker: 'VIVR3', name: 'Viver', sector: 'Construção Civil', category: 'ciclica' },
  { ticker: 'ATOM3', name: 'Atompar', sector: 'Holdings', category: 'perene' },
  { ticker: 'DMVF3', name: 'D1000 Varejo', sector: 'Varejo', category: 'ciclica' },
  { ticker: 'FESA4', name: 'Ferbasa', sector: 'Mineração', category: 'ciclica' },
  { ticker: 'INTB3', name: 'Intelbras', sector: 'Tecnologia', category: 'perene' },
  { ticker: 'MBLY3', name: 'Mobly', sector: 'Varejo', category: 'ciclica' },
  { ticker: 'SMFT3', name: 'Smart Fit', sector: 'Serviços', category: 'perene' }
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
  if (discount >= 16.6) return 'border-red-500';      // Desconto Forte = Vermelho
  if (discount >= 8.3) return 'border-yellow-500';    // Moderado = Amarelo
  if (discount > 0) return 'border-blue-500';         // Leve = Azul
  return 'border-gray-400';                            // Sem desconto = Cinza
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


/* ================= ANÁLISE DE SAÚDE FINANCEIRA ================= */

function analyzeHealth(fundamentals) {
  if (!fundamentals) {
    return {
      status: 'risk',
      statusText: '❌ Dados indisponíveis',
      items: []
    };
  }

  const items = [];
  let healthScore = 0;

  // Margem de lucro
  const profitMargin = fundamentals.profitMargin;
  if (profitMargin !== undefined && profitMargin !== null) {
    items.push({
      label: 'Margem de Lucro',
      value: `${(profitMargin * 100).toFixed(1)}%`,
      status: profitMargin > 0 ? 'positive' : 'negative'
    });
    if (profitMargin > 0) healthScore++;
  }

  // Dívida/Patrimônio
  const debtToEquity = fundamentals.debtToEquity;
  if (debtToEquity !== undefined && debtToEquity !== null) {
    items.push({
      label: 'Dívida/Patrimônio',
      value: debtToEquity.toFixed(2),
      status: debtToEquity < 2 ? 'positive' : 'negative'
    });
    if (debtToEquity < 2) healthScore++;
  }

  // ROE (Return on Equity)
  const roe = fundamentals.returnOnEquity;
  if (roe !== undefined && roe !== null) {
    items.push({
      label: 'ROE',
      value: `${(roe * 100).toFixed(1)}%`,
      status: roe > 0.10 ? 'positive' : roe > 0 ? 'warning' : 'negative'
    });
    if (roe > 0.10) healthScore++;
  }

  // P/L (Price to Earnings)
  const pe = fundamentals.priceEarnings;
  if (pe !== undefined && pe !== null && pe > 0) {
    items.push({
      label: 'P/L',
      value: pe.toFixed(2),
      status: pe < 20 ? 'positive' : pe < 30 ? 'warning' : 'negative'
    });
  }

  
  // Determina status geral
let status, statusText;

if (items.length === 0) {
  // Sem dados
  status = 'risk';
  statusText = '❌ Dados indisponíveis';
} else if (healthScore >= 2) {
  // 2+ indicadores positivos
  status = 'healthy';
  statusText = '✅ Empresa Saudável';
} else if (healthScore === 1 && items.length === 1) {
  // Só 1 dado disponível mas é positivo
  status = 'attention';
  statusText = '⚠️ Poucos dados - Verifique fundamentos';
} else if (healthScore >= 1) {
  // Pelo menos 1 positivo
  status = 'attention';
  statusText = '⚠️ Atenção - Análise limitada';
} else {
  // Todos negativos
  status = 'risk';
  statusText = '❌ Alto Risco - Empresa problemática';
}
return { status, statusText, items };  // ← ADICIONA ESTA LINHA
}



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

async function fetchAllStocks() {
  // Tenta pegar do cache primeiro
  const cached = getCache();
  if (cached) {
    console.log('📦 Dados carregados do cache (válido por 4h)');
    return cached;
  }

  console.log('🌐 Buscando dados da API em lotes...');
  const data = [];
  
  // Divide em lotes de 10
  for (let i = 0; i < stocks.length; i += CONFIG.BATCH_SIZE) {
    const batch = stocks.slice(i, i + CONFIG.BATCH_SIZE);
    const tickers = batch.map(s => s.ticker).join(',');
    
    try {
      const url = `${CONFIG.API_BASE}/${tickers}?token=${CONFIG.API_KEY}&fundamental=true`;
      const response = await fetch(url);
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }
      
      const json = await response.json();
      data.push(...json.results);
      
      console.log(`✓ Lote ${Math.floor(i/CONFIG.BATCH_SIZE) + 1}/${Math.ceil(stocks.length/CONFIG.BATCH_SIZE)} carregado`);
      
      await sleep(CONFIG.REQUEST_DELAY);
    } catch (error) {
      console.warn(`⚠️ Erro no lote ${i}-${i+CONFIG.BATCH_SIZE}:`, error.message);
    }
  }
  
  setCache(data);
  console.log(`✅ ${data.length} ações salvas no cache (válido por 4h)`);
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

  app.innerHTML = stockList.map((stock, index) => {
    const discountLevel = getDiscountLevel(stock.discount);
    const badgeText = getBadgeText(discountLevel);
    const borderClass = getBorderClass(stock.discount);
    const discountColor = discountLevel === 'light' ? '#3b82f6' : 
                         discountLevel === 'moderate' ? '#f59e0b' : 
                         discountLevel === 'strong' ? '#dc2626' : '#9ca3af';
    
    const health = analyzeHealth(stock.fundamentals);
    
    return `
      <div class="stock-card ${borderClass}" data-index="${index}">
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
        ${stock.change !== undefined ? `
            <div class="daily-change ${stock.change >= 0 ? 'positive' : 'negative'}">
                ${stock.change >= 0 ? '▲' : '▼'} ${Math.abs(stock.change).toFixed(2)}% hoje
            </div>
        ` : ''}
        
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
        
        <div class="expand-arrow" onclick="toggleHealth(${index})">
          <span class="arrow-icon">▼</span>
        </div>
        
        <div class="health-section" id="health-${index}">
          <div class="health-content">
            <div class="health-title">📊 Saúde Financeira</div>
            ${health.items.map(item => `
              <div class="health-item">
                <span class="health-label">${item.label}</span>
                <span class="health-value ${item.status}">${item.value}</span>
              </div>
            `).join('')}
            ${health.items.length === 0 ? `
              <div class="health-item">
                <span class="health-label">Dados não disponíveis</span>
              </div>
            ` : ''}
            <div class="health-status ${health.status}">
              ${health.statusText}
            </div>
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
    const normalizedSearch = searchTerm.toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, ''); // Remove acentos
    
    filtered = filtered.filter(stock => {
      const ticker = stock.ticker.toLowerCase();
      const name = stock.name.toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '');
      const sector = stock.sector.toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '');
      const aliases = (stock.aliases || []).join(' ').toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '');
      
      return ticker.includes(normalizedSearch) ||
             name.includes(normalizedSearch) ||
             sector.includes(normalizedSearch) ||
             aliases.includes(normalizedSearch);
    });
    
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
        discount: discount,
        change: apiStock.regularMarketChange || 0,
        fundamentals: apiStock
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



/* ================= EXPANSÃO DE CARDS ================= */

function toggleHealth(index) {
  const healthSection = document.getElementById(`health-${index}`);
  const arrow = document.querySelector(`[data-index="${index}"] .expand-arrow`);
  const arrowIcon = arrow.querySelector('.arrow-icon');
  
  if (healthSection.classList.contains('expanded')) {
    healthSection.classList.remove('expanded');
    arrow.classList.remove('expanded');
    arrowIcon.textContent = '▼';
  } else {
    healthSection.classList.add('expanded');
    arrow.classList.add('expanded');
    arrowIcon.textContent = '▲';
  }
}

// Torna a função global
window.toggleHealth = toggleHealth;




/* ================= INICIALIZAÇÃO ================= */

// Carrega app ao iniciar
loadApp();

console.log('🚀 Auricchio inicializado com sucesso!');

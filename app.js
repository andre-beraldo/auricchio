/* ========================================
   AUTO-LIMPEZA DO SERVICE WORKER ANTIGO
======================================== */
(async function autoCleanup() {
  const SW_VERSION = 'v2';
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
      const keysToKeep = ['stocksCache_v2_clean'];
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
  CACHE_KEY:     'stocksCache_v2_clean',
  CACHE_TIME:    4 * 60 * 60 * 1000,
  REQUEST_DELAY: 400,
  BATCH_SIZE:    10
};

/* ================= ESTADO DA APLICAÇÃO ================= */
let currentDiscountFilter = 'light';
let currentSectorFilter   = 'Todos';
let allProcessedStocks    = [];

// Setor selecionado por botão (mantido independente por nível)
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

/* ================= AÇÕES (164 VALIDADAS) ================= */
const stocks = [
  // ========== BANCOS ==========
  { ticker: 'ITUB4',  name: 'Itaú',               sector: 'Bancos',              category: 'perene'  },
  { ticker: 'ITUB3',  name: 'Itaú PN',             sector: 'Bancos',              category: 'perene'  },
  { ticker: 'BBDC4',  name: 'Bradesco',             sector: 'Bancos',              category: 'perene'  },
  { ticker: 'BBDC3',  name: 'Bradesco PN',          sector: 'Bancos',              category: 'perene'  },
  { ticker: 'BBAS3',  name: 'Banco do Brasil',      sector: 'Bancos',              category: 'perene'  },
  { ticker: 'SANB11', name: 'Santander',            sector: 'Bancos',              category: 'perene'  },
  { ticker: 'SANB3',  name: 'Santander Units',      sector: 'Bancos',              category: 'perene'  },
  { ticker: 'BPAC11', name: 'BTG Pactual',          sector: 'Bancos',              category: 'perene'  },
  { ticker: 'BRSR6',  name: 'Banrisul',             sector: 'Bancos',              category: 'perene'  },
  { ticker: 'BMGB4',  name: 'Banco BMG',            sector: 'Bancos',              category: 'perene'  },
  { ticker: 'PINE4',  name: 'Pine',                 sector: 'Bancos',              category: 'perene'  },
  { ticker: 'BAZA3',  name: 'Banco Amazônia',       sector: 'Bancos',              category: 'perene'  },
  { ticker: 'BMOB3',  name: 'Bemobi',               sector: 'Fintech',             category: 'ciclica' },
  { ticker: 'NORD3',  name: 'Banco Nordeste',       sector: 'Bancos',              category: 'perene'  },

  // ========== ENERGIA ==========
  { ticker: 'TAEE11', name: 'Taesa',               sector: 'Energia',             category: 'perene'  },
  { ticker: 'TAEE3',  name: 'Taesa ON',             sector: 'Energia',             category: 'perene'  },
  { ticker: 'TAEE4',  name: 'Taesa PN',             sector: 'Energia',             category: 'perene'  },
  { ticker: 'EGIE3',  name: 'Engie',                sector: 'Energia',             category: 'perene'  },
  { ticker: 'CPLE3',  name: 'Copel',                sector: 'Energia',             category: 'perene'  },
  { ticker: 'CMIG4',  name: 'Cemig',                sector: 'Energia',             category: 'perene'  },
  { ticker: 'CMIG3',  name: 'Cemig ON',             sector: 'Energia',             category: 'perene'  },
  { ticker: 'EQTL3',  name: 'Equatorial',           sector: 'Energia',             category: 'perene'  },
  { ticker: 'ENEV3',  name: 'Eneva',                sector: 'Energia',             category: 'ciclica' },
  { ticker: 'CSAN3',  name: 'Cosan',                sector: 'Energia/Combustíveis',category: 'ciclica' },
  { ticker: 'LIGT3',  name: 'Light',                sector: 'Energia',             category: 'perene'  },
  { ticker: 'NEOE3',  name: 'Neoenergia',           sector: 'Energia',             category: 'perene'  },
  { ticker: 'CPFE3',  name: 'CPFL Energia',         sector: 'Energia',             category: 'perene'  },
  { ticker: 'COCE5',  name: 'Coelce',               sector: 'Energia',             category: 'perene'  },
  { ticker: 'CLSC4',  name: 'Celesc',               sector: 'Energia',             category: 'perene'  },
  { ticker: 'GEPA4',  name: 'GER Paranap',          sector: 'Energia',             category: 'perene'  },
  { ticker: 'EMAE4',  name: 'Emae',                 sector: 'Energia',             category: 'perene'  },

  // ========== PETRÓLEO, GÁS E MINERAÇÃO ==========
  { ticker: 'PETR4',  name: 'Petrobras',            sector: 'Petróleo',            category: 'ciclica' },
  { ticker: 'PETR3',  name: 'Petrobras ON',         sector: 'Petróleo',            category: 'ciclica' },
  { ticker: 'PRIO3',  name: 'Prio',                 sector: 'Petróleo',            category: 'ciclica' },
  { ticker: 'RECV3',  name: 'PetroReconcavo',       sector: 'Petróleo',            category: 'ciclica' },
  { ticker: 'VALE3',  name: 'Vale',                 sector: 'Mineração',           category: 'ciclica' },
  { ticker: 'CMIN3',  name: 'CSN Mineração',        sector: 'Mineração',           category: 'ciclica' },
  { ticker: 'FESA4',  name: 'Ferbasa',              sector: 'Mineração',           category: 'ciclica' },
  { ticker: 'GGBR3',  name: 'Gerdau ON',            sector: 'Siderurgia',          category: 'ciclica' },

  // ========== SIDERURGIA E METALURGIA ==========
  { ticker: 'GGBR4',  name: 'Gerdau',               sector: 'Siderurgia',          category: 'ciclica' },
  { ticker: 'CSNA3',  name: 'CSN',                  sector: 'Siderurgia',          category: 'ciclica' },
  { ticker: 'USIM5',  name: 'Usiminas',             sector: 'Siderurgia',          category: 'ciclica' },
  { ticker: 'USIM3',  name: 'Usiminas ON',          sector: 'Siderurgia',          category: 'ciclica' },
  { ticker: 'GOAU4',  name: 'Metalúrgica Gerdau',   sector: 'Siderurgia',          category: 'ciclica' },
  { ticker: 'GOAU3',  name: 'Met Gerdau ON',        sector: 'Siderurgia',          category: 'ciclica' },
  { ticker: 'PATI4',  name: 'Panatlantica',         sector: 'Siderurgia',          category: 'ciclica' },

  // ========== ALIMENTOS E BEBIDAS ==========
  { ticker: 'ABEV3',  name: 'Ambev',                sector: 'Bebidas',             category: 'perene'  },
  { ticker: 'BEEF3',  name: 'Minerva',              sector: 'Alimentos',           category: 'ciclica' },
  { ticker: 'MDIA3',  name: 'M.Dias Branco',        sector: 'Alimentos',           category: 'perene'  },
  { ticker: 'SMTO3',  name: 'São Martinho',         sector: 'Agro',               category: 'ciclica' },
  { ticker: 'CAML3',  name: 'Camil',                sector: 'Alimentos',           category: 'perene'  },
  { ticker: 'JALL3',  name: 'Jalles Machado',       sector: 'Agro',               category: 'ciclica' },
  { ticker: 'BAUH4',  name: 'Excelsior',            sector: 'Alimentos',           category: 'ciclica' },
  { ticker: 'SOJA3',  name: 'Boa Safra',            sector: 'Agro',               category: 'ciclica' },
  { ticker: 'ALLD3',  name: 'Allopar',              sector: 'Alimentos',           category: 'ciclica' },

  // ========== VAREJO E CALÇADOS ==========
  { ticker: 'LREN3',  name: 'Renner',               sector: 'Varejo',              category: 'perene'  },
  { ticker: 'MGLU3',  name: 'Magazine Luiza',       sector: 'Varejo',              category: 'ciclica' },
  { ticker: 'ASAI3',  name: 'Assaí',                sector: 'Varejo',              category: 'perene'  },
  { ticker: 'PCAR3',  name: 'GPA',                  sector: 'Varejo',              category: 'ciclica' },
  { ticker: 'GUAR3',  name: 'Guararapes',           sector: 'Varejo',              category: 'perene'  },
  { ticker: 'CEAB3',  name: 'C&A',                  sector: 'Varejo',              category: 'perene'  },
  { ticker: 'BHIA3',  name: 'Casas Bahia',          sector: 'Varejo',              category: 'ciclica' },
  { ticker: 'ALPA4',  name: 'Alpargatas',           sector: 'Calçados',            category: 'perene'  },
  { ticker: 'VULC3',  name: 'Vulcabras',            sector: 'Calçados',            category: 'perene'  },
  { ticker: 'GRND3',  name: 'Grendene',             sector: 'Calçados',            category: 'perene'  },
  { ticker: 'AZZA3',  name: 'Azzas 2154',           sector: 'Varejo',              category: 'perene'  },
  { ticker: 'PGMN3',  name: 'Pague Menos',          sector: 'Farmacêutico',        category: 'perene'  },
  { ticker: 'TFCO4',  name: 'Track & Field',        sector: 'Varejo',              category: 'perene'  },
  { ticker: 'WEST3',  name: 'Westwing',             sector: 'Varejo',              category: 'ciclica' },
  { ticker: 'AMAR3',  name: 'Marisa',               sector: 'Varejo',              category: 'ciclica' },
  { ticker: 'TECN3',  name: 'Technos',              sector: 'Varejo',              category: 'ciclica' },
  { ticker: 'DMVF3',  name: 'D1000 Varejo',         sector: 'Varejo',              category: 'ciclica' },
  { ticker: 'VIVA3',  name: 'Vivara',               sector: 'Varejo',              category: 'perene'  },
  { ticker: 'LJQQ3',  name: 'Lojas Quero-Quero',    sector: 'Varejo',              category: 'perene'  },
  { ticker: 'LUPA3',  name: 'Lupatech',             sector: 'Varejo',              category: 'ciclica' },
  { ticker: 'MLAS3',  name: 'Multilaser',           sector: 'Varejo',              category: 'ciclica' },
  { ticker: 'SLED4',  name: 'Saraiva',              sector: 'Varejo',              category: 'ciclica' },

  // ========== SAÚDE E FARMACÊUTICO ==========
  { ticker: 'RADL3',  name: 'Raia Drogasil',        sector: 'Saúde',               category: 'perene'  },
  { ticker: 'FLRY3',  name: 'Fleury',               sector: 'Saúde',               category: 'perene'  },
  { ticker: 'HYPE3',  name: 'Hypera',               sector: 'Saúde',               category: 'perene'  },
  { ticker: 'QUAL3',  name: 'Qualicorp',            sector: 'Saúde',               category: 'perene'  },
  { ticker: 'HAPV3',  name: 'Hapvida',              sector: 'Saúde',               category: 'perene'  },
  { ticker: 'ONCO3',  name: 'Oncoclínicas',         sector: 'Saúde',               category: 'perene'  },
  { ticker: 'ODPV3',  name: 'Odontoprev',           sector: 'Saúde',               category: 'perene'  },
  { ticker: 'MATD3',  name: 'Mater Dei',            sector: 'Saúde',               category: 'perene'  },
  { ticker: 'DASA3',  name: 'Dasa',                 sector: 'Saúde',               category: 'perene'  },
  { ticker: 'BLAU3',  name: 'Blau Farmacêutica',    sector: 'Saúde',               category: 'perene'  },
  { ticker: 'PNVL3',  name: 'Dimed',                sector: 'Farmacêutico',        category: 'perene'  },
  { ticker: 'SYNE3',  name: 'Synergy',              sector: 'Farmacêutico',        category: 'perene'  },

  // ========== INDÚSTRIA ==========
  { ticker: 'WEGE3',  name: 'WEG',                  sector: 'Indústria',           category: 'perene'  },
  { ticker: 'RAPT4',  name: 'Randon',               sector: 'Indústria',           category: 'ciclica' },
  { ticker: 'RAPT3',  name: 'Randon ON',            sector: 'Indústria',           category: 'ciclica' },
  { ticker: 'POMO4',  name: 'Marcopolo',            sector: 'Indústria',           category: 'ciclica' },
  { ticker: 'POMO3',  name: 'Marcopolo ON',         sector: 'Indústria',           category: 'ciclica' },
  { ticker: 'TUPY3',  name: 'Tupy',                 sector: 'Indústria',           category: 'ciclica' },
  { ticker: 'KEPL3',  name: 'Kepler Weber',         sector: 'Indústria',           category: 'ciclica' },
  { ticker: 'FRAS3',  name: 'Fras-le',              sector: 'Indústria',           category: 'ciclica' },
  { ticker: 'LEVE3',  name: 'Mahle Metal Leve',     sector: 'Indústria',           category: 'ciclica' },
  { ticker: 'MYPK3',  name: 'Iochpe Maxion',        sector: 'Indústria',           category: 'ciclica' },
  { ticker: 'ROMI3',  name: 'Romi',                 sector: 'Indústria',           category: 'ciclica' },
  { ticker: 'INTB3',  name: 'Intelbras',            sector: 'Tecnologia',          category: 'perene'  },
  { ticker: 'FHER3',  name: 'Fertilizantes Heringer', sector: 'Indústria',         category: 'ciclica' },
  { ticker: 'SHUL4',  name: 'Schulz',               sector: 'Indústria',           category: 'ciclica' },
  { ticker: 'MTSA4',  name: 'Metisa',               sector: 'Indústria',           category: 'ciclica' },
  { ticker: 'ESTR4',  name: 'Estrela',              sector: 'Indústria',           category: 'ciclica' },
  { ticker: 'PMAM3',  name: 'Paraná',               sector: 'Indústria',           category: 'ciclica' },

  // ========== TECNOLOGIA ==========
  { ticker: 'TOTS3',  name: 'Totvs',                sector: 'Tecnologia',          category: 'perene'  },
  { ticker: 'LWSA3',  name: 'Locaweb',              sector: 'Tecnologia',          category: 'ciclica' },
  { ticker: 'POSI3',  name: 'Positivo',             sector: 'Tecnologia',          category: 'ciclica' },
  { ticker: 'IFCM3',  name: 'Infracommerce',        sector: 'Tecnologia',          category: 'ciclica' },
  { ticker: 'MEAL3',  name: 'IMC',                  sector: 'Tecnologia',          category: 'ciclica' },
  { ticker: 'DESK3',  name: 'Desktop',              sector: 'Tecnologia',          category: 'ciclica' },

  // ========== SHOPPINGS E IMOBILIÁRIO ==========
  { ticker: 'MULT3',  name: 'Multiplan',            sector: 'Shoppings',           category: 'perene'  },
  { ticker: 'IGTI11', name: 'Iguatemi',             sector: 'Shoppings',           category: 'perene'  },
  { ticker: 'IGTI3',  name: 'Iguatemi ON',          sector: 'Shoppings',           category: 'perene'  },
  { ticker: 'ALOS3',  name: 'Allos',                sector: 'Shoppings',           category: 'perene'  },
  { ticker: 'SGPS3',  name: 'Springs',              sector: 'Imobiliário',         category: 'ciclica' },
  { ticker: 'GSHP3',  name: 'General Shopping',     sector: 'Shoppings',           category: 'perene'  },

  // ========== LOGÍSTICA E CONCESSÕES ==========
  { ticker: 'RAIL3',  name: 'Rumo',                 sector: 'Logística',           category: 'ciclica' },
  { ticker: 'EQPA3',  name: 'Ecorodovias',          sector: 'Concessões',          category: 'perene'  },
  { ticker: 'ECOR3',  name: 'Ecorodovias ON',       sector: 'Concessões',          category: 'perene'  },
  { ticker: 'SIMH3',  name: 'Simpar',               sector: 'Logística',           category: 'ciclica' },
  { ticker: 'LOGN3',  name: 'Log-In',               sector: 'Logística',           category: 'ciclica' },
  { ticker: 'TGMA3',  name: 'Tegma',                sector: 'Logística',           category: 'ciclica' },
  { ticker: 'ODER4',  name: 'Odebrecht',            sector: 'Concessões',          category: 'ciclica' },
  { ticker: 'PRNR3',  name: 'Prumo',                sector: 'Logística',           category: 'ciclica' },

  // ========== SANEAMENTO ==========
  { ticker: 'SBSP3',  name: 'Sabesp',               sector: 'Saneamento',          category: 'perene'  },
  { ticker: 'SAPR11', name: 'Sanepar',              sector: 'Saneamento',          category: 'perene'  },
  { ticker: 'SAPR3',  name: 'Sanepar ON',           sector: 'Saneamento',          category: 'perene'  },
  { ticker: 'SAPR4',  name: 'Sanepar PN',           sector: 'Saneamento',          category: 'perene'  },
  { ticker: 'CSMG3',  name: 'Copasa',               sector: 'Saneamento',          category: 'perene'  },
  { ticker: 'UGPA3',  name: 'Ultrapar',             sector: 'Distribuição',        category: 'perene'  },
  { ticker: 'ORVR3',  name: 'Orizon',               sector: 'Saneamento',          category: 'perene'  },

  // ========== AGRONEGÓCIO ==========
  { ticker: 'SLCE3',  name: 'SLC Agrícola',         sector: 'Agro',               category: 'ciclica' },
  { ticker: 'AGRO3',  name: 'BrasilAgro',           sector: 'Agro',               category: 'ciclica' },
  { ticker: 'LAND3',  name: 'Terra Santa',          sector: 'Agro',               category: 'ciclica' },
  { ticker: 'AGXY3',  name: 'Agrogalaxy',           sector: 'Agro',               category: 'ciclica' },

  // ========== MERCADO FINANCEIRO E FINTECH ==========
  { ticker: 'B3SA3',  name: 'B3',                   sector: 'Mercado Financeiro',  category: 'perene'  },
  { ticker: 'PAGS34', name: 'PagSeguro',            sector: 'Fintech',             category: 'perene'  },
  { ticker: 'CASH3',  name: 'Méliuz',               sector: 'Fintech',             category: 'ciclica' },

  // ========== SEGUROS ==========
  { ticker: 'BBSE3',  name: 'BB Seguridade',        sector: 'Seguros',             category: 'perene'  },
  { ticker: 'PSSA3',  name: 'Porto Seguro',         sector: 'Seguros',             category: 'perene'  },
  { ticker: 'WIZC3',  name: 'Wiz Co',               sector: 'Seguros',             category: 'perene'  },
  { ticker: 'CXSE3',  name: 'Caixa Seguridade',     sector: 'Seguros',             category: 'perene'  },

  // ========== TELECOM ==========
  { ticker: 'VIVT3',  name: 'Vivo',                 sector: 'Telecom',             category: 'perene'  },
  { ticker: 'TIMS3',  name: 'TIM',                  sector: 'Telecom',             category: 'perene'  },
  { ticker: 'OIBR3',  name: 'Oi',                   sector: 'Telecom',             category: 'ciclica' },
  { ticker: 'OIBR4',  name: 'Oi PN',                sector: 'Telecom',             category: 'ciclica' },
  { ticker: 'TELB4',  name: 'Telebras',             sector: 'Telecom',             category: 'perene'  },

  // ========== PAPEL E CELULOSE ==========
  { ticker: 'KLBN11', name: 'Klabin',               sector: 'Papel',               category: 'perene'  },
  { ticker: 'KLBN3',  name: 'Klabin ON',            sector: 'Papel',               category: 'perene'  },
  { ticker: 'KLBN4',  name: 'Klabin PN',            sector: 'Papel',               category: 'perene'  },
  { ticker: 'SUZB3',  name: 'Suzano',               sector: 'Papel',               category: 'ciclica' },
  { ticker: 'RANI3',  name: 'Irani',                sector: 'Papel',               category: 'ciclica' },
  { ticker: 'MELK3',  name: 'Melhor SP',            sector: 'Papel',               category: 'ciclica' },

  // ========== CONSTRUÇÃO CIVIL ==========
  { ticker: 'RENT3',  name: 'Localiza',             sector: 'Aluguel de Veículos', category: 'ciclica' },
  { ticker: 'CYRE3',  name: 'Cyrela',               sector: 'Construção Civil',    category: 'ciclica' },
  { ticker: 'MRVE3',  name: 'MRV',                  sector: 'Construção Civil',    category: 'ciclica' },
  { ticker: 'EZTC3',  name: 'EZ Tec',               sector: 'Construção Civil',    category: 'ciclica' },
  { ticker: 'JHSF3',  name: 'JHSF',                 sector: 'Construção Civil',    category: 'ciclica' },
  { ticker: 'LAVV3',  name: 'Lavvi',                sector: 'Construção Civil',    category: 'ciclica' },
  { ticker: 'EVEN3',  name: 'Even',                 sector: 'Construção Civil',    category: 'ciclica' },
  { ticker: 'HBOR3',  name: 'HBOR',                 sector: 'Construção Civil',    category: 'ciclica' },
  { ticker: 'TEND3',  name: 'Tenda',                sector: 'Construção Civil',    category: 'ciclica' },
  { ticker: 'DIRR3',  name: 'Direcional',           sector: 'Construção Civil',    category: 'ciclica' },
  { ticker: 'PLPL3',  name: 'Plano&Plano',          sector: 'Construção Civil',    category: 'ciclica' },
  { ticker: 'MTRE3',  name: 'Mitre Realty',         sector: 'Construção Civil',    category: 'ciclica' },
  { ticker: 'VIVR3',  name: 'Viver',                sector: 'Construção Civil',    category: 'ciclica' },
  { ticker: 'CALI3',  name: 'Cali',                 sector: 'Construção Civil',    category: 'ciclica' },
  { ticker: 'RSID3',  name: 'Rossi Residencial',    sector: 'Construção Civil',    category: 'ciclica' },

  // ========== EDUCAÇÃO ==========
  { ticker: 'YDUQ3',  name: 'Yduqs',                sector: 'Educação',            category: 'perene'  },
  { ticker: 'COGN3',  name: 'Cogna',                sector: 'Educação',            category: 'perene'  },
  { ticker: 'ANIM3',  name: 'Ânima',                sector: 'Educação',            category: 'perene'  },
  { ticker: 'SEER3',  name: 'Ser Educacional',      sector: 'Educação',            category: 'perene'  },
  { ticker: 'VITT3',  name: 'Vittia',               sector: 'Educação',            category: 'perene'  },

  // ========== COMBUSTÍVEIS ==========
  { ticker: 'VBBR3',  name: 'Vibra Energia',        sector: 'Combustíveis',        category: 'ciclica' },
  { ticker: 'RAIZ4',  name: 'Raízen',               sector: 'Combustíveis',        category: 'ciclica' },

  // ========== QUÍMICO E PETROQUÍMICO ==========
  { ticker: 'UNIP6',  name: 'Unipar',               sector: 'Químico',             category: 'ciclica' },
  { ticker: 'UNIP3',  name: 'Unipar ON',            sector: 'Químico',             category: 'ciclica' },
  { ticker: 'BRKM5',  name: 'Braskem',              sector: 'Petroquímico',        category: 'ciclica' },
  { ticker: 'BRKM3',  name: 'Braskem ON',           sector: 'Petroquímico',        category: 'ciclica' },

  // ========== SERVIÇOS DIVERSOS ==========
  { ticker: 'MOVI3',  name: 'Movida',               sector: 'Aluguel de Veículos', category: 'ciclica' },
  { ticker: 'SMFT3',  name: 'Smart Fit',            sector: 'Serviços',            category: 'perene'  },
  { ticker: 'ALPK3',  name: 'Allpark',              sector: 'Serviços',            category: 'perene'  },
  { ticker: 'DOTZ3',  name: 'Dotz',                 sector: 'Fintech',             category: 'ciclica' },

  // ========== TURISMO E AÉREO ==========
  { ticker: 'CVCB3',  name: 'CVC',                  sector: 'Turismo',             category: 'ciclica' },
  { ticker: 'AZUL4',  name: 'Azul',                 sector: 'Aéreo',               category: 'ciclica' },
  { ticker: 'SHOW3',  name: 'Time For Fun',         sector: 'Entretenimento',      category: 'ciclica' },

  // ========== HOLDINGS E PARTICIPAÇÕES ==========
  { ticker: 'BRAP4',  name: 'Bradespar',            sector: 'Holdings',            category: 'ciclica' },
  { ticker: 'BRAP3',  name: 'Bradespar ON',         sector: 'Holdings',            category: 'ciclica' },
  { ticker: 'ITSA4',  name: 'Itaúsa',               sector: 'Holdings',            category: 'perene'  },
  { ticker: 'ITSA3',  name: 'Itaúsa ON',            sector: 'Holdings',            category: 'perene'  },
  { ticker: 'TTEN3',  name: '3Tentos',              sector: 'Holdings',            category: 'ciclica' },
  { ticker: 'LOGG3',  name: 'Log CP',               sector: 'Holdings',            category: 'ciclica' },
  { ticker: 'INEP3',  name: 'Inepar',               sector: 'Holdings',            category: 'ciclica' },

  // ========== OUTROS ==========
  { ticker: 'WHRL4',  name: 'Whirlpool',            sector: 'Eletrodomésticos',    category: 'ciclica' },
  { ticker: 'BALM4',  name: 'Baumer',               sector: 'Farmacêutico',        category: 'perene'  }
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

/**
 * Popula os três dropdowns (dropdown-light, dropdown-moderate, dropdown-strong)
 * com as opções de setores. Chamado uma vez na inicialização.
 */
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

/**
 * Abre/fecha o dropdown do nível de desconto clicado.
 * Exposto globalmente — chamado pelo onclick do HTML.
 */
function toggleSectorDropdown(filter) {
  const dropdown = document.getElementById(`dropdown-${filter}`);
  if (!dropdown) return;

  const isOpen = dropdown.classList.contains('open');

  // Fecha todos
  closeAllDropdowns();

  if (!isOpen) {
    dropdown.classList.add('open');
    // Ao abrir o dropdown, ativa visualmente o botão correspondente
    activateFilterBtn(filter);
  }
}

/** Fecha todos os dropdowns */
function closeAllDropdowns() {
  document.querySelectorAll('.sector-dropdown').forEach(d => d.classList.remove('open'));
}

/** Clique fora de qualquer filter-btn-wrapper fecha os dropdowns */
document.addEventListener('click', (e) => {
  if (!e.target.closest('.filter-btn-wrapper')) closeAllDropdowns();
});

/**
 * Seleção de setor: atualiza estado, marca item ativo, exibe subtítulo no botão
 * e re-renderiza. Exposto globalmente — chamado pelo onclick de cada sector-option.
 */
function selectSector(filter, sector, clickedEl) {
  sectorByFilter[filter] = sector;

  // Atualiza o setor global se o filtro de desconto ativo é este
  if (currentDiscountFilter === filter) currentSectorFilter = sector;

  // Marca o item selecionado no dropdown
  const container = document.getElementById(`dropdown-${filter}`);
  container.querySelectorAll('.sector-option').forEach(opt => {
    opt.classList.toggle('selected', opt.dataset.sector === sector);
  });

  // Mostra ou remove o subtítulo de setor dentro do botão
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

  // Garante que o botão de desconto correto está ativo e re-renderiza
  activateFilterBtn(filter);
  filterAndRender(searchInput.value.toUpperCase());
}

/** Ativa visualmente o botão de desconto e sincroniza o estado global */
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
  const raw = localStorage.getItem(CONFIG.CACHE_KEY);
  if (!raw) return null;
  const data = JSON.parse(raw);
  return (Date.now() - data.time < CONFIG.CACHE_TIME) ? data.value : null;
}

function setCache(value) {
  localStorage.setItem(CONFIG.CACHE_KEY, JSON.stringify({ time: Date.now(), value }));
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
  for (let i = 0; i < stocks.length; i += CONFIG.BATCH_SIZE) {
    const batch   = stocks.slice(i, i + CONFIG.BATCH_SIZE);
    const tickers = batch.map(s => s.ticker).join(',');
    try {
      const apiData = await fetchDataFromAPI(tickers);
      if (apiData?.results) {
        data.push(...apiData.results);
        console.log(`✓ Lote ${Math.floor(i / CONFIG.BATCH_SIZE) + 1} carregado`);
      }
      await sleep(CONFIG.REQUEST_DELAY);
    } catch (error) {
      console.warn(`⚠️ Erro no lote ${i}-${i + CONFIG.BATCH_SIZE}:`, error.message);
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
    const level       = getDiscountLevel(stock.discount);
    const badgeText   = getBadgeText(level);
    const borderClass = getBorderClass(stock.discount);
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
  // Busca textual: ignora desconto/setor
  if (searchTerm) {
    const norm = searchTerm.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
    return stockList.filter(stock => {
      const fields = [stock.ticker, stock.name, stock.sector, ...(stock.aliases || [])]
        .join(' ').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
      return fields.includes(norm);
    });
  }

  let filtered = stockList;

  // Filtro por nível de desconto
  if (currentDiscountFilter) {
    filtered = filtered.filter(stock => {
      if (currentDiscountFilter === 'strong')   return stock.discount >= 16.6;
      if (currentDiscountFilter === 'moderate') return stock.discount >= 8.3 && stock.discount < 16.6;
      if (currentDiscountFilter === 'light')    return stock.discount > 0 && stock.discount < 8.3;
      return true;
    });
  }

  // Filtro por setor
  if (currentSectorFilter && currentSectorFilter !== 'Todos') {
    filtered = filtered.filter(stock =>
      stock.sector.toLowerCase() === currentSectorFilter.toLowerCase()
    );
  }

  return filtered;
}

/** Re-renderiza com filtros atuais, sem nova chamada à API */
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

/* ================= APLICAÇÃO PRINCIPAL ================= */
async function loadApp() {
  app.innerHTML = `
    <div class="loading">
      <div class="spinner"></div>
      <p>Carregando dados das ações...</p>
    </div>
  `;

  const apiData = await fetchAllStocks();

  const processedStocks = stocks.map(stock => {
    const api = apiData.find(d => d.symbol === stock.ticker);
    if (!api)                                                              { console.warn(`❌ ${stock.ticker}: não encontrado`);          return null; }
    if (!api.regularMarketPrice || api.regularMarketPrice <= 0)            { console.warn(`⚠️ ${stock.ticker}: preço inválido`);          return null; }
    if (!api.fiftyTwoWeekLow || !api.fiftyTwoWeekHigh ||
        api.fiftyTwoWeekHigh <= api.fiftyTwoWeekLow)                       { console.warn(`⚠️ ${stock.ticker}: histórico inválido`);      return null; }

    const target   = targetFromHistory(api.fiftyTwoWeekLow, api.fiftyTwoWeekHigh, stock.category);
    const discount = ((target - api.regularMarketPrice) / target) * 100;

    return { ...stock, price: api.regularMarketPrice, target, discount, change: api.regularMarketChange || 0, fundamentals: api };
  }).filter(Boolean);

  allProcessedStocks = processedStocks;

  console.log(`📊 Total: ${stocks.length} | API: ${apiData.length} | OK: ${processedStocks.length}`);

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
buildDropdowns(); // popula os dropdowns com os setores
loadApp();        // busca dados e renderiza
console.log('🚀 Auricchio inicializado com sucesso!');

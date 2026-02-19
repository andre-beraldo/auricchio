

/* ========================================
   AUTO-LIMPEZA DO SERVICE WORKER ANTIGO
   
   ⚠️ COLE ESTE CÓDIGO NO INÍCIO DO SEU app.js
   (antes de qualquer outro código)
   
   O QUE FAZ:
   - Remove service workers antigos (configurados para Netlify)
   - Limpa caches problemáticos
   - Força reload uma vez para aplicar mudanças
   - Só roda 1x por versão (não fica recarregando sempre)
======================================== */

(async function autoCleanup() {
  const SW_VERSION = 'v2'; // Mude para v3, v4 se precisar forçar limpeza de novo
  
  // Verifica se já limpou nesta versão
  const lastCleanup = localStorage.getItem('sw-cleanup-version');
  
  if (lastCleanup !== SW_VERSION) {
    console.log('🧹 Detectado service worker antigo - iniciando limpeza...');
    
    try {
      // 1. Remove todos os service workers
      if ('serviceWorker' in navigator) {
        const registrations = await navigator.serviceWorker.getRegistrations();
        for (let registration of registrations) {
          await registration.unregister();
          console.log('✅ Service Worker removido');
        }
      }
      
      // 2. Limpa TODOS os caches
      if ('caches' in window) {
        const cacheNames = await caches.keys();
        for (let cacheName of cacheNames) {
          await caches.delete(cacheName);
          console.log('✅ Cache removido:', cacheName);
        }
      }
      
      // 3. Limpa localStorage antigo (mas preserva cache de ações)
      const keysToKeep = ['stocksCache_v2_clean']; // Mantém cache de ações
      const allKeys = Object.keys(localStorage);
      allKeys.forEach(key => {
        if (!keysToKeep.includes(key) && key !== 'sw-cleanup-version') {
          localStorage.removeItem(key);
        }
      });
      
      // 4. Marca que já limpou
      localStorage.setItem('sw-cleanup-version', SW_VERSION);
      
      console.log('✅ Limpeza concluída! Recarregando página...');
      console.log('📌 Esta limpeza só acontece 1x por versão');
      
      // 5. Recarrega a página para aplicar mudanças
      setTimeout(() => {
        window.location.reload(true);
      }, 500);
      
      return; // Para a execução aqui se está limpando
    } catch (error) {
      console.error('❌ Erro na limpeza:', error);
      // Mesmo com erro, marca como feito para não ficar em loop
      localStorage.setItem('sw-cleanup-version', SW_VERSION);
    }
  } else {
    console.log('✅ Service Worker já está na versão correta');
  }
})();

// ============================================
// COLE SEU CÓDIGO ORIGINAL DO app.js AQUI
// (depois da função de auto-limpeza acima)
// ============================================

/* ========================================
   AURICCHIO - Monitor de Ações
   App.js Refatorado e SEGURO
======================================== */

// ... resto do código do app.js ...


/* ========================================
   AURICCHIO - Monitor de Ações
   App.js Refatorado e SEGURO
======================================== */

/* ================= ELEMENTOS DOM ================= */
const app = document.getElementById('app');
const searchInput = document.getElementById('search');

/* ================= CONFIGURAÇÕES ================= */
const CONFIG = {
  API_ENDPOINT: '/api/stocks', // ✅ Agora chama SEU backend
  CACHE_KEY: 'stocksCache_v2_clean',
  CACHE_TIME: 4 * 60 * 60 * 1000,
  REQUEST_DELAY: 400,
  BATCH_SIZE: 10
};

/* ================= ESTADO DA APLICAÇÃO ================= */
let currentDiscountFilter = 'light';

/* ================= AÇÕES (164 VALIDADAS) ================= */
const stocks = [
  // ========== BANCOS (14) ==========
  { ticker: 'ITUB4', name: 'Itaú', sector: 'Bancos', category: 'perene' },
  { ticker: 'ITUB3', name: 'Itaú PN', sector: 'Bancos', category: 'perene' },
  { ticker: 'BBDC4', name: 'Bradesco', sector: 'Bancos', category: 'perene' },
  { ticker: 'BBDC3', name: 'Bradesco PN', sector: 'Bancos', category: 'perene' },
  { ticker: 'BBAS3', name: 'Banco do Brasil', sector: 'Bancos', category: 'perene' },
  { ticker: 'SANB11', name: 'Santander', sector: 'Bancos', category: 'perene' },
  { ticker: 'SANB3', name: 'Santander Units', sector: 'Bancos', category: 'perene' },
  { ticker: 'BPAC11', name: 'BTG Pactual', sector: 'Bancos', category: 'perene' },
  { ticker: 'BRSR6', name: 'Banrisul', sector: 'Bancos', category: 'perene' },
  { ticker: 'BMGB4', name: 'Banco BMG', sector: 'Bancos', category: 'perene' },
  { ticker: 'PINE4', name: 'Pine', sector: 'Bancos', category: 'perene' },
  { ticker: 'BAZA3', name: 'Banco Amazônia', sector: 'Bancos', category: 'perene' },
  { ticker: 'BMOB3', name: 'Bemobi', sector: 'Fintech', category: 'ciclica' },
  { ticker: 'NORD3', name: 'Banco Nordeste', sector: 'Bancos', category: 'perene' },
  
  // ========== ENERGIA (18) ==========
  { ticker: 'TAEE11', name: 'Taesa', sector: 'Energia', category: 'perene' },
  { ticker: 'TAEE3', name: 'Taesa ON', sector: 'Energia', category: 'perene' },
  { ticker: 'TAEE4', name: 'Taesa PN', sector: 'Energia', category: 'perene' },
  { ticker: 'EGIE3', name: 'Engie', sector: 'Energia', category: 'perene' },
  { ticker: 'CPLE3', name: 'Copel', sector: 'Energia', category: 'perene' },
  { ticker: 'CMIG4', name: 'Cemig', sector: 'Energia', category: 'perene' },
  { ticker: 'CMIG3', name: 'Cemig ON', sector: 'Energia', category: 'perene' },
  { ticker: 'EQTL3', name: 'Equatorial', sector: 'Energia', category: 'perene' },
  { ticker: 'ENEV3', name: 'Eneva', sector: 'Energia', category: 'ciclica' },
  { ticker: 'CSAN3', name: 'Cosan', sector: 'Energia/Combustíveis', category: 'ciclica' },
  { ticker: 'LIGT3', name: 'Light', sector: 'Energia', category: 'perene' },
  { ticker: 'NEOE3', name: 'Neoenergia', sector: 'Energia', category: 'perene' },
  { ticker: 'CPFE3', name: 'CPFL Energia', sector: 'Energia', category: 'perene' },
  { ticker: 'COCE5', name: 'Coelce', sector: 'Energia', category: 'perene' },
  { ticker: 'CLSC4', name: 'Celesc', sector: 'Energia', category: 'perene' },
  { ticker: 'GEPA4', name: 'GER Paranap', sector: 'Energia', category: 'perene' },
  { ticker: 'EMAE4', name: 'Emae', sector: 'Energia', category: 'perene' },
  
  // ========== PETRÓLEO, GÁS E MINERAÇÃO (8) ==========
  { ticker: 'PETR4', name: 'Petrobras', sector: 'Petróleo', category: 'ciclica' },
  { ticker: 'PETR3', name: 'Petrobras ON', sector: 'Petróleo', category: 'ciclica' },
  { ticker: 'PRIO3', name: 'Prio', sector: 'Petróleo', category: 'ciclica' },
  { ticker: 'RECV3', name: 'PetroReconcavo', sector: 'Petróleo', category: 'ciclica' },
  { ticker: 'VALE3', name: 'Vale', sector: 'Mineração', category: 'ciclica' },
  { ticker: 'CMIN3', name: 'CSN Mineração', sector: 'Mineração', category: 'ciclica' },
  { ticker: 'FESA4', name: 'Ferbasa', sector: 'Mineração', category: 'ciclica' },
  { ticker: 'GGBR3', name: 'Gerdau ON', sector: 'Siderurgia', category: 'ciclica' },
  
  // ========== SIDERURGIA E METALURGIA (7) ==========
  { ticker: 'GGBR4', name: 'Gerdau', sector: 'Siderurgia', category: 'ciclica' },
  { ticker: 'CSNA3', name: 'CSN', sector: 'Siderurgia', category: 'ciclica' },
  { ticker: 'USIM5', name: 'Usiminas', sector: 'Siderurgia', category: 'ciclica' },
  { ticker: 'USIM3', name: 'Usiminas ON', sector: 'Siderurgia', category: 'ciclica' },
  { ticker: 'GOAU4', name: 'Metalúrgica Gerdau', sector: 'Siderurgia', category: 'ciclica' },
  { ticker: 'GOAU3', name: 'Met Gerdau ON', sector: 'Siderurgia', category: 'ciclica' },
  { ticker: 'PATI4', name: 'Panatlantica', sector: 'Siderurgia', category: 'ciclica' },
  
  // ========== ALIMENTOS E BEBIDAS (9) ==========
  { ticker: 'ABEV3', name: 'Ambev', sector: 'Bebidas', category: 'perene' },
  { ticker: 'BEEF3', name: 'Minerva', sector: 'Alimentos', category: 'ciclica' },
  { ticker: 'MDIA3', name: 'M.Dias Branco', sector: 'Alimentos', category: 'perene' },
  { ticker: 'SMTO3', name: 'São Martinho', sector: 'Agro', category: 'ciclica' },
  { ticker: 'CAML3', name: 'Camil', sector: 'Alimentos', category: 'perene' },
  { ticker: 'JALL3', name: 'Jalles Machado', sector: 'Agro', category: 'ciclica' },
  { ticker: 'BAUH4', name: 'Excelsior', sector: 'Alimentos', category: 'ciclica' },
  { ticker: 'SOJA3', name: 'Boa Safra', sector: 'Agro', category: 'ciclica' },
  { ticker: 'ALLD3', name: 'Allopar', sector: 'Alimentos', category: 'ciclica' },
  
  // ========== VAREJO E CALÇADOS (23) ==========
  { ticker: 'LREN3', name: 'Renner', sector: 'Varejo', category: 'perene' },
  { ticker: 'MGLU3', name: 'Magazine Luiza', sector: 'Varejo', category: 'ciclica' },
  { ticker: 'ASAI3', name: 'Assaí', sector: 'Varejo', category: 'perene' },
  { ticker: 'PCAR3', name: 'GPA', sector: 'Varejo', category: 'ciclica' },
  { ticker: 'GUAR3', name: 'Guararapes', sector: 'Varejo', category: 'perene' },
  { ticker: 'CEAB3', name: 'C&A', sector: 'Varejo', category: 'perene' },
  { ticker: 'BHIA3', name: 'Casas Bahia', sector: 'Varejo', category: 'ciclica' },
  { ticker: 'ALPA4', name: 'Alpargatas', sector: 'Calçados', category: 'perene' },
  { ticker: 'VULC3', name: 'Vulcabras', sector: 'Calçados', category: 'perene' },
  { ticker: 'GRND3', name: 'Grendene', sector: 'Calçados', category: 'perene' },
  { ticker: 'AZZA3', name: 'Azzas 2154', sector: 'Varejo', category: 'perene' },
  { ticker: 'PGMN3', name: 'Pague Menos', sector: 'Farmacêutico', category: 'perene' },
  { ticker: 'TFCO4', name: 'Track & Field', sector: 'Varejo', category: 'perene' },
  { ticker: 'WEST3', name: 'Westwing', sector: 'Varejo', category: 'ciclica' },
  { ticker: 'AMAR3', name: 'Marisa', sector: 'Varejo', category: 'ciclica' },
  { ticker: 'TECN3', name: 'Technos', sector: 'Varejo', category: 'ciclica' },
  { ticker: 'DMVF3', name: 'D1000 Varejo', sector: 'Varejo', category: 'ciclica' },
  { ticker: 'VIVA3', name: 'Vivara', sector: 'Varejo', category: 'perene' },
  { ticker: 'LJQQ3', name: 'Lojas Quero-Quero', sector: 'Varejo', category: 'perene' },
  { ticker: 'LUPA3', name: 'Lupatech', sector: 'Varejo', category: 'ciclica' },
  { ticker: 'MLAS3', name: 'Multilaser', sector: 'Varejo', category: 'ciclica' },
  { ticker: 'SLED4', name: 'Saraiva', sector: 'Varejo', category: 'ciclica' },
  
  // ========== SAÚDE E FARMACÊUTICO (12) ==========
  { ticker: 'RADL3', name: 'Raia Drogasil', sector: 'Saúde', category: 'perene' },
  { ticker: 'FLRY3', name: 'Fleury', sector: 'Saúde', category: 'perene' },
  { ticker: 'HYPE3', name: 'Hypera', sector: 'Saúde', category: 'perene' },
  { ticker: 'QUAL3', name: 'Qualicorp', sector: 'Saúde', category: 'perene' },
  { ticker: 'HAPV3', name: 'Hapvida', sector: 'Saúde', category: 'perene' },
  { ticker: 'ONCO3', name: 'Oncoclínicas', sector: 'Saúde', category: 'perene' },
  { ticker: 'ODPV3', name: 'Odontoprev', sector: 'Saúde', category: 'perene' },
  { ticker: 'MATD3', name: 'Mater Dei', sector: 'Saúde', category: 'perene' },
  { ticker: 'DASA3', name: 'Dasa', sector: 'Saúde', category: 'perene' },
  { ticker: 'BLAU3', name: 'Blau Farmacêutica', sector: 'Saúde', category: 'perene' },
  { ticker: 'PNVL3', name: 'Dimed', sector: 'Farmacêutico', category: 'perene' },
  { ticker: 'SYNE3', name: 'Synergy', sector: 'Farmacêutico', category: 'perene' },
  
  // ========== INDÚSTRIA (17) ==========
  { ticker: 'WEGE3', name: 'WEG', sector: 'Indústria', category: 'perene' },
  { ticker: 'RAPT4', name: 'Randon', sector: 'Indústria', category: 'ciclica' },
  { ticker: 'RAPT3', name: 'Randon ON', sector: 'Indústria', category: 'ciclica' },
  { ticker: 'POMO4', name: 'Marcopolo', sector: 'Indústria', category: 'ciclica' },
  { ticker: 'POMO3', name: 'Marcopolo ON', sector: 'Indústria', category: 'ciclica' },
  { ticker: 'TUPY3', name: 'Tupy', sector: 'Indústria', category: 'ciclica' },
  { ticker: 'KEPL3', name: 'Kepler Weber', sector: 'Indústria', category: 'ciclica' },
  { ticker: 'FRAS3', name: 'Fras-le', sector: 'Indústria', category: 'ciclica' },
  { ticker: 'LEVE3', name: 'Mahle Metal Leve', sector: 'Indústria', category: 'ciclica' },
  { ticker: 'MYPK3', name: 'Iochpe Maxion', sector: 'Indústria', category: 'ciclica' },
  { ticker: 'ROMI3', name: 'Romi', sector: 'Indústria', category: 'ciclica' },
  { ticker: 'INTB3', name: 'Intelbras', sector: 'Tecnologia', category: 'perene' },
  { ticker: 'FHER3', name: 'Fertilizantes Heringer', sector: 'Indústria', category: 'ciclica' },
  { ticker: 'SHUL4', name: 'Schulz', sector: 'Indústria', category: 'ciclica' },
  { ticker: 'MTSA4', name: 'Metisa', sector: 'Indústria', category: 'ciclica' },
  { ticker: 'ESTR4', name: 'Estrela', sector: 'Indústria', category: 'ciclica' },
  { ticker: 'PMAM3', name: 'Paraná', sector: 'Indústria', category: 'ciclica' },
  
  // ========== TECNOLOGIA (6) ==========
  { ticker: 'TOTS3', name: 'Totvs', sector: 'Tecnologia', category: 'perene' },
  { ticker: 'LWSA3', name: 'Locaweb', sector: 'Tecnologia', category: 'ciclica' },
  { ticker: 'POSI3', name: 'Positivo', sector: 'Tecnologia', category: 'ciclica' },
  { ticker: 'IFCM3', name: 'Infracommerce', sector: 'Tecnologia', category: 'ciclica' },
  { ticker: 'MEAL3', name: 'IMC', sector: 'Tecnologia', category: 'ciclica' },
  { ticker: 'DESK3', name: 'Desktop', sector: 'Tecnologia', category: 'ciclica' },
  
  // ========== SHOPPINGS E IMOBILIÁRIO (6) ==========
  { ticker: 'MULT3', name: 'Multiplan', sector: 'Shoppings', category: 'perene' },
  { ticker: 'IGTI11', name: 'Iguatemi', sector: 'Shoppings', category: 'perene' },
  { ticker: 'IGTI3', name: 'Iguatemi ON', sector: 'Shoppings', category: 'perene' },
  { ticker: 'ALOS3', name: 'Allos', sector: 'Shoppings', category: 'perene' },
  { ticker: 'SGPS3', name: 'Springs', sector: 'Imobiliário', category: 'ciclica' },
  { ticker: 'GSHP3', name: 'General Shopping', sector: 'Shoppings', category: 'perene' },
  
  // ========== LOGÍSTICA E CONCESSÕES (9) ==========
  { ticker: 'RAIL3', name: 'Rumo', sector: 'Logística', category: 'ciclica' },
  { ticker: 'EQPA3', name: 'Ecorodovias', sector: 'Concessões', category: 'perene' },
  { ticker: 'ECOR3', name: 'Ecorodovias ON', sector: 'Concessões', category: 'perene' },
  { ticker: 'SIMH3', name: 'Simpar', sector: 'Logística', category: 'ciclica' },
  { ticker: 'LOGN3', name: 'Log-In', sector: 'Logística', category: 'ciclica' },
  { ticker: 'TGMA3', name: 'Tegma', sector: 'Logística', category: 'ciclica' },
  { ticker: 'ODER4', name: 'Odebrecht', sector: 'Concessões', category: 'ciclica' },
  { ticker: 'PRNR3', name: 'Prumo', sector: 'Logística', category: 'ciclica' },
  
  // ========== SANEAMENTO (6) ==========
  { ticker: 'SBSP3', name: 'Sabesp', sector: 'Saneamento', category: 'perene' },
  { ticker: 'SAPR11', name: 'Sanepar', sector: 'Saneamento', category: 'perene' },
  { ticker: 'SAPR3', name: 'Sanepar ON', sector: 'Saneamento', category: 'perene' },
  { ticker: 'SAPR4', name: 'Sanepar PN', sector: 'Saneamento', category: 'perene' },
  { ticker: 'CSMG3', name: 'Copasa', sector: 'Saneamento', category: 'perene' },
  { ticker: 'UGPA3', name: 'Ultrapar', sector: 'Distribuição', category: 'perene' },
  { ticker: 'ORVR3', name: 'Orizon', sector: 'Saneamento', category: 'perene' },
  
  // ========== AGRONEGÓCIO (4) ==========
  { ticker: 'SLCE3', name: 'SLC Agrícola', sector: 'Agro', category: 'ciclica' },
  { ticker: 'AGRO3', name: 'BrasilAgro', sector: 'Agro', category: 'ciclica' },
  { ticker: 'LAND3', name: 'Terra Santa', sector: 'Agro', category: 'ciclica' },
  { ticker: 'AGXY3', name: 'Agrogalaxy', sector: 'Agro', category: 'ciclica' },
  
  // ========== MERCADO FINANCEIRO E FINTECH (3) ==========
  { ticker: 'B3SA3', name: 'B3', sector: 'Mercado Financeiro', category: 'perene' },
  { ticker: 'PAGS34', name: 'PagSeguro', sector: 'Fintech', category: 'perene' },
  { ticker: 'CASH3', name: 'Méliuz', sector: 'Fintech', category: 'ciclica' },
  
  // ========== SEGUROS (4) ==========
  { ticker: 'BBSE3', name: 'BB Seguridade', sector: 'Seguros', category: 'perene' },
  { ticker: 'PSSA3', name: 'Porto Seguro', sector: 'Seguros', category: 'perene' },
  { ticker: 'WIZC3', name: 'Wiz Co', sector: 'Seguros', category: 'perene' },
  { ticker: 'CXSE3', name: 'Caixa Seguridade', sector: 'Seguros', category: 'perene' },
  
  // ========== TELECOM (5) ==========
  { ticker: 'VIVT3', name: 'Vivo', sector: 'Telecom', category: 'perene' },
  { ticker: 'TIMS3', name: 'TIM', sector: 'Telecom', category: 'perene' },
  { ticker: 'OIBR3', name: 'Oi', sector: 'Telecom', category: 'ciclica' },
  { ticker: 'OIBR4', name: 'Oi PN', sector: 'Telecom', category: 'ciclica' },
  { ticker: 'TELB4', name: 'Telebras', sector: 'Telecom', category: 'perene' },
  
  // ========== PAPEL E CELULOSE (6) ==========
  { ticker: 'KLBN11', name: 'Klabin', sector: 'Papel', category: 'perene' },
  { ticker: 'KLBN3', name: 'Klabin ON', sector: 'Papel', category: 'perene' },
  { ticker: 'KLBN4', name: 'Klabin PN', sector: 'Papel', category: 'perene' },
  { ticker: 'SUZB3', name: 'Suzano', sector: 'Papel', category: 'ciclica' },
  { ticker: 'RANI3', name: 'Irani', sector: 'Papel', category: 'ciclica' },
  { ticker: 'MELK3', name: 'Melhor SP', sector: 'Papel', category: 'ciclica' },
  
  // ========== CONSTRUÇÃO CIVIL (15) ==========
  { ticker: 'RENT3', name: 'Localiza', sector: 'Aluguel de Veículos', category: 'ciclica' },
  { ticker: 'CYRE3', name: 'Cyrela', sector: 'Construção Civil', category: 'ciclica' },
  { ticker: 'MRVE3', name: 'MRV', sector: 'Construção Civil', category: 'ciclica' },
  { ticker: 'EZTC3', name: 'EZ Tec', sector: 'Construção Civil', category: 'ciclica' },
  { ticker: 'JHSF3', name: 'JHSF', sector: 'Construção Civil', category: 'ciclica' },
  { ticker: 'LAVV3', name: 'Lavvi', sector: 'Construção Civil', category: 'ciclica' },
  { ticker: 'EVEN3', name: 'Even', sector: 'Construção Civil', category: 'ciclica' },
  { ticker: 'HBOR3', name: 'HBOR', sector: 'Construção Civil', category: 'ciclica' },
  { ticker: 'TEND3', name: 'Tenda', sector: 'Construção Civil', category: 'ciclica' },
  { ticker: 'DIRR3', name: 'Direcional', sector: 'Construção Civil', category: 'ciclica' },
  { ticker: 'PLPL3', name: 'Plano&Plano', sector: 'Construção Civil', category: 'ciclica' },
  { ticker: 'MTRE3', name: 'Mitre Realty', sector: 'Construção Civil', category: 'ciclica' },
  { ticker: 'VIVR3', name: 'Viver', sector: 'Construção Civil', category: 'ciclica' },
  { ticker: 'CALI3', name: 'Cali', sector: 'Construção Civil', category: 'ciclica' },
  { ticker: 'RSID3', name: 'Rossi Residencial', sector: 'Construção Civil', category: 'ciclica' },
  
  // ========== EDUCAÇÃO (5) ==========
  { ticker: 'YDUQ3', name: 'Yduqs', sector: 'Educação', category: 'perene' },
  { ticker: 'COGN3', name: 'Cogna', sector: 'Educação', category: 'perene' },
  { ticker: 'ANIM3', name: 'Ânima', sector: 'Educação', category: 'perene' },
  { ticker: 'SEER3', name: 'Ser Educacional', sector: 'Educação', category: 'perene' },
  { ticker: 'VITT3', name: 'Vittia', sector: 'Educação', category: 'perene' },
  
  // ========== COMBUSTÍVEIS (2) ==========
  { ticker: 'VBBR3', name: 'Vibra Energia', sector: 'Combustíveis', category: 'ciclica' },
  { ticker: 'RAIZ4', name: 'Raízen', sector: 'Combustíveis', category: 'ciclica' },
  
  // ========== QUÍMICO E PETROQUÍMICO (4) ==========
  { ticker: 'UNIP6', name: 'Unipar', sector: 'Químico', category: 'ciclica' },
  { ticker: 'UNIP3', name: 'Unipar ON', sector: 'Químico', category: 'ciclica' },
  { ticker: 'BRKM5', name: 'Braskem', sector: 'Petroquímico', category: 'ciclica' },
  { ticker: 'BRKM3', name: 'Braskem ON', sector: 'Petroquímico', category: 'ciclica' },
  
  // ========== SERVIÇOS DIVERSOS (4) ==========
  { ticker: 'MOVI3', name: 'Movida', sector: 'Aluguel de Veículos', category: 'ciclica' },
  { ticker: 'SMFT3', name: 'Smart Fit', sector: 'Serviços', category: 'perene' },
  { ticker: 'ALPK3', name: 'Allpark', sector: 'Serviços', category: 'perene' },
  { ticker: 'DOTZ3', name: 'Dotz', sector: 'Fintech', category: 'ciclica' },
  
  // ========== TURISMO E AÉREO (3) ==========
  { ticker: 'CVCB3', name: 'CVC', sector: 'Turismo', category: 'ciclica' },
  { ticker: 'AZUL4', name: 'Azul', sector: 'Aéreo', category: 'ciclica' },
  { ticker: 'SHOW3', name: 'Time For Fun', sector: 'Entretenimento', category: 'ciclica' },
  
  // ========== HOLDINGS E PARTICIPAÇÕES (7) ==========
  { ticker: 'BRAP4', name: 'Bradespar', sector: 'Holdings', category: 'ciclica' },
  { ticker: 'BRAP3', name: 'Bradespar ON', sector: 'Holdings', category: 'ciclica' },
  { ticker: 'ITSA4', name: 'Itaúsa', sector: 'Holdings', category: 'perene' },
  { ticker: 'ITSA3', name: 'Itaúsa ON', sector: 'Holdings', category: 'perene' },
  { ticker: 'TTEN3', name: '3Tentos', sector: 'Holdings', category: 'ciclica' },
  { ticker: 'LOGG3', name: 'Log CP', sector: 'Holdings', category: 'ciclica' },
  { ticker: 'INEP3', name: 'Inepar', sector: 'Holdings', category: 'ciclica' },
  
  // ========== OUTROS SETORES (2) ==========
  { ticker: 'WHRL4', name: 'Whirlpool', sector: 'Eletrodomésticos', category: 'ciclica' },
  { ticker: 'BALM4', name: 'Baumer', sector: 'Farmacêutico', category: 'perene' }
];

/* ================= FUNÇÕES UTILITÁRIAS ================= */
function targetFromHistory(min, max, category) {
  const range = max - min;
  const factor = category === 'perene' ? 0.6 : 0.5;
  return min + range * factor;
}

function getBorderClass(discount) {
  if (discount >= 16.6) return 'border-red-500';
  if (discount >= 8.3) return 'border-yellow-500';
  if (discount > 0) return 'border-blue-500';
  return 'border-gray-400';
}

function getDiscountLevel(discount) {
  if (discount >= 16.6) return 'strong';
  if (discount >= 8.3) return 'moderate';
  return 'light';
}

function getBadgeText(discountLevel) {
  if (discountLevel === 'strong') return 'Desconto Forte';
  if (discountLevel === 'moderate') return 'Desconto Moderado';
  return 'Desconto Leve';
}

function formatBRL(value) {
  return `R$ ${value.toFixed(2)}`;
}

const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));

/* ================= ANÁLISE DE SAÚDE FINANCEIRA ================= */
function analyzeHealth(fundamentals, priceHistory = null) {
  if (!fundamentals) return { items: [], performanceItems: [] };

  const stats = fundamentals.defaultKeyStatistics || {};

  // ── INDICADORES FUNDAMENTALISTAS (sem alteração) ──────────────
  const items = [];

  const pe = fundamentals.priceEarnings;
  items.push({
    label: 'P/L',
    value: (pe && pe > 0) ? pe.toFixed(2) : 'N/A',
    status: (pe > 0 && pe < 20) ? 'positive' : (pe >= 20 && pe <= 30) ? 'warning' : 'negative'
  });

  const pvp = stats.priceToBook;
  items.push({
    label: 'P/VP',
    value: (pvp && pvp > 0) ? pvp.toFixed(2) : 'N/A',
    status: (pvp > 0 && pvp < 3) ? 'positive' : (pvp >= 3 && pvp <= 5) ? 'warning' : 'negative'
  });

  const dy = stats.dividendYield;
  items.push({
    label: 'Dividend Yield',
    value: (dy && dy > 0) ? `${dy.toFixed(2)}%` : 'N/A',
    status: (dy >= 4) ? 'positive' : (dy > 0) ? 'warning' : 'negative'
  });

  // ── PERFORMANCE (bloco novo e separado) ───────────────────────
  const performanceItems = [];
  const precoAtual = fundamentals.regularMarketPrice ?? null;

  function calcVariacao(atual, anterior) {
    if (!atual || !anterior || anterior === 0) return null;
    return ((atual - anterior) / anterior) * 100;
  }

  function formatVariacao(valor) {
    if (valor === null) return { value: 'N/A', status: 'negative' };
    const sinal = valor >= 0 ? '+' : '';
    return {
      value: `${sinal}${valor.toFixed(2)}%`,
      status: valor >= 5 ? 'positive' : valor >= 0 ? 'warning' : 'negative'
    };
  }

  const var12m = calcVariacao(precoAtual, priceHistory?.price12mAgo);
  const varMes  = calcVariacao(precoAtual, priceHistory?.price1mAgo);

  performanceItems.push({ label: 'Valorização 12M', ...formatVariacao(var12m) });
  performanceItems.push({ label: 'Valorização Mês',  ...formatVariacao(varMes)  });

  return { items, performanceItems };
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

/* ================= API (AGORA SEGURA) ================= */
async function fetchDataFromAPI(tickers) {
  const url = `/api/stocks?tickers=${tickers}`;
  try {
    const response = await fetch(url);
    const data = await response.json();
    if (data.error) {
      throw new Error(data.error);
    }
    return data;
  } catch (error) {
    console.error('Erro ao buscar dados:', error);
    return { error: 'Erro ao buscar dados da API' };
  }
}

async function fetchAllStocks() {
  const data = [];
  
  // Dividindo a lista de ações em lotes
  for (let i = 0; i < stocks.length; i += CONFIG.BATCH_SIZE) {
    const batch = stocks.slice(i, i + CONFIG.BATCH_SIZE);
    const tickers = batch.map(s => s.ticker).join(',');
    
    try {
      const apiData = await fetchDataFromAPI(tickers);
      
      if (apiData && apiData.results) {
        data.push(...apiData.results);
        console.log(`✓ Lote ${Math.floor(i / CONFIG.BATCH_SIZE) + 1} carregado`);
      }
      
      await sleep(CONFIG.REQUEST_DELAY);
    } catch (error) {
      console.warn(`⚠️ Erro ao buscar lote ${i}-${i + CONFIG.BATCH_SIZE}:`, error.message);
    }
  }
  
  return data;
}



async function fetchPriceHistory(ticker) {
  try {
    const response = await fetch(`/api/stocks/history?ticker=${ticker}`);
    const data = await response.json();

    const results = data?.results?.[0]?.historicalDataPrice;
    if (!results || results.length < 2) return null;

    const sorted = [...results].sort((a, b) => a.date - b.date);

    const hoje = Date.now();
    const dozeM = hoje - 365 * 24 * 60 * 60 * 1000;
    const umM   = hoje - 30  * 24 * 60 * 60 * 1000;

    // Candle mais próximo de 12 meses atrás
    const price12mAgo = sorted.reduce((prev, curr) =>
      Math.abs(curr.date * 1000 - dozeM) < Math.abs(prev.date * 1000 - dozeM) ? curr : prev
    )?.close ?? null;

    // Candle mais próximo de 1 mês atrás
    const price1mAgo = sorted.reduce((prev, curr) =>
      Math.abs(curr.date * 1000 - umM) < Math.abs(prev.date * 1000 - umM) ? curr : prev
    )?.close ?? null;

    return { price12mAgo, price1mAgo };
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

  // Renderiza IMEDIATAMENTE sem histórico
  app.innerHTML = stockList.map((stock, index) => {
    const discountLevel = getDiscountLevel(stock.discount);
    const badgeText = getBadgeText(discountLevel);
    const borderClass = getBorderClass(stock.discount);
    const discountColor = discountLevel === 'light' ? '#3b82f6' : 
                         discountLevel === 'moderate' ? '#f59e0b' : 
                         discountLevel === 'strong' ? '#dc2626' : '#9ca3af';
    
    const { items } = analyzeHealth(stock.fundamentals, null);
    
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
            </div>` : '' }
        
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
            <div class="health-title">📊 Indicadores Fundamentalistas</div>
            ${items.map(item => `
              <div class="health-item">
                <span class="health-label">${item.label}</span>
                <span class="health-value ${item.status}">${item.value}</span>
              </div>
            `).join('')}

            <div class="health-title" style="margin-top: 12px;">📈 Performance</div>
            <div id="performance-${index}">
              <div class="health-item">
                <span class="health-label" style="color: #6b7280; font-size: 0.8rem;">⏳ Carregando...</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    `;
  }).join('');

  // Busca histórico em segundo plano, atualiza cada card individualmente
  stockList.forEach((stock, index) => {
    fetchPriceHistory(stock.ticker).then(history => {
      const perfEl = document.getElementById(`performance-${index}`);
      if (!perfEl) return;

      const { performanceItems } = analyzeHealth(stock.fundamentals, history);
      perfEl.innerHTML = performanceItems.map(item => `
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
  let filtered = stockList;
  
  if (searchTerm) {
    const normalizedSearch = searchTerm.toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '');
    
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



/* ================= ESTATÍSTICAS ================= */
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
  document.getElementById('headerTotal').textContent = stats.total;

  const cacheData = localStorage.getItem(CONFIG.CACHE_KEY);
  if (cacheData) {
    const cacheAge = Math.floor((Date.now() - JSON.parse(cacheData).time) / (1000 * 60));
    const hours = Math.floor(cacheAge / 60);
    const minutes = cacheAge % 60;
    const ageText = hours > 0 ? `${hours}h` : `${minutes}min`;
    document.getElementById('cacheTime').textContent = ageText;
  } else {
    document.getElementById('cacheTime').textContent = 'agora';
  }
}


/* ================= APLICAÇÃO PRINCIPAL ================= */
async function loadApp(searchTerm = '') {
  app.innerHTML = `
    <div class="loading">
      <div class="spinner"></div>
      <p>Carregando dados das ações...</p>
    </div>
  `;

  const apiData = await fetchAllStocks();

  const processedStocks = stocks
    .map(stock => {
      const apiStock = apiData.find(data => data.symbol === stock.ticker);
      if (!apiStock) {
        console.warn(`❌ ${stock.ticker}: não encontrado na API`);
        return null;
      }

      if (!apiStock.regularMarketPrice || apiStock.regularMarketPrice <= 0) {
        console.warn(`⚠️ ${stock.ticker}: preço inválido (R$ ${apiStock.regularMarketPrice})`);
        return null;
      }

      if (
        !apiStock.fiftyTwoWeekLow ||
        !apiStock.fiftyTwoWeekHigh ||
        apiStock.fiftyTwoWeekHigh <= apiStock.fiftyTwoWeekLow
      ) {
        console.warn(`⚠️ ${stock.ticker}: dados históricos inválidos`);
        return null;
      }

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
    .filter(Boolean);

  console.log('📊 RESUMO:');
  console.log(`Total de ações no array: ${stocks.length}`);
  console.log(`Retornadas pela API: ${apiData.length}`);
  console.log(`Processadas com sucesso: ${processedStocks.length}`);
  console.log(`Diferença: ${stocks.length - processedStocks.length} ações perdidas`);

  const foundTickers = processedStocks.map(s => s.ticker);
  const missingStocks = stocks.filter(s => !foundTickers.includes(s.ticker));
  console.log('🔍 Ações que faltaram:', missingStocks.map(s => `${s.ticker} (${s.name})`));

  const filteredStocks = applyFilters(processedStocks, searchTerm);
  filteredStocks.sort((a, b) => b.discount - a.discount);

  renderStocks(filteredStocks); // ← estava faltando
  updateStatistics(processedStocks);
}

/* ================= EVENT LISTENERS ================= */
searchInput.addEventListener('input', (e) => {
  const searchTerm = e.target.value.toUpperCase();
  loadApp(searchTerm);
});

document.querySelectorAll('.filter-btn').forEach(button => {
  button.addEventListener('click', () => {
    document.querySelectorAll('.filter-btn').forEach(btn => {
      btn.classList.remove('active');
    });
    button.classList.add('active');
    
    currentDiscountFilter = button.dataset.filter;
    const searchTerm = searchInput.value.toUpperCase();
    loadApp(searchTerm);
  });
});

/* ================= EXPANSÃO DE CARDS ================= */

function toggleHealth(index) {
  const healthSection = document.getElementById(`health-${index}`);
  const arrow = document.querySelector(`[data-index="${index}"] .expand-arrow`);

  if (!healthSection || !arrow) return;

  const isExpanded = healthSection.classList.contains('expanded');

  healthSection.classList.toggle('expanded', !isExpanded);
  arrow.classList.toggle('expanded', !isExpanded);

  const arrowIcon = arrow.querySelector('.arrow-icon');
  if (arrowIcon) {
    arrowIcon.style.display = 'inline-block';
    arrowIcon.style.transition = 'transform 0.3s ease';
    arrowIcon.style.transform = isExpanded ? 'rotate(0deg)' : 'rotate(180deg)';
  }
}

window.toggleHealth = toggleHealth;

/* ================= INICIALIZAÇÃO ================= */
loadApp();
console.log('🚀 Auricchio inicializado com sucesso!');

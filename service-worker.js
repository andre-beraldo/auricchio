/* ========================================
   SERVICE WORKER - AURICCHIO
   Configurado para Cloudflare Pages
======================================== */

const CACHE_NAME = 'auricchio-v2';
const ASSETS_TO_CACHE = [
  '/',
  '/index.html',
  '/app.js',
  '/ações.js',
  '/manifest.json'
  // Adicione outros assets estáticos aqui
];

// ========== INSTALAÇÃO ==========
self.addEventListener('install', (event) => {
  console.log('📦 Service Worker: Instalando...');
  
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        console.log('✅ Service Worker: Cache aberto');
        return cache.addAll(ASSETS_TO_CACHE);
      })
      .then(() => self.skipWaiting())
  );
});

// ========== ATIVAÇÃO ==========
self.addEventListener('activate', (event) => {
  console.log('🔄 Service Worker: Ativando...');
  
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cacheName => {
          // Remove caches antigos
          if (cacheName !== CACHE_NAME) {
            console.log('🗑️ Service Worker: Removendo cache antigo:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    })
    .then(() => self.clients.claim())
  );
});

// ========== FETCH (ESTRATÉGIA DE CACHE) ==========
self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);
  
  // ✅ NUNCA cachear a API do Cloudflare Functions
  if (url.pathname.startsWith('/api/')) {
    console.log('🌐 Service Worker: Ignorando API (sempre busca da rede)');
    return; // Deixa a requisição passar direto para a rede
  }
  
  // ✅ Para assets estáticos: Cache First (rápido, mas atualiza em background)
  event.respondWith(
    caches.match(event.request)
      .then(cachedResponse => {
        if (cachedResponse) {
          console.log('📦 Service Worker: Servindo do cache:', event.request.url);
          
          // Retorna do cache, mas atualiza em background
          event.waitUntil(
            fetch(event.request)
              .then(networkResponse => {
                return caches.open(CACHE_NAME)
                  .then(cache => {
                    cache.put(event.request, networkResponse.clone());
                    return networkResponse;
                  });
              })
              .catch(() => {}) // Ignora erros de rede
          );
          
          return cachedResponse;
        }
        
        // Não está no cache, busca da rede
        console.log('🌐 Service Worker: Buscando da rede:', event.request.url);
        return fetch(event.request)
          .then(networkResponse => {
            // Cachea a resposta para próxima vez
            if (networkResponse && networkResponse.status === 200) {
              return caches.open(CACHE_NAME)
                .then(cache => {
                  cache.put(event.request, networkResponse.clone());
                  return networkResponse;
                });
            }
            return networkResponse;
          })
          .catch(error => {
            console.error('❌ Service Worker: Erro ao buscar:', error);
            throw error;
          });
      })
  );
});

console.log('✅ Service Worker carregado!');

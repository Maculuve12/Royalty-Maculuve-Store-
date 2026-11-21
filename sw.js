/* Royalty: service worker
   - A página principal usa "rede primeiro": os clientes veem sempre a versão mais recente; sem internet, abre a última guardada.
   - Os dados da loja (Supabase), as imagens e tudo o que vem de outros sites NÃO são interceptados nem guardados aqui.
   Para forçar a atualização no telemóvel dos clientes, mude o número da versão abaixo. */
const VERSAO = 'royalty-v2';
const BASICOS = ['./', 'manifest.webmanifest', 'icon-192.png', 'icon-512.png'];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(VERSAO).then(c => c.addAll(BASICOS)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys()
      .then(ks => Promise.all(ks.filter(k => k !== VERSAO).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;           // Supabase, imagens, fontes: passam direto

  if (req.mode === 'navigate') {
    // só a loja (raiz, index.html, loja.html); outras páginas (p/, c/, admin.html) passam direto
    if (!/\/(index\.html|loja\.html)?$/.test(url.pathname)) return;
    e.respondWith(
      fetch(req)
        .then(res => {
          if (res.ok && !res.redirected) { const c = res.clone(); caches.open(VERSAO).then(ca => ca.put('./', c)); }
          return res;
        })
        .catch(() => caches.match('./'))
    );
    return;
  }

  // ícones e manifesto: cache primeiro
  if (/\/(icon-[\w-]+\.png|apple-touch-icon\.png|manifest\.webmanifest)$/.test(url.pathname)) {
    e.respondWith(caches.match(req).then(hit => hit || fetch(req)));
  }
});

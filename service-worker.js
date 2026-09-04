// service-worker.js
// نسخة الكاش - غيّرها (v2, v3...) في كل مرة تعدّل فيها index.html حتى يحدّث المستخدمون نسختهم
const CACHE_NAME = 'karras-cache-v1';

// الملفات التي يجب تجهيزها فوراً عند أول تثبيت (يحتاج إنترنت مرة واحدة فقط)
const PRECACHE_URLS = [
  './',
  './index.html',
  './manifest.json',
  './icon-192.png',
  './icon-512.png',
  'https://fonts.googleapis.com/css2?family=Amiri:wght@400;700&family=Cairo:wght@400;700;900&display=swap',
  'https://cdn.tailwindcss.com',
  'https://cdnjs.cloudflare.com/ajax/libs/html2pdf.js/0.10.1/html2pdf.bundle.min.js'
];

// عند التثبيت: نخزن كل شيء في الكاش. نتعامل مع كل رابط بشكل مستقل
// حتى لا يفشل التثبيت كاملاً بسبب رابط واحد بطيء (خصوصاً روابط الخطوط الديناميكية).
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(async (cache) => {
      await Promise.allSettled(
        PRECACHE_URLS.map((url) =>
          fetch(url, { mode: 'no-cors' })
            .then((res) => cache.put(url, res))
            .catch(() => null)
        )
      );
    }).then(() => self.skipWaiting())
  );
});

// تفعيل النسخة الجديدة فوراً وحذف الكاش القديم
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

// استراتيجية: من الكاش أولاً، وإن لم يوجد نجرب الشبكة، ثم نخزن أي شيء جديد يصل تلقائياً
// (هذا يغطي أيضاً ملفات الخطوط الفعلية من fonts.gstatic.com التي لا نعرف روابطها مسبقاً)
self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;

  event.respondWith(
    caches.match(event.request).then((cached) => {
      if (cached) return cached;

      return fetch(event.request)
        .then((response) => {
          const copy = response.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, copy).catch(() => null);
          });
          return response;
        })
        .catch(() => {
          // لا شبكة ولا كاش لهذا الملف تحديداً: نرجع الصفحة الرئيسية كحل أخير للتنقل
          if (event.request.mode === 'navigate') {
            return caches.match('./index.html');
          }
        });
    })
  );
});

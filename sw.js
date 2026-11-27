/**
 * 밸루스 아케이드 경량 오프라인 Service Worker (sw.js).
 * 외부 API/트래킹 0% · 정적 포털 셸 및 게임 번들을 로컬 캐싱해 모바일 재방문 시 0.1초 즉시 실행·오프라인 플레이를 지원한다.
 */
const CACHE_NAME = "valus-arcade-v1-4-0";

const CORE_ASSETS = [
  "./",
  "./index.html",
  "./play.html",
  "./manifest.json",
  "./css/portal.css",
  "./js/portal.js",
  "./data/games.json",
  "./data/patch_notes.json",
  "./assets/icon-192.png",
  "./assets/icon-512.png",
  "./assets/cover_neon-vanguard.png",
  "./assets/cover_core-merge-td.png",
  "./assets/cover_drill-to-core.png",
  "./assets/cover_neon-breaker.png",
  "./assets/cover_neon-drift.png",
  "./games/neon-vanguard/index.html",
  "./games/neon-vanguard/css/style.css",
  "./games/neon-vanguard/js/i18n.js",
  "./games/neon-vanguard/js/sdk_adapter.js",
  "./games/neon-vanguard/js/data.js",
  "./games/neon-vanguard/js/audio.js",
  "./games/neon-vanguard/js/engine.js",
  "./games/neon-vanguard/js/renderer.js",
  "./games/neon-vanguard/js/main.js",
  "./games/core-merge-td/index.html",
  "./games/core-merge-td/css/style.css",
  "./games/core-merge-td/js/game.js",
  "./games/drill-to-core/index.html",
  "./games/drill-to-core/css/style.css",
  "./games/drill-to-core/js/game.js",
  "./games/neon-breaker/index.html",
  "./games/neon-breaker/css/style.css",
  "./games/neon-breaker/js/game.js",
  "./games/neon-drift/index.html",
  "./games/neon-drift/css/style.css",
  "./games/neon-drift/js/game.js",
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(CORE_ASSETS)).then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

// 네트워크 우선 + 실패 시 캐시 폴백 (패치 즉시 반영 + 오프라인 무중단 플레이)
self.addEventListener("fetch", (event) => {
  if (event.request.method !== "GET") return;
  const reqUrl = new URL(event.request.url);
  if (reqUrl.origin !== self.location.origin) return;

  event.respondWith(
    fetch(event.request, { cache: "no-cache" })
      .then((res) => {
        if (res && res.status === 200 && res.type === "basic") {
          const clone = res.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone));
        }
        return res;
      })
      .catch(() => caches.match(event.request))
  );
});

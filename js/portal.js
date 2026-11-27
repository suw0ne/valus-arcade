/**
 * 밸루스 아케이드 포털 컨트롤러 (portal.js).
 * data/games.json 및 data/patch_notes.json을 읽어 메인 카탈로그, 장르 필터, 패치노트,
 * 극장 플레이어(play.html) 및 한/영 다국어 전환을 자동 렌더링한다.
 */
(function () {
  const UI_DICT = {
    ko: {
      navGames: "게임 목록",
      navPatch: "라이브 패치노트",
      navInfo: "이용안내",
      playNow: "지금 바로 플레이",
      installApp: "앱으로 설치 (PWA)",
      installDone: "앱 설치 완료",
      installGuideTitle: "홈 화면에 앱처럼 설치하기",
      installGuideBody: "<p><strong>안드로이드(Chrome/Edge):</strong> 브라우저 우측 상단 메뉴(⋮) → <strong>'홈 화면에 추가 / 앱 설치'</strong>를 누르면 주소창 없는 전체화면 앱으로 실행됩니다.</p><p><strong>아이폰(Safari):</strong> 하단 공유 버튼(□↑) → <strong>'홈 화면에 추가'</strong>를 누르면 오프라인에서도 바로 실행되는 앱 아이콘이 생성됩니다.</p>",
      valusLabLink: "밸루스 랩 무료 금융계산기 →",
      viewPatches: "최신 패치노트 보기",
      metaInstant: "0.2초 즉시 실행",
      metaDevice: "PC · 모바일 완벽 지원",
      metaPatch: "상시 신작·패치 업데이트",
      profileTitle: "내 아케이드 기록 & 트로피",
      profileNote: "회원가입 없이 브라우저 자동 저장",
      trophyDone: "달성",
      trophyLock: "도전",
      noRecord: "기록 없음",
      adSlotLabel: "[AD SLOT · Google AdSense / Kakao AdFit 반응형 광고 영역]",
      catalogTitle: "아케이드 라인업",
      catalogSub: "새로운 게임이 계속 추가되고 기존 게임은 플레이 피드백에 맞춰 꾸준히 패치됩니다.",
      genreAll: "전체",
      genreAction: "액션",
      genreStrategy: "전략·디펜스",
      genreArcade: "아케이드",
      patchTitle: "라이브 업데이트 & 패치노트",
      patchSub: "신규 게임 출시, 밸런스 패치, 신규 보스 및 시스템 개선 내역을 실시간으로 기록합니다.",
      footerCopy: "100% 자체 제작 HTML5 오리지널 웹게임 스튜디오 · 외부 개인정보 수집 없음",
      privacyTitle: "개인정보처리방침 · 포털 이용안내",
      playBtn: "▶ 바로 플레이",
      soonBtn: "개발 진행중",
      backPortal: "전체 게임 목록",
      reloadGame: "재시작",
      fullscreen: "전체화면",
      controlsTitle: "조작 방법",
      gamePatchTitle: "이 게임의 패치 이력",
      moreGames: "다른 게임 바로가기",
      policyBody:
        "<p><strong>1. 개인정보 수집 없음:</strong> 밸루스 아케이드의 모든 게임은 회원가입 없이 브라우저 로컬 저장소(localStorage)에만 게임 진행 기록을 저장하며, 별도 개인정보를 외부 서버로 전송하거나 수집하지 않습니다.</p>" +
        "<p><strong>2. 무료 운영 및 광고 안내:</strong> 모든 게임은 무료로 제공되며, 지속적인 신작 개발과 패치를 위해 선택형 보상 광고 및 디스플레이 광고 슬롯이 운영될 수 있습니다.</p>" +
        "<p><strong>3. 저작권:</strong> 본 포털의 모든 게임 코드, 벡터 그래픽, 프로시저럴 사운드는 100% 자체 창작 오리지널 콘텐츠입니다.</p>",
    },
    en: {
      navGames: "Games",
      navPatch: "Patch Notes",
      navInfo: "About",
      playNow: "Play Instantly",
      installApp: "Install App (PWA)",
      installDone: "App Installed",
      installGuideTitle: "Install as Standalone App",
      installGuideBody: "<p><strong>Android (Chrome/Edge):</strong> Tap browser menu (⋮) → <strong>'Install app / Add to Home screen'</strong> for fullscreen offline play.</p><p><strong>iPhone (Safari):</strong> Tap Share (□↑) → <strong>'Add to Home Screen'</strong> to launch like a native app.</p>",
      valusLabLink: "Valus Lab Free Finance Tools →",
      viewPatches: "View Patch Notes",
      metaInstant: "Instant Browser Play",
      metaDevice: "Desktop & Mobile Ready",
      metaPatch: "Live New Releases & Patches",
      profileTitle: "My Arcade Profile & Trophies",
      profileNote: "Auto-saved locally · No login required",
      trophyDone: "UNLOCKED",
      trophyLock: "TRY NOW",
      noRecord: "No record yet",
      adSlotLabel: "[AD SLOT · Responsive Ad Placement]",
      catalogTitle: "Arcade Lineup",
      catalogSub: "New HTML5 games drop continuously alongside live balance and content patches.",
      genreAll: "All",
      genreAction: "Action",
      genreStrategy: "Strategy / TD",
      genreArcade: "Arcade",
      patchTitle: "Live Updates & Patch Notes",
      patchSub: "Track every new game launch, balance tuning, and feature upgrade in real time.",
      footerCopy: "100% Original HTML5 Web Game Studio · Zero Personal Data Collection",
      privacyTitle: "Privacy & Portal Info",
      playBtn: "▶ PLAY NOW",
      soonBtn: "IN DEVELOPMENT",
      backPortal: "All Games",
      reloadGame: "Reload",
      fullscreen: "Fullscreen",
      controlsTitle: "Controls",
      gamePatchTitle: "Game Patch History",
      moreGames: "More Games",
      policyBody:
        "<p><strong>1. Privacy First:</strong> All progress is stored locally in your browser (localStorage). We do not collect personal information or upload user data.</p>" +
        "<p><strong>2. Free to Play:</strong> Games are 100% free to play and supported by non-intrusive display and optional rewarded ads.</p>" +
        "<p><strong>3. Original Content:</strong> All code, vector visuals, and procedural audio are original studio creations.</p>",
    },
  };

  let lang = localStorage.getItem("nv_lang") || "ko";
  let catalog = null;
  let patches = [];
  let currentGenre = "all";
  let deferredInstallPrompt = null;

  // PWA Service Worker 등록 (오프라인 캐시 및 앱 설치 활성화)
  if ("serviceWorker" in navigator && (location.protocol === "https:" || location.hostname === "127.0.0.1" || location.hostname === "localhost")) {
    window.addEventListener("load", () => {
      navigator.serviceWorker.register("./sw.js").catch(() => {});
    });
  }

  window.addEventListener("beforeinstallprompt", (e) => {
    e.preventDefault();
    deferredInstallPrompt = e;
  });

  const t = (k) => (UI_DICT[lang] && UI_DICT[lang][k]) || UI_DICT.ko[k] || k;
  const pick = (o) => (typeof o === "string" ? o : (o && (o[lang] || o.ko || o.en)) || "");

  function applyStaticI18n() {
    document.documentElement.lang = lang;
    document.querySelectorAll("[data-i18n]").forEach((el) => {
      el.textContent = t(el.getAttribute("data-i18n"));
    });
    const pt = document.getElementById("policy-text");
    if (pt) pt.innerHTML = t("policyBody");
  }

  function readLocalJson(key) {
    try {
      return JSON.parse(localStorage.getItem(key) || "{}");
    } catch (_) {
      return {};
    }
  }

  function renderProfileStrip() {
    const wrap = document.getElementById("profile-cards");
    const pill = document.getElementById("trophy-count-pill");
    if (!wrap || !pill) return;

    const nv = readLocalJson("nv_overdrive_save_v1");
    const td = readLocalJson("nv_merge_td_save_v1");
    const dr = readLocalJson("nv_drill_core_save_v1");
    const br = readLocalJson("nv_breaker_save_v1");

    const fmtSec = (sec) => {
      const s = Math.floor(sec || 0);
      return `${String(Math.floor(s / 60)).padStart(2, "0")}:${String(s % 60).padStart(2, "0")}`;
    };

    const entries = [
      {
        slug: "neon-vanguard",
        name: lang === "ko" ? "네온 뱅가드" : "NEON VANGUARD",
        val: (nv.bestTime || nv.bestKills) ? `${fmtSec(nv.bestTime)} · ${nv.bestKills || 0}K` : t("noRecord"),
        sub: lang === "ko" ? "트로피 조건: 60초 생존 또는 30처치" : "Trophy: 60s survival or 30 kills",
        unlocked: (nv.bestTime || 0) >= 60 || (nv.bestKills || 0) >= 30,
      },
      {
        slug: "core-merge-td",
        name: lang === "ko" ? "코어 머지 TD" : "CORE MERGE TD",
        val: td.bestWave ? `WAVE ${td.bestWave}` : t("noRecord"),
        sub: lang === "ko" ? "트로피 조건: 웨이브 3 도달" : "Trophy: Reach Wave 3",
        unlocked: (td.bestWave || 0) >= 3,
      },
      {
        slug: "drill-to-core",
        name: lang === "ko" ? "드릴 투 코어" : "DRILL TO CORE",
        val: dr.bestDepth ? `${dr.bestDepth}m` : t("noRecord"),
        sub: lang === "ko" ? "트로피 조건: 심도 250m 돌파" : "Trophy: Drill past 250m",
        unlocked: (dr.bestDepth || 0) >= 250,
      },
      {
        slug: "neon-breaker",
        name: lang === "ko" ? "네온 브레이커" : "NEON BREAKER",
        val: br.bestWave ? `STAGE ${br.bestWave}` : t("noRecord"),
        sub: lang === "ko" ? "트로피 조건: 스테이지 3 돌파" : "Trophy: Clear Stage 3",
        unlocked: (br.bestWave || 0) >= 3,
      },
    ];

    const unlockedCount = entries.filter((e) => e.unlocked).length;
    pill.textContent = lang === "ko"
      ? `🏆 트로피 ${unlockedCount} / ${entries.length}`
      : `🏆 Trophies ${unlockedCount} / ${entries.length}`;

    wrap.innerHTML = entries
      .map(
        (e) => `
        <a class="profile-card ${e.unlocked ? "unlocked" : ""}" href="play.html?game=${e.slug}">
          <div class="profile-card-top">
            <span class="profile-game">${e.name}</span>
            <span class="profile-trophy-tag">${e.unlocked ? `🏆 ${t("trophyDone")}` : t("trophyLock")}</span>
          </div>
          <div class="profile-val">${e.val}</div>
          <div class="profile-sub">${e.sub}</div>
        </a>
      `
      )
      .join("");
  }

  function renderIndexPage() {
    if (!catalog) return;
    const featured = catalog.games.find((g) => g.featured) || catalog.games[0];
    if (featured) {
      document.getElementById("hero-badge").textContent = pick(featured.badge);
      document.getElementById("hero-title").textContent = pick(featured.title);
      document.getElementById("hero-desc").textContent = pick(featured.shortDesc);
      document.getElementById("hero-img").src = featured.cover;
      document.getElementById("hero-play-btn").href = `play.html?game=${featured.slug}`;
    }

    renderProfileStrip();

    const grid = document.getElementById("games-grid");
    grid.innerHTML = "";
    const filtered = catalog.games.filter((g) => currentGenre === "all" || g.genre === currentGenre);
    filtered.forEach((g) => {
      const live = g.status === "live";
      const card = document.createElement("article");
      card.className = `game-card ${live ? "" : "soon"}`;
      card.innerHTML = `
        <div class="game-thumb-wrap">
          <img src="${g.cover}" alt="${pick(g.title)}" loading="lazy" />
          <span class="card-badge">${pick(g.badge)}</span>
        </div>
        <div class="card-body">
          <span class="card-genre">${pick(g.genreLabel)} · v${g.version}</span>
          <h3 class="card-title">${pick(g.title)}</h3>
          <p class="card-desc">${pick(g.shortDesc)}</p>
          <div class="tag-row">${(g.tags || []).map((tg) => `<span class="tag-pill">#${tg}</span>`).join("")}</div>
          <a class="card-cta ${live ? "" : "disabled"}" href="${live ? `play.html?game=${g.slug}` : "#"}">
            ${live ? t("playBtn") : t("soonBtn")}
          </a>
        </div>
      `;
      grid.appendChild(card);
    });

    const pList = document.getElementById("patch-list");
    pList.innerHTML = "";
    patches.forEach((p) => {
      const el = document.createElement("article");
      el.className = "patch-card";
      const items = (p.notes && (p.notes[lang] || p.notes.ko)) || [];
      el.innerHTML = `
        <div class="patch-head">
          <span class="patch-ver ${p.type === "release" ? "release" : ""}">${p.version}</span>
          <strong>${pick(p.gameTitle)}</strong>
          <span class="patch-date">${p.date}</span>
        </div>
        <ul class="patch-items">${items.map((n) => `<li>${n}</li>`).join("")}</ul>
      `;
      pList.appendChild(el);
    });
  }

  function renderPlayPage() {
    if (!catalog) return;
    const params = new URLSearchParams(window.location.search);
    const slug = params.get("game") || "neon-vanguard";
    const game = catalog.games.find((g) => g.slug === slug && g.status === "live") || catalog.games[0];

    document.title = `${pick(game.title)} | ${pick(catalog.portal.name)}`;
    document.getElementById("play-genre").textContent = pick(game.genreLabel);
    document.getElementById("play-title").textContent = pick(game.title);
    document.getElementById("play-version").textContent = `v${game.version}`;
    document.getElementById("play-controls").textContent = pick(game.controls);
    document.getElementById("play-desc").textContent = pick(game.shortDesc);

    const frame = document.getElementById("game-frame");
    if (frame.getAttribute("data-loaded-slug") !== game.slug) {
      frame.src = game.playUrl;
      frame.setAttribute("data-loaded-slug", game.slug);
    }

    const gp = document.getElementById("game-patch-history");
    const relPatches = patches.filter((p) => p.gameSlug === game.slug);
    gp.innerHTML = relPatches
      .map((p) => {
        const lines = (p.notes && (p.notes[lang] || p.notes.ko)) || [];
        return `<div><strong>${p.version}</strong> (${p.date})<ul>${lines.map((l) => `<li>${l}</li>`).join("")}</ul></div>`;
      })
      .join("");

    const related = document.getElementById("related-games");
    related.innerHTML = "";
    catalog.games
      .filter((g) => g.slug !== game.slug)
      .forEach((g) => {
        const live = g.status === "live";
        const a = document.createElement("a");
        a.className = "related-item";
        a.href = live ? `play.html?game=${g.slug}` : "index.html#games-section";
        a.innerHTML = `
          <img src="${g.cover}" alt="${pick(g.title)}" />
          <div>
            <strong>${pick(g.title)}</strong>
            <span>${pick(g.genreLabel)} · ${live ? `v${g.version}` : t("soonBtn")}</span>
          </div>
        `;
        related.appendChild(a);
      });
  }

  async function init() {
    const bust = Date.now();
    const [gRes, pRes] = await Promise.all([
      fetch(`data/games.json?v=${bust}`, { cache: "no-store" }),
      fetch(`data/patch_notes.json?v=${bust}`, { cache: "no-store" }),
    ]);
    catalog = await gRes.json();
    patches = await pRes.json();

    applyStaticI18n();
    const isPlay = document.body.classList.contains("play-page");
    if (isPlay) renderPlayPage();
    else renderIndexPage();

    const langBtn = document.getElementById("btn-lang");
    if (langBtn) {
      langBtn.onclick = () => {
        lang = lang === "ko" ? "en" : "ko";
        localStorage.setItem("nv_lang", lang);
        applyStaticI18n();
        if (isPlay) renderPlayPage();
        else renderIndexPage();
      };
    }

    if (!isPlay) {
      document.querySelectorAll(".filter-chip").forEach((btn) => {
        btn.onclick = () => {
          document.querySelectorAll(".filter-chip").forEach((b) => b.classList.remove("active"));
          btn.classList.add("active");
          currentGenre = btn.getAttribute("data-genre") || "all";
          renderIndexPage();
        };
      });
      const openPolicy = () => {
        document.querySelector("#policy-modal h3").textContent = t("privacyTitle");
        document.getElementById("policy-text").innerHTML = t("policyBody");
        document.getElementById("policy-modal").classList.remove("hidden");
      };
      const closePolicy = () => document.getElementById("policy-modal").classList.add("hidden");
      document.getElementById("btn-policy").onclick = openPolicy;
      document.getElementById("btn-privacy-footer").onclick = openPolicy;
      document.getElementById("btn-close-policy").onclick = closePolicy;

      const installBtn = document.getElementById("btn-install-pwa");
      if (installBtn) {
        installBtn.onclick = async () => {
          if (deferredInstallPrompt) {
            deferredInstallPrompt.prompt();
            const choice = await deferredInstallPrompt.userChoice;
            deferredInstallPrompt = null;
            if (choice && choice.outcome === "accepted") {
              installBtn.textContent = "✓ " + t("installDone");
              installBtn.disabled = true;
            }
          } else {
            document.querySelector("#policy-modal h3").textContent = t("installGuideTitle");
            document.getElementById("policy-text").innerHTML = t("installGuideBody");
            document.getElementById("policy-modal").classList.remove("hidden");
          }
        };
      }
    } else {
      document.getElementById("btn-reload-game").onclick = () => {
        const frame = document.getElementById("game-frame");
        frame.src = frame.src;
      };
      document.getElementById("btn-fullscreen").onclick = () => {
        const stage = document.getElementById("iframe-stage");
        if (stage.requestFullscreen) stage.requestFullscreen();
      };
    }
  }

  window.addEventListener("DOMContentLoaded", init);
})();

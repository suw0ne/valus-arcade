/**
 * 드릴 투 코어 (DRILL TO CORE) — 60fps 지하 굴착 & 머신 업그레이드 물리 아케이드.
 * 5개 지하 지층(0~1,200m 행성 코어), 6종 보석·광물, 용암/기반암 장애물, 터보 부스터 드릴,
 * 5대 머신 영구 업그레이드, 프로시저럴 Web Audio SFX, 모바일 터치·햅틱 및 CrazyGames/Poki SDK 지원.
 */
(function () {
  const SAVE_KEY = "nv_drill_core_save_v1";
  const CORE_TARGET_M = 1200;

  const I18N = {
    ko: {
      kicker: "PHYSICS DIGGING ARCADE",
      title: "드릴 투 코어",
      bestDepth: "최고 심도",
      dives: "총 탐사",
      coreGoal: "목표 심도",
      startDive: "지하 굴착 출격!",
      upgradeTitle: "드릴 머신 업그레이드",
      controlsHint: "좌우 이동: A/D · 방향키 · 드래그 | 터보: SPACE",
      fuel: "연료",
      hull: "내구도",
      fuelOutTitle: "연료 고갈!",
      hullOutTitle: "드릴 파손 위기!",
      fuelOutDesc: "긴급 보급으로 연료와 내구도를 65% 충전하고 지금 심도에서 계속 파고들 수 있습니다!",
      rescueAd: "광고 보고 긴급 충전 + 계속 굴착 (1회)",
      returnSurface: "지상으로 귀환 · 광물 정산",
      summaryTitle: "지상 귀환 정산",
      coreVictory: "행성 코어 1,200m 돌파 성공!",
      reachedDepth: "도달 심도",
      minedOres: "채굴 광물",
      earnedCash: "광물 판매 수익",
      doubleCashAd: "광고 보고 판매 수익 2배 수령",
      doubleDone: "2배 정산 완료!",
      goUpgrade: "업그레이드 · 재출격",
      adDesc: "포털 배포 시 실제 보상형 광고가 재생됩니다.",
      maxed: "최대 레벨",
      buy: "강화",
      layers: ["표토 지대", "현무암 암반층", "크리스탈 동굴", "마그마 맨틀", "행성 코어"],
    },
    en: {
      kicker: "PHYSICS DIGGING ARCADE",
      title: "DRILL TO CORE",
      bestDepth: "BEST DEPTH",
      dives: "TOTAL DIVES",
      coreGoal: "CORE GOAL",
      startDive: "LAUNCH DRILL RIG!",
      upgradeTitle: "DRILL RIG UPGRADES",
      controlsHint: "Steer: A/D · Arrows · Drag | Turbo: SPACE",
      fuel: "FUEL",
      hull: "HULL",
      fuelOutTitle: "OUT OF FUEL!",
      hullOutTitle: "HULL CRITICAL!",
      fuelOutDesc: "Call Emergency Drop to restore 65% Fuel & Hull and keep drilling from this depth!",
      rescueAd: "WATCH AD · EMERGENCY REFILL (1x)",
      returnSurface: "RETURN & SELL ORES",
      summaryTitle: "SURFACE CASH-OUT",
      coreVictory: "PLANETARY CORE REACHED!",
      reachedDepth: "DEPTH REACHED",
      minedOres: "ORES MINED",
      earnedCash: "ORE PAYOUT",
      doubleCashAd: "WATCH AD · 2X PAYOUT",
      doubleDone: "2X BONUS CLAIMED!",
      goUpgrade: "UPGRADE & DIVE AGAIN",
      adDesc: "Real portal rewarded video plays on CrazyGames/Poki.",
      maxed: "MAXED",
      buy: "UPGRADE",
      layers: ["Topsoil Crust", "Basalt Stratum", "Crystal Cavern", "Magma Mantle", "Planetary Core"],
    },
  };

  const UPGRADES = [
    { id: "drill", icon: "🔩", name: { ko: "초경 드릴 비트", en: "Drill Bit" }, desc: { ko: "굴착 속도 +18% & 암석 관통", en: "+18% Drill Power & Speed" }, maxLv: 6, base: 70, step: 95 },
    { id: "fuel", icon: "⛽", name: { ko: "대용량 연료탱크", en: "Fuel Tank" }, desc: { ko: "최대 연료 +32% (더 깊은 심도)", en: "+32% Max Fuel Capacity" }, maxLv: 6, base: 65, step: 90 },
    { id: "engine", icon: "⚡", name: { ko: "추진 스티어링", en: "Thruster Engine" }, desc: { ko: "좌우 회피 기동 +14% & 터보 강화", en: "+14% Steering & Turbo" }, maxLv: 6, base: 60, step: 85 },
    { id: "cargo", icon: "💎", name: { ko: "광물 정제기", en: "Ore Refiner" }, desc: { ko: "모든 광물 판매 수익 +25%", en: "+25% Ore Sale Value" }, maxLv: 6, base: 80, step: 110 },
    { id: "armor", icon: "🛡️", name: { ko: "내열 티타늄 장갑", en: "Heat Armor" }, desc: { ko: "최대 내구도 +28% & 용암 방어", en: "+28% Max Hull & Heat Shield" }, maxLv: 6, base: 70, step: 95 },
  ];

  const ORES = [
    { name: "copper", minM: 0, val: 16, color: "#fb923c", r: 13 },
    { name: "silver", minM: 120, val: 32, color: "#cbd5e1", r: 14 },
    { name: "gold", minM: 280, val: 60, color: "#facc15", r: 15 },
    { name: "emerald", minM: 480, val: 110, color: "#4ade80", r: 16 },
    { name: "ruby", minM: 720, val: 190, color: "#f43f5e", r: 17 },
    { name: "diamond", minM: 940, val: 340, color: "#38bdf8", r: 18 },
  ];

  const LAYER_THEMES = [
    { minM: 0, bgTop: "#271b14", bgBot: "#1b120e", grid: "rgba(251,146,60,0.08)" },
    { minM: 250, bgTop: "#1f2430", bgBot: "#141824", grid: "rgba(148,163,184,0.09)" },
    { minM: 550, bgTop: "#132238", bgBot: "#0c1428", grid: "rgba(56,189,248,0.11)" },
    { minM: 850, bgTop: "#321318", bgBot: "#1b090d", grid: "rgba(244,63,94,0.12)" },
    { minM: 1120, bgTop: "#2b1c08", bgBot: "#120c05", grid: "rgba(250,204,21,0.15)" },
  ];

  let lang = localStorage.getItem("nv_lang") || "ko";
  const t = (k) => (I18N[lang] && I18N[lang][k]) || I18N.ko[k] || k;
  const pick = (o) => (typeof o === "string" ? o : (o && (o[lang] || o.ko)) || "");

  function haptic(pattern) {
    try { if (navigator.vibrate) navigator.vibrate(pattern); } catch (_) {}
  }

  const SFX = {
    ctx: null,
    on: true,
    unlock() {
      if (!this.ctx) {
        const AC = window.AudioContext || window.webkitAudioContext;
        if (AC) this.ctx = new AC();
      }
      if (this.ctx && this.ctx.state === "suspended") this.ctx.resume().catch(() => {});
    },
    tone(f1, f2, dur, type = "triangle", vol = 0.08) {
      if (!this.on || !this.ctx || this.ctx.state !== "running") return;
      const now = this.ctx.currentTime;
      const o = this.ctx.createOscillator();
      const g = this.ctx.createGain();
      o.type = type;
      o.frequency.setValueAtTime(f1, now);
      o.frequency.exponentialRampToValueAtTime(Math.max(40, f2), now + dur);
      g.gain.setValueAtTime(vol, now);
      g.gain.exponentialRampToValueAtTime(0.001, now + dur);
      o.connect(g);
      g.connect(this.ctx.destination);
      o.start(now);
      o.stop(now + dur + 0.01);
    },
  };

  function showRewarded(onOk) {
    if (window.CrazyGames?.SDK?.ad) {
      window.CrazyGames.SDK.ad.requestAd("rewarded", { adFinished: onOk, adError: () => {} });
      return;
    }
    if (window.PokiSDK) {
      window.PokiSDK.rewardedBreak().then((ok) => { if (ok) onOk(); });
      return;
    }
    const modal = document.getElementById("ad-modal");
    const bar = document.getElementById("ad-bar");
    const timer = document.getElementById("ad-timer");
    modal.classList.remove("hidden");
    let left = 2.0;
    const iv = setInterval(() => {
      left = Math.max(0, left - 0.1);
      bar.style.width = `${((2.0 - left) / 2.0) * 100}%`;
      timer.textContent = `${left.toFixed(1)}s`;
      if (left <= 0) {
        clearInterval(iv);
        modal.classList.add("hidden");
        onOk();
      }
    }, 100);
  }

  function loadSave() {
    const base = { wallet: 120, bestDepth: 0, dives: 0, up: { drill: 0, fuel: 0, engine: 0, cargo: 0, armor: 0 } };
    try {
      const raw = localStorage.getItem(SAVE_KEY);
      if (raw) {
        const p = JSON.parse(raw);
        return { ...base, ...p, up: { ...base.up, ...(p.up || {}) } };
      }
    } catch (_) {}
    return base;
  }

  let save = loadSave();
  function persist() {
    try { localStorage.setItem(SAVE_KEY, JSON.stringify(save)); } catch (_) {}
  }

  const canvas = document.getElementById("drill-canvas");
  const ctx = canvas.getContext("2d");
  let W = 900, H = 640, dpr = 1;

  let state = "hangar"; // hangar | diving | rescue | summary
  const keys = {};
  let dragTargetX = null;

  let rig = {};
  let depthPx = 0;
  let depthM = 0;
  let layerIdx = 0;
  let runCash = 0;
  let minedCount = 0;
  let rescuedOnce = false;
  let doubledCash = false;
  let reachedCore = false;
  let shake = 0;
  let bannerTimer = 0;
  let items = []; // ores, rocks, magma, fuel_can
  let particles = [];
  let floatTexts = [];
  let nextSpawnY = 0;
  let trailPts = [];
  let combo = 0;
  let comboTimer = 0;
  let magnetTimer = 0;
  let shieldCount = 0;

  function resize() {
    const rect = canvas.parentElement.getBoundingClientRect();
    W = Math.max(320, Math.floor(rect.width));
    H = Math.max(320, Math.floor(rect.height));
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = Math.floor(W * dpr);
    canvas.height = Math.floor(H * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }

  function getLayerIndex(m) {
    let idx = 0;
    for (let i = 0; i < LAYER_THEMES.length; i++) {
      if (m >= LAYER_THEMES[i].minM) idx = i;
    }
    return idx;
  }

  function showBanner(text) {
    const el = document.getElementById("layer-banner");
    el.textContent = text;
    el.classList.remove("hidden");
    bannerTimer = 2.4;
  }

  function startDive() {
    SFX.unlock();
    save.dives++;
    persist();

    const up = save.up;
    const maxFuel = 100 * (1 + up.fuel * 0.32);
    const maxHull = 100 * (1 + up.armor * 0.28);

    rig = {
      x: W / 2,
      y: H * 0.34,
      vx: 0,
      tilt: 0,
      r: 20,
      fuel: maxFuel,
      maxFuel,
      hull: maxHull,
      maxHull,
      drillSpeed: 145 * (1 + up.drill * 0.18),
      steerSpeed: 330 * (1 + up.engine * 0.14),
      cargoMult: 1 + up.cargo * 0.25,
      boostTime: 0,
      boostCd: 0,
      invuln: 0,
    };

    depthPx = 0;
    depthM = 0;
    layerIdx = 0;
    runCash = 0;
    minedCount = 0;
    rescuedOnce = false;
    doubledCash = false;
    reachedCore = false;
    shake = 0;
    items = [];
    particles = [];
    floatTexts = [];
    trailPts = [];
    combo = 0;
    comboTimer = 0;
    magnetTimer = 0;
    shieldCount = 0;
    // 초반 2초간은 안전한 환영 광물만 배치해 즉시 채굴 쾌감 제공 (즉사 충돌 방지)
    const startY = Math.round(rig.y + 180);
    items.push({ kind: "ore", x: W / 2, y: startY, r: 14, val: 18, color: "#fb923c" });
    items.push({ kind: "ore", x: W / 2 - 55, y: startY + 75, r: 14, val: 18, color: "#fb923c" });
    items.push({ kind: "ore", x: W / 2 + 55, y: startY + 75, r: 14, val: 18, color: "#fb923c" });
    nextSpawnY = startY + 170;

    for (let y = nextSpawnY; y < H + 480; y += 78) {
      spawnRow(y);
      nextSpawnY = y + 78;
    }

    state = "diving";
    document.getElementById("hangar-screen").classList.add("hidden");
    document.getElementById("summary-modal").classList.add("hidden");
    document.getElementById("rescue-modal").classList.add("hidden");
    document.getElementById("hud").classList.remove("hidden");
    document.getElementById("btn-boost").classList.remove("hidden");
    showBanner(`⬇ ${t("layers")[0]}`);
    if (window.CrazyGames?.SDK?.game) window.CrazyGames.SDK.game.gameplayStart();
  }

  function spawnRow(worldY) {
    const m = worldY / 18;
    const count = 2 + Math.floor(Math.random() * 3);
    const margin = 52;
    const placed = [];
    for (let i = 0; i < count; i++) {
      // 광물·암석 겹침 방지 최소 거리 확보 (58px 이상)
      let x = margin + Math.random() * (W - margin * 2);
      let y = worldY + (Math.random() - 0.5) * 32;
      let valid = false;
      for (let tries = 0; tries < 8; tries++) {
        if (placed.every((p) => Math.hypot(p.x - x, p.y - y) >= 58)) {
          valid = true;
          break;
        }
        x = margin + Math.random() * (W - margin * 2);
      }
      if (!valid) continue;
      placed.push({ x, y });

      const roll = Math.random();
      if (roll < 0.045 && m > 100) {
        // 희귀 유물 캡슐 (자석 오라 또는 에너지 실드)
        items.push({ kind: "relic", subtype: Math.random() < 0.55 ? "magnet" : "shield", x, y, r: 16, color: "#c084fc" });
      } else if (roll < 0.11 && m > 80) {
        items.push({ kind: "fuel", x, y, r: 15, color: "#4ade80" });
      } else if (roll < 0.36 + Math.min(0.22, m / 2600)) {
        const isMagma = m > 300 && Math.random() < 0.38;
        items.push({
          kind: isMagma ? "magma" : "rock",
          x,
          y,
          r: isMagma ? 22 : 20 + Math.random() * 9,
          dmg: isMagma ? 26 : 14,
          color: isMagma ? "#ef4444" : "#475569",
        });
      } else {
        const avail = ORES.filter((o) => m >= o.minM);
        const ore = avail[Math.min(avail.length - 1, Math.floor(Math.random() * avail.length))];
        items.push({ kind: "ore", x, y, r: ore.r, val: ore.val, color: ore.color });
      }
    }
  }

  function triggerBoost() {
    if (state !== "diving" || rig.boostCd > 0 || rig.boostTime > 0) return;
    rig.boostTime = 2.1 + save.up.engine * 0.2;
    rig.boostCd = Math.max(4.5, 7.5 - save.up.engine * 0.45);
    shake = Math.max(shake, 8);
    SFX.tone(220, 740, 0.22, "sawtooth", 0.11);
    haptic(25);
  }

  function finishDive(isVictory = false) {
    state = "summary";
    reachedCore = isVictory;
    if (isVictory) runCash += 1200;
    const finalM = Math.floor(depthM);
    if (finalM > save.bestDepth) save.bestDepth = finalM;
    save.wallet += runCash;
    persist();

    document.getElementById("rescue-modal").classList.add("hidden");
    document.getElementById("btn-boost").classList.add("hidden");
    document.getElementById("sum-title").textContent = isVictory ? t("coreVictory") : t("summaryTitle");
    document.getElementById("sum-depth").textContent = `${finalM.toLocaleString()}m`;
    document.getElementById("sum-ores").textContent = minedCount.toLocaleString();
    document.getElementById("sum-cash").textContent = `+${runCash.toLocaleString()}`;
    const dbl = document.getElementById("btn-double-cash");
    dbl.disabled = doubledCash || runCash <= 0;
    document.getElementById("double-txt").textContent = doubledCash ? t("doubleDone") : t("doubleCashAd");
    document.getElementById("summary-modal").classList.remove("hidden");
    if (window.CrazyGames?.SDK?.game) window.CrazyGames.SDK.game.gameplayStop();
  }

  function update(dt) {
    if (bannerTimer > 0) {
      bannerTimer -= dt;
      if (bannerTimer <= 0) document.getElementById("layer-banner").classList.add("hidden");
    }
    if (state !== "diving") return;
    dt = Math.min(dt, 0.05);

    if (rig.invuln > 0) rig.invuln -= dt;
    if (rig.boostCd > 0) rig.boostCd = Math.max(0, rig.boostCd - dt);
    if (comboTimer > 0) {
      comboTimer -= dt;
      if (comboTimer <= 0) combo = 0;
    }
    if (magnetTimer > 0) magnetTimer = Math.max(0, magnetTimer - dt);
    const boosting = rig.boostTime > 0;
    if (boosting) rig.boostTime = Math.max(0, rig.boostTime - dt);

    // 좌우 조종
    let dir = 0;
    if (keys["KeyA"] || keys["ArrowLeft"]) dir -= 1;
    if (keys["KeyD"] || keys["ArrowRight"]) dir += 1;
    if (dir === 0 && dragTargetX !== null) {
      const diff = dragTargetX - rig.x;
      if (Math.abs(diff) > 8) dir = Math.max(-1, Math.min(1, diff / 45));
    }

    rig.vx += (dir * rig.steerSpeed - rig.vx) * Math.min(1, dt * 14);
    rig.x = Math.max(28, Math.min(W - 28, rig.x + rig.vx * dt));
    rig.tilt = rig.vx / 480;

    // 하강 굴착 속도 및 연료 소모
    const curSpeed = rig.drillSpeed * (boosting ? 2.15 : 1.0);
    depthPx += curSpeed * dt;
    depthM = depthPx / 18;

    const fuelDrain = (boosting ? 2.5 : 5.4) * (1 + depthM * 0.0004);
    rig.fuel = Math.max(0, rig.fuel - fuelDrain * dt);

    // 지층 변화 감지
    const newLayer = getLayerIndex(depthM);
    if (newLayer > layerIdx) {
      layerIdx = newLayer;
      showBanner(`⬇ ${t("layers")[layerIdx]} (${Math.floor(depthM)}m)`);
      SFX.tone(330, 660, 0.25, "triangle", 0.1);
    }

    // 1,200m 행성 코어 돌파 승리!
    if (depthM >= CORE_TARGET_M) {
      SFX.tone(520, 1040, 0.35, "triangle", 0.14);
      haptic([30, 30, 80]);
      finishDive(true);
      return;
    }

    // 굴착 터널 트레일 & 파편 파티클
    const rigWorldY = depthPx + rig.y;
    trailPts.push({ x: rig.x, y: rigWorldY, r: boosting ? 32 : 24 });
    if (trailPts.length > 70) trailPts.shift();

    if (Math.random() < (boosting ? 0.9 : 0.45)) {
      particles.push({
        x: rig.x + (Math.random() - 0.5) * 18,
        y: rigWorldY + 14,
        vx: (Math.random() - 0.5) * 140,
        vy: -50 - Math.random() * 110,
        r: 2.5 + Math.random() * 3,
        color: boosting ? "#facc15" : "#94a3b8",
        life: 0.35,
        maxLife: 0.35,
      });
    }

    // 신규 지층 행 스폰
    while (nextSpawnY < rigWorldY + H) {
      spawnRow(nextSpawnY);
      nextSpawnY += Math.max(58, 82 - depthM * 0.015);
    }

    // 충돌 및 자석 오라 판정
    for (let i = items.length - 1; i >= 0; i--) {
      const it = items[i];
      if (it.y < depthPx - 120) {
        items.splice(i, 1);
        continue;
      }
      // 자석 오라 활성 시 주변 광물·연료 자동 흡수
      if (magnetTimer > 0 && (it.kind === "ore" || it.kind === "fuel")) {
        const md = Math.hypot(rig.x - it.x, rigWorldY - it.y);
        if (md < 220 && md > 1) {
          it.x += ((rig.x - it.x) / md) * 460 * dt;
          it.y += ((rigWorldY - it.y) / md) * 460 * dt;
        }
      }
      const d = Math.hypot(it.x - rig.x, it.y - rigWorldY);
      if (d < it.r + rig.r + (boosting ? 10 : 0)) {
        if (it.kind === "ore") {
          combo++;
          comboTimer = 1.65;
          const comboMult = combo >= 8 ? 2.5 : combo >= 5 ? 1.8 : combo >= 3 ? 1.35 : 1.0;
          const earned = Math.round(it.val * rig.cargoMult * comboMult);
          runCash += earned;
          minedCount++;
          const label = combo >= 3 ? `+${earned} (x${comboMult})` : `+${earned}`;
          floatTexts.push({ x: it.x, y: it.y, text: label, color: combo >= 5 ? "#facc15" : it.color, life: 0.75, maxLife: 0.75 });
          for (let k = 0; k < (combo >= 5 ? 12 : 8); k++) {
            const a = Math.random() * Math.PI * 2;
            particles.push({ x: it.x, y: it.y, vx: Math.cos(a) * 140, vy: Math.sin(a) * 140, r: 3.5, color: it.color, life: 0.35, maxLife: 0.35 });
          }
          SFX.tone(540 + Math.min(10, combo) * 65, 920 + Math.min(10, combo) * 55, 0.09, "sine", 0.08);
          items.splice(i, 1);
        } else if (it.kind === "relic") {
          if (it.subtype === "magnet") {
            magnetTimer = 8.0;
            showBanner(lang === "ko" ? "🧲 자석 오라 발동 (8초 광물 자동 흡수!)" : "🧲 MAGNET AURA ACTIVE (8s)");
          } else {
            shieldCount = Math.min(2, shieldCount + 1);
            showBanner(lang === "ko" ? "🛡️ 플라즈마 실드 장착 (충돌 1회 방어!)" : "🛡️ PLASMA SHIELD EQUIPPED");
          }
          SFX.tone(480, 1080, 0.22, "triangle", 0.12);
          haptic(25);
          items.splice(i, 1);
        } else if (it.kind === "fuel") {
          rig.fuel = Math.min(rig.maxFuel, rig.fuel + rig.maxFuel * 0.28);
          floatTexts.push({ x: it.x, y: it.y, text: "+FUEL", color: "#4ade80", life: 0.8, maxLife: 0.8 });
          SFX.tone(440, 880, 0.14, "triangle", 0.1);
          items.splice(i, 1);
        } else {
          // 암석 / 용암 충돌
          if (boosting) {
            runCash += 18;
            shake = Math.max(shake, 5);
            floatTexts.push({ x: it.x, y: it.y, text: "SMASH +18", color: "#facc15", life: 0.6, maxLife: 0.6 });
            SFX.tone(260, 90, 0.1, "sawtooth", 0.08);
            items.splice(i, 1);
          } else if (shieldCount > 0) {
            shieldCount--;
            rig.invuln = 0.6;
            shake = 6;
            floatTexts.push({ x: it.x, y: it.y, text: "SHIELD BLOCK!", color: "#c084fc", life: 0.75, maxLife: 0.75 });
            SFX.tone(620, 310, 0.14, "triangle", 0.1);
            haptic(20);
            items.splice(i, 1);
          } else if (rig.invuln <= 0) {
            combo = 0;
            const dmg = it.dmg * Math.max(0.45, 1 - save.up.armor * 0.08);
            rig.hull = Math.max(0, rig.hull - dmg);
            rig.invuln = 0.65;
            shake = 11;
            SFX.tone(140, 55, 0.18, "sawtooth", 0.13);
            haptic(40);
            floatTexts.push({ x: it.x, y: it.y, text: `-${Math.round(dmg)}`, color: "#f43f5e", life: 0.7, maxLife: 0.7 });
            items.splice(i, 1);
          }
        }
      }
    }

    // 이펙트 갱신
    shake = Math.max(0, shake - dt * 26);
    for (let i = particles.length - 1; i >= 0; i--) {
      const pt = particles[i];
      pt.life -= dt;
      pt.x += pt.vx * dt;
      pt.y += pt.vy * dt;
      if (pt.life <= 0) particles.splice(i, 1);
    }
    for (let i = floatTexts.length - 1; i >= 0; i--) {
      floatTexts[i].life -= dt;
      floatTexts[i].y -= 45 * dt;
      if (floatTexts[i].life <= 0) floatTexts.splice(i, 1);
    }

    // 연료 고갈 또는 내구도 0 체크
    if (rig.fuel <= 0 || rig.hull <= 0) {
      if (!rescuedOnce) {
        state = "rescue";
        document.getElementById("rescue-title").textContent = rig.hull <= 0 ? t("hullOutTitle") : t("fuelOutTitle");
        document.getElementById("rescue-modal").classList.remove("hidden");
      } else {
        finishDive(false);
      }
    }

    syncHud();
  }

  function render() {
    const theme = LAYER_THEMES[layerIdx] || LAYER_THEMES[0];
    const grad = ctx.createLinearGradient(0, 0, 0, H);
    grad.addColorStop(0, theme.bgTop);
    grad.addColorStop(1, theme.bgBot);
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, W, H);

    const sx = (Math.random() - 0.5) * shake;
    const sy = (Math.random() - 0.5) * shake;

    ctx.save();
    ctx.translate(sx, sy);

    // 깊이 스크롤 지층 그리드
    const step = 64;
    const offY = -(depthPx % step);
    ctx.strokeStyle = theme.grid;
    ctx.lineWidth = 1;
    ctx.beginPath();
    for (let x = 0; x < W; x += step) {
      ctx.moveTo(x, 0);
      ctx.lineTo(x, H);
    }
    for (let y = offY; y < H + step; y += step) {
      ctx.moveTo(0, y);
      ctx.lineTo(W, y);
    }
    ctx.stroke();

    // 지나온 굴착 터널 흔적
    if (trailPts.length > 1) {
      ctx.fillStyle = "rgba(4, 3, 8, 0.52)";
      for (const tp of trailPts) {
        const syPos = tp.y - depthPx;
        if (syPos < -40 || syPos > H + 40) continue;
        ctx.beginPath();
        ctx.arc(tp.x, syPos, tp.r, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    // 광물·장애물·연료통
    for (const it of items) {
      const y = it.y - depthPx;
      if (y < -40 || y > H + 40) continue;
      ctx.save();
      ctx.translate(it.x, y);
      ctx.fillStyle = it.color;
      ctx.shadowBlur = it.kind === "rock" ? 0 : 14;
      ctx.shadowColor = it.color;
      if (it.kind === "ore") {
        ctx.rotate(Math.PI / 4);
        ctx.fillRect(-it.r * 0.72, -it.r * 0.72, it.r * 1.44, it.r * 1.44);
        ctx.strokeStyle = "#ffffff";
        ctx.lineWidth = 1.6;
        ctx.strokeRect(-it.r * 0.72, -it.r * 0.72, it.r * 1.44, it.r * 1.44);
      } else if (it.kind === "relic") {
        ctx.beginPath();
        ctx.arc(0, 0, it.r, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = "#f5d0fe";
        ctx.lineWidth = 2;
        ctx.stroke();
        ctx.fillStyle = "#ffffff";
        ctx.font = "900 13px sans-serif";
        ctx.textAlign = "center";
        ctx.fillText(it.subtype === "magnet" ? "M" : "S", 0, 5);
      } else if (it.kind === "fuel") {
        ctx.beginPath();
        ctx.roundRect(-12, -14, 24, 28, 6);
        ctx.fill();
        ctx.fillStyle = "#052e16";
        ctx.font = "900 13px sans-serif";
        ctx.textAlign = "center";
        ctx.fillText("F", 0, 5);
      } else if (it.kind === "magma") {
        ctx.beginPath();
        ctx.arc(0, 0, it.r, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = "#facc15";
        ctx.beginPath();
        ctx.arc(0, 0, it.r * 0.45, 0, Math.PI * 2);
        ctx.fill();
      } else {
        ctx.beginPath();
        for (let k = 0; k < 6; k++) {
          const a = (Math.PI * 2 * k) / 6;
          const px = Math.cos(a) * it.r;
          const py = Math.sin(a) * it.r;
          if (k === 0) ctx.moveTo(px, py);
          else ctx.lineTo(px, py);
        }
        ctx.closePath();
        ctx.fill();
        ctx.strokeStyle = "#94a3b8";
        ctx.lineWidth = 2;
        ctx.stroke();
      }
      ctx.restore();
    }

    // 드릴 머신 본체 렌더링
    if (state === "diving" || state === "rescue") {
      ctx.save();
      ctx.translate(rig.x, rig.y);
      ctx.rotate(-rig.tilt * 0.6);
      const boosting = rig.boostTime > 0;
      if (rig.invuln > 0 && Math.floor(Date.now() / 60) % 2 === 0) ctx.globalAlpha = 0.55;

      // 상단 부스터 불꽃
      ctx.fillStyle = boosting ? "#facc15" : "#fb923c";
      ctx.shadowBlur = 18;
      ctx.shadowColor = boosting ? "#facc15" : "#fb923c";
      ctx.beginPath();
      ctx.moveTo(-10, -18);
      ctx.lineTo(10, -18);
      ctx.lineTo(0, -34 - Math.random() * (boosting ? 24 : 10));
      ctx.closePath();
      ctx.fill();

      // 동체
      ctx.fillStyle = boosting ? "#f59e0b" : "#38bdf8";
      ctx.strokeStyle = "#ffffff";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.roundRect(-16, -20, 32, 26, 8);
      ctx.fill();
      ctx.stroke();

      // 회전 드릴 원뿔
      ctx.fillStyle = boosting ? "#fef08a" : "#e2e8f0";
      ctx.beginPath();
      ctx.moveTo(-15, 6);
      ctx.lineTo(15, 6);
      ctx.lineTo(0, 34);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();

      // 자석 오라 / 플라즈마 실드 시각 링
      if (magnetTimer > 0) {
        ctx.strokeStyle = "rgba(56,189,248,0.55)";
        ctx.lineWidth = 2;
        ctx.setLineDash([6, 6]);
        ctx.beginPath();
        ctx.arc(0, 0, 44 + Math.sin(Date.now() * 0.01) * 5, 0, Math.PI * 2);
        ctx.stroke();
        ctx.setLineDash([]);
      }
      if (shieldCount > 0) {
        ctx.strokeStyle = "#c084fc";
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.arc(0, 4, 34, 0, Math.PI * 2);
        ctx.stroke();
      }
      ctx.restore();
    }

    // 우측 세로 행성 심도 미니맵 (0m → 1,200m CORE)
    if (state === "diving" || state === "rescue") {
      const mx = W - 18;
      const my = 112;
      const mh = Math.max(140, H - 245);
      ctx.save();
      ctx.fillStyle = "rgba(15,23,42,0.75)";
      ctx.beginPath();
      ctx.roundRect(mx - 5, my, 10, mh, 5);
      ctx.fill();
      const segCols = ["#fb923c", "#94a3b8", "#38bdf8", "#f43f5e", "#facc15"];
      for (let s = 0; s < 5; s++) {
        ctx.fillStyle = segCols[s];
        ctx.globalAlpha = 0.55;
        ctx.fillRect(mx - 3, my + (mh / 5) * s + 2, 6, mh / 5 - 3);
      }
      ctx.globalAlpha = 1;
      const prog = Math.min(1, depthM / CORE_TARGET_M);
      const py = my + prog * mh;
      ctx.fillStyle = "#ffffff";
      ctx.shadowBlur = 10;
      ctx.shadowColor = "#38bdf8";
      ctx.beginPath();
      ctx.arc(mx, py, 6, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }

    // 파티클 & 플로팅 텍스트
    for (const pt of particles) {
      ctx.save();
      ctx.globalAlpha = Math.max(0, pt.life / pt.maxLife);
      ctx.fillStyle = pt.color;
      ctx.beginPath();
      ctx.arc(pt.x, pt.y - depthPx, pt.r, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }
    ctx.textAlign = "center";
    for (const ft of floatTexts) {
      ctx.save();
      ctx.globalAlpha = Math.max(0, ft.life / ft.maxLife);
      ctx.font = "900 15px sans-serif";
      ctx.fillStyle = "#000";
      ctx.fillText(ft.text, ft.x + 1, ft.y - depthPx + 1);
      ctx.fillStyle = ft.color;
      ctx.fillText(ft.text, ft.x, ft.y - depthPx);
      ctx.restore();
    }

    ctx.restore();
  }

  function syncHud() {
    document.getElementById("ui-depth").textContent = `${Math.floor(depthM).toLocaleString()}m`;
    document.getElementById("ui-layer").textContent = t("layers")[layerIdx];
    document.getElementById("ui-run-cash").textContent = runCash.toLocaleString();
    const fPct = Math.max(0, Math.ceil((rig.fuel / rig.maxFuel) * 100));
    const hPct = Math.max(0, Math.ceil((rig.hull / rig.maxHull) * 100));
    document.getElementById("ui-fuel-txt").textContent = `${fPct}%`;
    document.getElementById("ui-hull-txt").textContent = `${hPct}%`;
    document.getElementById("ui-fuel-bar").style.width = `${fPct}%`;
    document.getElementById("ui-hull-bar").style.width = `${hPct}%`;

    const cdRatio = rig.boostCd > 0 ? Math.min(1, rig.boostCd / 7.5) : 0;
    document.getElementById("boost-mask").style.height = `${cdRatio * 100}%`;
    document.getElementById("boost-txt").textContent = rig.boostTime > 0 ? "ON!" : cdRatio > 0 ? `${rig.boostCd.toFixed(1)}s` : "BOOST";
  }

  function renderHangar() {
    document.getElementById("ui-wallet").textContent = save.wallet.toLocaleString();
    document.getElementById("ui-best-depth").textContent = `${save.bestDepth.toLocaleString()}m`;
    document.getElementById("ui-dives").textContent = save.dives.toLocaleString();

    const grid = document.getElementById("upgrade-grid");
    grid.innerHTML = "";
    UPGRADES.forEach((u) => {
      const lv = save.up[u.id] || 0;
      const cost = u.base + lv * u.step;
      const maxed = lv >= u.maxLv;
      const canBuy = !maxed && save.wallet >= cost;
      const el = document.createElement("div");
      el.className = "up-card";
      el.innerHTML = `
        <div class="up-top"><span>${u.icon} ${pick(u.name)}</span><span class="up-lv">LV ${lv}/${u.maxLv}</span></div>
        <div class="up-desc">${pick(u.desc)}</div>
        <button class="up-btn" ${canBuy ? "" : "disabled"}>
          ${maxed ? t("maxed") : `${t("buy")} · ◆ ${cost.toLocaleString()}`}
        </button>
      `;
      el.querySelector("button").onclick = () => {
        if (maxed || save.wallet < cost) return;
        SFX.unlock();
        save.wallet -= cost;
        save.up[u.id] = lv + 1;
        persist();
        SFX.tone(440, 880, 0.14, "triangle", 0.1);
        renderHangar();
      };
      grid.appendChild(el);
    });
  }

  function applyI18n() {
    document.documentElement.lang = lang;
    document.querySelectorAll("[data-i18n]").forEach((el) => {
      el.textContent = t(el.getAttribute("data-i18n"));
    });
    renderHangar();
  }

  // 입력 바인딩
  window.addEventListener("keydown", (e) => {
    keys[e.code] = true;
    if (e.code === "Space" && state === "diving") {
      e.preventDefault();
      triggerBoost();
    }
  });
  window.addEventListener("keyup", (e) => { keys[e.code] = false; });

  canvas.addEventListener("pointerdown", (e) => {
    if (state !== "diving") return;
    SFX.unlock();
    dragTargetX = e.clientX - canvas.getBoundingClientRect().left;
  });
  window.addEventListener("pointermove", (e) => {
    if (dragTargetX === null || state !== "diving") return;
    dragTargetX = e.clientX - canvas.getBoundingClientRect().left;
  });
  window.addEventListener("pointerup", () => { dragTargetX = null; });

  document.getElementById("btn-dive").onclick = startDive;
  document.getElementById("btn-boost").onclick = triggerBoost;
  document.getElementById("btn-rescue-ad").onclick = () => {
    showRewarded(() => {
      rescuedOnce = true;
      rig.fuel = rig.maxFuel * 0.65;
      rig.hull = rig.maxHull * 0.65;
      rig.invuln = 2.0;
      document.getElementById("rescue-modal").classList.add("hidden");
      state = "diving";
    });
  };
  document.getElementById("btn-surface").onclick = () => finishDive(false);
  document.getElementById("btn-double-cash").onclick = () => {
    if (doubledCash) return;
    showRewarded(() => {
      doubledCash = true;
      save.wallet += runCash;
      runCash *= 2;
      persist();
      document.getElementById("sum-cash").textContent = `+${runCash.toLocaleString()}`;
      document.getElementById("btn-double-cash").disabled = true;
      document.getElementById("double-txt").textContent = t("doubleDone");
    });
  };
  document.getElementById("btn-to-hangar").onclick = () => {
    document.getElementById("summary-modal").classList.add("hidden");
    document.getElementById("hud").classList.add("hidden");
    document.getElementById("hangar-screen").classList.remove("hidden");
    state = "hangar";
    renderHangar();
  };
  const toggleLang = () => {
    lang = lang === "ko" ? "en" : "ko";
    localStorage.setItem("nv_lang", lang);
    applyI18n();
  };
  document.getElementById("btn-lang").onclick = toggleLang;
  document.getElementById("btn-lang-lobby").onclick = toggleLang;
  document.getElementById("btn-sound").onclick = (e) => {
    SFX.on = !SFX.on;
    e.currentTarget.textContent = SFX.on ? "🔊" : "🔇";
  };

  window.addEventListener("resize", resize);
  resize();
  applyI18n();

  let last = performance.now();
  function loop(now) {
    const dt = (now - last) / 1000;
    last = now;
    update(dt);
    render();
    requestAnimationFrame(loop);
  }
  requestAnimationFrame(loop);
})();

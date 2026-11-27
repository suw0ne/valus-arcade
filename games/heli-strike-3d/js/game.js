/**
 * 헬기 스트라이크 3D: 브릿지 시즈 — 메인 3D WebGL 건십 전투 엔진 (game.js).
 * - ValusHeliArt3D v2.0 스튜디오 PBR 렌더링 + 60fps 풀링 이펙트
 * - 한 손 드래그/마우스 이동/WASD 즉시 조준 + 30mm 발칸 자동 연사
 * - 연쇄 폭파 레드 연료통 + 홀로 보급 크레이트 + 8연장 호밍 미사일 일제 사격 + 거대 메카 보스전
 * - CrazyGames & Poki SDK 보상형 광고 연동 + KR/EN 다국어 + localStorage 자동 저장
 */
(function () {
  "use strict";

  const SAVE_KEY = "nv_heli_strike_save_v1";
  const ART = window.ValusHeliArt3D;

  // ---------- 1. 다국어 사전 ----------
  const I18N = {
    ko: {
      title: "헬기 스트라이크 3D",
      intro: "공격 헬기의 30mm 발칸 포탑을 드래그로 조준하세요! 붉은 연료통을 연쇄 폭파시켜 몰려오는 크림슨 군단과 메카 보스로부터 호송대를 방어하세요!",
      playBtn: "공중 화력 지원 출격!",
      dragHint: "🎯 화면 드래그 / 마우스 이동으로 자동 조준 사격 · SPACE: 미사일 일제 사격",
      convoyShield: "호송대 방벽",
      waveLbl: "웨이브",
      killsLbl: "격파",
      bossName: "크림슨 메카 보스",
      salvoBtn: "미사일 일제 사격!",
      airstrikeAd: "지원 폭격 + 실드",
      statKills: "적 격파",
      statBlasts: "연쇄 폭파",
      statGold: "획득 골드",
      reviveAd: "광고 보고 긴급 융단폭격 + 방벽 100% 복구!",
      doubleAd: "광고 보고 획득 골드 2배!",
      nextStage: "다음 작전 & 헬기 개조",
      adDesc: "포털 배포 시 실제 보상형 광고가 재생됩니다.",
      winKicker: "BRIDGE SECURED!",
      winTitle: "교량 방어 작전 성공!",
      loseKicker: "BARRIER BREACHED",
      loseTitle: "호송대 방벽이 돌파당했습니다!",
      upAtk: "30mm 발칸 화력",
      upRof: "로터리 연사속도",
      upAoe: "폭발 반경 강화",
      upShield: "호송대 방벽 내구",
      bossIncoming: "⚠️ 경고! 거대 크림슨 메카 보스 출현!",
      waveClear: "웨이브 격퇴! 다음 공세가 시작됩니다!",
      overdriveOn: "⚡ 발칸 오버드라이브 (연사 2배!)",
      rocketsOn: "🚀 윙 로켓 포드 자동 발사 활성화!",
      shieldFixed: "🛡️ 호송대 방벽 +35% 긴급 복구!",
      salvoFired: "🚀 8연장 호밍 미사일 일제 발사!",
      airstrikeFired: "✈️ 긴급 지원 융단폭격 + 방벽 복구!",
      goldDoubled: "◆ 획득 골드 2배 수령 완료!",
      megaBlast: "연쇄 폭파",
    },
    en: {
      title: "HELI STRIKE 3D",
      intro: "Drag to aim your 30mm Rotary Vulcan from the sky! Chain-detonate red fuel barrels to wipe out Crimson hordes and Mech Bosses defending the bridge convoy!",
      playBtn: "LAUNCH AIR SUPPORT!",
      dragHint: "🎯 Drag / Move Pointer to Auto-Fire · SPACE: Launch Homing Missile Salvo",
      convoyShield: "Convoy Barrier",
      waveLbl: "Wave",
      killsLbl: "Kills",
      bossName: "CRIMSON MECH BOSS",
      salvoBtn: "MISSILE SALVO!",
      airstrikeAd: "Airstrike + Shield",
      statKills: "Enemies Defeated",
      statBlasts: "Barrel Blasts",
      statGold: "Gold Earned",
      reviveAd: "Watch Ad: Carpet Bomb + 100% Barrier!",
      doubleAd: "Watch Ad: Claim 2× Gold!",
      nextStage: "Next Operation & Upgrades",
      adDesc: "A real rewarded video ad plays on live game portals.",
      winKicker: "BRIDGE SECURED!",
      winTitle: "OPERATION VICTORY!",
      loseKicker: "BARRIER BREACHED",
      loseTitle: "CONVOY BARRIER DESTROYED!",
      upAtk: "30mm Vulcan Power",
      upRof: "Rotary Fire Rate",
      upAoe: "Blast Radius",
      upShield: "Barrier Armor",
      bossIncoming: "⚠️ WARNING! CRIMSON MECH BOSS INCOMING!",
      waveClear: "WAVE CLEARED! NEXT ASSAULT INCOMING!",
      overdriveOn: "⚡ VULCAN OVERDRIVE (2× FIRE RATE!)",
      rocketsOn: "🚀 WING ROCKET PODS ENGAGED!",
      shieldFixed: "🛡️ CONVOY BARRIER +35% REPAIRED!",
      salvoFired: "🚀 8-MISSILE HOMING SALVO LAUNCHED!",
      airstrikeFired: "✈️ EMERGENCY AIRSTRIKE + SHIELD RESTORED!",
      goldDoubled: "◆ 2× GOLD BONUS CLAIMED!",
      megaBlast: "MEGA BLAST",
    },
  };

  let lang = localStorage.getItem("nv_lang") || "ko";
  const t = (k) => (I18N[lang] && I18N[lang][k]) || I18N.ko[k] || k;

  // ---------- 2. CrazyGames / Poki SDK 어댑터 ----------
  const PortalSDK = {
    started: false,
    gameplayStart() {
      if (this.started) return;
      this.started = true;
      try { window.CrazyGames?.SDK?.game?.gameplayStart(); } catch (_) {}
      try { window.PokiSDK?.gameplayStart(); } catch (_) {}
    },
    gameplayStop() {
      if (!this.started) return;
      this.started = false;
      try { window.CrazyGames?.SDK?.game?.gameplayStop(); } catch (_) {}
      try { window.PokiSDK?.gameplayStop(); } catch (_) {}
    },
    happytime() {
      try { window.CrazyGames?.SDK?.game?.happytime(); } catch (_) {}
    },
    showRewarded(onReward) {
      if (window.CrazyGames?.SDK?.ad?.requestAd) {
        this.gameplayStop();
        window.CrazyGames.SDK.ad.requestAd("rewarded", {
          adFinished: () => { onReward(true); },
          adError: () => { onReward(false); },
        });
        return;
      }
      if (window.PokiSDK?.rewardedBreak) {
        this.gameplayStop();
        window.PokiSDK.rewardedBreak().then((ok) => onReward(Boolean(ok))).catch(() => onReward(false));
        return;
      }
      // 로컬 프리뷰 2초 보상형 광고 모달
      const modal = document.getElementById("ad-modal");
      const fill = document.getElementById("ad-fill");
      const timer = document.getElementById("ad-timer");
      modal.classList.remove("hidden");
      let elapsed = 0;
      const dur = 2.0;
      const iv = setInterval(() => {
        elapsed += 0.05;
        const pct = Math.min(100, (elapsed / dur) * 100);
        fill.style.width = `${pct}%`;
        timer.textContent = `${Math.max(0, dur - elapsed).toFixed(1)}s`;
        if (elapsed >= dur) {
          clearInterval(iv);
          modal.classList.add("hidden");
          onReward(true);
        }
      }, 50);
    },
  };

  // ---------- 3. Web Audio 프로시저럴 사운드 엔진 ----------
  const SFX = {
    ctx: null,
    muted: false,
    lastShot: 0,
    unlock() {
      if (!this.ctx) {
        const AC = window.AudioContext || window.webkitAudioContext;
        if (AC) this.ctx = new AC();
      }
      if (this.ctx && this.ctx.state === "suspended") this.ctx.resume().catch(() => {});
    },
    tone(freq, endFreq, dur, type, vol) {
      if (this.muted || !this.ctx) return;
      const now = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = type || "triangle";
      osc.frequency.setValueAtTime(freq, now);
      if (endFreq) osc.frequency.exponentialRampToValueAtTime(Math.max(20, endFreq), now + dur);
      gain.gain.setValueAtTime(vol || 0.12, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + dur);
      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start(now);
      osc.stop(now + dur);
    },
    noiseBurst(dur, vol, cutoff) {
      if (this.muted || !this.ctx) return;
      const len = Math.floor(this.ctx.sampleRate * dur);
      const buf = this.ctx.createBuffer(1, len, this.ctx.sampleRate);
      const data = buf.getChannelData(0);
      for (let i = 0; i < len; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / len);
      const src = this.ctx.createBufferSource();
      src.buffer = buf;
      const filt = this.ctx.createBiquadFilter();
      filt.type = "lowpass";
      filt.frequency.value = cutoff || 650;
      const gain = this.ctx.createGain();
      gain.gain.setValueAtTime(vol || 0.2, this.ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + dur);
      src.connect(filt); filt.connect(gain); gain.connect(this.ctx.destination);
      src.start();
    },
    vulcan() {
      const now = performance.now();
      if (now - this.lastShot < 68) return;
      this.lastShot = now;
      this.tone(185 + Math.random() * 35, 58, 0.065, "sawtooth", 0.065);
    },
    explosion(big) {
      this.noiseBurst(big ? 0.44 : 0.24, big ? 0.34 : 0.18, big ? 520 : 880);
      this.tone(big ? 110 : 140, 28, big ? 0.38 : 0.2, "sine", big ? 0.28 : 0.16);
    },
    missile() {
      this.tone(420, 960, 0.14, "sawtooth", 0.08);
      this.noiseBurst(0.18, 0.09, 1400);
    },
    powerup() {
      this.tone(523, 784, 0.12, "triangle", 0.14);
      setTimeout(() => this.tone(784, 1046, 0.18, "triangle", 0.14), 85);
    },
    shieldHit() {
      this.tone(240, 95, 0.14, "square", 0.1);
    },
    victory() {
      [523, 659, 784, 1046].forEach((f, idx) => {
        setTimeout(() => this.tone(f, f * 1.02, 0.22, "triangle", 0.15), idx * 95);
      });
    },
  };

  // ---------- 4. 영구 저장 & 업그레이드 ----------
  const DEFAULT_SAVE = {
    stage: 1,
    bestStage: 0,
    gold: 120,
    upAtk: 1,
    upRof: 1,
    upAoe: 1,
    upShield: 1,
  };
  let save = { ...DEFAULT_SAVE };
  try {
    const raw = JSON.parse(localStorage.getItem(SAVE_KEY) || "null");
    if (raw && typeof raw === "object") save = { ...DEFAULT_SAVE, ...raw };
  } catch (_) {}

  function persistSave() {
    try { localStorage.setItem(SAVE_KEY, JSON.stringify(save)); } catch (_) {}
  }

  const UPGRADE_DEFS = [
    { key: "upAtk", nameKey: "upAtk", icon: "🔥", baseCost: 60 },
    { key: "upRof", nameKey: "upRof", icon: "⚡", baseCost: 65 },
    { key: "upAoe", nameKey: "upAoe", icon: "💥", baseCost: 70 },
    { key: "upShield", nameKey: "upShield", icon: "🛡️", baseCost: 60 },
  ];
  const upgradeCost = (def) => Math.floor(def.baseCost * Math.pow(1.42, (save[def.key] || 1) - 1));

  // ---------- 5. Three.js 씬 & 스튜디오 PBR 초기화 ----------
  const wrap = document.getElementById("canvas-wrap");
  const fxLayer = document.getElementById("fx-layer");

  const renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: "high-performance" });
  renderer.setSize(wrap.clientWidth, wrap.clientHeight);
  wrap.prepend(renderer.domElement);

  const scene = new THREE.Scene();
  ART.setupStudioRenderer(renderer, scene);
  const qualityGuard = ART.createAdaptiveQualityGuard ? ART.createAdaptiveQualityGuard(renderer, scene) : null;

  const camera = new THREE.PerspectiveCamera(48, wrap.clientWidth / Math.max(1, wrap.clientHeight), 0.5, 420);
  const BASE_CAM_POS = new THREE.Vector3(0, 17.5, 22.5);
  const BASE_CAM_LOOK = new THREE.Vector3(0, 1.2, -16);
  camera.position.copy(BASE_CAM_POS);
  camera.lookAt(BASE_CAM_LOOK);

  const { cloudGroup, oceanUniforms } = ART.buildSkyAndOcean(scene);
  ART.buildSuspensionBridge(scene);
  const convoy = ART.createConvoyAndBarrier(scene);

  const starFlashTex = ART.makeStarFlashTexture();
  const barrelTex = ART.createBarrelLabelTexture();
  const heli = ART.createAttackHelicopter(starFlashTex);
  heli.position.set(-5.4, 9.6, 13.8);
  scene.add(heli);

  const crosshair = ART.createCrosshair3D();
  crosshair.position.set(0, 0, -20);
  scene.add(crosshair);

  // 레이캐스트 평면 (y=0 교량 노면)
  const raycaster = new THREE.Raycaster();
  const groundPlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
  const ndc = new THREE.Vector2();
  const aimPoint = new THREE.Vector3(0, 0, -20);
  const aimTarget = new THREE.Vector3(0, 0, -20);

  // 공유 이펙트 지오메트리/머티리얼
  const tracerGeo = new THREE.BoxGeometry(0.16, 0.16, 2.2);
  const tracerMatGold = new THREE.MeshBasicMaterial({ color: 0xfef08a });
  const tracerMatRed = new THREE.MeshBasicMaterial({ color: 0xfb923c });
  const missileGeo = new THREE.CylinderGeometry(0.12, 0.16, 1.35, 8);
  missileGeo.rotateX(Math.PI / 2);
  const missileMat = new THREE.MeshStandardMaterial({ color: 0xf8fafc, metalness: 0.7, roughness: 0.25, emissive: 0xf97316, emissiveIntensity: 0.35 });
  const sparkGeo = new THREE.BoxGeometry(0.28, 0.28, 0.28);
  const fireballGeo = new THREE.SphereGeometry(1, 14, 12);
  const ringGeo = new THREE.RingGeometry(0.65, 1.0, 28);
  ringGeo.rotateX(-Math.PI / 2);

  // ---------- 6. 전투 상태 ----------
  const state = {
    mode: "menu", // menu | playing | ended
    wave: 1,
    maxWaves: 3,
    waveSpawnLeft: 0,
    spawnTimer: 0,
    barrelTimer: 1.4,
    crateTimer: 7.5,
    shieldHp: 100,
    shieldMax: 100,
    kills: 0,
    blasts: 0,
    earnedGold: 0,
    salvoCharge: 35,
    overdriveLeft: 0,
    rocketPodLeft: 0,
    fireCooldown: 0,
    shotCounter: 0,
    bossSpawned: false,
    bossRef: null,
    airstrikeUsed: false,
    reviveUsed: false,
    doubledUsed: false,
    shake: 0,
    muzzleTime: 0,
    time: 0,
  };

  let enemies = [];
  let barrels = [];
  let crates = [];
  let tracers = [];
  let missiles = [];
  let blasts = [];
  let particles = [];
  let pendingBlasts = [];

  const keys = { left: false, right: false, up: false, down: false };
  let activePointerId = null;

  // ---------- 7. UI 도우미 ----------
  const $ = (id) => document.getElementById(id);

  function showToast(msg) {
    const el = $("toast-banner");
    el.textContent = msg;
    el.classList.remove("hidden");
    clearTimeout(el._tid);
    el._tid = setTimeout(() => el.classList.add("hidden"), 2300);
  }

  function spawnPop(worldPos, text, color, mega) {
    const v = worldPos.clone();
    v.y += 1.6;
    v.project(camera);
    if (v.z > 1) return;
    const x = (v.x * 0.5 + 0.5) * wrap.clientWidth;
    const y = (-v.y * 0.5 + 0.5) * wrap.clientHeight;
    const el = document.createElement("div");
    el.className = `pop-txt${mega ? " mega" : ""}`;
    el.style.left = `${x}px`;
    el.style.top = `${y}px`;
    el.style.color = color || "#fde047";
    el.textContent = text;
    fxLayer.appendChild(el);
    setTimeout(() => el.remove(), 860);
  }

  function applyI18n() {
    document.documentElement.lang = lang;
    $("btn-lang").textContent = lang.toUpperCase();
    document.querySelectorAll("[data-i18n]").forEach((el) => {
      el.textContent = t(el.getAttribute("data-i18n"));
    });
    renderUpgradeGrid();
  }

  function renderUpgradeGrid() {
    const grid = $("upgrade-grid");
    grid.innerHTML = "";
    UPGRADE_DEFS.forEach((def) => {
      const lv = save[def.key] || 1;
      const cost = upgradeCost(def);
      const btn = document.createElement("button");
      btn.className = "up-card";
      btn.disabled = save.gold < cost;
      btn.innerHTML = `
        <div>
          <span class="up-name">${def.icon} ${t(def.nameKey)}</span>
          <span class="up-lv">Lv.${lv}</span>
        </div>
        <span class="up-cost">◆ ${cost}</span>
      `;
      btn.addEventListener("click", () => {
        SFX.unlock();
        if (save.gold < cost) return;
        save.gold -= cost;
        save[def.key] = lv + 1;
        persistSave();
        SFX.powerup();
        updateHud();
        renderUpgradeGrid();
      });
      grid.appendChild(btn);
    });
  }

  function updateHud() {
    $("ui-stage").textContent = String(save.stage);
    $("ui-gold").textContent = String(Math.floor(save.gold));
    const pct = Math.max(0, Math.round((state.shieldHp / Math.max(1, state.shieldMax)) * 100));
    $("ui-shield-pct").textContent = `${pct}%`;
    $("ui-shield-fill").style.width = `${pct}%`;
    $("ui-wave").textContent = state.bossSpawned ? "BOSS" : `${state.wave}/${state.maxWaves}`;
    $("ui-kills").textContent = String(state.kills);

    if (state.overdriveLeft > 0) {
      $("ui-buff").textContent = `2× ROF ${state.overdriveLeft.toFixed(1)}s`;
    } else if (state.rocketPodLeft > 0) {
      $("ui-buff").textContent = `ROCKETS ${state.rocketPodLeft.toFixed(1)}s`;
    } else {
      $("ui-buff").textContent = "VULCAN 30MM";
    }

    const salvoPct = Math.min(100, Math.floor(state.salvoCharge));
    $("ui-salvo-pct").textContent = `${salvoPct}%`;
    const salvoBtn = $("btn-salvo");
    salvoBtn.disabled = salvoPct < 100 || state.mode !== "playing";
    salvoBtn.classList.toggle("ready", salvoPct >= 100 && state.mode === "playing");

    $("btn-airstrike").disabled = state.airstrikeUsed || state.mode !== "playing";

    if (state.bossRef && state.bossRef.alive) {
      $("boss-hud").classList.remove("hidden");
      const bp = Math.max(0, Math.round((state.bossRef.hp / state.bossRef.maxHp) * 100));
      $("ui-boss-hp").textContent = `${bp}%`;
      $("ui-boss-fill").style.width = `${bp}%`;
    } else {
      $("boss-hud").classList.add("hidden");
    }
  }

  // ---------- 8. 엔티티 생성 & 전투 로직 ----------
  function clearArena() {
    [enemies, barrels, crates, tracers, missiles, blasts, particles].forEach((arr) => {
      arr.forEach((o) => { if (o.mesh) scene.remove(o.mesh); });
    });
    enemies = []; barrels = []; crates = [];
    tracers = []; missiles = []; blasts = []; particles = [];
    pendingBlasts = [];
    state.bossRef = null;
  }

  function spawnBarrel(x, z) {
    if (barrels.length >= 9) return;
    const mesh = ART.createExplosiveBarrel(barrelTex);
    mesh.position.set(x, 0, z);
    scene.add(mesh);
    barrels.push({ mesh, hp: 22, alive: true, x, z });
  }

  function spawnCrate() {
    if (crates.length >= 2) return;
    const kinds = ["overdrive", "rockets", "shield"];
    const kind = kinds[Math.floor(Math.random() * kinds.length)];
    const x = (Math.random() - 0.5) * 9.0;
    const z = -12 - Math.random() * 26;
    const mesh = ART.createSupplyCrate(kind);
    mesh.position.set(x, 12, z);
    scene.add(mesh);
    crates.push({ mesh, kind, hp: 26, alive: true, x, z, y: 12 });
  }

  function spawnEnemy(type, xOverride, zOverride) {
    const mesh = ART.createEnemyModel(type);
    const x = xOverride !== undefined ? xOverride : (Math.random() - 0.5) * 9.8;
    const z = zOverride !== undefined ? zOverride : -54 - Math.random() * 14;
    mesh.position.set(x, 0, z);
    scene.add(mesh);

    const stScale = 1 + (save.stage - 1) * 0.28;
    let hp = 26 * stScale;
    let speed = 6.2 + Math.random() * 1.4;
    let dmg = 7;
    let gold = 6;
    if (type === "brute") { hp = 78 * stScale; speed = 4.2; dmg = 14; gold = 14; }
    else if (type === "ram") { hp = 145 * stScale; speed = 7.4; dmg = 22; gold = 26; }
    else if (type === "boss") { hp = 880 * stScale; speed = 2.75; dmg = 34; gold = 160; }

    const e = {
      type, mesh, x, z,
      hp, maxHp: hp, speed, dmg, gold,
      hitRadius: mesh.userData.hitRadius || 0.85,
      alive: true,
      phase: Math.random() * Math.PI * 2,
      hitFlash: 0,
    };
    enemies.push(e);
    if (type === "boss") {
      state.bossRef = e;
      showToast(t("bossIncoming"));
      SFX.explosion(true);
    }
  }

  function spawnWaveBarrels() {
    const spots = [
      [-3.4, -18], [3.2, -21], [0.0, -29],
      [-3.8, -36], [3.6, -39], [-0.4, -46],
    ];
    spots.forEach(([bx, bz]) => {
      const jitterX = (Math.random() - 0.5) * 1.1;
      const jitterZ = (Math.random() - 0.5) * 2.2;
      spawnBarrel(bx + jitterX, bz + jitterZ);
    });
  }

  function startStage() {
    clearArena();
    state.mode = "playing";
    state.wave = 1;
    state.maxWaves = 3;
    state.waveSpawnLeft = 18 + save.stage * 5;
    state.spawnTimer = 0.25;
    state.barrelTimer = 4.2;
    state.crateTimer = 6.5;
    state.shieldMax = 100 + (save.upShield - 1) * 30;
    state.shieldHp = state.shieldMax;
    state.kills = 0;
    state.blasts = 0;
    state.earnedGold = 0;
    state.salvoCharge = 45;
    state.overdriveLeft = 0;
    state.rocketPodLeft = 0;
    state.bossSpawned = false;
    state.airstrikeUsed = false;
    state.reviveUsed = false;
    state.doubledUsed = false;
    state.shake = 0;

    spawnWaveBarrels();
    // 첫 0.5초 즉시 전투감 확보용 선봉대 + 보급 1개
    for (let i = 0; i < 6; i++) {
      spawnEnemy("rusher", (Math.random() - 0.5) * 8.5, -28 - i * 3.8);
    }

    $("start-overlay").classList.add("hidden");
    $("result-overlay").classList.add("hidden");
    $("battle-dock").classList.remove("hidden");
    updateHud();
    PortalSDK.gameplayStart();
  }

  function createExplosionFX(pos, radius, isMega) {
    const fb = new THREE.Mesh(
      fireballGeo,
      new THREE.MeshBasicMaterial({
        color: isMega ? 0xff7b00 : 0xfacc15,
        transparent: true, opacity: 0.92,
      })
    );
    fb.position.copy(pos);
    fb.position.y = Math.max(0.7, pos.y);
    fb.scale.setScalar(0.5);
    scene.add(fb);
    blasts.push({ mesh: fb, age: 0, dur: isMega ? 0.42 : 0.26, maxScale: isMega ? radius * 0.58 : radius * 0.42, kind: "fire" });

    const ring = new THREE.Mesh(
      ringGeo,
      new THREE.MeshBasicMaterial({
        color: isMega ? 0xfef08a : 0x38bdf8,
        side: THREE.DoubleSide, transparent: true, opacity: 0.92,
      })
    );
    ring.position.set(pos.x, 0.14, pos.z);
    ring.scale.setScalar(0.5);
    scene.add(ring);
    blasts.push({ mesh: ring, age: 0, dur: isMega ? 0.46 : 0.28, maxScale: radius * 1.05, kind: "ring" });

    const pScale = qualityGuard ? qualityGuard.particleScale : 1.0;
    const count = Math.max(3, Math.round((isMega ? 16 : 7) * pScale));
    for (let i = 0; i < count; i++) {
      if (particles.length > 140) break;
      const pMat = new THREE.MeshBasicMaterial({
        color: i % 2 === 0 ? 0xf97316 : 0xfef08a,
      });
      const pm = new THREE.Mesh(sparkGeo, pMat);
      pm.position.set(pos.x, 0.9, pos.z);
      scene.add(pm);
      const ang = Math.random() * Math.PI * 2;
      const spd = (isMega ? 9 : 5) + Math.random() * 8;
      particles.push({
        mesh: pm,
        vx: Math.cos(ang) * spd,
        vy: 5 + Math.random() * (isMega ? 10 : 6),
        vz: Math.sin(ang) * spd,
        age: 0,
        dur: 0.45 + Math.random() * 0.3,
      });
    }
  }

  function applyAoEDamage(center, radius, dmg, isBarrelBlast) {
    let hitKills = 0;
    for (let i = 0; i < enemies.length; i++) {
      const e = enemies[i];
      if (!e.alive) continue;
      const dist = Math.hypot(e.x - center.x, e.z - center.z);
      if (dist <= radius + e.hitRadius) {
        const falloff = 1 - Math.min(0.45, (dist / (radius + e.hitRadius)) * 0.45);
        damageEnemy(e, dmg * falloff);
        if (!e.alive) hitKills++;
      }
    }
    if (isBarrelBlast) {
      // 인접 연료통 도미노 연쇄 폭파 예약!
      for (let i = 0; i < barrels.length; i++) {
        const b = barrels[i];
        if (!b.alive) continue;
        const dist = Math.hypot(b.x - center.x, b.z - center.z);
        if (dist <= radius + 1.2) {
          b.alive = false;
          scene.remove(b.mesh);
          pendingBlasts.push({ pos: new THREE.Vector3(b.x, 0.9, b.z), delay: 0.09 });
        }
      }
      if (hitKills >= 2) {
        spawnPop(center, `🔥 ${t("megaBlast")} ×${hitKills}!`, "#fde047", true);
      } else {
        spawnPop(center, "💥 BOOM!", "#fb923c", false);
      }
    }
  }

  function detonateBarrel(pos) {
    state.blasts++;
    state.shake = Math.min(1.0, state.shake + 0.52);
    const radius = 6.2 + (save.upAoe - 1) * 0.48;
    const dmg = (115 + (save.upAtk - 1) * 26) * (1 + (save.stage - 1) * 0.16);
    SFX.explosion(true);
    createExplosionFX(pos, radius, true);
    applyAoEDamage(pos, radius, dmg, true);
  }

  function damageEnemy(e, dmg) {
    if (!e.alive) return;
    e.hp -= dmg;
    e.hitFlash = 0.09;
    if (e.hp <= 0) {
      e.alive = false;
      scene.remove(e.mesh);
      state.kills++;
      state.earnedGold += e.gold;
      save.gold += e.gold;
      state.salvoCharge = Math.min(100, state.salvoCharge + (e.type === "boss" ? 50 : e.type === "ram" ? 12 : 4.2));
      createExplosionFX(new THREE.Vector3(e.x, 0.8, e.z), e.type === "boss" ? 7.5 : 2.1, e.type === "boss");
      if (e.type === "boss") {
        SFX.explosion(true);
        state.shake = 1.0;
        spawnPop(new THREE.Vector3(e.x, 2.5, e.z), `🏆 +${e.gold}◆`, "#fde047", true);
        endStage(true);
      }
    }
  }

  function collectCrate(c) {
    c.alive = false;
    scene.remove(c.mesh);
    SFX.powerup();
    if (c.kind === "overdrive") {
      state.overdriveLeft = 9.5;
      showToast(t("overdriveOn"));
      spawnPop(new THREE.Vector3(c.x, 1.5, c.z), "⚡ 2× ROF!", "#38bdf8", true);
    } else if (c.kind === "rockets") {
      state.rocketPodLeft = 10.0;
      showToast(t("rocketsOn"));
      spawnPop(new THREE.Vector3(c.x, 1.5, c.z), "🚀 ROCKET POD!", "#fde047", true);
    } else {
      state.shieldHp = Math.min(state.shieldMax, state.shieldHp + state.shieldMax * 0.35);
      convoy.barrierUniforms.uHit.value = 1.0;
      // 방벽 근접 적 넉백
      enemies.forEach((e) => {
        if (e.alive && e.z > -6) e.z -= 7.5;
      });
      showToast(t("shieldFixed"));
      spawnPop(new THREE.Vector3(c.x, 1.5, c.z), "🛡️ +35%", "#4ade80", true);
    }
  }

  function launchHomingMissile(podSide, targetPos) {
    const localPod = podSide < 0 ? heli.userData.leftPodPos : heli.userData.rightPodPos;
    const startPos = localPod.clone().applyMatrix4(heli.matrixWorld);
    const mesh = new THREE.Mesh(missileGeo, missileMat);
    mesh.position.copy(startPos);
    scene.add(mesh);
    SFX.missile();
    missiles.push({
      mesh,
      start: startPos.clone(),
      target: targetPos.clone(),
      age: 0,
      dur: 0.56 + Math.random() * 0.14,
      arc: 2.5 + Math.random() * 2.5,
      dmg: (130 + (save.upAtk - 1) * 32) * (1 + (save.stage - 1) * 0.18),
      radius: 5.2 + (save.upAoe - 1) * 0.42,
    });
  }

  function fireMissileSalvo() {
    if (state.mode !== "playing" || state.salvoCharge < 100) return;
    state.salvoCharge = 0;
    showToast(t("salvoFired"));
    const liveEnemies = enemies.filter((e) => e.alive).sort((a, b) => b.z - a.z);
    for (let i = 0; i < 8; i++) {
      setTimeout(() => {
        if (state.mode !== "playing") return;
        const pick = liveEnemies[i % Math.max(1, liveEnemies.length)];
        const tgt = pick
          ? new THREE.Vector3(pick.x + (Math.random() - 0.5) * 1.2, 0.5, pick.z)
          : new THREE.Vector3((Math.random() - 0.5) * 8, 0.5, -18 - Math.random() * 28);
        launchHomingMissile(i % 2 === 0 ? -1 : 1, tgt);
      }, i * 80);
    }
    updateHud();
  }

  function fireEmergencyAirstrike(fullShield) {
    showToast(t("airstrikeFired"));
    state.shieldHp = fullShield
      ? state.shieldMax
      : Math.min(state.shieldMax, state.shieldHp + state.shieldMax * 0.45);
    for (let i = 0; i < 10; i++) {
      setTimeout(() => {
        const tgt = new THREE.Vector3((Math.random() - 0.5) * 9.5, 0.5, -6 - i * 4.6);
        launchHomingMissile(i % 2 === 0 ? -1 : 1, tgt);
      }, i * 75);
    }
    updateHud();
  }

  function fireVulcanRound() {
    const gunWorld = new THREE.Vector3(0, -0.02, -1.75);
    heli.userData.gunPivot.localToWorld(gunWorld);

    const spread = state.overdriveLeft > 0 ? 0.55 : 0.38;
    const hitPos = new THREE.Vector3(
      aimPoint.x + (Math.random() - 0.5) * spread,
      0.3,
      aimPoint.z + (Math.random() - 0.5) * spread
    );

    const mesh = new THREE.Mesh(tracerGeo, state.overdriveLeft > 0 ? tracerMatRed : tracerMatGold);
    mesh.position.copy(gunWorld);
    mesh.lookAt(hitPos);
    scene.add(mesh);

    const dmg = (14 + (save.upAtk - 1) * 4.5) * (state.overdriveLeft > 0 ? 1.35 : 1.0);
    const splash = 1.85 + (save.upAoe - 1) * 0.22;
    tracers.push({
      mesh,
      start: gunWorld,
      end: hitPos,
      age: 0,
      dur: 0.115,
      dmg,
      splash,
    });

    state.muzzleTime = 0.055;
    SFX.vulcan();

    // 로켓 포드 버프 중이면 5발마다 자동 유도 미사일 추가 발사!
    state.shotCounter++;
    if (state.rocketPodLeft > 0 && state.shotCounter % 5 === 0) {
      launchHomingMissile(state.shotCounter % 10 === 0 ? -1 : 1, aimPoint.clone());
    }
  }

  function endStage(victory) {
    state.mode = "ended";
    PortalSDK.gameplayStop();
    $("battle-dock").classList.add("hidden");

    if (victory) {
      const stageBonus = 90 + save.stage * 35;
      state.earnedGold += stageBonus;
      save.gold += stageBonus;
      if (save.stage > save.bestStage) save.bestStage = save.stage;
      save.stage++;
      persistSave();
      SFX.victory();
      PortalSDK.happytime();
    } else {
      persistSave();
    }

    $("res-kicker").textContent = victory ? t("winKicker") : t("loseKicker");
    $("res-title").textContent = victory ? t("winTitle") : t("loseTitle");
    $("res-kills").textContent = String(state.kills);
    $("res-blasts").textContent = String(state.blasts);
    $("res-earned").textContent = `+${Math.floor(state.earnedGold)}`;

    const revBtn = $("btn-res-revive");
    revBtn.classList.toggle("hidden", victory || state.reviveUsed);
    const dblBtn = $("btn-res-double");
    dblBtn.disabled = state.doubledUsed || state.earnedGold <= 0;

    $("result-overlay").classList.remove("hidden");
    updateHud();
  }

  // ---------- 9. 입력 컨트롤 (모바일 1손 터치 + PC 마우스/키보드) ----------
  function updateAimFromClient(clientX, clientY) {
    const rect = renderer.domElement.getBoundingClientRect();
    ndc.x = ((clientX - rect.left) / rect.width) * 2 - 1;
    ndc.y = -((clientY - rect.top) / rect.height) * 2 + 1;
    raycaster.setFromCamera(ndc, camera);
    const hit = new THREE.Vector3();
    if (raycaster.ray.intersectPlane(groundPlane, hit)) {
      aimTarget.x = Math.max(-5.8, Math.min(5.8, hit.x));
      aimTarget.z = Math.max(-56, Math.min(4.8, hit.z));
    }
  }

  wrap.addEventListener("pointerdown", (e) => {
    SFX.unlock();
    activePointerId = e.pointerId;
    try { wrap.setPointerCapture(e.pointerId); } catch (_) {}
    updateAimFromClient(e.clientX, e.clientY);
  });
  wrap.addEventListener("pointermove", (e) => {
    if (state.mode !== "playing") return;
    if (e.pointerType === "mouse" || e.pointerId === activePointerId) {
      updateAimFromClient(e.clientX, e.clientY);
    }
  });
  wrap.addEventListener("pointerup", (e) => {
    if (e.pointerId === activePointerId) activePointerId = null;
  });
  wrap.addEventListener("pointercancel", (e) => {
    if (e.pointerId === activePointerId) activePointerId = null;
  });

  window.addEventListener("keydown", (e) => {
    SFX.unlock();
    if (e.code === "ArrowLeft" || e.code === "KeyA") keys.left = true;
    if (e.code === "ArrowRight" || e.code === "KeyD") keys.right = true;
    if (e.code === "ArrowUp" || e.code === "KeyW") keys.up = true;
    if (e.code === "ArrowDown" || e.code === "KeyS") keys.down = true;
    if (e.code === "Space" || e.code === "KeyE") {
      if (state.mode === "playing") {
        e.preventDefault();
        fireMissileSalvo();
      }
    }
  });
  window.addEventListener("keyup", (e) => {
    if (e.code === "ArrowLeft" || e.code === "KeyA") keys.left = false;
    if (e.code === "ArrowRight" || e.code === "KeyD") keys.right = false;
    if (e.code === "ArrowUp" || e.code === "KeyW") keys.up = false;
    if (e.code === "ArrowDown" || e.code === "KeyS") keys.down = false;
  });

  // 버튼 이벤트
  $("btn-play").addEventListener("click", () => { SFX.unlock(); startStage(); });
  $("btn-salvo").addEventListener("click", () => { SFX.unlock(); fireMissileSalvo(); });
  $("btn-airstrike").addEventListener("click", () => {
    if (state.airstrikeUsed || state.mode !== "playing") return;
    SFX.unlock();
    PortalSDK.showRewarded((ok) => {
      if (ok) {
        state.airstrikeUsed = true;
        fireEmergencyAirstrike(false);
      }
      PortalSDK.gameplayStart();
    });
  });
  $("btn-res-revive").addEventListener("click", () => {
    if (state.reviveUsed) return;
    SFX.unlock();
    PortalSDK.showRewarded((ok) => {
      if (ok) {
        state.reviveUsed = true;
        state.mode = "playing";
        $("result-overlay").classList.add("hidden");
        $("battle-dock").classList.remove("hidden");
        // 방벽 앞 적 밀어내고 융단폭격
        enemies.forEach((e) => { if (e.alive && e.z > -10) e.z -= 12; });
        fireEmergencyAirstrike(true);
        PortalSDK.gameplayStart();
      }
    });
  });
  $("btn-res-double").addEventListener("click", () => {
    if (state.doubledUsed || state.earnedGold <= 0) return;
    SFX.unlock();
    PortalSDK.showRewarded((ok) => {
      if (ok) {
        state.doubledUsed = true;
        save.gold += state.earnedGold;
        state.earnedGold *= 2;
        persistSave();
        $("res-earned").textContent = `+${Math.floor(state.earnedGold)}`;
        $("btn-res-double").disabled = true;
        showToast(t("goldDoubled"));
        updateHud();
      }
    });
  });
  $("btn-res-next").addEventListener("click", () => {
    SFX.unlock();
    $("result-overlay").classList.add("hidden");
    $("start-overlay").classList.remove("hidden");
    state.mode = "menu";
    renderUpgradeGrid();
    updateHud();
  });
  $("btn-sound").addEventListener("click", () => {
    SFX.unlock();
    SFX.muted = !SFX.muted;
    $("btn-sound").textContent = SFX.muted ? "🔇" : "🔊";
  });
  $("btn-lang").addEventListener("click", () => {
    lang = lang === "ko" ? "en" : "ko";
    localStorage.setItem("nv_lang", lang);
    applyI18n();
  });

  window.addEventListener("resize", () => {
    camera.aspect = wrap.clientWidth / Math.max(1, wrap.clientHeight);
    camera.updateProjectionMatrix();
    renderer.setSize(wrap.clientWidth, wrap.clientHeight);
  });

  // ---------- 10. 메인 60fps 게임 루프 ----------
  let lastTs = performance.now();

  function tick(now) {
    requestAnimationFrame(tick);
    const rawDt = (now - lastTs) / 1000;
    const dt = Math.min(0.05, rawDt);
    lastTs = now;
    if (qualityGuard) qualityGuard.sample(rawDt);
    state.time += dt;

    // 배경 바다·구름·방벽 셰이더 애니메이션
    oceanUniforms.uTime.value = state.time;
    convoy.barrierUniforms.uTime.value = state.time;
    convoy.barrierUniforms.uHealth.value = state.shieldHp / Math.max(1, state.shieldMax);
    convoy.barrierUniforms.uHit.value = Math.max(0, convoy.barrierUniforms.uHit.value - dt * 3.5);
    cloudGroup.children.forEach((c, idx) => {
      c.position.x += dt * (0.45 + (idx % 3) * 0.18);
      if (c.position.x > 110) c.position.x = -110;
    });

    // 키보드 조준 보정
    if (state.mode === "playing") {
      const kSpd = 24 * dt;
      if (keys.left) aimTarget.x = Math.max(-5.8, aimTarget.x - kSpd);
      if (keys.right) aimTarget.x = Math.min(5.8, aimTarget.x + kSpd);
      if (keys.up) aimTarget.z = Math.max(-56, aimTarget.z - kSpd);
      if (keys.down) aimTarget.z = Math.min(4.8, aimTarget.z + kSpd);
    } else {
      // 메뉴 화면에서도 살아있는 쇼케이스 호버링
      aimTarget.x = Math.sin(state.time * 0.7) * 3.2;
      aimTarget.z = -22 + Math.cos(state.time * 0.5) * 6;
    }

    aimPoint.lerp(aimTarget, Math.min(1, dt * 16));
    crosshair.position.set(aimPoint.x, 0, aimPoint.z);
    crosshair.userData.ticks.rotation.y += dt * 2.2;

    // 락온 감지 (연료통이나 보스 위 조준 시 크로스헤어 오렌지 강조)
    let lockedHot = false;
    for (let i = 0; i < barrels.length; i++) {
      if (barrels[i].alive && Math.hypot(barrels[i].x - aimPoint.x, barrels[i].z - aimPoint.z) < 2.2) {
        lockedHot = true; break;
      }
    }
    if (!lockedHot && state.bossRef && state.bossRef.alive && Math.hypot(state.bossRef.x - aimPoint.x, state.bossRef.z - aimPoint.z) < 3.4) {
      lockedHot = true;
    }
    crosshair.userData.outerMat.color.setHex(lockedHot ? 0xf97316 : 0x38bdf8);
    const chScale = lockedHot ? 1.15 + Math.sin(state.time * 18) * 0.08 : 1.0;
    crosshair.scale.setScalar(chScale);

    // 헬기 로터 회전 + 다이내믹 뱅킹 호버링 + 발칸 포탑 조준
    heli.userData.mainRotor.rotation.y += dt * 28;
    heli.userData.tailRotor.rotation.x += dt * 36;
    const targetHeliX = -4.2 + aimPoint.x * 0.42;
    const targetHeliY = 9.4 + Math.sin(state.time * 2.4) * 0.36;
    heli.position.x += (targetHeliX - heli.position.x) * Math.min(1, dt * 4.5);
    heli.position.y += (targetHeliY - heli.position.y) * Math.min(1, dt * 5.0);
    heli.rotation.z = -(targetHeliX - heli.position.x) * 0.18 - aimPoint.x * 0.025;
    heli.rotation.y = -aimPoint.x * 0.045;
    heli.rotation.x = -0.14 + Math.sin(state.time * 1.9) * 0.025;
    heli.updateMatrixWorld(true);
    heli.userData.gunPivot.lookAt(aimPoint.x, 0.5, aimPoint.z);

    if (state.muzzleTime > 0) {
      state.muzzleTime -= dt;
      heli.userData.barrelSpinner.rotation.z += dt * 38;
      heli.userData.muzzleFlash.visible = true;
      heli.userData.muzzleFlash.material.rotation = Math.random() * Math.PI * 2;
      heli.userData.muzzleLight.intensity = 4.5;
    } else {
      heli.userData.muzzleFlash.visible = false;
      heli.userData.muzzleLight.intensity = 0;
    }

    // 전투 진행 업데이트
    if (state.mode === "playing") {
      if (state.overdriveLeft > 0) state.overdriveLeft = Math.max(0, state.overdriveLeft - dt);
      if (state.rocketPodLeft > 0) state.rocketPodLeft = Math.max(0, state.rocketPodLeft - dt);

      // 30mm 발칸 자동 연사
      const baseRof = 0.145 * Math.pow(0.92, save.upRof - 1);
      const curRof = Math.max(0.055, state.overdriveLeft > 0 ? baseRof * 0.52 : baseRof);
      state.fireCooldown -= dt;
      if (state.fireCooldown <= 0) {
        state.fireCooldown = curRof;
        fireVulcanRound();
      }

      // 웨이브 적군 스폰
      if (state.waveSpawnLeft > 0) {
        state.spawnTimer -= dt;
        if (state.spawnTimer <= 0) {
          const burst = state.wave >= 2 ? 2 : 1;
          for (let b = 0; b < burst && state.waveSpawnLeft > 0; b++) {
            const roll = Math.random();
            let etype = "rusher";
            if (state.wave >= 2 && roll < 0.24) etype = "brute";
            if (state.wave >= 3 && roll < 0.14) etype = "ram";
            spawnEnemy(etype);
            state.waveSpawnLeft--;
          }
          state.spawnTimer = Math.max(0.28, 0.88 - state.wave * 0.14 - save.stage * 0.03);
        }
      } else if (!state.bossSpawned && enemies.every((e) => !e.alive)) {
        if (state.wave < state.maxWaves) {
          state.wave++;
          state.waveSpawnLeft = 20 + state.wave * 6 + save.stage * 5;
          spawnWaveBarrels();
          showToast(t("waveClear"));
        } else {
          state.bossSpawned = true;
          spawnWaveBarrels();
          spawnEnemy("boss", 0, -56);
          for (let i = 0; i < 8; i++) {
            spawnEnemy(i % 2 === 0 ? "brute" : "rusher", (Math.random() - 0.5) * 9.5, -50 - Math.random() * 10);
          }
        }
      }

      // 주기적 연료통 & 보급 크레이트 보충
      state.barrelTimer -= dt;
      if (state.barrelTimer <= 0) {
        state.barrelTimer = 4.8;
        spawnBarrel((Math.random() - 0.5) * 8.6, -15 - Math.random() * 34);
      }
      state.crateTimer -= dt;
      if (state.crateTimer <= 0) {
        state.crateTimer = 11.5;
        spawnCrate();
      }

      // 예약된 도미노 연쇄 폭파 실행
      for (let i = pendingBlasts.length - 1; i >= 0; i--) {
        pendingBlasts[i].delay -= dt;
        if (pendingBlasts[i].delay <= 0) {
          const pb = pendingBlasts.splice(i, 1)[0];
          detonateBarrel(pb.pos);
        }
      }

      // 적군 전진 & 방벽 충돌 처리
      for (let i = enemies.length - 1; i >= 0; i--) {
        const e = enemies[i];
        if (!e.alive) { enemies.splice(i, 1); continue; }
        e.z += e.speed * dt;
        e.mesh.position.set(e.x, 0, e.z);

        // 보병 다리 달리기 애니메이션
        if (e.mesh.userData.leftLeg) {
          const swing = Math.sin(state.time * 13 + e.phase) * 0.55;
          e.mesh.userData.leftLeg.rotation.x = swing;
          e.mesh.userData.rightLeg.rotation.x = -swing;
          e.mesh.position.y = Math.abs(Math.cos(state.time * 13 + e.phase)) * 0.14;
        } else if (e.type === "boss") {
          e.mesh.position.y = Math.abs(Math.sin(state.time * 5)) * 0.22;
        }

        // 방벽 도달(z >= 5.2) 시 데미지
        if (e.z >= 5.2) {
          state.shieldHp = Math.max(0, state.shieldHp - e.dmg);
          convoy.barrierUniforms.uHit.value = 1.0;
          state.shake = Math.min(1.0, state.shake + 0.35);
          SFX.shieldHit();
          spawnPop(new THREE.Vector3(e.x, 2.2, 5.8), `-${e.dmg}`, "#fb7185", false);
          if (e.type === "boss") {
            e.z = -3.0; // 보스는 밀려났다 재돌진
          } else {
            e.alive = false;
            scene.remove(e.mesh);
            enemies.splice(i, 1);
          }
          if (state.shieldHp <= 0) {
            endStage(false);
            break;
          }
        }
      }

      // 연료통 펄스 애니메이션
      for (let i = barrels.length - 1; i >= 0; i--) {
        const b = barrels[i];
        if (!b.alive) { barrels.splice(i, 1); continue; }
        const s = 1 + Math.sin(state.time * 6 + i) * 0.12;
        b.mesh.userData.pulseRing.scale.setScalar(s);
      }

      // 홀로 보급 크레이트 낙하 & 회전
      for (let i = crates.length - 1; i >= 0; i--) {
        const c = crates[i];
        if (!c.alive) { crates.splice(i, 1); continue; }
        if (c.y > 0) {
          c.y = Math.max(0, c.y - dt * 11);
          c.mesh.position.y = c.y;
        }
        c.mesh.userData.box.rotation.y += dt * 2.2;
      }

      updateHud();
    }

    // 트레이서 탄환 비행 & 착탄 판정
    for (let i = tracers.length - 1; i >= 0; i--) {
      const tr = tracers[i];
      tr.age += dt;
      const p = Math.min(1, tr.age / tr.dur);
      tr.mesh.position.lerpVectors(tr.start, tr.end, p);
      if (p >= 1) {
        scene.remove(tr.mesh);
        tracers.splice(i, 1);
        // 착탄 스플래시 & 연료통/크레이트 적중 검사
        for (let b = 0; b < barrels.length; b++) {
          const br = barrels[b];
          if (br.alive && Math.hypot(br.x - tr.end.x, br.z - tr.end.z) <= tr.splash + 0.75) {
            br.hp -= tr.dmg * 1.4;
            if (br.hp <= 0) {
              br.alive = false;
              scene.remove(br.mesh);
              detonateBarrel(new THREE.Vector3(br.x, 0.9, br.z));
            }
          }
        }
        for (let c = 0; c < crates.length; c++) {
          const cr = crates[c];
          if (cr.alive && Math.hypot(cr.x - tr.end.x, cr.z - tr.end.z) <= tr.splash + 0.9) {
            cr.hp -= tr.dmg * 1.3;
            if (cr.hp <= 0) collectCrate(cr);
          }
        }
        applyAoEDamage(tr.end, tr.splash, tr.dmg, false);
        createExplosionFX(tr.end, 1.15, false);
      }
    }

    // 호밍 미사일 비행 & 폭발
    for (let i = missiles.length - 1; i >= 0; i--) {
      const ms = missiles[i];
      ms.age += dt;
      const p = Math.min(1, ms.age / ms.dur);
      const pos = new THREE.Vector3().lerpVectors(ms.start, ms.target, p);
      pos.y += Math.sin(p * Math.PI) * ms.arc;
      ms.mesh.lookAt(ms.target);
      ms.mesh.position.copy(pos);
      if (p >= 1) {
        scene.remove(ms.mesh);
        missiles.splice(i, 1);
        SFX.explosion(true);
        state.shake = Math.min(1.0, state.shake + 0.35);
        createExplosionFX(ms.target, ms.radius, true);
        applyAoEDamage(ms.target, ms.radius, ms.dmg, true);
      }
    }

    // 폭발 파이어볼 & 충격파 링 업데이트
    for (let i = blasts.length - 1; i >= 0; i--) {
      const bl = blasts[i];
      bl.age += dt;
      const p = Math.min(1, bl.age / bl.dur);
      const sc = 0.4 + p * bl.maxScale;
      bl.mesh.scale.setScalar(sc);
      bl.mesh.material.opacity = Math.max(0, (1 - p) * 0.92);
      if (p >= 1) {
        scene.remove(bl.mesh);
        bl.mesh.material.dispose();
        blasts.splice(i, 1);
      }
    }

    // 불꽃 파편 파티클 업데이트
    for (let i = particles.length - 1; i >= 0; i--) {
      const pt = particles[i];
      pt.age += dt;
      pt.vy -= 22 * dt;
      pt.mesh.position.x += pt.vx * dt;
      pt.mesh.position.y = Math.max(0.1, pt.mesh.position.y + pt.vy * dt);
      pt.mesh.position.z += pt.vz * dt;
      pt.mesh.rotation.x += dt * 7;
      pt.mesh.rotation.y += dt * 5;
      const sc = Math.max(0.01, 1 - pt.age / pt.dur);
      pt.mesh.scale.setScalar(sc);
      if (pt.age >= pt.dur) {
        scene.remove(pt.mesh);
        pt.mesh.material.dispose();
        particles.splice(i, 1);
      }
    }

    // 카메라 쉐이크 + 시네마틱 팔로우
    state.shake = Math.max(0, state.shake - dt * 2.4);
    const sx = (Math.random() - 0.5) * state.shake * 0.95;
    const sy = (Math.random() - 0.5) * state.shake * 0.75;
    camera.position.set(
      BASE_CAM_POS.x + aimPoint.x * 0.28 + sx,
      BASE_CAM_POS.y + sy,
      BASE_CAM_POS.z
    );
    camera.lookAt(BASE_CAM_LOOK.x + aimPoint.x * 0.22, BASE_CAM_LOOK.y, BASE_CAM_LOOK.z);

    renderer.render(scene, camera);
  }

  applyI18n();
  updateHud();
  requestAnimationFrame(tick);
})();

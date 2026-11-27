/**
 * 캐논 크라우드 3D: 성채 돌파 (CANNON CROWD 3D: CASTLE RUSH)
 * 3D 웹광고 시리즈 #02 — Three.js 실시간 3D WebGL 몹컨트롤 × 배수 게이트 × 공성전 엔진.
 * 주간 계곡 석재 공성로, 움직이는 ×2·×3·×4 배수 게이트, 1손 드래그 캐논 대군 발사,
 * 골든 타이탄 챔피언 소환, 적 성채 수비군 격돌 및 영구 4대 업그레이드 지원.
 */
(function () {
  const SAVE_KEY = "nv_cannon_crowd_save_v1";

  const I18N = {
    ko: {
      castleHp: "적 성채 내구도", allies: "아군", enemies: "적군", wallHp: "캐논 방벽",
      champBtn: "골든 챔피언 출격!", megaGate: "×4 게이트 소환",
      title: "캐논 크라우드 3D",
      intro: "화면을 누른 채 좌우로 드래그해 푸른 군단을 발사하세요! 움직이는 ×2·×3 배수 게이트를 통과해 대군으로 적 성채를 함락시키세요!",
      playBtn: "성채 돌파 전투 시작!",
      dragHint: "← 꾹 누르고 좌우 드래그(또는 A/D + SPACE)로 대군 발사 →",
      spawned: "총 출격 병력", defeated: "적 격파", earned: "획득 골드",
      reviveAd: "광고 보고 골든 챔피언 3기 긴급 지원!",
      doubleAd: "광고 보고 획득 골드 2배!",
      nextStage: "다음 성채 & 업그레이드",
      retryStage: "업그레이드 & 재도전",
      adDesc: "포털 배포 시 실제 보상형 광고가 재생됩니다.",
      winTitle: "적 성채 함락 성공!", loseTitle: "캐논 방벽 돌파됨!",
      champReady: "👑 골든 챔피언 준비 완료! 출격하세요!",
      champGo: "👑 골든 타이탄 챔피언 돌격!!",
      megaSpawn: "⚡ ×4 메가 배수 게이트 출현!",
      upRate: "캐논 연사", upPower: "부대 체력", upChamp: "챔피언 파워", upGold: "골드 보너스",
    },
    en: {
      castleHp: "ENEMY FORTRESS", allies: "ALLIES", enemies: "FOES", wallHp: "CANNON WALL",
      champBtn: "LAUNCH CHAMPION!", megaGate: "SPAWN ×4 GATE",
      title: "CANNON CROWD 3D",
      intro: "Press & drag left/right to rapid-fire blue squads! Aim through moving ×2/×3 multiplier gates to swarm and shatter the Red Fortress!",
      playBtn: "START CASTLE RUSH!",
      dragHint: "← Hold & Drag Left/Right (or A/D + SPACE) to Fire →",
      spawned: "TROOPS SENT", defeated: "FOES CRUSHED", earned: "GOLD EARNED",
      reviveAd: "WATCH AD · 3 GOLDEN CHAMPIONS REVIVE!",
      doubleAd: "WATCH AD · 2x STAGE GOLD!",
      nextStage: "NEXT FORTRESS & UPGRADES",
      retryStage: "UPGRADE & RETRY",
      adDesc: "Real portal rewarded video plays on CrazyGames/Poki.",
      winTitle: "FORTRESS CONQUERED!", loseTitle: "CANNON WALL BREACHED!",
      champReady: "👑 GOLDEN CHAMPION READY!",
      champGo: "👑 GOLDEN TITAN CHAMPION CHARGE!",
      megaSpawn: "⚡ ×4 MEGA GATE DEPLOYED!",
      upRate: "Fire Rate", upPower: "Troop Power", upChamp: "Champion Might", upGold: "Gold Bonus",
    },
  };

  let lang = localStorage.getItem("nv_lang") || "ko";
  const t = (k) => (I18N[lang] && I18N[lang][k]) || I18N.ko[k] || k;
  function haptic(p) { try { if (navigator.vibrate) navigator.vibrate(p); } catch (_) {} }

  function loadSave() {
    try {
      const p = JSON.parse(localStorage.getItem(SAVE_KEY) || "{}");
      return {
        stage: p.stage || 1,
        bestStage: p.bestStage || 0,
        gold: p.gold || 100,
        up: {
          rate: p.up?.rate || 0,
          power: p.up?.power || 0,
          champ: p.up?.champ || 0,
          gold: p.up?.gold || 0,
        },
      };
    } catch (_) {
      return { stage: 1, bestStage: 0, gold: 100, up: { rate: 0, power: 0, champ: 0, gold: 0 } };
    }
  }
  let save = loadSave();
  function persist() { try { localStorage.setItem(SAVE_KEY, JSON.stringify(save)); } catch (_) {} }

  const SFX = {
    ctx: null, on: true, lastPop: 0,
    unlock() {
      if (!this.ctx) {
        const AC = window.AudioContext || window.webkitAudioContext;
        if (AC) this.ctx = new AC();
      }
      if (this.ctx && this.ctx.state === "suspended") this.ctx.resume().catch(() => {});
    },
    tone(f1, f2, dur, type = "triangle", vol = 0.06) {
      if (!this.on || !this.ctx || this.ctx.state !== "running") return;
      const now = this.ctx.currentTime;
      const o = this.ctx.createOscillator();
      const g = this.ctx.createGain();
      o.type = type;
      o.frequency.setValueAtTime(f1, now);
      o.frequency.exponentialRampToValueAtTime(Math.max(40, f2), now + dur);
      g.gain.setValueAtTime(vol, now);
      g.gain.exponentialRampToValueAtTime(0.001, now + dur);
      o.connect(g); g.connect(this.ctx.destination);
      o.start(now); o.stop(now + dur + 0.01);
    },
    fire() {
      if (!this.on || !this.ctx || this.ctx.state !== "running") return;
      const now = this.ctx.currentTime;
      if (now - this.lastPop < 0.07) return;
      this.lastPop = now;
      this.tone(310, 160, 0.05, "triangle", 0.045);
    },
    mul() { this.tone(560, 980, 0.09, "sine", 0.05); },
    boom() { this.tone(190, 48, 0.2, "sawtooth", 0.11); },
    fanfare() {
      this.tone(523, 659, 0.14, "triangle", 0.1);
      setTimeout(() => this.tone(659, 784, 0.14, "triangle", 0.1), 110);
      setTimeout(() => this.tone(784, 1046, 0.24, "triangle", 0.12), 220);
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
    const fill = document.getElementById("ad-fill");
    const timer = document.getElementById("ad-timer");
    modal.classList.remove("hidden");
    let left = 2.0;
    const iv = setInterval(() => {
      left = Math.max(0, left - 0.1);
      fill.style.width = `${((2.0 - left) / 2.0) * 100}%`;
      timer.textContent = `${left.toFixed(1)}s`;
      if (left <= 0) { clearInterval(iv); modal.classList.add("hidden"); onOk(); }
    }, 100);
  }

  // ==================== Three.js 3D 공성전 씬 ====================
  const container = document.getElementById("canvas-wrap");
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x69c0ff);
  scene.fog = new THREE.Fog(0x9bdcff, 42, 110);

  const camera = new THREE.PerspectiveCamera(46, 1, 0.5, 160);
  const renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: "high-performance" });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.outputEncoding = THREE.sRGBEncoding;
  container.insertBefore(renderer.domElement, container.firstChild);

  scene.add(new THREE.HemisphereLight(0xe0f2fe, 0x166534, 0.95));
  const sun = new THREE.DirectionalLight(0xfffbeb, 1.25);
  sun.position.set(14, 28, 16);
  sun.castShadow = true;
  sun.shadow.mapSize.width = 1024;
  sun.shadow.mapSize.height = 1024;
  sun.shadow.camera.left = -20; sun.shadow.camera.right = 20;
  sun.shadow.camera.top = 24; sun.shadow.camera.bottom = -24;
  scene.add(sun);

  // 프로시저럴 석재 공성로 텍스처
  function createStoneRoadTex() {
    const c = document.createElement("canvas");
    c.width = 512; c.height = 512;
    const g = c.getContext("2d");
    g.fillStyle = "#cbd5e1";
    g.fillRect(0, 0, 512, 512);
    for (let y = 0; y < 512; y += 64) {
      for (let x = 0; x < 512; x += 64) {
        const off = (y / 64) % 2 === 0 ? 0 : 32;
        const v = 188 + Math.floor(Math.random() * 24);
        g.fillStyle = `rgb(${v},${v + 4},${v + 12})`;
        g.fillRect((x + off) % 512 + 3, y + 3, 58, 58);
      }
    }
    const tex = new THREE.CanvasTexture(c);
    tex.wrapS = THREE.RepeatWrapping; tex.wrapT = THREE.RepeatWrapping;
    tex.repeat.set(2, 6);
    tex.encoding = THREE.sRGBEncoding;
    return tex;
  }

  const FIELD_W = 11.4;
  const HALF_X = 4.6;
  const CANNON_Z = 11.5;
  const CASTLE_Z = -13.5;

  // 에메랄드 초원 바닥
  const grass = new THREE.Mesh(
    new THREE.PlaneGeometry(160, 160),
    new THREE.MeshStandardMaterial({ color: 0x22c55e, roughness: 0.9 })
  );
  grass.rotation.x = -Math.PI / 2;
  grass.position.y = -0.15;
  grass.receiveShadow = true;
  scene.add(grass);

  // 석재 공성로 & 좌우 성벽 경계
  const road = new THREE.Mesh(
    new THREE.BoxGeometry(FIELD_W, 0.3, 30),
    new THREE.MeshStandardMaterial({ map: createStoneRoadTex(), roughness: 0.85 })
  );
  road.position.set(0, -0.05, -1);
  road.receiveShadow = true;
  scene.add(road);

  const wallMat = new THREE.MeshStandardMaterial({ color: 0x64748b, roughness: 0.75 });
  const borderL = new THREE.Mesh(new THREE.BoxGeometry(0.8, 1.0, 30), wallMat);
  borderL.position.set(-FIELD_W / 2 - 0.3, 0.4, -1); borderL.castShadow = true;
  const borderR = borderL.clone(); borderR.position.x = FIELD_W / 2 + 0.3;
  scene.add(borderL, borderR);

  // 계곡 양옆 3D 침엽수 장식
  const trunkMat = new THREE.MeshStandardMaterial({ color: 0x78350f, roughness: 0.9 });
  const leafMat = new THREE.MeshStandardMaterial({ color: 0x15803d, roughness: 0.8 });
  for (let i = 0; i < 14; i++) {
    const side = i % 2 === 0 ? -1 : 1;
    const tg = new THREE.Group();
    const tr = new THREE.Mesh(new THREE.CylinderGeometry(0.25, 0.32, 1.2, 6), trunkMat); tr.position.y = 0.6;
    const lf = new THREE.Mesh(new THREE.ConeGeometry(1.15, 2.8, 7), leafMat); lf.position.y = 2.3; lf.castShadow = true;
    tg.add(tr, lf);
    tg.position.set(side * (FIELD_W / 2 + 2.6 + (i % 3) * 1.6), 0, -14 + i * 2.1);
    scene.add(tg);
  }

  // ==================== 3D 모델 (캐논 · 적 성채 · 아군/적군/챔피언 · 배수 게이트) ====================
  const mats = {
    blueBody: new THREE.MeshStandardMaterial({ color: 0x2563eb, roughness: 0.35, metalness: 0.25 }),
    blueHelmet: new THREE.MeshStandardMaterial({ color: 0x1d4ed8, roughness: 0.3, metalness: 0.35 }),
    goldBody: new THREE.MeshStandardMaterial({ color: 0xfacc15, roughness: 0.25, metalness: 0.6, emissive: 0xb45309, emissiveIntensity: 0.25 }),
    redBody: new THREE.MeshStandardMaterial({ color: 0xdc2626, roughness: 0.4, metalness: 0.2 }),
    redDark: new THREE.MeshStandardMaterial({ color: 0x991b1b, roughness: 0.45 }),
    skin: new THREE.MeshStandardMaterial({ color: 0xfdba74, roughness: 0.7 }),
    steel: new THREE.MeshStandardMaterial({ color: 0xe2e8f0, metalness: 0.55, roughness: 0.35 }),
    dark: new THREE.MeshStandardMaterial({ color: 0x1e293b, roughness: 0.5 }),
  };

  // 아군 3D 공성 캐논
  const cannonGroup = new THREE.Group();
  cannonGroup.position.set(0, 0, CANNON_Z);
  const cBase = new THREE.Mesh(new THREE.BoxGeometry(1.6, 0.7, 1.5), mats.blueHelmet);
  cBase.position.y = 0.5; cBase.castShadow = true;
  const wGeo = new THREE.CylinderGeometry(0.42, 0.42, 0.25, 12);
  const wL = new THREE.Mesh(wGeo, mats.dark); wL.rotation.z = Math.PI / 2; wL.position.set(-0.9, 0.42, 0.1);
  const wR = wL.clone(); wR.position.x = 0.9;
  const cBarrel = new THREE.Mesh(new THREE.CylinderGeometry(0.42, 0.56, 2.2, 14), mats.blueBody);
  cBarrel.rotation.x = Math.PI / 2 - 0.12;
  cBarrel.position.set(0, 1.05, -0.55); cBarrel.castShadow = true;
  const cRing = new THREE.Mesh(new THREE.CylinderGeometry(0.49, 0.49, 0.24, 14), mats.goldBody);
  cRing.rotation.x = Math.PI / 2 - 0.12;
  cRing.position.set(0, 1.15, -1.4);
  cannonGroup.add(cBase, wL, wR, cBarrel, cRing);
  scene.add(cannonGroup);

  // 적 3D 붉은 성채
  const castleGroup = new THREE.Group();
  castleGroup.position.set(0, 0, CASTLE_Z);
  const cWall = new THREE.Mesh(new THREE.BoxGeometry(9.6, 3.8, 2.4), mats.redDark);
  cWall.position.y = 1.9; cWall.castShadow = true; cWall.receiveShadow = true;
  const gateArch = new THREE.Mesh(new THREE.BoxGeometry(2.6, 2.5, 2.55), mats.dark);
  gateArch.position.y = 1.25;
  const towerGeo = new THREE.CylinderGeometry(1.35, 1.5, 5.8, 10);
  const tL = new THREE.Mesh(towerGeo, mats.redBody); tL.position.set(-4.3, 2.9, 0); tL.castShadow = true;
  const tR = tL.clone(); tR.position.x = 4.3;
  const roofGeo = new THREE.ConeGeometry(1.7, 2.1, 10);
  const rL = new THREE.Mesh(roofGeo, mats.goldBody); rL.position.set(-4.3, 6.8, 0);
  const rR = rL.clone(); rR.position.x = 4.3;
  castleGroup.add(cWall, gateArch, tL, tR, rL, rR);
  scene.add(castleGroup);

  // 병사 공용 지오메트리
  const unitGeo = {
    body: new THREE.BoxGeometry(0.46, 0.52, 0.34),
    head: new THREE.SphereGeometry(0.22, 8, 8),
    shard: new THREE.BoxGeometry(0.24, 0.24, 0.24),
  };

  function createUnitMesh(team, isChamp = false) {
    const g = new THREE.Group();
    const mat = team === "blue" ? (isChamp ? mats.goldBody : mats.blueBody) : mats.redBody;
    const b = new THREE.Mesh(unitGeo.body, mat);
    b.position.y = 0.42; b.castShadow = true;
    const h = new THREE.Mesh(unitGeo.head, isChamp ? mats.goldBody : mats.skin);
    h.position.y = 0.85;
    const cap = new THREE.Mesh(new THREE.BoxGeometry(0.48, 0.16, 0.48), isChamp ? mats.goldBody : mat);
    cap.position.y = 1.0;
    g.add(b, h, cap);
    if (isChamp) g.scale.setScalar(2.35);
    return g;
  }

  function createMultiplierGate(z, mult, moveAmp, moveSpd, phase) {
    const w = 3.5;
    const h = 2.6;
    const g = new THREE.Group();
    g.position.set(0, 0, z);

    const c = document.createElement("canvas");
    c.width = 256; c.height = 172;
    const ctx2 = c.getContext("2d");
    const grad = ctx2.createLinearGradient(0, 0, 0, 172);
    if (mult >= 4) {
      grad.addColorStop(0, "rgba(250, 204, 21, 0.92)");
      grad.addColorStop(1, "rgba(234, 88, 12, 0.7)");
    } else {
      grad.addColorStop(0, "rgba(56, 189, 248, 0.9)");
      grad.addColorStop(1, "rgba(37, 99, 235, 0.68)");
    }
    ctx2.fillStyle = grad; ctx2.fillRect(0, 0, 256, 172);
    ctx2.strokeStyle = "#ffffff"; ctx2.lineWidth = 10; ctx2.strokeRect(5, 5, 246, 162);
    ctx2.font = "900 92px sans-serif"; ctx2.textAlign = "center"; ctx2.textBaseline = "middle";
    ctx2.lineWidth = 10; ctx2.strokeStyle = "#0f172a";
    ctx2.strokeText(`×${mult}`, 128, 92);
    ctx2.fillStyle = "#ffffff";
    ctx2.fillText(`×${mult}`, 128, 92);

    const tex = new THREE.CanvasTexture(c);
    tex.encoding = THREE.sRGBEncoding;
    const panel = new THREE.Mesh(
      new THREE.PlaneGeometry(w, h),
      new THREE.MeshBasicMaterial({ map: tex, transparent: true, side: THREE.DoubleSide })
    );
    panel.position.y = h / 2 + 0.05;
    const pGeo = new THREE.CylinderGeometry(0.14, 0.16, h + 0.25, 8);
    const pL = new THREE.Mesh(pGeo, mats.steel); pL.position.set(-w / 2, h / 2, 0);
    const pR = pL.clone(); pR.position.x = w / 2;
    g.add(panel, pL, pR);
    scene.add(g);
    return { id: Math.random().toString(36).slice(2), group: g, x: 0, z, w, mult, moveAmp, moveSpd, phase };
  }

  // ==================== 게임 상태 ====================
  const UP_DEFS = [
    { key: "rate", labelKey: "upRate", baseCost: 55, scale: 1.55, icon: "⚡" },
    { key: "power", labelKey: "upPower", baseCost: 65, scale: 1.55, icon: "🛡️" },
    { key: "champ", labelKey: "upChamp", baseCost: 75, scale: 1.6, icon: "👑" },
    { key: "gold", labelKey: "upGold", baseCost: 70, scale: 1.55, icon: "◆" },
  ];
  const upCost = (d) => Math.round(d.baseCost * Math.pow(d.scale, save.up[d.key]));

  let state = "menu"; // menu | playing | result
  let cannonX = 0;
  let targetX = 0;
  let firing = false;
  let recoil = 0;
  let fireCd = 0;
  let enemyWaveCd = 2.0;
  let castleHp = 100;
  let castleMaxHp = 100;
  let wallHp = 100;
  let champGauge = 0; // 0..100
  let runSpawned = 0;
  let runDefeated = 0;
  let runGold = 0;
  let megaUsed = false;
  let revivedOnce = false;
  let doubledOnce = false;
  let shake = 0;
  let toastTimer = 0;

  let gates = [];
  let allies = [];
  let foes = [];
  let shards = [];

  function showToast(msg) {
    const el = document.getElementById("toast-banner");
    el.textContent = msg;
    el.classList.remove("hidden");
    toastTimer = 1.9;
  }

  function popup3D(worldPos, text, color = "#fde047") {
    const v = worldPos.clone().project(camera);
    if (v.z > 1) return;
    const div = document.createElement("div");
    div.className = "pop-txt";
    div.style.left = `${(v.x * 0.5 + 0.5) * container.clientWidth}px`;
    div.style.top = `${(-v.y * 0.5 + 0.5) * container.clientHeight}px`;
    div.style.color = color;
    div.textContent = text;
    document.getElementById("fx-layer").appendChild(div);
    setTimeout(() => div.remove(), 820);
  }

  function burstShards(x, y, z, colorHex, count = 8) {
    const mat = new THREE.MeshStandardMaterial({ color: colorHex, roughness: 0.4 });
    for (let i = 0; i < count && shards.length < 90; i++) {
      const m = new THREE.Mesh(unitGeo.shard, mat);
      m.position.set(x, y, z);
      scene.add(m);
      shards.push({
        mesh: m,
        vx: (Math.random() - 0.5) * 8,
        vy: 3 + Math.random() * 5.5,
        vz: (Math.random() - 0.5) * 8,
        life: 0.48,
      });
    }
  }

  function clearArena() {
    gates.forEach((g) => scene.remove(g.group));
    allies.forEach((u) => scene.remove(u.mesh));
    foes.forEach((u) => scene.remove(u.mesh));
    gates = []; allies = []; foes = [];
  }

  function spawnAlly(x, z, isChamp = false, passedSet = null) {
    if (!isChamp && allies.length >= 110) return;
    const m = createUnitMesh("blue", isChamp);
    m.position.set(x, 0, z);
    scene.add(m);
    const baseHp = 1 + save.up.power * 0.35;
    allies.push({
      mesh: m, x, z,
      vx: (Math.random() - 0.5) * 1.1,
      hp: isChamp ? (14 + save.up.champ * 5) : baseHp,
      dmg: isChamp ? (10 + save.up.champ * 3.5) : (1 + save.up.power * 0.25),
      speed: isChamp ? 6.4 : 7.6,
      champ: isChamp,
      passed: passedSet ? new Set(passedSet) : new Set(),
      phase: Math.random() * 6,
    });
    runSpawned++;
  }

  function spawnFoe(x, z, isKnight = false) {
    if (foes.length >= 90) return;
    const m = createUnitMesh("red", false);
    if (isKnight) m.scale.setScalar(1.6);
    m.position.set(x, 0, z);
    scene.add(m);
    const st = save.stage;
    foes.push({
      mesh: m, x, z,
      hp: isKnight ? (5 + st * 1.8) : (1 + st * 0.3),
      dmg: isKnight ? 3 : 1,
      speed: isKnight ? 3.5 : 4.4,
      knight: isKnight,
      phase: Math.random() * 6,
    });
  }

  function startBattle() {
    clearArena();
    const st = save.stage;
    castleMaxHp = 110 + (st - 1) * 75;
    castleHp = castleMaxHp;
    wallHp = 100;
    champGauge = 20;
    runSpawned = 0;
    runDefeated = 0;
    runGold = 0;
    megaUsed = false;
    revivedOnce = false;
    doubledOnce = false;
    cannonX = 0;
    targetX = 0;
    enemyWaveCd = 1.4;

    // 2단 움직이는 배수 게이트 배치
    gates.push(createMultiplierGate(4.2, 2, 3.2, 1.35 + st * 0.1, 0));
    gates.push(createMultiplierGate(-3.2, st >= 2 ? 3 : 2, 3.4, -(1.15 + st * 0.12), 1.8));

    document.getElementById("start-overlay").classList.add("hidden");
    document.getElementById("result-overlay").classList.add("hidden");
    document.getElementById("battle-dock").classList.remove("hidden");
    document.getElementById("btn-mega-gate").disabled = false;
    state = "playing";
    if (window.CrazyGames?.SDK?.game) window.CrazyGames.SDK.game.gameplayStart();
    syncUI();
  }

  function finishBattle(won) {
    state = "result";
    firing = false;
    document.getElementById("battle-dock").classList.add("hidden");
    const mult = 1 + save.up.gold * 0.25;
    const bonus = won ? Math.round((90 + save.stage * 40) * mult) : 0;
    runGold = Math.round(runGold * mult) + bonus;
    save.gold += runGold;
    if (won) {
      if (save.stage > save.bestStage) save.bestStage = save.stage;
      save.stage++;
      SFX.fanfare();
      burstShards(0, 3.5, CASTLE_Z, 0xfacc15, 24);
      burstShards(0, 3.0, CASTLE_Z, 0x38bdf8, 22);
    } else {
      SFX.boom();
    }
    persist();

    document.getElementById("res-kicker").textContent = won ? `STAGE ${save.stage - 1} CLEAR!` : `STAGE ${save.stage}`;
    document.getElementById("res-title").textContent = won ? t("winTitle") : t("loseTitle");
    document.getElementById("res-spawned").textContent = runSpawned.toLocaleString();
    document.getElementById("res-defeated").textContent = runDefeated.toLocaleString();
    document.getElementById("res-earned").textContent = `+${runGold.toLocaleString()}`;
    document.getElementById("btn-res-revive").classList.toggle("hidden", won || revivedOnce);
    document.getElementById("btn-res-double").disabled = doubledOnce || runGold <= 0;
    document.getElementById("btn-res-next").textContent = won ? t("nextStage") : t("retryStage");
    document.getElementById("result-overlay").classList.remove("hidden");
    if (window.CrazyGames?.SDK?.game) window.CrazyGames.SDK.game.gameplayStop();
    syncUI();
  }

  function launchChampion() {
    if (state !== "playing" || champGauge < 100) return;
    champGauge = 0;
    recoil = 1.0;
    shake = 6;
    spawnAlly(cannonX, CANNON_Z - 1.6, true);
    showToast(t("champGo"));
    SFX.fanfare();
    haptic([25, 20, 40]);
    syncUI();
  }

  function update(dt) {
    dt = Math.min(dt, 0.05);
    const nowSec = performance.now() * 0.001;

    if (toastTimer > 0) {
      toastTimer -= dt;
      if (toastTimer <= 0) document.getElementById("toast-banner").classList.add("hidden");
    }
    shake = Math.max(0, shake - dt * 20);

    for (let i = shards.length - 1; i >= 0; i--) {
      const sh = shards[i];
      sh.life -= dt; sh.vy -= 17 * dt;
      sh.mesh.position.x += sh.vx * dt;
      sh.mesh.position.y = Math.max(0.1, sh.mesh.position.y + sh.vy * dt);
      sh.mesh.position.z += sh.vz * dt;
      sh.mesh.scale.setScalar(Math.max(0.01, sh.life * 2));
      if (sh.life <= 0) { scene.remove(sh.mesh); shards.splice(i, 1); }
    }

    if (state !== "playing") {
      camera.position.set(Math.sin(nowSec * 0.35) * 2.2, 16.5, 23.5);
      camera.lookAt(0, 1.0, -2.5);
      return;
    }

    // 키보드 조향 & 발사
    const kDir = (keys.right ? 1 : 0) - (keys.left ? 1 : 0);
    if (kDir !== 0) targetX = Math.max(-HALF_X, Math.min(HALF_X, targetX + kDir * 10 * dt));
    cannonX += (targetX - cannonX) * Math.min(1, dt * 15);
    recoil = Math.max(0, recoil - dt * 6);
    cannonGroup.position.set(cannonX, 0, CANNON_Z + recoil * 0.32);

    // 게이트 좌우 왕복
    for (const gt of gates) {
      gt.x = Math.sin(nowSec * gt.moveSpd + gt.phase) * gt.moveAmp;
      gt.group.position.x = gt.x;
    }

    // 캐논 아군 발사
    const fireInterval = Math.max(0.085, 0.24 / (1 + save.up.rate * 0.18));
    fireCd -= dt;
    if ((firing || keys.space) && fireCd <= 0) {
      fireCd = fireInterval;
      recoil = 0.55;
      spawnAlly(cannonX + (Math.random() - 0.5) * 0.4, CANNON_Z - 1.5, false);
      const prevChamp = champGauge;
      champGauge = Math.min(100, champGauge + 4.5);
      if (prevChamp < 100 && champGauge >= 100) showToast(t("champReady"));
      SFX.fire();
    }

    // 적 성채 수비군 출격
    enemyWaveCd -= dt;
    if (enemyWaveCd <= 0) {
      const st = save.stage;
      enemyWaveCd = Math.max(1.3, 2.5 - st * 0.12);
      const count = 4 + Math.min(10, st * 2);
      for (let k = 0; k < count; k++) {
        spawnFoe((Math.random() - 0.5) * 5.2, CASTLE_Z + 1.8 + Math.random() * 1.4, k === 0 && st >= 2);
      }
    }

    // 아군 이동 + 배수 게이트 분열 + 적 성채 타격
    for (let i = allies.length - 1; i >= 0; i--) {
      const u = allies[i];
      u.z -= u.speed * dt;
      u.x = Math.max(-HALF_X, Math.min(HALF_X, u.x + u.vx * dt));
      u.vx *= Math.pow(0.25, dt);
      u.mesh.position.set(u.x, Math.abs(Math.sin(nowSec * 12 + u.phase)) * 0.16, u.z);

      // 배수 게이트 통과 시 분열!
      for (const gt of gates) {
        if (!u.passed.has(gt.id) && Math.abs(u.z - gt.z) < 0.7 && Math.abs(u.x - gt.x) < gt.w * 0.5) {
          u.passed.add(gt.id);
          if (!u.champ) {
            const clones = gt.mult - 1;
            for (let c = 0; c < clones; c++) {
              spawnAlly(u.x + (Math.random() - 0.5) * 0.9, u.z - 0.25 - Math.random() * 0.4, false, u.passed);
            }
            SFX.mul();
            if (Math.random() < 0.25) popup3D(new THREE.Vector3(gt.x, 2.2, gt.z), `×${gt.mult}!`, "#38bdf8");
          }
        }
      }

      // 적 성채 충돌!
      if (u.z <= CASTLE_Z + 1.5) {
        castleHp = Math.max(0, castleHp - u.dmg);
        runGold += u.champ ? 8 : 1;
        burstShards(u.x, 1.2, CASTLE_Z + 1.4, u.champ ? 0xfacc15 : 0x38bdf8, u.champ ? 12 : 4);
        if (u.champ) { shake = 5; SFX.boom(); }
        scene.remove(u.mesh);
        allies.splice(i, 1);
        if (castleHp <= 0) { finishBattle(true); return; }
      }
    }

    // 적군 이동 + 캐논 방벽 충돌
    for (let i = foes.length - 1; i >= 0; i--) {
      const f = foes[i];
      f.z += f.speed * dt;
      f.mesh.position.set(f.x, Math.abs(Math.sin(nowSec * 10 + f.phase)) * 0.14, f.z);
      if (f.z >= CANNON_Z - 0.9) {
        wallHp = Math.max(0, wallHp - (f.knight ? 14 : 6));
        shake = 6; SFX.boom(); haptic(25);
        burstShards(f.x, 0.8, CANNON_Z - 1, 0xef4444, 8);
        scene.remove(f.mesh);
        foes.splice(i, 1);
        if (wallHp <= 0) { finishBattle(false); return; }
      }
    }

    // 아군 vs 적군 군중 격돌
    for (let i = allies.length - 1; i >= 0; i--) {
      const a = allies[i];
      for (let j = foes.length - 1; j >= 0; j--) {
        const f = foes[j];
        const hitDist = a.champ ? 1.4 : 0.72;
        if (Math.abs(a.z - f.z) < hitDist && Math.abs(a.x - f.x) < hitDist) {
          f.hp -= a.dmg;
          a.hp -= f.dmg;
          if (f.hp <= 0) {
            runDefeated++;
            runGold += f.knight ? 6 : 2;
            burstShards(f.x, 0.7, f.z, 0xef4444, 5);
            scene.remove(f.mesh);
            foes.splice(j, 1);
          }
          if (a.hp <= 0) {
            burstShards(a.x, 0.7, a.z, 0x38bdf8, 4);
            scene.remove(a.mesh);
            allies.splice(i, 1);
            break;
          }
        }
      }
    }

    const sx = (Math.random() - 0.5) * shake * 0.08;
    const sy = (Math.random() - 0.5) * shake * 0.08;
    camera.position.set(cannonX * 0.15 + sx, 17.5 + sy, 23.2);
    camera.lookAt(0, 0.5, -1.8);
    syncUI();
  }

  function renderUpgrades() {
    const grid = document.getElementById("upgrade-grid");
    grid.innerHTML = "";
    UP_DEFS.forEach((d) => {
      const cost = upCost(d);
      const btn = document.createElement("button");
      btn.className = "up-card";
      btn.disabled = save.gold < cost;
      btn.innerHTML = `
        <div><span class="up-name">${d.icon} ${t(d.labelKey)}</span><span class="up-lv">Lv.${save.up[d.key] + 1}</span></div>
        <span class="up-cost">◆ ${cost}</span>
      `;
      btn.onclick = () => {
        if (save.gold < cost) return;
        save.gold -= cost;
        save.up[d.key]++;
        persist();
        SFX.mul();
        haptic(14);
        syncUI();
      };
      grid.appendChild(btn);
    });
  }

  function syncUI() {
    document.getElementById("ui-stage").textContent = save.stage;
    document.getElementById("ui-gold").textContent = (save.gold + (state === "playing" ? runGold : 0)).toLocaleString();
    document.getElementById("ui-castle-hp").textContent = Math.ceil(castleHp);
    document.getElementById("ui-castle-fill").style.width = `${Math.max(0, (castleHp / castleMaxHp) * 100)}%`;
    document.getElementById("ui-allies").textContent = allies.length;
    document.getElementById("ui-enemies").textContent = foes.length;
    document.getElementById("ui-wall").textContent = `${Math.ceil(wallHp)}%`;
    document.getElementById("ui-champ-pct").textContent = `${Math.floor(champGauge)}%`;
    document.getElementById("btn-champion").disabled = champGauge < 100 || state !== "playing";
    if (state === "menu") renderUpgrades();
  }

  function applyI18n() {
    document.documentElement.lang = lang;
    document.querySelectorAll("[data-i18n]").forEach((el) => { el.textContent = t(el.getAttribute("data-i18n")); });
    document.getElementById("btn-lang").textContent = lang.toUpperCase();
    syncUI();
  }

  // 입력 (모바일 1손 꾹 누르고 드래그 + 키보드)
  const keys = { left: false, right: false, space: false };
  window.addEventListener("keydown", (e) => {
    if (e.key === "ArrowLeft" || e.key === "a" || e.key === "A") keys.left = true;
    if (e.key === "ArrowRight" || e.key === "d" || e.key === "D") keys.right = true;
    if (e.key === " ") keys.space = true;
    if (e.key === "Enter" || e.key === "e" || e.key === "E") launchChampion();
  });
  window.addEventListener("keyup", (e) => {
    if (e.key === "ArrowLeft" || e.key === "a" || e.key === "A") keys.left = false;
    if (e.key === "ArrowRight" || e.key === "d" || e.key === "D") keys.right = false;
    if (e.key === " ") keys.space = false;
  });

  let activePtr = null;
  let lastPtrX = 0;
  container.addEventListener("pointerdown", (e) => {
    if (state !== "playing" || activePtr !== null) return;
    SFX.unlock();
    activePtr = e.pointerId;
    firing = true;
    lastPtrX = e.clientX;
    try { container.setPointerCapture(e.pointerId); } catch (_) {}
  });
  window.addEventListener("pointermove", (e) => {
    if (state !== "playing" || e.pointerId !== activePtr) return;
    const dx = e.clientX - lastPtrX;
    lastPtrX = e.clientX;
    const sens = (FIELD_W / Math.max(280, container.clientWidth)) * 1.4;
    targetX = Math.max(-HALF_X, Math.min(HALF_X, targetX + dx * sens));
  });
  window.addEventListener("pointerup", (e) => {
    if (e.pointerId !== activePtr) return;
    activePtr = null;
    firing = false;
  });
  window.addEventListener("pointercancel", (e) => {
    if (e.pointerId !== activePtr) return;
    activePtr = null;
    firing = false;
  });

  document.getElementById("btn-sound").onclick = (e) => {
    SFX.on = !SFX.on;
    e.currentTarget.textContent = SFX.on ? "🔊" : "🔇";
  };
  document.getElementById("btn-lang").onclick = () => {
    lang = lang === "ko" ? "en" : "ko";
    localStorage.setItem("nv_lang", lang);
    applyI18n();
  };
  document.getElementById("btn-play").onclick = () => { SFX.unlock(); startBattle(); };
  document.getElementById("btn-champion").onclick = launchChampion;
  document.getElementById("btn-mega-gate").onclick = () => {
    if (megaUsed || state !== "playing") return;
    showRewarded(() => {
      megaUsed = true;
      document.getElementById("btn-mega-gate").disabled = true;
      gates.push(createMultiplierGate(0.6, 4, 2.2, 1.0, 0.5));
      showToast(t("megaSpawn"));
      SFX.fanfare();
    });
  };
  document.getElementById("btn-res-revive").onclick = () => {
    if (revivedOnce) return;
    showRewarded(() => {
      revivedOnce = true;
      wallHp = 100;
      foes.forEach((f) => scene.remove(f.mesh));
      foes = [];
      spawnAlly(-1.6, CANNON_Z - 2.0, true);
      spawnAlly(0, CANNON_Z - 2.2, true);
      spawnAlly(1.6, CANNON_Z - 2.0, true);
      document.getElementById("result-overlay").classList.add("hidden");
      document.getElementById("battle-dock").classList.remove("hidden");
      state = "playing";
      if (window.CrazyGames?.SDK?.game) window.CrazyGames.SDK.game.gameplayStart();
      syncUI();
    });
  };
  document.getElementById("btn-res-double").onclick = () => {
    if (doubledOnce || runGold <= 0) return;
    showRewarded(() => {
      doubledOnce = true;
      save.gold += runGold;
      persist();
      document.getElementById("res-earned").textContent = `+${(runGold * 2).toLocaleString()}`;
      document.getElementById("btn-res-double").disabled = true;
      syncUI();
    });
  };
  document.getElementById("btn-res-next").onclick = () => {
    document.getElementById("result-overlay").classList.add("hidden");
    document.getElementById("start-overlay").classList.remove("hidden");
    clearArena();
    state = "menu";
    syncUI();
  };

  function handleResize() {
    const w = Math.max(320, container.clientWidth);
    const h = Math.max(320, container.clientHeight);
    camera.aspect = w / h;
    camera.fov = h > w ? 56 : 46;
    camera.updateProjectionMatrix();
    renderer.setSize(w, h, false);
  }
  window.addEventListener("resize", handleResize);
  handleResize();
  applyI18n();

  let last = performance.now();
  function animate(now) {
    requestAnimationFrame(animate);
    const dt = (now - last) / 1000;
    last = now;
    update(dt);
    renderer.render(scene, camera);
  }
  requestAnimationFrame(animate);
})();

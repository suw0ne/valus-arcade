/**
 * 라스트 브릿지 3D: 스쿼드 러시 (LAST BRIDGE 3D: SQUAD RUSH)
 * Three.js 실시간 3D WebGL 게이트 슈팅 × 스쿼드 증식 × 무기 진화 × 브릿지 보스전 엔진.
 * 주간 태양광·실시간 그림자·아스팔트 현수교·사격 반전 홀로그램 게이트·무기 드럼통·전술 탱크·거대 보스 탑재.
 */
(function () {
  const SAVE_KEY = "nv_last_bridge_save_v1";

  const I18N = {
    ko: {
      stage: "STAGE", squad: "병력", bossName: "타이탄 브릿지 보스",
      title: "라스트 브릿지 3D",
      intro: "좌우 드래그로 빨간 게이트를 쏴 파란 게이트로 뒤집고, 스쿼드를 수십 명으로 불려 무기 진화와 거대 보스까지 돌파하세요!",
      adStartBoost: "광고 보고 +8 정예 병력으로 출격!",
      playBtn: "브릿지 돌파 출격!",
      dragHint: "← 좌우 드래그 / 마우스 / 방향키로 스쿼드 조종 →",
      kills: "적 격파", maxSquad: "최대 병력", earned: "획득 골드",
      reviveAd: "광고 보고 +12 병력 긴급 증원 부활!",
      doubleAd: "광고 보고 획득 골드 2배 받기!",
      nextStage: "다음 스테이지 & 업그레이드",
      retryStage: "업그레이드 & 재도전",
      adDesc: "포털 배포 시 실제 보상형 광고가 재생됩니다.",
      clearTitle: "브릿지 돌파 성공!",
      failTitle: "스쿼드 전멸!",
      bossWarn: "⚠️ 거대 타이탄 보스 출현! 집중 화력!",
      tankSpawn: "🛡️ 전술 장갑 탱크 합류! 포격 지원 개시!",
      upStart: "초기 병력", upDmg: "화력 강화", upRate: "연사 속도", upGold: "골드 배율",
      weapons: ["Lv.1 기관단총", "Lv.2 돌격소총", "Lv.3 회전 미니건", "Lv.4 플라즈마 캐논", "Lv.5 전술 로켓"],
    },
    en: {
      stage: "STAGE", squad: "SQUAD", bossName: "TITAN BRIDGE BOSS",
      title: "LAST BRIDGE 3D",
      intro: "Drag left & right to shoot red gates into blue multipliers, shatter weapon barrels to evolve guns, and crush the Titan Boss!",
      adStartBoost: "WATCH AD · START WITH +8 TROOPS!",
      playBtn: "LAUNCH BRIDGE RUSH!",
      dragHint: "← Drag / Mouse / Arrow Keys to Steer Squad →",
      kills: "KILLS", maxSquad: "PEAK SQUAD", earned: "GOLD EARNED",
      reviveAd: "WATCH AD · +12 SQUAD REVIVE!",
      doubleAd: "WATCH AD · 2x STAGE GOLD!",
      nextStage: "NEXT STAGE & UPGRADES",
      retryStage: "UPGRADE & RETRY",
      adDesc: "Real portal rewarded video plays on CrazyGames/Poki.",
      clearTitle: "BRIDGE SECURED!",
      failTitle: "SQUAD WIPED OUT!",
      bossWarn: "⚠️ TITAN BOSS AHEAD! FOCUS FIRE!",
      tankSpawn: "🛡️ TACTICAL BATTLE TANK DEPLOYED!",
      upStart: "Start Squad", upDmg: "Firepower", upRate: "Fire Rate", upGold: "Gold Bonus",
      weapons: ["Lv.1 SMG", "Lv.2 Assault Rifle", "Lv.3 Minigun", "Lv.4 Plasma Cannon", "Lv.5 Tactical Rocket"],
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
        gold: p.gold || 120,
        up: {
          start: p.up?.start || 0,
          dmg: p.up?.dmg || 0,
          rate: p.up?.rate || 0,
          gold: p.up?.gold || 0,
        },
      };
    } catch (_) {
      return { stage: 1, bestStage: 0, gold: 120, up: { start: 0, dmg: 0, rate: 0, gold: 0 } };
    }
  }
  let save = loadSave();
  function persist() { try { localStorage.setItem(SAVE_KEY, JSON.stringify(save)); } catch (_) {} }

  // Web Audio 프로시저럴 타격 사운드
  const SFX = {
    ctx: null, on: true, lastShot: 0,
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
    shot(tier) {
      if (!this.on || !this.ctx || this.ctx.state !== "running") return;
      const now = this.ctx.currentTime;
      if (now - this.lastShot < 0.055) return;
      this.lastShot = now;
      this.tone(420 + tier * 70, 140, 0.045, tier >= 3 ? "sawtooth" : "square", 0.032);
    },
    gateGood() { this.tone(520, 1080, 0.16, "triangle", 0.1); },
    gateBad() { this.tone(240, 110, 0.18, "sawtooth", 0.1); },
    boom() { this.tone(180, 42, 0.22, "sawtooth", 0.13); },
    fanfare() {
      this.tone(523, 659, 0.14, "triangle", 0.1);
      setTimeout(() => this.tone(659, 784, 0.14, "triangle", 0.1), 110);
      setTimeout(() => this.tone(784, 1046, 0.25, "triangle", 0.12), 220);
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

  // ==================== Three.js 3D 씬 초기화 ====================
  const container = document.getElementById("canvas-wrap");
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x69c0ff);
  scene.fog = new THREE.Fog(0x8bd3ff, 58, 155);

  const camera = new THREE.PerspectiveCamera(48, 1, 0.5, 220);
  const renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: "high-performance" });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.outputEncoding = THREE.sRGBEncoding;
  container.insertBefore(renderer.domElement, container.firstChild);

  // 주간 태양광 + 하늘 반사광 (고대비 상용 3D 룩)
  const hemiLight = new THREE.HemisphereLight(0xe0f2fe, 0x334155, 0.95);
  scene.add(hemiLight);

  const dirLight = new THREE.DirectionalLight(0xfffbeb, 1.25);
  dirLight.position.set(16, 30, 18);
  dirLight.castShadow = true;
  dirLight.shadow.mapSize.width = 1024;
  dirLight.shadow.mapSize.height = 1024;
  dirLight.shadow.camera.near = 4;
  dirLight.shadow.camera.far = 110;
  const dCam = 24;
  dirLight.shadow.camera.left = -dCam;
  dirLight.shadow.camera.right = dCam;
  dirLight.shadow.camera.top = dCam;
  dirLight.shadow.camera.bottom = -dCam;
  scene.add(dirLight);
  scene.add(dirLight.target);

  // 프로시저럴 고해상도 아스팔트 현수교 도로 텍스처
  function createRoadTexture() {
    const c = document.createElement("canvas");
    c.width = 512; c.height = 512;
    const g = c.getContext("2d");
    g.fillStyle = "#334155";
    g.fillRect(0, 0, 512, 512);
    // 미세 아스팔트 질감 노이즈
    for (let i = 0; i < 3200; i++) {
      const shade = 44 + Math.floor(Math.random() * 24);
      g.fillStyle = `rgb(${shade},${shade + 8},${shade + 18})`;
      g.fillRect(Math.random() * 512, Math.random() * 512, 3, 3);
    }
    // 좌우 흰색 갓길 실선
    g.fillStyle = "#f8fafc";
    g.fillRect(24, 0, 12, 512);
    g.fillRect(476, 0, 12, 512);
    // 중앙 노란 이중선 + 차선 점선
    g.fillStyle = "#facc15";
    g.fillRect(248, 0, 6, 512);
    g.fillRect(258, 0, 6, 512);
    g.fillStyle = "rgba(248,250,252,0.85)";
    for (let y = 20; y < 512; y += 96) {
      g.fillRect(136, y, 8, 52);
      g.fillRect(368, y, 8, 52);
    }
    const tex = new THREE.CanvasTexture(c);
    tex.wrapS = THREE.RepeatWrapping;
    tex.wrapT = THREE.RepeatWrapping;
    tex.repeat.set(1, 24);
    tex.encoding = THREE.sRGBEncoding;
    return tex;
  }

  function createHazardTexture() {
    const c = document.createElement("canvas");
    c.width = 256; c.height = 64;
    const g = c.getContext("2d");
    g.fillStyle = "#e2e8f0";
    g.fillRect(0, 0, 256, 64);
    g.fillStyle = "#ef4444";
    for (let x = -64; x < 320; x += 48) {
      g.beginPath();
      g.moveTo(x, 64); g.lineTo(x + 22, 64); g.lineTo(x + 42, 0); g.lineTo(x + 20, 0);
      g.closePath(); g.fill();
    }
    const tex = new THREE.CanvasTexture(c);
    tex.wrapS = THREE.RepeatWrapping;
    tex.wrapT = THREE.RepeatWrapping;
    tex.repeat.set(28, 1);
    tex.encoding = THREE.sRGBEncoding;
    return tex;
  }

  const ROAD_W = 10.6;
  const HALF_X = 4.2;
  const BRIDGE_LEN = 320;
  const roadTex = createRoadTexture();
  const hazardTex = createHazardTexture();

  // 바다 수면
  const oceanGeo = new THREE.PlaneGeometry(360, 420);
  const oceanMat = new THREE.MeshStandardMaterial({ color: 0x0284c7, roughness: 0.25, metalness: 0.15 });
  const ocean = new THREE.Mesh(oceanGeo, oceanMat);
  ocean.rotation.x = -Math.PI / 2;
  ocean.position.set(0, -5.5, -120);
  scene.add(ocean);

  // 아스팔트 다리 상판
  const bridgeGroup = new THREE.Group();
  scene.add(bridgeGroup);

  const deck = new THREE.Mesh(
    new THREE.BoxGeometry(ROAD_W, 1.2, BRIDGE_LEN),
    new THREE.MeshStandardMaterial({ map: roadTex, roughness: 0.85 })
  );
  deck.position.set(0, -0.6, -BRIDGE_LEN / 2 + 25);
  deck.receiveShadow = true;
  bridgeGroup.add(deck);

  // 좌우 위험 줄무늬 콘크리트 가드레일
  const railGeo = new THREE.BoxGeometry(0.65, 1.1, BRIDGE_LEN);
  const railMat = new THREE.MeshStandardMaterial({ map: hazardTex, roughness: 0.6 });
  const railL = new THREE.Mesh(railGeo, railMat);
  railL.position.set(-ROAD_W / 2 - 0.25, 0.35, -BRIDGE_LEN / 2 + 25);
  railL.castShadow = true; railL.receiveShadow = true;
  const railR = railL.clone();
  railR.position.x = ROAD_W / 2 + 0.25;
  bridgeGroup.add(railL, railR);

  // 주기적 현수교 강철 아치 타워 (속도감·입체감 극대화)
  const archGroup = new THREE.Group();
  scene.add(archGroup);
  const towerMat = new THREE.MeshStandardMaterial({ color: 0x1e3a8a, metalness: 0.45, roughness: 0.4 });
  const cableMat = new THREE.MeshStandardMaterial({ color: 0xe2e8f0, metalness: 0.5, roughness: 0.35 });
  const arches = [];
  for (let i = 0; i < 6; i++) {
    const ag = new THREE.Group();
    const pGeo = new THREE.BoxGeometry(0.9, 14, 0.9);
    const pL = new THREE.Mesh(pGeo, towerMat); pL.position.set(-ROAD_W / 2 - 0.6, 5.5, 0); pL.castShadow = true;
    const pR = new THREE.Mesh(pGeo, towerMat); pR.position.set(ROAD_W / 2 + 0.6, 5.5, 0); pR.castShadow = true;
    const beam = new THREE.Mesh(new THREE.BoxGeometry(ROAD_W + 2.2, 0.85, 0.85), towerMat);
    beam.position.set(0, 12.2, 0);
    const lightBar = new THREE.Mesh(new THREE.BoxGeometry(ROAD_W, 0.22, 0.25), cableMat);
    lightBar.position.set(0, 11.7, 0);
    ag.add(pL, pR, beam, lightBar);
    ag.position.z = -i * 34;
    archGroup.add(ag);
    arches.push(ag);
  }

  // ==================== 3D 모델 팩토리 (병사 · 탱크 · 게이트 · 드럼통 · 좀비 · 보스) ====================
  const sharedGeo = {
    torso: new THREE.BoxGeometry(0.46, 0.56, 0.3),
    head: new THREE.SphereGeometry(0.22, 10, 10),
    helmet: new THREE.SphereGeometry(0.245, 10, 8, 0, Math.PI * 2, 0, Math.PI * 0.58),
    visor: new THREE.BoxGeometry(0.28, 0.1, 0.16),
    leg: new THREE.BoxGeometry(0.15, 0.36, 0.15),
    gun: new THREE.BoxGeometry(0.12, 0.14, 0.58),
    bullet: new THREE.BoxGeometry(0.14, 0.14, 0.85),
    shell: new THREE.SphereGeometry(0.28, 8, 8),
    shard: new THREE.BoxGeometry(0.24, 0.24, 0.24),
  };

  const mats = {
    soldierArmor: new THREE.MeshStandardMaterial({ color: 0x2563eb, roughness: 0.35, metalness: 0.25 }),
    soldierHelmet: new THREE.MeshStandardMaterial({ color: 0x1e40af, roughness: 0.3, metalness: 0.35 }),
    skin: new THREE.MeshStandardMaterial({ color: 0xfdba74, roughness: 0.7 }),
    visor: new THREE.MeshStandardMaterial({ color: 0x38bdf8, emissive: 0x0284c7, emissiveIntensity: 0.6 }),
    gunDark: new THREE.MeshStandardMaterial({ color: 0x1e293b, metalness: 0.7, roughness: 0.3 }),
    gunGold: new THREE.MeshStandardMaterial({ color: 0xf59e0b, metalness: 0.65, roughness: 0.25 }),
    bulletNormal: new THREE.MeshBasicMaterial({ color: 0xfef08a }),
    bulletPlasma: new THREE.MeshBasicMaterial({ color: 0x38bdf8 }),
    bulletRocket: new THREE.MeshBasicMaterial({ color: 0xfb923c }),
    zombieSkin: new THREE.MeshStandardMaterial({ color: 0x4ade80, roughness: 0.65 }),
    zombieArmor: new THREE.MeshStandardMaterial({ color: 0x3f6212, roughness: 0.7 }),
    bruteArmor: new THREE.MeshStandardMaterial({ color: 0xdc2626, roughness: 0.45, metalness: 0.2 }),
    hitFlash: new THREE.MeshBasicMaterial({ color: 0xffffff }),
    pillar: new THREE.MeshStandardMaterial({ color: 0xe2e8f0, metalness: 0.6, roughness: 0.3 }),
    barrelRed: new THREE.MeshStandardMaterial({ color: 0xe11d48, roughness: 0.35, metalness: 0.25 }),
    barrelGold: new THREE.MeshStandardMaterial({ color: 0xf59e0b, roughness: 0.28, metalness: 0.55 }),
    barrelBand: new THREE.MeshStandardMaterial({ color: 0xf8fafc, roughness: 0.4 }),
  };

  function createSoldierMesh() {
    const g = new THREE.Group();
    const legL = new THREE.Mesh(sharedGeo.leg, mats.soldierHelmet);
    legL.position.set(-0.11, 0.18, 0); legL.castShadow = true;
    const legR = new THREE.Mesh(sharedGeo.leg, mats.soldierHelmet);
    legR.position.set(0.11, 0.18, 0); legR.castShadow = true;
    const torso = new THREE.Mesh(sharedGeo.torso, mats.soldierArmor);
    torso.position.set(0, 0.62, 0); torso.castShadow = true;
    const head = new THREE.Mesh(sharedGeo.head, mats.skin);
    head.position.set(0, 1.06, 0); head.castShadow = true;
    const helmet = new THREE.Mesh(sharedGeo.helmet, mats.soldierHelmet);
    helmet.position.set(0, 1.08, 0);
    const visor = new THREE.Mesh(sharedGeo.visor, mats.visor);
    visor.position.set(0, 1.06, -0.17);
    const gun = new THREE.Mesh(sharedGeo.gun, mats.gunDark);
    gun.position.set(0.28, 0.66, -0.26); gun.castShadow = true;
    g.add(legL, legR, torso, head, helmet, visor, gun);
    g.userData = { legL, legR, gun, phase: Math.random() * Math.PI * 2 };
    return g;
  }

  function createTankMesh() {
    const g = new THREE.Group();
    const hull = new THREE.Mesh(new THREE.BoxGeometry(1.7, 0.72, 2.3), mats.soldierArmor);
    hull.position.y = 0.55; hull.castShadow = true;
    const treadGeo = new THREE.BoxGeometry(0.36, 0.45, 2.45);
    const tL = new THREE.Mesh(treadGeo, mats.gunDark); tL.position.set(-0.92, 0.25, 0);
    const tR = tL.clone(); tR.position.x = 0.92;
    const turret = new THREE.Mesh(new THREE.BoxGeometry(1.05, 0.55, 1.15), mats.soldierHelmet);
    turret.position.set(0, 1.15, 0.05); turret.castShadow = true;
    const barrel = new THREE.Mesh(new THREE.CylinderGeometry(0.11, 0.13, 1.75, 10), mats.gunGold);
    barrel.rotation.x = Math.PI / 2;
    barrel.position.set(0, 1.15, -1.15);
    g.add(hull, tL, tR, turret, barrel);
    return g;
  }

  function createZombieMesh(isBrute = false, isBoss = false) {
    const scale = isBoss ? 3.2 : isBrute ? 1.55 : 1.0;
    const g = new THREE.Group();
    const armorMat = isBoss || isBrute ? mats.bruteArmor : mats.zombieArmor;
    const body = new THREE.Mesh(sharedGeo.torso, armorMat);
    body.position.y = 0.62; body.castShadow = true;
    const head = new THREE.Mesh(sharedGeo.head, isBoss ? mats.bruteArmor : mats.zombieSkin);
    head.position.y = 1.08; head.castShadow = true;
    const eyeL = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.06, 0.06), new THREE.MeshBasicMaterial({ color: 0xfef08a }));
    eyeL.position.set(-0.08, 1.1, 0.19);
    const eyeR = eyeL.clone(); eyeR.position.x = 0.08;
    const armGeo = new THREE.BoxGeometry(0.14, 0.14, 0.55);
    const armL = new THREE.Mesh(armGeo, isBoss ? mats.bruteArmor : mats.zombieSkin);
    armL.position.set(-0.32, 0.72, 0.24);
    const armR = armL.clone(); armR.position.x = 0.32;
    const legL = new THREE.Mesh(sharedGeo.leg, mats.gunDark); legL.position.set(-0.11, 0.18, 0);
    const legR = legL.clone(); legR.position.x = 0.11;
    g.add(body, head, eyeL, eyeR, armL, armR, legL, legR);
    if (isBoss) {
      const crown = new THREE.Mesh(new THREE.ConeGeometry(0.28, 0.45, 5), mats.gunGold);
      crown.position.y = 1.45;
      g.add(crown);
    }
    g.scale.setScalar(scale);
    g.userData = { body, armorMat, legL, legR, phase: Math.random() * Math.PI * 2 };
    return g;
  }

  // 동적 게이트 캔버스 텍스처 (총알을 맞을수록 빨강 → 파랑 실시간 반전!)
  function drawGateCanvas(canvasEl, gate) {
    const g = canvasEl.getContext("2d");
    const w = canvasEl.width, h = canvasEl.height;
    const isGood = gate.kind === "mul" || gate.kind === "rate" || gate.val >= 0;
    const grad = g.createLinearGradient(0, 0, 0, h);
    if (gate.kind === "rate") {
      grad.addColorStop(0, "rgba(245, 158, 11, 0.88)");
      grad.addColorStop(1, "rgba(217, 119, 6, 0.62)");
    } else if (isGood) {
      grad.addColorStop(0, "rgba(14, 165, 233, 0.88)");
      grad.addColorStop(1, "rgba(37, 99, 235, 0.64)");
    } else {
      grad.addColorStop(0, "rgba(244, 63, 94, 0.88)");
      grad.addColorStop(1, "rgba(185, 28, 28, 0.64)");
    }
    g.clearRect(0, 0, w, h);
    g.fillStyle = grad;
    g.fillRect(0, 0, w, h);
    g.strokeStyle = "#ffffff";
    g.lineWidth = 10;
    g.strokeRect(5, 5, w - 10, h - 10);

    // 상단 라벨
    g.fillStyle = "rgba(15, 23, 42, 0.55)";
    g.fillRect(10, 10, w - 20, 46);
    g.fillStyle = "#f8fafc";
    g.font = "900 24px sans-serif";
    g.textAlign = "center";
    g.textBaseline = "middle";
    const sub = gate.kind === "mul"
      ? (lang === "ko" ? "스쿼드 증폭" : "SQUAD BOOST")
      : gate.kind === "rate"
        ? (lang === "ko" ? "연사 속도" : "FIRE RATE")
        : (lang === "ko" ? "병력 증원" : "TROOPS");
    g.fillText(sub, w / 2, 33);

    // 대형 숫자
    const label = gate.kind === "mul"
      ? `×${gate.val}`
      : gate.kind === "rate"
        ? `+${gate.val}%`
        : (gate.val >= 0 ? `+${gate.val}` : `${gate.val}`);
    g.font = "900 84px sans-serif";
    g.lineWidth = 10;
    g.strokeStyle = "#0f172a";
    g.strokeText(label, w / 2, h * 0.62);
    g.fillStyle = "#ffffff";
    g.fillText(label, w / 2, h * 0.62);
  }

  function createGateObject(laneSide, z, kind, val) {
    const w = ROAD_W * 0.46;
    const h = 3.2;
    const group = new THREE.Group();
    const x = laneSide < 0 ? -ROAD_W * 0.25 : ROAD_W * 0.25;
    group.position.set(x, 0, z);

    const c = document.createElement("canvas");
    c.width = 256; c.height = 192;
    const gate = { group, x, z, w, kind, val, canvas: c, tex: null, used: false, hitAccum: 0, bounce: 0 };
    drawGateCanvas(c, gate);
    const tex = new THREE.CanvasTexture(c);
    tex.encoding = THREE.sRGBEncoding;
    gate.tex = tex;

    const panel = new THREE.Mesh(
      new THREE.PlaneGeometry(w, h),
      new THREE.MeshBasicMaterial({ map: tex, transparent: true, side: THREE.DoubleSide })
    );
    panel.position.y = h / 2 + 0.1;

    const postGeo = new THREE.CylinderGeometry(0.16, 0.18, h + 0.35, 8);
    const pL = new THREE.Mesh(postGeo, mats.pillar); pL.position.set(-w / 2, (h + 0.2) / 2, 0); pL.castShadow = true;
    const pR = pL.clone(); pR.position.x = w / 2;
    const topBar = new THREE.Mesh(new THREE.BoxGeometry(w + 0.35, 0.28, 0.28), mats.pillar);
    topBar.position.y = h + 0.22;

    group.add(panel, pL, pR, topBar);
    scene.add(group);
    return gate;
  }

  function drawCrateLabel(canvasEl, hp, rewardLabel) {
    const g = canvasEl.getContext("2d");
    const w = canvasEl.width, h = canvasEl.height;
    g.clearRect(0, 0, w, h);
    g.fillStyle = "rgba(15, 23, 42, 0.86)";
    g.beginPath(); g.roundRect(4, 4, w - 8, h - 8, 16); g.fill();
    g.strokeStyle = "#fde047"; g.lineWidth = 6; g.stroke();
    g.fillStyle = "#fde047"; g.font = "900 22px sans-serif"; g.textAlign = "center"; g.textBaseline = "middle";
    g.fillText(rewardLabel, w / 2, 32);
    g.fillStyle = "#ffffff"; g.font = "900 54px sans-serif";
    g.fillText(`${Math.max(0, Math.ceil(hp))}`, w / 2, 84);
  }

  function createBarrelObject(x, z, hp, isTank = false) {
    const g = new THREE.Group();
    g.position.set(x, 0, z);
    const body = new THREE.Mesh(
      new THREE.CylinderGeometry(0.95, 0.95, 1.8, 14),
      isTank ? mats.barrelGold : mats.barrelRed
    );
    body.position.y = 0.9; body.castShadow = true;
    const band = new THREE.Mesh(new THREE.CylinderGeometry(0.99, 0.99, 0.28, 14), mats.barrelBand);
    band.position.y = 0.9;

    // 상단 회전 3D 무기/탱크 홀로그램
    const holo = new THREE.Mesh(
      isTank ? new THREE.BoxGeometry(0.95, 0.55, 1.15) : new THREE.BoxGeometry(0.32, 0.32, 1.35),
      mats.gunGold
    );
    holo.position.y = 2.45;

    const c = document.createElement("canvas");
    c.width = 220; c.height = 120;
    const labelTxt = isTank ? (lang === "ko" ? "전술 탱크" : "BATTLE TANK") : (lang === "ko" ? "무기 진화" : "WEAPON UP");
    drawCrateLabel(c, hp, labelTxt);
    const tex = new THREE.CanvasTexture(c);
    tex.encoding = THREE.sRGBEncoding;
    const sign = new THREE.Mesh(new THREE.PlaneGeometry(1.9, 1.05), new THREE.MeshBasicMaterial({ map: tex, transparent: true }));
    sign.position.set(0, 1.1, 1.02);

    g.add(body, band, holo, sign);
    scene.add(g);
    return { group: g, body, holo, x, z, hp, maxHp: hp, isTank, canvas: c, tex, labelTxt, alive: true, hitFlash: 0 };
  }

  // ==================== 게임 상태 관리 ====================
  const squadGroup = new THREE.Group();
  scene.add(squadGroup);
  let soldierMeshes = [];
  let tankMesh = null;

  let state = "menu"; // menu | playing | boss | result
  let squadX = 0;
  let targetX = 0;
  let squadCount = 3;
  let maxSquadRun = 3;
  let weaponTier = 0; // 0..4
  let rateBonus = 1.0;
  let runKills = 0;
  let runGold = 0;
  let stageLen = 175;
  let dist = 0;
  let shootCd = 0;
  let tankCd = 0;
  let revivedOnce = false;
  let doubledOnce = false;
  let stageCleared = false;
  let shake = 0;
  let toastTimer = 0;
  let bossObj = null;

  let gates = [];
  let barrels = [];
  let enemies = [];
  let bullets = [];
  let shards = [];

  const UP_DEFS = [
    { key: "start", labelKey: "upStart", baseCost: 60, scale: 1.55, icon: "👥" },
    { key: "dmg", labelKey: "upDmg", baseCost: 70, scale: 1.55, icon: "🔥" },
    { key: "rate", labelKey: "upRate", baseCost: 80, scale: 1.6, icon: "⚡" },
    { key: "gold", labelKey: "upGold", baseCost: 75, scale: 1.55, icon: "◆" },
  ];
  const upCost = (d) => Math.round(d.baseCost * Math.pow(d.scale, save.up[d.key]));

  function showToast(msg) {
    const el = document.getElementById("toast-banner");
    el.textContent = msg;
    el.classList.remove("hidden");
    toastTimer = 2.0;
  }

  function spawnPopup3D(worldPos, text, color = "#fde047") {
    const v = worldPos.clone().project(camera);
    if (v.z > 1) return;
    const sx = (v.x * 0.5 + 0.5) * container.clientWidth;
    const sy = (-v.y * 0.5 + 0.5) * container.clientHeight;
    const div = document.createElement("div");
    div.className = "pop-txt";
    div.style.left = `${sx}px`;
    div.style.top = `${sy}px`;
    div.style.color = color;
    div.textContent = text;
    document.getElementById("fx-layer").appendChild(div);
    setTimeout(() => div.remove(), 860);
  }

  function spawnShards(x, y, z, colorHex, count = 10) {
    const mat = new THREE.MeshStandardMaterial({ color: colorHex, roughness: 0.4 });
    for (let i = 0; i < count && shards.length < 95; i++) {
      const m = new THREE.Mesh(sharedGeo.shard, mat);
      m.position.set(x, y, z);
      scene.add(m);
      shards.push({
        mesh: m,
        vx: (Math.random() - 0.5) * 9,
        vy: 3.5 + Math.random() * 6,
        vz: (Math.random() - 0.5) * 9,
        life: 0.55,
      });
    }
  }

  function rebuildSquadVisuals() {
    const visualCount = Math.min(36, Math.max(0, squadCount));
    while (soldierMeshes.length < visualCount) {
      const m = createSoldierMesh();
      squadGroup.add(m);
      soldierMeshes.push(m);
    }
    while (soldierMeshes.length > visualCount) {
      const m = soldierMeshes.pop();
      squadGroup.remove(m);
    }
    // 황금각 나선 대형 배치 (수십 명도 겹치지 않고 웅장한 부대 대형 유지)
    const golden = 2.399963;
    for (let i = 0; i < soldierMeshes.length; i++) {
      const r = i === 0 ? 0 : 0.48 * Math.sqrt(i);
      const a = i * golden;
      soldierMeshes[i].position.set(Math.cos(a) * r, 0, Math.sin(a) * r * 0.85);
      soldierMeshes[i].userData.gun.material = weaponTier >= 3 ? mats.gunGold : mats.gunDark;
      const gScale = 1 + weaponTier * 0.14;
      soldierMeshes[i].userData.gun.scale.set(gScale, gScale, gScale);
    }
  }

  function deployTank() {
    if (tankMesh) return;
    tankMesh = createTankMesh();
    tankMesh.position.set(2.05, 0, 0.9);
    squadGroup.add(tankMesh);
    document.getElementById("ui-tank-tag").classList.remove("hidden");
    showToast(t("tankSpawn"));
    SFX.fanfare();
    haptic([30, 20, 40]);
  }

  function clearWorldObjects() {
    for (const gt of gates) scene.remove(gt.group);
    for (const br of barrels) scene.remove(br.group);
    for (const en of enemies) scene.remove(en.mesh);
    for (const bl of bullets) scene.remove(bl.mesh);
    if (bossObj) { scene.remove(bossObj.mesh); bossObj = null; }
    if (tankMesh) { squadGroup.remove(tankMesh); tankMesh = null; }
    gates = []; barrels = []; enemies = []; bullets = [];
    document.getElementById("ui-tank-tag").classList.add("hidden");
    document.getElementById("boss-hud").classList.add("hidden");
  }

  function buildStageCourse() {
    clearWorldObjects();
    const st = save.stage;
    stageLen = 175 + Math.min(80, (st - 1) * 18);

    // 1. 게이트 6쌍 배치 (한쪽은 사격 반전 빨강 게이트, 한쪽은 파랑/배수/연사 게이트)
    const gateZs = [-28, -56, -86, -116, -144, -168];
    gateZs.forEach((gz, idx) => {
      const leftNeg = idx % 2 === 0;
      const negVal = -(6 + st * 2 + idx * 2);
      const posKind = idx === 2 || idx === 5 ? "mul" : idx === 3 ? "rate" : "add";
      const posVal = posKind === "mul" ? 2 : posKind === "rate" ? 30 : (4 + st + idx);
      gates.push(createGateObject(leftNeg ? -1 : 1, gz, "add", negVal));
      gates.push(createGateObject(leftNeg ? 1 : -1, gz, posKind, posVal));
    });

    // 2. 무기 진화 드럼통 & 골든 탱크 크레이트
    const barrelSpecs = [
      { x: 2.3, z: -42, hp: 14 + st * 6, tank: false },
      { x: -2.4, z: -72, hp: 26 + st * 10, tank: false },
      { x: 2.4, z: -102, hp: 42 + st * 14, tank: true },
      { x: -2.1, z: -132, hp: 58 + st * 18, tank: false },
    ];
    barrelSpecs.forEach((bs) => barrels.push(createBarrelObject(bs.x, bs.z, bs.hp, bs.tank)));

    // 3. 브릿지 좀비 무리 & 레드 저거너트 배치
    const waveZs = [-38, -66, -96, -124, -155];
    waveZs.forEach((wz, wIdx) => {
      const count = 6 + st * 2 + wIdx * 2;
      for (let i = 0; i < count; i++) {
        const isBrute = i === 0 && wIdx >= 2;
        const m = createZombieMesh(isBrute, false);
        const ex = (Math.random() - 0.5) * (ROAD_W - 2.2);
        const ez = wz - Math.random() * 11;
        m.position.set(ex, 0, ez);
        scene.add(m);
        const maxHp = (isBrute ? 32 : 7) + st * (isBrute ? 10 : 3) + wIdx * 2;
        enemies.push({ mesh: m, x: ex, z: ez, hp: maxHp, maxHp, brute: isBrute, speed: isBrute ? 3.2 : 4.6, flash: 0 });
      }
    });

    // 4. 브릿지 종착점 타이탄 보스 생성
    const bm = createZombieMesh(true, true);
    const bossHp = 180 + st * 110;
    bm.position.set(0, 0, -stageLen - 16);
    scene.add(bm);
    bossObj = { mesh: bm, x: 0, z: -stageLen - 16, hp: bossHp, maxHp: bossHp, flash: 0, stompCd: 2.2 };
  }

  function startStage(bonusTroops = 0) {
    squadCount = 3 + save.up.start * 2 + bonusTroops;
    maxSquadRun = squadCount;
    weaponTier = 0;
    rateBonus = 1.0 + save.up.rate * 0.14;
    runKills = 0;
    runGold = 0;
    dist = 0;
    squadX = 0;
    targetX = 0;
    revivedOnce = false;
    doubledOnce = false;
    stageCleared = false;
    buildStageCourse();
    rebuildSquadVisuals();
    document.getElementById("start-overlay").classList.add("hidden");
    document.getElementById("result-overlay").classList.add("hidden");
    document.getElementById("squad-float-badge").classList.remove("hidden");
    state = "playing";
    if (window.CrazyGames?.SDK?.game) window.CrazyGames.SDK.game.gameplayStart();
    syncUI();
  }

  function finishStage(won) {
    state = "result";
    stageCleared = won;
    document.getElementById("squad-float-badge").classList.add("hidden");
    const goldMult = 1 + save.up.gold * 0.25;
    const clearBonus = won ? Math.round((85 + save.stage * 35) * goldMult) : 0;
    runGold = Math.round(runGold * goldMult) + clearBonus;
    save.gold += runGold;
    if (won) {
      if (save.stage > save.bestStage) save.bestStage = save.stage;
      save.stage++;
      SFX.fanfare();
      spawnShards(squadX, 3.2, -2, 0xfacc15, 22);
      spawnShards(squadX, 3.6, -2, 0x38bdf8, 22);
    } else {
      SFX.boom();
    }
    persist();

    document.getElementById("res-kicker").textContent = won ? `STAGE ${save.stage - 1} CLEAR!` : `STAGE ${save.stage}`;
    document.getElementById("res-title").textContent = won ? t("clearTitle") : t("failTitle");
    document.getElementById("res-kills").textContent = runKills.toLocaleString();
    document.getElementById("res-maxsquad").textContent = maxSquadRun.toLocaleString();
    document.getElementById("res-earned").textContent = `+${runGold.toLocaleString()}`;
    document.getElementById("btn-res-revive").classList.toggle("hidden", won || revivedOnce);
    document.getElementById("btn-res-double").disabled = doubledOnce || runGold <= 0;
    document.getElementById("btn-res-next").textContent = won ? t("nextStage") : t("retryStage");
    document.getElementById("result-overlay").classList.remove("hidden");
    if (window.CrazyGames?.SDK?.game) window.CrazyGames.SDK.game.gameplayStop();
    syncUI();
  }

  function fireVolley() {
    const visualFireCount = Math.min(10, Math.max(1, Math.ceil(squadCount / 3)));
    const dmgPerBullet = (1.15 + save.up.dmg * 0.35) * (1 + weaponTier * 0.55) * (squadCount / visualFireCount);
    const bMat = weaponTier >= 4 ? mats.bulletRocket : weaponTier >= 3 ? mats.bulletPlasma : mats.bulletNormal;
    const spread = Math.min(1.6, 0.22 * Math.sqrt(squadCount));

    for (let i = 0; i < visualFireCount; i++) {
      const ox = visualFireCount === 1 ? 0 : ((i / (visualFireCount - 1)) - 0.5) * spread * 2;
      const m = new THREE.Mesh(sharedGeo.bullet, bMat);
      m.position.set(squadX + ox, 0.85, -0.75);
      if (weaponTier >= 3) m.scale.set(1.5, 1.5, 1.35);
      scene.add(m);
      bullets.push({ mesh: m, x: m.position.x, z: m.position.z, dmg: dmgPerBullet, splash: weaponTier >= 4 ? 1.8 : 0 });
    }
    SFX.shot(weaponTier);
  }

  function fireTankShell() {
    if (!tankMesh) return;
    const m = new THREE.Mesh(sharedGeo.shell, mats.bulletRocket);
    m.position.set(squadX + 2.0, 1.2, -1.2);
    scene.add(m);
    bullets.push({ mesh: m, x: m.position.x, z: m.position.z, dmg: (16 + save.up.dmg * 5) * (1 + weaponTier * 0.4), splash: 3.2 });
    SFX.boom();
  }

  function update(dt) {
    dt = Math.min(dt, 0.05);
    const nowSec = performance.now() * 0.001;

    if (toastTimer > 0) {
      toastTimer -= dt;
      if (toastTimer <= 0) document.getElementById("toast-banner").classList.add("hidden");
    }
    shake = Math.max(0, shake - dt * 22);

    // 3D 파편 물리 갱신
    for (let i = shards.length - 1; i >= 0; i--) {
      const sh = shards[i];
      sh.life -= dt;
      sh.vy -= 18 * dt;
      sh.mesh.position.x += sh.vx * dt;
      sh.mesh.position.y = Math.max(0.1, sh.mesh.position.y + sh.vy * dt);
      sh.mesh.position.z += sh.vz * dt;
      sh.mesh.rotation.x += 7 * dt;
      sh.mesh.rotation.y += 5 * dt;
      sh.mesh.scale.setScalar(Math.max(0.01, sh.life * 1.8));
      if (sh.life <= 0) {
        scene.remove(sh.mesh);
        shards.splice(i, 1);
      }
    }

    // 메뉴 상태: 주간 3D 다리 위 스쿼드 라이브 대기 애니메이션
    if (state === "menu" || state === "result") {
      roadTex.offset.y -= dt * 0.28;
      for (const sm of soldierMeshes) {
        const ph = nowSec * 9 + sm.userData.phase;
        sm.userData.legL.rotation.x = Math.sin(ph) * 0.45;
        sm.userData.legR.rotation.x = -Math.sin(ph) * 0.45;
      }
      camera.position.set(Math.sin(nowSec * 0.35) * 2.4, 7.6, 12.2);
      camera.lookAt(0, 1.3, -10);
      return;
    }

    // 좌우 스쿼드 조향
    const keyDir = (keys.right ? 1 : 0) - (keys.left ? 1 : 0);
    if (keyDir !== 0) targetX = Math.max(-HALF_X, Math.min(HALF_X, targetX + keyDir * 10.5 * dt));
    squadX += (targetX - squadX) * Math.min(1, dt * 14);
    squadGroup.position.x = squadX;

    // 병사 달리기 애니메이션
    for (const sm of soldierMeshes) {
      const ph = nowSec * 14 + sm.userData.phase;
      sm.userData.legL.rotation.x = Math.sin(ph) * 0.65;
      sm.userData.legR.rotation.x = -Math.sin(ph) * 0.65;
    }

    // 월드 전진 속도 (보스전 진입 시 정지하고 보스 격전!)
    const forwardSpd = state === "boss" ? 0 : 12.6;
    if (forwardSpd > 0) {
      dist += forwardSpd * dt;
      roadTex.offset.y -= (forwardSpd * dt) / 13.3;
      hazardTex.offset.x -= (forwardSpd * dt) / 11.4;
      for (const ag of arches) {
        ag.position.z += forwardSpd * dt;
        if (ag.position.z > 24) ag.position.z -= 204;
      }
    }

    // 보스전 전환 체크
    if (state === "playing" && dist >= stageLen - 6) {
      state = "boss";
      document.getElementById("boss-hud").classList.remove("hidden");
      showToast(t("bossWarn"));
      SFX.boom();
    }

    // 자동 연사 발사
    const baseFireInterval = Math.max(0.09, (0.28 - weaponTier * 0.032) / rateBonus);
    shootCd -= dt;
    if (shootCd <= 0) {
      fireVolley();
      shootCd = baseFireInterval;
    }
    if (tankMesh) {
      tankCd -= dt;
      if (tankCd <= 0) {
        fireTankShell();
        tankCd = 1.35;
      }
    }

    // 게이트 이동 & 스쿼드 통과 처리
    for (let i = gates.length - 1; i >= 0; i--) {
      const gt = gates[i];
      gt.z += forwardSpd * dt;
      gt.group.position.z = gt.z;
      if (gt.bounce > 0) {
        gt.bounce = Math.max(0, gt.bounce - dt * 5);
        const s = 1 + gt.bounce * 0.1;
        gt.group.scale.set(s, s, 1);
      }

      if (!gt.used && gt.z >= -0.7 && gt.z <= 1.2 && Math.abs(squadX - gt.x) <= gt.w * 0.56) {
        gt.used = true;
        // 같은 Z 라인의 반대편 게이트도 동시 통과 방지
        gates.forEach((other) => { if (Math.abs(other.z - gt.z) < 2) other.used = true; });
        const pos = new THREE.Vector3(gt.x, 2.2, 0);
        if (gt.kind === "mul") {
          squadCount = Math.min(120, Math.round(squadCount * gt.val));
          spawnPopup3D(pos, `×${gt.val} SQUAD!`, "#38bdf8");
          spawnShards(gt.x, 1.8, 0, 0x38bdf8, 16);
          SFX.gateGood();
          haptic(20);
        } else if (gt.kind === "rate") {
          rateBonus = Math.min(2.8, rateBonus + gt.val / 100);
          spawnPopup3D(pos, `⚡ +${gt.val}% RATE!`, "#fde047");
          spawnShards(gt.x, 1.8, 0, 0xfacc15, 14);
          SFX.gateGood();
        } else {
          squadCount = Math.min(120, squadCount + gt.val);
          const good = gt.val >= 0;
          spawnPopup3D(pos, good ? `+${gt.val} 병력!` : `${gt.val} 병력!`, good ? "#4ade80" : "#fb7185");
          spawnShards(gt.x, 1.8, 0, good ? 0x38bdf8 : 0xf43f5e, 14);
          if (good) SFX.gateGood(); else { SFX.gateBad(); shake = 6; }
        }
        maxSquadRun = Math.max(maxSquadRun, squadCount);
        scene.remove(gt.group);
        gates.splice(i, 1);
        if (squadCount <= 0) { finishStage(false); return; }
        rebuildSquadVisuals();
      } else if (gt.z > 10) {
        scene.remove(gt.group);
        gates.splice(i, 1);
      }
    }

    // 무기 드럼통 이동 & 회전 & 충돌
    for (let i = barrels.length - 1; i >= 0; i--) {
      const br = barrels[i];
      br.z += forwardSpd * dt;
      br.group.position.z = br.z;
      br.holo.rotation.y += 2.6 * dt;
      if (br.hitFlash > 0) {
        br.hitFlash -= dt;
        br.body.material = br.hitFlash > 0 ? mats.hitFlash : (br.isTank ? mats.barrelGold : mats.barrelRed);
      }
      if (br.z > -1.0 && br.z < 1.3 && Math.abs(squadX - br.x) < 1.45) {
        squadCount = Math.max(0, squadCount - 4);
        shake = 8; SFX.gateBad(); haptic(35);
        spawnShards(br.x, 1.1, br.z, 0xf43f5e, 14);
        scene.remove(br.group);
        barrels.splice(i, 1);
        if (squadCount <= 0) { finishStage(false); return; }
        rebuildSquadVisuals();
      } else if (br.z > 10) {
        scene.remove(br.group);
        barrels.splice(i, 1);
      }
    }

    // 좀비 웨이브 전진 및 스쿼드 충돌
    for (let i = enemies.length - 1; i >= 0; i--) {
      const en = enemies[i];
      const activeZ = en.z > -46;
      en.z += (forwardSpd + (activeZ ? en.speed : 0)) * dt;
      if (activeZ) en.x += (squadX - en.x) * Math.min(1, dt * 1.4);
      en.mesh.position.set(en.x, 0, en.z);
      const ph = nowSec * 10 + en.mesh.userData.phase;
      en.mesh.userData.legL.rotation.x = Math.sin(ph) * 0.55;
      en.mesh.userData.legR.rotation.x = -Math.sin(ph) * 0.55;
      if (en.flash > 0) {
        en.flash -= dt;
        en.mesh.userData.body.material = en.flash > 0 ? mats.hitFlash : en.mesh.userData.armorMat;
      }

      if (en.z > -0.9 && en.z < 1.5 && Math.abs(en.x - squadX) < 1.35 + Math.sqrt(squadCount) * 0.25) {
        squadCount = Math.max(0, squadCount - (en.brute ? 3 : 1));
        shake = 6; SFX.gateBad(); haptic(20);
        spawnShards(en.x, 0.9, en.z, 0x4ade80, 10);
        scene.remove(en.mesh);
        enemies.splice(i, 1);
        if (squadCount <= 0) { finishStage(false); return; }
        rebuildSquadVisuals();
      } else if (en.z > 10) {
        scene.remove(en.mesh);
        enemies.splice(i, 1);
      }
    }

    // 타이탄 보스 업데이트
    if (bossObj) {
      bossObj.z += (forwardSpd + (state === "boss" ? 1.85 : 0)) * dt;
      if (state === "boss") {
        bossObj.x += (squadX - bossObj.x) * Math.min(1, dt * 1.2);
        bossObj.stompCd -= dt;
        if (bossObj.stompCd <= 0) {
          bossObj.stompCd = 2.4;
          shake = 6;
        }
      }
      bossObj.mesh.position.set(bossObj.x, 0, bossObj.z);
      const bph = nowSec * 6;
      bossObj.mesh.userData.legL.rotation.x = Math.sin(bph) * 0.4;
      bossObj.mesh.userData.legR.rotation.x = -Math.sin(bph) * 0.4;
      if (bossObj.flash > 0) {
        bossObj.flash -= dt;
        bossObj.mesh.userData.body.material = bossObj.flash > 0 ? mats.hitFlash : bossObj.mesh.userData.armorMat;
      }
      if (state === "boss") {
        const pct = Math.max(0, Math.ceil((bossObj.hp / bossObj.maxHp) * 100));
        document.getElementById("ui-boss-hp").textContent = `${pct}%`;
        document.getElementById("ui-boss-fill").style.width = `${pct}%`;
        if (bossObj.z >= -1.6) {
          squadCount = 0;
          finishStage(false);
          return;
        }
      }
    }

    // 탄환 이동 및 충돌 판정 (게이트 반전 · 드럼통 파괴 · 좀비/보스 타격)
    for (let i = bullets.length - 1; i >= 0; i--) {
      const bl = bullets[i];
      bl.z -= 52 * dt;
      bl.mesh.position.z = bl.z;
      let hit = false;

      // 1) 게이트 타격 (빨간/파란 병력 게이트 수치 상승!)
      for (const gt of gates) {
        if (gt.used || gt.kind === "mul") continue;
        if (Math.abs(bl.z - gt.z) < 0.9 && Math.abs(bl.x - gt.x) < gt.w * 0.5) {
          gt.hitAccum += bl.dmg;
          const threshold = 4.2 + save.stage * 0.9;
          if (gt.hitAccum >= threshold) {
            const inc = Math.floor(gt.hitAccum / threshold);
            gt.hitAccum %= threshold;
            const wasNeg = gt.val < 0;
            gt.val = Math.min(gt.kind === "rate" ? 80 : 60, gt.val + inc);
            drawGateCanvas(gt.canvas, gt);
            gt.tex.needsUpdate = true;
            gt.bounce = 1;
            if (wasNeg && gt.val >= 0) {
              SFX.gateGood();
              spawnPopup3D(new THREE.Vector3(gt.x, 3.2, gt.z), lang === "ko" ? "파랑 반전!" : "FLIPPED BLUE!", "#38bdf8");
            }
          }
          hit = true;
          break;
        }
      }

      // 2) 무기 드럼통 타격
      if (!hit) {
        for (let j = barrels.length - 1; j >= 0; j--) {
          const br = barrels[j];
          if (Math.abs(bl.z - br.z) < 1.2 && Math.abs(bl.x - br.x) < 1.15) {
            br.hp -= bl.dmg;
            br.hitFlash = 0.06;
            drawCrateLabel(br.canvas, br.hp, br.labelTxt);
            br.tex.needsUpdate = true;
            hit = true;
            if (br.hp <= 0) {
              SFX.boom(); shake = 7; haptic(25);
              spawnShards(br.x, 1.3, br.z, br.isTank ? 0xfacc15 : 0xf43f5e, 18);
              if (br.isTank) {
                deployTank();
              } else {
                weaponTier = Math.min(4, weaponTier + 1);
                const wName = t("weapons")[weaponTier];
                showToast(`🔫 ${wName}!`);
                spawnPopup3D(new THREE.Vector3(br.x, 2.4, br.z), wName, "#fde047");
                rebuildSquadVisuals();
              }
              scene.remove(br.group);
              barrels.splice(j, 1);
            }
            break;
          }
        }
      }

      // 3) 좀비 타격
      if (!hit) {
        for (let j = enemies.length - 1; j >= 0; j--) {
          const en = enemies[j];
          const rad = en.brute ? 1.1 : 0.72;
          if (Math.abs(bl.z - en.z) < 1.1 && Math.abs(bl.x - en.x) < rad) {
            en.hp -= bl.dmg;
            en.flash = 0.06;
            en.z -= 0.18; // 타격감 넉백!
            if (bl.splash > 0) {
              for (const other of enemies) {
                if (other !== en && Math.hypot(other.x - en.x, other.z - en.z) < bl.splash) {
                  other.hp -= bl.dmg * 0.65;
                  other.flash = 0.06;
                }
              }
            }
            hit = true;
            break;
          }
        }
        // 사망 좀비 일괄 정리
        for (let j = enemies.length - 1; j >= 0; j--) {
          if (enemies[j].hp <= 0) {
            const en = enemies[j];
            runKills++;
            runGold += en.brute ? 18 : 6;
            spawnShards(en.x, 0.9, en.z, en.brute ? 0xdc2626 : 0x4ade80, en.brute ? 14 : 7);
            scene.remove(en.mesh);
            enemies.splice(j, 1);
          }
        }
      }

      // 4) 타이탄 보스 타격
      if (!hit && bossObj && Math.abs(bl.z - bossObj.z) < 2.2 && Math.abs(bl.x - bossObj.x) < 2.1) {
        bossObj.hp -= bl.dmg;
        bossObj.flash = 0.05;
        hit = true;
        if (bossObj.hp <= 0) {
          runKills++;
          spawnShards(bossObj.x, 2.5, bossObj.z, 0xdc2626, 28);
          spawnShards(bossObj.x, 3.0, bossObj.z, 0xfacc15, 22);
          scene.remove(bossObj.mesh);
          bossObj = null;
          finishStage(true);
          return;
        }
      }

      if (hit || bl.z < -68) {
        scene.remove(bl.mesh);
        bullets.splice(i, 1);
      }
    }

    // 카메라 추적 + 타격 쉐이크
    const sx = (Math.random() - 0.5) * shake * 0.07;
    const sy = (Math.random() - 0.5) * shake * 0.07;
    camera.position.set(squadX * 0.32 + sx, 8.2 + sy, 11.4);
    camera.lookAt(squadX * 0.2, 1.2, -16);

    // 스쿼드 머리 위 실시간 인원수 3D 투영 배지
    const badge = document.getElementById("squad-float-badge");
    const bv = new THREE.Vector3(squadX, 2.25, 0).project(camera);
    badge.style.left = `${(bv.x * 0.5 + 0.5) * container.clientWidth}px`;
    badge.style.top = `${(-bv.y * 0.5 + 0.5) * container.clientHeight}px`;
    badge.textContent = squadCount;

    syncUI();
  }

  function renderUpgradeCards() {
    const grid = document.getElementById("upgrade-grid");
    grid.innerHTML = "";
    UP_DEFS.forEach((d) => {
      const cost = upCost(d);
      const btn = document.createElement("button");
      btn.className = "up-card";
      btn.disabled = save.gold < cost;
      btn.innerHTML = `
        <div>
          <span class="up-name">${d.icon} ${t(d.labelKey)}</span>
          <span class="up-lv">Lv.${save.up[d.key] + 1}</span>
        </div>
        <span class="up-cost">◆ ${cost}</span>
      `;
      btn.onclick = () => {
        if (save.gold < cost) return;
        save.gold -= cost;
        save.up[d.key]++;
        persist();
        SFX.gateGood();
        haptic(15);
        squadCount = 3 + save.up.start * 2;
        rebuildSquadVisuals();
        syncUI();
      };
      grid.appendChild(btn);
    });
  }

  function syncUI() {
    document.getElementById("ui-stage").textContent = save.stage;
    document.getElementById("ui-gold").textContent = (save.gold + (state === "playing" || state === "boss" ? runGold : 0)).toLocaleString();
    document.getElementById("ui-squad").textContent = squadCount;
    document.getElementById("ui-weapon").textContent = t("weapons")[weaponTier];
    const pct = Math.min(100, Math.max(0, Math.round((dist / stageLen) * 100)));
    document.getElementById("ui-progress-fill").style.width = `${pct}%`;
    if (state === "menu") renderUpgradeCards();
  }

  function applyI18n() {
    document.documentElement.lang = lang;
    document.querySelectorAll("[data-i18n]").forEach((el) => { el.textContent = t(el.getAttribute("data-i18n")); });
    document.getElementById("btn-lang").textContent = lang.toUpperCase();
    syncUI();
  }

  // ==================== 입력 (1손 드래그 · 마우스 · 키보드) ====================
  const keys = { left: false, right: false };
  window.addEventListener("keydown", (e) => {
    if (e.key === "ArrowLeft" || e.key === "a" || e.key === "A") keys.left = true;
    if (e.key === "ArrowRight" || e.key === "d" || e.key === "D") keys.right = true;
  });
  window.addEventListener("keyup", (e) => {
    if (e.key === "ArrowLeft" || e.key === "a" || e.key === "A") keys.left = false;
    if (e.key === "ArrowRight" || e.key === "d" || e.key === "D") keys.right = false;
  });

  let dragging = false;
  let dragLastX = 0;
  container.addEventListener("pointerdown", (e) => {
    if (state !== "playing" && state !== "boss") return;
    SFX.unlock();
    dragging = true;
    dragLastX = e.clientX;
  });
  window.addEventListener("pointermove", (e) => {
    if (!dragging || (state !== "playing" && state !== "boss")) return;
    const dx = e.clientX - dragLastX;
    dragLastX = e.clientX;
    const sens = (ROAD_W / Math.max(280, container.clientWidth)) * 1.45;
    targetX = Math.max(-HALF_X, Math.min(HALF_X, targetX + dx * sens));
  });
  window.addEventListener("pointerup", () => { dragging = false; });
  window.addEventListener("pointercancel", () => { dragging = false; });

  document.getElementById("btn-sound").onclick = (e) => {
    SFX.on = !SFX.on;
    e.currentTarget.textContent = SFX.on ? "🔊" : "🔇";
  };
  document.getElementById("btn-lang").onclick = () => {
    lang = lang === "ko" ? "en" : "ko";
    localStorage.setItem("nv_lang", lang);
    applyI18n();
  };
  document.getElementById("btn-play").onclick = () => { SFX.unlock(); startStage(0); };
  document.getElementById("btn-ad-boost").onclick = () => {
    SFX.unlock();
    showRewarded(() => startStage(8));
  };
  document.getElementById("btn-res-revive").onclick = () => {
    if (revivedOnce) return;
    showRewarded(() => {
      revivedOnce = true;
      squadCount = 12;
      rebuildSquadVisuals();
      // 근처 적 넉백 제거로 안전 부활 보장
      for (let i = enemies.length - 1; i >= 0; i--) {
        if (enemies[i].z > -16) { scene.remove(enemies[i].mesh); enemies.splice(i, 1); }
      }
      if (bossObj && bossObj.z > -14) bossObj.z = -18;
      document.getElementById("result-overlay").classList.add("hidden");
      document.getElementById("squad-float-badge").classList.remove("hidden");
      state = bossObj && dist >= stageLen - 6 ? "boss" : "playing";
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
    squadCount = 3 + save.up.start * 2;
    weaponTier = 0;
    buildStageCourse();
    rebuildSquadVisuals();
    state = "menu";
    syncUI();
  };

  function handleResize() {
    const w = Math.max(320, container.clientWidth);
    const h = Math.max(320, container.clientHeight);
    camera.aspect = w / h;
    camera.fov = h > w ? 58 : 48;
    camera.updateProjectionMatrix();
    renderer.setSize(w, h, false);
  }
  window.addEventListener("resize", handleResize);

  // 초기 메뉴 3D 배경 세팅
  handleResize();
  squadCount = 3 + save.up.start * 2;
  buildStageCourse();
  rebuildSquadVisuals();
  applyI18n();

  let lastTime = performance.now();
  function animate(now) {
    requestAnimationFrame(animate);
    const dt = (now - lastTime) / 1000;
    lastTime = now;
    update(dt);
    renderer.render(scene, camera);
  }
  requestAnimationFrame(animate);
})();

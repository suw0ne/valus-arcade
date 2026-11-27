/**
 * 캐논 크라우드 3D: 성채 돌파 (CANNON CROWD 3D: CASTLE RUSH) — v2.0 스튜디오 PBR 리마스터.
 * - ACESFilmic 톤매핑 + RoomEnvironment IBL 금속 반사 + 2048 소프트 그림자
 * - 골든아워 GLSL 스카이 돔 + 입체 구름 + 1024px 석재 성벽 공성로 범프 텍스처
 * - 곡면 숄더 패드·헬멧·방패·검을 든 조각 3D 블루/레드 병사 + 거대 골든 해머 챔피언
 * - 발사 연기 링 이펙트·반동 3D 캐논·깃발이 나부끼는 쌍탑 붉은 성채 + 3D 충격파 이펙트.
 */
(function () {
  const SAVE_KEY = "nv_cannon_crowd_save_v1";

  const I18N = {
    ko: {
      castleHp: "적 성채 내구도", allies: "아군", enemies: "적군", wallHp: "캐논 방벽",
      champBtn: "골든 챔피언 출격!", megaGate: "×4 게이트 소환",
      title: "캐논 크라우드 3D",
      intro: "화면을 누른 채 좌우로 드래그해 푸른 군단을 발사하세요! 움직이는 ×2·×3 배수 게이트를 통과해 대군과 골든 챔피언으로 적 성채를 함락시키세요!",
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
      intro: "Press & drag left/right to rapid-fire armored blue squads! Swarm through moving ×2/×3 multiplier gates and smash the Red Fortress!",
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
        stage: p.stage || 1, bestStage: p.bestStage || 0, gold: p.gold || 100,
        up: { rate: p.up?.rate || 0, power: p.up?.power || 0, champ: p.up?.champ || 0, gold: p.up?.gold || 0 },
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
      if (now - this.lastPop < 0.068) return;
      this.lastPop = now;
      this.tone(330, 150, 0.055, "triangle", 0.048);
    },
    mul() { this.tone(560, 1020, 0.09, "sine", 0.05); },
    boom() { this.tone(185, 44, 0.2, "sawtooth", 0.11); },
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

  // ==================== 스튜디오 PBR 3D 공성전 씬 ====================
  const container = document.getElementById("canvas-wrap");
  const scene = new THREE.Scene();
  scene.fog = new THREE.FogExp2(0x9bdcff, 0.0068);

  const camera = new THREE.PerspectiveCamera(45, 1, 0.5, 260);
  const renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: "high-performance" });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.outputEncoding = THREE.sRGBEncoding;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.14;
  container.insertBefore(renderer.domElement, container.firstChild);

  if (THREE.RoomEnvironment) {
    const pmrem = new THREE.PMREMGenerator(renderer);
    scene.environment = pmrem.fromScene(new THREE.RoomEnvironment(), 0.04).texture;
    pmrem.dispose();
  }

  scene.add(new THREE.HemisphereLight(0xc7ecff, 0x166534, 0.92));
  const sun = new THREE.DirectionalLight(0xfff1cf, 1.45);
  sun.position.set(-18, 28, 18);
  sun.castShadow = true;
  sun.shadow.mapSize.width = 2048;
  sun.shadow.mapSize.height = 2048;
  sun.shadow.bias = -0.0005;
  sun.shadow.camera.left = -22; sun.shadow.camera.right = 22;
  sun.shadow.camera.top = 26; sun.shadow.camera.bottom = -26;
  scene.add(sun);

  // 골든아워 GLSL 스카이 돔 + 입체 구름
  const skyDome = new THREE.Mesh(
    new THREE.SphereGeometry(220, 24, 16),
    new THREE.ShaderMaterial({
      side: THREE.BackSide,
      depthWrite: false,
      uniforms: {
        topColor: { value: new THREE.Color(0x1470d6) },
        midColor: { value: new THREE.Color(0x6ec6ff) },
        horizonColor: { value: new THREE.Color(0xffe8ba) },
        sunDir: { value: new THREE.Vector3(-0.48, 0.36, -0.78).normalize() },
      },
      vertexShader: "varying vec3 vWp; void main(){ vec4 wp=modelMatrix*vec4(position,1.0); vWp=wp.xyz; gl_Position=projectionMatrix*viewMatrix*wp; }",
      fragmentShader: `
        uniform vec3 topColor, midColor, horizonColor, sunDir;
        varying vec3 vWp;
        void main(){
          vec3 d=normalize(vWp);
          float h=clamp(d.y,0.0,1.0);
          vec3 c=mix(horizonColor, midColor, smoothstep(0.0,0.28,h));
          c=mix(c, topColor, smoothstep(0.25,0.85,h));
          float sd=max(dot(d, sunDir), 0.0);
          c+=vec3(1.0,0.9,0.6)*pow(sd,18.0)*0.5;
          c+=vec3(1.0,0.98,0.9)*smoothstep(0.996,0.999,sd)*1.3;
          gl_FragColor=vec4(c,1.0);
        }
      `,
    })
  );
  scene.add(skyDome);

  const cloudGroup = new THREE.Group();
  const cloudMat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.9, emissive: 0xfff3d6, emissiveIntensity: 0.14 });
  const puffGeo = new THREE.SphereGeometry(1, 10, 8);
  for (let i = 0; i < 12; i++) {
    const cg = new THREE.Group();
    for (let p = 0; p < 4; p++) {
      const m = new THREE.Mesh(puffGeo, cloudMat);
      const s = 2.6 + Math.random() * 2.8;
      m.scale.set(s * 1.4, s * 0.72, s);
      m.position.set((p - 1.5) * 3.1, Math.sin(p) * 0.8, (Math.random() - 0.5) * 2);
      cg.add(m);
    }
    cg.position.set((Math.random() - 0.5) * 120, 22 + Math.random() * 14, -45 - Math.random() * 65);
    cloudGroup.add(cg);
  }
  scene.add(cloudGroup);

  // 고해상도 석재 공성로 알베도 + 범프 텍스처
  function createCobbleTextures() {
    const sz = 1024;
    const c = document.createElement("canvas"); c.width = sz; c.height = sz;
    const g = c.getContext("2d");
    const cb = document.createElement("canvas"); cb.width = sz; cb.height = sz;
    const gb = cb.getContext("2d");
    g.fillStyle = "#94a3b8"; g.fillRect(0, 0, sz, sz);
    gb.fillStyle = "#404040"; gb.fillRect(0, 0, sz, sz);
    for (let y = 0; y < sz; y += 64) {
      const off = (y / 64) % 2 === 0 ? 0 : 48;
      for (let x = -64; x < sz + 64; x += 96) {
        const v = 186 + Math.floor(Math.random() * 34);
        g.fillStyle = `rgb(${v},${v + 2},${v + 8})`;
        g.beginPath(); g.roundRect(x + off + 4, y + 4, 88, 56, 8); g.fill();
        gb.fillStyle = "#e8e8e8";
        gb.beginPath(); gb.roundRect(x + off + 5, y + 5, 86, 54, 8); gb.fill();
      }
    }
    const map = new THREE.CanvasTexture(c);
    map.wrapS = THREE.RepeatWrapping; map.wrapT = THREE.RepeatWrapping; map.repeat.set(2, 5);
    map.encoding = THREE.sRGBEncoding; map.anisotropy = 8;
    const bumpMap = new THREE.CanvasTexture(cb);
    bumpMap.wrapS = THREE.RepeatWrapping; bumpMap.wrapT = THREE.RepeatWrapping; bumpMap.repeat.set(2, 5);
    return { map, bumpMap };
  }

  function makeShadowTex() {
    const c = document.createElement("canvas"); c.width = 64; c.height = 64;
    const g = c.getContext("2d");
    const gr = g.createRadialGradient(32, 32, 2, 32, 32, 30);
    gr.addColorStop(0, "rgba(15,23,42,0.5)");
    gr.addColorStop(1, "rgba(15,23,42,0)");
    g.fillStyle = gr; g.fillRect(0, 0, 64, 64);
    return new THREE.CanvasTexture(c);
  }

  const FIELD_W = 11.6;
  const HALF_X = 4.65;
  const CANNON_Z = 11.4;
  const CASTLE_Z = -13.6;

  // 햇살 초원 + 입체 언덕
  const grass = new THREE.Mesh(
    new THREE.PlaneGeometry(220, 220),
    new THREE.MeshStandardMaterial({ color: 0x2ec24c, roughness: 0.88 })
  );
  grass.rotation.x = -Math.PI / 2; grass.position.y = -0.25; grass.receiveShadow = true;
  scene.add(grass);

  const hillMat = new THREE.MeshStandardMaterial({ color: 0x22a840, roughness: 0.9 });
  for (const [hx, hz, hr] of [[-26, -24, 14], [28, -28, 16], [-34, -48, 22], [36, -52, 24]]) {
    const h = new THREE.Mesh(new THREE.SphereGeometry(hr, 16, 10, 0, Math.PI * 2, 0, Math.PI * 0.5), hillMat);
    h.scale.set(1.4, 0.45, 1.2); h.position.set(hx, -0.3, hz);
    scene.add(h);
  }

  // 석재 공성로 + 성벽 난간 블록
  const { map: cobbleMap, bumpMap: cobbleBump } = createCobbleTextures();
  const road = new THREE.Mesh(
    new THREE.BoxGeometry(FIELD_W, 0.65, 31),
    new THREE.MeshStandardMaterial({ map: cobbleMap, bumpMap: cobbleBump, bumpScale: 0.06, roughness: 0.82 })
  );
  road.position.set(0, -0.32, -1); road.receiveShadow = true;
  scene.add(road);

  const stoneMat = new THREE.MeshStandardMaterial({ color: 0x94a3b8, roughness: 0.72, metalness: 0.08 });
  const stoneDark = new THREE.MeshStandardMaterial({ color: 0x64748b, roughness: 0.78 });
  for (const side of [-1, 1]) {
    const wall = new THREE.Mesh(new THREE.BoxGeometry(0.95, 1.15, 31), stoneMat);
    wall.position.set(side * (FIELD_W / 2 + 0.45), 0.3, -1); wall.castShadow = true; wall.receiveShadow = true;
    scene.add(wall);
    // 성벽 흉벽(요철 돌기)
    for (let z = -14; z <= 12; z += 2.6) {
      const merlon = new THREE.Mesh(new THREE.BoxGeometry(1.02, 0.42, 1.2), stoneDark);
      merlon.position.set(side * (FIELD_W / 2 + 0.45), 1.05, z); merlon.castShadow = true;
      scene.add(merlon);
    }
  }

  // 계곡 양옆 다층 3D 소나무 숲
  const trunkMat = new THREE.MeshStandardMaterial({ color: 0x78350f, roughness: 0.9 });
  const leafMat1 = new THREE.MeshStandardMaterial({ color: 0x15803d, roughness: 0.75 });
  const leafMat2 = new THREE.MeshStandardMaterial({ color: 0x16a34a, roughness: 0.75 });
  for (let i = 0; i < 16; i++) {
    const side = i % 2 === 0 ? -1 : 1;
    const tg = new THREE.Group();
    const tr = new THREE.Mesh(new THREE.CylinderGeometry(0.24, 0.34, 1.3, 7), trunkMat); tr.position.y = 0.65;
    const l1 = new THREE.Mesh(new THREE.ConeGeometry(1.3, 2.2, 8), leafMat1); l1.position.y = 1.9; l1.castShadow = true;
    const l2 = new THREE.Mesh(new THREE.ConeGeometry(0.95, 1.9, 8), leafMat2); l2.position.y = 3.1; l2.castShadow = true;
    tg.add(tr, l1, l2);
    tg.position.set(side * (FIELD_W / 2 + 2.6 + (i % 3) * 1.9), -0.1, -14 + i * 1.9);
    scene.add(tg);
  }

  // ==================== 고퀄리티 PBR 재질 & 3D 조각 모델 ====================
  const mats = {
    blueArmor: new THREE.MeshStandardMaterial({ color: 0x1d68e8, roughness: 0.24, metalness: 0.65 }),
    blueDark: new THREE.MeshStandardMaterial({ color: 0x13387d, roughness: 0.34, metalness: 0.55 }),
    goldArmor: new THREE.MeshStandardMaterial({ color: 0xfacc15, roughness: 0.2, metalness: 0.85, emissive: 0xb45309, emissiveIntensity: 0.28 }),
    redArmor: new THREE.MeshStandardMaterial({ color: 0xdc2626, roughness: 0.28, metalness: 0.55 }),
    redDark: new THREE.MeshStandardMaterial({ color: 0x991b1b, roughness: 0.42, metalness: 0.3 }),
    wood: new THREE.MeshStandardMaterial({ color: 0x92400e, roughness: 0.75 }),
    skin: new THREE.MeshStandardMaterial({ color: 0xfdba74, roughness: 0.65 }),
    steel: new THREE.MeshStandardMaterial({ color: 0xe2e8f0, roughness: 0.24, metalness: 0.86 }),
    dark: new THREE.MeshStandardMaterial({ color: 0x1e293b, roughness: 0.4, metalness: 0.6 }),
    bannerRed: new THREE.MeshStandardMaterial({ color: 0xef4444, roughness: 0.55, side: THREE.DoubleSide }),
    shadow: new THREE.MeshBasicMaterial({ map: makeShadowTex(), transparent: true, depthWrite: false }),
    smoke: new THREE.MeshStandardMaterial({ color: 0xf8fafc, roughness: 0.9, transparent: true, opacity: 0.78 }),
  };

  // 아군 3D 공성 캐논 (글로시 메탈 블루 포신 + 목재 수레바퀴 + 금장 테두리)
  const cannonGroup = new THREE.Group();
  cannonGroup.position.set(0, 0, CANNON_Z);
  const cShadow = new THREE.Mesh(new THREE.PlaneGeometry(3.2, 3.2), mats.shadow);
  cShadow.rotation.x = -Math.PI / 2; cShadow.position.y = 0.03;
  const carriage = new THREE.Mesh(new THREE.BoxGeometry(1.45, 0.55, 1.75), mats.wood);
  carriage.position.y = 0.56; carriage.castShadow = true;
  const wheelGeo = new THREE.CylinderGeometry(0.56, 0.56, 0.22, 14);
  wheelGeo.rotateZ(Math.PI / 2);
  const rimGeo = new THREE.TorusGeometry(0.56, 0.06, 8, 18);
  rimGeo.rotateY(Math.PI / 2);
  for (const side of [-1, 1]) {
    const wh = new THREE.Mesh(wheelGeo, mats.wood); wh.position.set(side * 0.88, 0.56, 0.12); wh.castShadow = true;
    const rm = new THREE.Mesh(rimGeo, mats.dark); rm.position.set(side * 0.88, 0.56, 0.12);
    const hub = new THREE.Mesh(new THREE.SphereGeometry(0.16, 8, 8), mats.goldArmor); hub.position.set(side * 0.98, 0.56, 0.12);
    cannonGroup.add(wh, rm, hub);
  }
  const barrelPivot = new THREE.Group();
  barrelPivot.position.set(0, 1.05, 0.1);
  const cBarrel = new THREE.Mesh(new THREE.CylinderGeometry(0.42, 0.62, 2.35, 18), mats.blueArmor);
  cBarrel.rotation.x = Math.PI / 2 - 0.14; cBarrel.position.set(0, 0.1, -0.65); cBarrel.castShadow = true;
  const cBreech = new THREE.Mesh(new THREE.SphereGeometry(0.6, 14, 12), mats.blueDark);
  cBreech.position.set(0, -0.05, 0.45);
  const cRing = new THREE.Mesh(new THREE.TorusGeometry(0.45, 0.085, 10, 20), mats.goldArmor);
  cRing.position.set(0, 0.25, -1.78);
  barrelPivot.add(cBarrel, cBreech, cRing);
  cannonGroup.add(cShadow, carriage, barrelPivot);
  scene.add(cannonGroup);

  // 적 쌍탑 3D 붉은 성채 + 나부끼는 깃발
  const castleGroup = new THREE.Group();
  castleGroup.position.set(0, 0, CASTLE_Z);
  const cWall = new THREE.Mesh(new THREE.BoxGeometry(10.2, 4.0, 2.6), stoneMat);
  cWall.position.y = 2.0; cWall.castShadow = true; cWall.receiveShadow = true;
  const roofTrim = new THREE.Mesh(new THREE.BoxGeometry(10.5, 0.65, 2.85), mats.redArmor);
  roofTrim.position.y = 4.15;
  const gateFrame = new THREE.Mesh(new THREE.BoxGeometry(3.2, 2.8, 2.75), stoneDark);
  gateFrame.position.y = 1.4;
  const gateDoor = new THREE.Mesh(new THREE.BoxGeometry(2.5, 2.4, 2.85), mats.wood);
  gateDoor.position.y = 1.2;
  castleGroup.add(cWall, roofTrim, gateFrame, gateDoor);

  const banners = [];
  for (const side of [-1, 1]) {
    const tx = side * 4.55;
    const tower = new THREE.Mesh(new THREE.CylinderGeometry(1.45, 1.65, 6.2, 10), stoneMat);
    tower.position.set(tx, 3.1, 0); tower.castShadow = true;
    const crown = new THREE.Mesh(new THREE.CylinderGeometry(1.72, 1.55, 0.9, 10), stoneDark);
    crown.position.set(tx, 6.2, 0);
    const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 2.4, 6), mats.steel);
    pole.position.set(tx, 7.6, 0);
    const flag = new THREE.Mesh(new THREE.PlaneGeometry(1.7, 0.85), mats.bannerRed);
    flag.position.set(tx + 0.85, 8.3, 0);
    const frontBanner = new THREE.Mesh(new THREE.PlaneGeometry(1.1, 2.3), mats.bannerRed);
    frontBanner.position.set(tx, 3.8, 1.66);
    castleGroup.add(tower, crown, pole, flag, frontBanner);
    banners.push(flag);
  }
  scene.add(castleGroup);

  // 조각 3D 병사 & 거대 골든 챔피언 지오메트리
  const unitGeo = {
    shadow: new THREE.PlaneGeometry(0.95, 0.95),
    leg: new THREE.CapsuleGeometry(0.095, 0.18, 4, 6),
    torso: new THREE.CylinderGeometry(0.24, 0.19, 0.46, 8),
    pauldron: new THREE.SphereGeometry(0.17, 8, 6),
    helmet: new THREE.SphereGeometry(0.23, 10, 8),
    shield: new THREE.CylinderGeometry(0.24, 0.24, 0.08, 10),
    sword: new THREE.BoxGeometry(0.07, 0.07, 0.56),
    shard: new THREE.DodecahedronGeometry(0.18, 0),
    smokeRing: new THREE.TorusGeometry(0.45, 0.16, 8, 16),
  };
  unitGeo.shield.rotateX(Math.PI / 2);

  function createSculptedUnit(team, isChamp = false) {
    const g = new THREE.Group();
    const sh = new THREE.Mesh(unitGeo.shadow, mats.shadow);
    sh.rotation.x = -Math.PI / 2; sh.position.y = 0.025;
    g.add(sh);

    const armorM = team === "blue" ? (isChamp ? mats.goldArmor : mats.blueArmor) : mats.redArmor;
    const darkM = team === "blue" ? (isChamp ? mats.goldArmor : mats.blueDark) : mats.redDark;

    const legL = new THREE.Mesh(unitGeo.leg, darkM); legL.position.set(-0.12, 0.2, 0);
    const legR = legL.clone(); legR.position.x = 0.12;
    const torso = new THREE.Mesh(unitGeo.torso, armorM); torso.position.y = 0.55; torso.castShadow = true;
    const pL = new THREE.Mesh(unitGeo.pauldron, armorM); pL.position.set(-0.28, 0.72, 0);
    const pR = pL.clone(); pR.position.x = 0.28;
    const head = new THREE.Mesh(unitGeo.helmet, isChamp ? mats.goldArmor : mats.skin);
    head.position.y = 0.95; head.castShadow = true;
    const helmCap = new THREE.Mesh(new THREE.SphereGeometry(0.245, 10, 8, 0, Math.PI * 2, 0, Math.PI * 0.58), armorM);
    helmCap.position.y = 0.98;
    const shield = new THREE.Mesh(unitGeo.shield, isChamp ? mats.goldArmor : mats.steel);
    shield.position.set(-0.28, 0.58, team === "blue" ? -0.22 : 0.22);
    const sword = new THREE.Mesh(unitGeo.sword, isChamp ? mats.goldArmor : mats.steel);
    sword.position.set(0.28, 0.58, team === "blue" ? -0.28 : 0.28);

    g.add(legL, legR, torso, pL, pR, head, helmCap, shield, sword);
    if (isChamp) {
      const aura = new THREE.Mesh(
        new THREE.RingGeometry(0.35, 0.55, 20),
        new THREE.MeshBasicMaterial({ color: 0xfde047, transparent: true, opacity: 0.78, side: THREE.DoubleSide })
      );
      aura.rotation.x = -Math.PI / 2; aura.position.y = 0.04;
      g.add(aura);
      g.scale.setScalar(2.35);
    }
    g.userData = { legL, legR };
    return g;
  }

  function createMultiplierGate(z, mult, moveAmp, moveSpd, phase) {
    const w = 3.65;
    const h = 2.75;
    const g = new THREE.Group();
    g.position.set(0, 0, z);

    const c = document.createElement("canvas");
    c.width = 512; c.height = 340;
    const ctx2 = c.getContext("2d");
    const grad = ctx2.createLinearGradient(0, 0, 0, 340);
    if (mult >= 4) {
      grad.addColorStop(0, "rgba(250, 204, 21, 0.84)");
      grad.addColorStop(1, "rgba(234, 88, 12, 0.52)");
    } else {
      grad.addColorStop(0, "rgba(56, 189, 248, 0.84)");
      grad.addColorStop(1, "rgba(37, 99, 235, 0.52)");
    }
    ctx2.fillStyle = grad; ctx2.fillRect(10, 10, 492, 320);
    ctx2.shadowColor = mult >= 4 ? "#fde047" : "#38bdf8";
    ctx2.shadowBlur = 22;
    ctx2.strokeStyle = "#ffffff"; ctx2.lineWidth = 16; ctx2.strokeRect(12, 12, 488, 316);
    ctx2.shadowBlur = 0;
    ctx2.font = "900 185px sans-serif"; ctx2.textAlign = "center"; ctx2.textBaseline = "middle";
    ctx2.lineWidth = 20; ctx2.strokeStyle = "#0f172a";
    ctx2.strokeText(`×${mult}`, 256, 178);
    ctx2.fillStyle = "#ffffff";
    ctx2.fillText(`×${mult}`, 256, 178);

    const tex = new THREE.CanvasTexture(c);
    tex.encoding = THREE.sRGBEncoding;
    const panel = new THREE.Mesh(
      new THREE.PlaneGeometry(w, h),
      new THREE.MeshBasicMaterial({ map: tex, transparent: true, side: THREE.DoubleSide })
    );
    panel.position.y = h / 2 + 0.08;
    const pGeo = new THREE.CylinderGeometry(0.17, 0.2, h + 0.3, 10);
    const pL = new THREE.Mesh(pGeo, mats.steel); pL.position.set(-w / 2, h / 2 + 0.1, 0); pL.castShadow = true;
    const pR = pL.clone(); pR.position.x = w / 2;
    const topBar = new THREE.Mesh(new THREE.BoxGeometry(w + 0.4, 0.26, 0.3), mats.steel);
    topBar.position.y = h + 0.22;
    g.add(panel, pL, pR, topBar);
    scene.add(g);
    return { id: Math.random().toString(36).slice(2), group: g, x: 0, z, w, mult, moveAmp, moveSpd, phase };
  }

  // ==================== 게임 로직 ====================
  const UP_DEFS = [
    { key: "rate", labelKey: "upRate", baseCost: 55, scale: 1.55, icon: "⚡" },
    { key: "power", labelKey: "upPower", baseCost: 65, scale: 1.55, icon: "🛡️" },
    { key: "champ", labelKey: "upChamp", baseCost: 75, scale: 1.6, icon: "👑" },
    { key: "gold", labelKey: "upGold", baseCost: 70, scale: 1.55, icon: "◆" },
  ];
  const upCost = (d) => Math.round(d.baseCost * Math.pow(d.scale, save.up[d.key]));

  let state = "menu";
  let cannonX = 0, targetX = 0, firing = false, recoil = 0, fireCd = 0;
  let enemyWaveCd = 2.0, castleHp = 100, castleMaxHp = 100, wallHp = 100, champGauge = 0;
  let runSpawned = 0, runDefeated = 0, runGold = 0;
  let megaUsed = false, revivedOnce = false, doubledOnce = false;
  let shake = 0, toastTimer = 0;

  let gates = [], allies = [], foes = [], shards = [], smokeRings = [];

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

  function spawnSmokeRing(x) {
    if (smokeRings.length > 12) return;
    const m = new THREE.Mesh(unitGeo.smokeRing, mats.smoke.clone());
    m.position.set(x, 1.32, CANNON_Z - 1.9);
    scene.add(m);
    smokeRings.push({ mesh: m, life: 0.45, maxLife: 0.45 });
  }

  function burstShards(x, y, z, colorHex, count = 8) {
    const mat = new THREE.MeshStandardMaterial({ color: colorHex, roughness: 0.35, metalness: 0.35 });
    for (let i = 0; i < count && shards.length < 90; i++) {
      const m = new THREE.Mesh(unitGeo.shard, mat);
      m.position.set(x, y, z);
      scene.add(m);
      shards.push({
        mesh: m, vx: (Math.random() - 0.5) * 8, vy: 3 + Math.random() * 5.5, vz: (Math.random() - 0.5) * 8, life: 0.48,
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
    if (!isChamp && allies.length >= 95) return;
    const m = createSculptedUnit("blue", isChamp);
    m.position.set(x, 0, z);
    scene.add(m);
    const baseHp = 1 + save.up.power * 0.35;
    allies.push({
      mesh: m, x, z, vx: (Math.random() - 0.5) * 1.15,
      hp: isChamp ? (14 + save.up.champ * 5) : baseHp,
      dmg: isChamp ? (10 + save.up.champ * 3.5) : (1 + save.up.power * 0.25),
      speed: isChamp ? 6.5 : 7.8,
      champ: isChamp, passed: passedSet ? new Set(passedSet) : new Set(), phase: Math.random() * 6,
    });
    runSpawned++;
  }

  function spawnFoe(x, z, isKnight = false) {
    if (foes.length >= 80) return;
    const m = createSculptedUnit("red", false);
    if (isKnight) m.scale.setScalar(1.58);
    m.position.set(x, 0, z);
    scene.add(m);
    const st = save.stage;
    foes.push({
      mesh: m, x, z,
      hp: isKnight ? (5 + st * 1.8) : (1 + st * 0.3),
      dmg: isKnight ? 3 : 1,
      speed: isKnight ? 3.5 : 4.4,
      knight: isKnight, phase: Math.random() * 6,
    });
  }

  function startBattle() {
    clearArena();
    const st = save.stage;
    castleMaxHp = 110 + (st - 1) * 75;
    castleHp = castleMaxHp;
    wallHp = 100;
    champGauge = 25;
    runSpawned = 0; runDefeated = 0; runGold = 0;
    megaUsed = false; revivedOnce = false; doubledOnce = false;
    cannonX = 0; targetX = 0; enemyWaveCd = 1.4;

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
      burstShards(0, 3.6, CASTLE_Z, 0xfacc15, 24);
      burstShards(0, 3.2, CASTLE_Z, 0x38bdf8, 22);
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
    shake = 7;
    spawnSmokeRing(cannonX);
    spawnAlly(cannonX, CANNON_Z - 1.7, true);
    showToast(t("champGo"));
    SFX.fanfare();
    haptic([25, 20, 40]);
    syncUI();
  }

  function update(dt, nowSec) {
    dt = Math.min(dt, 0.05);

    // 구름 & 성채 깃발 생동감 애니메이션
    for (const cg of cloudGroup.children) {
      cg.position.x += dt * 0.8;
      if (cg.position.x > 65) cg.position.x = -65;
    }
    banners.forEach((b, idx) => { b.rotation.y = Math.sin(nowSec * 5 + idx) * 0.25; });

    if (toastTimer > 0) {
      toastTimer -= dt;
      if (toastTimer <= 0) document.getElementById("toast-banner").classList.add("hidden");
    }
    shake = Math.max(0, shake - dt * 20);

    for (let i = smokeRings.length - 1; i >= 0; i--) {
      const sr = smokeRings[i];
      sr.life -= dt;
      const p = 1 - sr.life / sr.maxLife;
      sr.mesh.position.z -= 4.5 * dt;
      sr.mesh.position.y += 1.2 * dt;
      sr.mesh.scale.setScalar(1 + p * 2.2);
      sr.mesh.material.opacity = Math.max(0, 0.72 * (1 - p));
      if (sr.life <= 0) { scene.remove(sr.mesh); smokeRings.splice(i, 1); }
    }
    for (let i = shards.length - 1; i >= 0; i--) {
      const sh = shards[i];
      sh.life -= dt; sh.vy -= 17 * dt;
      sh.mesh.position.x += sh.vx * dt;
      sh.mesh.position.y = Math.max(0.1, sh.mesh.position.y + sh.vy * dt);
      sh.mesh.position.z += sh.vz * dt;
      sh.mesh.rotation.x += 6 * dt;
      sh.mesh.scale.setScalar(Math.max(0.01, sh.life * 2));
      if (sh.life <= 0) { scene.remove(sh.mesh); shards.splice(i, 1); }
    }

    if (state !== "playing") {
      camera.position.set(Math.sin(nowSec * 0.35) * 2.2, 13.5, 21.0);
      camera.lookAt(0, 1.5, -3.5);
      return;
    }

    const kDir = (keys.right ? 1 : 0) - (keys.left ? 1 : 0);
    if (kDir !== 0) targetX = Math.max(-HALF_X, Math.min(HALF_X, targetX + kDir * 10 * dt));
    cannonX += (targetX - cannonX) * Math.min(1, dt * 15);
    recoil = Math.max(0, recoil - dt * 6);
    cannonGroup.position.set(cannonX, 0, CANNON_Z + recoil * 0.36);

    for (const gt of gates) {
      gt.x = Math.sin(nowSec * gt.moveSpd + gt.phase) * gt.moveAmp;
      gt.group.position.x = gt.x;
    }

    const fireInterval = Math.max(0.088, 0.24 / (1 + save.up.rate * 0.18));
    fireCd -= dt;
    if ((firing || keys.space) && fireCd <= 0) {
      fireCd = fireInterval;
      recoil = 0.55;
      if (Math.random() < 0.38) spawnSmokeRing(cannonX);
      spawnAlly(cannonX + (Math.random() - 0.5) * 0.4, CANNON_Z - 1.6, false);
      const prevChamp = champGauge;
      champGauge = Math.min(100, champGauge + 4.8);
      if (prevChamp < 100 && champGauge >= 100) showToast(t("champReady"));
      SFX.fire();
    }

    enemyWaveCd -= dt;
    if (enemyWaveCd <= 0) {
      const st = save.stage;
      enemyWaveCd = Math.max(1.3, 2.5 - st * 0.12);
      const count = 4 + Math.min(10, st * 2);
      for (let k = 0; k < count; k++) {
        spawnFoe((Math.random() - 0.5) * 5.2, CASTLE_Z + 1.8 + Math.random() * 1.4, k === 0 && st >= 2);
      }
    }

    for (let i = allies.length - 1; i >= 0; i--) {
      const u = allies[i];
      u.z -= u.speed * dt;
      u.x = Math.max(-HALF_X, Math.min(HALF_X, u.x + u.vx * dt));
      u.vx *= Math.pow(0.25, dt);
      const ph = nowSec * 14 + u.phase;
      u.mesh.position.set(u.x, Math.abs(Math.sin(ph)) * 0.14, u.z);
      u.mesh.userData.legL.rotation.x = Math.sin(ph) * 0.6;
      u.mesh.userData.legR.rotation.x = -Math.sin(ph) * 0.6;

      for (const gt of gates) {
        if (!u.passed.has(gt.id) && Math.abs(u.z - gt.z) < 0.72 && Math.abs(u.x - gt.x) < gt.w * 0.5) {
          u.passed.add(gt.id);
          if (!u.champ) {
            for (let c = 0; c < gt.mult - 1; c++) {
              spawnAlly(u.x + (Math.random() - 0.5) * 0.9, u.z - 0.25 - Math.random() * 0.4, false, u.passed);
            }
            SFX.mul();
            if (Math.random() < 0.25) popup3D(new THREE.Vector3(gt.x, 2.3, gt.z), `×${gt.mult}!`, "#38bdf8");
          }
        }
      }

      if (u.z <= CASTLE_Z + 1.6) {
        castleHp = Math.max(0, castleHp - u.dmg);
        runGold += u.champ ? 8 : 1;
        burstShards(u.x, 1.3, CASTLE_Z + 1.5, u.champ ? 0xfacc15 : 0x38bdf8, u.champ ? 12 : 4);
        if (u.champ) { shake = 5; SFX.boom(); }
        scene.remove(u.mesh);
        allies.splice(i, 1);
        if (castleHp <= 0) { finishBattle(true); return; }
      }
    }

    for (let i = foes.length - 1; i >= 0; i--) {
      const f = foes[i];
      f.z += f.speed * dt;
      const ph = nowSec * 11 + f.phase;
      f.mesh.position.set(f.x, Math.abs(Math.sin(ph)) * 0.12, f.z);
      f.mesh.userData.legL.rotation.x = Math.sin(ph) * 0.55;
      f.mesh.userData.legR.rotation.x = -Math.sin(ph) * 0.55;
      if (f.z >= CANNON_Z - 0.9) {
        wallHp = Math.max(0, wallHp - (f.knight ? 14 : 6));
        shake = 6; SFX.boom(); haptic(25);
        burstShards(f.x, 0.8, CANNON_Z - 1, 0xef4444, 8);
        scene.remove(f.mesh);
        foes.splice(i, 1);
        if (wallHp <= 0) { finishBattle(false); return; }
      }
    }

    for (let i = allies.length - 1; i >= 0; i--) {
      const a = allies[i];
      for (let j = foes.length - 1; j >= 0; j--) {
        const f = foes[j];
        const hitDist = a.champ ? 1.45 : 0.74;
        if (Math.abs(a.z - f.z) < hitDist && Math.abs(a.x - f.x) < hitDist) {
          f.hp -= a.dmg; a.hp -= f.dmg;
          if (f.hp <= 0) {
            runDefeated++; runGold += f.knight ? 6 : 2;
            burstShards(f.x, 0.7, f.z, 0xef4444, 5);
            scene.remove(f.mesh); foes.splice(j, 1);
          }
          if (a.hp <= 0) {
            burstShards(a.x, 0.7, a.z, 0x38bdf8, 4);
            scene.remove(a.mesh); allies.splice(i, 1);
            break;
          }
        }
      }
    }

    const sx = (Math.random() - 0.5) * shake * 0.08;
    const sy = (Math.random() - 0.5) * shake * 0.08;
    camera.position.set(cannonX * 0.18 + sx, 14.2 + sy, 20.8);
    camera.lookAt(0, 1.2, -3.0);
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
      btn.innerHTML = `<div><span class="up-name">${d.icon} ${t(d.labelKey)}</span><span class="up-lv">Lv.${save.up[d.key] + 1}</span></div><span class="up-cost">◆ ${cost}</span>`;
      btn.onclick = () => {
        if (save.gold < cost) return;
        save.gold -= cost; save.up[d.key]++; persist();
        SFX.mul(); haptic(14); syncUI();
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

  let activePtr = null, lastPtrX = 0;
  container.addEventListener("pointerdown", (e) => {
    if (state !== "playing" || activePtr !== null) return;
    SFX.unlock(); activePtr = e.pointerId; firing = true; lastPtrX = e.clientX;
    try { container.setPointerCapture(e.pointerId); } catch (_) {}
  });
  window.addEventListener("pointermove", (e) => {
    if (state !== "playing" || e.pointerId !== activePtr) return;
    const dx = e.clientX - lastPtrX; lastPtrX = e.clientX;
    targetX = Math.max(-HALF_X, Math.min(HALF_X, targetX + dx * (FIELD_W / Math.max(280, container.clientWidth)) * 1.4));
  });
  window.addEventListener("pointerup", (e) => { if (e.pointerId === activePtr) { activePtr = null; firing = false; } });
  window.addEventListener("pointercancel", (e) => { if (e.pointerId === activePtr) { activePtr = null; firing = false; } });

  document.getElementById("btn-sound").onclick = (e) => { SFX.on = !SFX.on; e.currentTarget.textContent = SFX.on ? "🔊" : "🔇"; };
  document.getElementById("btn-lang").onclick = () => { lang = lang === "ko" ? "en" : "ko"; localStorage.setItem("nv_lang", lang); applyI18n(); };
  document.getElementById("btn-play").onclick = () => { SFX.unlock(); startBattle(); };
  document.getElementById("btn-champion").onclick = launchChampion;
  document.getElementById("btn-mega-gate").onclick = () => {
    if (megaUsed || state !== "playing") return;
    showRewarded(() => {
      megaUsed = true; document.getElementById("btn-mega-gate").disabled = true;
      gates.push(createMultiplierGate(0.6, 4, 2.2, 1.0, 0.5));
      showToast(t("megaSpawn")); SFX.fanfare();
    });
  };
  document.getElementById("btn-res-revive").onclick = () => {
    if (revivedOnce) return;
    showRewarded(() => {
      revivedOnce = true; wallHp = 100;
      foes.forEach((f) => scene.remove(f.mesh)); foes = [];
      spawnAlly(-1.6, CANNON_Z - 2.0, true); spawnAlly(0, CANNON_Z - 2.2, true); spawnAlly(1.6, CANNON_Z - 2.0, true);
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
      doubledOnce = true; save.gold += runGold; persist();
      document.getElementById("res-earned").textContent = `+${(runGold * 2).toLocaleString()}`;
      document.getElementById("btn-res-double").disabled = true; syncUI();
    });
  };
  document.getElementById("btn-res-next").onclick = () => {
    document.getElementById("result-overlay").classList.add("hidden");
    document.getElementById("start-overlay").classList.remove("hidden");
    clearArena(); state = "menu"; syncUI();
  };

  function handleResize() {
    const w = Math.max(320, container.clientWidth);
    const h = Math.max(320, container.clientHeight);
    camera.aspect = w / h;
    camera.fov = h > w ? 54 : 45;
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
    update(dt, now * 0.001);
    renderer.render(scene, camera);
  }
  requestAnimationFrame(animate);
})();

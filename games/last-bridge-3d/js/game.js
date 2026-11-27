/**
 * 라스트 브릿지 3D: 스쿼드 러시 (LAST BRIDGE 3D: SQUAD RUSH) — v2.0 스튜디오 PBR 업그레이드.
 * ValusArt3D PBR 셰이더·스카이 돔·바다 파도·포물선 현수교·20+파츠 조각 3D 병사·탱크·타이탄 보스 탑재.
 */
(function () {
  const SAVE_KEY = "nv_last_bridge_save_v1";

  const I18N = {
    ko: {
      stage: "STAGE", squad: "병력", bossName: "크림슨 타이탄 보스",
      title: "라스트 브릿지 3D",
      intro: "좌우 드래그로 빨간 게이트를 쏴 파란 게이트로 뒤집고, 스쿼드를 수십 명으로 불려 골든 미니건·전술 탱크·거대 보스까지 돌파하세요!",
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
      bossWarn: "⚠️ 거대 크림슨 타이탄 출현! 집중 화력!",
      tankSpawn: "🛡️ 3D 전술 장갑 탱크 합류! 포격 지원 개시!",
      upStart: "초기 병력", upDmg: "화력 강화", upRate: "연사 속도", upGold: "골드 배율",
      weapons: ["Lv.1 기관단총", "Lv.2 돌격소총", "Lv.3 골든 미니건", "Lv.4 플라즈마 미니건", "Lv.5 전술 로켓포"],
    },
    en: {
      stage: "STAGE", squad: "SQUAD", bossName: "CRIMSON TITAN BOSS",
      title: "LAST BRIDGE 3D",
      intro: "Drag left & right to flip red gates blue, smash weapon barrels to unlock Golden Miniguns & Battle Tank, and crush the Titan Boss!",
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
      bossWarn: "⚠️ CRIMSON TITAN AHEAD! FOCUS FIRE!",
      tankSpawn: "🛡️ TACTICAL BATTLE TANK DEPLOYED!",
      upStart: "Start Squad", upDmg: "Firepower", upRate: "Fire Rate", upGold: "Gold Bonus",
      weapons: ["Lv.1 SMG", "Lv.2 Assault Rifle", "Lv.3 Golden Minigun", "Lv.4 Plasma Minigun", "Lv.5 Tactical Rocket"],
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
        up: { start: p.up?.start || 0, dmg: p.up?.dmg || 0, rate: p.up?.rate || 0, gold: p.up?.gold || 0 },
      };
    } catch (_) {
      return { stage: 1, bestStage: 0, gold: 120, up: { start: 0, dmg: 0, rate: 0, gold: 0 } };
    }
  }
  let save = loadSave();
  function persist() { try { localStorage.setItem(SAVE_KEY, JSON.stringify(save)); } catch (_) {} }

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
      if (now - this.lastShot < 0.052) return;
      this.lastShot = now;
      this.tone(440 + tier * 75, 130, 0.048, tier >= 2 ? "sawtooth" : "square", 0.032);
    },
    gateGood() { this.tone(540, 1120, 0.16, "triangle", 0.1); },
    gateBad() { this.tone(240, 105, 0.18, "sawtooth", 0.1); },
    boom() { this.tone(175, 40, 0.22, "sawtooth", 0.13); },
    fanfare() {
      this.tone(523, 659, 0.14, "triangle", 0.1);
      setTimeout(() => this.tone(659, 784, 0.14, "triangle", 0.1), 110);
      setTimeout(() => this.tone(784, 1046, 0.26, "triangle", 0.12), 220);
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

  // ==================== 스튜디오 PBR 3D 씬 구축 ====================
  const container = document.getElementById("canvas-wrap");
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(46, 1, 0.5, 320);
  const renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: "high-performance" });
  container.insertBefore(renderer.domElement, container.firstChild);

  const ROAD_W = 10.8;
  const HALF_X = 4.25;
  const BRIDGE_LEN = 340;

  window.ValusArt3D.setupStudioRenderer(renderer, scene);
  const envAnim = window.ValusArt3D.buildSkyAndOcean(scene);
  const bridgeAnim = window.ValusArt3D.buildSuspensionBridge(scene, ROAD_W, BRIDGE_LEN);
  const art = window.ValusArt3D.createArtLibrary();

  // 사격 시 스쿼드와 도로를 황금빛으로 비추는 동적 총구 점광원!
  const muzzleLight = new THREE.PointLight(0xffb74d, 0, 12);
  muzzleLight.position.set(0, 1.5, -1.2);
  scene.add(muzzleLight);

  // ==================== 게임 상태 ====================
  const squadGroup = new THREE.Group();
  scene.add(squadGroup);
  let soldierMeshes = [];
  let tankMesh = null;

  let state = "menu"; // menu | playing | boss | result
  let squadX = 0;
  let targetX = 0;
  let squadCount = 3;
  let maxSquadRun = 3;
  let weaponTier = 0;
  let rateBonus = 1.0;
  let runKills = 0;
  let runGold = 0;
  let stageLen = 175;
  let dist = 0;
  let shootCd = 0;
  let tankCd = 0;
  let revivedOnce = false;
  let doubledOnce = false;
  let shake = 0;
  let toastTimer = 0;
  let bossObj = null;

  let gates = [];
  let barrels = [];
  let enemies = [];
  let bullets = [];
  let shards = [];
  let shockwaves = [];

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
    const div = document.createElement("div");
    div.className = "pop-txt";
    div.style.left = `${(v.x * 0.5 + 0.5) * container.clientWidth}px`;
    div.style.top = `${(-v.y * 0.5 + 0.5) * container.clientHeight}px`;
    div.style.color = color;
    div.textContent = text;
    document.getElementById("fx-layer").appendChild(div);
    setTimeout(() => div.remove(), 860);
  }

  function spawnShockwave(x, z, colorHex = 0xfacc15, maxScale = 4.2) {
    const ring = new THREE.Mesh(
      new THREE.RingGeometry(0.45, 0.85, 24),
      new THREE.MeshBasicMaterial({ color: colorHex, transparent: true, opacity: 0.9, side: THREE.DoubleSide })
    );
    ring.rotation.x = -Math.PI / 2;
    ring.position.set(x, 0.08, z);
    scene.add(ring);
    shockwaves.push({ mesh: ring, life: 0.35, maxLife: 0.35, maxScale });
  }

  function spawnShards(x, y, z, colorHex, count = 10) {
    const mat = new THREE.MeshStandardMaterial({ color: colorHex, roughness: 0.32, metalness: 0.35 });
    for (let i = 0; i < count && shards.length < 95; i++) {
      const m = new THREE.Mesh(art.geos.shard, mat);
      m.position.set(x, y, z);
      scene.add(m);
      shards.push({
        mesh: m,
        vx: (Math.random() - 0.5) * 9.5,
        vy: 3.5 + Math.random() * 6.5,
        vz: (Math.random() - 0.5) * 9.5,
        life: 0.55,
      });
    }
  }

  function rebuildSquadVisuals() {
    const visualCount = Math.min(32, Math.max(0, squadCount));
    while (soldierMeshes.length < visualCount) {
      const m = art.createSoldierMesh();
      squadGroup.add(m);
      soldierMeshes.push(m);
    }
    while (soldierMeshes.length > visualCount) {
      const m = soldierMeshes.pop();
      squadGroup.remove(m);
    }
    const golden = 2.399963;
    for (let i = 0; i < soldierMeshes.length; i++) {
      const r = i === 0 ? 0 : 0.56 * Math.sqrt(i);
      const a = i * golden;
      soldierMeshes[i].position.set(Math.cos(a) * r, 0, Math.sin(a) * r * 0.82);
      const useMini = weaponTier >= 2;
      soldierMeshes[i].userData.rifle.visible = !useMini;
      soldierMeshes[i].userData.minigun.visible = useMini;
    }
  }

  function deployTank() {
    if (tankMesh) return;
    tankMesh = art.createTankMesh();
    tankMesh.position.set(2.2, 0, 0.7);
    squadGroup.add(tankMesh);
    document.getElementById("ui-tank-tag").classList.remove("hidden");
    spawnShockwave(squadX + 2.2, 0.7, 0x38bdf8, 5.2);
    showToast(t("tankSpawn"));
    SFX.fanfare();
    haptic([30, 20, 40]);
  }

  function clearWorldObjects() {
    gates.forEach((gt) => scene.remove(gt.group));
    barrels.forEach((br) => scene.remove(br.group));
    enemies.forEach((en) => scene.remove(en.mesh));
    bullets.forEach((bl) => scene.remove(bl.mesh));
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

    // 1. 빛나는 홀로그램 수학 게이트 6쌍
    const gateZs = [-28, -56, -86, -116, -144, -168];
    gateZs.forEach((gz, idx) => {
      const leftNeg = idx % 2 === 0;
      const negVal = -(6 + st * 2 + idx * 2);
      const posKind = idx === 2 || idx === 5 ? "mul" : idx === 3 ? "rate" : "add";
      const posVal = posKind === "mul" ? 2 : posKind === "rate" ? 30 : (5 + st + idx);
      gates.push(art.createHoloGate(scene, leftNeg ? -1 : 1, ROAD_W, gz, "add", negVal, lang));
      gates.push(art.createHoloGate(scene, leftNeg ? 1 : -1, ROAD_W, gz, posKind, posVal, lang));
    });

    // 2. 골든 미니건 드럼통 & 3D 전술 탱크 크레이트
    const barrelSpecs = [
      { x: 2.35, z: -42, hp: 14 + st * 6, tank: false },
      { x: -2.4, z: -72, hp: 26 + st * 10, tank: false },
      { x: 2.4, z: -102, hp: 40 + st * 14, tank: true },
      { x: -2.1, z: -132, hp: 56 + st * 18, tank: false },
    ];
    barrelSpecs.forEach((bs) => barrels.push(art.createWeaponBarrel(scene, bs.x, bs.z, bs.hp, bs.tank, lang)));

    // 3. 조각 3D 좀비 무리 & 레드 저거너트
    const waveZs = [-38, -66, -96, -124, -155];
    waveZs.forEach((wz, wIdx) => {
      const count = 6 + st * 2 + wIdx * 2;
      for (let i = 0; i < count; i++) {
        const isBrute = i === 0 && wIdx >= 2;
        const m = art.createZombieMesh(isBrute);
        const ex = (Math.random() - 0.5) * (ROAD_W - 2.3);
        const ez = wz - Math.random() * 11;
        m.position.set(ex, 0, ez);
        scene.add(m);
        const maxHp = (isBrute ? 32 : 7) + st * (isBrute ? 10 : 3) + wIdx * 2;
        enemies.push({ mesh: m, x: ex, z: ez, hp: maxHp, maxHp, brute: isBrute, speed: isBrute ? 3.2 : 4.6, flash: 0 });
      }
    });

    // 4. 브릿지 종착점 거대 크림슨 타이탄 보스
    const bm = art.createTitanBossMesh();
    const bossHp = 185 + st * 110;
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
    muzzleLight.intensity = 0;
    document.getElementById("squad-float-badge").classList.add("hidden");
    const goldMult = 1 + save.up.gold * 0.25;
    const clearBonus = won ? Math.round((85 + save.stage * 35) * goldMult) : 0;
    runGold = Math.round(runGold * goldMult) + clearBonus;
    save.gold += runGold;
    if (won) {
      if (save.stage > save.bestStage) save.bestStage = save.stage;
      save.stage++;
      SFX.fanfare();
      spawnShockwave(squadX, -3, 0xfacc15, 7);
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
    const bMat = weaponTier >= 4 ? art.mats.tracerRocket : weaponTier >= 3 ? art.mats.tracerPlasma : art.mats.tracerNormal;
    const spread = Math.min(1.8, 0.24 * Math.sqrt(squadCount));

    for (let i = 0; i < visualFireCount; i++) {
      const ox = visualFireCount === 1 ? 0 : ((i / (visualFireCount - 1)) - 0.5) * spread * 2;
      const m = new THREE.Mesh(art.geos.tracer, bMat);
      m.position.set(squadX + ox, 0.85, -0.95);
      if (weaponTier >= 2) m.scale.set(1.4, 1.4, 1.35);
      scene.add(m);
      bullets.push({ mesh: m, x: m.position.x, z: m.position.z, dmg: dmgPerBullet, splash: weaponTier >= 4 ? 2.0 : 0 });
    }

    // 앞열 병사 볼류메트릭 총구 화염 점등 + 도로 점광원 번쩍임
    for (let k = 0; k < Math.min(6, soldierMeshes.length); k++) {
      const sm = soldierMeshes[k];
      sm.userData.flash.visible = true;
      sm.userData.flash.rotation.z = Math.random() * Math.PI;
      sm.userData.flashTimer = 0.055;
    }
    muzzleLight.position.set(squadX, 1.4, -1.2);
    muzzleLight.intensity = 2.6;
    SFX.shot(weaponTier);
  }

  function fireTankShell() {
    if (!tankMesh) return;
    const m = new THREE.Mesh(art.geos.shell, art.mats.tracerRocket);
    m.position.set(squadX + 2.2, 1.24, -1.7);
    scene.add(m);
    bullets.push({ mesh: m, x: m.position.x, z: m.position.z, dmg: (18 + save.up.dmg * 5) * (1 + weaponTier * 0.4), splash: 3.4 });
    tankMesh.userData.recoil = 0.38;
    tankMesh.userData.flash.visible = true;
    setTimeout(() => { if (tankMesh) tankMesh.userData.flash.visible = false; }, 75);
    SFX.boom();
  }

  function update(dt, nowSec) {
    dt = Math.min(dt, 0.05);
    envAnim.update(dt, nowSec);
    muzzleLight.intensity = Math.max(0, muzzleLight.intensity - dt * 28);

    if (toastTimer > 0) {
      toastTimer -= dt;
      if (toastTimer <= 0) document.getElementById("toast-banner").classList.add("hidden");
    }
    shake = Math.max(0, shake - dt * 22);

    // 3D 충격파 & 파편 갱신
    for (let i = shockwaves.length - 1; i >= 0; i--) {
      const sw = shockwaves[i];
      sw.life -= dt;
      const p = 1 - sw.life / sw.maxLife;
      sw.mesh.scale.setScalar(1 + p * sw.maxScale);
      sw.mesh.material.opacity = Math.max(0, 1 - p);
      if (sw.life <= 0) { scene.remove(sw.mesh); shockwaves.splice(i, 1); }
    }
    for (let i = shards.length - 1; i >= 0; i--) {
      const sh = shards[i];
      sh.life -= dt;
      sh.vy -= 18 * dt;
      sh.mesh.position.x += sh.vx * dt;
      sh.mesh.position.y = Math.max(0.12, sh.mesh.position.y + sh.vy * dt);
      sh.mesh.position.z += sh.vz * dt;
      sh.mesh.rotation.x += 7 * dt;
      sh.mesh.rotation.y += 5 * dt;
      sh.mesh.scale.setScalar(Math.max(0.01, sh.life * 1.9));
      if (sh.life <= 0) { scene.remove(sh.mesh); shards.splice(i, 1); }
    }

    // 메뉴 상태: 키아트 각도로 현수교 위 스쿼드 실시간 쇼케이스!
    if (state === "menu" || state === "result") {
      bridgeAnim.scroll(dt * 4.5);
      for (const sm of soldierMeshes) {
        const ph = nowSec * 9 + sm.userData.phase;
        sm.userData.legL.rotation.x = Math.sin(ph) * 0.42;
        sm.userData.legR.rotation.x = -Math.sin(ph) * 0.42;
        sm.userData.flash.visible = false;
      }
      camera.position.set(Math.sin(nowSec * 0.35) * 1.9, 5.2, 8.6);
      camera.lookAt(0, 1.8, -22);
      return;
    }

    // 좌우 스쿼드 조향
    const keyDir = (keys.right ? 1 : 0) - (keys.left ? 1 : 0);
    if (keyDir !== 0) targetX = Math.max(-HALF_X, Math.min(HALF_X, targetX + keyDir * 10.5 * dt));
    squadX += (targetX - squadX) * Math.min(1, dt * 14);
    squadGroup.position.x = squadX;

    // 병사 달리기 & 미니건 회전 & 총구 화염 감쇠
    for (const sm of soldierMeshes) {
      const ph = nowSec * 14 + sm.userData.phase;
      sm.userData.legL.rotation.x = Math.sin(ph) * 0.62;
      sm.userData.legR.rotation.x = -Math.sin(ph) * 0.62;
      if (sm.userData.minigun.visible) sm.userData.minigun.userData.barrels.rotation.z += dt * 22;
      if (sm.userData.flashTimer > 0) {
        sm.userData.flashTimer -= dt;
        if (sm.userData.flashTimer <= 0) sm.userData.flash.visible = false;
      }
    }
    if (tankMesh && tankMesh.userData.recoil > 0) {
      tankMesh.userData.recoil = Math.max(0, tankMesh.userData.recoil - dt * 3);
      tankMesh.userData.barrel.position.z = -1.35 + tankMesh.userData.recoil;
    }

    const forwardSpd = state === "boss" ? 0 : 12.6;
    if (forwardSpd > 0) {
      dist += forwardSpd * dt;
      bridgeAnim.scroll(forwardSpd * dt);
    }

    if (state === "playing" && dist >= stageLen - 6) {
      state = "boss";
      document.getElementById("boss-hud").classList.remove("hidden");
      showToast(t("bossWarn"));
      SFX.boom();
    }

    const baseFireInterval = Math.max(0.088, (0.27 - weaponTier * 0.032) / rateBonus);
    shootCd -= dt;
    if (shootCd <= 0) {
      fireVolley();
      shootCd = baseFireInterval;
    }
    if (tankMesh) {
      tankCd -= dt;
      if (tankCd <= 0) {
        fireTankShell();
        tankCd = 1.3;
      }
    }

    // 게이트 이동 & 스쿼드 통과
    for (let i = gates.length - 1; i >= 0; i--) {
      const gt = gates[i];
      gt.z += forwardSpd * dt;
      gt.group.position.z = gt.z;
      if (gt.bounce > 0) {
        gt.bounce = Math.max(0, gt.bounce - dt * 5.5);
        const s = 1 + gt.bounce * 0.1;
        gt.group.scale.set(s, s, 1);
      }
      if (!gt.used && gt.z >= -0.7 && gt.z <= 1.2 && Math.abs(squadX - gt.x) <= gt.w * 0.56) {
        gt.used = true;
        gates.forEach((other) => { if (Math.abs(other.z - gt.z) < 2) other.used = true; });
        const pos = new THREE.Vector3(gt.x, 2.3, 0);
        if (gt.kind === "mul") {
          squadCount = Math.min(120, Math.round(squadCount * gt.val));
          spawnPopup3D(pos, `×${gt.val} SQUAD!`, "#38bdf8");
          spawnShockwave(gt.x, 0, 0x38bdf8, 4.6);
          spawnShards(gt.x, 1.8, 0, 0x38bdf8, 16);
          SFX.gateGood(); haptic(20);
        } else if (gt.kind === "rate") {
          rateBonus = Math.min(2.8, rateBonus + gt.val / 100);
          spawnPopup3D(pos, `⚡ +${gt.val}% RATE!`, "#fde047");
          spawnShockwave(gt.x, 0, 0xfacc15, 4.2);
          spawnShards(gt.x, 1.8, 0, 0xfacc15, 14);
          SFX.gateGood();
        } else {
          squadCount = Math.min(120, squadCount + gt.val);
          const good = gt.val >= 0;
          spawnPopup3D(pos, good ? `+${gt.val} 병력!` : `${gt.val} 병력!`, good ? "#4ade80" : "#fb7185");
          spawnShockwave(gt.x, 0, good ? 0x38bdf8 : 0xf43f5e, 4.0);
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

    // 드럼통 이동 & 회전 & 충돌
    for (let i = barrels.length - 1; i >= 0; i--) {
      const br = barrels[i];
      br.z += forwardSpd * dt;
      br.group.position.z = br.z;
      br.holo.rotation.y += 2.6 * dt;
      br.holo.position.y = 2.65 + Math.sin(nowSec * 4 + i) * 0.14;
      if (br.hitFlash > 0) {
        br.hitFlash -= dt;
        br.body.material = br.hitFlash > 0 ? art.mats.hitFlash : (br.isTank ? art.mats.barrelGold : art.mats.barrelRed);
      }
      if (br.z > -1.0 && br.z < 1.3 && Math.abs(squadX - br.x) < 1.45) {
        squadCount = Math.max(0, squadCount - 4);
        shake = 8; SFX.gateBad(); haptic(35);
        spawnShockwave(br.x, br.z, 0xf43f5e, 3.8);
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

    // 좀비 웨이브
    for (let i = enemies.length - 1; i >= 0; i--) {
      const en = enemies[i];
      const activeZ = en.z > -48;
      en.z += (forwardSpd + (activeZ ? en.speed : 0)) * dt;
      if (activeZ) en.x += (squadX - en.x) * Math.min(1, dt * 1.35);
      en.mesh.position.set(en.x, 0, en.z);
      const ph = nowSec * 10 + en.mesh.userData.phase;
      en.mesh.userData.legL.rotation.x = Math.sin(ph) * 0.55;
      en.mesh.userData.legR.rotation.x = -Math.sin(ph) * 0.55;
      if (en.flash > 0) {
        en.flash -= dt;
        en.mesh.userData.body.material = en.flash > 0 ? art.mats.hitFlash : en.mesh.userData.baseMat;
      }
      if (en.z > -0.9 && en.z < 1.5 && Math.abs(en.x - squadX) < 1.35 + Math.sqrt(squadCount) * 0.24) {
        squadCount = Math.max(0, squadCount - (en.brute ? 3 : 1));
        shake = 6; SFX.gateBad(); haptic(20);
        spawnShards(en.x, 0.9, en.z, 0x65a30d, 10);
        scene.remove(en.mesh);
        enemies.splice(i, 1);
        if (squadCount <= 0) { finishStage(false); return; }
        rebuildSquadVisuals();
      } else if (en.z > 10) {
        scene.remove(en.mesh);
        enemies.splice(i, 1);
      }
    }

    // 거대 크림슨 타이탄 보스
    if (bossObj) {
      bossObj.z += (forwardSpd + (state === "boss" ? 1.8 : 0)) * dt;
      if (state === "boss") {
        bossObj.x += (squadX - bossObj.x) * Math.min(1, dt * 1.15);
        bossObj.stompCd -= dt;
        if (bossObj.stompCd <= 0) {
          bossObj.stompCd = 2.4;
          shake = 7;
          spawnShockwave(bossObj.x, bossObj.z, 0xef4444, 6.2);
          SFX.boom();
        }
      }
      bossObj.mesh.position.set(bossObj.x, 0, bossObj.z);
      const bph = nowSec * 5.5;
      bossObj.mesh.userData.legL.rotation.x = Math.sin(bph) * 0.35;
      bossObj.mesh.userData.legR.rotation.x = -Math.sin(bph) * 0.35;
      bossObj.mesh.userData.armL.rotation.x = -Math.sin(bph) * 0.45;
      bossObj.mesh.userData.armR.rotation.x = Math.sin(bph) * 0.45;
      bossObj.mesh.userData.core.scale.setScalar(1 + Math.sin(nowSec * 8) * 0.14);
      if (bossObj.flash > 0) {
        bossObj.flash -= dt;
        bossObj.mesh.userData.body.material = bossObj.flash > 0 ? art.mats.hitFlash : bossObj.mesh.userData.baseMat;
      }
      if (state === "boss") {
        const pct = Math.max(0, Math.ceil((bossObj.hp / bossObj.maxHp) * 100));
        document.getElementById("ui-boss-hp").textContent = `${pct}%`;
        document.getElementById("ui-boss-fill").style.width = `${pct}%`;
        if (bossObj.z >= -1.8) { squadCount = 0; finishStage(false); return; }
      }
    }

    // 탄환 충돌 (게이트 반전 · 드럼통 · 좀비 · 보스)
    for (let i = bullets.length - 1; i >= 0; i--) {
      const bl = bullets[i];
      bl.z -= 55 * dt;
      bl.mesh.position.z = bl.z;
      let hit = false;

      for (const gt of gates) {
        if (gt.used || gt.kind === "mul") continue;
        if (Math.abs(bl.z - gt.z) < 0.95 && Math.abs(bl.x - gt.x) < gt.w * 0.5) {
          gt.hitAccum += bl.dmg;
          const threshold = 4.2 + save.stage * 0.9;
          if (gt.hitAccum >= threshold) {
            const inc = Math.floor(gt.hitAccum / threshold);
            gt.hitAccum %= threshold;
            const wasNeg = gt.val < 0;
            gt.val = Math.min(gt.kind === "rate" ? 80 : 60, gt.val + inc);
            art.drawHoloGateCanvas(gt.canvas, gt, lang);
            gt.tex.needsUpdate = true;
            gt.bounce = 1;
            if (wasNeg && gt.val >= 0) {
              SFX.gateGood();
              spawnShockwave(gt.x, gt.z, 0x38bdf8, 3.6);
              spawnPopup3D(new THREE.Vector3(gt.x, 3.3, gt.z), lang === "ko" ? "파랑 반전!" : "FLIPPED BLUE!", "#38bdf8");
            }
          }
          hit = true;
          break;
        }
      }

      if (!hit) {
        for (let j = barrels.length - 1; j >= 0; j--) {
          const br = barrels[j];
          if (Math.abs(bl.z - br.z) < 1.25 && Math.abs(bl.x - br.x) < 1.15) {
            br.hp -= bl.dmg;
            br.hitFlash = 0.06;
            art.drawBarrelSign(br.canvas, br.hp, br.labelTxt);
            br.tex.needsUpdate = true;
            hit = true;
            if (br.hp <= 0) {
              SFX.boom(); shake = 8; haptic(25);
              spawnShockwave(br.x, br.z, 0xfacc15, 4.8);
              spawnShards(br.x, 1.3, br.z, br.isTank ? 0xfacc15 : 0xdc2626, 20);
              if (br.isTank) {
                deployTank();
              } else {
                weaponTier = Math.min(4, weaponTier + 1);
                const wName = t("weapons")[weaponTier];
                showToast(`🔫 ${wName}!`);
                spawnPopup3D(new THREE.Vector3(br.x, 2.5, br.z), wName, "#fde047");
                rebuildSquadVisuals();
              }
              scene.remove(br.group);
              barrels.splice(j, 1);
            }
            break;
          }
        }
      }

      if (!hit) {
        for (let j = enemies.length - 1; j >= 0; j--) {
          const en = enemies[j];
          const rad = en.brute ? 1.12 : 0.76;
          if (Math.abs(bl.z - en.z) < 1.15 && Math.abs(bl.x - en.x) < rad) {
            en.hp -= bl.dmg;
            en.flash = 0.06;
            en.z -= 0.2;
            if (bl.splash > 0) {
              spawnShockwave(en.x, en.z, 0xf97316, 2.8);
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
        for (let j = enemies.length - 1; j >= 0; j--) {
          if (enemies[j].hp <= 0) {
            const en = enemies[j];
            runKills++;
            runGold += en.brute ? 18 : 6;
            spawnShards(en.x, 0.9, en.z, en.brute ? 0xb91c1c : 0x65a30d, en.brute ? 14 : 7);
            scene.remove(en.mesh);
            enemies.splice(j, 1);
          }
        }
      }

      if (!hit && bossObj && Math.abs(bl.z - bossObj.z) < 2.3 && Math.abs(bl.x - bossObj.x) < 2.2) {
        bossObj.hp -= bl.dmg;
        bossObj.flash = 0.05;
        hit = true;
        if (bossObj.hp <= 0) {
          runKills++;
          spawnShockwave(bossObj.x, bossObj.z, 0xfacc15, 8.5);
          spawnShards(bossObj.x, 2.5, bossObj.z, 0xb91c1c, 28);
          spawnShards(bossObj.x, 3.0, bossObj.z, 0xfacc15, 24);
          scene.remove(bossObj.mesh);
          bossObj = null;
          finishStage(true);
          return;
        }
      }

      if (hit || bl.z < -72) {
        scene.remove(bl.mesh);
        bullets.splice(i, 1);
      }
    }

    // 키아트와 동일한 로우 앵글 3인칭 시네마틱 카메라 (병사·게이트·현수교·보스 박력 극대화!)
    const sx = (Math.random() - 0.5) * shake * 0.07;
    const sy = (Math.random() - 0.5) * shake * 0.07;
    camera.position.set(squadX * 0.36 + sx, 5.45 + sy, 8.9);
    camera.lookAt(squadX * 0.22, 1.85, -24);

    const badge = document.getElementById("squad-float-badge");
    const bv = new THREE.Vector3(squadX, 2.15, 0).project(camera);
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
      btn.innerHTML = `<div><span class="up-name">${d.icon} ${t(d.labelKey)}</span><span class="up-lv">Lv.${save.up[d.key] + 1}</span></div><span class="up-cost">◆ ${cost}</span>`;
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

  // 입력 (모바일 1손 멀티터치 안전 캡처 + 키보드)
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
  let activePointerId = null;
  let dragLastX = 0;
  container.addEventListener("pointerdown", (e) => {
    if ((state !== "playing" && state !== "boss") || activePointerId !== null) return;
    SFX.unlock();
    activePointerId = e.pointerId;
    dragging = true;
    dragLastX = e.clientX;
    try { container.setPointerCapture(e.pointerId); } catch (_) {}
  });
  window.addEventListener("pointermove", (e) => {
    if (!dragging || e.pointerId !== activePointerId || (state !== "playing" && state !== "boss")) return;
    const dx = e.clientX - dragLastX;
    dragLastX = e.clientX;
    const sens = (ROAD_W / Math.max(280, container.clientWidth)) * 1.45;
    targetX = Math.max(-HALF_X, Math.min(HALF_X, targetX + dx * sens));
  });
  window.addEventListener("pointerup", (e) => {
    if (e.pointerId !== activePointerId) return;
    activePointerId = null; dragging = false;
  });
  window.addEventListener("pointercancel", (e) => {
    if (e.pointerId !== activePointerId) return;
    activePointerId = null; dragging = false;
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
  document.getElementById("btn-play").onclick = () => { SFX.unlock(); startStage(0); };
  document.getElementById("btn-ad-boost").onclick = () => { SFX.unlock(); showRewarded(() => startStage(8)); };
  document.getElementById("btn-res-revive").onclick = () => {
    if (revivedOnce) return;
    showRewarded(() => {
      revivedOnce = true;
      squadCount = 12;
      rebuildSquadVisuals();
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
    camera.fov = h > w ? 58 : 46;
    camera.updateProjectionMatrix();
    renderer.setSize(w, h, false);
  }
  window.addEventListener("resize", handleResize);

  handleResize();
  squadCount = 3 + save.up.start * 2;
  buildStageCourse();
  rebuildSquadVisuals();
  applyI18n();

  const qualityGuard = art.createAdaptiveQualityGuard ? art.createAdaptiveQualityGuard(renderer, scene) : null;
  let lastTime = performance.now();
  function animate(now) {
    requestAnimationFrame(animate);
    const dt = (now - lastTime) / 1000;
    lastTime = now;
    if (qualityGuard) qualityGuard.sample(dt);
    update(dt, now * 0.001);
    renderer.render(scene, camera);
  }
  requestAnimationFrame(animate);
})();

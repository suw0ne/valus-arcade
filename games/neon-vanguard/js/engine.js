/**
 * 60fps 아레나 로그라이트 코어 전투 엔진 (engine.js).
 * 이동·대시·6종 무기/진화·5종 적 AI·보스 패턴·자석 드랍·영구 강화·세이브 데이터를 총괄한다.
 */
window.NV = window.NV || {};

(function (NV) {
  const SAVE_KEY = "nv_overdrive_save_v1";
  const ARENA_RADIUS = 1350;

  function clamp(v, min, max) {
    return v < min ? min : v > max ? max : v;
  }

  function distSq(ax, ay, bx, by) {
    const dx = ax - bx;
    const dy = ay - by;
    return dx * dx + dy * dy;
  }

  // 모바일 햅틱 진동 (지원 기기에서만 무오류 동작)
  function haptic(pattern) {
    try {
      if (navigator.vibrate) navigator.vibrate(pattern);
    } catch (_) {}
  }

  function defaultSave() {
    return {
      gold: 250,
      bestTime: 0,
      bestKills: 0,
      selectedChar: "striker",
      selectedStage: 1,
      unlockedChars: ["striker"],
      unlockedStage2: false,
      upgrades: { atk: 0, hp: 0, spd: 0, greed: 0, magnet: 0, regen: 0 },
      purchasedPacks: [],
    };
  }

  class GameEngine {
    constructor(callbacks) {
      this.cb = callbacks || {};
      this.save = this.loadSave();
      NV.SDK.noAdsOwned = this.hasPack("no_ads_pass");

      this.state = "lobby"; // lobby | playing | levelup | paused | revive | gameover
      this.keys = {};
      this.pointer = { active: false, startX: 0, startY: 0, curX: 0, curY: 0, vx: 0, vy: 0 };
      this.camera = { x: 0, y: 0, shake: 0 };

      this.resetRunState();
    }

    loadSave() {
      try {
        const raw = localStorage.getItem(SAVE_KEY);
        if (raw) {
          const parsed = JSON.parse(raw);
          const base = defaultSave();
          return {
            ...base,
            ...parsed,
            upgrades: { ...base.upgrades, ...(parsed.upgrades || {}) },
            unlockedChars: Array.isArray(parsed.unlockedChars) ? parsed.unlockedChars : ["striker"],
            purchasedPacks: Array.isArray(parsed.purchasedPacks) ? parsed.purchasedPacks : [],
          };
        }
      } catch (_) {}
      return defaultSave();
    }

    persistSave() {
      try {
        localStorage.setItem(SAVE_KEY, JSON.stringify(this.save));
      } catch (_) {}
    }

    hasPack(id) {
      return this.save.purchasedPacks.includes(id);
    }

    getUpgradeCost(up) {
      const lv = this.save.upgrades[up.id] || 0;
      return up.baseCost + lv * up.step;
    }

    buyArmoryUpgrade(id) {
      const up = NV.DATA.armoryUpgrades.find((u) => u.id === id);
      if (!up) return false;
      const lv = this.save.upgrades[id] || 0;
      if (lv >= up.maxLv) return false;
      const cost = this.getUpgradeCost(up);
      if (this.save.gold < cost) return false;
      this.save.gold -= cost;
      this.save.upgrades[id] = lv + 1;
      this.persistSave();
      NV.Audio.playLevelUp();
      return true;
    }

    unlockOrSelectChar(id) {
      const ch = NV.DATA.characters.find((c) => c.id === id);
      if (!ch) return false;
      if (this.save.unlockedChars.includes(id)) {
        this.save.selectedChar = id;
        this.persistSave();
        NV.Audio.playXp();
        return true;
      }
      if (this.save.gold >= ch.price) {
        this.save.gold -= ch.price;
        this.save.unlockedChars.push(id);
        this.save.selectedChar = id;
        this.persistSave();
        NV.Audio.playLevelUp();
        return true;
      }
      return false;
    }

    applyShopPack(packId) {
      if (this.hasPack(packId)) return false;
      this.save.purchasedPacks.push(packId);
      if (packId === "no_ads_pass") {
        NV.SDK.noAdsOwned = true;
      } else if (packId === "starter_bundle") {
        this.save.gold += 3000;
        if (!this.save.unlockedChars.includes("phantom")) this.save.unlockedChars.push("phantom");
      } else if (packId === "titan_bundle") {
        this.save.gold += 6000;
        ["phantom", "titan"].forEach((c) => {
          if (!this.save.unlockedChars.includes(c)) this.save.unlockedChars.push(c);
        });
        this.save.unlockedStage2 = true;
      }
      this.persistSave();
      NV.Audio.playLevelUp();
      return true;
    }

    resetRunState() {
      const ch = NV.DATA.characters.find((c) => c.id === this.save.selectedChar) || NV.DATA.characters[0];
      const up = this.save.upgrades;
      const stageMult = this.save.selectedStage === 2 ? 1.35 : 1.0;

      this.stage = this.save.selectedStage;
      this.stageMult = stageMult;
      this.goldStageMult = this.save.selectedStage === 2 ? 1.5 : 1.0;

      const maxHp = Math.round(ch.hp + up.hp * 20);
      this.player = {
        x: 0,
        y: 0,
        vx: 0,
        vy: 0,
        angle: -Math.PI / 2,
        radius: 16,
        color: ch.color,
        accent: ch.accent,
        hp: maxHp,
        maxHp,
        baseSpeed: ch.speed * (1 + up.spd * 0.06),
        baseCrit: ch.crit,
        baseMagnet: ch.magnet * (1 + up.magnet * 0.2),
        baseDmgMult: 1 + up.atk * 0.1,
        baseGoldMult: (1 + up.greed * 0.15) * this.goldStageMult,
        baseRegen: up.regen * 0.8,
        invuln: 0,
        dashCd: 0,
        dashMaxCd: 3.0,
        dashTime: 0,
        dashDirX: 1,
        dashDirY: 0,
        afterimages: [],
        level: 1,
        xp: 0,
        xpNeed: 18,
      };

      this.weapons = { [ch.startWeapon]: 1 };
      this.evolved = {};
      this.passives = {};
      this.weaponTimers = { pulse: 0, arc: 0.4, missile: 0.8, nova: 0.6, drone: 0.3 };
      this.bladeAngle = 0;
      this.droneAngle = 0;

      this.time = 0;
      this.kills = 0;
      this.runGold = 0;
      this.wave = 1;
      this.revivedOnce = false;
      this.doubledGold = false;
      this.rerolledThisLevel = false;
      this.hitstop = 0;
      this.banner = { text: "", timer: 0, color: "#38bdf8" };
      this.bossCount = 0;
      this.nextBossTime = 75; // 첫 보스 1분 15초 (초반 몰입 극대화)

      this.enemies = [];
      this.bullets = [];
      this.enemyBullets = [];
      this.gems = [];
      this.particles = [];
      this.bolts = [];
      this.wavesFx = [];
      this.floatTexts = [];
      this.spawnTimer = 0.25;
      this.activeBoss = null;
      this.camera = { x: 0, y: 0, shake: 0 };
    }

    startRun() {
      NV.Audio.unlock();
      this.resetRunState();
      this.state = "playing";
      // 초반 3초 몰입 극대화: 즉시 6기의 선봉 스워머 링 배치
      for (let i = 0; i < 6; i++) {
        const a = (Math.PI * 2 * i) / 6 + 0.3;
        this._spawnEnemy("swarmer", Math.cos(a) * 340, Math.sin(a) * 340);
      }
      NV.Audio.startBgm(false);
      NV.SDK.gameplayStart();
      if (this.cb.onStateChange) this.cb.onStateChange("playing");
    }

    // 스탯 계산 헬퍼
    getDmgMult() {
      return this.player.baseDmgMult * (1 + (this.passives.power_core || 0) * 0.18);
    }
    getFireRateMult() {
      return 1 + (this.passives.haste_core || 0) * 0.14;
    }
    getCritChance() {
      return Math.min(0.85, this.player.baseCrit + (this.passives.crit_core || 0) * 0.09);
    }
    getAreaMult() {
      return 1 + (this.passives.area_core || 0) * 0.16;
    }
    getMagnetRadius() {
      return this.player.baseMagnet * (1 + (this.passives.magnet_core || 0) * 0.35);
    }
    getXpMult() {
      return 1 + (this.passives.magnet_core || 0) * 0.12;
    }

    triggerDash() {
      if (this.state !== "playing") return;
      const p = this.player;
      if (p.dashCd > 0 || p.dashTime > 0) return;

      let dx = p.vx;
      let dy = p.vy;
      const len = Math.hypot(dx, dy);
      if (len > 1) {
        dx /= len;
        dy /= len;
      } else {
        dx = Math.cos(p.angle);
        dy = Math.sin(p.angle);
      }
      p.dashDirX = dx;
      p.dashDirY = dy;
      p.dashTime = 0.22;
      p.invuln = Math.max(p.invuln, 0.34);
      p.dashCd = Math.max(1.4, p.dashMaxCd / this.getFireRateMult());
      NV.Audio.playDash();
      haptic(18);
      this.camera.shake = Math.max(this.camera.shake, 5);
      this.wavesFx.push({ x: p.x, y: p.y, r: 10, maxR: 110, color: p.color, life: 0.25, maxLife: 0.25 });

      // 대시 시 근접 적 밀어내기
      for (const e of this.enemies) {
        const d = Math.hypot(e.x - p.x, e.y - p.y);
        if (d < 115 && d > 0.1) {
          const push = e.isBoss ? 80 : 280;
          e.kx += ((e.x - p.x) / d) * push;
          e.ky += ((e.y - p.y) / d) * push;
        }
      }
    }

    showBanner(text, color = "#38bdf8", duration = 2.8) {
      this.banner = { text, color, timer: duration };
    }

    update(dt) {
      if (this.state === "lobby") {
        this.time += dt;
        return;
      }
      if (this.state !== "playing") return;

      dt = Math.min(dt, 0.05);
      if (this.hitstop > 0) {
        this.hitstop -= dt;
        return;
      }

      this.time += dt;
      this.wave = Math.floor(this.time / 25) + 1;
      if (this.banner.timer > 0) this.banner.timer -= dt;

      this._updatePlayer(dt);
      this._updateSpawning(dt);
      this._updateWeapons(dt);
      this._updateBullets(dt);
      this._updateEnemies(dt);
      this._updateEnemyBullets(dt);
      this._updateGems(dt);
      this._updateEffects(dt);

      // 부드러운 카메라 추적 + 흔들림 감쇠
      this.camera.x += (this.player.x - this.camera.x) * Math.min(1, dt * 8);
      this.camera.y += (this.player.y - this.camera.y) * Math.min(1, dt * 8);
      this.camera.shake = Math.max(0, this.camera.shake - dt * 28);
    }

    _updatePlayer(dt) {
      const p = this.player;
      if (p.invuln > 0) p.invuln -= dt;
      if (p.dashCd > 0) p.dashCd = Math.max(0, p.dashCd - dt);

      // 자가 회복
      const totalRegen = p.baseRegen + (this.passives.armor_core || 0) * 0.7;
      if (totalRegen > 0 && p.hp < p.maxHp) {
        p.hp = Math.min(p.maxHp, p.hp + totalRegen * dt);
      }

      let ix = 0;
      let iy = 0;
      if (this.keys["KeyW"] || this.keys["ArrowUp"]) iy -= 1;
      if (this.keys["KeyS"] || this.keys["ArrowDown"]) iy += 1;
      if (this.keys["KeyA"] || this.keys["ArrowLeft"]) ix -= 1;
      if (this.keys["KeyD"] || this.keys["ArrowRight"]) ix += 1;

      if (ix === 0 && iy === 0 && this.pointer.active) {
        ix = this.pointer.vx;
        iy = this.pointer.vy;
      }

      const ilen = Math.hypot(ix, iy);
      if (ilen > 0.05) {
        ix /= ilen;
        iy /= ilen;
      } else {
        ix = 0;
        iy = 0;
      }

      if (p.dashTime > 0) {
        p.dashTime -= dt;
        const dashSpd = p.baseSpeed * 3.15;
        p.vx = p.dashDirX * dashSpd;
        p.vy = p.dashDirY * dashSpd;
        p.afterimages.push({ x: p.x, y: p.y, angle: p.angle, life: 0.22, maxLife: 0.22 });
      } else {
        const targetVx = ix * p.baseSpeed;
        const targetVy = iy * p.baseSpeed;
        p.vx += (targetVx - p.vx) * Math.min(1, dt * 16);
        p.vy += (targetVy - p.vy) * Math.min(1, dt * 16);
      }

      p.x += p.vx * dt;
      p.y += p.vy * dt;

      // 원형 아레나 경계 클램프
      const d = Math.hypot(p.x, p.y);
      if (d > ARENA_RADIUS - p.radius) {
        const scale = (ARENA_RADIUS - p.radius) / d;
        p.x *= scale;
        p.y *= scale;
      }

      if (Math.hypot(p.vx, p.vy) > 25) {
        const targetAngle = Math.atan2(p.vy, p.vx);
        let diff = targetAngle - p.angle;
        while (diff > Math.PI) diff -= Math.PI * 2;
        while (diff < -Math.PI) diff += Math.PI * 2;
        p.angle += diff * Math.min(1, dt * 14);

        // 추진 파티클
        if (Math.random() < 0.55) {
          this.particles.push({
            x: p.x - Math.cos(p.angle) * 14 + (Math.random() - 0.5) * 6,
            y: p.y - Math.sin(p.angle) * 14 + (Math.random() - 0.5) * 6,
            vx: -Math.cos(p.angle) * (40 + Math.random() * 50),
            vy: -Math.sin(p.angle) * (40 + Math.random() * 50),
            r: 2.5 + Math.random() * 2,
            color: p.color,
            life: 0.22,
            maxLife: 0.22,
          });
        }
      }

      for (let i = p.afterimages.length - 1; i >= 0; i--) {
        p.afterimages[i].life -= dt;
        if (p.afterimages[i].life <= 0) p.afterimages.splice(i, 1);
      }
    }

    _updateSpawning(dt) {
      // 보스 출현 체크
      if (!this.activeBoss && this.time >= this.nextBossTime) {
        this._spawnBoss();
        this.nextBossTime += 85;
      }

      this.spawnTimer -= dt;
      const maxEnemies = Math.min(120, 34 + this.wave * 10);
      if (this.spawnTimer <= 0 && this.enemies.length < maxEnemies) {
        const interval = Math.max(0.22, 0.88 - this.time * 0.0022);
        this.spawnTimer = interval;
        const packSize = this.time > 100 ? 4 : this.time > 35 ? 3 : 2;
        for (let i = 0; i < packSize; i++) {
          this._spawnEnemy();
        }
      }
    }

    _spawnEnemy(forcedType, fx, fy) {
      const ang = Math.random() * Math.PI * 2;
      const dist = 540 + Math.random() * 140;
      let x = fx !== undefined ? fx : this.player.x + Math.cos(ang) * dist;
      let y = fy !== undefined ? fy : this.player.y + Math.sin(ang) * dist;
      const md = Math.hypot(x, y);
      if (md > ARENA_RADIUS - 30) {
        x = (x / md) * (ARENA_RADIUS - 30);
        y = (y / md) * (ARENA_RADIUS - 30);
      }

      let type = forcedType;
      if (!type) {
        const r = Math.random();
        if (this.time > 60 && r < 0.14) type = "sniper";
        else if (this.time > 40 && r < 0.30) type = "splitter";
        else if (this.time > 25 && r < 0.48) type = "charger";
        else if (this.time > 15 && r < 0.64) type = "aegis";
        else type = "swarmer";
      }

      const scale = (1 + this.time * 0.0115) * this.stageMult;
      const defs = {
        swarmer: { hp: 22, spd: 112, r: 12, dmg: 10, xp: 6, gold: 1, color: "#f43f5e" },
        charger: { hp: 38, spd: 95, r: 14, dmg: 16, xp: 10, gold: 2, color: "#fb923c" },
        aegis: { hp: 92, spd: 68, r: 20, dmg: 18, xp: 16, gold: 4, color: "#a855f7" },
        splitter: { hp: 48, spd: 86, r: 16, dmg: 13, xp: 12, gold: 3, color: "#eab308" },
        mini: { hp: 14, spd: 148, r: 8, dmg: 7, xp: 4, gold: 1, color: "#fde047" },
        sniper: { hp: 34, spd: 78, r: 14, dmg: 12, xp: 13, gold: 3, color: "#ec4899" },
      };
      const d = defs[type] || defs.swarmer;
      this.enemies.push({
        type,
        x,
        y,
        kx: 0,
        ky: 0,
        hp: Math.round(d.hp * scale),
        maxHp: Math.round(d.hp * scale),
        speed: d.spd * (1 + Math.min(0.45, this.time * 0.0008)),
        radius: d.r,
        dmg: Math.round(d.dmg * (1 + this.time * 0.002)),
        xp: d.xp,
        gold: d.gold,
        color: d.color,
        hitFlash: 0,
        slowTimer: 0,
        aiTimer: 1.5 + Math.random() * 1.5,
        chargeState: 0, // 0 idle, 1 telegraph, 2 dashing
        tx: 0,
        ty: 0,
        isBoss: false,
      });
    }

    _spawnBoss() {
      this.bossCount++;
      const ang = Math.random() * Math.PI * 2;
      let x = this.player.x + Math.cos(ang) * 480;
      let y = this.player.y + Math.sin(ang) * 480;
      const md = Math.hypot(x, y);
      if (md > ARENA_RADIUS - 80) {
        x = (x / md) * (ARENA_RADIUS - 80);
        y = (y / md) * (ARENA_RADIUS - 80);
      }

      const hp = Math.round((950 + this.bossCount * 850) * this.stageMult);
      const boss = {
        type: "boss",
        name: this.bossCount === 1 ? "APEX WARDEN" : this.bossCount === 2 ? "CRIMSON OVERLORD" : `OMEGA CORE MK-${this.bossCount}`,
        x,
        y,
        kx: 0,
        ky: 0,
        hp,
        maxHp: hp,
        speed: 78 + this.bossCount * 8,
        radius: 40,
        dmg: 24 + this.bossCount * 5,
        xp: 120,
        gold: 160 + this.bossCount * 80,
        color: "#ef4444",
        hitFlash: 0,
        slowTimer: 0,
        aiTimer: 2.2,
        ringTelegraph: null,
        isBoss: true,
      };
      this.enemies.push(boss);
      this.activeBoss = boss;
      this.showBanner(`${NV.t("bossWarning")} · ${boss.name}`, "#ef4444", 3.4);
      NV.Audio.playBossSiren();
      haptic([40, 30, 60]);
      NV.Audio.startBgm(true);
      this.camera.shake = 12;
    }

    _findNearestEnemy(x, y, maxRange = 680) {
      let best = null;
      let bestD2 = maxRange * maxRange;
      for (const e of this.enemies) {
        const d2 = distSq(x, y, e.x, e.y);
        if (d2 < bestD2) {
          bestD2 = d2;
          best = e;
        }
      }
      return best;
    }

    _updateWeapons(dt) {
      const p = this.player;
      const rate = this.getFireRateMult();
      const dmgM = this.getDmgMult();
      const areaM = this.getAreaMult();

      // 1. 펄스 캐논 / 하이퍼 레일건
      if (this.weapons.pulse) {
        this.weaponTimers.pulse -= dt;
        const lv = this.weapons.pulse;
        const evo = !!this.evolved.pulse;
        if (this.weaponTimers.pulse <= 0) {
          const target = this._findNearestEnemy(p.x, p.y, 640);
          if (target) {
            const baseAng = Math.atan2(target.y - p.y, target.x - p.x);
            const count = evo ? 3 : lv >= 4 ? 3 : lv >= 2 ? 2 : 1;
            const spread = evo ? 0.14 : 0.16;
            for (let i = 0; i < count; i++) {
              const offset = (i - (count - 1) / 2) * spread;
              const a = baseAng + offset;
              this.bullets.push({
                kind: evo ? "rail" : "pulse",
                x: p.x + Math.cos(a) * 16,
                y: p.y + Math.sin(a) * 16,
                vx: Math.cos(a) * (evo ? 980 : 640),
                vy: Math.sin(a) * (evo ? 980 : 640),
                r: (evo ? 9 : 6) * areaM,
                dmg: (evo ? 52 : 18 + lv * 6) * dmgM,
                pierce: evo ? 6 : lv >= 5 ? 2 : 1,
                hitSet: new Set(),
                color: evo ? "#38bdf8" : "#7dd3fc",
                life: 1.3,
              });
            }
            NV.Audio.playShoot(evo ? "rail" : "pulse");
            this.weaponTimers.pulse = (evo ? 0.34 : Math.max(0.24, 0.56 - lv * 0.06)) / rate;
          }
        }
      }

      // 2. 오비탈 블레이드 / 팬텀 사이클론
      if (this.weapons.blade) {
        const lv = this.weapons.blade;
        const evo = !!this.evolved.blade;
        const count = evo ? 6 : 1 + lv;
        const orbitR = (evo ? 105 : 74 + lv * 5) * areaM;
        this.bladeAngle += dt * (evo ? 5.8 : 3.2 + lv * 0.35) * rate;
        const bladeDmg = (evo ? 44 : 16 + lv * 5) * dmgM;

        for (let i = 0; i < count; i++) {
          const a = this.bladeAngle + (Math.PI * 2 * i) / count;
          const bx = p.x + Math.cos(a) * orbitR;
          const by = p.y + Math.sin(a) * orbitR;
          for (const e of this.enemies) {
            if (e.bladeCd && e.bladeCd > 0) continue;
            const rr = e.radius + (evo ? 18 : 13) * areaM;
            if (distSq(bx, by, e.x, e.y) <= rr * rr) {
              this._damageEnemy(e, bladeDmg, bx, by, 170);
              e.bladeCd = evo ? 0.16 : 0.28;
            }
          }
        }
      }

      // 3. 아크 라이트닝 / 테슬라 스톰
      if (this.weapons.arc) {
        this.weaponTimers.arc -= dt;
        const lv = this.weapons.arc;
        const evo = !!this.evolved.arc;
        if (this.weaponTimers.arc <= 0 && this.enemies.length > 0) {
          const first = this._findNearestEnemy(p.x, p.y, evo ? 780 : 520);
          if (first) {
            const chains = evo ? 8 : 2 + lv;
            const dmg = (evo ? 68 : 24 + lv * 8) * dmgM;
            const visited = new Set();
            let curr = first;
            let px = p.x;
            let py = p.y;
            for (let c = 0; c < chains && curr; c++) {
              visited.add(curr);
              this.bolts.push({ x1: px, y1: py, x2: curr.x, y2: curr.y, color: evo ? "#c084fc" : "#a78bfa", life: 0.22, maxLife: 0.22 });
              this._damageEnemy(curr, dmg, px, py, 60);
              if (evo) {
                this.wavesFx.push({ x: curr.x, y: curr.y, r: 8, maxR: 65 * areaM, color: "#c084fc", life: 0.22, maxLife: 0.22 });
              }
              px = curr.x;
              py = curr.y;
              let next = null;
              let bestD = (280 * areaM) ** 2;
              for (const cand of this.enemies) {
                if (visited.has(cand) || cand.hp <= 0) continue;
                const d2 = distSq(px, py, cand.x, cand.y);
                if (d2 < bestD) {
                  bestD = d2;
                  next = cand;
                }
              }
              curr = next;
            }
            NV.Audio.playShoot("arc");
            this.weaponTimers.arc = (evo ? 0.65 : Math.max(0.75, 1.45 - lv * 0.12)) / rate;
          }
        }
      }

      // 4. 호밍 미사일 / 오메가 바라지
      if (this.weapons.missile) {
        this.weaponTimers.missile -= dt;
        const lv = this.weapons.missile;
        const evo = !!this.evolved.missile;
        if (this.weaponTimers.missile <= 0 && this.enemies.length > 0) {
          const salvo = evo ? 5 : Math.min(4, 1 + Math.floor(lv / 2));
          for (let i = 0; i < salvo; i++) {
            const a = p.angle + (Math.random() - 0.5) * 1.8;
            this.bullets.push({
              kind: "missile",
              x: p.x,
              y: p.y,
              vx: Math.cos(a) * 320,
              vy: Math.sin(a) * 320,
              r: evo ? 9 : 7,
              dmg: (evo ? 75 : 32 + lv * 10) * dmgM,
              splash: (evo ? 115 : 68 + lv * 7) * areaM,
              pierce: 1,
              hitSet: new Set(),
              color: evo ? "#f97316" : "#fb923c",
              life: 2.8,
            });
          }
          NV.Audio.playShoot("missile");
          this.weaponTimers.missile = (evo ? 1.15 : Math.max(1.2, 2.1 - lv * 0.16)) / rate;
        }
      }

      // 5. 노바 펄스 / 앱솔루트 제로
      if (this.weapons.nova) {
        this.weaponTimers.nova -= dt;
        const lv = this.weapons.nova;
        const evo = !!this.evolved.nova;
        if (this.weaponTimers.nova <= 0) {
          const maxR = (evo ? 255 : 135 + lv * 18) * areaM;
          const dmg = (evo ? 62 : 20 + lv * 7) * dmgM;
          this.wavesFx.push({ x: p.x, y: p.y, r: 16, maxR, color: evo ? "#67e8f9" : "#2dd4bf", life: 0.42, maxLife: 0.42 });
          for (const e of this.enemies) {
            if (distSq(p.x, p.y, e.x, e.y) <= (maxR + e.radius) ** 2) {
              this._damageEnemy(e, dmg, p.x, p.y, 130);
              e.slowTimer = Math.max(e.slowTimer, evo ? 3.0 : 1.7);
            }
          }
          NV.Audio.playExplosion(evo);
          this.weaponTimers.nova = (evo ? 1.6 : Math.max(1.8, 2.9 - lv * 0.2)) / rate;
        }
      }

      // 6. 어썰트 드론 / 발키리 편대
      if (this.weapons.drone) {
        const lv = this.weapons.drone;
        const evo = !!this.evolved.drone;
        this.droneAngle += dt * 1.9;
        this.weaponTimers.drone -= dt;
        if (this.weaponTimers.drone <= 0) {
          const droneCount = evo ? 2 : 1;
          for (let d = 0; d < droneCount; d++) {
            const ang = this.droneAngle + d * Math.PI;
            const dx = p.x + Math.cos(ang) * 56;
            const dy = p.y + Math.sin(ang) * 56;
            const target = this._findNearestEnemy(dx, dy, 520);
            if (target) {
              const a = Math.atan2(target.y - dy, target.x - dx);
              this.bullets.push({
                kind: "drone",
                x: dx,
                y: dy,
                vx: Math.cos(a) * 760,
                vy: Math.sin(a) * 760,
                r: evo ? 6 : 5,
                dmg: (evo ? 32 : 13 + lv * 4.5) * dmgM,
                pierce: evo ? 2 : 1,
                hitSet: new Set(),
                color: "#4ade80",
                life: 1.0,
              });
            }
          }
          this.weaponTimers.drone = (evo ? 0.19 : Math.max(0.24, 0.52 - lv * 0.05)) / rate;
        }
      }
    }

    _updateBullets(dt) {
      for (let i = this.bullets.length - 1; i >= 0; i--) {
        const b = this.bullets[i];
        b.life -= dt;
        if (b.life <= 0) {
          this.bullets.splice(i, 1);
          continue;
        }

        if (b.kind === "missile") {
          const target = this._findNearestEnemy(b.x, b.y, 640);
          if (target) {
            const desired = Math.atan2(target.y - b.y, target.x - b.x);
            const cur = Math.atan2(b.vy, b.vx);
            let diff = desired - cur;
            while (diff > Math.PI) diff -= Math.PI * 2;
            while (diff < -Math.PI) diff += Math.PI * 2;
            const nextA = cur + clamp(diff, -dt * 6.5, dt * 6.5);
            const spd = 460;
            b.vx = Math.cos(nextA) * spd;
            b.vy = Math.sin(nextA) * spd;
          }
          if (Math.random() < 0.65) {
            this.particles.push({ x: b.x, y: b.y, vx: 0, vy: 0, r: 3, color: "#fdba74", life: 0.18, maxLife: 0.18 });
          }
        }

        b.x += b.vx * dt;
        b.y += b.vy * dt;

        let remove = false;
        for (const e of this.enemies) {
          if (e.hp <= 0 || b.hitSet.has(e)) continue;
          const rr = e.radius + b.r;
          if (distSq(b.x, b.y, e.x, e.y) <= rr * rr) {
            b.hitSet.add(e);
            if (b.kind === "missile") {
              this._explodeMissile(b);
              remove = true;
              break;
            } else {
              this._damageEnemy(e, b.dmg, b.x, b.y, 95);
              b.pierce--;
              if (b.pierce <= 0) {
                remove = true;
                break;
              }
            }
          }
        }
        if (remove) this.bullets.splice(i, 1);
      }
    }

    _explodeMissile(b) {
      this.wavesFx.push({ x: b.x, y: b.y, r: 8, maxR: b.splash, color: "#fb923c", life: 0.28, maxLife: 0.28 });
      NV.Audio.playExplosion(false);
      this.camera.shake = Math.max(this.camera.shake, 4.5);
      for (const e of this.enemies) {
        if (e.hp <= 0) continue;
        if (distSq(b.x, b.y, e.x, e.y) <= (b.splash + e.radius) ** 2) {
          this._damageEnemy(e, b.dmg, b.x, b.y, 160);
        }
      }
      for (let k = 0; k < 10; k++) {
        const a = Math.random() * Math.PI * 2;
        const s = 60 + Math.random() * 140;
        this.particles.push({ x: b.x, y: b.y, vx: Math.cos(a) * s, vy: Math.sin(a) * s, r: 3 + Math.random() * 3, color: "#fb923c", life: 0.3, maxLife: 0.3 });
      }
    }

    _damageEnemy(e, rawDmg, srcX, srcY, knock) {
      const isCrit = Math.random() < this.getCritChance();
      const finalDmg = Math.round(rawDmg * (isCrit ? 1.85 : 1.0) * (0.93 + Math.random() * 0.14));
      e.hp -= finalDmg;
      e.hitFlash = 0.1;

      const d = Math.hypot(e.x - srcX, e.y - srcY) || 1;
      const kScale = e.isBoss ? 0.12 : 1.0;
      e.kx += ((e.x - srcX) / d) * knock * kScale;
      e.ky += ((e.y - srcY) / d) * knock * kScale;

      if (this.floatTexts.length < 48) {
        this.floatTexts.push({
          x: e.x + (Math.random() - 0.5) * 18,
          y: e.y - e.radius,
          text: isCrit ? `${finalDmg}!` : `${finalDmg}`,
          color: isCrit ? "#facc15" : "#f8fafc",
          size: isCrit ? 16 : 12,
          life: 0.55,
          maxLife: 0.55,
        });
      }
      NV.Audio.playHit(isCrit);

      if (e.hp <= 0) {
        this._killEnemy(e);
      }
    }

    _killEnemy(e) {
      this.kills++;
      const count = e.isBoss ? 38 : 9;
      for (let k = 0; k < count; k++) {
        const a = Math.random() * Math.PI * 2;
        const s = (e.isBoss ? 120 : 55) + Math.random() * (e.isBoss ? 240 : 120);
        this.particles.push({
          x: e.x,
          y: e.y,
          vx: Math.cos(a) * s,
          vy: Math.sin(a) * s,
          r: e.isBoss ? 5 : 2.5 + Math.random() * 2.5,
          color: e.color,
          life: e.isBoss ? 0.65 : 0.32,
          maxLife: e.isBoss ? 0.65 : 0.32,
        });
      }

      if (e.type === "splitter") {
        for (let m = 0; m < 3; m++) {
          const a = (Math.PI * 2 * m) / 3;
          this._spawnEnemy("mini", e.x + Math.cos(a) * 18, e.y + Math.sin(a) * 18);
        }
      }

      // 드랍 생성
      this.gems.push({ kind: "xp", x: e.x, y: e.y, val: e.xp, color: e.xp >= 15 ? "#facc15" : e.xp >= 10 ? "#38bdf8" : "#4ade80", r: e.xp >= 15 ? 7 : 5 });
      if (Math.random() < 0.24 || e.isBoss) {
        this.gems.push({ kind: "gold", x: e.x + 8, y: e.y - 6, val: e.gold, color: "#fbbf24", r: 6 });
      }
      if (!e.isBoss && Math.random() < 0.014) {
        this.gems.push({ kind: "heal", x: e.x - 8, y: e.y + 6, val: 28, color: "#22c55e", r: 8 });
      }
      if (!e.isBoss && Math.random() < 0.006) {
        this.gems.push({ kind: "magnet", x: e.x, y: e.y, val: 1, color: "#60a5fa", r: 9 });
      }

      if (e.isBoss) {
        this.activeBoss = null;
        this.hitstop = 0.08;
        this.camera.shake = 18;
        NV.Audio.playExplosion(true);
        NV.Audio.startBgm(false);
        NV.SDK.happytime();
        this.runGold += Math.round(e.gold * this.player.baseGoldMult);
        this.player.hp = Math.min(this.player.maxHp, this.player.hp + this.player.maxHp * 0.45);
        this.showBanner(NV.t("chestBanner"), "#facc15", 3.6);
        // 1보스 처치 시 구역 02 영구 해금
        if (!this.save.unlockedStage2) {
          this.save.unlockedStage2 = true;
          this.persistSave();
        }
      }
    }

    _updateEnemies(dt) {
      const p = this.player;
      for (let i = this.enemies.length - 1; i >= 0; i--) {
        const e = this.enemies[i];
        if (e.hp <= 0) {
          this.enemies.splice(i, 1);
          continue;
        }
        if (e.hitFlash > 0) e.hitFlash -= dt;
        if (e.slowTimer > 0) e.slowTimer -= dt;
        if (e.bladeCd && e.bladeCd > 0) e.bladeCd -= dt;

        const slowM = e.slowTimer > 0 ? 0.45 : 1.0;
        const dx = p.x - e.x;
        const dy = p.y - e.y;
        const d = Math.hypot(dx, dy) || 1;

        if (e.type === "charger") {
          e.aiTimer -= dt;
          if (e.chargeState === 0) {
            e.x += (dx / d) * e.speed * slowM * dt;
            e.y += (dy / d) * e.speed * slowM * dt;
            if (e.aiTimer <= 0 && d < 360) {
              e.chargeState = 1;
              e.aiTimer = 0.65;
              e.tx = dx / d;
              e.ty = dy / d;
            }
          } else if (e.chargeState === 1) {
            if (e.aiTimer <= 0) {
              e.chargeState = 2;
              e.aiTimer = 0.55;
            }
          } else {
            e.x += e.tx * e.speed * 3.1 * slowM * dt;
            e.y += e.ty * e.speed * 3.1 * slowM * dt;
            if (e.aiTimer <= 0) {
              e.chargeState = 0;
              e.aiTimer = 2.6;
            }
          }
        } else if (e.type === "sniper") {
          const desiredDist = 260;
          if (d > desiredDist + 30) {
            e.x += (dx / d) * e.speed * slowM * dt;
            e.y += (dy / d) * e.speed * slowM * dt;
          } else if (d < desiredDist - 40) {
            e.x -= (dx / d) * e.speed * 0.7 * slowM * dt;
            e.y -= (dy / d) * e.speed * 0.7 * slowM * dt;
          }
          e.aiTimer -= dt;
          if (e.aiTimer <= 0 && d < 500) {
            e.aiTimer = 2.4;
            this.enemyBullets.push({ x: e.x, y: e.y, vx: (dx / d) * 260, vy: (dy / d) * 260, r: 6, dmg: e.dmg, life: 3.0 });
          }
        } else if (e.isBoss) {
          e.x += (dx / d) * e.speed * slowM * dt;
          e.y += (dy / d) * e.speed * slowM * dt;
          e.aiTimer -= dt;
          if (e.ringTelegraph) {
            e.ringTelegraph.t -= dt;
            if (e.ringTelegraph.t <= 0) {
              // 보스 충격파 + 원형 탄막 발사
              const count = 12 + this.bossCount * 2;
              for (let k = 0; k < count; k++) {
                const a = (Math.PI * 2 * k) / count + this.time;
                this.enemyBullets.push({ x: e.x, y: e.y, vx: Math.cos(a) * 235, vy: Math.sin(a) * 235, r: 7, dmg: Math.round(e.dmg * 0.7), life: 3.4 });
              }
              this.wavesFx.push({ x: e.x, y: e.y, r: 20, maxR: e.ringTelegraph.r, color: "#ef4444", life: 0.35, maxLife: 0.35 });
              if (d < e.ringTelegraph.r) this._hurtPlayer(e.dmg);
              e.ringTelegraph = null;
              e.aiTimer = 3.2;
            }
          } else if (e.aiTimer <= 0) {
            e.ringTelegraph = { r: 175, t: 1.05, maxT: 1.05 };
          }
        } else {
          e.x += (dx / d) * e.speed * slowM * dt;
          e.y += (dy / d) * e.speed * slowM * dt;
        }

        // 넉백 감쇠 적용
        e.x += e.kx * dt;
        e.y += e.ky * dt;
        e.kx *= Math.pow(0.05, dt);
        e.ky *= Math.pow(0.05, dt);

        // 플레이어 충돌 판정
        const hitR = e.radius + p.radius - 3;
        if (d < hitR) {
          this._hurtPlayer(e.dmg);
        }
      }
    }

    _updateEnemyBullets(dt) {
      const p = this.player;
      for (let i = this.enemyBullets.length - 1; i >= 0; i--) {
        const b = this.enemyBullets[i];
        b.life -= dt;
        b.x += b.vx * dt;
        b.y += b.vy * dt;
        if (b.life <= 0) {
          this.enemyBullets.splice(i, 1);
          continue;
        }
        const rr = p.radius + b.r - 2;
        if (distSq(p.x, p.y, b.x, b.y) <= rr * rr) {
          this._hurtPlayer(b.dmg);
          this.enemyBullets.splice(i, 1);
        }
      }
    }

    _hurtPlayer(dmg) {
      const p = this.player;
      if (p.invuln > 0) return;
      p.hp = Math.max(0, p.hp - dmg);
      p.invuln = 0.55;
      this.camera.shake = Math.max(this.camera.shake, 9);
      NV.Audio.playHurt();
      haptic(35);

      if (p.hp <= 0) {
        if (!this.revivedOnce) {
          this.state = "revive";
          NV.SDK.gameplayStop();
          if (this.cb.onStateChange) this.cb.onStateChange("revive");
        } else {
          this.finishRun();
        }
      }
    }

    revivePlayer() {
      const p = this.player;
      this.revivedOnce = true;
      p.hp = p.maxHp;
      p.invuln = 2.6;
      this.enemyBullets = [];
      // 주변 일반 적 전멸 충격파
      this.wavesFx.push({ x: p.x, y: p.y, r: 20, maxR: 420, color: "#facc15", life: 0.5, maxLife: 0.5 });
      for (const e of this.enemies) {
        if (!e.isBoss && distSq(p.x, p.y, e.x, e.y) < 420 * 420) {
          e.hp = 0;
          this._killEnemy(e);
        }
      }
      this.camera.shake = 14;
      NV.Audio.playLevelUp();
      this.state = "playing";
      NV.SDK.gameplayStart();
      if (this.cb.onStateChange) this.cb.onStateChange("playing");
    }

    finishRun() {
      this.state = "gameover";
      NV.Audio.stopBgm();
      NV.SDK.gameplayStop();

      // 기본 생존 보너스 골드 정산
      const bonus = Math.round((this.time * 0.8 + this.kills * 0.45) * this.player.baseGoldMult);
      this.runGold += bonus;
      this.save.gold += this.runGold;
      if (this.time > this.save.bestTime) this.save.bestTime = Math.floor(this.time);
      if (this.kills > this.save.bestKills) this.save.bestKills = this.kills;
      this.persistSave();

      NV.SDK.showMidgameAd(() => {
        if (this.cb.onStateChange) this.cb.onStateChange("gameover");
      });
    }

    claimDoubleGold() {
      if (this.doubledGold) return false;
      this.doubledGold = true;
      this.save.gold += this.runGold;
      this.runGold *= 2;
      this.persistSave();
      NV.Audio.playLevelUp();
      return true;
    }

    _updateGems(dt) {
      const p = this.player;
      const magR = this.getMagnetRadius();
      const magR2 = magR * magR;

      for (let i = this.gems.length - 1; i >= 0; i--) {
        const g = this.gems[i];
        const d2 = distSq(p.x, p.y, g.x, g.y);
        if (g.vacuum || d2 < magR2) {
          g.vacuum = true;
          const d = Math.sqrt(d2) || 1;
          const pull = 460 + (g.kind === "xp" ? 120 : 0);
          g.x += ((p.x - g.x) / d) * pull * dt;
          g.y += ((p.y - g.y) / d) * pull * dt;
        }
        if (d2 < (p.radius + g.r + 6) ** 2) {
          if (g.kind === "xp") {
            p.xp += g.val * this.getXpMult();
            NV.Audio.playXp();
            if (p.xp >= p.xpNeed) {
              this._triggerLevelUp();
            }
          } else if (g.kind === "gold") {
            this.runGold += Math.round(g.val * this.player.baseGoldMult);
            NV.Audio.playXp();
          } else if (g.kind === "heal") {
            p.hp = Math.min(p.maxHp, p.hp + g.val);
            this.floatTexts.push({ x: p.x, y: p.y - 24, text: `+${g.val} HP`, color: "#4ade80", size: 15, life: 0.8, maxLife: 0.8 });
            NV.Audio.playLevelUp();
          } else if (g.kind === "magnet") {
            for (const other of this.gems) {
              if (other.kind === "xp" || other.kind === "gold") other.vacuum = true;
            }
            this.wavesFx.push({ x: p.x, y: p.y, r: 10, maxR: 280, color: "#60a5fa", life: 0.4, maxLife: 0.4 });
            NV.Audio.playDash();
          }
          this.gems.splice(i, 1);
        }
      }
    }

    _triggerLevelUp() {
      const p = this.player;
      p.xp -= p.xpNeed;
      p.level++;
      p.xpNeed = Math.round(18 + p.level * 12 + Math.pow(p.level, 1.38) * 3.5);
      this.rerolledThisLevel = false;
      this.state = "levelup";
      NV.Audio.playLevelUp();
      NV.SDK.gameplayStop();
      if (this.cb.onLevelUp) this.cb.onLevelUp(this.rollUpgradeChoices());
    }

    rollUpgradeChoices() {
      const pool = [];
      // 1) 초월 진화 가능 무기 최우선 후보
      for (const [wid, w] of Object.entries(NV.DATA.weapons)) {
        if ((this.weapons[wid] || 0) >= w.maxLv && !this.evolved[wid] && (this.passives[w.evoKey] || 0) >= 1) {
          pool.push({ kind: "evo", id: wid, data: w, priority: 100 });
        }
      }
      // 2) 일반 무기 강화/신규
      for (const [wid, w] of Object.entries(NV.DATA.weapons)) {
        const lv = this.weapons[wid] || 0;
        if (lv < w.maxLv) {
          pool.push({ kind: "weapon", id: wid, data: w, nextLv: lv + 1, priority: lv > 0 ? 18 : 12 });
        }
      }
      // 3) 패시브 코어
      for (const [pid, p] of Object.entries(NV.DATA.passives)) {
        const lv = this.passives[pid] || 0;
        if (lv < p.maxLv) {
          pool.push({ kind: "passive", id: pid, data: p, nextLv: lv + 1, priority: lv > 0 ? 15 : 10 });
        }
      }
      // 가중 랜덤 3개 추출 (진화 카드 있으면 1번 슬롯 확정 배치)
      const evos = pool.filter((x) => x.kind === "evo");
      const others = pool.filter((x) => x.kind !== "evo").sort(() => Math.random() - 0.5);
      const picked = [];
      if (evos.length > 0) picked.push(evos[0]);
      for (const item of others) {
        if (picked.length >= 3) break;
        picked.push(item);
      }
      // 모든 슬롯 MAX 시 긴급 보너스 카드
      while (picked.length < 3) {
        picked.push({
          kind: "bonus",
          id: "heal_gold",
          data: { icon: "💎", color: "#facc15", name: { ko: "오버드라이브 보급", en: "Overdrive Supply" }, desc: { ko: "체력 35% 회복 + 120 코어 골드 즉시 획득", en: "Restore 35% HP + 120 Core Gold" } },
        });
      }
      return picked;
    }

    applyLevelChoice(choice) {
      if (choice.kind === "evo") {
        this.evolved[choice.id] = true;
        this.showBanner(`${NV.t("evoBanner")} ${NV.pick(choice.data.evoName)}`, "#facc15", 3.4);
        NV.SDK.happytime();
      } else if (choice.kind === "weapon") {
        this.weapons[choice.id] = (this.weapons[choice.id] || 0) + 1;
      } else if (choice.kind === "passive") {
        this.passives[choice.id] = (this.passives[choice.id] || 0) + 1;
        if (choice.id === "armor_core") {
          this.player.maxHp += 25;
          this.player.hp = Math.min(this.player.maxHp, this.player.hp + 25);
        }
      } else if (choice.kind === "bonus") {
        this.player.hp = Math.min(this.player.maxHp, this.player.hp + this.player.maxHp * 0.35);
        this.runGold += 120;
      }

      this.state = "playing";
      NV.SDK.gameplayStart();
      if (this.cb.onStateChange) this.cb.onStateChange("playing");
    }

    _updateEffects(dt) {
      for (let i = this.particles.length - 1; i >= 0; i--) {
        const pt = this.particles[i];
        pt.life -= dt;
        pt.x += pt.vx * dt;
        pt.y += pt.vy * dt;
        pt.vx *= 0.94;
        pt.vy *= 0.94;
        if (pt.life <= 0) this.particles.splice(i, 1);
      }
      for (let i = this.bolts.length - 1; i >= 0; i--) {
        this.bolts[i].life -= dt;
        if (this.bolts[i].life <= 0) this.bolts.splice(i, 1);
      }
      for (let i = this.wavesFx.length - 1; i >= 0; i--) {
        const w = this.wavesFx[i];
        w.life -= dt;
        w.r = w.maxR * (1 - w.life / w.maxLife);
        if (w.life <= 0) this.wavesFx.splice(i, 1);
      }
      for (let i = this.floatTexts.length - 1; i >= 0; i--) {
        const ft = this.floatTexts[i];
        ft.life -= dt;
        ft.y -= 38 * dt;
        if (ft.life <= 0) this.floatTexts.splice(i, 1);
      }
    }
  }

  NV.ARENA_RADIUS = ARENA_RADIUS;
  NV.GameEngine = GameEngine;
})(window.NV);

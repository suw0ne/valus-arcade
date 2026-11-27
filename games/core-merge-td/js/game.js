/**
 * 코어 머지 디펜스 (CORE MERGE TD) — 60fps 드래그 머지 × 타워 디펜스 엔진.
 * 5x3 전략 그리드, 4대 속성(펄스·빙결·폭격·번개) 1~5티어 진화, 5웨이브 보스전,
 * 프로시저럴 Web Audio SFX, 보상형 광고(보급·부활) 및 CrazyGames/Poki SDK 자동 연동.
 */
(function () {
  const I18N = {
    ko: {
      wave: "웨이브", summon: "포탑 소환", emp: "EMP 충격파", ready: "준비됨",
      supply: "티어2 보급", adFree: "광고 보상", kicker: "MERGE × TOWER DEFENSE",
      title: "코어 머지 디펜스",
      intro: "같은 속성·같은 등급의 포탑을 드래그해 합치면 강력한 전설 포탑으로 진화합니다!",
      start: "방어 작전 시작", defeat: "코어 방어 실패!",
      reviveAd: "광고 보고 코어 수복 + 계속하기 (1회)", retry: "처음부터 다시 도전",
      adSimDesc: "포털 배포 시 실제 보상형 광고가 재생됩니다.",
      boardFull: "빈 슬롯이 없습니다! 같은 포탑을 합쳐보세요",
      noGold: "코어 골드가 부족합니다",
      merged: "포탑 진화 성공!",
      bossWarn: "경고! 거대 보스 출현!",
      bossClear: "보스 격파! +120 골드 보너스",
    },
    en: {
      wave: "WAVE", summon: "SUMMON", emp: "EMP BLAST", ready: "READY",
      supply: "TIER 2 DROP", adFree: "WATCH AD", kicker: "MERGE × TOWER DEFENSE",
      title: "CORE MERGE TD",
      intro: "Drag matching turrets together to merge and evolve into legendary defenders!",
      start: "START DEFENSE", defeat: "CORE BREACHED!",
      reviveAd: "WATCH AD · REPAIR CORE (1x)", retry: "PLAY AGAIN",
      adSimDesc: "Real portal rewarded video plays on CrazyGames/Poki.",
      boardFull: "Grid full! Drag matching turrets to merge.",
      noGold: "Not enough Core Gold!",
      merged: "TURRET EVOLVED!",
      bossWarn: "WARNING! TITAN BOSS WAVE!",
      bossClear: "BOSS DEFEATED! +120 GOLD",
    },
  };

  let lang = localStorage.getItem("nv_lang") || "ko";
  const t = (k) => (I18N[lang] && I18N[lang][k]) || I18N.ko[k] || k;

  // 4대 속성 포탑 마스터 데이터
  const TURRET_TYPES = [
    { id: "pulse", icon: "⚡", color: "#38bdf8", dmg: 18, rate: 0.45, range: 210 },
    { id: "frost", icon: "❄️", color: "#2dd4bf", dmg: 13, rate: 0.65, range: 195, slow: 0.5 },
    { id: "mortar", icon: "💥", color: "#fb923c", dmg: 30, rate: 1.05, range: 235, splash: 68 },
    { id: "arc", icon: "🌩️", color: "#a78bfa", dmg: 22, rate: 0.78, range: 220, chain: 3 },
  ];

  // 경량 프로시저럴 사운드
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
    beep(freq, endFreq, dur, type = "triangle", vol = 0.06) {
      if (!this.on || !this.ctx || this.ctx.state !== "running") return;
      const now = this.ctx.currentTime;
      const o = this.ctx.createOscillator();
      const g = this.ctx.createGain();
      o.type = type;
      o.frequency.setValueAtTime(freq, now);
      o.frequency.exponentialRampToValueAtTime(Math.max(40, endFreq), now + dur);
      g.gain.setValueAtTime(vol, now);
      g.gain.exponentialRampToValueAtTime(0.001, now + dur);
      o.connect(g);
      g.connect(this.ctx.destination);
      o.start(now);
      o.stop(now + dur + 0.01);
    },
    merge(tier) {
      this.beep(440 + tier * 110, 880 + tier * 150, 0.18, "triangle", 0.11);
    },
  };

  // 포털 SDK 보상형 광고 래퍼
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
      if (left <= 0) {
        clearInterval(iv);
        modal.classList.add("hidden");
        onOk();
      }
    }, 100);
  }

  // 게임 상태 (가로 5x3 / 모바일 세로 3x5 자동 적응형 15슬롯 그리드)
  const TOTAL_SLOTS = 15;
  let COLS = 5;
  let ROWS = 3;
  const canvas = document.getElementById("td-canvas");
  const ctx = canvas.getContext("2d");

  function haptic(pattern) {
    try {
      if (navigator.vibrate) navigator.vibrate(pattern);
    } catch (_) {}
  }

  let W = 900, H = 560, dpr = 1;
  let gridRect = { x: 0, y: 0, cell: 72 };
  let pathPts = [];

  let state = "start"; // start | playing | gameover
  let speedMult = 1;
  let wave = 1;
  let hp = 20;
  let gold = 130;
  let summonCount = 0;
  let revived = false;
  let empCd = 0;
  let waveTimer = 1.5;
  let spawnQueue = [];
  let spawnInterval = 0;
  let kills = 0;

  // 포털 통합 아케이드 기록 연동 (로컬 저장소)
  function persistTdRecord() {
    try {
      const prev = JSON.parse(localStorage.getItem("nv_merge_td_save_v1") || "{}");
      const next = {
        bestWave: Math.max(prev.bestWave || 0, wave),
        bestKills: Math.max(prev.bestKills || 0, kills),
      };
      localStorage.setItem("nv_merge_td_save_v1", JSON.stringify(next));
    } catch (_) {}
  }

  let grid = []; // COLS * ROWS
  let enemies = [];
  let shots = [];
  let bolts = [];
  let fxs = [];
  let dragging = null; // { idx, x, y }
  let toastTimer = 0;

  function getSummonCost() {
    return 40 + summonCount * 10;
  }

  function showToast(msg) {
    const el = document.getElementById("toast-msg");
    el.textContent = msg;
    el.classList.remove("hidden");
    toastTimer = 2.0;
  }

  function computeLayout() {
    const rect = canvas.parentElement.getBoundingClientRect();
    W = Math.max(320, Math.floor(rect.width));
    H = Math.max(320, Math.floor(rect.height));
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = Math.floor(W * dpr);
    canvas.height = Math.floor(H * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    const isPortrait = H > W * 1.05;
    COLS = isPortrait ? 3 : 5;
    ROWS = isPortrait ? 5 : 3;

    const cell = Math.floor(
      isPortrait
        ? Math.min((W * 0.66) / COLS, (H * 0.66) / ROWS, 86)
        : Math.min((W * 0.68) / COLS, (H * 0.52) / ROWS, 92)
    );
    const gw = cell * COLS;
    const gh = cell * ROWS;
    gridRect = { x: Math.floor((W - gw) / 2), y: Math.floor((H - gh) / 2) + 8, cell };

    const pad = Math.max(36, Math.floor(cell * 0.62));
    const lx = gridRect.x - pad;
    const rx = gridRect.x + gw + pad;
    const ty = gridRect.y - pad;
    const by = gridRect.y + gh + pad;

    // 아레나 외곽을 감싸며 코어로 진입하는 경로
    pathPts = [
      { x: lx, y: by },
      { x: lx, y: ty },
      { x: rx, y: ty },
      { x: rx, y: by },
      { x: gridRect.x + gw / 2, y: by },
    ];
  }

  function cellCenter(idx) {
    const c = idx % COLS;
    const r = Math.floor(idx / COLS);
    return {
      x: gridRect.x + (c + 0.5) * gridRect.cell,
      y: gridRect.y + (r + 0.5) * gridRect.cell,
    };
  }

  function hitGridCell(px, py) {
    const c = Math.floor((px - gridRect.x) / gridRect.cell);
    const r = Math.floor((py - gridRect.y) / gridRect.cell);
    if (c >= 0 && c < COLS && r >= 0 && r < ROWS) return r * COLS + c;
    return -1;
  }

  function resetGame() {
    wave = 1;
    hp = 20;
    gold = 140;
    summonCount = 0;
    revived = false;
    empCd = 0;
    kills = 0;
    grid = Array(COLS * ROWS).fill(null);
    enemies = [];
    shots = [];
    bolts = [];
    fxs = [];
    spawnQueue = [];
    waveTimer = 1.0;

    // 초반 즉시 재미를 위해 티어1 포탑 2기 기본 배치
    grid[6] = { typeIdx: 0, tier: 1, cd: 0, scale: 1 };
    grid[8] = { typeIdx: 1, tier: 1, cd: 0, scale: 1 };
    queueWave(1);
    syncUI();
  }

  function queueWave(w) {
    const count = 8 + w * 3;
    const isBossWave = w % 5 === 0;
    spawnQueue = [];
    for (let i = 0; i < count; i++) {
      spawnQueue.push({ boss: false, fast: w >= 3 && i % 4 === 0 });
    }
    if (isBossWave) {
      spawnQueue.push({ boss: true, fast: false });
      showToast(t("bossWarn"));
      SFX.beep(260, 520, 0.3, "sawtooth", 0.1);
    }
    spawnInterval = Math.max(0.32, 0.95 - w * 0.03);
    waveTimer = 0.4;
  }

  function summonTurret(forcedTier = 1, free = false) {
    const empties = [];
    for (let i = 0; i < grid.length; i++) if (!grid[i]) empties.push(i);
    if (empties.length === 0) {
      showToast(t("boardFull"));
      return false;
    }
    const cost = getSummonCost();
    if (!free) {
      if (gold < cost) {
        showToast(t("noGold"));
        return false;
      }
      gold -= cost;
      summonCount++;
    }
    const slot = empties[Math.floor(Math.random() * empties.length)];
    const typeIdx = Math.floor(Math.random() * TURRET_TYPES.length);
    grid[slot] = { typeIdx, tier: forcedTier, cd: 0, scale: 1.45 };
    const pt = cellCenter(slot);
    fxs.push({ x: pt.x, y: pt.y, r: 10, maxR: 48, color: TURRET_TYPES[typeIdx].color, life: 0.28, maxLife: 0.28 });
    SFX.beep(360, 620, 0.1, "triangle", 0.08);
    syncUI();
    return true;
  }

  function triggerEmp() {
    if (empCd > 0 || state !== "playing") return;
    empCd = 16;
    const cx = W / 2, cy = H / 2;
    fxs.push({ x: cx, y: cy, r: 20, maxR: Math.max(W, H) * 0.65, color: "#38bdf8", life: 0.45, maxLife: 0.45 });
    SFX.beep(680, 120, 0.32, "sawtooth", 0.12);
    haptic([25, 25, 45]);
    for (const e of enemies) {
      e.hp -= e.boss ? e.maxHp * 0.15 : e.maxHp * 0.48 + 30;
      e.slow = Math.max(e.slow, 2.5);
    }
    syncUI();
  }

  function update(dt) {
    if (toastTimer > 0) {
      toastTimer -= dt;
      if (toastTimer <= 0) document.getElementById("toast-msg").classList.add("hidden");
    }
    if (state !== "playing") return;

    dt = Math.min(dt, 0.05) * speedMult;
    if (empCd > 0) empCd = Math.max(0, empCd - dt);

    // 적 스폰 & 웨이브 진행
    if (spawnQueue.length > 0) {
      waveTimer -= dt;
      if (waveTimer <= 0) {
        const spec = spawnQueue.shift();
        const baseHp = (34 + wave * 18 + Math.pow(wave, 1.55) * 6);
        const maxHp = Math.round(spec.boss ? baseHp * 11 : spec.fast ? baseHp * 0.72 : baseHp);
        enemies.push({
          x: pathPts[0].x,
          y: pathPts[0].y,
          seg: 0,
          hp: maxHp,
          maxHp,
          speed: spec.boss ? 48 : spec.fast ? 115 : 74 + Math.min(45, wave * 2.5),
          r: spec.boss ? 24 : spec.fast ? 10 : 13,
          color: spec.boss ? "#ef4444" : spec.fast ? "#facc15" : "#f43f5e",
          boss: spec.boss,
          slow: 0,
          gold: spec.boss ? 120 : 8 + Math.floor(wave * 1.4),
        });
        waveTimer = spawnInterval;
      }
    } else if (enemies.length === 0) {
      wave++;
      persistTdRecord();
      gold += 35 + wave * 5;
      queueWave(wave);
      SFX.beep(520, 880, 0.2, "triangle", 0.08);
    }

    // 포탑 공격
    for (let i = 0; i < grid.length; i++) {
      const tu = grid[i];
      if (!tu) continue;
      if (tu.scale > 1) tu.scale = Math.max(1, tu.scale - dt * 2.5);
      tu.cd -= dt;
      if (tu.cd > 0) continue;

      const def = TURRET_TYPES[tu.typeIdx];
      const pos = cellCenter(i);
      const tierMult = Math.pow(2.15, tu.tier - 1);
      const range = def.range * (1 + (tu.tier - 1) * 0.09);

      // 가장 앞선(경로 진행도 높은) 사거리 내 적 탐색
      let target = null;
      let bestScore = -1;
      for (const e of enemies) {
        if (e.hp <= 0) continue;
        const d = Math.hypot(e.x - pos.x, e.y - pos.y);
        if (d <= range) {
          const score = e.seg * 10000 - Math.hypot(pathPts[e.seg + 1].x - e.x, pathPts[e.seg + 1].y - e.y);
          if (score > bestScore) {
            bestScore = score;
            target = e;
          }
        }
      }
      if (!target) continue;

      const dmg = Math.round(def.dmg * tierMult);
      tu.cd = def.rate / (1 + (tu.tier - 1) * 0.14);

      if (def.id === "arc") {
        let curr = target;
        let px = pos.x, py = pos.y;
        const seen = new Set();
        const chains = def.chain + tu.tier - 1;
        for (let c = 0; c < chains && curr; c++) {
          seen.add(curr);
          bolts.push({ x1: px, y1: py, x2: curr.x, y2: curr.y, color: def.color, life: 0.16, maxLife: 0.16 });
          curr.hp -= dmg;
          px = curr.x; py = curr.y;
          curr = enemies.find((cand) => !seen.has(cand) && cand.hp > 0 && Math.hypot(cand.x - px, cand.y - py) < 155);
        }
        SFX.beep(980, 420, 0.06, "sawtooth", 0.035);
      } else {
        shots.push({
          x: pos.x, y: pos.y, target, dmg, color: def.color,
          slow: def.slow || 0, splash: def.splash ? def.splash * (1 + (tu.tier - 1) * 0.12) : 0,
          speed: 560,
        });
        SFX.beep(520, 260, 0.05, "triangle", 0.03);
      }
    }

    // 탄환 이동
    for (let i = shots.length - 1; i >= 0; i--) {
      const s = shots[i];
      if (!s.target || s.target.hp <= 0) {
        shots.splice(i, 1);
        continue;
      }
      const dx = s.target.x - s.x;
      const dy = s.target.y - s.y;
      const d = Math.hypot(dx, dy);
      if (d < 14) {
        if (s.splash > 0) {
          fxs.push({ x: s.target.x, y: s.target.y, r: 8, maxR: s.splash, color: s.color, life: 0.22, maxLife: 0.22 });
          for (const e of enemies) {
            if (Math.hypot(e.x - s.target.x, e.y - s.target.y) <= s.splash) e.hp -= s.dmg;
          }
        } else {
          s.target.hp -= s.dmg;
          if (s.slow) s.target.slow = Math.max(s.target.slow, 2.0);
        }
        shots.splice(i, 1);
      } else {
        s.x += (dx / d) * s.speed * dt;
        s.y += (dy / d) * s.speed * dt;
      }
    }

    // 적 이동 및 사망 처리
    let activeBoss = null;
    for (let i = enemies.length - 1; i >= 0; i--) {
      const e = enemies[i];
      if (e.hp <= 0) {
        gold += e.gold;
        kills++;
        fxs.push({ x: e.x, y: e.y, r: 4, maxR: e.boss ? 65 : 24, color: e.color, life: 0.24, maxLife: 0.24 });
        if (e.boss) {
          showToast(t("bossClear"));
          SFX.beep(520, 1040, 0.28, "triangle", 0.12);
        }
        enemies.splice(i, 1);
        continue;
      }
      if (e.boss) activeBoss = e;
      if (e.slow > 0) e.slow -= dt;
      const spd = e.speed * (e.slow > 0 ? 0.5 : 1);
      const nextPt = pathPts[e.seg + 1];
      const dx = nextPt.x - e.x;
      const dy = nextPt.y - e.y;
      const d = Math.hypot(dx, dy);
      if (d <= spd * dt) {
        e.x = nextPt.x;
        e.y = nextPt.y;
        e.seg++;
        if (e.seg >= pathPts.length - 1) {
          hp = Math.max(0, hp - (e.boss ? 5 : 1));
          enemies.splice(i, 1);
          SFX.beep(150, 60, 0.18, "sawtooth", 0.12);
          if (hp <= 0) {
            state = "gameover";
            persistTdRecord();
            document.getElementById("ui-final-stats").textContent =
              `${t("wave")} ${wave} · 💀 ${kills}`;
            document.getElementById("btn-revive").disabled = revived;
            document.getElementById("gameover-overlay").classList.remove("hidden");
            if (window.CrazyGames?.SDK?.game) window.CrazyGames.SDK.game.gameplayStop();
          }
        }
      } else {
        e.x += (dx / d) * spd * dt;
        e.y += (dy / d) * spd * dt;
      }
    }

    // 이펙트 업데이트
    for (let i = fxs.length - 1; i >= 0; i--) {
      fxs[i].life -= dt;
      fxs[i].r = fxs[i].maxR * (1 - fxs[i].life / fxs[i].maxLife);
      if (fxs[i].life <= 0) fxs.splice(i, 1);
    }
    for (let i = bolts.length - 1; i >= 0; i--) {
      bolts[i].life -= dt;
      if (bolts[i].life <= 0) bolts.splice(i, 1);
    }

    // 보스 바 동기화
    const bossEl = document.getElementById("boss-bar");
    if (activeBoss) {
      bossEl.classList.remove("hidden");
      const pct = Math.max(0, Math.ceil((activeBoss.hp / activeBoss.maxHp) * 100));
      document.getElementById("boss-pct").textContent = `${pct}%`;
      document.getElementById("boss-fill").style.width = `${pct}%`;
    } else {
      bossEl.classList.add("hidden");
    }

    syncUI();
  }

  function render() {
    ctx.fillStyle = "#070b18";
    ctx.fillRect(0, 0, W, H);

    // 경로 렌더링
    ctx.save();
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.strokeStyle = "#14203b";
    ctx.lineWidth = 34;
    ctx.beginPath();
    pathPts.forEach((p, idx) => (idx === 0 ? ctx.moveTo(p.x, p.y) : ctx.lineTo(p.x, p.y)));
    ctx.stroke();

    ctx.strokeStyle = "rgba(56,189,248,0.28)";
    ctx.lineWidth = 3;
    ctx.setLineDash([12, 10]);
    ctx.stroke();
    ctx.restore();

    // 최종 방어 코어
    const core = pathPts[pathPts.length - 1];
    ctx.save();
    ctx.fillStyle = "#2563eb";
    ctx.shadowBlur = 20;
    ctx.shadowColor = "#38bdf8";
    ctx.beginPath();
    ctx.arc(core.x, core.y, 22, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = "#fff";
    ctx.lineWidth = 2.5;
    ctx.stroke();
    ctx.fillStyle = "#fff";
    ctx.font = "900 11px sans-serif";
    ctx.textAlign = "center";
    ctx.fillText("CORE", core.x, core.y + 4);
    ctx.restore();

    // 5x3 전략 그리드 & 포탑
    const dragSrc = dragging ? grid[dragging.idx] : null;
    for (let i = 0; i < COLS * ROWS; i++) {
      const c = i % COLS;
      const r = Math.floor(i / COLS);
      const x = gridRect.x + c * gridRect.cell;
      const y = gridRect.y + r * gridRect.cell;
      const pad = 5;
      const tu = grid[i];
      const canMerge =
        dragSrc && dragging.idx !== i && tu && tu.typeIdx === dragSrc.typeIdx && tu.tier === dragSrc.tier && tu.tier < 5;

      ctx.fillStyle = canMerge ? "rgba(34,197,94,0.24)" : "rgba(18,28,52,0.88)";
      ctx.strokeStyle = canMerge ? "#4ade80" : "rgba(56,189,248,0.24)";
      ctx.lineWidth = canMerge ? 2.5 : 1.2;
      ctx.beginPath();
      ctx.roundRect(x + pad, y + pad, gridRect.cell - pad * 2, gridRect.cell - pad * 2, 12);
      ctx.fill();
      ctx.stroke();

      if (tu && (!dragging || dragging.idx !== i)) {
        drawTurret(x + gridRect.cell / 2, y + gridRect.cell / 2, tu, gridRect.cell * 0.34);
      }
    }

    // 적
    for (const e of enemies) {
      ctx.save();
      ctx.translate(e.x, e.y);
      ctx.fillStyle = e.slow > 0 ? "#67e8f9" : e.color;
      ctx.shadowBlur = e.boss ? 20 : 10;
      ctx.shadowColor = e.color;
      ctx.beginPath();
      ctx.arc(0, 0, e.r, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = "#fff";
      ctx.lineWidth = e.boss ? 3 : 1.4;
      ctx.stroke();

      const bw = e.r * 2.2;
      ctx.shadowBlur = 0;
      ctx.fillStyle = "#020617";
      ctx.fillRect(-bw / 2, -e.r - 9, bw, 4);
      ctx.fillStyle = "#4ade80";
      ctx.fillRect(-bw / 2, -e.r - 9, bw * Math.max(0, e.hp / e.maxHp), 4);
      ctx.restore();
    }

    // 탄환 & 번개 & 파동
    for (const s of shots) {
      ctx.save();
      ctx.fillStyle = s.color;
      ctx.shadowBlur = 10;
      ctx.shadowColor = s.color;
      ctx.beginPath();
      ctx.arc(s.x, s.y, 5, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }
    for (const b of bolts) {
      ctx.save();
      ctx.strokeStyle = b.color;
      ctx.lineWidth = 3;
      ctx.globalAlpha = b.life / b.maxLife;
      ctx.beginPath();
      ctx.moveTo(b.x1, b.y1);
      ctx.lineTo((b.x1 + b.x2) / 2 + (Math.random() - 0.5) * 18, (b.y1 + b.y2) / 2 + (Math.random() - 0.5) * 18);
      ctx.lineTo(b.x2, b.y2);
      ctx.stroke();
      ctx.restore();
    }
    for (const fx of fxs) {
      ctx.save();
      ctx.strokeStyle = fx.color;
      ctx.globalAlpha = Math.max(0, fx.life / fx.maxLife);
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(fx.x, fx.y, fx.r, 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();
    }

    // 드래그 중인 포탑 최상단 렌더링
    if (dragging && grid[dragging.idx]) {
      drawTurret(dragging.x, dragging.y, grid[dragging.idx], gridRect.cell * 0.38);
    }
  }

  function drawTurret(cx, cy, tu, r) {
    const def = TURRET_TYPES[tu.typeIdx];
    ctx.save();
    ctx.translate(cx, cy);
    ctx.scale(tu.scale, tu.scale);
    ctx.fillStyle = def.color;
    ctx.shadowBlur = 12 + tu.tier * 3;
    ctx.shadowColor = def.color;
    ctx.beginPath();
    ctx.arc(0, 0, r, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = tu.tier >= 4 ? "#facc15" : "#ffffff";
    ctx.lineWidth = tu.tier >= 4 ? 3 : 2;
    ctx.stroke();

    ctx.shadowBlur = 0;
    ctx.fillStyle = "#020617";
    ctx.font = `900 ${Math.max(14, Math.floor(r * 0.9))}px sans-serif`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(def.icon, 0, -2);

    ctx.fillStyle = "#fff";
    ctx.font = "900 11px sans-serif";
    ctx.fillText(tu.tier >= 5 ? "★MAX" : `T${tu.tier}`, 0, r + 9);
    ctx.restore();
  }

  function syncUI() {
    document.getElementById("ui-wave").textContent = wave;
    document.getElementById("ui-hp").textContent = hp;
    document.getElementById("ui-gold").textContent = gold.toLocaleString();
    document.getElementById("ui-cost").textContent = `◆ ${getSummonCost()}`;
    const empBtn = document.getElementById("btn-emp");
    empBtn.disabled = empCd > 0;
    document.getElementById("ui-emp-cd").textContent = empCd > 0 ? `${Math.ceil(empCd)}s` : t("ready");
  }

  function applyI18n() {
    document.documentElement.lang = lang;
    document.querySelectorAll("[data-i18n]").forEach((el) => {
      el.textContent = t(el.getAttribute("data-i18n"));
    });
    syncUI();
  }

  // 드래그 앤 머지 입력
  canvas.addEventListener("pointerdown", (e) => {
    if (state !== "playing") return;
    SFX.unlock();
    const rect = canvas.getBoundingClientRect();
    const px = e.clientX - rect.left;
    const py = e.clientY - rect.top;
    const idx = hitGridCell(px, py);
    if (idx !== -1 && grid[idx]) {
      dragging = { idx, x: px, y: py };
    }
  });
  window.addEventListener("pointermove", (e) => {
    if (!dragging) return;
    const rect = canvas.getBoundingClientRect();
    dragging.x = e.clientX - rect.left;
    dragging.y = e.clientY - rect.top;
  });
  window.addEventListener("pointerup", (e) => {
    if (!dragging) return;
    const rect = canvas.getBoundingClientRect();
    const px = e.clientX - rect.left;
    const py = e.clientY - rect.top;
    const targetIdx = hitGridCell(px, py);
    const srcIdx = dragging.idx;
    if (targetIdx !== -1 && targetIdx !== srcIdx) {
      const a = grid[srcIdx];
      const b = grid[targetIdx];
      if (!b) {
        grid[targetIdx] = a;
        grid[srcIdx] = null;
      } else if (a.typeIdx === b.typeIdx && a.tier === b.tier && a.tier < 5) {
        grid[targetIdx] = { typeIdx: b.typeIdx, tier: b.tier + 1, cd: 0, scale: 1.55 };
        grid[srcIdx] = null;
        const pt = cellCenter(targetIdx);
        fxs.push({ x: pt.x, y: pt.y, r: 10, maxR: 72, color: "#facc15", life: 0.35, maxLife: 0.35 });
        SFX.merge(b.tier + 1);
        haptic(22);
        showToast(`${t("merged")} T${b.tier + 1}`);
      } else {
        // 위치 교환
        grid[targetIdx] = a;
        grid[srcIdx] = b;
      }
    }
    dragging = null;
  });

  // 버튼 이벤트
  document.getElementById("btn-start").onclick = () => {
    SFX.unlock();
    document.getElementById("start-overlay").classList.add("hidden");
    resetGame();
    state = "playing";
    if (window.CrazyGames?.SDK?.game) window.CrazyGames.SDK.game.gameplayStart();
  };
  document.getElementById("btn-summon").onclick = () => { SFX.unlock(); summonTurret(1, false); };
  document.getElementById("btn-emp").onclick = () => { SFX.unlock(); triggerEmp(); };
  document.getElementById("btn-supply").onclick = () => {
    SFX.unlock();
    showRewarded(() => summonTurret(2, true));
  };
  document.getElementById("btn-speed").onclick = (e) => {
    speedMult = speedMult === 1 ? 2 : 1;
    e.currentTarget.textContent = `${speedMult}x`;
    e.currentTarget.classList.toggle("active", speedMult === 2);
  };
  document.getElementById("btn-sound").onclick = (e) => {
    SFX.on = !SFX.on;
    e.currentTarget.textContent = SFX.on ? "🔊" : "🔇";
  };
  document.getElementById("btn-lang").onclick = () => {
    lang = lang === "ko" ? "en" : "ko";
    localStorage.setItem("nv_lang", lang);
    applyI18n();
  };
  document.getElementById("btn-revive").onclick = () => {
    if (revived) return;
    showRewarded(() => {
      revived = true;
      hp = 15;
      enemies = [];
      document.getElementById("gameover-overlay").classList.add("hidden");
      state = "playing";
      syncUI();
    });
  };
  document.getElementById("btn-retry").onclick = () => {
    document.getElementById("gameover-overlay").classList.add("hidden");
    resetGame();
    state = "playing";
  };

  window.addEventListener("resize", computeLayout);
  computeLayout();
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

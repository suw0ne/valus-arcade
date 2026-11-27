/**
 * 네온 브레이커: 로그라이트 (NEON BREAKER) — 60fps 탄성 물리 벽돌깨기 × 로그라이트.
 * 드래그 조준 발사, 50+ 멀티볼 연쇄 타격, 레이저 행 파괴·폭탄 연쇄 블록,
 * 3스테이지마다 3택 로그라이트 진화 카드, 프로시저럴 콤보 음계 SFX, 모바일 한 손 조작·햅틱 지원.
 */
(function () {
  const SAVE_KEY = "nv_breaker_save_v1";
  const PENTATONIC = [392, 440, 523.25, 587.33, 659.25, 783.99, 880, 1046.5];

  const I18N = {
    ko: {
      wave: "스테이지", recall: "⬇ 즉시 회수", kicker: "ROGUELITE BRICK BREAKER",
      title: "네온 브레이커",
      intro: "드래그로 조준해 수십 개의 네온 볼을 발사하세요! 매 3스테이지마다 로그라이트 스킬로 볼을 무한 진화시킬 수 있습니다.",
      bestWave: "최고 스테이지", bestScore: "최고 점수", start: "▶ 게임 시작",
      perkTitle: "볼 시스템 진화 선택", rerollAd: "광고 보고 카드 리롤",
      gameOver: "방어선 돌파됨!", reviveAd: "광고 보고 하단 2줄 파괴 + 부활 (1회)",
      retry: "다시 도전하기", adDesc: "포털 배포 시 실제 보상형 광고가 재생됩니다.",
      aimHint: "드래그해서 조준 후 손을 떼면 발사!",
    },
    en: {
      wave: "STAGE", recall: "⬇ RECALL", kicker: "ROGUELITE BRICK BREAKER",
      title: "NEON BREAKER",
      intro: "Drag to aim and unleash dozens of plasma balls! Evolve with roguelite perks every 3 stages.",
      bestWave: "BEST STAGE", bestScore: "BEST SCORE", start: "▶ PLAY NOW",
      perkTitle: "CHOOSE BALL EVOLUTION", rerollAd: "WATCH AD · REROLL",
      gameOver: "DEFENSE BREACHED!", reviveAd: "WATCH AD · CLEAR 2 ROWS & REVIVE",
      retry: "PLAY AGAIN", adDesc: "Real portal rewarded video plays on CrazyGames/Poki.",
      aimHint: "Drag to aim, release to fire!",
    },
  };

  const PERKS = [
    { id: "multiball", icon: "⚪", name: { ko: "멀티볼 +4", en: "Multiball +4" }, desc: { ko: "발사 볼 개수가 즉시 4개 증가합니다.", en: "+4 extra plasma balls immediately." } },
    { id: "power", icon: "🔥", name: { ko: "파워 코어 +1", en: "Power Core +1" }, desc: { ko: "모든 볼의 기본 타격 피해 +1 증가.", en: "+1 base hit damage to all balls." } },
    { id: "crit", icon: "🎯", name: { ko: "치명타 렌즈", en: "Crit Optics" }, desc: { ko: "22% 확률로 2배 치명타 폭발 타격.", en: "+22% chance to deal 2x critical hit." } },
    { id: "blast", icon: "💥", name: { ko: "연쇄 파편", en: "Blast Shards" }, desc: { ko: "블록 파괴 시 주변 블록에 광역 충격 피해.", en: "Destroyed bricks splash damage nearby." } },
    { id: "laser", icon: "⚡", name: { ko: "행 레이저 보급", en: "Row Laser Surge" }, desc: { ko: "다음 웨이브부터 가로 레이저 블록 출현율 대폭 증가.", en: "Spawns more horizontal laser-beam blocks." } },
  ];

  let lang = localStorage.getItem("nv_lang") || "ko";
  const t = (k) => (I18N[lang] && I18N[lang][k]) || I18N.ko[k] || k;
  const pick = (o) => (typeof o === "string" ? o : (o && (o[lang] || o.ko)) || "");

  function haptic(p) { try { if (navigator.vibrate) navigator.vibrate(p); } catch (_) {} }

  const SFX = {
    ctx: null, on: true, step: 0, lastAt: 0,
    unlock() {
      if (!this.ctx) {
        const AC = window.AudioContext || window.webkitAudioContext;
        if (AC) this.ctx = new AC();
      }
      if (this.ctx && this.ctx.state === "suspended") this.ctx.resume().catch(() => {});
    },
    hit(isCrit = false) {
      if (!this.on || !this.ctx || this.ctx.state !== "running") return;
      const now = this.ctx.currentTime;
      if (now - this.lastAt < 0.03) return;
      this.step = now - this.lastAt < 0.25 ? Math.min(PENTATONIC.length - 1, this.step + 1) : 0;
      this.lastAt = now;
      const o = this.ctx.createOscillator();
      const g = this.ctx.createGain();
      o.type = isCrit ? "triangle" : "sine";
      o.frequency.setValueAtTime(PENTATONIC[this.step] * (isCrit ? 1.25 : 1), now);
      g.gain.setValueAtTime(isCrit ? 0.07 : 0.045, now);
      g.gain.exponentialRampToValueAtTime(0.001, now + 0.075);
      o.connect(g); g.connect(this.ctx.destination);
      o.start(now); o.stop(now + 0.08);
    },
    boom() {
      if (!this.on || !this.ctx || this.ctx.state !== "running") return;
      const now = this.ctx.currentTime;
      const o = this.ctx.createOscillator();
      const g = this.ctx.createGain();
      o.type = "sawtooth";
      o.frequency.setValueAtTime(240, now);
      o.frequency.exponentialRampToValueAtTime(55, now + 0.16);
      g.gain.setValueAtTime(0.09, now);
      g.gain.exponentialRampToValueAtTime(0.001, now + 0.17);
      o.connect(g); g.connect(this.ctx.destination);
      o.start(now); o.stop(now + 0.18);
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

  function loadSave() {
    try {
      const p = JSON.parse(localStorage.getItem(SAVE_KEY) || "{}");
      return { bestWave: p.bestWave || 0, bestScore: p.bestScore || 0 };
    } catch (_) { return { bestWave: 0, bestScore: 0 }; }
  }
  let save = loadSave();
  function persist() { try { localStorage.setItem(SAVE_KEY, JSON.stringify(save)); } catch (_) {} }

  const canvas = document.getElementById("brk-canvas");
  const ctx = canvas.getContext("2d");
  const COLS = 7;
  const DANGER_ROWS = 8;

  let W = 600, H = 640, dpr = 1;
  let board = { x: 0, y: 12, w: 420, h: 560, cellW: 60, cellH: 48 };

  let state = "start"; // start | aim | shooting | perk | gameover
  let wave = 1;
  let score = 0;
  let ballCount = 6;
  let ballDmg = 1;
  let critRate = 0.08;
  let blastLv = 0;
  let laserBonus = 0;
  let speedMult = 1;
  let revived = false;
  let rerolled = false;

  let launchX = 300;
  let nextLaunchX = null;
  let aimAngle = -Math.PI / 2;
  let aiming = false;
  let activePointerId = null;
  let shootQueue = 0;
  let shootDelay = 0;
  let turnCombo = 0;

  let bricks = []; // { col, row, hp, maxHp, kind: 'normal'|'bomb'|'laser'|'plus' }
  let balls = [];
  let particles = [];
  let beams = [];
  let shake = 0;

  function resize() {
    const rect = canvas.parentElement.getBoundingClientRect();
    W = Math.max(320, Math.floor(rect.width));
    H = Math.max(360, Math.floor(rect.height));
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = Math.floor(W * dpr);
    canvas.height = Math.floor(H * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    const bw = Math.min(W - 20, Math.floor((H - 28) * 0.78), 540);
    const bh = H - 24;
    const cellW = bw / COLS;
    const cellH = Math.min(54, Math.floor((bh - 58) / (DANGER_ROWS + 1)));
    board = { x: Math.floor((W - bw) / 2), y: 12, w: bw, h: bh, cellW, cellH };
    if (launchX < board.x + 20 || launchX > board.x + board.w - 20) launchX = board.x + board.w / 2;
  }

  function brickRect(b) {
    const pad = 4;
    return {
      x: board.x + b.col * board.cellW + pad,
      y: board.y + b.row * board.cellH + pad,
      w: board.cellW - pad * 2,
      h: board.cellH - pad * 2,
    };
  }

  function spawnRow() {
    // 기존 블록 1행 하강
    for (const b of bricks) b.row++;
    // 플러스 볼 캡슐 1개 보장
    const cols = Array.from({ length: COLS }, (_, i) => i).sort(() => Math.random() - 0.5);
    const plusCol = cols.pop();
    bricks.push({ col: plusCol, row: 0, hp: 1, maxHp: 1, kind: "plus" });

    const blockCount = Math.min(COLS - 1, 3 + Math.floor(Math.random() * 3));
    const baseHp = Math.max(2, Math.round(wave * (1.6 + ballDmg * 0.35)));
    for (let i = 0; i < blockCount && cols.length > 0; i++) {
      const c = cols.pop();
      const r = Math.random();
      let kind = "normal";
      if (r < 0.09 + laserBonus * 0.05) kind = "laser";
      else if (r < 0.17) kind = "bomb";
      const hp = kind === "normal" ? Math.round(baseHp * (0.85 + Math.random() * 0.5)) : Math.max(2, Math.round(baseHp * 0.7));
      bricks.push({ col: c, row: 0, hp, maxHp: hp, kind });
    }
  }

  function resetGame() {
    wave = 1;
    score = 0;
    ballCount = 6;
    ballDmg = 1;
    critRate = 0.08;
    blastLv = 0;
    laserBonus = 0;
    revived = false;
    bricks = [];
    balls = [];
    particles = [];
    beams = [];
    launchX = board.x + board.w / 2;
    spawnRow();
    spawnRow();
    state = "aim";
    syncUI();
  }

  function fireVolley() {
    if (state !== "aim") return;
    state = "shooting";
    shootQueue = ballCount;
    shootDelay = 0;
    nextLaunchX = null;
    turnCombo = 0;
    document.getElementById("btn-recall").classList.remove("hidden");
  }

  function recallBalls() {
    if (state !== "shooting") return;
    shootQueue = 0;
    balls = [];
    endTurn();
  }

  function endTurn() {
    document.getElementById("btn-recall").classList.add("hidden");
    if (nextLaunchX !== null) launchX = Math.max(board.x + 18, Math.min(board.x + board.w - 18, nextLaunchX));
    wave++;
    if (wave > save.bestWave) save.bestWave = wave;
    if (score > save.bestScore) save.bestScore = score;
    persist();

    spawnRow();
    // 위험선 도달 체크
    const danger = bricks.some((b) => b.kind !== "plus" && b.row >= DANGER_ROWS);
    if (danger) {
      state = "gameover";
      document.getElementById("ui-final").textContent = `${t("wave")} ${wave} · ★ ${score.toLocaleString()}`;
      document.getElementById("btn-revive").disabled = revived;
      document.getElementById("gameover-overlay").classList.remove("hidden");
      if (window.CrazyGames?.SDK?.game) window.CrazyGames.SDK.game.gameplayStop();
      syncUI();
      return;
    }

    // 매 3스테이지마다 로그라이트 강화 카드 선택
    if (wave % 3 === 1 && wave > 1) {
      openPerkModal();
    } else {
      state = "aim";
    }
    syncUI();
  }

  function openPerkModal() {
    state = "perk";
    rerolled = false;
    renderPerks();
    document.getElementById("perk-overlay").classList.remove("hidden");
  }

  function renderPerks() {
    const picks = [...PERKS].sort(() => Math.random() - 0.5).slice(0, 3);
    const grid = document.getElementById("perk-grid");
    grid.innerHTML = "";
    picks.forEach((pk) => {
      const btn = document.createElement("button");
      btn.className = "perk-card";
      btn.innerHTML = `<span class="perk-ico">${pk.icon}</span><strong class="perk-name">${pick(pk.name)}</strong><span class="perk-desc">${pick(pk.desc)}</span>`;
      btn.onclick = () => {
        if (pk.id === "multiball") ballCount += 4;
        else if (pk.id === "power") ballDmg += 1;
        else if (pk.id === "crit") critRate = Math.min(0.75, critRate + 0.22);
        else if (pk.id === "blast") blastLv += 1;
        else if (pk.id === "laser") laserBonus += 1;
        document.getElementById("perk-overlay").classList.add("hidden");
        state = "aim";
        syncUI();
      };
      grid.appendChild(btn);
    });
    document.getElementById("btn-perk-reroll").disabled = rerolled;
  }

  function damageBrick(b, rawDmg) {
    const isCrit = Math.random() < critRate;
    const dmg = isCrit ? rawDmg * 2 : rawDmg;
    b.hp -= dmg;
    score += dmg * 10;
    turnCombo++;
    SFX.hit(isCrit);

    if (b.hp <= 0) {
      const r = brickRect(b);
      const cx = r.x + r.w / 2;
      const cy = r.y + r.h / 2;
      for (let k = 0; k < 8 && particles.length < 160; k++) {
        const a = Math.random() * Math.PI * 2;
        particles.push({ x: cx, y: cy, vx: Math.cos(a) * 140, vy: Math.sin(a) * 140, r: 3.5, color: brickColor(b), life: 0.3, maxLife: 0.3 });
      }
      if (b.kind === "bomb") {
        shake = 9; SFX.boom(); haptic(28);
        for (const other of bricks) {
          if (other !== b && other.hp > 0 && other.kind !== "plus" && Math.abs(other.col - b.col) <= 1 && Math.abs(other.row - b.row) <= 1) {
            other.hp -= Math.max(3, ballDmg * 4);
          }
        }
      } else if (b.kind === "laser") {
        beams.push({ y: cy, life: 0.24, maxLife: 0.24 });
        SFX.boom();
        for (const other of bricks) {
          if (other !== b && other.hp > 0 && other.kind !== "plus" && other.row === b.row) {
            other.hp -= Math.max(3, ballDmg * 3);
          }
        }
      } else if (blastLv > 0) {
        for (const other of bricks) {
          if (other !== b && other.hp > 0 && other.kind !== "plus" && Math.abs(other.col - b.col) + Math.abs(other.row - b.row) === 1) {
            other.hp -= blastLv;
          }
        }
      }
    }
  }

  function brickColor(b) {
    if (b.kind === "bomb") return "#fb923c";
    if (b.kind === "laser") return "#38bdf8";
    if (b.kind === "plus") return "#4ade80";
    const ratio = b.hp / Math.max(1, b.maxHp);
    if (ratio > 0.66) return "#a78bfa";
    if (ratio > 0.33) return "#ec4899";
    return "#f43f5e";
  }

  function update(dt) {
    dt = Math.min(dt, 0.04) * speedMult;
    shake = Math.max(0, shake - dt * 28);

    for (let i = particles.length - 1; i >= 0; i--) {
      const p = particles[i];
      p.life -= dt; p.x += p.vx * dt; p.y += p.vy * dt;
      if (p.life <= 0) particles.splice(i, 1);
    }
    for (let i = beams.length - 1; i >= 0; i--) {
      beams[i].life -= dt;
      if (beams[i].life <= 0) beams.splice(i, 1);
    }

    if (state !== "shooting") return;

    const launchY = board.y + board.h - 22;
    if (shootQueue > 0) {
      shootDelay -= dt;
      if (shootDelay <= 0) {
        const spd = 680;
        balls.push({ x: launchX, y: launchY, vx: Math.cos(aimAngle) * spd, vy: Math.sin(aimAngle) * spd, r: 6.5 });
        shootQueue--;
        shootDelay = 0.055;
      }
    }

    // 서브스텝 이동으로 고속 관통 방지
    const subSteps = 2;
    const subDt = dt / subSteps;
    for (let s = 0; s < subSteps; s++) {
      for (let i = balls.length - 1; i >= 0; i--) {
        const bl = balls[i];
        bl.x += bl.vx * subDt;
        bl.y += bl.vy * subDt;

        // 좌우·상단 벽 반사
        if (bl.x - bl.r < board.x) { bl.x = board.x + bl.r; bl.vx = Math.abs(bl.vx); }
        if (bl.x + bl.r > board.x + board.w) { bl.x = board.x + board.w - bl.r; bl.vx = -Math.abs(bl.vx); }
        if (bl.y - bl.r < board.y) { bl.y = board.y + bl.r; bl.vy = Math.abs(bl.vy); }
        // 수평 무한 바운스 방지
        if (Math.abs(bl.vy) < 45) bl.vy = bl.vy >= 0 ? 55 : -55;

        // 바닥 귀환
        if (bl.y > launchY + 12) {
          if (nextLaunchX === null) nextLaunchX = bl.x;
          balls.splice(i, 1);
          continue;
        }

        // 블록 충돌
        for (let j = bricks.length - 1; j >= 0; j--) {
          const b = bricks[j];
          if (b.hp <= 0) continue;
          const r = brickRect(b);
          if (b.kind === "plus") {
            const cx = r.x + r.w / 2, cy = r.y + r.h / 2;
            if (Math.hypot(bl.x - cx, bl.y - cy) < bl.r + 14) {
              ballCount++;
              b.hp = 0;
              SFX.hit(true);
            }
            continue;
          }
          const nearX = Math.max(r.x, Math.min(bl.x, r.x + r.w));
          const nearY = Math.max(r.y, Math.min(bl.y, r.y + r.h));
          const dx = bl.x - nearX, dy = bl.y - nearY;
          if (dx * dx + dy * dy <= bl.r * bl.r) {
            if (Math.abs(dx) > Math.abs(dy)) bl.vx = -bl.vx;
            else bl.vy = -bl.vy;
            damageBrick(b, ballDmg);
            break;
          }
        }
      }
    }

    bricks = bricks.filter((b) => b.hp > 0);

    const toast = document.getElementById("combo-toast");
    if (turnCombo >= 10) {
      toast.classList.remove("hidden");
      toast.textContent = `🔥 ${turnCombo} HIT COMBO!`;
    } else {
      toast.classList.add("hidden");
    }

    syncUI();
    if (shootQueue === 0 && balls.length === 0) {
      toast.classList.add("hidden");
      endTurn();
    }
  }

  function render() {
    ctx.fillStyle = "#070917";
    ctx.fillRect(0, 0, W, H);

    const sx = (Math.random() - 0.5) * shake;
    const sy = (Math.random() - 0.5) * shake;
    ctx.save();
    ctx.translate(sx, sy);

    // 플레이 보드 프레임
    ctx.fillStyle = "#0c1228";
    ctx.strokeStyle = "rgba(167,139,250,0.45)";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.roundRect(board.x, board.y, board.w, board.h, 16);
    ctx.fill();
    ctx.stroke();

    // 위험선
    const dangerY = board.y + DANGER_ROWS * board.cellH;
    ctx.strokeStyle = "rgba(244,63,94,0.4)";
    ctx.setLineDash([8, 8]);
    ctx.beginPath();
    ctx.moveTo(board.x + 8, dangerY);
    ctx.lineTo(board.x + board.w - 8, dangerY);
    ctx.stroke();
    ctx.setLineDash([]);

    // 블록 렌더링
    for (const b of bricks) {
      const r = brickRect(b);
      const col = brickColor(b);
      ctx.save();
      if (b.kind === "plus") {
        const cx = r.x + r.w / 2, cy = r.y + r.h / 2;
        ctx.strokeStyle = "#4ade80";
        ctx.lineWidth = 3;
        ctx.shadowBlur = 12; ctx.shadowColor = "#4ade80";
        ctx.beginPath(); ctx.arc(cx, cy, 13, 0, Math.PI * 2); ctx.stroke();
        ctx.fillStyle = "#4ade80"; ctx.font = "900 13px sans-serif"; ctx.textAlign = "center"; ctx.textBaseline = "middle";
        ctx.fillText("+1", cx, cy);
      } else {
        ctx.fillStyle = col;
        ctx.shadowBlur = 10; ctx.shadowColor = col;
        ctx.beginPath(); ctx.roundRect(r.x, r.y, r.w, r.h, 8); ctx.fill();
        ctx.shadowBlur = 0;
        ctx.fillStyle = "#ffffff";
        ctx.font = "900 15px sans-serif"; ctx.textAlign = "center"; ctx.textBaseline = "middle";
        const label = b.kind === "bomb" ? `💥${b.hp}` : b.kind === "laser" ? `⚡${b.hp}` : `${b.hp}`;
        ctx.fillText(label, r.x + r.w / 2, r.y + r.h / 2);
      }
      ctx.restore();
    }

    // 가로 레이저 이펙트
    for (const bm of beams) {
      ctx.save();
      ctx.globalAlpha = bm.life / bm.maxLife;
      ctx.fillStyle = "#38bdf8";
      ctx.shadowBlur = 18; ctx.shadowColor = "#38bdf8";
      ctx.fillRect(board.x + 4, bm.y - 6, board.w - 8, 12);
      ctx.restore();
    }

    // 발사 지점 & 조준 가이드 점선
    const launchY = board.y + board.h - 22;
    ctx.fillStyle = "#38bdf8";
    ctx.shadowBlur = 14; ctx.shadowColor = "#38bdf8";
    ctx.beginPath(); ctx.arc(launchX, launchY, 9, 0, Math.PI * 2); ctx.fill();
    ctx.shadowBlur = 0;

    if (state === "aim" && aiming) {
      // 1차 벽면 반사까지 미리 보여주는 상용급 조준 궤적 가이드
      const dx0 = Math.cos(aimAngle);
      const dy0 = Math.sin(aimAngle);
      let tHit = 320;
      let hitVert = false;
      if (dx0 < -0.001) {
        const tx = (board.x + 8 - launchX) / dx0;
        if (tx > 0 && tx < tHit) { tHit = tx; hitVert = true; }
      } else if (dx0 > 0.001) {
        const tx = (board.x + board.w - 8 - launchX) / dx0;
        if (tx > 0 && tx < tHit) { tHit = tx; hitVert = true; }
      }
      if (dy0 < -0.001) {
        const ty = (board.y + 8 - launchY) / dy0;
        if (ty > 0 && ty < tHit) { tHit = ty; hitVert = false; }
      }
      const hx = launchX + dx0 * tHit;
      const hy = launchY + dy0 * tHit;

      ctx.strokeStyle = "rgba(56,189,248,0.88)";
      ctx.lineWidth = 2.5;
      ctx.setLineDash([7, 7]);
      ctx.beginPath();
      ctx.moveTo(launchX, launchY);
      ctx.lineTo(hx, hy);
      if (tHit < 318) {
        const rdx = hitVert ? -dx0 : dx0;
        const rdy = hitVert ? dy0 : -dy0;
        ctx.lineTo(hx + rdx * 115, hy + rdy * 115);
      }
      ctx.stroke();
      ctx.setLineDash([]);
    } else if (state === "aim") {
      ctx.fillStyle = "rgba(148,163,184,0.8)";
      ctx.font = "700 12px sans-serif"; ctx.textAlign = "center";
      ctx.fillText(t("aimHint"), board.x + board.w / 2, launchY - 22);
    }

    // 볼 & 파티클
    for (const bl of balls) {
      ctx.fillStyle = "#e0f2fe";
      ctx.shadowBlur = 10; ctx.shadowColor = "#38bdf8";
      ctx.beginPath(); ctx.arc(bl.x, bl.y, bl.r, 0, Math.PI * 2); ctx.fill();
    }
    ctx.shadowBlur = 0;
    for (const p of particles) {
      ctx.globalAlpha = Math.max(0, p.life / p.maxLife);
      ctx.fillStyle = p.color;
      ctx.beginPath(); ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2); ctx.fill();
    }
    ctx.globalAlpha = 1;
    ctx.restore();
  }

  function syncUI() {
    document.getElementById("ui-wave").textContent = wave;
    document.getElementById("ui-balls").textContent = ballCount;
    document.getElementById("ui-score").textContent = score.toLocaleString();
    document.getElementById("ui-best-wave").textContent = save.bestWave;
    document.getElementById("ui-best-score").textContent = save.bestScore.toLocaleString();
  }

  function applyI18n() {
    document.documentElement.lang = lang;
    document.querySelectorAll("[data-i18n]").forEach((el) => { el.textContent = t(el.getAttribute("data-i18n")); });
    syncUI();
  }

  function updateAim(clientX, clientY) {
    const rect = canvas.getBoundingClientRect();
    const px = clientX - rect.left;
    const py = clientY - rect.top;
    const launchY = board.y + board.h - 22;
    // 상단 직접 조준 + 하단 슬링샷 당기기 조준 모두 자연스럽게 지원
    const dx = py > launchY + 10 ? launchX - px : px - launchX;
    const dy = py > launchY + 10 ? launchY - py : py - launchY;
    let ang = Math.atan2(dy, dx);
    if (ang > -0.18) ang = -0.18;
    if (ang < -Math.PI + 0.18) ang = -Math.PI + 0.18;
    aimAngle = ang;
  }

  canvas.addEventListener("pointerdown", (e) => {
    if (state !== "aim" || activePointerId !== null) return;
    SFX.unlock();
    activePointerId = e.pointerId;
    aiming = true;
    try { canvas.setPointerCapture(e.pointerId); } catch (_) {}
    updateAim(e.clientX, e.clientY);
  });
  window.addEventListener("pointermove", (e) => {
    if (!aiming || state !== "aim" || e.pointerId !== activePointerId) return;
    updateAim(e.clientX, e.clientY);
  });
  window.addEventListener("pointerup", (e) => {
    if (!aiming || state !== "aim" || e.pointerId !== activePointerId) return;
    activePointerId = null;
    aiming = false;
    fireVolley();
  });
  window.addEventListener("pointercancel", (e) => {
    if (e.pointerId !== activePointerId) return;
    activePointerId = null;
    aiming = false;
  });

  document.getElementById("btn-start").onclick = () => {
    SFX.unlock();
    document.getElementById("start-overlay").classList.add("hidden");
    resetGame();
    if (window.CrazyGames?.SDK?.game) window.CrazyGames.SDK.game.gameplayStart();
  };
  document.getElementById("btn-recall").onclick = recallBalls;
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
  document.getElementById("btn-perk-reroll").onclick = () => {
    if (rerolled) return;
    showRewarded(() => { rerolled = true; renderPerks(); });
  };
  document.getElementById("btn-revive").onclick = () => {
    if (revived) return;
    showRewarded(() => {
      revived = true;
      bricks = bricks.filter((b) => b.row < DANGER_ROWS - 2);
      document.getElementById("gameover-overlay").classList.add("hidden");
      state = "aim";
      syncUI();
    });
  };
  document.getElementById("btn-retry").onclick = () => {
    document.getElementById("gameover-overlay").classList.add("hidden");
    resetGame();
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

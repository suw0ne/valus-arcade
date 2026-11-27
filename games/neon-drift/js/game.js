/**
 * 네온 드리프트: 하이퍼 런 (NEON DRIFT: HYPER RUN) — 60fps 4차선 사이버 하이웨이 아케이드.
 * 좌우 스와이프·터치·방향키 차선 전환, 니어미스 니트로 부스트(무적 돌파),
 * 실드·자석 파워업, 속도 구간 상승, Web Audio 신스 SFX, 보상형 광고(부활·크레딧 2배) 지원.
 */
(function () {
  const SAVE_KEY = "nv_drift_save_v1";

  const I18N = {
    ko: {
      dist: "거리", speed: "속도", nitro: "니트로",
      kicker: "HYPER SPEED NEON RUNNER", title: "네온 드리프트",
      intro: "좌우 스와이프·터치 또는 방향키로 4차선 네온 하이웨이를 질주하세요! 장애물을 아슬아슬하게 스치면 니어미스 니트로가 충전됩니다.",
      bestDist: "최고 주행 거리", totalCoins: "누적 코어 크레딧", start: "▶ 하이퍼 주행 시작",
      crashed: "하이웨이 충돌!", reviveAd: "광고 보고 실드 부활 + 계속 주행 (1회)",
      doubleAd: "광고 보고 이번 주행 크레딧 2배", retry: "다시 주행하기",
      adDesc: "포털 배포 시 실제 보상형 광고가 재생됩니다.",
      nearMiss: "⚡ 니어미스! +25% 니트로",
      nitroOn: "🔥 하이퍼 니트로 발동! (무적 돌파)",
      shieldOn: "🛡️ 플라즈마 실드 획득!",
      magnetOn: "🧲 크레딧 자석 활성화 (7초)",
      doubled: "◆ 이번 주행 크레딧 2배 지급 완료!",
    },
    en: {
      dist: "DIST", speed: "SPEED", nitro: "NITRO",
      kicker: "HYPER SPEED NEON RUNNER", title: "NEON DRIFT",
      intro: "Swipe, tap, or use arrow keys across a 4-lane cyber highway! Near-miss obstacles to charge Hyper Nitro.",
      bestDist: "BEST DISTANCE", totalCoins: "TOTAL CREDITS", start: "▶ START HYPER RUN",
      crashed: "HIGHWAY CRASH!", reviveAd: "WATCH AD · SHIELD REVIVE (1x)",
      doubleAd: "WATCH AD · 2x RUN CREDITS", retry: "RACE AGAIN",
      adDesc: "Real portal rewarded video plays on CrazyGames/Poki.",
      nearMiss: "⚡ NEAR MISS! +25% NITRO",
      nitroOn: "🔥 HYPER NITRO OVERDRIVE!",
      shieldOn: "🛡️ PLASMA SHIELD EQUIPPED!",
      magnetOn: "🧲 CREDIT MAGNET ACTIVE (7s)",
      doubled: "◆ 2x RUN CREDITS AWARDED!",
    },
  };

  let lang = localStorage.getItem("nv_lang") || "ko";
  const t = (k) => (I18N[lang] && I18N[lang][k]) || I18N.ko[k] || k;

  function haptic(p) { try { if (navigator.vibrate) navigator.vibrate(p); } catch (_) {} }

  const SFX = {
    ctx: null, on: true,
    unlock() {
      if (!this.ctx) {
        const AC = window.AudioContext || window.webkitAudioContext;
        if (AC) this.ctx = new AC();
      }
      if (this.ctx && this.ctx.state === "suspended") this.ctx.resume().catch(() => {});
    },
    tone(f1, f2, dur, type = "triangle", vol = 0.07) {
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
      return { bestDist: p.bestDist || 0, totalCoins: p.totalCoins || 0 };
    } catch (_) { return { bestDist: 0, totalCoins: 0 }; }
  }
  let save = loadSave();
  function persist() { try { localStorage.setItem(SAVE_KEY, JSON.stringify(save)); } catch (_) {} }

  const canvas = document.getElementById("drift-canvas");
  const ctx = canvas.getContext("2d");
  const LANES = 4;

  let W = 600, H = 640, dpr = 1;
  let road = { x: 80, w: 440, laneW: 110 };

  let state = "start"; // start | playing | gameover
  let lane = 1; // 0..3
  let carX = 0, carY = 0, carTilt = 0;
  let distM = 0;
  let runCoins = 0;
  let speedPx = 380;
  let nitro = 0; // 0..100
  let nitroTimer = 0;
  let shield = 0;
  let magnetTimer = 0;
  let invulnTimer = 0;
  let revived = false;
  let doubled = false;
  let roadScroll = 0;
  let spawnTimer = 0.6;
  let bannerTimer = 0;
  let shake = 0;

  let entities = []; // { kind: 'block'|'coin'|'shield'|'magnet', lane, x, y, w, h, passed }
  let particles = [];
  let swipeStart = null;

  function resize() {
    const rect = canvas.parentElement.getBoundingClientRect();
    W = Math.max(320, Math.floor(rect.width));
    H = Math.max(360, Math.floor(rect.height));
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = Math.floor(W * dpr);
    canvas.height = Math.floor(H * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    const rw = Math.min(W - 24, 460);
    road = { x: Math.floor((W - rw) / 2), w: rw, laneW: rw / LANES };
    carY = H - 122;
    if (carX === 0) carX = laneCenter(lane);
  }

  function laneCenter(l) {
    return road.x + (l + 0.5) * road.laneW;
  }

  function showBanner(msg) {
    const el = document.getElementById("hud-banner");
    el.textContent = msg;
    el.classList.remove("hidden");
    bannerTimer = 1.6;
  }

  function moveLane(dir) {
    if (state !== "playing") return;
    const next = Math.max(0, Math.min(LANES - 1, lane + dir));
    if (next !== lane) {
      lane = next;
      carTilt = dir * 0.28;
      SFX.tone(360 + lane * 45, 520 + lane * 40, 0.06, "triangle", 0.05);
      haptic(10);
    }
  }

  function triggerNitro() {
    if (state !== "playing" || nitro < 100 || nitroTimer > 0) return;
    nitro = 0;
    nitroTimer = 4.5;
    shake = 7;
    showBanner(t("nitroOn"));
    SFX.tone(240, 880, 0.3, "sawtooth", 0.11);
    haptic([25, 20, 40]);
  }

  function resetRun() {
    lane = 1;
    carX = laneCenter(lane);
    carTilt = 0;
    distM = 0;
    runCoins = 0;
    speedPx = 380;
    nitro = 25;
    nitroTimer = 0;
    shield = 0;
    magnetTimer = 0;
    invulnTimer = 0.8;
    revived = false;
    doubled = false;
    entities = [];
    particles = [];
    spawnTimer = 0.7;
    state = "playing";
    syncUI();
  }

  function spawnWave() {
    // 4차선 중 항상 최소 1차선은 안전 통로 보장
    const order = [0, 1, 2, 3].sort(() => Math.random() - 0.5);
    const blockCount = distM > 600 ? (Math.random() < 0.45 ? 3 : 2) : (Math.random() < 0.5 ? 2 : 1);
    const blocked = new Set(order.slice(0, blockCount));
    const safeLane = order[blockCount];

    blocked.forEach((l) => {
      entities.push({
        kind: "block",
        lane: l,
        x: laneCenter(l),
        y: -50,
        w: road.laneW * 0.66,
        h: 44,
        passed: false,
      });
    });

    // 안전 차선에 크레딧 라인 또는 희귀 파워업 배치
    const roll = Math.random();
    if (roll < 0.09) {
      entities.push({ kind: "shield", lane: safeLane, x: laneCenter(safeLane), y: -50, w: 30, h: 30 });
    } else if (roll < 0.17) {
      entities.push({ kind: "magnet", lane: safeLane, x: laneCenter(safeLane), y: -50, w: 30, h: 30 });
    } else {
      for (let k = 0; k < 3; k++) {
        entities.push({ kind: "coin", lane: safeLane, x: laneCenter(safeLane), y: -45 - k * 42, w: 22, h: 22 });
      }
    }
  }

  function burst(x, y, color, count = 10) {
    for (let i = 0; i < count && particles.length < 140; i++) {
      const a = Math.random() * Math.PI * 2;
      const sp = 70 + Math.random() * 170;
      particles.push({ x, y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, r: 3.5, color, life: 0.35, maxLife: 0.35 });
    }
  }

  function endRun() {
    state = "gameover";
    const best = Math.floor(distM);
    if (best > save.bestDist) save.bestDist = best;
    save.totalCoins += runCoins;
    persist();
    document.getElementById("ui-final").textContent = `${best.toLocaleString()}m · ◆ +${runCoins.toLocaleString()}`;
    document.getElementById("btn-revive").disabled = revived;
    document.getElementById("btn-double").disabled = doubled || runCoins <= 0;
    document.getElementById("gameover-overlay").classList.remove("hidden");
    if (window.CrazyGames?.SDK?.game) window.CrazyGames.SDK.game.gameplayStop();
    syncUI();
  }

  function update(dt) {
    dt = Math.min(dt, 0.05);
    if (bannerTimer > 0) {
      bannerTimer -= dt;
      if (bannerTimer <= 0) document.getElementById("hud-banner").classList.add("hidden");
    }
    shake = Math.max(0, shake - dt * 28);
    for (let i = particles.length - 1; i >= 0; i--) {
      const p = particles[i];
      p.life -= dt; p.x += p.vx * dt; p.y += p.vy * dt;
      if (p.life <= 0) particles.splice(i, 1);
    }

    if (state !== "playing") return;

    const boosting = nitroTimer > 0;
    if (nitroTimer > 0) nitroTimer = Math.max(0, nitroTimer - dt);
    if (magnetTimer > 0) magnetTimer = Math.max(0, magnetTimer - dt);
    if (invulnTimer > 0) invulnTimer = Math.max(0, invulnTimer - dt);

    const targetSpd = Math.min(820, 380 + distM * 0.28) * (boosting ? 1.55 : 1);
    speedPx += (targetSpd - speedPx) * Math.min(1, dt * 4);
    distM += (speedPx * dt) / 16;
    roadScroll = (roadScroll + speedPx * dt) % 64;

    const targetX = laneCenter(lane);
    carX += (targetX - carX) * Math.min(1, dt * 16);
    carTilt *= Math.pow(0.08, dt);

    spawnTimer -= dt;
    if (spawnTimer <= 0) {
      spawnWave();
      spawnTimer = Math.max(0.42, 0.92 - Math.min(0.42, distM * 0.00028)) / (boosting ? 1.3 : 1);
    }

    for (let i = entities.length - 1; i >= 0; i--) {
      const e = entities[i];
      e.y += speedPx * dt;

      if (e.kind === "coin" && magnetTimer > 0 && Math.abs(e.y - carY) < 220) {
        e.x += (carX - e.x) * Math.min(1, dt * 11);
      }

      const hitX = Math.abs(e.x - carX) < (e.w * 0.5 + 16);
      const hitY = Math.abs(e.y - carY) < (e.h * 0.5 + 24);

      if (hitX && hitY) {
        if (e.kind === "coin") {
          runCoins += boosting ? 2 : 1;
          nitro = Math.min(100, nitro + 4);
          burst(e.x, e.y, "#facc15", 6);
          SFX.tone(680, 1020, 0.06, "sine", 0.05);
          entities.splice(i, 1);
          continue;
        }
        if (e.kind === "shield") {
          shield = Math.min(2, shield + 1);
          showBanner(t("shieldOn"));
          burst(e.x, e.y, "#c084fc", 12);
          SFX.tone(520, 980, 0.16, "triangle", 0.1);
          entities.splice(i, 1);
          continue;
        }
        if (e.kind === "magnet") {
          magnetTimer = 7.0;
          showBanner(t("magnetOn"));
          burst(e.x, e.y, "#38bdf8", 12);
          SFX.tone(460, 920, 0.16, "triangle", 0.1);
          entities.splice(i, 1);
          continue;
        }
        // 장애물 충돌
        if (boosting) {
          runCoins += 3;
          shake = 6;
          burst(e.x, e.y, "#f472b6", 14);
          SFX.tone(240, 80, 0.1, "sawtooth", 0.09);
          entities.splice(i, 1);
          continue;
        }
        if (shield > 0) {
          shield--;
          invulnTimer = 0.9;
          shake = 8;
          burst(e.x, e.y, "#c084fc", 16);
          SFX.tone(480, 180, 0.16, "triangle", 0.11);
          haptic(30);
          entities.splice(i, 1);
          continue;
        }
        if (invulnTimer <= 0) {
          shake = 14;
          burst(carX, carY, "#f43f5e", 22);
          SFX.tone(180, 48, 0.28, "sawtooth", 0.14);
          haptic([40, 30, 60]);
          endRun();
          return;
        }
      }

      // 인접 차선 장애물 니어미스 판정
      if (e.kind === "block" && !e.passed && e.y > carY + 34) {
        e.passed = true;
        if (Math.abs(e.lane - lane) === 1 && !boosting) {
          nitro = Math.min(100, nitro + 25);
          showBanner(t("nearMiss"));
          SFX.tone(620, 1180, 0.1, "triangle", 0.07);
        }
      }

      if (e.y > H + 80) entities.splice(i, 1);
    }

    if (Math.floor(distM) > save.bestDist) {
      save.bestDist = Math.floor(distM);
    }
    syncUI();
  }

  function render() {
    ctx.fillStyle = "#050714";
    ctx.fillRect(0, 0, W, H);

    const sx = (Math.random() - 0.5) * shake;
    const sy = (Math.random() - 0.5) * shake;
    ctx.save();
    ctx.translate(sx, sy);

    // 네온 하이웨이 배경
    const grad = ctx.createLinearGradient(0, 0, 0, H);
    grad.addColorStop(0, "#0b1129");
    grad.addColorStop(1, "#131c3d");
    ctx.fillStyle = grad;
    ctx.fillRect(road.x, 0, road.w, H);

    // 외곽 네온 가드레일
    ctx.strokeStyle = nitroTimer > 0 ? "#f472b6" : "#38bdf8";
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.moveTo(road.x, 0); ctx.lineTo(road.x, H);
    ctx.moveTo(road.x + road.w, 0); ctx.lineTo(road.x + road.w, H);
    ctx.stroke();

    // 차선 점선 스크롤
    ctx.strokeStyle = "rgba(148, 163, 184, 0.35)";
    ctx.lineWidth = 2;
    ctx.setLineDash([28, 36]);
    ctx.lineDashOffset = -roadScroll;
    for (let l = 1; l < LANES; l++) {
      const lx = road.x + l * road.laneW;
      ctx.beginPath(); ctx.moveTo(lx, 0); ctx.lineTo(lx, H); ctx.stroke();
    }
    ctx.setLineDash([]);

    // 오브젝트 렌더링
    for (const e of entities) {
      ctx.save();
      ctx.translate(e.x, e.y);
      if (e.kind === "block") {
        ctx.fillStyle = "#f43f5e";
        ctx.shadowBlur = 12; ctx.shadowColor = "#f43f5e";
        ctx.beginPath(); ctx.roundRect(-e.w / 2, -e.h / 2, e.w, e.h, 8); ctx.fill();
        ctx.fillStyle = "#ffe4e6";
        ctx.fillRect(-e.w * 0.34, -4, e.w * 0.68, 8);
      } else if (e.kind === "coin") {
        ctx.fillStyle = "#facc15";
        ctx.shadowBlur = 10; ctx.shadowColor = "#facc15";
        ctx.rotate(Math.PI / 4);
        ctx.fillRect(-8, -8, 16, 16);
      } else if (e.kind === "shield" || e.kind === "magnet") {
        const col = e.kind === "shield" ? "#c084fc" : "#38bdf8";
        ctx.fillStyle = col;
        ctx.shadowBlur = 14; ctx.shadowColor = col;
        ctx.beginPath(); ctx.arc(0, 0, 15, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = "#ffffff";
        ctx.font = "900 13px sans-serif"; ctx.textAlign = "center"; ctx.textBaseline = "middle";
        ctx.fillText(e.kind === "shield" ? "S" : "M", 0, 1);
      }
      ctx.restore();
    }

    // 플레이어 사이버 레이서
    ctx.save();
    ctx.translate(carX, carY);
    ctx.rotate(carTilt);
    if (invulnTimer > 0 && Math.floor(Date.now() / 70) % 2 === 0) ctx.globalAlpha = 0.55;

    // 추진 배기 불꽃
    ctx.fillStyle = nitroTimer > 0 ? "#f472b6" : "#38bdf8";
    ctx.shadowBlur = 18; ctx.shadowColor = ctx.fillStyle;
    ctx.beginPath();
    ctx.moveTo(-10, 22); ctx.lineTo(10, 22);
    ctx.lineTo(0, 42 + Math.random() * (nitroTimer > 0 ? 28 : 12));
    ctx.closePath(); ctx.fill();

    // 차체
    ctx.fillStyle = nitroTimer > 0 ? "#facc15" : "#38bdf8";
    ctx.strokeStyle = "#ffffff";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(0, -30); ctx.lineTo(18, 6); ctx.lineTo(15, 24);
    ctx.lineTo(-15, 24); ctx.lineTo(-18, 6);
    ctx.closePath();
    ctx.fill(); ctx.stroke();

    // 콕핏
    ctx.fillStyle = "#0f172a";
    ctx.beginPath(); ctx.roundRect(-7, -10, 14, 18, 5); ctx.fill();

    if (shield > 0) {
      ctx.strokeStyle = "#c084fc";
      ctx.lineWidth = 3;
      ctx.beginPath(); ctx.arc(0, 0, 34, 0, Math.PI * 2); ctx.stroke();
    }
    ctx.restore();

    // 파티클
    for (const p of particles) {
      ctx.globalAlpha = Math.max(0, p.life / p.maxLife);
      ctx.fillStyle = p.color;
      ctx.beginPath(); ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2); ctx.fill();
    }
    ctx.globalAlpha = 1;
    ctx.restore();
  }

  function syncUI() {
    document.getElementById("ui-dist").textContent = `${Math.floor(distM).toLocaleString()}m`;
    document.getElementById("ui-coins").textContent = runCoins.toLocaleString();
    document.getElementById("ui-speed").textContent = `${(speedPx / 380).toFixed(1)}x`;
    document.getElementById("ui-best-dist").textContent = `${save.bestDist.toLocaleString()}m`;
    document.getElementById("ui-total-coins").textContent = save.totalCoins.toLocaleString();
    const nBtn = document.getElementById("btn-nitro");
    document.getElementById("ui-nitro-pct").textContent = nitroTimer > 0 ? "ON!" : `${Math.floor(nitro)}%`;
    nBtn.disabled = nitro < 100 || nitroTimer > 0 || state !== "playing";
  }

  function applyI18n() {
    document.documentElement.lang = lang;
    document.querySelectorAll("[data-i18n]").forEach((el) => { el.textContent = t(el.getAttribute("data-i18n")); });
    syncUI();
  }

  // 입력: 키보드 + 터치 스와이프/탭 + 하단 버튼
  window.addEventListener("keydown", (e) => {
    if (e.key === "ArrowLeft" || e.key === "a" || e.key === "A") moveLane(-1);
    else if (e.key === "ArrowRight" || e.key === "d" || e.key === "D") moveLane(1);
    else if (e.key === " " || e.key === "ArrowUp" || e.key === "w" || e.key === "W") triggerNitro();
  });

  canvas.addEventListener("pointerdown", (e) => {
    if (state !== "playing") return;
    SFX.unlock();
    swipeStart = { x: e.clientX, y: e.clientY };
  });
  canvas.addEventListener("pointerup", (e) => {
    if (!swipeStart || state !== "playing") return;
    const dx = e.clientX - swipeStart.x;
    const dy = e.clientY - swipeStart.y;
    swipeStart = null;
    if (Math.abs(dx) > 24 && Math.abs(dx) > Math.abs(dy)) {
      moveLane(dx > 0 ? 1 : -1);
    } else if (dy < -36) {
      triggerNitro();
    } else {
      const rect = canvas.getBoundingClientRect();
      moveLane(e.clientX - rect.left < rect.width / 2 ? -1 : 1);
    }
  });

  document.getElementById("btn-left").onclick = () => moveLane(-1);
  document.getElementById("btn-right").onclick = () => moveLane(1);
  document.getElementById("btn-nitro").onclick = triggerNitro;
  document.getElementById("btn-sound").onclick = (e) => {
    SFX.on = !SFX.on;
    e.currentTarget.textContent = SFX.on ? "🔊" : "🔇";
  };
  document.getElementById("btn-lang").onclick = () => {
    lang = lang === "ko" ? "en" : "ko";
    localStorage.setItem("nv_lang", lang);
    applyI18n();
  };
  document.getElementById("btn-start").onclick = () => {
    SFX.unlock();
    document.getElementById("start-overlay").classList.add("hidden");
    resetRun();
    if (window.CrazyGames?.SDK?.game) window.CrazyGames.SDK.game.gameplayStart();
  };
  document.getElementById("btn-revive").onclick = () => {
    if (revived) return;
    showRewarded(() => {
      revived = true;
      shield = 1;
      invulnTimer = 2.0;
      entities = entities.filter((e) => e.y < carY - 140);
      document.getElementById("gameover-overlay").classList.add("hidden");
      state = "playing";
      if (window.CrazyGames?.SDK?.game) window.CrazyGames.SDK.game.gameplayStart();
      syncUI();
    });
  };
  document.getElementById("btn-double").onclick = () => {
    if (doubled || runCoins <= 0) return;
    showRewarded(() => {
      doubled = true;
      save.totalCoins += runCoins;
      persist();
      document.getElementById("btn-double").disabled = true;
      showBanner(t("doubled"));
      syncUI();
    });
  };
  document.getElementById("btn-retry").onclick = () => {
    document.getElementById("gameover-overlay").classList.add("hidden");
    resetRun();
    if (window.CrazyGames?.SDK?.game) window.CrazyGames.SDK.game.gameplayStart();
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

/**
 * 메인 컨트롤러 (main.js) — 입력 바인딩, 60fps 루프, HUD 동기화, 연구소·격납고·하이브리드 상점 UI 제어.
 */
(function (NV) {
  const $ = (id) => document.getElementById(id);

  function fmtTime(sec) {
    const s = Math.max(0, Math.floor(sec));
    const m = Math.floor(s / 60);
    const r = s % 60;
    return `${String(m).padStart(2, "0")}:${String(r).padStart(2, "0")}`;
  }

  let engine;
  let renderer;
  let activeMetaTab = null;
  let currentChoices = [];

  function applyI18n() {
    document.querySelectorAll("[data-i18n]").forEach((el) => {
      el.textContent = NV.t(el.getAttribute("data-i18n"));
    });
    $("sdk-badge").textContent = NV.SDK.getBadgeText();
    $("no-ads-badge").textContent = NV.t("noAdsActive");
    $("no-ads-badge").classList.toggle("hidden", !NV.SDK.noAdsOwned);
    refreshLobbyStats();
    if (activeMetaTab) renderMetaTab(activeMetaTab);
  }

  function refreshLobbyStats() {
    $("lobby-gold").textContent = engine.save.gold.toLocaleString();
    $("lobby-best-time").textContent = fmtTime(engine.save.bestTime);
    $("lobby-best-kills").textContent = engine.save.bestKills.toLocaleString();

    const s1 = $("stage-btn-1");
    const s2 = $("stage-btn-2");
    s1.classList.toggle("active", engine.save.selectedStage === 1);
    s2.classList.toggle("active", engine.save.selectedStage === 2);
    s2.classList.toggle("locked", !engine.save.unlockedStage2);
    s2.disabled = !engine.save.unlockedStage2;
    if (!engine.save.unlockedStage2) {
      s2.title = NV.lang === "ko" ? "1보스 처치 또는 번들로 해금" : "Defeat Boss 1 to unlock";
    }
  }

  function hideAllModals() {
    ["lobby-screen", "levelup-modal", "pause-modal", "revive-modal", "gameover-modal", "meta-modal"].forEach((id) => {
      $(id).classList.add("hidden");
    });
  }

  function handleStateChange(state) {
    hideAllModals();
    const inRun = state === "playing" || state === "levelup" || state === "paused" || state === "revive";
    $("hud").classList.toggle("hidden", !inRun);
    $("top-util-bar").classList.toggle("hidden", state === "playing");

    if (state === "lobby") {
      $("lobby-screen").classList.remove("hidden");
      refreshLobbyStats();
    } else if (state === "paused") {
      $("pause-modal").classList.remove("hidden");
    } else if (state === "revive") {
      $("revive-btn-text").textContent = NV.SDK.noAdsOwned ? NV.t("revivePassBtn") : NV.t("reviveAdBtn");
      $("revive-modal").classList.remove("hidden");
    } else if (state === "gameover") {
      $("res-time").textContent = fmtTime(engine.time);
      $("res-kills").textContent = engine.kills.toLocaleString();
      $("res-level").textContent = `LV ${engine.player.level}`;
      $("res-gold").textContent = `+${engine.runGold.toLocaleString()}`;
      const dblBtn = $("btn-double-gold");
      dblBtn.disabled = engine.doubledGold;
      $("double-gold-text").textContent = engine.doubledGold
        ? NV.t("doubleDone")
        : NV.SDK.noAdsOwned
          ? NV.t("doubleGoldPass")
          : NV.t("doubleGoldAd");
      $("gameover-modal").classList.remove("hidden");
    }
  }

  function renderLevelChoices(choices) {
    currentChoices = choices;
    hideAllModals();
    $("hud").classList.remove("hidden");
    $("levelup-modal").classList.remove("hidden");

    const wrap = $("choice-cards");
    wrap.innerHTML = "";
    choices.forEach((ch, idx) => {
      const card = document.createElement("button");
      card.className = `choice-card ${ch.kind === "evo" ? "evo" : ""}`;
      let tag = "";
      let title = NV.pick(ch.data.name);
      let desc = NV.pick(ch.data.desc);
      if (ch.kind === "evo") {
        tag = NV.t("evoTag");
        title = NV.pick(ch.data.evoName);
        desc = NV.pick(ch.data.evoDesc);
      } else if (ch.kind === "weapon" || ch.kind === "passive") {
        tag = ch.nextLv === 1 ? NV.t("newTag") : `LV ${ch.nextLv}`;
      } else {
        tag = "BONUS";
      }
      card.innerHTML = `
        <div class="choice-top">
          <span class="choice-icon">${ch.data.icon}</span>
          <span class="choice-tag">${tag}</span>
        </div>
        <div class="choice-name">${title}</div>
        <div class="choice-desc">${desc}</div>
        <div class="choice-key">[${idx + 1}]</div>
      `;
      card.onclick = () => engine.applyLevelChoice(ch);
      wrap.appendChild(card);
    });

    const rerollBtn = $("btn-reroll");
    rerollBtn.disabled = engine.rerolledThisLevel;
    $("reroll-text").textContent = engine.rerolledThisLevel
      ? NV.t("rerollUsed")
      : NV.SDK.noAdsOwned
        ? NV.t("rerollFree")
        : NV.t("rerollAd");
  }

  function renderMetaTab(tab) {
    activeMetaTab = tab;
    $("meta-modal").classList.remove("hidden");
    $("meta-gold").textContent = engine.save.gold.toLocaleString();
    const body = $("meta-body");
    body.innerHTML = "";

    if (tab === "armory") {
      $("meta-title").textContent = NV.t("armoryTitle");
      $("meta-desc").textContent = NV.t("armoryDesc");
      NV.DATA.armoryUpgrades.forEach((up) => {
        const lv = engine.save.upgrades[up.id] || 0;
        const cost = engine.getUpgradeCost(up);
        const maxed = lv >= up.maxLv;
        const canBuy = !maxed && engine.save.gold >= cost;

        const dots = Array.from({ length: up.maxLv }, (_, i) => `<span class="level-dot ${i < lv ? "on" : ""}"></span>`).join("");
        const el = document.createElement("div");
        el.className = "meta-card";
        el.innerHTML = `
          <div class="meta-card-head">
            <h3>${up.icon} ${NV.pick(up.name)}</h3>
            <span class="choice-tag">LV ${lv}/${up.maxLv}</span>
          </div>
          <div class="level-dots">${dots}</div>
          <p>${NV.pick(up.desc)}</p>
          <button class="${canBuy ? "btn-primary" : "btn-secondary"}" ${canBuy ? "" : "disabled"}>
            ${maxed ? NV.t("maxed") : `${NV.t("buy")} · ◆ ${cost.toLocaleString()}`}
          </button>
        `;
        el.querySelector("button").onclick = () => {
          if (engine.buyArmoryUpgrade(up.id)) {
            refreshLobbyStats();
            renderMetaTab("armory");
          }
        };
        body.appendChild(el);
      });
    } else if (tab === "hangar") {
      $("meta-title").textContent = NV.t("hangarTitle");
      $("meta-desc").textContent = NV.t("hangarDesc");
      NV.DATA.characters.forEach((ch) => {
        const unlocked = engine.save.unlockedChars.includes(ch.id);
        const selected = engine.save.selectedChar === ch.id;
        const canUnlock = !unlocked && engine.save.gold >= ch.price;
        const w = NV.DATA.weapons[ch.startWeapon];

        const el = document.createElement("div");
        el.className = `meta-card ${selected ? "selected" : ""}`;
        el.innerHTML = `
          <div class="meta-card-head">
            <h3 style="color:${ch.color}">${NV.pick(ch.name)}</h3>
            <span class="choice-tag">${NV.pick(ch.role)}</span>
          </div>
          <p>${NV.pick(ch.desc)}<br/><strong>${w.icon} ${NV.pick(w.name)}</strong> · HP ${ch.hp} · SPD ${ch.speed}</p>
          <button class="${selected ? "btn-secondary" : unlocked || canUnlock ? "btn-primary" : "btn-secondary"}" ${!unlocked && !canUnlock ? "disabled" : ""}>
            ${selected ? NV.t("selected") : unlocked ? NV.t("select") : `${NV.t("unlock")} · ◆ ${ch.price.toLocaleString()}`}
          </button>
        `;
        el.querySelector("button").onclick = () => {
          if (engine.unlockOrSelectChar(ch.id)) {
            refreshLobbyStats();
            renderMetaTab("hangar");
          }
        };
        body.appendChild(el);
      });
    } else if (tab === "shop") {
      $("meta-title").textContent = NV.t("shopTitle");
      $("meta-desc").textContent = `${NV.t("shopDesc")} (${NV.t("iapSimNotice")})`;

      // 무료 보상형 광고 보급 카드 (무과금 핵심 수익 지점)
      const freeCard = document.createElement("div");
      freeCard.className = "meta-card";
      freeCard.innerHTML = `
        <div class="meta-card-head">
          <h3>🎁 ${NV.t("freeRewardTitle")}</h3>
          <span class="choice-tag">FREE</span>
        </div>
        <p>${NV.t("freeRewardDesc")}</p>
        <button class="btn-reward-solid">${NV.t("freeRewardBtn")}</button>
      `;
      freeCard.querySelector("button").onclick = () => {
        NV.SDK.showRewardedAd(() => {
          engine.save.gold += 300;
          engine.persistSave();
          NV.Audio.playLevelUp();
          refreshLobbyStats();
          renderMetaTab("shop");
        });
      };
      body.appendChild(freeCard);

      // 하이브리드 IAP 패키지 3종
      NV.DATA.shopPacks.forEach((pk) => {
        const owned = engine.hasPack(pk.id);
        const el = document.createElement("div");
        el.className = `meta-card ${owned ? "selected" : ""}`;
        el.innerHTML = `
          <div class="meta-card-head">
            <h3>💎 ${NV.pick(pk.name)}</h3>
            <span class="choice-tag">${NV.pick(pk.badge)}</span>
          </div>
          <p>${NV.pick(pk.desc)}</p>
          <button class="${owned ? "btn-secondary" : "btn-primary"}" ${owned ? "disabled" : ""}>
            ${owned ? NV.t("purchased") : pk.priceLabel}
          </button>
        `;
        el.querySelector("button").onclick = () => {
          NV.SDK.purchaseItem(pk.id, () => {
            engine.applyShopPack(pk.id);
            applyI18n();
            renderMetaTab("shop");
          });
        };
        body.appendChild(el);
      });
    }
  }

  function syncHud() {
    if (engine.state !== "playing") return;
    const p = engine.player;
    $("xp-fill").style.width = `${Math.min(100, (p.xp / p.xpNeed) * 100)}%`;
    $("hud-level").textContent = `${NV.t("level")} ${p.level}`;
    $("hud-timer").textContent = fmtTime(engine.time);
    $("hud-wave").textContent = `${NV.t("wave")} ${engine.wave}`;
    $("hud-kills").textContent = engine.kills.toLocaleString();
    $("hud-gold").textContent = engine.runGold.toLocaleString();

    // 로드아웃 아이콘 칩
    const strip = $("hud-loadout");
    let html = "";
    for (const [wid, lv] of Object.entries(engine.weapons)) {
      const w = NV.DATA.weapons[wid];
      const evo = !!engine.evolved[wid];
      html += `<span class="slot-chip ${evo ? "evolved" : ""}">${w.icon} ${evo ? "★" : lv}</span>`;
    }
    strip.innerHTML = html;

    // 보스 체력바
    const bossHud = $("boss-hud");
    if (engine.activeBoss) {
      bossHud.classList.remove("hidden");
      const ratio = Math.max(0, engine.activeBoss.hp / engine.activeBoss.maxHp);
      $("boss-name").textContent = engine.activeBoss.name;
      $("boss-hp-text").textContent = `${Math.ceil(ratio * 100)}%`;
      $("boss-bar-fill").style.width = `${ratio * 100}%`;
    } else {
      bossHud.classList.add("hidden");
    }

    // 중앙 이벤트 배너
    const ban = $("event-banner");
    if (engine.banner.timer > 0) {
      ban.classList.remove("hidden");
      ban.textContent = engine.banner.text;
      ban.style.borderColor = engine.banner.color;
    } else {
      ban.classList.add("hidden");
    }

    // 대시 쿨다운 마스크
    const cdRatio = p.dashCd > 0 ? Math.min(1, p.dashCd / p.dashMaxCd) : 0;
    $("dash-cd-mask").style.height = `${cdRatio * 100}%`;
    $("dash-label").textContent = cdRatio > 0 ? `${p.dashCd.toFixed(1)}s` : "SPACE";
  }

  function bindInputs() {
    window.addEventListener("keydown", (e) => {
      engine.keys[e.code] = true;
      if (e.code === "Space" && engine.state === "playing") {
        e.preventDefault();
        engine.triggerDash();
      } else if (e.code === "Escape") {
        if (engine.state === "playing") {
          engine.state = "paused";
          NV.SDK.gameplayStop();
          handleStateChange("paused");
        } else if (engine.state === "paused") {
          engine.state = "playing";
          NV.SDK.gameplayStart();
          handleStateChange("playing");
        }
      } else if (engine.state === "levelup") {
        if (e.code === "Digit1" && currentChoices[0]) engine.applyLevelChoice(currentChoices[0]);
        if (e.code === "Digit2" && currentChoices[1]) engine.applyLevelChoice(currentChoices[1]);
        if (e.code === "Digit3" && currentChoices[2]) engine.applyLevelChoice(currentChoices[2]);
      }
    });
    window.addEventListener("keyup", (e) => {
      engine.keys[e.code] = false;
    });

    const canvas = $("game-canvas");
    const onPtrDown = (e) => {
      if (engine.state !== "playing") return;
      if (e.button === 2) {
        engine.triggerDash();
        return;
      }
      NV.Audio.unlock();
      engine.pointer.active = true;
      engine.pointer.startX = e.clientX;
      engine.pointer.startY = e.clientY;
      engine.pointer.curX = e.clientX;
      engine.pointer.curY = e.clientY;
      engine.pointer.vx = 0;
      engine.pointer.vy = 0;
    };
    const onPtrMove = (e) => {
      if (!engine.pointer.active) return;
      engine.pointer.curX = e.clientX;
      engine.pointer.curY = e.clientY;
      const dx = e.clientX - engine.pointer.startX;
      const dy = e.clientY - engine.pointer.startY;
      const d = Math.hypot(dx, dy);
      if (d > 6) {
        engine.pointer.vx = dx / d;
        engine.pointer.vy = dy / d;
      }
    };
    const onPtrUp = () => {
      engine.pointer.active = false;
      engine.pointer.vx = 0;
      engine.pointer.vy = 0;
    };

    canvas.addEventListener("pointerdown", onPtrDown);
    window.addEventListener("pointermove", onPtrMove);
    window.addEventListener("pointerup", onPtrUp);
    canvas.addEventListener("contextmenu", (e) => e.preventDefault());

    // UI 버튼 바인딩
    $("btn-play").onclick = () => engine.startRun();
    $("btn-dash").onclick = () => engine.triggerDash();
    $("btn-pause").onclick = () => {
      if (engine.state === "playing") {
        engine.state = "paused";
        NV.SDK.gameplayStop();
        handleStateChange("paused");
      }
    };
    $("btn-resume").onclick = () => {
      engine.state = "playing";
      NV.SDK.gameplayStart();
      handleStateChange("playing");
    };
    $("btn-pause-restart").onclick = () => engine.startRun();
    $("btn-pause-lobby").onclick = () => {
      NV.Audio.stopBgm();
      engine.state = "lobby";
      handleStateChange("lobby");
    };

    $("btn-reroll").onclick = () => {
      if (engine.rerolledThisLevel) return;
      NV.SDK.showRewardedAd(() => {
        engine.rerolledThisLevel = true;
        renderLevelChoices(engine.rollUpgradeChoices());
      });
    };

    $("btn-revive-ad").onclick = () => {
      NV.SDK.showRewardedAd(() => engine.revivePlayer());
    };
    $("btn-give-up").onclick = () => engine.finishRun();

    $("btn-double-gold").onclick = () => {
      if (engine.doubledGold) return;
      NV.SDK.showRewardedAd(() => {
        engine.claimDoubleGold();
        handleStateChange("gameover");
      });
    };
    $("btn-retry").onclick = () => engine.startRun();
    $("btn-go-armory").onclick = () => {
      engine.state = "lobby";
      handleStateChange("lobby");
      renderMetaTab("armory");
    };

    $("btn-open-armory").onclick = () => renderMetaTab("armory");
    $("btn-open-hangar").onclick = () => renderMetaTab("hangar");
    $("btn-open-shop").onclick = () => renderMetaTab("shop");
    $("btn-close-meta").onclick = () => {
      activeMetaTab = null;
      $("meta-modal").classList.add("hidden");
    };

    $("stage-btn-1").onclick = () => {
      engine.save.selectedStage = 1;
      engine.persistSave();
      refreshLobbyStats();
    };
    $("stage-btn-2").onclick = () => {
      if (!engine.save.unlockedStage2) return;
      engine.save.selectedStage = 2;
      engine.persistSave();
      refreshLobbyStats();
    };

    $("btn-lang").onclick = () => {
      NV.setLang(NV.lang === "ko" ? "en" : "ko");
      applyI18n();
    };
    $("btn-sfx").onclick = () => {
      NV.Audio.sfxEnabled = !NV.Audio.sfxEnabled;
      $("btn-sfx").textContent = NV.Audio.sfxEnabled ? "🔊" : "🔇";
    };
    $("btn-bgm").onclick = () => {
      NV.Audio.bgmEnabled = !NV.Audio.bgmEnabled;
      $("btn-bgm").textContent = NV.Audio.bgmEnabled ? "🎵" : "🔕";
      if (!NV.Audio.bgmEnabled) NV.Audio.stopBgm();
      else if (engine.state === "playing") NV.Audio.startBgm(!!engine.activeBoss);
    };

    window.addEventListener("resize", () => renderer.resize());
  }

  async function boot() {
    await NV.SDK.init();
    engine = new NV.GameEngine({
      onStateChange: handleStateChange,
      onLevelUp: renderLevelChoices,
    });
    renderer = new NV.GameRenderer($("game-canvas"));
    window.NV.engine = engine; // 테스트/디버깅 접근점

    bindInputs();
    applyI18n();
    handleStateChange("lobby");

    let last = performance.now();
    function frame(now) {
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      engine.update(dt);
      renderer.render(engine);
      syncHud();
      requestAnimationFrame(frame);
    }
    requestAnimationFrame(frame);
  }

  window.addEventListener("DOMContentLoaded", boot);
})(window.NV);

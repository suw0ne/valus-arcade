/**
 * 하이브리드 수익화 & 멀티 포털 SDK 어댑터 (CrazyGames v2 / Poki / 로컬 시뮬레이터).
 * 코어 게임 코드 수정 없이 CrazyGames(광고+IAP), Poki(광고), 로컬 테스트 환경에 자동 적응한다.
 */
window.NV = window.NV || {};

(function (NV) {
  const AD_COOLDOWN_MS = 180000; // CrazyGames 정책 준수: 전면 광고 최소 3분 간격

  const SDK = {
    platform: "local",
    lastMidgameAt: 0,
    noAdsOwned: false,
    initialized: false,

    async init() {
      if (this.initialized) return;
      try {
        if (window.CrazyGames && window.CrazyGames.SDK) {
          await window.CrazyGames.SDK.init();
          this.platform = "crazygames";
        } else if (window.PokiSDK) {
          await window.PokiSDK.init();
          this.platform = "poki";
        } else {
          this.platform = "local";
        }
      } catch (err) {
        this.platform = "local";
      }
      this.initialized = true;
    },

    getBadgeText() {
      if (this.platform === "crazygames") return NV.t("sdkBadgeCrazy");
      if (this.platform === "poki") return NV.t("sdkBadgePoki");
      return NV.t("sdkBadgeLocal");
    },

    gameplayStart() {
      try {
        if (this.platform === "crazygames" && window.CrazyGames?.SDK?.game) {
          window.CrazyGames.SDK.game.gameplayStart();
        } else if (this.platform === "poki" && window.PokiSDK) {
          window.PokiSDK.gameplayStart();
        }
      } catch (_) {}
    },

    gameplayStop() {
      try {
        if (this.platform === "crazygames" && window.CrazyGames?.SDK?.game) {
          window.CrazyGames.SDK.game.gameplayStop();
        } else if (this.platform === "poki" && window.PokiSDK) {
          window.PokiSDK.gameplayStop();
        }
      } catch (_) {}
    },

    happytime() {
      try {
        if (this.platform === "crazygames" && window.CrazyGames?.SDK?.game) {
          window.CrazyGames.SDK.game.happytime();
        }
      } catch (_) {}
    },

    /** 자연스러운 판 종료 시 전면 광고(3분 쿨다운 준수, 광고제거 패스 시 스킵). */
    showMidgameAd(onDone) {
      if (this.noAdsOwned || Date.now() - this.lastMidgameAt < AD_COOLDOWN_MS) {
        if (onDone) onDone();
        return;
      }
      this.lastMidgameAt = Date.now();
      if (this.platform === "crazygames" && window.CrazyGames?.SDK?.ad) {
        NV.Audio?.setMutedTemp(true);
        window.CrazyGames.SDK.ad.requestAd("midgame", {
          adFinished: () => { NV.Audio?.setMutedTemp(false); if (onDone) onDone(); },
          adError: () => { NV.Audio?.setMutedTemp(false); if (onDone) onDone(); },
        });
      } else if (this.platform === "poki" && window.PokiSDK) {
        NV.Audio?.setMutedTemp(true);
        window.PokiSDK.commercialBreak().then(() => {
          NV.Audio?.setMutedTemp(false);
          if (onDone) onDone();
        });
      } else {
        if (onDone) onDone();
      }
    },

    /** 자발적 보상형 광고 (광고제거 패스 보유 시 즉시 보상 지급!). */
    showRewardedAd(onReward, onCancel) {
      if (this.noAdsOwned) {
        if (onReward) onReward();
        return;
      }
      if (this.platform === "crazygames" && window.CrazyGames?.SDK?.ad) {
        NV.Audio?.setMutedTemp(true);
        window.CrazyGames.SDK.ad.requestAd("rewarded", {
          adFinished: () => { NV.Audio?.setMutedTemp(false); if (onReward) onReward(); },
          adError: () => { NV.Audio?.setMutedTemp(false); if (onCancel) onCancel(); },
        });
      } else if (this.platform === "poki" && window.PokiSDK) {
        NV.Audio?.setMutedTemp(true);
        window.PokiSDK.rewardedBreak().then((ok) => {
          NV.Audio?.setMutedTemp(false);
          if (ok && onReward) onReward();
          else if (!ok && onCancel) onCancel();
        });
      } else {
        // 로컬 환경: 짧은 2.5초 시각 시뮬레이션 모달로 포털 UX 동일 검증
        this._openLocalAdModal(onReward, onCancel);
      }
    },

    /** 하이브리드 IAP 결제 훅 (CrazyGames IAP 확장 대응 + 로컬 테스트 즉시 검증). */
    purchaseItem(skuId, onSuccess) {
      if (this.platform === "crazygames" && window.CrazyGames?.SDK?.user) {
        // 추후 CrazyGames IAP / Xsolla 정식 승인 후 공식 결제 API 연동 지점
        if (onSuccess) onSuccess(skuId);
      } else {
        if (onSuccess) onSuccess(skuId);
      }
    },

    _openLocalAdModal(onReward, onCancel) {
      const overlay = document.getElementById("ad-sim-modal");
      const timerEl = document.getElementById("ad-sim-timer");
      const barEl = document.getElementById("ad-sim-bar");
      if (!overlay) {
        if (onReward) onReward();
        return;
      }
      overlay.classList.remove("hidden");
      let remain = 2.5;
      const total = 2.5;
      NV.Audio?.setMutedTemp(true);
      const tick = setInterval(() => {
        remain = Math.max(0, remain - 0.1);
        if (timerEl) timerEl.textContent = `${NV.t("adSimWait")} ${remain.toFixed(1)}s`;
        if (barEl) barEl.style.width = `${((total - remain) / total) * 100}%`;
        if (remain <= 0) {
          clearInterval(tick);
          overlay.classList.add("hidden");
          NV.Audio?.setMutedTemp(false);
          if (onReward) onReward();
        }
      }, 100);
    },
  };

  NV.SDK = SDK;
})(window.NV);

/**
 * 프로시저럴 Web Audio API 상용급 사운드 & 다이내믹 신스 BGM 엔진.
 * 외부 음원 파일 없이 0KB 용량으로 타격감 있는 효과음·콤보 상승음·보스전 가속 BGM을 실시간 합성한다.
 */
window.NV = window.NV || {};

(function (NV) {
  const PENTATONIC = [523.25, 587.33, 659.25, 783.99, 880.0, 1046.5, 1174.66, 1318.51];

  const AudioEngine = {
    ctx: null,
    sfxEnabled: true,
    bgmEnabled: true,
    tempMuted: false,
    xpCombo: 0,
    lastXpTime: 0,
    bgmTimer: null,
    bgmStep: 0,
    bossMode: false,

    unlock() {
      if (!this.ctx) {
        const AC = window.AudioContext || window.webkitAudioContext;
        if (AC) this.ctx = new AC();
      }
      if (this.ctx && this.ctx.state === "suspended") {
        this.ctx.resume().catch(() => {});
      }
    },

    setMutedTemp(flag) {
      this.tempMuted = flag;
      if (flag) this.stopBgm();
    },

    _canSfx() {
      return this.sfxEnabled && !this.tempMuted && this.ctx && this.ctx.state === "running";
    },

    playShoot(type = "pulse") {
      if (!this._canSfx()) return;
      const now = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.connect(gain);
      gain.connect(this.ctx.destination);

      if (type === "pulse") {
        osc.type = "triangle";
        osc.frequency.setValueAtTime(640 + Math.random() * 80, now);
        osc.frequency.exponentialRampToValueAtTime(180, now + 0.065);
        gain.gain.setValueAtTime(0.06, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.065);
        osc.start(now);
        osc.stop(now + 0.07);
      } else if (type === "rail") {
        osc.type = "sawtooth";
        osc.frequency.setValueAtTime(980, now);
        osc.frequency.exponentialRampToValueAtTime(140, now + 0.14);
        gain.gain.setValueAtTime(0.09, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.14);
        osc.start(now);
        osc.stop(now + 0.15);
      } else if (type === "arc") {
        osc.type = "sawtooth";
        osc.frequency.setValueAtTime(1250 + Math.random() * 350, now);
        osc.frequency.exponentialRampToValueAtTime(320, now + 0.09);
        gain.gain.setValueAtTime(0.055, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.09);
        osc.start(now);
        osc.stop(now + 0.095);
      } else if (type === "missile") {
        osc.type = "sine";
        osc.frequency.setValueAtTime(240, now);
        osc.frequency.exponentialRampToValueAtTime(620, now + 0.09);
        gain.gain.setValueAtTime(0.06, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.1);
        osc.start(now);
        osc.stop(now + 0.11);
      }
    },

    playHit(isCrit = false) {
      if (!this._canSfx()) return;
      const now = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = isCrit ? "square" : "sine";
      osc.frequency.setValueAtTime(isCrit ? 420 : 190, now);
      osc.frequency.exponentialRampToValueAtTime(65, now + 0.055);
      gain.gain.setValueAtTime(isCrit ? 0.08 : 0.045, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.055);
      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start(now);
      osc.stop(now + 0.06);
    },

    playExplosion(big = false) {
      if (!this._canSfx()) return;
      const now = this.ctx.currentTime;
      const dur = big ? 0.34 : 0.16;
      const bufSize = Math.floor(this.ctx.sampleRate * dur);
      const buffer = this.ctx.createBuffer(1, bufSize, this.ctx.sampleRate);
      const data = buffer.getChannelData(0);
      for (let i = 0; i < bufSize; i++) {
        data[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / bufSize, 1.8);
      }
      const noise = this.ctx.createBufferSource();
      noise.buffer = buffer;
      const filter = this.ctx.createBiquadFilter();
      filter.type = "lowpass";
      filter.frequency.setValueAtTime(big ? 700 : 1100, now);
      filter.frequency.exponentialRampToValueAtTime(90, now + dur);

      const gain = this.ctx.createGain();
      gain.gain.setValueAtTime(big ? 0.22 : 0.09, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + dur);

      noise.connect(filter);
      filter.connect(gain);
      gain.connect(this.ctx.destination);
      noise.start(now);
    },

    playXp() {
      if (!this._canSfx()) return;
      const now = this.ctx.currentTime;
      if (now - this.lastXpTime < 0.35) {
        this.xpCombo = Math.min(PENTATONIC.length - 1, this.xpCombo + 1);
      } else {
        this.xpCombo = 0;
      }
      this.lastXpTime = now;
      const freq = PENTATONIC[this.xpCombo];
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = "sine";
      osc.frequency.setValueAtTime(freq, now);
      osc.frequency.exponentialRampToValueAtTime(freq * 1.12, now + 0.075);
      gain.gain.setValueAtTime(0.065, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.085);
      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start(now);
      osc.stop(now + 0.09);
    },

    playDash() {
      if (!this._canSfx()) return;
      const now = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = "sine";
      osc.frequency.setValueAtTime(220, now);
      osc.frequency.exponentialRampToValueAtTime(880, now + 0.14);
      gain.gain.setValueAtTime(0.11, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.15);
      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start(now);
      osc.stop(now + 0.16);
    },

    playLevelUp() {
      if (!this._canSfx()) return;
      const now = this.ctx.currentTime;
      [523.25, 659.25, 783.99, 1046.5].forEach((f, idx) => {
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = "triangle";
        const t = now + idx * 0.07;
        osc.frequency.setValueAtTime(f, t);
        gain.gain.setValueAtTime(0.11, t);
        gain.gain.exponentialRampToValueAtTime(0.001, t + 0.24);
        osc.connect(gain);
        gain.connect(this.ctx.destination);
        osc.start(t);
        osc.stop(t + 0.25);
      });
    },

    playBossSiren() {
      if (!this._canSfx()) return;
      const now = this.ctx.currentTime;
      for (let i = 0; i < 2; i++) {
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        const t = now + i * 0.38;
        osc.type = "sawtooth";
        osc.frequency.setValueAtTime(280, t);
        osc.frequency.linearRampToValueAtTime(520, t + 0.18);
        osc.frequency.linearRampToValueAtTime(240, t + 0.35);
        gain.gain.setValueAtTime(0.1, t);
        gain.gain.exponentialRampToValueAtTime(0.001, t + 0.36);
        osc.connect(gain);
        gain.connect(this.ctx.destination);
        osc.start(t);
        osc.stop(t + 0.37);
      }
    },

    playHurt() {
      if (!this._canSfx()) return;
      const now = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = "sawtooth";
      osc.frequency.setValueAtTime(140, now);
      osc.frequency.exponentialRampToValueAtTime(52, now + 0.16);
      gain.gain.setValueAtTime(0.14, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.17);
      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start(now);
      osc.stop(now + 0.18);
    },

    /** 가볍고 중독성 있는 사이버 신스웨이브 베이스 루프 */
    startBgm(boss = false) {
      this.bossMode = boss;
      if (!this.bgmEnabled || this.tempMuted) return;
      this.stopBgm();
      const bassNotes = boss
        ? [82.41, 82.41, 98.0, 110.0, 82.41, 82.41, 123.47, 110.0]
        : [65.41, 65.41, 77.78, 87.31, 65.41, 65.41, 98.0, 87.31];
      const tempoMs = boss ? 155 : 195;

      this.bgmTimer = setInterval(() => {
        if (!this.bgmEnabled || this.tempMuted || !this.ctx || this.ctx.state !== "running") return;
        const now = this.ctx.currentTime;
        const note = bassNotes[this.bgmStep % bassNotes.length];
        const osc = this.ctx.createOscillator();
        const filter = this.ctx.createBiquadFilter();
        const gain = this.ctx.createGain();

        osc.type = "sawtooth";
        osc.frequency.setValueAtTime(note, now);
        filter.type = "lowpass";
        filter.frequency.setValueAtTime(boss ? 420 : 280, now);
        filter.frequency.exponentialRampToValueAtTime(110, now + 0.14);

        gain.gain.setValueAtTime(0.045, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.15);

        osc.connect(filter);
        filter.connect(gain);
        gain.connect(this.ctx.destination);
        osc.start(now);
        osc.stop(now + 0.16);

        // 2박마다 은은한 서브 킥
        if (this.bgmStep % 2 === 0) {
          const kick = this.ctx.createOscillator();
          const kg = this.ctx.createGain();
          kick.type = "sine";
          kick.frequency.setValueAtTime(115, now);
          kick.frequency.exponentialRampToValueAtTime(36, now + 0.11);
          kg.gain.setValueAtTime(0.09, now);
          kg.gain.exponentialRampToValueAtTime(0.001, now + 0.12);
          kick.connect(kg);
          kg.connect(this.ctx.destination);
          kick.start(now);
          kick.stop(now + 0.13);
        }
        this.bgmStep++;
      }, tempoMs);
    },

    stopBgm() {
      if (this.bgmTimer) {
        clearInterval(this.bgmTimer);
        this.bgmTimer = null;
      }
    },
  };

  NV.Audio = AudioEngine;
})(window.NV);

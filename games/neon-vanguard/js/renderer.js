/**
 * 상용 네온 사이버 벡터 렌더러 (renderer.js).
 * 다중 레이어 글로우, 동적 패럴랙스 그리드, 대시 잔상, 번개 폴리라인, 보스 텔레그래프 경고, 가상 조이스틱을 60fps로 그린다.
 */
window.NV = window.NV || {};

(function (NV) {
  class GameRenderer {
    constructor(canvas) {
      this.canvas = canvas;
      this.ctx = canvas.getContext("2d");
      this.w = 1280;
      this.h = 720;
      this.dpr = Math.min(window.devicePixelRatio || 1, 2);
      this.stars = Array.from({ length: 85 }, () => ({
        x: (Math.random() - 0.5) * 2800,
        y: (Math.random() - 0.5) * 2800,
        r: 0.8 + Math.random() * 1.8,
        a: 0.15 + Math.random() * 0.45,
      }));
      this.resize();
    }

    resize() {
      const rect = this.canvas.parentElement.getBoundingClientRect();
      this.w = Math.max(320, Math.floor(rect.width));
      this.h = Math.max(320, Math.floor(rect.height));
      this.dpr = Math.min(window.devicePixelRatio || 1, 2);
      this.canvas.width = Math.floor(this.w * this.dpr);
      this.canvas.height = Math.floor(this.h * this.dpr);
      this.ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
    }

    render(engine) {
      const ctx = this.ctx;
      const w = this.w;
      const h = this.h;
      const isStage2 = engine.stage === 2;

      // 배경 그라데이션
      const bg = ctx.createRadialGradient(w / 2, h / 2, 40, w / 2, h / 2, Math.max(w, h) * 0.78);
      if (isStage2) {
        bg.addColorStop(0, "#1c0f1d");
        bg.addColorStop(1, "#09040b");
      } else {
        bg.addColorStop(0, "#0d172a");
        bg.addColorStop(1, "#050914");
      }
      ctx.fillStyle = bg;
      ctx.fillRect(0, 0, w, h);

      // 로비 어트랙트 모드 배경 연출
      if (engine.state === "lobby") {
        this._renderLobbyBg(ctx, w, h, engine.time, isStage2);
        return;
      }

      const sx = (Math.random() - 0.5) * engine.camera.shake * 1.4;
      const sy = (Math.random() - 0.5) * engine.camera.shake * 1.4;
      const ox = w / 2 - engine.camera.x + sx;
      const oy = h / 2 - engine.camera.y + sy;

      ctx.save();
      ctx.translate(ox, oy);

      this._drawGridAndArena(ctx, engine, isStage2);
      this._drawGems(ctx, engine);
      this._drawWavesFx(ctx, engine);
      this._drawEnemies(ctx, engine);
      this._drawPlayerAndOrbital(ctx, engine);
      this._drawBullets(ctx, engine);
      this._drawBolts(ctx, engine);
      this._drawParticles(ctx, engine);
      this._drawFloatTexts(ctx, engine);

      ctx.restore();

      // 모바일/드래그 가상 조이스틱 시각화
      if (engine.pointer.active) {
        this._drawVirtualJoystick(ctx, engine.pointer);
      }

      // 저체력 위험 비네팅 펄스
      const hpRatio = engine.player.hp / engine.player.maxHp;
      if (hpRatio < 0.3) {
        const pulse = 0.22 + Math.sin(engine.time * 9) * 0.12;
        const vg = ctx.createRadialGradient(w / 2, h / 2, Math.min(w, h) * 0.28, w / 2, h / 2, Math.max(w, h) * 0.7);
        vg.addColorStop(0, "rgba(239,68,68,0)");
        vg.addColorStop(1, `rgba(239,68,68,${pulse.toFixed(2)})`);
        ctx.fillStyle = vg;
        ctx.fillRect(0, 0, w, h);
      }
    }

    _renderLobbyBg(ctx, w, h, t, isStage2) {
      const grid = 64;
      const offX = (t * 24) % grid;
      const offY = (t * 18) % grid;
      ctx.strokeStyle = isStage2 ? "rgba(244,63,94,0.11)" : "rgba(56,189,248,0.10)";
      ctx.lineWidth = 1;
      ctx.beginPath();
      for (let x = -grid; x < w + grid; x += grid) {
        ctx.moveTo(x + offX, 0);
        ctx.lineTo(x + offX, h);
      }
      for (let y = -grid; y < h + grid; y += grid) {
        ctx.moveTo(0, y + offY);
        ctx.lineTo(w, y + offY);
      }
      ctx.stroke();

      // 중앙 회전 홀로그램 코어 링
      ctx.save();
      ctx.translate(w / 2, h / 2);
      ctx.rotate(t * 0.22);
      ctx.strokeStyle = isStage2 ? "rgba(251,113,133,0.22)" : "rgba(56,189,248,0.22)";
      ctx.lineWidth = 2;
      ctx.setLineDash([18, 12]);
      ctx.beginPath();
      ctx.arc(0, 0, Math.min(w, h) * 0.34, 0, Math.PI * 2);
      ctx.stroke();
      ctx.rotate(-t * 0.55);
      ctx.strokeStyle = "rgba(250,204,21,0.16)";
      ctx.setLineDash([8, 16]);
      ctx.beginPath();
      ctx.arc(0, 0, Math.min(w, h) * 0.24, 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();
    }

    _drawGridAndArena(ctx, engine, isStage2) {
      // 성단 배경
      ctx.fillStyle = "#e2e8f0";
      for (const s of this.stars) {
        ctx.globalAlpha = s.a;
        ctx.beginPath();
        ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.globalAlpha = 1;

      const step = 80;
      const left = Math.floor((engine.camera.x - this.w / 2) / step) * step - step;
      const right = engine.camera.x + this.w / 2 + step;
      const top = Math.floor((engine.camera.y - this.h / 2) / step) * step - step;
      const bottom = engine.camera.y + this.h / 2 + step;

      ctx.strokeStyle = isStage2 ? "rgba(244,63,94,0.10)" : "rgba(56,189,248,0.09)";
      ctx.lineWidth = 1;
      ctx.beginPath();
      for (let x = left; x <= right; x += step) {
        ctx.moveTo(x, top);
        ctx.lineTo(x, bottom);
      }
      for (let y = top; y <= bottom; y += step) {
        ctx.moveTo(left, y);
        ctx.lineTo(right, y);
      }
      ctx.stroke();

      // 원형 아레나 경계선
      ctx.save();
      ctx.strokeStyle = isStage2 ? "rgba(244,63,94,0.65)" : "rgba(56,189,248,0.55)";
      ctx.lineWidth = 5;
      ctx.shadowBlur = 18;
      ctx.shadowColor = isStage2 ? "#f43f5e" : "#38bdf8";
      ctx.beginPath();
      ctx.arc(0, 0, NV.ARENA_RADIUS, 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();
    }

    _drawGems(ctx, engine) {
      for (const g of engine.gems) {
        ctx.save();
        ctx.translate(g.x, g.y);
        ctx.fillStyle = g.color;
        ctx.shadowBlur = 10;
        ctx.shadowColor = g.color;
        if (g.kind === "xp") {
          ctx.rotate(Math.PI / 4);
          ctx.fillRect(-g.r * 0.75, -g.r * 0.75, g.r * 1.5, g.r * 1.5);
        } else if (g.kind === "gold") {
          ctx.beginPath();
          ctx.arc(0, 0, g.r, 0, Math.PI * 2);
          ctx.fill();
          ctx.fillStyle = "#fef08a";
          ctx.beginPath();
          ctx.arc(0, 0, g.r * 0.45, 0, Math.PI * 2);
          ctx.fill();
        } else if (g.kind === "heal") {
          ctx.fillRect(-g.r * 0.35, -g.r, g.r * 0.7, g.r * 2);
          ctx.fillRect(-g.r, -g.r * 0.35, g.r * 2, g.r * 0.7);
        } else {
          ctx.strokeStyle = "#93c5fd";
          ctx.lineWidth = 3;
          ctx.beginPath();
          ctx.arc(0, 0, g.r, 0, Math.PI * 2);
          ctx.stroke();
        }
        ctx.restore();
      }
    }

    _drawWavesFx(ctx, engine) {
      for (const fx of engine.wavesFx) {
        const alpha = Math.max(0, fx.life / fx.maxLife);
        ctx.save();
        ctx.strokeStyle = fx.color;
        ctx.globalAlpha = alpha * 0.85;
        ctx.lineWidth = 4 * alpha + 1.5;
        ctx.shadowBlur = 14;
        ctx.shadowColor = fx.color;
        ctx.beginPath();
        ctx.arc(fx.x, fx.y, fx.r, 0, Math.PI * 2);
        ctx.stroke();
        ctx.restore();
      }
    }

    _drawEnemies(ctx, engine) {
      for (const e of engine.enemies) {
        // 대셔 돌진 전 조준선 텔레그래프
        if (e.type === "charger" && e.chargeState === 1) {
          ctx.save();
          ctx.strokeStyle = "rgba(251,146,60,0.75)";
          ctx.lineWidth = 2;
          ctx.setLineDash([8, 6]);
          ctx.beginPath();
          ctx.moveTo(e.x, e.y);
          ctx.lineTo(e.x + e.tx * 260, e.y + e.ty * 260);
          ctx.stroke();
          ctx.restore();
        }

        // 보스 광역 폭발 텔레그래프
        if (e.isBoss && e.ringTelegraph) {
          const prog = 1 - e.ringTelegraph.t / e.ringTelegraph.maxT;
          ctx.save();
          ctx.fillStyle = `rgba(239,68,68,${(0.1 + prog * 0.22).toFixed(2)})`;
          ctx.strokeStyle = "rgba(239,68,68,0.85)";
          ctx.lineWidth = 2.5;
          ctx.beginPath();
          ctx.arc(e.x, e.y, e.ringTelegraph.r, 0, Math.PI * 2);
          ctx.fill();
          ctx.stroke();
          ctx.beginPath();
          ctx.arc(e.x, e.y, e.ringTelegraph.r * prog, 0, Math.PI * 2);
          ctx.stroke();
          ctx.restore();
        }

        ctx.save();
        ctx.translate(e.x, e.y);
        const fillCol = e.hitFlash > 0 ? "#ffffff" : e.slowTimer > 0 ? "#67e8f9" : e.color;
        ctx.fillStyle = fillCol;
        ctx.strokeStyle = "#ffffff";
        ctx.lineWidth = e.isBoss ? 3 : 1.5;
        ctx.shadowBlur = e.isBoss ? 22 : 10;
        ctx.shadowColor = fillCol;

        if (e.isBoss) {
          ctx.rotate(engine.time * 1.4);
          this._polygon(ctx, 8, e.radius);
          ctx.fill();
          ctx.stroke();
          ctx.rotate(-engine.time * 2.8);
          ctx.fillStyle = "#fef08a";
          this._polygon(ctx, 4, e.radius * 0.48);
          ctx.fill();
        } else if (e.type === "aegis") {
          this._polygon(ctx, 6, e.radius);
          ctx.fill();
          ctx.stroke();
        } else if (e.type === "charger") {
          const ang = Math.atan2(engine.player.y - e.y, engine.player.x - e.x);
          ctx.rotate(ang);
          ctx.beginPath();
          ctx.moveTo(e.radius * 1.25, 0);
          ctx.lineTo(-e.radius, -e.radius * 0.85);
          ctx.lineTo(-e.radius * 0.5, 0);
          ctx.lineTo(-e.radius, e.radius * 0.85);
          ctx.closePath();
          ctx.fill();
          ctx.stroke();
        } else if (e.type === "splitter") {
          ctx.rotate(engine.time * 2.5);
          this._polygon(ctx, 5, e.radius);
          ctx.fill();
          ctx.stroke();
        } else if (e.type === "sniper") {
          ctx.rotate(-engine.time * 2);
          this._polygon(ctx, 3, e.radius * 1.15);
          ctx.fill();
          ctx.stroke();
        } else {
          ctx.rotate(engine.time * 3);
          this._polygon(ctx, 4, e.radius);
          ctx.fill();
        }

        // 체력바 (피해 입은 일반 적)
        if (!e.isBoss && e.hp < e.maxHp) {
          ctx.shadowBlur = 0;
          const bw = e.radius * 2.1;
          ctx.fillStyle = "rgba(15,23,42,0.85)";
          ctx.fillRect(-bw / 2, -e.radius - 9, bw, 4);
          ctx.fillStyle = "#f43f5e";
          ctx.fillRect(-bw / 2, -e.radius - 9, bw * Math.max(0, e.hp / e.maxHp), 4);
        }
        ctx.restore();
      }
    }

    _drawPlayerAndOrbital(ctx, engine) {
      const p = engine.player;
      const areaM = engine.getAreaMult();

      // 오비탈 블레이드 렌더링
      if (engine.weapons.blade) {
        const lv = engine.weapons.blade;
        const evo = !!engine.evolved.blade;
        const count = evo ? 6 : 1 + lv;
        const orbitR = (evo ? 105 : 74 + lv * 5) * areaM;
        ctx.save();
        ctx.strokeStyle = evo ? "rgba(244,63,94,0.28)" : "rgba(251,113,133,0.18)";
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(p.x, p.y, orbitR, 0, Math.PI * 2);
        ctx.stroke();
        for (let i = 0; i < count; i++) {
          const a = engine.bladeAngle + (Math.PI * 2 * i) / count;
          const bx = p.x + Math.cos(a) * orbitR;
          const by = p.y + Math.sin(a) * orbitR;
          ctx.save();
          ctx.translate(bx, by);
          ctx.rotate(engine.time * 12);
          ctx.fillStyle = evo ? "#f43f5e" : "#fb7185";
          ctx.shadowBlur = 14;
          ctx.shadowColor = "#fb7185";
          this._star(ctx, 4, (evo ? 17 : 12) * areaM, (evo ? 7 : 5) * areaM);
          ctx.fill();
          ctx.restore();
        }
        ctx.restore();
      }

      // 어썰트 드론 렌더링
      if (engine.weapons.drone) {
        const evo = !!engine.evolved.drone;
        const count = evo ? 2 : 1;
        for (let d = 0; d < count; d++) {
          const ang = engine.droneAngle + d * Math.PI;
          const dx = p.x + Math.cos(ang) * 56;
          const dy = p.y + Math.sin(ang) * 56;
          ctx.save();
          ctx.translate(dx, dy);
          ctx.fillStyle = "#4ade80";
          ctx.shadowBlur = 12;
          ctx.shadowColor = "#4ade80";
          ctx.beginPath();
          ctx.arc(0, 0, evo ? 8 : 6, 0, Math.PI * 2);
          ctx.fill();
          ctx.strokeStyle = "#ffffff";
          ctx.lineWidth = 1.5;
          ctx.stroke();
          ctx.restore();
        }
      }

      // 대시 잔상
      for (const ai of p.afterimages) {
        ctx.save();
        ctx.translate(ai.x, ai.y);
        ctx.rotate(ai.angle);
        ctx.globalAlpha = (ai.life / ai.maxLife) * 0.45;
        ctx.fillStyle = p.color;
        this._drawShipPath(ctx, p.radius);
        ctx.fill();
        ctx.restore();
      }

      // 플레이어 기체 본체
      ctx.save();
      ctx.translate(p.x, p.y);
      if (p.invuln > 0 && Math.floor(engine.time * 24) % 2 === 0) {
        ctx.globalAlpha = 0.55;
      }
      ctx.rotate(p.angle);
      ctx.shadowBlur = 20;
      ctx.shadowColor = p.color;
      ctx.fillStyle = p.color;
      this._drawShipPath(ctx, p.radius);
      ctx.fill();
      ctx.strokeStyle = "#ffffff";
      ctx.lineWidth = 2;
      ctx.stroke();

      // 콕핏 코어
      ctx.fillStyle = p.accent;
      ctx.beginPath();
      ctx.arc(4, 0, 4.5, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();

      // 기체 하단 소형 체력바
      const bw = 42;
      ctx.fillStyle = "rgba(15,23,42,0.85)";
      ctx.fillRect(p.x - bw / 2, p.y + 24, bw, 5);
      ctx.fillStyle = p.hp / p.maxHp < 0.3 ? "#ef4444" : "#22c55e";
      ctx.fillRect(p.x - bw / 2, p.y + 24, bw * Math.max(0, p.hp / p.maxHp), 5);
    }

    _drawShipPath(ctx, r) {
      ctx.beginPath();
      ctx.moveTo(r * 1.35, 0);
      ctx.lineTo(-r * 0.95, -r * 0.92);
      ctx.lineTo(-r * 0.42, 0);
      ctx.lineTo(-r * 0.95, r * 0.92);
      ctx.closePath();
    }

    _drawBullets(ctx, engine) {
      for (const b of engine.bullets) {
        ctx.save();
        ctx.fillStyle = b.color;
        ctx.shadowBlur = 12;
        ctx.shadowColor = b.color;
        if (b.kind === "rail") {
          const a = Math.atan2(b.vy, b.vx);
          ctx.translate(b.x, b.y);
          ctx.rotate(a);
          ctx.fillRect(-18, -b.r * 0.45, 36, b.r * 0.9);
          ctx.fillStyle = "#ffffff";
          ctx.fillRect(-14, -b.r * 0.2, 28, b.r * 0.4);
        } else {
          ctx.beginPath();
          ctx.arc(b.x, b.y, b.r, 0, Math.PI * 2);
          ctx.fill();
        }
        ctx.restore();
      }

      for (const eb of engine.enemyBullets) {
        ctx.save();
        ctx.fillStyle = "#ef4444";
        ctx.shadowBlur = 12;
        ctx.shadowColor = "#ef4444";
        ctx.beginPath();
        ctx.arc(eb.x, eb.y, eb.r, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = "#fecaca";
        ctx.beginPath();
        ctx.arc(eb.x, eb.y, eb.r * 0.45, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      }
    }

    _drawBolts(ctx, engine) {
      for (const lt of engine.bolts) {
        const a = Math.max(0, lt.life / lt.maxLife);
        ctx.save();
        ctx.strokeStyle = lt.color;
        ctx.globalAlpha = a;
        ctx.lineWidth = 3.5;
        ctx.shadowBlur = 16;
        ctx.shadowColor = lt.color;
        ctx.beginPath();
        ctx.moveTo(lt.x1, lt.y1);
        const segs = 5;
        for (let s = 1; s < segs; s++) {
          const t = s / segs;
          const mx = lt.x1 + (lt.x2 - lt.x1) * t + (Math.random() - 0.5) * 24;
          const my = lt.y1 + (lt.y2 - lt.y1) * t + (Math.random() - 0.5) * 24;
          ctx.lineTo(mx, my);
        }
        ctx.lineTo(lt.x2, lt.y2);
        ctx.stroke();
        ctx.restore();
      }
    }

    _drawParticles(ctx, engine) {
      for (const pt of engine.particles) {
        const a = Math.max(0, pt.life / pt.maxLife);
        ctx.save();
        ctx.globalAlpha = a;
        ctx.fillStyle = pt.color;
        ctx.beginPath();
        ctx.arc(pt.x, pt.y, pt.r * a, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      }
    }

    _drawFloatTexts(ctx, engine) {
      ctx.save();
      ctx.textAlign = "center";
      for (const ft of engine.floatTexts) {
        const a = Math.max(0, ft.life / ft.maxLife);
        ctx.globalAlpha = a;
        ctx.font = `900 ${ft.size}px 'Pretendard','Malgun Gothic',sans-serif`;
        ctx.fillStyle = "#020617";
        ctx.fillText(ft.text, ft.x + 1.5, ft.y + 1.5);
        ctx.fillStyle = ft.color;
        ctx.fillText(ft.text, ft.x, ft.y);
      }
      ctx.restore();
    }

    _drawVirtualJoystick(ctx, ptr) {
      ctx.save();
      ctx.strokeStyle = "rgba(56,189,248,0.45)";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(ptr.startX, ptr.startY, 46, 0, Math.PI * 2);
      ctx.stroke();

      const dx = ptr.curX - ptr.startX;
      const dy = ptr.curY - ptr.startY;
      const d = Math.hypot(dx, dy);
      const clamped = Math.min(46, d);
      const kx = d > 0 ? ptr.startX + (dx / d) * clamped : ptr.startX;
      const ky = d > 0 ? ptr.startY + (dy / d) * clamped : ptr.startY;

      ctx.fillStyle = "rgba(56,189,248,0.65)";
      ctx.beginPath();
      ctx.arc(kx, ky, 18, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }

    _polygon(ctx, sides, r) {
      ctx.beginPath();
      for (let i = 0; i < sides; i++) {
        const a = (Math.PI * 2 * i) / sides;
        const x = Math.cos(a) * r;
        const y = Math.sin(a) * r;
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.closePath();
    }

    _star(ctx, spikes, outerR, innerR) {
      ctx.beginPath();
      for (let i = 0; i < spikes * 2; i++) {
        const r = i % 2 === 0 ? outerR : innerR;
        const a = (Math.PI * i) / spikes;
        const x = Math.cos(a) * r;
        const y = Math.sin(a) * r;
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.closePath();
    }
  }

  NV.GameRenderer = GameRenderer;
})(window.NV);

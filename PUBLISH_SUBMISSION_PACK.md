# VALUS ARCADE 글로벌 웹게임 포털 수익화 제출 완결 패키지 (CrazyGames · Poki · itch.io)

> 기준일: 2026-11-27 · 라이브 포털: https://suw0ne.github.io/valus-arcade/ · 총 **8종 라이브 게임 / 16종 자동 빌드 번들** · 추가 비용 **0원** · 외부 유료 API **0건** · 운영자 개인정보 **0%**

---

## 1. 8종 게임 번들 & 제출 메타데이터 총괄표

모든 `.zip` 번들은 `publish_manager.py`를 통해 CrazyGames SDK v2 / Poki SDK v2 `<script>` 슬롯이 자동 주입되고 `qa_submission_check.py` + `rules.py` 자동 제출 QA를 100% 통과한 즉시 제출 완료 상태입니다.

| # | 슬러그 | 영문 타이틀 (Submit Title) | 장르 | 버전 | CrazyGames ZIP | Poki ZIP | 커버 해상도 | 보상형 광고 SDK 훅 |
|---:|---|---|---|---|---:|---:|---|---|
| **1** | `last-bridge-3d` | **LAST BRIDGE 3D: SQUAD RUSH** | 3D Action / Gate Shooter | v2.0.0 (PBR) | ~176 KB | ~176 KB | 1280×720 (3D 키아트) | +8 출격 · +12 부활 · 골드 2배 |
| **2** | `cannon-crowd-3d` | **CANNON CROWD 3D: CASTLE RUSH** | 3D Crowd Siege / Arcade | v2.0.0 (PBR) | ~167 KB | ~167 KB | 1280×720 (3D 키아트) | ×4 메가 게이트 · 챔피언 3기 부활 · 골드 2배 |
| **3** | `heli-strike-3d` | **HELI STRIKE 3D: BRIDGE SIEGE** | 3D Gunship / Bridge Defense | v1.0.0 (PBR) | ~175 KB | ~175 KB | 1280×720 (3D 키아트) | 긴급 지원폭격 · 100% 방벽 복구 · 골드 2배 |
| **4** | `neon-vanguard` | **NEON VANGUARD: OVERDRIVE** | Action Roguelite | v1.1.0 | 37.7 KB | 37.7 KB | 1280×720 | 부활 · 스킬 리롤 · 골드 2배 |
| **5** | `core-merge-td` | **CORE MERGE TD** | Merge Tower Defense | v1.0.0 | 11.5 KB | 11.5 KB | 1280×720 | 티어2 보급 · 코어 수복 부활 |
| **6** | `drill-to-core` | **DRILL TO CORE** | Physics Digging Upgrade | v1.1.0 | 14.8 KB | 14.8 KB | 1280×720 | 긴급 연료 충전 · 광물 수익 2배 |
| **7** | `neon-breaker` | **NEON BREAKER: ROGUELITE** | Roguelite Brick Breaker | v1.0.0 | 11.2 KB | 11.2 KB | 1280×720 | 카드 리롤 · 하단 2줄 파괴 부활 |
| **8** | `neon-drift` | **NEON DRIFT: HYPER RUN** | Endless Speed Runner | v1.0.0 | 9.9 KB | 9.9 KB | 1280×720 | 실드 부활 · 주행 크레딧 2배 |

---

## 2. 대표 3D 웹광고 시리즈 제출용 영문 소개 & 조작법 (복붙용)

### #1. LAST BRIDGE 3D: SQUAD RUSH (`last-bridge-3d`)
- **Tagline**: *Flip red gates blue, evolve to Golden Miniguns, deploy a Battle Tank & crush the Crimson Titan Boss!*
- **Description (EN)**: Experience the viral 3D bridge gate-shooting gameplay made into a full, zero-install 60fps WebGL game! Drag left and right across a sunlit suspension bridge to shoot negative red gates into blue squad multipliers, shatter explosive weapon barrels to upgrade from SMG to 6-barrel Golden Miniguns and Tactical Rockets, deploy a 3D Armored Battle Tank, and defeat the towering Crimson Titan Boss.
- **Controls**: Drag Left / Right (Mobile & Mouse) or `A`/`D` / Arrow Keys. Auto-fire enabled.
- **Tags**: `3d`, `shooter`, `runner`, `zombie`, `upgrade`, `boss`, `mobile`, `one-hand`

### #2. CANNON CROWD 3D: CASTLE RUSH (`cannon-crowd-3d`)
- **Tagline**: *Aim your 3D blue siege cannon through moving ×2/×3/×4 gates and storm the Red Fortress!*
- **Description (EN)**: Press and drag your glossy 3D siege cannon to launch waves of armored blue troopers across a sunlit stone valley road. Aim through sliding holographic multiplier gates (`×2`, `×3`, `×4`) to multiply your crowd into an unstoppable wave, charge and unleash Giant Golden Titan Champions, clash against red castle defenders, and conquer tougher fortresses with 4 permanent upgrades.
- **Controls**: Hold & Drag Left/Right (Mobile & Mouse) or `A`/`D` + `Space` to fire, `E` / Button for Golden Champion.
- **Tags**: `3d`, `crowd`, `strategy`, `castle`, `cannon`, `arcade`, `mobile`, `casual`

### #3. HELI STRIKE 3D: BRIDGE SIEGE (`heli-strike-3d`)
- **Tagline**: *Pilot an Apache 30mm Vulcan gunship, chain-detonate fuel barrels & crush Crimson Mech Bosses!*
- **Description (EN)**: Hover above a sunlit golden-hour coastal suspension bridge in a sleek 3D metallic blue attack helicopter. Drag or move your pointer to sweep the glowing 3D laser crosshair and auto-fire twin 30mm rotary tracers, trigger domino chain explosions with red fuel barrels, collect airborne Holo Supply Crates, unleash an 8-missile Homing Salvo, and defend the armored survivor convoy against Spiked Crimson Mech Bosses.
- **Controls**: Drag / Move Pointer (Mobile & Mouse) or `WASD` / Arrow Keys. Auto-fire enabled. `Space` / Button for 8-Missile Salvo.
- **Tags**: `3d`, `helicopter`, `shooter`, `defense`, `explosion`, `boss`, `mobile`, `action`

---

## 3. 포털별 0원 심사 등록 체크리스트
- **CrazyGames Developer Portal (https://developer.crazygames.com/)**:
  - [ ] `games/<slug>/dist/<slug>-crazygames.zip` 업로드 (`CrazyGames.SDK.game.gameplayStart/Stop` + `ad.requestAd("rewarded")` 내장 완료)
  - [ ] 1280×720 커버 아트(`assets/cover_<slug>.png`) 등록 및 모바일 세로/가로 반응형 체크
- **Poki for Developers (https://developers.poki.com/)**:
  - [ ] `games/<slug>/dist/<slug>-poki.zip` 업로드 (`PokiSDK.rewardedBreak()` 내장 완료)
- **itch.io (https://itch.io/developers)**:
  - [ ] 무료 웹 HTML5 프로젝트 생성 → ZIP 업로드 + "Embed in page (Full screen)" 체크 + Valus Arcade 허브 역링크 연결
- **법무·보안 최종 확인**: 외부 CDN 의존 `0건` (Three.js r147 MIT 로컬 번들), 외부 데이터 API `0건`, 개인정보 수집 `0건` (`localStorage` 전용).

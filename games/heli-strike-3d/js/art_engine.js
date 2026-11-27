/**
 * 헬기 스트라이크 3D: 브릿지 시즈 — v2.0 스튜디오 PBR 아트·모델링·셰이더 엔진 (art_engine.js).
 * - ACESFilmic 톤매핑 + RoomEnvironment IBL 금속 반사 + 2048 소프트 그림자
 * - 골든아워 GLSL 스카이 돔 + 입체 뭉게구름 + 태양광 반사 파도 바다 셰이더
 * - 1024px 아스팔트 범프 텍스처 + 포물선 현수 케이블(TubeGeometry) 현수교
 * - 28+ 파츠 조각 3D 블루 공격 헬기(회전 로터·글래스 콕핏·윙 로켓 포드·6총열 회전 발칸·총구 화염),
 *   호송 장갑 APC + 홀로그램 시안 에너지 방벽 셰이더, 연쇄 폭발 레드 연료통,
 *   홀로 보급 크레이트, 크림슨 돌격대/방패 브루트/공성 장갑차/스파이크 메카 보스.
 */
(function (global) {
  function makeRadialTexture(inner, mid, outer, size = 128) {
    const c = document.createElement("canvas");
    c.width = size; c.height = size;
    const g = c.getContext("2d");
    const r = size / 2;
    const grad = g.createRadialGradient(r, r, 2, r, r, r);
    grad.addColorStop(0, inner);
    grad.addColorStop(0.45, mid);
    grad.addColorStop(1, outer);
    g.fillStyle = grad;
    g.fillRect(0, 0, size, size);
    const tex = new THREE.CanvasTexture(c);
    tex.encoding = THREE.sRGBEncoding;
    return tex;
  }

  function makeStarFlashTexture() {
    const c = document.createElement("canvas");
    c.width = 128; c.height = 128;
    const g = c.getContext("2d");
    g.translate(64, 64);
    const grad = g.createRadialGradient(0, 0, 2, 0, 0, 60);
    grad.addColorStop(0, "rgba(255,255,255,1)");
    grad.addColorStop(0.26, "rgba(254,240,138,0.96)");
    grad.addColorStop(0.6, "rgba(249,115,22,0.58)");
    grad.addColorStop(1, "rgba(249,115,22,0)");
    g.fillStyle = grad;
    g.beginPath();
    for (let i = 0; i < 12; i++) {
      const a = (i * Math.PI) / 6;
      const rad = i % 2 === 0 ? 60 : 18;
      if (i === 0) g.moveTo(Math.cos(a) * rad, Math.sin(a) * rad);
      else g.lineTo(Math.cos(a) * rad, Math.sin(a) * rad);
    }
    g.closePath();
    g.fill();
    const tex = new THREE.CanvasTexture(c);
    tex.encoding = THREE.sRGBEncoding;
    return tex;
  }

  function createAsphaltTextures() {
    const size = 1024;
    const cAlb = document.createElement("canvas");
    cAlb.width = size; cAlb.height = size;
    const g = cAlb.getContext("2d");

    const cBump = document.createElement("canvas");
    cBump.width = size; cBump.height = size;
    const gb = cBump.getContext("2d");

    g.fillStyle = "#475569";
    g.fillRect(0, 0, size, size);
    gb.fillStyle = "#808080";
    gb.fillRect(0, 0, size, size);

    // 타이어 주행 흔적
    g.fillStyle = "rgba(30, 41, 59, 0.3)";
    for (const tx of [190, 350, 674, 834]) {
      g.fillRect(tx - 44, 0, 88, size);
    }

    // 미세 아스팔트 노이즈
    for (let i = 0; i < 13000; i++) {
      const x = Math.random() * size;
      const y = Math.random() * size;
      const s = 1.5 + Math.random() * 2.5;
      const v = 56 + Math.floor(Math.random() * 44);
      g.fillStyle = `rgb(${v},${v + 7},${v + 16})`;
      g.fillRect(x, y, s, s);
      const bv = 92 + Math.floor(Math.random() * 76);
      gb.fillStyle = `rgb(${bv},${bv},${bv})`;
      gb.fillRect(x, y, s, s);
    }

    // 좌우 콘크리트 갓길
    g.fillStyle = "#94a3b8";
    g.fillRect(0, 0, 58, size);
    g.fillRect(size - 58, 0, 58, size);
    g.fillStyle = "#e2e8f0";
    g.fillRect(56, 0, 12, size);
    g.fillRect(size - 68, 0, 12, size);

    // 노란 중앙 이중선 & 차선
    g.fillStyle = "#facc15";
    g.fillRect(size / 2 - 14, 0, 10, size);
    g.fillRect(size / 2 + 4, 0, 10, size);
    g.fillStyle = "rgba(248, 250, 252, 0.92)";
    for (let y = 24; y < size; y += 156) {
      g.fillRect(280, y, 12, 82);
      g.fillRect(size - 292, y, 12, 82);
    }

    const map = new THREE.CanvasTexture(cAlb);
    map.wrapS = THREE.RepeatWrapping; map.wrapT = THREE.RepeatWrapping;
    map.repeat.set(1, 14);
    map.encoding = THREE.sRGBEncoding;
    map.anisotropy = 8;

    const bumpMap = new THREE.CanvasTexture(cBump);
    bumpMap.wrapS = THREE.RepeatWrapping; bumpMap.wrapT = THREE.RepeatWrapping;
    bumpMap.repeat.set(1, 14);

    return { map, bumpMap };
  }

  function createBarrelLabelTexture() {
    const c = document.createElement("canvas");
    c.width = 512; c.height = 256;
    const g = c.getContext("2d");
    g.fillStyle = "#dc2626";
    g.fillRect(0, 0, 512, 256);
    // 노란 위험 띠 + 검은 사선
    g.fillStyle = "#facc15";
    g.fillRect(0, 88, 512, 80);
    g.fillStyle = "#111827";
    for (let x = -64; x < 580; x += 48) {
      g.beginPath();
      g.moveTo(x, 88); g.lineTo(x + 24, 88);
      g.lineTo(x + 4, 168); g.lineTo(x - 20, 168);
      g.closePath();
      g.fill();
    }
    // 중앙 화염 아이콘 배지
    g.fillStyle = "#facc15";
    g.fillRect(190, 96, 132, 64);
    g.strokeStyle = "#111827";
    g.lineWidth = 5;
    g.strokeRect(190, 96, 132, 64);
    g.fillStyle = "#dc2626";
    g.font = "900 34px Arial, sans-serif";
    g.textAlign = "center";
    g.textBaseline = "middle";
    g.fillText("TNT", 256, 130);

    const tex = new THREE.CanvasTexture(c);
    tex.encoding = THREE.sRGBEncoding;
    return tex;
  }

  function makeCrateTexture(label, bgHex, accentHex) {
    const c = document.createElement("canvas");
    c.width = 256; c.height = 256;
    const g = c.getContext("2d");
    g.fillStyle = bgHex;
    g.fillRect(0, 0, 256, 256);
    g.strokeStyle = accentHex;
    g.lineWidth = 18;
    g.strokeRect(14, 14, 228, 228);
    g.strokeStyle = "rgba(255,255,255,0.65)";
    g.lineWidth = 4;
    g.strokeRect(32, 32, 192, 192);
    g.fillStyle = "#ffffff";
    g.font = "900 48px Arial, sans-serif";
    g.textAlign = "center";
    g.textBaseline = "middle";
    g.fillText(label, 128, 128);
    const tex = new THREE.CanvasTexture(c);
    tex.encoding = THREE.sRGBEncoding;
    return tex;
  }

  function setupStudioRenderer(renderer, scene) {
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.75));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.outputEncoding = THREE.sRGBEncoding;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.15;

    if (THREE.RoomEnvironment) {
      const pmrem = new THREE.PMREMGenerator(renderer);
      scene.environment = pmrem.fromScene(new THREE.RoomEnvironment(), 0.04).texture;
      pmrem.dispose();
    }

    scene.fog = new THREE.FogExp2(0x9bd5f7, 0.0052);

    const hemi = new THREE.HemisphereLight(0xc2e9ff, 0x26415e, 0.92);
    scene.add(hemi);

    const sun = new THREE.DirectionalLight(0xfff0c8, 1.52);
    sun.position.set(-26, 30, 14);
    sun.castShadow = true;
    sun.shadow.mapSize.width = 2048;
    sun.shadow.mapSize.height = 2048;
    sun.shadow.bias = -0.0005;
    sun.shadow.camera.near = 6;
    sun.shadow.camera.far = 140;
    const d = 38;
    sun.shadow.camera.left = -d;
    sun.shadow.camera.right = d;
    sun.shadow.camera.top = d;
    sun.shadow.camera.bottom = -d;
    scene.add(sun);
    scene.add(sun.target);
    sun.target.position.set(0, 0, -24);

    const rim = new THREE.DirectionalLight(0x7dd3fc, 0.6);
    rim.position.set(22, 16, -28);
    scene.add(rim);

    scene.userData.sunLight = sun;
    return { sun, hemi, rim };
  }

  // 모바일 저사양 기기 60fps 방어용 동적 DPR·그림자·파티클 자동 스케일러
  function createAdaptiveQualityGuard(renderer, scene) {
    const rawDpr = window.devicePixelRatio || 1;
    const tiers = [Math.min(rawDpr, 1.75), Math.min(rawDpr, 1.25), 1.0];
    const pScales = [1.0, 0.65, 0.45];
    let tier = 0;
    let frames = 0;
    let accum = 0;
    let goodWindows = 0;
    const guard = {
      particleScale: 1.0,
      sample(dt) {
        if (dt <= 0 || dt > 0.25) return;
        frames++;
        accum += dt;
        if (accum < 1.2) return;
        const fps = frames / accum;
        frames = 0;
        accum = 0;
        const sun = scene && scene.userData ? scene.userData.sunLight : null;
        if (fps < 42) {
          goodWindows = 0;
          if (tier < tiers.length - 1) {
            tier++;
            renderer.setPixelRatio(tiers[tier]);
            guard.particleScale = pScales[tier];
          } else if (fps < 30 && sun && sun.castShadow) {
            sun.castShadow = false;
            renderer.shadowMap.enabled = false;
          }
        } else if (fps > 55) {
          goodWindows++;
          if (goodWindows >= 2) {
            goodWindows = 0;
            if (sun && !sun.castShadow) {
              sun.castShadow = true;
              renderer.shadowMap.enabled = true;
            } else if (tier > 0) {
              tier--;
              renderer.setPixelRatio(tiers[tier]);
              guard.particleScale = pScales[tier];
            }
          }
        }
      },
    };
    return guard;
  }

  function buildSkyAndOcean(scene) {
    // 1. 골든아워 GLSL 스카이 돔
    const skyMat = new THREE.ShaderMaterial({
      side: THREE.BackSide,
      depthWrite: false,
      uniforms: {
        topColor: { value: new THREE.Color(0x1268cc) },
        midColor: { value: new THREE.Color(0x6ec7ff) },
        horizonColor: { value: new THREE.Color(0xffe5b0) },
        sunDir: { value: new THREE.Vector3(-0.56, 0.28, -0.78).normalize() },
      },
      vertexShader: `
        varying vec3 vWorldPos;
        void main() {
          vec4 wp = modelMatrix * vec4(position, 1.0);
          vWorldPos = wp.xyz;
          gl_Position = projectionMatrix * viewMatrix * wp;
        }
      `,
      fragmentShader: `
        uniform vec3 topColor;
        uniform vec3 midColor;
        uniform vec3 horizonColor;
        uniform vec3 sunDir;
        varying vec3 vWorldPos;
        void main() {
          vec3 dir = normalize(vWorldPos);
          float h = clamp(dir.y, 0.0, 1.0);
          vec3 col = mix(horizonColor, midColor, smoothstep(0.0, 0.24, h));
          col = mix(col, topColor, smoothstep(0.22, 0.85, h));
          float sunDot = max(dot(dir, sunDir), 0.0);
          col += vec3(1.0, 0.88, 0.56) * pow(sunDot, 14.0) * 0.58;
          col += vec3(1.0, 0.98, 0.92) * smoothstep(0.996, 0.9992, sunDot) * 1.45;
          gl_FragColor = vec4(col, 1.0);
        }
      `,
    });
    scene.add(new THREE.Mesh(new THREE.SphereGeometry(280, 24, 18), skyMat));

    // 2. 입체 3D 뭉게구름
    const cloudGroup = new THREE.Group();
    const cloudMat = new THREE.MeshStandardMaterial({
      color: 0xffffff, roughness: 0.92, metalness: 0.0,
      emissive: 0xffe8c2, emissiveIntensity: 0.16,
    });
    const puffGeo = new THREE.SphereGeometry(1, 10, 8);
    for (let i = 0; i < 18; i++) {
      const cg = new THREE.Group();
      const puffs = 3 + (i % 3);
      for (let p = 0; p < puffs; p++) {
        const m = new THREE.Mesh(puffGeo, cloudMat);
        const sc = 3.6 + Math.random() * 4.2;
        m.scale.set(sc * 1.4, sc * 0.72, sc * 0.95);
        m.position.set((p - 1) * 4.5, Math.sin(p) * 1.1, (Math.random() - 0.5) * 2.5);
        cg.add(m);
      }
      cg.position.set((Math.random() - 0.5) * 190, 24 + Math.random() * 24, -45 - Math.random() * 140);
      cloudGroup.add(cg);
    }
    scene.add(cloudGroup);

    // 3. GLSL 일렁이는 햇살 반사 에메랄드 바다 셰이더
    const oceanUniforms = {
      uTime: { value: 0 },
      uDeep: { value: new THREE.Color(0x0369a1) },
      uShallow: { value: new THREE.Color(0x06b6d4) },
      uSunColor: { value: new THREE.Color(0xfff1c1) },
    };
    const oceanMat = new THREE.ShaderMaterial({
      uniforms: oceanUniforms,
      vertexShader: `
        varying vec3 vPos;
        void main() {
          vec4 wp = modelMatrix * vec4(position, 1.0);
          vPos = wp.xyz;
          gl_Position = projectionMatrix * viewMatrix * wp;
        }
      `,
      fragmentShader: `
        uniform float uTime;
        uniform vec3 uDeep;
        uniform vec3 uShallow;
        uniform vec3 uSunColor;
        varying vec3 vPos;
        void main() {
          float w1 = sin(vPos.x * 0.22 + uTime * 1.65) * cos(vPos.z * 0.18 + uTime * 1.15);
          float w2 = sin(vPos.x * 0.48 - uTime * 1.25 + vPos.z * 0.34) * 0.5;
          float wave = (w1 + w2) * 0.5 + 0.5;
          vec3 col = mix(uDeep, uShallow, clamp(wave, 0.0, 1.0));
          float glint = pow(clamp(wave, 0.0, 1.0), 6.0) * smoothstep(85.0, -35.0, vPos.x);
          col += uSunColor * glint * 0.48;
          float distFade = smoothstep(45.0, 210.0, length(vPos.xz));
          col = mix(col, vec3(0.75, 0.90, 0.98), distFade * 0.65);
          gl_FragColor = vec4(col, 1.0);
        }
      `,
    });
    const ocean = new THREE.Mesh(new THREE.PlaneGeometry(420, 420), oceanMat);
    ocean.rotation.x = -Math.PI / 2;
    ocean.position.set(0, -10.5, -50);
    scene.add(ocean);

    // 4. 먼 수평선 산맥 실루엣
    const islandMat = new THREE.MeshStandardMaterial({ color: 0x3b6e8c, roughness: 0.9, metalness: 0.05 });
    for (const [ix, iz, rx, ry] of [[-58, -115, 34, 15], [64, -125, 42, 18], [0, -150, 56, 20]]) {
      const m = new THREE.Mesh(new THREE.ConeGeometry(rx, ry, 7), islandMat);
      m.position.set(ix, -10.5 + ry * 0.45, iz);
      scene.add(m);
    }

    return { cloudGroup, oceanUniforms };
  }

  function buildSuspensionBridge(scene) {
    const group = new THREE.Group();
    const { map, bumpMap } = createAsphaltTextures();

    const roadMat = new THREE.MeshStandardMaterial({
      map, bumpMap, bumpScale: 0.06, roughness: 0.76, metalness: 0.08,
    });
    const deck = new THREE.Mesh(new THREE.BoxGeometry(13.6, 1.1, 130), roadMat);
    deck.position.set(0, -0.55, -36);
    deck.receiveShadow = true;
    group.add(deck);

    // 교량 하부 철골 트러스 프레임
    const steelMat = new THREE.MeshStandardMaterial({ color: 0x334155, roughness: 0.42, metalness: 0.72 });
    const railMat = new THREE.MeshStandardMaterial({ color: 0xcbd5e1, roughness: 0.35, metalness: 0.78 });
    const towerMat = new THREE.MeshStandardMaterial({ color: 0xe2e8f0, roughness: 0.48, metalness: 0.35 });
    const cableMat = new THREE.MeshStandardMaterial({ color: 0xf8fafc, roughness: 0.32, metalness: 0.8 });

    // 좌우 콘크리트 연석 & 강철 가드레일
    for (const sx of [-1, 1]) {
      const curb = new THREE.Mesh(new THREE.BoxGeometry(0.55, 0.42, 130), towerMat);
      curb.position.set(sx * 6.65, 0.21, -36);
      curb.castShadow = true; curb.receiveShadow = true;
      group.add(curb);

      const railTop = new THREE.Mesh(new THREE.CylinderGeometry(0.11, 0.11, 130, 8), railMat);
      railTop.rotation.x = Math.PI / 2;
      railTop.position.set(sx * 6.82, 1.05, -36);
      group.add(railTop);

      const railMid = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.08, 130, 8), railMat);
      railMid.rotation.x = Math.PI / 2;
      railMid.position.set(sx * 6.82, 0.65, -36);
      group.add(railMid);

      // 난간 지주 & 가로등
      for (let z = 20; z >= -95; z -= 6.5) {
        const post = new THREE.Mesh(new THREE.BoxGeometry(0.16, 1.15, 0.16), steelMat);
        post.position.set(sx * 6.82, 0.56, z);
        group.add(post);
      }

      // 포물선 주 현수 케이블 (TubeGeometry)
      const pts = [];
      for (let i = 0; i <= 28; i++) {
        const t = i / 28;
        const z = 18 - t * 116;
        // 두 주탑(z=-18, z=-72) 사이 포물선 처짐
        const d1 = Math.abs(z - (-18));
        const d2 = Math.abs(z - (-72));
        const near = Math.min(d1, d2);
        const y = Math.max(3.6, 21.5 - near * 0.68 + (near * near) * 0.008);
        pts.push(new THREE.Vector3(sx * 7.2, y, z));
      }
      const curve = new THREE.CatmullRomCurve3(pts);
      const cable = new THREE.Mesh(new THREE.TubeGeometry(curve, 36, 0.2, 8, false), cableMat);
      group.add(cable);

      // 수직 행거 케이블
      for (let z = 12; z >= -90; z -= 5.2) {
        const t = (18 - z) / 116;
        if (t <= 0.02 || t >= 0.98) continue;
        const p = curve.getPoint(t);
        const h = p.y - 0.6;
        const hanger = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.045, h, 6), cableMat);
        hanger.position.set(sx * 7.2, 0.6 + h * 0.5, z);
        group.add(hanger);
      }
    }

    // 2개 대형 H형 현수교 주탑 (z=-18, z=-72)
    for (const tz of [-18, -72]) {
      for (const sx of [-1, 1]) {
        const leg = new THREE.Mesh(new THREE.BoxGeometry(1.5, 34, 1.9), towerMat);
        leg.position.set(sx * 7.25, 6.5, tz);
        leg.castShadow = true;
        group.add(leg);

        const cap = new THREE.Mesh(new THREE.BoxGeometry(1.9, 0.9, 2.2), steelMat);
        cap.position.set(sx * 7.25, 23.8, tz);
        group.add(cap);
      }
      for (const cy of [14.5, 21.6]) {
        const beam = new THREE.Mesh(new THREE.BoxGeometry(15.6, 1.35, 1.4), towerMat);
        beam.position.set(0, cy, tz);
        beam.castShadow = true;
        group.add(beam);
      }
    }

    scene.add(group);
    return group;
  }

  /**
   * 28+ 파츠 조각 3D 블루 공격 헬기 건십 (전경 오버더숄더 호버링 + 자동 포탑 조준 + 총구 화염).
   */
  function createAttackHelicopter(flashTex) {
    const root = new THREE.Group();

    const hullBlue = new THREE.MeshStandardMaterial({ color: 0x1d4ed8, roughness: 0.24, metalness: 0.68 });
    const hullLight = new THREE.MeshStandardMaterial({ color: 0x3b82f6, roughness: 0.28, metalness: 0.58 });
    const gunmetal = new THREE.MeshStandardMaterial({ color: 0x334155, roughness: 0.34, metalness: 0.84 });
    const darkMetal = new THREE.MeshStandardMaterial({ color: 0x0f172a, roughness: 0.42, metalness: 0.8 });
    const goldAccent = new THREE.MeshStandardMaterial({ color: 0xfacc15, roughness: 0.22, metalness: 0.88 });
    const canopyMat = new THREE.MeshStandardMaterial({
      color: 0x22d3ee, roughness: 0.08, metalness: 0.92,
      emissive: 0x0284c7, emissiveIntensity: 0.38,
    });
    const redTip = new THREE.MeshStandardMaterial({ color: 0xef4444, roughness: 0.3, metalness: 0.5 });

    // 1. 주 동체 (다단 장갑 실루엣)
    const bodyCore = new THREE.Mesh(new THREE.BoxGeometry(1.55, 1.15, 3.8), hullBlue);
    bodyCore.castShadow = true;
    root.add(bodyCore);

    const upperDeck = new THREE.Mesh(new THREE.BoxGeometry(1.22, 0.52, 2.7), hullLight);
    upperDeck.position.set(0, 0.72, -0.1);
    root.add(upperDeck);

    // 기수 노즈 콘
    const nose = new THREE.Mesh(new THREE.ConeGeometry(0.88, 1.85, 6), hullBlue);
    nose.rotation.x = -Math.PI / 2;
    nose.rotation.z = Math.PI / 6;
    nose.scale.set(0.95, 1, 0.68);
    nose.position.set(0, -0.1, -2.65);
    root.add(nose);

    const sensorPod = new THREE.Mesh(new THREE.SphereGeometry(0.32, 12, 10), gunmetal);
    sensorPod.position.set(0, -0.02, -3.55);
    root.add(sensorPod);

    // 2. 발광 시안 각진 콕핏 글래스
    const canopy = new THREE.Mesh(new THREE.BoxGeometry(1.16, 0.68, 2.05), canopyMat);
    canopy.position.set(0, 0.44, -1.65);
    canopy.rotation.x = 0.24;
    root.add(canopy);

    // 좌우 트윈 터빈 엔진 나셀
    for (const sx of [-1, 1]) {
      const nacelle = new THREE.Mesh(new THREE.CylinderGeometry(0.34, 0.38, 2.0, 12), gunmetal);
      nacelle.rotation.x = Math.PI / 2;
      nacelle.position.set(sx * 0.94, 0.34, 0.2);
      root.add(nacelle);

      const intake = new THREE.Mesh(new THREE.CylinderGeometry(0.24, 0.24, 0.14, 12), darkMetal);
      intake.rotation.x = Math.PI / 2;
      intake.position.set(sx * 0.94, 0.34, -0.82);
      root.add(intake);

      const exhaustGlow = new THREE.Mesh(
        new THREE.CylinderGeometry(0.22, 0.22, 0.14, 10),
        new THREE.MeshBasicMaterial({ color: 0x38bdf8 })
      );
      exhaustGlow.rotation.x = Math.PI / 2;
      exhaustGlow.position.set(sx * 0.94, 0.34, 1.22);
      root.add(exhaustGlow);

      // 스터브 윙 + 윙팁
      const wing = new THREE.Mesh(new THREE.BoxGeometry(2.15, 0.18, 0.95), hullLight);
      wing.position.set(sx * 1.68, -0.08, -0.15);
      wing.rotation.z = -sx * 0.14;
      wing.castShadow = true;
      root.add(wing);

      // 로켓 포드 2기 (윙당 1기 대형 6연장)
      const pod = new THREE.Mesh(new THREE.CylinderGeometry(0.32, 0.32, 1.28, 12), gunmetal);
      pod.rotation.x = Math.PI / 2;
      pod.position.set(sx * 2.05, -0.45, -0.25);
      root.add(pod);

      for (let t = 0; t < 4; t++) {
        const a = (t * Math.PI) / 2 + 0.4;
        const tip = new THREE.Mesh(new THREE.SphereGeometry(0.08, 8, 6), redTip);
        tip.position.set(sx * 2.05 + Math.cos(a) * 0.14, -0.45 + Math.sin(a) * 0.14, -0.9);
        root.add(tip);
      }

      // 착륙 스키드
      const skid = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 2.7, 8), darkMetal);
      skid.rotation.x = Math.PI / 2;
      skid.position.set(sx * 0.85, -0.95, -0.25);
      root.add(skid);
    }

    // 3. 테일 붐 + 수직/수평 미익 + 테일 로터
    const tailBoom = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.52, 3.8, 10), hullBlue);
    tailBoom.rotation.x = Math.PI / 2;
    tailBoom.position.set(0, 0.16, 3.65);
    root.add(tailBoom);

    const tailFin = new THREE.Mesh(new THREE.BoxGeometry(0.16, 1.5, 0.88), hullLight);
    tailFin.position.set(0, 0.82, 5.25);
    tailFin.rotation.x = -0.26;
    root.add(tailFin);

    const tailWing = new THREE.Mesh(new THREE.BoxGeometry(1.75, 0.12, 0.48), hullLight);
    tailWing.position.set(0, 0.25, 4.95);
    root.add(tailWing);

    const tailRotor = new THREE.Group();
    tailRotor.position.set(0.24, 0.98, 5.38);
    const trb1 = new THREE.Mesh(new THREE.BoxGeometry(0.05, 1.3, 0.14), darkMetal);
    const trb2 = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.14, 1.3), darkMetal);
    tailRotor.add(trb1, trb2);
    root.add(tailRotor);

    // 4. 메인 로터 허브 + 4엽 블레이드 + 고속 회전 블러 디스크
    const mast = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.22, 0.72, 10), gunmetal);
    mast.position.set(0, 1.24, -0.15);
    root.add(mast);

    const mainRotor = new THREE.Group();
    mainRotor.position.set(0, 1.56, -0.15);
    const hubCap = new THREE.Mesh(new THREE.CylinderGeometry(0.32, 0.38, 0.22, 12), hullLight);
    mainRotor.add(hubCap);

    for (let i = 0; i < 4; i++) {
      const bladeWrap = new THREE.Group();
      bladeWrap.rotation.y = (i * Math.PI) / 2;
      const blade = new THREE.Mesh(new THREE.BoxGeometry(3.8, 0.05, 0.28), darkMetal);
      blade.position.x = 1.95;
      const tip = new THREE.Mesh(new THREE.BoxGeometry(0.35, 0.06, 0.29), goldAccent);
      tip.position.x = 3.75;
      bladeWrap.add(blade, tip);
      mainRotor.add(bladeWrap);
    }

    const blurDisc = new THREE.Mesh(
      new THREE.CircleGeometry(3.9, 32),
      new THREE.MeshBasicMaterial({
        color: 0xe2e8f0, transparent: true, opacity: 0.18,
        side: THREE.DoubleSide, depthWrite: false,
      })
    );
    blurDisc.rotation.x = -Math.PI / 2;
    blurDisc.position.y = -0.02;
    mainRotor.add(blurDisc);
    root.add(mainRotor);

    // 5. 기수 하부 짐벌 6총열 30mm 발칸 포탑 + 총구 화염
    const turretMount = new THREE.Group();
    turretMount.position.set(0, -0.68, -2.45);
    const turretBase = new THREE.Mesh(new THREE.CylinderGeometry(0.34, 0.34, 0.3, 12), gunmetal);
    turretMount.add(turretBase);

    const gunPivot = new THREE.Group();
    const gunHousing = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.34, 0.65), darkMetal);
    gunPivot.add(gunHousing);

    const barrelSpinner = new THREE.Group();
    barrelSpinner.position.set(0, -0.02, -0.95);
    for (let i = 0; i < 6; i++) {
      const a = (i * Math.PI) / 3;
      const b = new THREE.Mesh(new THREE.CylinderGeometry(0.036, 0.036, 1.38, 6), gunmetal);
      b.rotation.x = Math.PI / 2;
      b.position.set(Math.cos(a) * 0.11, Math.sin(a) * 0.11, 0);
      barrelSpinner.add(b);
    }
    const clampRing = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.16, 0.14, 12), goldAccent);
    clampRing.rotation.x = Math.PI / 2;
    clampRing.position.z = -0.42;
    barrelSpinner.add(clampRing);
    gunPivot.add(barrelSpinner);

    const muzzleFlash = new THREE.Sprite(
      new THREE.SpriteMaterial({
        map: flashTex, color: 0xfff5c0, transparent: true,
        blending: THREE.AdditiveBlending, depthWrite: false,
      })
    );
    muzzleFlash.scale.set(1.65, 1.65, 1);
    muzzleFlash.position.set(0, -0.02, -1.8);
    muzzleFlash.visible = false;
    gunPivot.add(muzzleFlash);

    const muzzleLight = new THREE.PointLight(0xffb703, 0, 12);
    muzzleLight.position.set(0, -0.02, -1.9);
    gunPivot.add(muzzleLight);

    turretMount.add(gunPivot);
    root.add(turretMount);

    root.userData = {
      mainRotor,
      tailRotor,
      gunPivot,
      barrelSpinner,
      muzzleFlash,
      muzzleLight,
      leftPodPos: new THREE.Vector3(-2.05, -0.45, -1.0),
      rightPodPos: new THREE.Vector3(2.05, -0.45, -1.0),
    };
    return root;
  }

  /**
   * 호송 장갑 APC + 곡면 홀로그램 시안 에너지 방벽.
   */
  function createConvoyAndBarrier(scene) {
    const group = new THREE.Group();

    const hullBlue = new THREE.MeshStandardMaterial({ color: 0x1d4ed8, roughness: 0.26, metalness: 0.65 });
    const hullLight = new THREE.MeshStandardMaterial({ color: 0x3b82f6, roughness: 0.3, metalness: 0.55 });
    const darkTire = new THREE.MeshStandardMaterial({ color: 0x111827, roughness: 0.85, metalness: 0.1 });
    const glassMat = new THREE.MeshStandardMaterial({
      color: 0x38bdf8, roughness: 0.1, metalness: 0.9,
      emissive: 0x0ea5e9, emissiveIntensity: 0.35,
    });
    const glowCyan = new THREE.MeshBasicMaterial({ color: 0x67e8f9 });

    function buildAPC(x, z, rotY) {
      const apc = new THREE.Group();
      const body = new THREE.Mesh(new THREE.BoxGeometry(2.35, 1.15, 4.4), hullBlue);
      body.position.y = 1.0; body.castShadow = true; body.receiveShadow = true;
      apc.add(body);

      const cabin = new THREE.Mesh(new THREE.BoxGeometry(2.05, 0.72, 2.35), hullLight);
      cabin.position.set(0, 1.85, -0.1); cabin.castShadow = true;
      apc.add(cabin);

      const windshield = new THREE.Mesh(new THREE.BoxGeometry(1.75, 0.45, 0.18), glassMat);
      windshield.position.set(0, 1.82, -1.26);
      windshield.rotation.x = -0.22;
      apc.add(windshield);

      const roofTurret = new THREE.Mesh(new THREE.CylinderGeometry(0.45, 0.56, 0.42, 10), hullBlue);
      roofTurret.position.set(0, 2.4, 0.1);
      apc.add(roofTurret);

      const beacon = new THREE.Mesh(new THREE.SphereGeometry(0.18, 10, 8), glowCyan);
      beacon.position.set(0, 2.7, 0.1);
      apc.add(beacon);

      for (const sx of [-1, 1]) {
        const hl = new THREE.Mesh(new THREE.BoxGeometry(0.38, 0.22, 0.14), glowCyan);
        hl.position.set(sx * 0.78, 1.05, -2.22);
        apc.add(hl);
        for (const wz of [-1.4, 0.0, 1.4]) {
          const wheel = new THREE.Mesh(new THREE.CylinderGeometry(0.56, 0.56, 0.42, 14), darkTire);
          wheel.rotation.z = Math.PI / 2;
          wheel.position.set(sx * 1.24, 0.56, wz);
          wheel.castShadow = true;
          apc.add(wheel);
        }
      }
      apc.position.set(x, 0, z);
      apc.rotation.y = rotY;
      return apc;
    }

    group.add(buildAPC(2.4, 10.6, -0.14));
    group.add(buildAPC(-2.7, 11.4, 0.12));

    // 시안 홀로그램 에너지 방벽 (GLSL 육각/스캔라인 셰이더)
    const barrierUniforms = {
      uTime: { value: 0 },
      uHit: { value: 0 },
      uHealth: { value: 1.0 },
    };
    const barrierMat = new THREE.ShaderMaterial({
      transparent: true,
      side: THREE.DoubleSide,
      depthWrite: false,
      uniforms: barrierUniforms,
      vertexShader: `
        varying vec2 vUv;
        void main() {
          vUv = uv;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: `
        uniform float uTime;
        uniform float uHit;
        uniform float uHealth;
        varying vec2 vUv;
        void main() {
          float gridX = abs(fract(vUv.x * 16.0) - 0.5);
          float gridY = abs(fract(vUv.y * 5.0 - uTime * 0.45) - 0.5);
          float line = smoothstep(0.43, 0.49, max(gridX, gridY));
          float edge = smoothstep(0.0, 0.12, vUv.y) * smoothstep(1.0, 0.82, vUv.y);
          float border = smoothstep(0.86, 0.99, vUv.y) + smoothstep(0.14, 0.01, vUv.y);
          vec3 safeCol = vec3(0.18, 0.86, 1.0);
          vec3 warnCol = vec3(1.0, 0.35, 0.25);
          vec3 base = mix(warnCol, safeCol, clamp(uHealth, 0.0, 1.0));
          base = mix(base, vec3(1.0, 0.95, 0.85), uHit * 0.8);
          float alpha = (0.22 + line * 0.38 + border * 0.48 + uHit * 0.35) * (0.45 + 0.55 * edge);
          gl_FragColor = vec4(base, clamp(alpha, 0.0, 0.88));
        }
      `,
    });
    const barrier = new THREE.Mesh(new THREE.BoxGeometry(12.6, 2.7, 0.28), barrierMat);
    barrier.position.set(0, 1.38, 6.2);
    group.add(barrier);

    // 방벽 양쪽 발전기 파일런
    const pylonMat = new THREE.MeshStandardMaterial({ color: 0x1e3a8a, roughness: 0.3, metalness: 0.75 });
    for (const sx of [-1, 1]) {
      const py = new THREE.Mesh(new THREE.CylinderGeometry(0.42, 0.55, 2.8, 10), pylonMat);
      py.position.set(sx * 6.3, 1.4, 6.2);
      py.castShadow = true;
      group.add(py);
      const orb = new THREE.Mesh(new THREE.SphereGeometry(0.32, 10, 8), glowCyan);
      orb.position.set(sx * 6.3, 2.95, 6.2);
      group.add(orb);
    }

    scene.add(group);
    return { group, barrier, barrierUniforms };
  }

  /**
   * 3D 연쇄 폭발 레드 연료통 (금속 리브 + 노란 위험 띠 + 바닥 펄스 링).
   */
  function createExplosiveBarrel(barrelTex) {
    const g = new THREE.Group();
    const drumMat = new THREE.MeshStandardMaterial({ map: barrelTex, roughness: 0.36, metalness: 0.58 });
    const rimMat = new THREE.MeshStandardMaterial({ color: 0x991b1b, roughness: 0.32, metalness: 0.78 });

    const body = new THREE.Mesh(new THREE.CylinderGeometry(0.68, 0.68, 1.85, 16), drumMat);
    body.position.y = 0.92; body.castShadow = true; body.receiveShadow = true;
    g.add(body);

    for (const ry of [0.22, 0.92, 1.65, 1.84]) {
      const ring = new THREE.Mesh(new THREE.TorusGeometry(0.69, 0.055, 8, 18), rimMat);
      ring.rotation.x = Math.PI / 2;
      ring.position.y = ry;
      g.add(ring);
    }

    const pulseRing = new THREE.Mesh(
      new THREE.RingGeometry(0.86, 1.12, 24),
      new THREE.MeshBasicMaterial({ color: 0xf97316, side: THREE.DoubleSide, transparent: true, opacity: 0.78 })
    );
    pulseRing.rotation.x = -Math.PI / 2;
    pulseRing.position.y = 0.06;
    g.add(pulseRing);

    g.userData = { pulseRing };
    return g;
  }

  /**
   * 공중 투하 홀로그램 보급 크레이트 (+ROF / ROCKET / SHIELD).
   */
  function createSupplyCrate(kind) {
    const mapCfg = {
      overdrive: ["⚡2X", "#0284c7", "#38bdf8", 0x38bdf8],
      rockets: ["🚀POD", "#d97706", "#fde047", 0xfacc15],
      shield: ["🛡️+35", "#059669", "#4ade80", 0x4ade80],
    }[kind] || ["⚡2X", "#0284c7", "#38bdf8", 0x38bdf8];

    const g = new THREE.Group();
    const tex = makeCrateTexture(mapCfg[0], mapCfg[1], mapCfg[2]);
    const box = new THREE.Mesh(
      new THREE.BoxGeometry(1.45, 1.45, 1.45),
      new THREE.MeshStandardMaterial({
        map: tex, roughness: 0.25, metalness: 0.45,
        emissive: mapCfg[3], emissiveIntensity: 0.28,
      })
    );
    box.position.y = 1.15;
    box.castShadow = true;
    g.add(box);

    const halo = new THREE.Mesh(
      new THREE.RingGeometry(1.05, 1.32, 24),
      new THREE.MeshBasicMaterial({ color: mapCfg[3], side: THREE.DoubleSide, transparent: true, opacity: 0.8 })
    );
    halo.rotation.x = -Math.PI / 2;
    halo.position.y = 0.07;
    g.add(halo);

    g.userData = { box, halo };
    return g;
  }

  /**
   * 다중 파츠 3D 크림슨 적군 (돌격병 / 방패 브루트 / 장갑 공성차 / 거대 스파이크 메카 보스).
   */
  function createEnemyModel(type) {
    const g = new THREE.Group();
    const armorRed = new THREE.MeshStandardMaterial({ color: 0xdc2626, roughness: 0.34, metalness: 0.56 });
    const armorDark = new THREE.MeshStandardMaterial({ color: 0x450a0a, roughness: 0.46, metalness: 0.62 });
    const gunmetal = new THREE.MeshStandardMaterial({ color: 0x334155, roughness: 0.35, metalness: 0.82 });
    const eyeGlow = new THREE.MeshBasicMaterial({ color: 0xfef08a });
    const coreGlow = new THREE.MeshBasicMaterial({ color: 0xf97316 });

    if (type === "boss") {
      // 거대 스파이크 크림슨 메카 보스
      const torso = new THREE.Mesh(new THREE.BoxGeometry(3.2, 2.8, 2.2), armorRed);
      torso.position.y = 4.1; torso.castShadow = true;
      g.add(torso);

      const reactor = new THREE.Mesh(new THREE.SphereGeometry(0.68, 14, 12), coreGlow);
      reactor.position.set(0, 4.1, 1.05);
      g.add(reactor);

      const head = new THREE.Mesh(new THREE.BoxGeometry(1.4, 1.15, 1.3), armorDark);
      head.position.set(0, 6.0, 0.25);
      g.add(head);

      for (const sx of [-1, 1]) {
        const eye = new THREE.Mesh(new THREE.BoxGeometry(0.32, 0.18, 0.14), eyeGlow);
        eye.position.set(sx * 0.34, 6.08, 0.92);
        g.add(eye);

        // 스파이크 숄더 아머
        const pauldron = new THREE.Mesh(new THREE.SphereGeometry(1.02, 12, 10), armorRed);
        pauldron.position.set(sx * 2.25, 5.05, 0);
        pauldron.castShadow = true;
        g.add(pauldron);

        for (let sp = 0; sp < 3; sp++) {
          const spike = new THREE.Mesh(new THREE.ConeGeometry(0.22, 0.92, 6), gunmetal);
          spike.position.set(sx * (2.55 + sp * 0.16), 5.8 + (sp === 1 ? 0.25 : 0), (sp - 1) * 0.45);
          spike.rotation.z = -sx * 0.48;
          g.add(spike);
        }

        const arm = new THREE.Mesh(new THREE.BoxGeometry(0.95, 2.6, 1.05), armorDark);
        arm.position.set(sx * 2.45, 3.25, 0.35);
        arm.castShadow = true;
        g.add(arm);

        const leg = new THREE.Mesh(new THREE.BoxGeometry(1.12, 2.75, 1.25), armorDark);
        leg.position.set(sx * 0.98, 1.38, 0);
        leg.castShadow = true;
        g.add(leg);
      }
      g.userData = { hitRadius: 2.5, height: 6.5 };
      return g;
    }

    if (type === "ram") {
      // 붉은 장갑 공성 트럭
      const chassis = new THREE.Mesh(new THREE.BoxGeometry(2.15, 1.1, 3.4), armorDark);
      chassis.position.y = 0.88; chassis.castShadow = true;
      g.add(chassis);
      const hood = new THREE.Mesh(new THREE.BoxGeometry(1.9, 0.7, 1.9), armorRed);
      hood.position.set(0, 1.65, -0.35); hood.castShadow = true;
      g.add(hood);
      // 전면 스파이크 램
      const plow = new THREE.Mesh(new THREE.ConeGeometry(1.25, 1.1, 4), gunmetal);
      plow.rotation.x = Math.PI / 2; plow.rotation.y = Math.PI / 4;
      plow.position.set(0, 0.85, 2.05);
      g.add(plow);
      for (const sx of [-1, 1]) {
        for (const wz of [-1.1, 1.05]) {
          const w = new THREE.Mesh(new THREE.CylinderGeometry(0.5, 0.5, 0.38, 10), gunmetal);
          w.rotation.z = Math.PI / 2;
          w.position.set(sx * 1.15, 0.5, wz);
          g.add(w);
        }
      }
      g.userData = { hitRadius: 1.55, height: 2.3 };
      return g;
    }

    // 보병 (rusher / brute)
    const sc = type === "brute" ? 1.38 : 1.0;
    const torso = new THREE.Mesh(new THREE.BoxGeometry(0.72, 0.84, 0.48), armorRed);
    torso.position.y = 1.22; torso.castShadow = true;
    g.add(torso);

    const head = new THREE.Mesh(new THREE.SphereGeometry(0.32, 10, 8), armorDark);
    head.position.y = 1.88;
    g.add(head);

    const visor = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.14, 0.2), eyeGlow);
    visor.position.set(0, 1.9, 0.22);
    g.add(visor);

    const leftLeg = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.72, 0.26), armorDark);
    leftLeg.position.set(-0.2, 0.42, 0);
    const rightLeg = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.72, 0.26), armorDark);
    rightLeg.position.set(0.2, 0.42, 0);
    g.add(leftLeg, rightLeg);

    if (type === "brute") {
      const shield = new THREE.Mesh(new THREE.BoxGeometry(0.95, 1.35, 0.18), gunmetal);
      shield.position.set(0.28, 1.18, 0.46);
      shield.castShadow = true;
      g.add(shield);
    }

    g.scale.setScalar(sc);
    g.userData = { leftLeg, rightLeg, hitRadius: 0.72 * sc, height: 2.2 * sc };
    return g;
  }

  /**
   * 3D 바닥 레이저 조준 십자선 (연료통/보스 락온 시 오렌지-골드 변색).
   */
  function createCrosshair3D() {
    const g = new THREE.Group();
    const outerMat = new THREE.MeshBasicMaterial({ color: 0x38bdf8, side: THREE.DoubleSide, transparent: true, opacity: 0.92 });
    const innerMat = new THREE.MeshBasicMaterial({ color: 0xfef08a, side: THREE.DoubleSide, transparent: true, opacity: 0.95 });

    const outer = new THREE.Mesh(new THREE.RingGeometry(1.18, 1.42, 28), outerMat);
    outer.rotation.x = -Math.PI / 2;
    outer.position.y = 0.09;
    g.add(outer);

    const inner = new THREE.Mesh(new THREE.RingGeometry(0.22, 0.38, 20), innerMat);
    inner.rotation.x = -Math.PI / 2;
    inner.position.y = 0.1;
    g.add(inner);

    const ticks = new THREE.Group();
    ticks.position.y = 0.1;
    for (let i = 0; i < 4; i++) {
      const a = (i * Math.PI) / 2;
      const tick = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.04, 0.56), innerMat);
      tick.position.set(Math.sin(a) * 1.48, 0, Math.cos(a) * 1.48);
      tick.rotation.y = a;
      ticks.add(tick);
    }
    g.add(ticks);

    g.userData = { outer, inner, ticks, outerMat };
    return g;
  }

  global.ValusHeliArt3D = {
    makeRadialTexture,
    makeStarFlashTexture,
    createBarrelLabelTexture,
    setupStudioRenderer,
    createAdaptiveQualityGuard,
    buildSkyAndOcean,
    buildSuspensionBridge,
    createAttackHelicopter,
    createConvoyAndBarrier,
    createExplosiveBarrel,
    createSupplyCrate,
    createEnemyModel,
    createCrosshair3D,
  };
})(window);

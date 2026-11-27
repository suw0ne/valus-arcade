/**
 * 밸루스 아케이드 3D 스튜디오 PBR 아트·모델링·셰이더 엔진 (art_engine.js).
 * - ACESFilmic 톤매핑 + RoomEnvironment IBL 금속 반사 + 2048 소프트 그림자
 * - 골든아워 GLSL 스카이 돔 + 볼류메트릭 태양 + 입체 구름 + 파도 GLSL 바다 셰이더
 * - 실제 포물선 현수 케이블(TubeGeometry)이 아치를 그리는 현수교 + 1024px 아스팔트 범프 텍스처
 * - 20+ 파츠 조각 3D 블루 장갑 병사(곡면 숄더 패드·발광 바이저·6총열 골든 미니건·총구 화염),
 *   장갑 전술 탱크(궤도·바퀴 10개·포탑), 조각 좀비, 거대 크림슨 타이탄 보스, 네온 프레임 홀로그램 게이트.
 */
(function (global) {
  function makeRadialTexture(innerColor, midColor, outerColor, size = 128) {
    const c = document.createElement("canvas");
    c.width = size; c.height = size;
    const g = c.getContext("2d");
    const r = size / 2;
    const grad = g.createRadialGradient(r, r, 2, r, r, r);
    grad.addColorStop(0, innerColor);
    grad.addColorStop(0.45, midColor);
    grad.addColorStop(1, outerColor);
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
    grad.addColorStop(0.28, "rgba(254,240,138,0.95)");
    grad.addColorStop(0.6, "rgba(249,115,22,0.55)");
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

    // 햇빛 받은 따뜻한 슬레이트 아스팔트 베이스
    g.fillStyle = "#475569";
    g.fillRect(0, 0, size, size);
    gb.fillStyle = "#808080";
    gb.fillRect(0, 0, size, size);

    // 타이어 주행 흔적 (어두운 4개 레인 트랙)
    g.fillStyle = "rgba(30, 41, 59, 0.28)";
    for (const tx of [185, 345, 675, 835]) {
      g.fillRect(tx - 46, 0, 92, size);
    }

    // 미세 아스팔트 자갈 노이즈 (알베도 + 범프 동시)
    for (let i = 0; i < 14000; i++) {
      const x = Math.random() * size;
      const y = Math.random() * size;
      const s = 1.5 + Math.random() * 2.5;
      const v = 54 + Math.floor(Math.random() * 44);
      g.fillStyle = `rgb(${v},${v + 8},${v + 18})`;
      g.fillRect(x, y, s, s);
      const bv = 90 + Math.floor(Math.random() * 80);
      gb.fillStyle = `rgb(${bv},${bv},${bv})`;
      gb.fillRect(x, y, s, s);
    }

    // 좌우 콘크리트 갓길 보도
    g.fillStyle = "#94a3b8";
    g.fillRect(0, 0, 56, size);
    g.fillRect(size - 56, 0, 56, size);
    g.fillStyle = "#e2e8f0";
    g.fillRect(54, 0, 12, size);
    g.fillRect(size - 66, 0, 12, size);

    // 중앙 노란 이중 실선 + 좌우 백색 점선
    g.fillStyle = "#facc15";
    g.fillRect(size / 2 - 14, 0, 10, size);
    g.fillRect(size / 2 + 4, 0, 10, size);
    g.fillStyle = "rgba(248, 250, 252, 0.92)";
    for (let y = 24; y < size; y += 160) {
      g.fillRect(280, y, 12, 86);
      g.fillRect(size - 292, y, 12, 86);
    }

    const map = new THREE.CanvasTexture(cAlb);
    map.wrapS = THREE.RepeatWrapping; map.wrapT = THREE.RepeatWrapping;
    map.repeat.set(1, 20);
    map.encoding = THREE.sRGBEncoding;
    map.anisotropy = 8;

    const bumpMap = new THREE.CanvasTexture(cBump);
    bumpMap.wrapS = THREE.RepeatWrapping; bumpMap.wrapT = THREE.RepeatWrapping;
    bumpMap.repeat.set(1, 20);

    return { map, bumpMap };
  }

  function setupStudioRenderer(renderer, scene) {
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.outputEncoding = THREE.sRGBEncoding;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.14;

    // 스튜디오 IBL 반사맵 (곡면 파란 갑옷·탱크·금속 미니건에 상용급 하이라이트 부여!)
    if (THREE.RoomEnvironment) {
      const pmrem = new THREE.PMREMGenerator(renderer);
      scene.environment = pmrem.fromScene(new THREE.RoomEnvironment(), 0.04).texture;
      pmrem.dispose();
    }

    // 따뜻한 골든아워 대기 안개
    scene.fog = new THREE.FogExp2(0x9ad4f5, 0.0058);

    // 3점 스튜디오 야외 조명 (하늘 반사광 + 골든 태양광 + 웜 림라이트)
    const hemi = new THREE.HemisphereLight(0xbbe6ff, 0x2a4563, 0.88);
    scene.add(hemi);

    const sun = new THREE.DirectionalLight(0xfff1d0, 1.48);
    sun.position.set(-24, 28, 16);
    sun.castShadow = true;
    sun.shadow.mapSize.width = 2048;
    sun.shadow.mapSize.height = 2048;
    sun.shadow.bias = -0.0005;
    sun.shadow.camera.near = 6;
    sun.shadow.camera.far = 125;
    const d = 26;
    sun.shadow.camera.left = -d;
    sun.shadow.camera.right = d;
    sun.shadow.camera.top = d;
    sun.shadow.camera.bottom = -d;
    scene.add(sun);
    scene.add(sun.target);

    const rim = new THREE.DirectionalLight(0x7dd3fc, 0.55);
    rim.position.set(20, 14, -22);
    scene.add(rim);

    return { sun, hemi, rim };
  }

  function buildSkyAndOcean(scene) {
    // 1. 커스텀 GLSL 골든아워 스카이 돔 (단색 배경 완전 탈피!)
    const skyMat = new THREE.ShaderMaterial({
      side: THREE.BackSide,
      depthWrite: false,
      uniforms: {
        topColor: { value: new THREE.Color(0x1673d6) },
        midColor: { value: new THREE.Color(0x6ec6ff) },
        horizonColor: { value: new THREE.Color(0xffe6b3) },
        sunDir: { value: new THREE.Vector3(-0.55, 0.32, -0.76).normalize() },
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
          col += vec3(1.0, 0.88, 0.58) * pow(sunDot, 16.0) * 0.55;
          col += vec3(1.0, 0.98, 0.9) * smoothstep(0.996, 0.9992, sunDot) * 1.4;
          gl_FragColor = vec4(col, 1.0);
        }
      `,
    });
    const skyDome = new THREE.Mesh(new THREE.SphereGeometry(260, 24, 18), skyMat);
    scene.add(skyDome);

    // 2. 입체 3D 뭉게구름
    const cloudGroup = new THREE.Group();
    const cloudMat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.92, metalness: 0.0, emissive: 0xffe8c2, emissiveIntensity: 0.14 });
    const puffGeo = new THREE.SphereGeometry(1, 10, 8);
    for (let i = 0; i < 16; i++) {
      const cg = new THREE.Group();
      const puffs = 3 + (i % 3);
      for (let p = 0; p < puffs; p++) {
        const m = new THREE.Mesh(puffGeo, cloudMat);
        const sc = 3.2 + Math.random() * 3.8;
        m.scale.set(sc * 1.35, sc * 0.72, sc * 0.95);
        m.position.set((p - 1) * 4.2, Math.sin(p) * 1.1, (Math.random() - 0.5) * 2.5);
        cg.add(m);
      }
      cg.position.set((Math.random() - 0.5) * 180, 26 + Math.random() * 24, -40 - Math.random() * 140);
      cloudGroup.add(cg);
    }
    scene.add(cloudGroup);

    // 3. GLSL 일렁이는 햇살 반사 바다 셰이더
    const oceanUniforms = {
      uTime: { value: 0 },
      uDeep: { value: new THREE.Color(0x0369a1) },
      uShallow: { value: new THREE.Color(0x0ea5e9) },
      uSunColor: { value: new THREE.Color(0xfff1c1) },
    };
    const oceanMat = new THREE.ShaderMaterial({
      uniforms: oceanUniforms,
      vertexShader: `
        varying vec2 vUv;
        varying vec3 vPos;
        void main() {
          vUv = uv;
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
        varying vec2 vUv;
        varying vec3 vPos;
        void main() {
          float w1 = sin(vPos.x * 0.24 + uTime * 1.6) * cos(vPos.z * 0.18 + uTime * 1.1);
          float w2 = sin(vPos.x * 0.52 - uTime * 1.2 + vPos.z * 0.35) * 0.5;
          float wave = (w1 + w2) * 0.5 + 0.5;
          vec3 col = mix(uDeep, uShallow, wave * 0.75);
          // 왼쪽 골든아워 태양 빛 반사 경로
          float sunPath = exp(-pow((vPos.x + 36.0) * 0.025, 2.0));
          float sparkle = smoothstep(0.74, 0.98, wave) * sunPath;
          col += uSunColor * (sparkle * 0.85 + sunPath * 0.18);
          float distFade = smoothstep(45.0, 210.0, length(vPos.xz));
          col = mix(col, vec3(0.68, 0.86, 0.98), distFade * 0.85);
          gl_FragColor = vec4(col, 1.0);
        }
      `,
    });
    const ocean = new THREE.Mesh(new THREE.PlaneGeometry(460, 460), oceanMat);
    ocean.rotation.x = -Math.PI / 2;
    ocean.position.set(0, -6.2, -135);
    scene.add(ocean);

    return {
      update(dt, elapsed) {
        oceanUniforms.uTime.value = elapsed;
        for (const cg of cloudGroup.children) {
          cg.position.x += dt * 0.9;
          if (cg.position.x > 105) cg.position.x = -105;
        }
      },
    };
  }

  function buildSuspensionBridge(scene, roadW, bridgeLen) {
    const group = new THREE.Group();
    scene.add(group);

    const { map: roadMap, bumpMap: roadBump } = createAsphaltTextures();
    const deckMat = new THREE.MeshStandardMaterial({
      map: roadMap,
      bumpMap: roadBump,
      bumpScale: 0.04,
      roughness: 0.78,
      metalness: 0.06,
    });
    const deck = new THREE.Mesh(new THREE.BoxGeometry(roadW, 1.4, bridgeLen), deckMat);
    deck.position.set(0, -0.7, -bridgeLen / 2 + 30);
    deck.receiveShadow = true;
    group.add(deck);

    // 입체 콘크리트 가드레일 + 상단 스테인리스 파이프 난간
    const concreteMat = new THREE.MeshStandardMaterial({ color: 0xcbd5e1, roughness: 0.65, metalness: 0.08 });
    const steelMat = new THREE.MeshStandardMaterial({ color: 0xe2e8f0, roughness: 0.25, metalness: 0.8 });
    const towerMat = new THREE.MeshStandardMaterial({ color: 0x64748b, roughness: 0.42, metalness: 0.45 });
    const cableMat = new THREE.MeshStandardMaterial({ color: 0x94a3b8, roughness: 0.3, metalness: 0.78 });

    for (const side of [-1, 1]) {
      const curb = new THREE.Mesh(new THREE.BoxGeometry(0.75, 0.95, bridgeLen), concreteMat);
      curb.position.set(side * (roadW / 2 + 0.3), 0.35, -bridgeLen / 2 + 30);
      curb.castShadow = true; curb.receiveShadow = true;
      group.add(curb);

      const topRail = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.08, bridgeLen, 8), steelMat);
      topRail.rotation.x = Math.PI / 2;
      topRail.position.set(side * (roadW / 2 + 0.38), 1.18, -bridgeLen / 2 + 30);
      group.add(topRail);
    }

    // 반복 세그먼트: 웅장한 H형 현수교 주탑 + 포물선 메인 케이블(TubeGeometry) + 수직 행거 + 가로등!
    const segLen = 56;
    const segments = [];
    for (let s = 0; s < 5; s++) {
      const seg = new THREE.Group();

      // 주탑 (좌/우 테이퍼드 기둥 + 상단 아치 가로보)
      for (const side of [-1, 1]) {
        const px = side * (roadW / 2 + 1.05);
        const shaft = new THREE.Mesh(new THREE.CylinderGeometry(0.52, 0.72, 24, 8), towerMat);
        shaft.position.set(px, 9.5, 0);
        shaft.castShadow = true;
        seg.add(shaft);

        const cap = new THREE.Mesh(new THREE.BoxGeometry(1.3, 0.8, 1.3), steelMat);
        cap.position.set(px, 21.6, 0);
        seg.add(cap);

        // 포물선 주 케이블 (현재 주탑 꼭대기 → 다음 주탑 꼭대기로 우아하게 늘어지는 현수 곡선!)
        const curve = new THREE.CatmullRomCurve3([
          new THREE.Vector3(px, 20.8, 0),
          new THREE.Vector3(px, 11.4, -segLen * 0.25),
          new THREE.Vector3(px, 7.6, -segLen * 0.5),
          new THREE.Vector3(px, 11.4, -segLen * 0.75),
          new THREE.Vector3(px, 20.8, -segLen),
        ]);
        const cable = new THREE.Mesh(new THREE.TubeGeometry(curve, 24, 0.22, 8, false), cableMat);
        seg.add(cable);

        // 수직 행거 로프 6개 + 가로등 기둥
        for (let k = 1; k <= 5; k++) {
          const tFrac = k / 6;
          const pt = curve.getPoint(tFrac);
          const rodH = Math.max(1, pt.y - 0.8);
          const rod = new THREE.Mesh(new THREE.CylinderGeometry(0.055, 0.055, rodH, 6), steelMat);
          rod.position.set(px, 0.8 + rodH / 2, pt.z);
          seg.add(rod);
        }

        // 중간 가로등
        const lampPole = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.11, 5.4, 8), steelMat);
        lampPole.position.set(side * (roadW / 2 + 0.52), 2.7, -segLen * 0.5);
        const lampArm = new THREE.Mesh(new THREE.BoxGeometry(1.1, 0.12, 0.14), steelMat);
        lampArm.position.set(side * (roadW / 2 + 0.05), 5.35, -segLen * 0.5);
        const lampBulb = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.12, 0.2), new THREE.MeshBasicMaterial({ color: 0xfffbeb }));
        lampBulb.position.set(side * (roadW / 2 - 0.3), 5.26, -segLen * 0.5);
        seg.add(lampPole, lampArm, lampBulb);
      }

      // 주탑 상단 가로보 2단
      const beamTop = new THREE.Mesh(new THREE.BoxGeometry(roadW + 2.4, 1.15, 0.95), towerMat);
      beamTop.position.set(0, 19.6, 0);
      const beamMid = new THREE.Mesh(new THREE.BoxGeometry(roadW + 2.3, 0.85, 0.85), towerMat);
      beamMid.position.set(0, 13.8, 0);
      seg.add(beamTop, beamMid);

      seg.position.z = -s * segLen;
      group.add(seg);
      segments.push(seg);
    }

    return {
      roadMap,
      roadBump,
      scroll(dz) {
        roadMap.offset.y -= dz / 16.0;
        roadBump.offset.y = roadMap.offset.y;
        for (const seg of segments) {
          seg.position.z += dz;
          if (seg.position.z > segLen) seg.position.z -= segLen * segments.length;
        }
      },
    };
  }

  // ==================== 고퀄리티 PBR 재질 & 공유 지오메트리 ====================
  function createArtLibrary() {
    const shadowTex = makeRadialTexture("rgba(15,23,42,0.52)", "rgba(15,23,42,0.22)", "rgba(15,23,42,0)");
    const flashTex = makeStarFlashTexture();

    const mats = {
      armorBlue: new THREE.MeshStandardMaterial({ color: 0x1d68e8, roughness: 0.24, metalness: 0.62 }),
      armorBlueDark: new THREE.MeshStandardMaterial({ color: 0x13387d, roughness: 0.34, metalness: 0.55 }),
      armorTrim: new THREE.MeshStandardMaterial({ color: 0x0f172a, roughness: 0.45, metalness: 0.65 }),
      visorCyan: new THREE.MeshStandardMaterial({ color: 0x7dd3fc, emissive: 0x38bdf8, emissiveIntensity: 1.4, roughness: 0.1, metalness: 0.3 }),
      gunSteel: new THREE.MeshStandardMaterial({ color: 0x334155, roughness: 0.28, metalness: 0.85 }),
      gunGold: new THREE.MeshStandardMaterial({ color: 0xfacc15, roughness: 0.2, metalness: 0.88, emissive: 0xb45309, emissiveIntensity: 0.22 }),
      skin: new THREE.MeshStandardMaterial({ color: 0xfdba74, roughness: 0.68, metalness: 0.05 }),

      zombieSkin: new THREE.MeshStandardMaterial({ color: 0x65a30d, roughness: 0.58, metalness: 0.08 }),
      zombieCloth: new THREE.MeshStandardMaterial({ color: 0x3f4f28, roughness: 0.78, metalness: 0.1 }),
      zombieLeather: new THREE.MeshStandardMaterial({ color: 0x451a03, roughness: 0.65, metalness: 0.15 }),
      bruteCrimson: new THREE.MeshStandardMaterial({ color: 0xb91c1c, roughness: 0.28, metalness: 0.55 }),
      bossArmor: new THREE.MeshStandardMaterial({ color: 0x991b1b, roughness: 0.26, metalness: 0.68 }),
      bossSteel: new THREE.MeshStandardMaterial({ color: 0x475569, roughness: 0.32, metalness: 0.8 }),
      glowAmber: new THREE.MeshBasicMaterial({ color: 0xfef08a }),
      hitFlash: new THREE.MeshBasicMaterial({ color: 0xffffff }),

      barrelRed: new THREE.MeshStandardMaterial({ color: 0xdc2626, roughness: 0.28, metalness: 0.5 }),
      barrelGold: new THREE.MeshStandardMaterial({ color: 0xf59e0b, roughness: 0.22, metalness: 0.78 }),
      barrelHoop: new THREE.MeshStandardMaterial({ color: 0xe2e8f0, roughness: 0.25, metalness: 0.85 }),
      pillarMetal: new THREE.MeshStandardMaterial({ color: 0x334155, roughness: 0.3, metalness: 0.82 }),

      shadowDisc: new THREE.MeshBasicMaterial({ map: shadowTex, transparent: true, depthWrite: false }),
      muzzleFlash: new THREE.MeshBasicMaterial({ map: flashTex, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide }),
      tracerNormal: new THREE.MeshBasicMaterial({ color: 0xfef08a }),
      tracerPlasma: new THREE.MeshBasicMaterial({ color: 0x38bdf8 }),
      tracerRocket: new THREE.MeshBasicMaterial({ color: 0xf97316 }),
    };

    const geos = {
      shadowPlane: new THREE.PlaneGeometry(1.15, 1.15),
      capsuleLimb: new THREE.CapsuleGeometry(0.11, 0.22, 4, 8),
      boot: new THREE.BoxGeometry(0.2, 0.16, 0.3),
      torso: new THREE.CylinderGeometry(0.28, 0.22, 0.54, 8),
      chestPlate: new THREE.BoxGeometry(0.48, 0.36, 0.34),
      pauldron: new THREE.SphereGeometry(0.21, 10, 8),
      helmet: new THREE.SphereGeometry(0.26, 12, 10),
      visor: new THREE.CylinderGeometry(0.245, 0.245, 0.13, 12, 1, true, -Math.PI * 0.42, Math.PI * 0.84),
      backpack: new THREE.BoxGeometry(0.32, 0.38, 0.2),
      flashPlane: new THREE.PlaneGeometry(0.85, 0.85),
      tracer: new THREE.CylinderGeometry(0.055, 0.085, 1.5, 6),
      shell: new THREE.SphereGeometry(0.3, 10, 10),
      shard: new THREE.DodecahedronGeometry(0.18, 0),
    };
    geos.tracer.rotateX(Math.PI / 2);

    function createMinigunMesh(isGold = true) {
      const wg = new THREE.Group();
      const m = isGold ? mats.gunGold : mats.gunSteel;
      const body = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.15, 0.46, 10), m);
      body.rotation.x = Math.PI / 2;
      wg.add(body);
      // 6개 회전 총열
      const barrels = new THREE.Group();
      const bGeo = new THREE.CylinderGeometry(0.028, 0.028, 0.72, 6);
      bGeo.rotateX(Math.PI / 2);
      for (let i = 0; i < 6; i++) {
        const a = (i / 6) * Math.PI * 2;
        const b = new THREE.Mesh(bGeo, m);
        b.position.set(Math.cos(a) * 0.075, Math.sin(a) * 0.075, -0.45);
        barrels.add(b);
      }
      const clamp = new THREE.Mesh(new THREE.CylinderGeometry(0.115, 0.115, 0.08, 10), mats.armorTrim);
      clamp.rotation.x = Math.PI / 2; clamp.position.z = -0.66;
      barrels.add(clamp);
      wg.add(barrels);
      wg.userData.barrels = barrels;
      return wg;
    }

    function createSoldierMesh() {
      const g = new THREE.Group();

      // 접지 그림자 디스크
      const sh = new THREE.Mesh(geos.shadowPlane, mats.shadowDisc);
      sh.rotation.x = -Math.PI / 2; sh.position.y = 0.025;
      g.add(sh);

      // 다리 + 부츠
      const legL = new THREE.Group(); legL.position.set(-0.14, 0.38, 0);
      const thighL = new THREE.Mesh(geos.capsuleLimb, mats.armorBlueDark); thighL.position.y = -0.14; thighL.castShadow = true;
      const bootL = new THREE.Mesh(geos.boot, mats.armorTrim); bootL.position.set(0, -0.3, -0.04);
      legL.add(thighL, bootL);
      const legR = legL.clone(); legR.position.x = 0.14;

      // 상체 아머 + 흉갑 + 백팩
      const torso = new THREE.Mesh(geos.torso, mats.armorBlueDark);
      torso.position.y = 0.66; torso.castShadow = true;
      const chest = new THREE.Mesh(geos.chestPlate, mats.armorBlue);
      chest.position.set(0, 0.72, -0.02); chest.castShadow = true;
      const pack = new THREE.Mesh(geos.backpack, mats.armorTrim);
      pack.position.set(0, 0.74, 0.22);

      // 글로시 곡면 숄더 폴드론 (키아트 실루엣 핵심!)
      const pL = new THREE.Mesh(geos.pauldron, mats.armorBlue);
      pL.position.set(-0.34, 0.85, 0); pL.scale.set(1.0, 0.9, 1.05); pL.castShadow = true;
      const pR = pL.clone(); pR.position.x = 0.34;

      // 조각 헬멧 + 발광 시안 바이저
      const helmet = new THREE.Mesh(geos.helmet, mats.armorBlue);
      helmet.position.set(0, 1.15, 0); helmet.castShadow = true;
      const visor = new THREE.Mesh(geos.visor, mats.visorCyan);
      visor.position.set(0, 1.14, -0.03);
      visor.rotation.y = Math.PI;

      // 다중 파츠 무기 (소총 기본 + 골든 미니건 교체용)
      const rifle = new THREE.Group();
      const rec = new THREE.Mesh(new THREE.BoxGeometry(0.13, 0.16, 0.56), mats.gunSteel);
      const brl = new THREE.Mesh(new THREE.CylinderGeometry(0.036, 0.042, 0.42, 8), mats.gunSteel);
      brl.rotation.x = Math.PI / 2; brl.position.z = -0.44;
      const mag = new THREE.Mesh(new THREE.BoxGeometry(0.07, 0.2, 0.1), mats.armorTrim);
      mag.position.set(0, -0.14, -0.08); mag.rotation.x = 0.2;
      rifle.add(rec, brl, mag);
      rifle.position.set(0.32, 0.7, -0.26);

      const minigun = createMinigunMesh(true);
      minigun.position.set(0.34, 0.68, -0.2);
      minigun.visible = false;

      // 볼류메트릭 총구 화염 (X자 크로스 빌보드)
      const flash = new THREE.Group();
      const f1 = new THREE.Mesh(geos.flashPlane, mats.muzzleFlash);
      const f2 = f1.clone(); f2.rotation.y = Math.PI / 2;
      const f3 = f1.clone(); f3.rotation.x = Math.PI / 2;
      flash.add(f1, f2, f3);
      flash.position.set(0.32, 0.72, -0.88);
      flash.visible = false;

      g.add(legL, legR, torso, chest, pack, pL, pR, helmet, visor, rifle, minigun, flash);
      g.userData = { legL, legR, rifle, minigun, flash, phase: Math.random() * Math.PI * 2, flashTimer: 0 };
      return g;
    }

    function createTankMesh() {
      const g = new THREE.Group();
      const sh = new THREE.Mesh(new THREE.PlaneGeometry(3.2, 3.8), mats.shadowDisc);
      sh.rotation.x = -Math.PI / 2; sh.position.y = 0.03;
      g.add(sh);

      // 경사 장갑 차체
      const hull = new THREE.Mesh(new THREE.BoxGeometry(1.75, 0.68, 2.55), mats.armorBlue);
      hull.position.y = 0.62; hull.castShadow = true;
      const glacis = new THREE.Mesh(new THREE.BoxGeometry(1.7, 0.42, 0.75), mats.armorBlueDark);
      glacis.position.set(0, 0.58, -1.35); glacis.rotation.x = 0.45;
      g.add(hull, glacis);

      // 좌우 무한궤도 + 로드휠 5쌍
      const wheelGeo = new THREE.CylinderGeometry(0.22, 0.22, 0.34, 10);
      wheelGeo.rotateZ(Math.PI / 2);
      for (const side of [-1, 1]) {
        const track = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.56, 2.75), mats.armorTrim);
        track.position.set(side * 1.0, 0.32, 0); track.castShadow = true;
        const skirt = new THREE.Mesh(new THREE.BoxGeometry(0.46, 0.16, 2.82), mats.armorBlueDark);
        skirt.position.set(side * 1.0, 0.62, 0);
        g.add(track, skirt);
        for (let w = -2; w <= 2; w++) {
          const wh = new THREE.Mesh(wheelGeo, mats.gunSteel);
          wh.position.set(side * 1.02, 0.24, w * 0.54);
          g.add(wh);
        }
      }

      // 6각 포탑 + 해치 + 주포 + 머즐 브레이크
      const turret = new THREE.Mesh(new THREE.CylinderGeometry(0.76, 0.92, 0.58, 6), mats.armorBlue);
      turret.position.set(0, 1.24, 0.08); turret.castShadow = true;
      const cupola = new THREE.Mesh(new THREE.CylinderGeometry(0.28, 0.32, 0.2, 8), mats.armorBlueDark);
      cupola.position.set(-0.22, 1.6, 0.22);
      const barrel = new THREE.Mesh(new THREE.CylinderGeometry(0.11, 0.14, 1.95, 10), mats.gunSteel);
      barrel.rotation.x = Math.PI / 2; barrel.position.set(0, 1.24, -1.35); barrel.castShadow = true;
      const muzzle = new THREE.Mesh(new THREE.CylinderGeometry(0.17, 0.15, 0.28, 8), mats.armorTrim);
      muzzle.rotation.x = Math.PI / 2; muzzle.position.set(0, 1.24, -2.35);
      const flash = new THREE.Mesh(new THREE.PlaneGeometry(1.6, 1.6), mats.muzzleFlash);
      flash.position.set(0, 1.24, -2.65); flash.visible = false;
      g.add(turret, cupola, barrel, muzzle, flash);
      g.userData = { barrel, flash, recoil: 0 };
      return g;
    }

    function createZombieMesh(isBrute = false) {
      const g = new THREE.Group();
      const sc = isBrute ? 1.52 : 1.02;
      const sh = new THREE.Mesh(geos.shadowPlane, mats.shadowDisc);
      sh.rotation.x = -Math.PI / 2; sh.position.y = 0.025;
      g.add(sh);

      const legL = new THREE.Mesh(geos.capsuleLimb, mats.zombieCloth); legL.position.set(-0.14, 0.24, 0); legL.castShadow = true;
      const legR = legL.clone(); legR.position.x = 0.14;

      const bodyMat = isBrute ? mats.bruteCrimson : mats.zombieCloth;
      const torso = new THREE.Mesh(geos.torso, bodyMat);
      torso.position.set(0, 0.68, 0.05); torso.rotation.x = 0.2; torso.castShadow = true;
      const belt = new THREE.Mesh(new THREE.BoxGeometry(0.46, 0.12, 0.34), mats.zombieLeather);
      belt.position.set(0, 0.5, 0.04);

      const pL = new THREE.Mesh(geos.pauldron, isBrute ? mats.bruteCrimson : mats.zombieLeather);
      pL.position.set(-0.34, 0.86, 0.06); pL.scale.set(0.95, 0.85, 0.95);
      const pR = pL.clone(); pR.position.x = 0.34;

      const head = new THREE.Mesh(geos.helmet, mats.zombieSkin);
      head.position.set(0, 1.12, 0.14); head.scale.set(0.95, 1.05, 0.95); head.castShadow = true;
      const eyeL = new THREE.Mesh(new THREE.SphereGeometry(0.05, 6, 6), mats.glowAmber);
      eyeL.position.set(-0.09, 1.15, 0.36);
      const eyeR = eyeL.clone(); eyeR.position.x = 0.09;

      const armL = new THREE.Mesh(geos.capsuleLimb, mats.zombieSkin);
      armL.rotation.x = Math.PI * 0.42; armL.position.set(-0.32, 0.78, 0.34);
      const armR = armL.clone(); armR.position.x = 0.32;

      g.add(legL, legR, torso, belt, pL, pR, head, eyeL, eyeR, armL, armR);
      g.scale.setScalar(sc);
      g.userData = { body: torso, baseMat: bodyMat, legL, legR, armL, armR, phase: Math.random() * 6 };
      return g;
    }

    function createTitanBossMesh() {
      const g = new THREE.Group();
      const sh = new THREE.Mesh(new THREE.PlaneGeometry(5.6, 5.6), mats.shadowDisc);
      sh.rotation.x = -Math.PI / 2; sh.position.y = 0.04;
      g.add(sh);

      // 육중한 다리
      const legGeo = new THREE.CylinderGeometry(0.46, 0.56, 1.7, 10);
      const legL = new THREE.Mesh(legGeo, mats.bossArmor); legL.position.set(-0.78, 0.85, 0); legL.castShadow = true;
      const legR = legL.clone(); legR.position.x = 0.78;

      // 다중 장갑 흉부 + 발광 코어
      const torso = new THREE.Mesh(new THREE.CylinderGeometry(1.45, 1.08, 2.2, 8), mats.bossArmor);
      torso.position.y = 2.65; torso.castShadow = true;
      const chestPlate = new THREE.Mesh(new THREE.BoxGeometry(2.15, 1.45, 1.35), mats.bruteCrimson);
      chestPlate.position.set(0, 2.85, 0.25); chestPlate.castShadow = true;
      const core = new THREE.Mesh(new THREE.SphereGeometry(0.38, 12, 12), mats.glowAmber);
      core.position.set(0, 2.88, 0.92);

      // 거대 둥근 숄더 폴드론 + 강철 스파이크 (키아트 보스 실루엣!)
      const pGeo = new THREE.SphereGeometry(0.95, 12, 10);
      const spikeGeo = new THREE.ConeGeometry(0.16, 0.55, 6);
      for (const side of [-1, 1]) {
        const p = new THREE.Mesh(pGeo, mats.bossArmor);
        p.position.set(side * 1.75, 3.55, 0); p.castShadow = true;
        const sp = new THREE.Mesh(spikeGeo, mats.bossSteel);
        sp.position.set(side * 2.1, 4.35, 0); sp.rotation.z = -side * 0.45;
        g.add(p, sp);
      }

      // 묵직한 아머 팔 & 주먹
      const armL = new THREE.Group(); armL.position.set(-1.95, 3.1, 0);
      const uArmL = new THREE.Mesh(new THREE.CylinderGeometry(0.38, 0.46, 1.75, 8), mats.bossSteel);
      uArmL.position.y = -0.8; uArmL.castShadow = true;
      const fistL = new THREE.Mesh(new THREE.SphereGeometry(0.55, 10, 8), mats.bossArmor);
      fistL.position.y = -1.75;
      armL.add(uArmL, fistL);
      const armR = armL.clone(); armR.position.x = 1.95;

      // 장갑 헬멧 + 강렬한 발광 눈
      const head = new THREE.Mesh(new THREE.CylinderGeometry(0.62, 0.72, 0.95, 10), mats.bossSteel);
      head.position.set(0, 4.25, 0.1); head.castShadow = true;
      const eyeL = new THREE.Mesh(new THREE.BoxGeometry(0.28, 0.14, 0.14), mats.glowAmber);
      eyeL.position.set(-0.22, 4.3, 0.66);
      const eyeR = eyeL.clone(); eyeR.position.x = 0.22;

      g.add(legL, legR, torso, chestPlate, core, armL, armR, head, eyeL, eyeR);
      g.userData = { body: chestPlate, baseMat: mats.bruteCrimson, legL, legR, armL, armR, core };
      return g;
    }

    function drawHoloGateCanvas(canvasEl, gate, lang) {
      const g = canvasEl.getContext("2d");
      const w = canvasEl.width, h = canvasEl.height;
      const isGood = gate.kind === "mul" || gate.kind === "rate" || gate.val >= 0;
      g.clearRect(0, 0, w, h);

      const grad = g.createLinearGradient(0, 0, 0, h);
      let rimColor = "#38bdf8";
      if (gate.kind === "rate") {
        grad.addColorStop(0, "rgba(251, 191, 36, 0.78)");
        grad.addColorStop(1, "rgba(217, 119, 6, 0.42)");
        rimColor = "#fde047";
      } else if (isGood) {
        grad.addColorStop(0, "rgba(56, 189, 248, 0.78)");
        grad.addColorStop(1, "rgba(37, 99, 235, 0.45)");
        rimColor = "#7dd3fc";
      } else {
        grad.addColorStop(0, "rgba(251, 113, 133, 0.8)");
        grad.addColorStop(1, "rgba(190, 18, 60, 0.48)");
        rimColor = "#fda4af";
      }
      g.fillStyle = grad;
      g.fillRect(10, 10, w - 20, h - 20);

      // 미세 홀로그램 주사선
      g.fillStyle = "rgba(255,255,255,0.08)";
      for (let y = 16; y < h - 16; y += 16) g.fillRect(14, y, w - 28, 3);

      // 발광 이중 네온 테두리
      g.shadowColor = rimColor;
      g.shadowBlur = 22;
      g.strokeStyle = "#ffffff";
      g.lineWidth = 14;
      g.strokeRect(12, 12, w - 24, h - 24);
      g.shadowBlur = 0;

      // 상단 라벨 필
      g.fillStyle = "rgba(15, 23, 42, 0.62)";
      g.beginPath(); g.roundRect(w * 0.16, 28, w * 0.68, 56, 28); g.fill();
      g.fillStyle = "#f8fafc";
      g.font = "900 32px sans-serif";
      g.textAlign = "center"; g.textBaseline = "middle";
      const sub = gate.kind === "mul"
        ? (lang === "ko" ? "스쿼드 증폭" : "SQUAD BOOST")
        : gate.kind === "rate"
          ? (lang === "ko" ? "연사 속도" : "FIRE RATE")
          : (lang === "ko" ? "병력 증원" : "TROOPS");
      g.fillText(sub, w / 2, 56);

      // 초선명 대형 숫자
      const label = gate.kind === "mul" ? `×${gate.val}` : gate.kind === "rate" ? `+${gate.val}%` : (gate.val >= 0 ? `+${gate.val}` : `${gate.val}`);
      g.font = "900 156px sans-serif";
      g.lineWidth = 18;
      g.strokeStyle = "#0f172a";
      g.strokeText(label, w / 2, h * 0.63);
      g.fillStyle = "#ffffff";
      g.fillText(label, w / 2, h * 0.63);
    }

    function createHoloGate(scene, laneSide, roadW, z, kind, val, lang) {
      const w = roadW * 0.45;
      const h = 3.35;
      const group = new THREE.Group();
      const x = laneSide < 0 ? -roadW * 0.25 : roadW * 0.25;
      group.position.set(x, 0, z);

      const c = document.createElement("canvas");
      c.width = 512; c.height = 384;
      const gate = { group, x, z, w, kind, val, canvas: c, tex: null, used: false, hitAccum: 0, bounce: 0 };
      drawHoloGateCanvas(c, gate, lang);
      const tex = new THREE.CanvasTexture(c);
      tex.encoding = THREE.sRGBEncoding;
      gate.tex = tex;

      const panel = new THREE.Mesh(
        new THREE.PlaneGeometry(w, h),
        new THREE.MeshBasicMaterial({ map: tex, transparent: true, side: THREE.DoubleSide })
      );
      panel.position.y = h / 2 + 0.1;

      const postGeo = new THREE.CylinderGeometry(0.18, 0.22, h + 0.45, 10);
      const pL = new THREE.Mesh(postGeo, mats.pillarMetal); pL.position.set(-w / 2, (h + 0.25) / 2, 0); pL.castShadow = true;
      const pR = pL.clone(); pR.position.x = w / 2;
      const baseGeo = new THREE.BoxGeometry(0.55, 0.24, 0.55);
      const bL = new THREE.Mesh(baseGeo, mats.armorTrim); bL.position.set(-w / 2, 0.12, 0);
      const bR = bL.clone(); bR.position.x = w / 2;
      const topBar = new THREE.Mesh(new THREE.BoxGeometry(w + 0.45, 0.28, 0.34), mats.pillarMetal);
      topBar.position.y = h + 0.26;

      group.add(panel, pL, pR, bL, bR, topBar);
      scene.add(group);
      return gate;
    }

    function drawBarrelSign(canvasEl, hp, labelTxt) {
      const g = canvasEl.getContext("2d");
      const w = canvasEl.width, h = canvasEl.height;
      g.clearRect(0, 0, w, h);
      g.fillStyle = "rgba(15, 23, 42, 0.9)";
      g.beginPath(); g.roundRect(6, 6, w - 12, h - 12, 22); g.fill();
      g.strokeStyle = "#fde047"; g.lineWidth = 8; g.stroke();
      g.fillStyle = "#fde047"; g.font = "900 32px sans-serif"; g.textAlign = "center"; g.textBaseline = "middle";
      g.fillText(labelTxt, w / 2, 44);
      g.fillStyle = "#ffffff"; g.font = "900 84px sans-serif";
      g.fillText(`${Math.max(0, Math.ceil(hp))}`, w / 2, 120);
    }

    function createWeaponBarrel(scene, x, z, hp, isTank, lang) {
      const g = new THREE.Group();
      g.position.set(x, 0, z);

      const sh = new THREE.Mesh(new THREE.PlaneGeometry(2.5, 2.5), mats.shadowDisc);
      sh.rotation.x = -Math.PI / 2; sh.position.y = 0.03;
      g.add(sh);

      // 금속 리브가 들어간 리얼 드럼통
      const body = new THREE.Mesh(
        new THREE.CylinderGeometry(0.95, 0.95, 1.85, 18),
        isTank ? mats.barrelGold : mats.barrelRed
      );
      body.position.y = 0.94; body.castShadow = true;
      g.add(body);
      for (const hy of [0.32, 0.94, 1.56]) {
        const hoop = new THREE.Mesh(new THREE.TorusGeometry(0.96, 0.065, 8, 22), mats.barrelHoop);
        hoop.rotation.x = Math.PI / 2; hoop.position.y = hy;
        g.add(hoop);
      }

      // 상단 부유 회전 3D 골든 미니건 또는 미니 탱크 + 빛 링!
      const holo = isTank ? createTankMesh() : createMinigunMesh(true);
      if (isTank) holo.scale.setScalar(0.5);
      else holo.scale.setScalar(1.75);
      holo.position.y = 2.65;
      g.add(holo);

      const halo = new THREE.Mesh(
        new THREE.RingGeometry(0.65, 0.92, 24),
        new THREE.MeshBasicMaterial({ color: 0xfde047, transparent: true, opacity: 0.72, side: THREE.DoubleSide })
      );
      halo.rotation.x = -Math.PI / 2; halo.position.y = 2.02;
      g.add(halo);

      const c = document.createElement("canvas");
      c.width = 320; c.height = 176;
      const labelTxt = isTank ? (lang === "ko" ? "전술 탱크" : "BATTLE TANK") : (lang === "ko" ? "무기 진화" : "WEAPON UP");
      drawBarrelSign(c, hp, labelTxt);
      const tex = new THREE.CanvasTexture(c);
      tex.encoding = THREE.sRGBEncoding;
      const sign = new THREE.Mesh(new THREE.PlaneGeometry(2.05, 1.12), new THREE.MeshBasicMaterial({ map: tex, transparent: true }));
      sign.position.set(0, 1.05, 1.06);
      g.add(sign);

      scene.add(g);
      return { group: g, body, holo, x, z, hp, maxHp: hp, isTank, canvas: c, tex, labelTxt, hitFlash: 0 };
    }

    return {
      mats, geos,
      createSoldierMesh, createTankMesh, createZombieMesh, createTitanBossMesh,
      createHoloGate, drawHoloGateCanvas, createWeaponBarrel, drawBarrelSign,
    };
  }

  global.ValusArt3D = {
    setupStudioRenderer,
    buildSkyAndOcean,
    buildSuspensionBridge,
    createArtLibrary,
  };
})(window);

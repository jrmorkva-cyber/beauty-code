/* Beauty Code · 3D-монета (по мотивам монеты verostudio: чёрный графитовый металл,
   волнистая кованая поверхность, толстый скруглённый край, вдавленная надпись).
   Модель и текстуры свои: форма собирается из профиля, карта рельефа рисуется
   в коде из нашего логотипа. Управляется из main.js через window.BCcoin.set(angleY, tiltX). */
import * as THREE from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';

const wrap = document.getElementById('coin');
if (wrap) init().catch(() => {});

async function init() {
  // шрифт логотипа нужен до рисования рельефа
  try { await document.fonts.load('40px "Vetrino"'); } catch (e) {}

  const canvas = document.createElement('canvas');
  canvas.className = 'coin__gl';
  const renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: true, powerPreference: 'low-power' });
  if (!renderer.getContext()) return;
  renderer.setPixelRatio(Math.min(2, window.devicePixelRatio || 1));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.28;

  const scene = new THREE.Scene();
  const pmrem = new THREE.PMREMGenerator(renderer);
  scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.12).texture; // размытое окружение: мягкие блики без ровных краёв софтбоксов

  const camera = new THREE.PerspectiveCamera(28, 1, 0.1, 50);
  camera.position.set(0, 0, 5.1);

  // ключевой свет сверху-слева даёт блик по ребру, как на референсе
  const key = new THREE.DirectionalLight(0xfff0e8, 1.6); key.position.set(-2.5, 3, 4); scene.add(key);
  const rim = new THREE.DirectionalLight(0xead6cc, 1.0); rim.position.set(3, -1, -2); scene.add(rim);

  // профиль аккуратной монеты: ровный круг, плоские стороны, тонкое скруглённое ребро (~8px при ширине 236px)
  const R = 1, H = 0.034, pts = [];
  pts.push(new THREE.Vector2(0.0001, -H));
  for (let i = 1; i <= 8; i++) pts.push(new THREE.Vector2((R - H) * i / 8, -H));
  for (let i = 1; i <= 24; i++) { const t = -Math.PI / 2 + (i / 24) * Math.PI; pts.push(new THREE.Vector2(R - H + H * Math.cos(t), H * Math.sin(t))); }
  for (let i = 7; i >= 0; i--) pts.push(new THREE.Vector2(Math.max(0.0001, (R - H) * i / 8), H));
  const geo = new THREE.LatheGeometry(pts, 192);
  // плоская развёртка: текстура ложится на лицевую и обратную стороны
  const pos = geo.attributes.position, uv = geo.attributes.uv;
  // на обратной стороне отражаем по горизонтали, чтобы логотип читался, а не зеркалился
  for (let i = 0; i < pos.count; i++) {
    const u = pos.getX(i) / (2 * R) + 0.5;
    uv.setXY(i, pos.getY(i) < 0 ? 1 - u : u, 1 - (pos.getZ(i) / (2 * R) + 0.5));
  }
  uv.needsUpdate = true;
  geo.computeVertexNormals();

  const { normal, rough } = buildMaps(768);
  const mat = new THREE.MeshPhysicalMaterial({
    color: 0x5f4741,            // фирменный какао (--ink #49332C) в металле
    sheen: 0.35, sheenColor: new THREE.Color(0xd9bdb2), sheenRoughness: 0.5, // розово-нюдовый отлив (--mute #AE928A)
    metalness: 0.58,
    roughness: 0.46,
    roughnessMap: rough,
    normalMap: normal,
    normalScale: new THREE.Vector2(1, 1),
    clearcoat: 0.55,
    clearcoatRoughness: 0.32,
    envMapIntensity: 1.85,
  });
  const mesh = new THREE.Mesh(geo, mat);
  mesh.rotation.x = Math.PI / 2;            // лицом к камере
  const pivot = new THREE.Group(); pivot.add(mesh); scene.add(pivot);

  wrap.appendChild(canvas);
  wrap.classList.add('is-webgl');

  const size = () => {
    const w = Math.round((wrap.clientWidth || 200) * 1.24); // холст чуть больше обёртки, чтобы ребро не обрезалось при повороте
    renderer.setSize(w, w, false);
    camera.aspect = 1; camera.updateProjectionMatrix();
  };
  size();
  addEventListener('resize', size);

  let visible = true, dirty = true;
  new IntersectionObserver(es => { visible = es[0].isIntersecting; }, { rootMargin: '200px' }).observe(wrap);

  window.BCcoin = {
    set(angleDeg, tiltDeg) {
      pivot.rotation.y = THREE.MathUtils.degToRad(angleDeg);
      pivot.rotation.x = THREE.MathUtils.degToRad(tiltDeg);
      dirty = true;
    }
  };
  (function loop() {
    if (visible && dirty) { renderer.render(scene, camera); dirty = false; }
    requestAnimationFrame(loop);
  })();
}

/* Карта рельефа: волнистая «кованая» поверхность + вдавленный логотип.
   Высоты считаются в дробных числах (Float32), чтобы не было ступенек и колец на бликах. */
function buildMaps(S) {
  const C = S / 2;
  const H = new Float32Array(S * S);

  // 1. кованая волна: сумма мягких гауссовых бугров и впадин
  let seed = 11; const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
  const blobs = [];
  for (let i = 0; i < 46; i++) blobs.push({ x: rnd() * S, y: rnd() * S, s: S * (0.06 + rnd() * 0.12), a: (rnd() - 0.5) * 0.07 });
  for (const b of blobs) {
    const r = b.s * 4.6, inv = 1 / (2 * b.s * b.s); // окно 4.6σ: на краю вклад ~0, без ступенек
    const x0 = Math.max(0, b.x - r | 0), x1 = Math.min(S - 1, b.x + r | 0);
    const y0 = Math.max(0, b.y - r | 0), y1 = Math.min(S - 1, b.y + r | 0);
    for (let y = y0; y <= y1; y++) {
      const dy = y - b.y;
      for (let x = x0; x <= x1; x++) { const dx = x - b.x; H[y * S + x] += b.a * Math.exp(-(dx * dx + dy * dy) * inv); }
    }
  }
  // 2. едва заметный приподнятый бортик у края лицевой стороны
  for (let y = 0; y < S; y++) for (let x = 0; x < S; x++) {
    const d = Math.hypot(x - C, y - C) / S;
    const t = Math.max(0, 1 - Math.abs(d - 0.44) / 0.045);
    H[y * S + x] += 0.035 * t * t * (3 - 2 * t);
  }

  // 3. логотип: рисуем на холсте, размываем край, берём как маску вдавливания
  const lc = document.createElement('canvas'); lc.width = lc.height = S;
  const l = lc.getContext('2d');
  l.fillStyle = '#fff'; l.strokeStyle = '#fff';
  l.textAlign = 'center'; l.textBaseline = 'middle';
  const ring = (text, radius, top, size, spacing) => {
    l.font = `${size}px "Vetrino", serif`;
    const chars = [...text];
    const widths = chars.map(ch => l.measureText(ch).width + spacing);
    const total = widths.reduce((a, b) => a + b, 0);
    let ang = -total / radius / 2;
    chars.forEach((ch, i) => {
      const a = ang + widths[i] / radius / 2;
      l.save(); l.translate(C, C);
      if (top) { l.rotate(a); l.translate(0, -radius); } else { l.rotate(-a); l.translate(0, radius); }
      l.fillText(ch, 0, 0); l.restore();
      ang += widths[i] / radius;
    });
  };
  ring('ПРОСТРАНСТВО', S * 0.338, true, S * 0.052, S * 0.02);
  ring('КРАСОТЫ', S * 0.338, false, S * 0.052, S * 0.024);
  l.lineWidth = S * 0.005;
  l.beginPath(); l.arc(C, C, S * 0.262, 0, Math.PI * 2); l.stroke();
  l.beginPath(); l.arc(C, C, S * 0.402, 0, Math.PI * 2); l.stroke();
  [-1, 1].forEach(sx => { l.beginPath(); l.arc(C + sx * S * 0.338, C, S * 0.009, 0, Math.PI * 2); l.fill(); });
  l.font = `${S * 0.25}px "Vetrino", serif`;
  l.save(); l.translate(C, C + S * 0.012); l.fillText('B', -S * 0.044, 0); l.fillText('C', S * 0.054, 0); l.restore();

  const bc = document.createElement('canvas'); bc.width = bc.height = S;
  const bg = bc.getContext('2d'); bg.filter = `blur(${Math.max(1, S * 0.0018)}px)`; bg.drawImage(lc, 0, 0);
  const md = bg.getImageData(0, 0, S, S).data;
  const M = new Float32Array(S * S);
  for (let i = 0; i < S * S; i++) M[i] = md[i * 4 + 3] / 255;
  for (let i = 0; i < S * S; i++) H[i] -= M[i] * 0.07;

  // 4. высоты → нормали (Собель по дробным числам)
  const at = (x, y) => H[Math.min(S - 1, Math.max(0, y)) * S + Math.min(S - 1, Math.max(0, x))];
  const nc = document.createElement('canvas'); nc.width = nc.height = S;
  const ng = nc.getContext('2d'); const nd = ng.createImageData(S, S);
  const k = S * 0.11;
  for (let y = 0; y < S; y++) for (let x = 0; x < S; x++) {
    const dx = (at(x + 1, y - 1) + 2 * at(x + 1, y) + at(x + 1, y + 1)) - (at(x - 1, y - 1) + 2 * at(x - 1, y) + at(x - 1, y + 1));
    const dy = (at(x - 1, y + 1) + 2 * at(x, y + 1) + at(x + 1, y + 1)) - (at(x - 1, y - 1) + 2 * at(x, y - 1) + at(x + 1, y - 1));
    let nx = -dx * k, ny = dy * k, nz = 1;
    const len = Math.hypot(nx, ny, nz); nx /= len; ny /= len; nz /= len;
    const i = (y * S + x) * 4;
    nd.data[i] = (nx * 0.5 + 0.5) * 255; nd.data[i + 1] = (ny * 0.5 + 0.5) * 255; nd.data[i + 2] = (nz * 0.5 + 0.5) * 255; nd.data[i + 3] = 255;
  }
  ng.putImageData(nd, 0, 0);

  // 5. шероховатость: металл ровный, надпись матовее (как у vero)
  const rc = document.createElement('canvas'); rc.width = rc.height = S;
  const rg = rc.getContext('2d'); const rd = rg.createImageData(S, S);
  for (let i = 0; i < S * S; i++) {
    const v = (0.72 + M[i] * 0.55) * 255;
    rd.data[i * 4] = rd.data[i * 4 + 1] = rd.data[i * 4 + 2] = Math.min(255, v); rd.data[i * 4 + 3] = 255;
  }
  rg.putImageData(rd, 0, 0);

  const normal = new THREE.CanvasTexture(nc); normal.colorSpace = THREE.NoColorSpace; normal.anisotropy = 8;
  const rough = new THREE.CanvasTexture(rc); rough.colorSpace = THREE.NoColorSpace;
  return { normal, rough };
}

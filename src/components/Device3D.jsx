import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js';
import { CSS3DObject, CSS3DRenderer } from 'three/examples/jsm/renderers/CSS3DRenderer.js';
import PhoneScreen from './PhoneScreen';

/*
 * Screen size comes from the published iPhone 18 Pro Max spec: 6.9 inch, 2868 x 1320 px at 460 ppi,
 * which is 956 x 440 points at 3x. The body, bezel and camera plateau are an approximation.
 */
const SCREEN_W = 440;
const SCREEN_H = 956;
const BODY_W = 464;
const BODY_H = 980;
const BODY_D = 48;
const BODY_R = 68;
const BEVEL = 7;
const FOV = 26;

function roundRect(w, h, r) {
  const s = new THREE.Shape();
  const x = -w / 2;
  const y = -h / 2;
  s.moveTo(x + r, y);
  s.lineTo(x + w - r, y);
  s.absarc(x + w - r, y + r, r, -Math.PI / 2, 0, false);
  s.lineTo(x + w, y + h - r);
  s.absarc(x + w - r, y + h - r, r, 0, Math.PI / 2, false);
  s.lineTo(x + r, y + h);
  s.absarc(x + r, y + h - r, r, Math.PI / 2, Math.PI, false);
  s.lineTo(x, y + r);
  s.absarc(x + r, y + r, r, Math.PI, Math.PI * 1.5, false);
  return s;
}

function buildPhone() {
  const phone = new THREE.Group();
  const frame = new THREE.MeshStandardMaterial({ color: 0x33363b, metalness: 1, roughness: 0.33 });
  const brushed = new THREE.MeshStandardMaterial({ color: 0x4a4e55, metalness: 1, roughness: 0.42 });
  const darkGlass = new THREE.MeshPhysicalMaterial({ color: 0x07080a, roughness: 0.1, metalness: 0, clearcoat: 1, clearcoatRoughness: 0.05 });

  // Body: rounded rectangle extruded with a soft bevel
  const depth = BODY_D - 2 * BEVEL;
  const bodyGeo = new THREE.ExtrudeGeometry(roundRect(BODY_W - 2 * BEVEL, BODY_H - 2 * BEVEL, BODY_R - BEVEL), {
    depth,
    bevelEnabled: true,
    bevelThickness: BEVEL,
    bevelSize: BEVEL,
    bevelSegments: 10,
    curveSegments: 48,
  });
  bodyGeo.translate(0, 0, -depth / 2);
  phone.add(new THREE.Mesh(bodyGeo, frame));

  // Front glass (black bezel around the live screen)
  const glass = new THREE.Mesh(
    new THREE.ShapeGeometry(roundRect(BODY_W - 2 * BEVEL - 2, BODY_H - 2 * BEVEL - 2, BODY_R - BEVEL - 1), 48),
    darkGlass
  );
  glass.position.z = BODY_D / 2 + 0.15;
  phone.add(glass);

  // Side buttons
  const button = (x, y, h, d = 16) => {
    const m = new THREE.Mesh(new RoundedBoxGeometry(7, h, d, 4, 3), brushed);
    m.position.set(x, y, 0);
    phone.add(m);
  };
  const sx = BODY_W / 2 + 0.5;
  button(-sx, 292, 36); // action button
  button(-sx, 214, 64); // volume up
  button(-sx, 132, 64); // volume down
  button(sx, 206, 104); // side button
  button(sx, -150, 72, 10); // camera control

  // Back: camera plateau with three lenses, flash and lidar. Built facing +z, then turned around.
  const back = new THREE.Group();
  back.position.set(0, BODY_H / 2 - 28 - 108, -BODY_D / 2 + 0.2);
  back.rotation.y = Math.PI;
  const plate = new THREE.Mesh(
    new THREE.ExtrudeGeometry(roundRect(BODY_W - 48, 216, 46), {
      depth: 3,
      bevelEnabled: true,
      bevelThickness: 3,
      bevelSize: 3,
      bevelSegments: 6,
      curveSegments: 32,
    }),
    brushed
  );
  back.add(plate);

  const lens = (x, y) => {
    const g = new THREE.Group();
    const cyl = (r, h, mat, z) => {
      const m = new THREE.Mesh(new THREE.CylinderGeometry(r, r, h, 56), mat);
      m.rotation.x = Math.PI / 2;
      m.position.z = z;
      g.add(m);
    };
    cyl(37, 6, frame, 9);
    cyl(29, 7, darkGlass, 9.5);
    cyl(17, 7.6, new THREE.MeshPhysicalMaterial({ color: 0x0c1a2e, roughness: 0.15, clearcoat: 1 }), 9.8);
    cyl(5, 8, new THREE.MeshStandardMaterial({ color: 0x1b3b66, roughness: 0.2, metalness: 0.4 }), 10);
    g.position.set(x, y, 0);
    back.add(g);
  };
  lens(-112, 40);
  lens(-112, -50);
  lens(-30, -5);

  const flash = new THREE.Mesh(
    new THREE.CylinderGeometry(12, 12, 6, 40),
    new THREE.MeshStandardMaterial({ color: 0xf1ead8, roughness: 0.5, emissive: 0x3a3524 })
  );
  flash.rotation.x = Math.PI / 2;
  flash.position.set(78, 48, 7);
  back.add(flash);
  const lidar = new THREE.Mesh(new THREE.CylinderGeometry(9, 9, 6, 40), darkGlass);
  lidar.rotation.x = Math.PI / 2;
  lidar.position.set(78, -40, 7);
  back.add(lidar);

  phone.add(back);
  return phone;
}

export default function Device3D({ entry, mode, startPoints, screenKey }) {
  const hostRef = useRef(null);
  const api = useRef({ reset: () => {} });
  const [failed, setFailed] = useState(false);
  const [screenEl] = useState(() => {
    const el = document.createElement('div');
    el.className = 'screen3d';
    return el;
  });

  useEffect(() => {
    const host = hostRef.current;
    let webgl;
    try {
      webgl = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: 'high-performance' });
    } catch {
      setFailed(true);
      return undefined;
    }
    webgl.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    webgl.domElement.className = 'd3-canvas';

    const css = new CSS3DRenderer();
    css.domElement.className = 'd3-css';
    // Focusing an input inside the 3D layer can scroll this clipped element. Keep it pinned.
    css.domElement.addEventListener('scroll', () => {
      css.domElement.scrollTop = 0;
      css.domElement.scrollLeft = 0;
    });

    host.append(webgl.domElement, css.domElement);

    const scene = new THREE.Scene();
    const pmrem = new THREE.PMREMGenerator(webgl);
    const envTex = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
    scene.environment = envTex;

    const camera = new THREE.PerspectiveCamera(FOV, 1, 50, 10000);
    camera.position.set(0, 0, 2400);

    const pivot = new THREE.Group();
    scene.add(pivot);
    pivot.add(buildPhone());

    screenEl.style.width = SCREEN_W + 'px';
    screenEl.style.height = SCREEN_H + 'px';
    const screenObj = new CSS3DObject(screenEl);
    screenObj.position.set(0, 0, BODY_D / 2 + 0.6);
    pivot.add(screenObj);

    const controls = new OrbitControls(camera, webgl.domElement);
    controls.enablePan = false;
    controls.enableZoom = false;
    controls.enableDamping = true;
    controls.dampingFactor = 0.08;
    controls.rotateSpeed = 0.7;
    controls.minPolarAngle = Math.PI * 0.3;
    controls.maxPolarAngle = Math.PI * 0.7;

    let dist = 2400;
    const fit = () => {
      const w = host.clientWidth;
      const h = host.clientHeight;
      if (!w || !h) return;
      webgl.setSize(w, h);
      css.setSize(w, h);
      camera.aspect = w / h;
      const t = Math.tan(THREE.MathUtils.degToRad(FOV / 2));
      const needH = (BODY_H + 140) / 2 / t;
      const needW = (BODY_W + 70) / 2 / (t * camera.aspect);
      dist = Math.max(needH, needW);
      camera.position.setLength(dist);
      camera.updateProjectionMatrix();
      controls.saveState();
    };
    const ro = new ResizeObserver(fit);
    ro.observe(host);
    fit();

    api.current.reset = () => {
      controls.reset();
      camera.position.setLength(dist);
    };

    // One short intro: the phone turns to face you
    const t0 = performance.now();
    let raf = 0;
    const tick = () => {
      raf = requestAnimationFrame(tick);
      const k = Math.min(1, (performance.now() - t0) / 1300);
      const e = 1 - Math.pow(1 - k, 3);
      pivot.rotation.y = (1 - e) * 0.75;
      pivot.rotation.x = (1 - e) * -0.1;
      controls.update();
      webgl.render(scene, camera);
      css.render(scene, camera);
    };
    tick();

    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
      controls.dispose();
      scene.traverse((o) => {
        o.geometry?.dispose?.();
        if (o.material) [].concat(o.material).forEach((m) => m.dispose());
      });
      envTex.dispose();
      pmrem.dispose();
      webgl.dispose();
      webgl.domElement.remove();
      css.domElement.remove();
    };
  }, [screenEl]);

  if (failed) {
    return (
      <div className="d3 flat">
        <div className="flat-frame">
          <PhoneScreen key={screenKey} entry={entry} mode={mode} startPoints={startPoints} device />
        </div>
        <p className="d3-hint">3D is not available on this device, showing a flat frame.</p>
      </div>
    );
  }

  return (
    <div className="d3" ref={hostRef}>
      {createPortal(<PhoneScreen key={screenKey} entry={entry} mode={mode} startPoints={startPoints} device />, screenEl)}
      <div className="d3-ui">
        <span>Drag the frame to turn the phone</span>
        <button onClick={() => api.current.reset()}>Reset view</button>
      </div>
    </div>
  );
}

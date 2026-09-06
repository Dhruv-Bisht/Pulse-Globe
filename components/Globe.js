"use client";

import { useEffect, useRef, useState } from "react";
import * as THREE from "three";
import Legend from "./Legend";
import NewsPanel from "./NewsPanel";
import { CATEGORIES } from "@/lib/cities";

const DAY_MS = 24 * 60 * 60 * 1000;
const POLL_MS = 45000;
const GLOBE_R = 2;

function ageMs(item) {
  return Date.now() - item.timestamp;
}
function ageFraction(item) {
  return Math.min(1, Math.max(0, ageMs(item) / DAY_MS));
}

function latLonToVector3(lat, lon, r) {
  const phi = (90 - lat) * (Math.PI / 180);
  const theta = (lon + 180) * (Math.PI / 180);
  return new THREE.Vector3(
    -r * Math.sin(phi) * Math.cos(theta),
    r * Math.cos(phi),
    r * Math.sin(phi) * Math.sin(theta)
  );
}

function makeDotTexture(color) {
  const size = 128;
  const c = document.createElement("canvas");
  c.width = c.height = size;
  const ctx = c.getContext("2d");
  const grad = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
  grad.addColorStop(0, color);
  grad.addColorStop(0.5, color);
  grad.addColorStop(1, "rgba(0,0,0,0)");
  ctx.fillStyle = grad;
  ctx.beginPath();
  ctx.arc(size / 2, size / 2, size / 2, 0, Math.PI * 2);
  ctx.fill();
  return new THREE.CanvasTexture(c);
}
function makeRingTexture(color) {
  const size = 128;
  const c = document.createElement("canvas");
  c.width = c.height = size;
  const ctx = c.getContext("2d");
  ctx.strokeStyle = color;
  ctx.lineWidth = 5;
  ctx.beginPath();
  ctx.arc(size / 2, size / 2, size / 2 - 6, 0, Math.PI * 2);
  ctx.stroke();
  return new THREE.CanvasTexture(c);
}

export default function Globe() {
  const canvasRef = useRef(null);
  const sceneRef = useRef(null);
  const [items, setItems] = useState([]);
  const [selected, setSelected] = useState(null);
  const [loadError, setLoadError] = useState(false);
  const itemsRef = useRef([]);

  // ---- poll the API ----
  useEffect(() => {
    let cancelled = false;
    async function fetchNews() {
      try {
        const res = await fetch("/api/news", { cache: "no-store" });
        if (!res.ok) throw new Error("bad response");
        const data = await res.json();
        if (!cancelled) {
          setItems(data.items || []);
          setLoadError(false);
        }
      } catch (e) {
        if (!cancelled) setLoadError(true);
      }
    }
    fetchNews();
    const id = setInterval(fetchNews, POLL_MS);
    return () => {
      cancelled = true;
      clearInterval(id);
    };
  }, []);

  // client-side safety net: drop anything that's aged out between polls
  useEffect(() => {
    itemsRef.current = items;
    const id = setInterval(() => {
      setItems((prev) => prev.filter((it) => ageMs(it) < DAY_MS));
    }, 30000);
    return () => clearInterval(id);
  }, [items]);

  // ---- three.js scene setup (once) ----
  useEffect(() => {
    const canvas = canvasRef.current;
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(
      45,
      window.innerWidth / window.innerHeight,
      0.1,
      100
    );
    camera.position.set(0, 0, 6.4);

    const renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setSize(window.innerWidth, window.innerHeight);

    const globeGroup = new THREE.Group();
    scene.add(globeGroup);

    const core = new THREE.Mesh(
      new THREE.SphereGeometry(GLOBE_R - 0.015, 48, 48),
      new THREE.MeshBasicMaterial({ color: 0x0e1730 })
    );
    globeGroup.add(core);

    const shell = new THREE.Mesh(
      new THREE.IcosahedronGeometry(GLOBE_R, 4),
      new THREE.MeshBasicMaterial({ color: 0x2e4272, wireframe: true, transparent: true, opacity: 0.55 })
    );
    globeGroup.add(shell);

    const halo = new THREE.Mesh(
      new THREE.SphereGeometry(GLOBE_R + 0.35, 32, 32),
      new THREE.MeshBasicMaterial({ color: 0x4fd1c5, transparent: true, opacity: 0.035, side: THREE.BackSide })
    );
    globeGroup.add(halo);

    // starfield
    const starCount = 900;
    const positions = new Float32Array(starCount * 3);
    for (let i = 0; i < starCount; i++) {
      const r = 30 + Math.random() * 40;
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(2 * Math.random() - 1);
      positions[i * 3] = r * Math.sin(phi) * Math.cos(theta);
      positions[i * 3 + 1] = r * Math.sin(phi) * Math.sin(theta);
      positions[i * 3 + 2] = r * Math.cos(phi);
    }
    const starGeo = new THREE.BufferGeometry();
    starGeo.setAttribute("position", new THREE.BufferAttribute(positions, 3));
    const starMat = new THREE.PointsMaterial({ color: 0xafc0f0, size: 0.045, transparent: true, opacity: 0.55 });
    scene.add(new THREE.Points(starGeo, starMat));

    const dotTextures = {};
    const ringTextures = {};
    Object.keys(CATEGORIES).forEach((cat) => {
      dotTextures[cat] = makeDotTexture(CATEGORIES[cat]);
      ringTextures[cat] = makeRingTexture(CATEGORIES[cat]);
    });

    const markerLayer = new THREE.Group();
    globeGroup.add(markerLayer);

    const state = {
      renderer,
      camera,
      scene,
      globeGroup,
      markerLayer,
      dotTextures,
      ringTextures,
      markerObjs: [],
      dotTargets: [],
      isDragging: false,
      dragMoved: 0,
      lastX: 0,
      lastY: 0,
      downX: 0,
      downY: 0,
      downT: 0,
      lastInteract: 0
    };
    sceneRef.current = state;

    function onPointerDown(e) {
      state.isDragging = true;
      state.dragMoved = 0;
      state.lastX = state.downX = e.clientX;
      state.lastY = state.downY = e.clientY;
      state.downT = performance.now();
      canvas.classList.add("dragging");
      state.lastInteract = performance.now();
    }
    function onPointerMove(e) {
      if (!state.isDragging) return;
      const dx = e.clientX - state.lastX;
      const dy = e.clientY - state.lastY;
      state.dragMoved += Math.abs(dx) + Math.abs(dy);
      globeGroup.rotation.y += dx * 0.005;
      globeGroup.rotation.x += dy * 0.005;
      globeGroup.rotation.x = Math.max(-1.1, Math.min(1.1, globeGroup.rotation.x));
      state.lastX = e.clientX;
      state.lastY = e.clientY;
      state.lastInteract = performance.now();
    }
    const raycaster = new THREE.Raycaster();
    const mouseVec = new THREE.Vector2();
    function handleClick(clientX, clientY) {
      const rect = canvas.getBoundingClientRect();
      mouseVec.x = ((clientX - rect.left) / rect.width) * 2 - 1;
      mouseVec.y = -((clientY - rect.top) / rect.height) * 2 + 1;
      raycaster.setFromCamera(mouseVec, camera);
      const hits = raycaster.intersectObjects(state.dotTargets);
      if (hits.length) {
        const id = hits[0].object.userData.id;
        const it = itemsRef.current.find((x) => x.id === id);
        setSelected(it || null);
      } else {
        setSelected(null);
      }
    }
    function onPointerUp(e) {
      if (!state.isDragging) return;
      state.isDragging = false;
      canvas.classList.remove("dragging");
      const dt = performance.now() - state.downT;
      if (state.dragMoved < 6 && dt < 400) {
        handleClick(e.clientX, e.clientY);
      }
      state.lastInteract = performance.now();
    }
    function onResize() {
      camera.aspect = window.innerWidth / window.innerHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(window.innerWidth, window.innerHeight);
    }

    canvas.addEventListener("pointerdown", onPointerDown);
    window.addEventListener("pointermove", onPointerMove);
    window.addEventListener("pointerup", onPointerUp);
    window.addEventListener("resize", onResize);

    const clock = new THREE.Clock();
    let frameId;
    function animate() {
      frameId = requestAnimationFrame(animate);
      const t = clock.getElapsedTime();

      if (!state.isDragging && performance.now() - state.lastInteract > 1400) {
        globeGroup.rotation.y += 0.0016;
      }

      state.markerObjs.forEach((m, i) => {
        const af = ageFraction(m.item);
        const freshness = 1 - af;
        const pulse = 1 + Math.sin(t * 1.8 + i * 0.7) * 0.18 * (0.3 + freshness * 0.7);
        const baseRingScale = 0.22 + freshness * 0.14;
        m.ring.scale.set(baseRingScale * pulse, baseRingScale * pulse, 1);
        m.ring.material.opacity = 0.15 + freshness * 0.55;
        m.dot.material.opacity = 0.55 + freshness * 0.45;
        const dotPulse = 1 + Math.sin(t * 1.8 + i * 0.7) * 0.06;
        m.dot.scale.set(0.11 * dotPulse, 0.11 * dotPulse, 0.11 * dotPulse);
      });

      renderer.render(scene, camera);
    }
    animate();

    return () => {
      cancelAnimationFrame(frameId);
      canvas.removeEventListener("pointerdown", onPointerDown);
      window.removeEventListener("pointermove", onPointerMove);
      window.removeEventListener("pointerup", onPointerUp);
      window.removeEventListener("resize", onResize);
      renderer.dispose();
    };
  }, []);

  // ---- rebuild markers whenever items change ----
  useEffect(() => {
    const state = sceneRef.current;
    if (!state) return;

    state.markerObjs.forEach((m) => {
      state.markerLayer.remove(m.dot);
      state.markerLayer.remove(m.ring);
    });
    state.markerObjs = [];
    state.dotTargets = [];

    items.forEach((it) => {
      const pos = latLonToVector3(it.lat, it.lon, GLOBE_R + 0.03);
      const cat = CATEGORIES[it.category] ? it.category : "Software";

      const dotMat = new THREE.SpriteMaterial({
        map: state.dotTextures[cat],
        transparent: true,
        depthTest: true,
        depthWrite: false
      });
      const dot = new THREE.Sprite(dotMat);
      dot.position.copy(pos);
      dot.scale.set(0.11, 0.11, 0.11);
      dot.userData.id = it.id;
      state.markerLayer.add(dot);
      state.dotTargets.push(dot);

      const ringMat = new THREE.SpriteMaterial({
        map: state.ringTextures[cat],
        transparent: true,
        depthTest: true,
        depthWrite: false
      });
      const ring = new THREE.Sprite(ringMat);
      ring.position.copy(pos);
      state.markerLayer.add(ring);

      state.markerObjs.push({ item: it, dot, ring });
    });
  }, [items]);

  return (
    <div className="app">
      <canvas ref={canvasRef} className="globeCanvas" />
      <div className="glow" />

      <header className="brand">
        <h1>Pulse</h1>
        <p>A living globe of tech news. Every marker fades within 24 hours of appearing.</p>
      </header>

      <div className="counter">
        <div className="num">{items.length}</div>
        <div className="lbl">{items.length === 1 ? "report live" : "reports live"}</div>
      </div>

      <Legend />

      {items.length === 0 && (
        <div className="emptyNote">
          {loadError ? "Couldn't reach the news feed." : "No reports in the last 24 hours."}
        </div>
      )}
      {items.length > 0 && <div className="hint">Drag to rotate the globe · click a marker to read it</div>}

      <NewsPanel item={selected} onClose={() => setSelected(null)} />
    </div>
  );
}

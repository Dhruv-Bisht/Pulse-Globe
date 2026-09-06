"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import NewsPanel from "./NewsPanel";
import Legend from "./Legend";
import { categoryColor, timeAgo } from "../lib/categories";

const RADIUS = 2;
const MARKER_SIZE = 0.03;
const AUTO_ROTATE_SPEED = 0.0009;
const DRAG_ROTATE_SPEED = 0.0055;
const CLICK_MOVE_THRESHOLD = 6; // px — below this a pointer-up counts as a click, not a drag
const MAX_TILT = 1.2; // radians, how far up/down the globe can be tipped

// Standard lat/lon -> point on a sphere, matching an equirectangular earth texture.
function latLonToVector3(lat, lon, radius, THREE) {
  const phi = ((90 - lat) * Math.PI) / 180;
  const theta = ((lon + 180) * Math.PI) / 180;
  return new THREE.Vector3(
    -radius * Math.sin(phi) * Math.cos(theta),
    radius * Math.cos(phi),
    radius * Math.sin(phi) * Math.sin(theta)
  );
}

function makeGlowTexture(THREE) {
  const size = 128;
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext("2d");
  const gradient = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
  gradient.addColorStop(0, "rgba(255,255,255,1)");
  gradient.addColorStop(0.25, "rgba(255,255,255,0.7)");
  gradient.addColorStop(0.6, "rgba(255,255,255,0.15)");
  gradient.addColorStop(1, "rgba(255,255,255,0)");
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, size, size);
  const texture = new THREE.CanvasTexture(canvas);
  texture.needsUpdate = true;
  return texture;
}

export default function Globe() {
  const [items, setItems] = useState([]);
  const [selected, setSelected] = useState(null);
  const [hovered, setHovered] = useState(null);
  const [tooltipPos, setTooltipPos] = useState({ x: 0, y: 0 });
  const [mode, setMode] = useState("loading");
  const [error, setError] = useState("");
  const [ready, setReady] = useState(false);

  const mountRef = useRef(null);
  const sceneRefs = useRef({}); // three.js objects, kept out of React state on purpose
  const itemsRef = useRef([]);
  itemsRef.current = items;

  const load = useCallback(async () => {
    try {
      const res = await fetch("/api/news", { cache: "no-store" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Feed unavailable");
      setItems(Array.isArray(data.items) ? data.items : []);
      setMode(data.mode || "gdelt");
      setError("");
    } catch (e) {
      setError(e.message);
      setMode("error");
    }
  }, []);

  useEffect(() => {
    load();
    const timer = setInterval(load, 45000);
    return () => clearInterval(timer);
  }, [load]);

  // ---- Set up the three.js scene once ----
  useEffect(() => {
    let disposed = false;

    (async () => {
      const THREE = await import("three");
      if (disposed || !mountRef.current) return;

      const mount = mountRef.current;
      const width = mount.clientWidth;
      const height = mount.clientHeight;

      const scene = new THREE.Scene();

      const camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 100);
      camera.position.set(0, 0, 5.6);

      const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
      renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
      renderer.setSize(width, height);
      renderer.domElement.style.cursor = "grab";
      renderer.domElement.style.touchAction = "none";
      renderer.domElement.style.width = "100%";
      renderer.domElement.style.height = "100%";
      renderer.domElement.style.display = "block";
      mount.appendChild(renderer.domElement);

      // Starfield backdrop
      const starGeo = new THREE.BufferGeometry();
      const starCount = 900;
      const positions = new Float32Array(starCount * 3);
      for (let i = 0; i < starCount; i++) {
        const r = 30 + Math.random() * 40;
        const theta = Math.random() * Math.PI * 2;
        const phi = Math.acos(Math.random() * 2 - 1);
        positions[i * 3] = r * Math.sin(phi) * Math.cos(theta);
        positions[i * 3 + 1] = r * Math.sin(phi) * Math.sin(theta);
        positions[i * 3 + 2] = r * Math.cos(phi);
      }
      starGeo.setAttribute("position", new THREE.BufferAttribute(positions, 3));
      const starMat = new THREE.PointsMaterial({ color: 0x9fc7ff, size: 0.06, transparent: true, opacity: 0.55 });
      scene.add(new THREE.Points(starGeo, starMat));

      // Lights
      scene.add(new THREE.AmbientLight(0x8fa9c7, 0.55));
      const sun = new THREE.DirectionalLight(0xffffff, 1.35);
      sun.position.set(-4, 2, 4);
      scene.add(sun);
      const rim = new THREE.DirectionalLight(0x67e8f9, 0.35);
      rim.position.set(3, -1, -3);
      scene.add(rim);

      // Globe group — earth + graticule + markers all rotate together
      const globeGroup = new THREE.Group();
      scene.add(globeGroup);

      const geometry = new THREE.SphereGeometry(RADIUS, 96, 96);
      let earthMesh = new THREE.Mesh(
        geometry,
        new THREE.MeshPhongMaterial({ color: 0x0b3d5c, emissive: 0x08111c, shininess: 8, specular: 0x224466 })
      );
      globeGroup.add(earthMesh);

      const loader = new THREE.TextureLoader();
      loader.crossOrigin = "anonymous";
      const TEX_BASE = "https://unpkg.com/three-globe/example/img/";

      const swapMaterial = (map, bump, specular) => {
        globeGroup.remove(earthMesh);
        earthMesh.material.dispose();
        earthMesh = new THREE.Mesh(
          geometry,
          new THREE.MeshPhongMaterial({
            map,
            bumpMap: bump || null,
            bumpScale: bump ? 0.035 : 0,
            specularMap: specular || null,
            specular: new THREE.Color(0x556677),
            shininess: 9
          })
        );
        globeGroup.add(earthMesh);
        setReady(true);
      };

      loader.load(
        `${TEX_BASE}earth-blue-marble.jpg`,
        (map) => {
          loader.load(
            `${TEX_BASE}earth-topology.png`,
            (bump) => {
              loader.load(`${TEX_BASE}earth-water.png`, (spec) => swapMaterial(map, bump, spec), undefined, () =>
                swapMaterial(map, bump, null)
              );
            },
            undefined,
            () => swapMaterial(map, null, null)
          );
        },
        undefined,
        () => setReady(true)
      );

      // Atmosphere glow (fresnel-style rim light)
      const atmosphere = new THREE.Mesh(
        new THREE.SphereGeometry(RADIUS * 1.045, 64, 64),
        new THREE.ShaderMaterial({
          vertexShader: `
            varying vec3 vNormal;
            void main() {
              vNormal = normalize(normalMatrix * normal);
              gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
            }
          `,
          fragmentShader: `
            varying vec3 vNormal;
            void main() {
              float intensity = pow(0.62 - dot(vNormal, vec3(0.0, 0.0, 1.0)), 2.8);
              gl_FragColor = vec4(0.45, 0.85, 1.0, 1.0) * intensity;
            }
          `,
          blending: THREE.AdditiveBlending,
          side: THREE.BackSide,
          transparent: true
        })
      );
      scene.add(atmosphere);

      const markersGroup = new THREE.Group();
      globeGroup.add(markersGroup);
      const glowTexture = makeGlowTexture(THREE);
      const markerMeshes = [];

      const buildMarkers = (newsItems) => {
        while (markersGroup.children.length) {
          const g = markersGroup.children.pop();
          g.traverse((obj) => {
            obj.geometry?.dispose?.();
            obj.material?.dispose?.();
          });
        }
        markerMeshes.length = 0;

        newsItems.forEach((item, i) => {
          const color = new THREE.Color(categoryColor(item.category));
          const position = latLonToVector3(Number(item.lat), Number(item.lon), RADIUS * 1.012, THREE);

          const group = new THREE.Group();
          group.position.copy(position);

          const dot = new THREE.Mesh(
            new THREE.SphereGeometry(MARKER_SIZE, 16, 16),
            new THREE.MeshBasicMaterial({ color })
          );
          dot.userData.item = item;
          group.add(dot);
          markerMeshes.push(dot);

          const halo = new THREE.Sprite(
            new THREE.SpriteMaterial({ map: glowTexture, color, transparent: true, opacity: 0.85, depthWrite: false })
          );
          halo.scale.set(MARKER_SIZE * 6, MARKER_SIZE * 6, 1);
          group.add(halo);

          const ring = new THREE.Sprite(
            new THREE.SpriteMaterial({ map: glowTexture, color, transparent: true, opacity: 0.5, depthWrite: false })
          );
          group.userData.ring = ring;
          group.userData.phase = (i / Math.max(1, newsItems.length)) * 1.6;
          group.add(ring);

          markersGroup.add(group);
        });
      };

      // ---- interaction state ----
      const raycaster = new THREE.Raycaster();
      const pointerNDC = new THREE.Vector2();
      const state = { dragging: false, lastX: 0, lastY: 0, movedPx: 0, velX: 0, velY: 0, autoRotate: true };

      const getRect = () => renderer.domElement.getBoundingClientRect();
      const setPointerNDC = (clientX, clientY) => {
        const rect = getRect();
        pointerNDC.x = ((clientX - rect.left) / rect.width) * 2 - 1;
        pointerNDC.y = -((clientY - rect.top) / rect.height) * 2 + 1;
      };
      const pickMarker = () => {
        raycaster.setFromCamera(pointerNDC, camera);
        const hits = raycaster.intersectObjects(markerMeshes, false);
        return hits.length ? hits[0].object.userData.item : null;
      };

      const onPointerDown = (e) => {
        state.dragging = true;
        state.movedPx = 0;
        state.velX = 0;
        state.velY = 0;
        state.lastX = e.clientX;
        state.lastY = e.clientY;
        state.autoRotate = false;
        renderer.domElement.style.cursor = "grabbing";
        renderer.domElement.setPointerCapture?.(e.pointerId);
      };

      const onPointerMove = (e) => {
        if (state.dragging) {
          const dx = e.clientX - state.lastX;
          const dy = e.clientY - state.lastY;
          state.movedPx += Math.abs(dx) + Math.abs(dy);
          globeGroup.rotation.y += dx * DRAG_ROTATE_SPEED;
          globeGroup.rotation.x = Math.max(
            -MAX_TILT,
            Math.min(MAX_TILT, globeGroup.rotation.x + dy * DRAG_ROTATE_SPEED)
          );
          state.velX = dx * DRAG_ROTATE_SPEED;
          state.velY = dy * DRAG_ROTATE_SPEED;
          state.lastX = e.clientX;
          state.lastY = e.clientY;
        } else {
          setPointerNDC(e.clientX, e.clientY);
          const hit = pickMarker();
          sceneRefs.current.setHoveredFromLoop?.(hit, e.clientX, e.clientY);
        }
      };

      const endDrag = (e) => {
        if (!state.dragging) return;
        state.dragging = false;
        renderer.domElement.style.cursor = "grab";
        if (state.movedPx < CLICK_MOVE_THRESHOLD) {
          setPointerNDC(e.clientX, e.clientY);
          const hit = pickMarker();
          if (hit) sceneRefs.current.setSelectedFromLoop?.(hit);
        }
        setTimeout(() => {
          if (!state.dragging) state.autoRotate = true;
        }, 2200);
      };

      const onPointerLeave = () => {
        if (!state.dragging) sceneRefs.current.setHoveredFromLoop?.(null);
      };

      const onWheel = (e) => {
        e.preventDefault();
        camera.position.z = Math.max(3.6, Math.min(9, camera.position.z + e.deltaY * 0.0025));
      };

      const dom = renderer.domElement;
      dom.addEventListener("pointerdown", onPointerDown);
      window.addEventListener("pointermove", onPointerMove);
      window.addEventListener("pointerup", endDrag);
      dom.addEventListener("pointerleave", onPointerLeave);
      dom.addEventListener("wheel", onWheel, { passive: false });

      const onResize = () => {
        const w = mount.clientWidth;
        const h = mount.clientHeight;
        if (!w || !h) return;
        camera.aspect = w / h;
        camera.updateProjectionMatrix();
        renderer.setSize(w, h);
      };
      window.addEventListener("resize", onResize);
      const resizeObserver = new ResizeObserver(onResize);
      resizeObserver.observe(mount);

      let raf;
      const start = performance.now();
      const tick = () => {
        const t = (performance.now() - start) / 1000;

        if (!state.dragging) {
          if (Math.abs(state.velX) + Math.abs(state.velY) > 0.00005) {
            globeGroup.rotation.y += state.velX;
            globeGroup.rotation.x = Math.max(-MAX_TILT, Math.min(MAX_TILT, globeGroup.rotation.x + state.velY));
            state.velX *= 0.94;
            state.velY *= 0.94;
          } else if (state.autoRotate) {
            globeGroup.rotation.y += AUTO_ROTATE_SPEED;
          }
        }

        markersGroup.children.forEach((group) => {
          const ring = group.userData.ring;
          if (!ring) return;
          const phase = (t * 0.9 + group.userData.phase) % 1.6;
          const scale = MARKER_SIZE * 5 * (1 + phase * 1.6);
          ring.scale.set(scale, scale, 1);
          ring.material.opacity = Math.max(0, 0.5 - phase * 0.32);
        });

        renderer.render(scene, camera);
        raf = requestAnimationFrame(tick);
      };
      raf = requestAnimationFrame(tick);

      sceneRefs.current = {
        THREE,
        markersGroup,
        markerMeshes,
        glowTexture,
        buildMarkers,
        setHoveredFromLoop: (item, x, y) => {
          setHovered((prev) => (prev?.id === item?.id ? prev : item));
          if (item) setTooltipPos({ x, y });
        },
        setSelectedFromLoop: (item) => setSelected(item),
        dispose: () => {
          cancelAnimationFrame(raf);
          window.removeEventListener("pointermove", onPointerMove);
          window.removeEventListener("pointerup", endDrag);
          window.removeEventListener("resize", onResize);
          resizeObserver.disconnect();
          dom.removeEventListener("wheel", onWheel);
          dom.removeEventListener("pointerdown", onPointerDown);
          dom.removeEventListener("pointerleave", onPointerLeave);
          while (markersGroup.children.length) {
            const g = markersGroup.children.pop();
            g.traverse((obj) => {
              obj.geometry?.dispose?.();
              obj.material?.dispose?.();
            });
          }
          geometry.dispose();
          earthMesh.material.dispose();
          atmosphere.geometry.dispose();
          atmosphere.material.dispose();
          starGeo.dispose();
          starMat.dispose();
          glowTexture.dispose();
          renderer.dispose();
          if (mount.contains(dom)) mount.removeChild(dom);
        }
      };

      // items may have already loaded while the scene was initializing
      buildMarkers(itemsRef.current);
    })();

    return () => {
      disposed = true;
      sceneRefs.current.dispose?.();
    };
  }, []);

  // ---- Rebuild markers whenever the news items change ----
  useEffect(() => {
    sceneRefs.current.buildMarkers?.(items);
  }, [items]);

  return (
    <section className="globe-wrap">
      <div className="globe-canvas" ref={mountRef} aria-label="Interactive 3D globe of global news" />
      {!ready && <div className="globe-loading">Loading Earth…</div>}
      {hovered && !selected && (
        <div className="hover-tip" style={{ left: tooltipPos.x, top: tooltipPos.y }}>
          <span className="dot" style={{ background: categoryColor(hovered.category) }} />
          <div>
            <div className="hover-title">{hovered.title}</div>
            <div className="hover-meta">
              {hovered.city}
              {hovered.country ? `, ${hovered.country}` : ""} · {timeAgo(hovered.createdAt)}
            </div>
          </div>
        </div>
      )}
      <div className="drag-hint">Drag to rotate · Scroll to zoom · Click a pulse to read</div>
      <Legend mode={mode} items={items} />
      {selected && <NewsPanel item={selected} onClose={() => setSelected(null)} />}
      {error && <div className="empty">Feed error: {error}</div>}
      {!error && items.length === 0 && ready && <div className="empty">No stories in the last 24 hours.</div>}
    </section>
  );
}

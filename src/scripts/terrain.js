import * as THREE from "three";

function peak(x, z, px, pz, sx, sz, height) {
  const dx = (x - px) / sx;
  const dz = (z - pz) / sz;
  return height * Math.exp(-(dx * dx + dz * dz));
}

function createTerrainGeometry() {
  const geometry = new THREE.PlaneGeometry(9, 9, 100, 100);
  const vertices = geometry.attributes.position;

  for (let i = 0; i < vertices.count; i += 1) {
    const x = vertices.getX(i);
    const z = vertices.getY(i);

    const height =
      peak(x, z, 1.0, -0.7, 1.3, 1.5, 1.7) +
      peak(x, z, -1.8, -0.1, 1.1, 1.4, 1.15) +
      peak(x, z, 2.8, 1.1, 1.0, 1.25, 0.92) +
      peak(x, z, -3.2, 2.1, 1.0, 1.2, 0.68) -
      peak(x, z, -0.4, 1.4, 1.8, 1.0, 0.45) +
      Math.sin(x * 1.12 + z * 0.34) * 0.1 +
      Math.cos(z * 0.96 - x * 0.42) * 0.08 +
      Math.sin(x * 0.48 + z * 0.7) * 0.045;

    vertices.setZ(i, height);
  }

  geometry.rotateX(-Math.PI / 2);
  geometry.computeVertexNormals();
  geometry.computeBoundingSphere();

  return geometry;
}

function initializeTerrainHost(host) {
  const canvas = host.querySelector(".terrain-canvas");

  if (!canvas || host.dataset.terrainInitialized === "true") {
    return;
  }

  host.dataset.terrainInitialized = "true";

  try {
    const scene = new THREE.Scene();

    const camera = new THREE.PerspectiveCamera(
      42,
      1,
      0.1,
      100,
    );

    const renderer = new THREE.WebGLRenderer({
      canvas,
      alpha: false,
      antialias: true,
      powerPreference: "low-power",
    });

    renderer.setClearColor(0x080808, 1);
    renderer.setPixelRatio(
      Math.min(window.devicePixelRatio || 1, 2),
    );

    const ambient = new THREE.AmbientLight(0xffffff, 1.15);

    const directional = new THREE.DirectionalLight(
      0xffffff,
      1.4,
    );

    directional.position.set(-4, 7, 5);

    scene.add(ambient, directional);

    const geometry = createTerrainGeometry();

    const material = new THREE.MeshStandardMaterial({
      color: 0x777777,
      wireframe: true,
      roughness: 1,
      metalness: 0,
      transparent: true,
      opacity: 0.3,
    });

    const terrain = new THREE.Mesh(
      geometry,
      material,
    );

    terrain.rotation.set(-0.04, 0.08, 0);

    scene.add(terrain);

    camera.position.set(5, 5, 7);
    camera.lookAt(0, 0, 0);

    const render = () => {
      renderer.render(scene, camera);
    };

    const resize = () => {
      const { width, height } =
        host.getBoundingClientRect();

      if (!width || !height) {
        return;
      }

      renderer.setPixelRatio(
        Math.min(window.devicePixelRatio || 1, 2),
      );

      renderer.setSize(width, height, false);

      camera.aspect = width / height;
      camera.updateProjectionMatrix();

      render();
    };

    const activePointers = new Map();
    let pinchDistance = 0;

    const applyZoom = (scale) => {
      camera.position.setLength(
        THREE.MathUtils.clamp(
          camera.position.length() * scale,
          5.5,
          18,
        ),
      );

      camera.lookAt(0, 0, 0);
    };

    const onPointerDown = (event) => {
      canvas.setPointerCapture(event.pointerId);

      activePointers.set(event.pointerId, {
        x: event.clientX,
        y: event.clientY,
      });

      if (activePointers.size === 2) {
        const points = [...activePointers.values()];

        pinchDistance = Math.hypot(
          points[0].x - points[1].x,
          points[0].y - points[1].y,
        );
      }
    };

    const onPointerMove = (event) => {
      if (!activePointers.has(event.pointerId)) {
        return;
      }

      const previous = activePointers.get(
        event.pointerId,
      );

      activePointers.set(event.pointerId, {
        x: event.clientX,
        y: event.clientY,
      });

      if (activePointers.size > 1) {
        const points = [...activePointers.values()];

        const nextDistance = Math.hypot(
          points[0].x - points[1].x,
          points[0].y - points[1].y,
        );

        if (
          pinchDistance > 0 &&
          nextDistance > 0
        ) {
          applyZoom(
            pinchDistance / nextDistance,
          );
        }

        pinchDistance = nextDistance;
      } else {
        terrain.rotation.y +=
          (event.clientX - previous.x) * 0.006;

        terrain.rotation.x =
          THREE.MathUtils.clamp(
            terrain.rotation.x +
              (event.clientY - previous.y) * 0.004,
            -0.48,
            0.28,
          );
      }

      render();
    };

    const onPointerUp = (event) => {
      activePointers.delete(event.pointerId);

      if (activePointers.size < 2) {
        pinchDistance = 0;
      }
    };

    const onWheel = (event) => {
      event.preventDefault();

      applyZoom(
        event.deltaY > 0 ? 1.08 : 0.92,
      );

      render();
    };

    canvas.addEventListener(
      "pointerdown",
      onPointerDown,
    );

    canvas.addEventListener(
      "pointermove",
      onPointerMove,
    );

    canvas.addEventListener(
      "pointerup",
      onPointerUp,
    );

    canvas.addEventListener(
      "pointercancel",
      onPointerUp,
    );

    canvas.addEventListener(
      "wheel",
      onWheel,
      { passive: false },
    );

    window.addEventListener(
      "resize",
      resize,
      { passive: true },
    );

    const observer =
      new ResizeObserver(resize);

    observer.observe(host);

    resize();
  } catch (error) {
    console.error(
      "Unable to initialize the terrain visualization.",
      error,
    );

    host.classList.add("is-unavailable");
    canvas.hidden = true;
  }
}

export function initializeTerrain() {
  document
    .querySelectorAll("[data-terrain]")
    .forEach((host) => {
      initializeTerrainHost(host);
    });
}
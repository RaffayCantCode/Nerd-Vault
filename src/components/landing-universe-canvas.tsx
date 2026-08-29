"use client";

import { useEffect, useRef } from "react";
import * as THREE from "three";

export type RealmTheme = "all" | "movie" | "show" | "anime" | "game";

const REALM_COLORS: Record<RealmTheme, { primary: number; secondary: number; fog: number }> = {
  all: { primary: 0x69c5ac, secondary: 0xa855f7, fog: 0x050811 },
  movie: { primary: 0xf59e0b, secondary: 0xef4444, fog: 0x0a0604 },
  show: { primary: 0xa855f7, secondary: 0x3b82f6, fog: 0x080512 },
  anime: { primary: 0xec4899, secondary: 0x06b6d4, fog: 0x0a0410 },
  game: { primary: 0x10b981, secondary: 0x6366f1, fog: 0x040b08 },
};

function createSoftCircleTexture() {
  if (typeof document === "undefined") return null;
  const canvas = document.createElement("canvas");
  canvas.width = 64;
  canvas.height = 64;
  const ctx = canvas.getContext("2d");
  if (ctx) {
    const gradient = ctx.createRadialGradient(32, 32, 0, 32, 32, 32);
    gradient.addColorStop(0, "rgba(255, 255, 255, 1)");
    gradient.addColorStop(0.3, "rgba(255, 255, 255, 0.8)");
    gradient.addColorStop(0.65, "rgba(255, 255, 255, 0.2)");
    gradient.addColorStop(1, "rgba(255, 255, 255, 0)");
    ctx.fillStyle = gradient;
    ctx.beginPath();
    ctx.arc(32, 32, 32, 0, Math.PI * 2);
    ctx.fill();
  }
  const texture = new THREE.CanvasTexture(canvas);
  return texture;
}

export function LandingUniverseCanvas({
  activeRealm = "all",
}: {
  activeRealm?: RealmTheme;
}) {
  const mountRef = useRef<HTMLDivElement>(null);
  const realmRef = useRef<RealmTheme>(activeRealm);
  realmRef.current = activeRealm;

  useEffect(() => {
    const container = mountRef.current;
    if (!container || typeof window === "undefined") return;

    let animId: number;
    let width = container.clientWidth || window.innerWidth;
    let height = container.clientHeight || window.innerHeight;

    // 1. Scene & Camera
    const scene = new THREE.Scene();
    scene.fog = new THREE.FogExp2(REALM_COLORS.all.fog, 0.002);

    const camera = new THREE.PerspectiveCamera(50, width / height, 0.1, 1000);
    camera.position.z = 90;

    // 2. Renderer
    const renderer = new THREE.WebGLRenderer({
      antialias: true,
      alpha: true,
      powerPreference: "high-performance",
    });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.75));
    renderer.setClearColor(0x000000, 0);
    container.appendChild(renderer.domElement);

    // 3. Multi-Layer Cosmic Starfield Particles (Positioned Behind Text Corridor)
    const starCount = 1100;
    const starGeo = new THREE.BufferGeometry();
    const starPositions = new Float32Array(starCount * 3);
    const starColors = new Float32Array(starCount * 3);
    const starSizes = new Float32Array(starCount);

    const baseColor = new THREE.Color(REALM_COLORS.all.primary);
    const altColor = new THREE.Color(REALM_COLORS.all.secondary);
    const whiteColor = new THREE.Color(0xffffff);

    for (let i = 0; i < starCount; i++) {
      const idx = i * 3;
      // Cylindrical distribution framing the viewport
      const radius = 35 + Math.random() * 115;
      const theta = Math.random() * Math.PI * 2;
      const ySpread = (Math.random() - 0.5) * 110;

      const posX = Math.cos(theta) * radius;
      const posY = ySpread;
      // Keep stars strictly in the mid-to-deep background behind text
      const isCenterCorridor = Math.abs(posX) < 50 && Math.abs(posY) < 32;
      const posZ = isCenterCorridor
        ? -110 - Math.random() * 80
        : -75 + (Math.random() - 0.5) * 70;

      starPositions[idx] = posX;
      starPositions[idx + 1] = posY;
      starPositions[idx + 2] = posZ;

      // Color variation
      const mix = Math.random();
      const chosenColor = mix < 0.45 ? whiteColor : mix < 0.75 ? baseColor : altColor;
      starColors[idx] = chosenColor.r;
      starColors[idx + 1] = chosenColor.g;
      starColors[idx + 2] = chosenColor.b;

      starSizes[i] = Math.random() * 2.2 + 0.8;
    }

    starGeo.setAttribute("position", new THREE.BufferAttribute(starPositions, 3));
    starGeo.setAttribute("color", new THREE.BufferAttribute(starColors, 3));
    starGeo.setAttribute("size", new THREE.BufferAttribute(starSizes, 1));

    const circleTexture = createSoftCircleTexture();
    const starMat = new THREE.PointsMaterial({
      size: 2.0,
      map: circleTexture ?? undefined,
      vertexColors: true,
      transparent: true,
      opacity: 0.65,
      blending: THREE.AdditiveBlending,
      sizeAttenuation: true,
      depthWrite: false,
    });

    const starField = new THREE.Points(starGeo, starMat);
    scene.add(starField);

    // 4. Shimmering Celestial Orbital Rings (Positioned in deep space)
    const ringGroup = new THREE.Group();
    ringGroup.position.z = -25;

    // Outer Celestial Ring
    const ring1Geo = new THREE.TorusGeometry(36, 0.08, 16, 120);
    const ring1Mat = new THREE.MeshBasicMaterial({
      color: REALM_COLORS.all.primary,
      transparent: true,
      opacity: 0.16,
      wireframe: true,
    });
    const ring1 = new THREE.Mesh(ring1Geo, ring1Mat);
    ring1.rotation.x = Math.PI / 2.8;
    ring1.rotation.y = Math.PI / 8;
    ringGroup.add(ring1);

    // Inner Gyro Ring
    const ring2Geo = new THREE.TorusGeometry(24, 0.06, 16, 90);
    const ring2Mat = new THREE.MeshBasicMaterial({
      color: REALM_COLORS.all.secondary,
      transparent: true,
      opacity: 0.12,
    });
    const ring2 = new THREE.Mesh(ring2Geo, ring2Mat);
    ring2.rotation.x = -Math.PI / 3.4;
    ring2.rotation.z = Math.PI / 6;
    ringGroup.add(ring2);

    // 4 Orbiting Realm Constellation Nodes (Floating Polyhedra)
    const nodeGeometry = new THREE.IcosahedronGeometry(1.2, 0);
    const nodes: Array<{ mesh: THREE.Mesh; angle: number; speed: number; dist: number; yOffset: number }> = [];

    const realmColorsList = [0xf59e0b, 0xa855f7, 0xec4899, 0x10b981];
    for (let i = 0; i < 4; i++) {
      const nodeMat = new THREE.MeshBasicMaterial({
        color: realmColorsList[i],
        transparent: true,
        opacity: 0.35,
        wireframe: true,
      });
      const nodeMesh = new THREE.Mesh(nodeGeometry, nodeMat);
      ringGroup.add(nodeMesh);

      nodes.push({
        mesh: nodeMesh,
        angle: (i * Math.PI) / 2,
        speed: 0.003 + i * 0.001,
        dist: 28 + i * 3,
        yOffset: (i - 1.5) * 6,
      });
    }

    scene.add(ringGroup);

    // 5. Gentle Lighting
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.7);
    scene.add(ambientLight);

    const primaryLight = new THREE.PointLight(REALM_COLORS.all.primary, 1.2, 200);
    primaryLight.position.set(0, 15, -10);
    scene.add(primaryLight);

    // 6. Smooth Mouse Parallax
    let targetMouseX = 0;
    let targetMouseY = 0;
    let mouseX = 0;
    let mouseY = 0;

    const handleMouseMove = (e: MouseEvent) => {
      targetMouseX = (e.clientX / window.innerWidth - 0.5) * 14;
      targetMouseY = (e.clientY / window.innerHeight - 0.5) * 10;
    };
    window.addEventListener("mousemove", handleMouseMove, { passive: true });

    // 7. Resize Handler
    const handleResize = () => {
      if (!container) return;
      width = container.clientWidth || window.innerWidth;
      height = container.clientHeight || window.innerHeight;
      camera.aspect = width / height;
      camera.updateProjectionMatrix();
      renderer.setSize(width, height);
    };
    window.addEventListener("resize", handleResize);

    // 8. Animation Loop
    let clock = new THREE.Clock();
    const currentColor = new THREE.Color(REALM_COLORS.all.primary);
    const targetColor = new THREE.Color(REALM_COLORS.all.primary);
    const currentAltColor = new THREE.Color(REALM_COLORS.all.secondary);
    const targetAltColor = new THREE.Color(REALM_COLORS.all.secondary);

    const animate = () => {
      animId = requestAnimationFrame(animate);
      const elapsed = clock.getElapsedTime();

      // Smooth color transition based on active realm
      const activeData = REALM_COLORS[realmRef.current] || REALM_COLORS.all;
      targetColor.setHex(activeData.primary);
      targetAltColor.setHex(activeData.secondary);
      currentColor.lerp(targetColor, 0.04);
      currentAltColor.lerp(targetAltColor, 0.04);

      ring1Mat.color.copy(currentColor);
      ring2Mat.color.copy(currentAltColor);
      primaryLight.color.copy(currentColor);

      // Smooth parallax damping
      mouseX += (targetMouseX - mouseX) * 0.04;
      mouseY += (targetMouseY - mouseY) * 0.04;

      camera.position.x = mouseX;
      camera.position.y = -mouseY;
      camera.lookAt(0, 0, -30);

      // Cosmic Rotations
      starField.rotation.y = elapsed * 0.012;
      starField.rotation.x = Math.sin(elapsed * 0.008) * 0.03;

      ringGroup.rotation.z = elapsed * 0.018;
      ring1.rotation.z = elapsed * 0.024;
      ring2.rotation.y = elapsed * -0.03;

      // Orbiting Nodes
      nodes.forEach((node) => {
        node.angle += node.speed;
        node.mesh.position.x = Math.cos(node.angle) * node.dist;
        node.mesh.position.y = Math.sin(node.angle * 1.3) * (node.dist * 0.4) + node.yOffset;
        node.mesh.position.z = Math.sin(node.angle) * (node.dist * 0.5);
        node.mesh.rotation.x += 0.015;
        node.mesh.rotation.y += 0.02;
      });

      renderer.render(scene, camera);
    };

    animate();

    return () => {
      cancelAnimationFrame(animId);
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("resize", handleResize);
      renderer.dispose();
      starGeo.dispose();
      starMat.dispose();
      ring1Geo.dispose();
      ring1Mat.dispose();
      ring2Geo.dispose();
      ring2Mat.dispose();
      nodeGeometry.dispose();
      if (circleTexture) circleTexture.dispose();
      if (container && renderer.domElement.parentNode === container) {
        container.removeChild(renderer.domElement);
      }
    };
  }, []);

  return <div ref={mountRef} className="nv-universe-canvas-mount" aria-hidden="true" />;
}

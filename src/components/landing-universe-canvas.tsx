"use client";

import { useEffect, useRef } from "react";
import * as THREE from "three";

export type RealmTheme = "all" | "movie" | "show" | "anime" | "game";

const REALM_COLORS: Record<RealmTheme, { primary: number; secondary: number; fog: number }> = {
  all: { primary: 0x69c5ac, secondary: 0xa855f7, fog: 0x070b14 },
  movie: { primary: 0xf59e0b, secondary: 0xef4444, fog: 0x0d0806 },
  show: { primary: 0xa855f7, secondary: 0x3b82f6, fog: 0x0a0714 },
  anime: { primary: 0xec4899, secondary: 0x06b6d4, fog: 0x0c0612 },
  game: { primary: 0x10b981, secondary: 0x6366f1, fog: 0x050e0c },
};

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
    scene.fog = new THREE.FogExp2(REALM_COLORS.all.fog, 0.0018);

    const camera = new THREE.PerspectiveCamera(55, width / height, 0.1, 1000);
    camera.position.z = 85;

    // 2. Renderer
    const renderer = new THREE.WebGLRenderer({
      antialias: true,
      alpha: true,
      powerPreference: "high-performance",
    });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setClearColor(0x000000, 0);
    container.appendChild(renderer.domElement);

    // 3. Multi-Layer Cosmic Starfield Particles
    const starCount = 1400;
    const starGeo = new THREE.BufferGeometry();
    const starPositions = new Float32Array(starCount * 3);
    const starColors = new Float32Array(starCount * 3);
    const starSizes = new Float32Array(starCount);

    const baseColor = new THREE.Color(REALM_COLORS.all.primary);
    const altColor = new THREE.Color(REALM_COLORS.all.secondary);
    const whiteColor = new THREE.Color(0xffffff);

    for (let i = 0; i < starCount; i++) {
      const idx = i * 3;
      // Cylindrical distribution with natural cosmic depth
      const radius = 25 + Math.random() * 120;
      const theta = Math.random() * Math.PI * 2;
      const ySpread = (Math.random() - 0.5) * 110;

      starPositions[idx] = Math.cos(theta) * radius;
      starPositions[idx + 1] = ySpread;
      starPositions[idx + 2] = (Math.random() - 0.5) * 160;

      // Color variation
      const mix = Math.random();
      const chosenColor = mix < 0.4 ? whiteColor : mix < 0.75 ? baseColor : altColor;
      starColors[idx] = chosenColor.r;
      starColors[idx + 1] = chosenColor.g;
      starColors[idx + 2] = chosenColor.b;

      starSizes[i] = Math.random() * 2.8 + 0.8;
    }

    starGeo.setAttribute("position", new THREE.BufferAttribute(starPositions, 3));
    starGeo.setAttribute("color", new THREE.BufferAttribute(starColors, 3));
    starGeo.setAttribute("size", new THREE.BufferAttribute(starSizes, 1));

    // Particle Shader Material for soft glowing circular points
    const starMat = new THREE.PointsMaterial({
      size: 2.2,
      vertexColors: true,
      transparent: true,
      opacity: 0.85,
      blending: THREE.AdditiveBlending,
      sizeAttenuation: true,
    });

    const starField = new THREE.Points(starGeo, starMat);
    scene.add(starField);

    // 4. Shimmering Celestial Orbital Rings
    const ringGroup = new THREE.Group();

    // Outer Celestial Ring
    const ring1Geo = new THREE.TorusGeometry(38, 0.12, 16, 120);
    const ring1Mat = new THREE.MeshBasicMaterial({
      color: REALM_COLORS.all.primary,
      transparent: true,
      opacity: 0.28,
      wireframe: true,
    });
    const ring1 = new THREE.Mesh(ring1Geo, ring1Mat);
    ring1.rotation.x = Math.PI / 2.8;
    ring1.rotation.y = Math.PI / 8;
    ringGroup.add(ring1);

    // Inner Gyro Ring
    const ring2Geo = new THREE.TorusGeometry(26, 0.08, 16, 90);
    const ring2Mat = new THREE.MeshBasicMaterial({
      color: REALM_COLORS.all.secondary,
      transparent: true,
      opacity: 0.22,
    });
    const ring2 = new THREE.Mesh(ring2Geo, ring2Mat);
    ring2.rotation.x = -Math.PI / 3.4;
    ring2.rotation.z = Math.PI / 6;
    ringGroup.add(ring2);

    // 4 Orbiting Realm Constellation Nodes (Floating Polyhedra)
    const nodeGeometry = new THREE.IcosahedronGeometry(1.4, 0);
    const nodes: Array<{ mesh: THREE.Mesh; angle: number; speed: number; dist: number; yOffset: number }> = [];

    const realmColorsList = [0xf59e0b, 0xa855f7, 0xec4899, 0x10b981];
    for (let i = 0; i < 4; i++) {
      const nodeMat = new THREE.MeshStandardMaterial({
        color: realmColorsList[i],
        emissive: realmColorsList[i],
        emissiveIntensity: 0.6,
        roughness: 0.2,
        metalness: 0.8,
        wireframe: true,
      });
      const nodeMesh = new THREE.Mesh(nodeGeometry, nodeMat);
      ringGroup.add(nodeMesh);
      nodes.push({
        mesh: nodeMesh,
        angle: (i * Math.PI) / 2,
        speed: 0.003 + (i % 2) * 0.0015,
        dist: 36,
        yOffset: (i % 2 === 0 ? 1 : -1) * 6,
      });
    }

    scene.add(ringGroup);

    // 5. Dynamic Volumetric Lighting
    const ambientLight = new THREE.AmbientLight(0x223344, 1.2);
    scene.add(ambientLight);

    const primaryLight = new THREE.PointLight(REALM_COLORS.all.primary, 3.5, 120);
    primaryLight.position.set(0, 10, 20);
    scene.add(primaryLight);

    const secondaryLight = new THREE.PointLight(REALM_COLORS.all.secondary, 2.8, 140);
    secondaryLight.position.set(30, -20, 10);
    scene.add(secondaryLight);

    // 6. Interactive Mouse Depth Parallax
    let mouseX = 0;
    let mouseY = 0;
    let targetX = 0;
    let targetY = 0;

    function handleMouseMove(e: MouseEvent) {
      const normX = (e.clientX / window.innerWidth) * 2 - 1;
      const normY = -(e.clientY / window.innerHeight) * 2 + 1;
      targetX = normX * 18;
      targetY = normY * 12;
    }

    window.addEventListener("mousemove", handleMouseMove, { passive: true });

    // Handle Resize
    function handleResize() {
      if (!container) return;
      width = container.clientWidth || window.innerWidth;
      height = container.clientHeight || window.innerHeight;
      camera.aspect = width / height;
      camera.updateProjectionMatrix();
      renderer.setSize(width, height);
    }

    window.addEventListener("resize", handleResize, { passive: true });

    // 7. Animation Loop
    let lastTime = performance.now();
    let isVisible = true;

    const observer = new IntersectionObserver(
      (entries) => {
        isVisible = entries[0]?.isIntersecting ?? true;
      },
      { threshold: 0.05 },
    );
    observer.observe(container);

    function animate(time: number) {
      animId = requestAnimationFrame(animate);

      if (!isVisible || document.hidden) return;

      const delta = (time - lastTime) / 1000;
      lastTime = time;

      // Smooth camera interpolation toward mouse target
      mouseX += (targetX - mouseX) * 0.04;
      mouseY += (targetY - mouseY) * 0.04;

      camera.position.x = mouseX;
      camera.position.y = mouseY;
      camera.lookAt(0, 0, 0);

      // Starfield subtle cosmic rotation
      starField.rotation.y += 0.0004;
      starField.rotation.x += 0.00015;

      // Orbital rings rotation
      ring1.rotation.z += 0.002;
      ring2.rotation.y += 0.003;
      ring2.rotation.x += 0.0015;

      // Orbiting Realm Nodes
      nodes.forEach((n) => {
        n.angle += n.speed;
        n.mesh.position.x = Math.cos(n.angle) * n.dist;
        n.mesh.position.z = Math.sin(n.angle) * n.dist;
        n.mesh.position.y = Math.sin(n.angle * 2) * n.yOffset;
        n.mesh.rotation.x += 0.01;
        n.mesh.rotation.y += 0.015;
      });

      // Smoothly blend light colors based on current active realm
      const targetColors = REALM_COLORS[realmRef.current] || REALM_COLORS.all;
      const targetPrimary = new THREE.Color(targetColors.primary);
      const targetSecondary = new THREE.Color(targetColors.secondary);

      primaryLight.color.lerp(targetPrimary, 0.05);
      secondaryLight.color.lerp(targetSecondary, 0.05);
      ring1Mat.color.lerp(targetPrimary, 0.05);
      ring2Mat.color.lerp(targetSecondary, 0.05);

      renderer.render(scene, camera);
    }

    animId = requestAnimationFrame(animate);

    return () => {
      cancelAnimationFrame(animId);
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("resize", handleResize);
      observer.disconnect();

      // Clean up Three.js resources
      starGeo.dispose();
      starMat.dispose();
      ring1Geo.dispose();
      ring1Mat.dispose();
      ring2Geo.dispose();
      ring2Mat.dispose();
      nodeGeometry.dispose();
      renderer.dispose();

      if (renderer.domElement.parentNode) {
        renderer.domElement.parentNode.removeChild(renderer.domElement);
      }
    };
  }, []);

  return (
    <div
      ref={mountRef}
      className="nv-universe-canvas-mount"
      aria-hidden="true"
    />
  );
}

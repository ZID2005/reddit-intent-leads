import React, { useEffect, useRef } from 'react';
import * as THREE from 'three';

export function ThreeRadarField() {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!containerRef.current) return;

    const container = containerRef.current;
    const width = container.clientWidth;
    const height = container.clientHeight;

    // 1. Scene setup
    const scene = new THREE.Scene();

    // 2. Camera setup
    const camera = new THREE.PerspectiveCamera(60, width / height, 0.1, 100);
    camera.position.z = 35;

    // 3. Renderer setup
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    container.appendChild(renderer.domElement);

    // 4. Create Particles
    const particleCount = 70;
    const positions = new Float32Array(particleCount * 3);
    const velocities: { x: number; y: number; z: number }[] = [];

    // Generate random positions & velocities
    for (let i = 0; i < particleCount; i++) {
      positions[i * 3] = (Math.random() - 0.5) * 55;
      positions[i * 3 + 1] = (Math.random() - 0.5) * 35;
      positions[i * 3 + 2] = (Math.random() - 0.5) * 25;

      velocities.push({
        x: (Math.random() - 0.5) * 0.02,
        y: (Math.random() - 0.5) * 0.02,
        z: (Math.random() - 0.5) * 0.015,
      });
    }

    const particleGeometry = new THREE.BufferGeometry();
    particleGeometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));

    // Particle texture (smooth radial gradient dot)
    const canvas = document.createElement('canvas');
    canvas.width = 16;
    canvas.height = 16;
    const ctx = canvas.getContext('2d');
    if (ctx) {
      const gradient = ctx.createRadialGradient(8, 8, 0, 8, 8, 8);
      gradient.addColorStop(0, 'rgba(184, 242, 0, 1)');
      gradient.addColorStop(0.4, 'rgba(184, 242, 0, 0.3)');
      gradient.addColorStop(1, 'rgba(184, 242, 0, 0)');
      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, 16, 16);
    }
    const texture = new THREE.CanvasTexture(canvas);

    const particleMaterial = new THREE.PointsMaterial({
      size: 0.9,
      map: texture,
      transparent: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });

    const particleSystem = new THREE.Points(particleGeometry, particleMaterial);
    scene.add(particleSystem);

    // 5. Connecting lines
    const maxConnections = 120;
    const linePositions = new Float32Array(maxConnections * 2 * 3);
    const lineColors = new Float32Array(maxConnections * 2 * 3);

    const lineGeometry = new THREE.BufferGeometry();
    lineGeometry.setAttribute('position', new THREE.BufferAttribute(linePositions, 3));
    lineGeometry.setAttribute('color', new THREE.BufferAttribute(lineColors, 3));

    const lineMaterial = new THREE.LineBasicMaterial({
      vertexColors: true,
      transparent: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });

    const lineSystem = new THREE.LineSegments(lineGeometry, lineMaterial);
    scene.add(lineSystem);

    // Refined lime color
    const limeColor = new THREE.Color('#B8F200');

    // 6. Animation loop
    let animationFrameId: number;
    const clock = new THREE.Clock();

    const animate = () => {
      // Pause animation if tab is hidden to save battery / performance
      if (document.hidden) {
        animationFrameId = requestAnimationFrame(animate);
        return;
      }

      const time = clock.getElapsedTime();

      // Update particle positions
      const positionsAttr = particleGeometry.getAttribute('position') as THREE.BufferAttribute;
      const array = positionsAttr.array as Float32Array;

      for (let i = 0; i < particleCount; i++) {
        array[i * 3] += velocities[i].x;
        array[i * 3 + 1] += velocities[i].y;
        array[i * 3 + 2] += velocities[i].z;

        // Bouncing box boundaries
        const limitX = 28;
        const limitY = 18;
        const limitZ = 12;

        if (Math.abs(array[i * 3]) > limitX) velocities[i].x *= -1;
        if (Math.abs(array[i * 3 + 1]) > limitY) velocities[i].y *= -1;
        if (Math.abs(array[i * 3 + 2]) > limitZ) velocities[i].z *= -1;
      }
      positionsAttr.needsUpdate = true;

      // Update connection lines based on proximity
      let lineIndex = 0;
      const linePosAttr = lineGeometry.getAttribute('position') as THREE.BufferAttribute;
      const lineColAttr = lineGeometry.getAttribute('color') as THREE.BufferAttribute;
      
      const linePosArray = linePosAttr.array as Float32Array;
      const lineColArray = lineColAttr.array as Float32Array;

      linePosArray.fill(0);
      lineColArray.fill(0);

      const maxDist = 9.0;

      for (let i = 0; i < particleCount; i++) {
        for (let j = i + 1; j < particleCount; j++) {
          if (lineIndex >= maxConnections) break;

          const dx = array[i * 3] - array[j * 3];
          const dy = array[i * 3 + 1] - array[j * 3 + 1];
          const dz = array[i * 3 + 2] - array[j * 3 + 2];
          const dist = Math.sqrt(dx * dx + dy * dy + dz * dz);

          if (dist < maxDist) {
            const idx = lineIndex * 6;

            // Particle i
            linePosArray[idx] = array[i * 3];
            linePosArray[idx + 1] = array[i * 3 + 1];
            linePosArray[idx + 2] = array[i * 3 + 2];

            // Particle j
            linePosArray[idx + 3] = array[j * 3];
            linePosArray[idx + 4] = array[j * 3 + 1];
            linePosArray[idx + 5] = array[j * 3 + 2];

            // Calculate fade and pulse
            const baseAlpha = 1.0 - dist / maxDist;
            const pulse = 0.3 + 0.7 * Math.sin(time * 1.5 + dist * 0.8);
            const alpha = baseAlpha * pulse * 0.12; // Very subtle connect line

            // Set start and end vertex colors with alpha intensity
            lineColArray[idx] = limeColor.r * alpha;
            lineColArray[idx + 1] = limeColor.g * alpha;
            lineColArray[idx + 2] = limeColor.b * alpha;

            lineColArray[idx + 3] = limeColor.r * alpha;
            lineColArray[idx + 4] = limeColor.g * alpha;
            lineColArray[idx + 5] = limeColor.b * alpha;

            lineIndex++;
          }
        }
      }
      linePosAttr.needsUpdate = true;
      lineColAttr.needsUpdate = true;

      // Slow circular camera orbit for radar feel
      camera.position.x = Math.sin(time * 0.03) * 6;
      camera.position.y = Math.cos(time * 0.03) * 4;
      camera.lookAt(0, 0, 0);

      renderer.render(scene, camera);
      animationFrameId = requestAnimationFrame(animate);
    };

    // Resize handling
    const handleResize = () => {
      if (!containerRef.current) return;
      const newWidth = container.clientWidth;
      const newHeight = container.clientHeight;
      camera.aspect = newWidth / newHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(newWidth, newHeight);
    };

    window.addEventListener('resize', handleResize);
    animate();

    // Cleanup
    return () => {
      cancelAnimationFrame(animationFrameId);
      window.removeEventListener('resize', handleResize);
      if (container.contains(renderer.domElement)) {
        container.removeChild(renderer.domElement);
      }
      scene.clear();
      particleGeometry.dispose();
      particleMaterial.dispose();
      lineGeometry.dispose();
      lineMaterial.dispose();
      texture.dispose();
      renderer.dispose();
    };
  }, []);

  return <div ref={containerRef} className="absolute inset-0 w-full h-full pointer-events-none opacity-40 z-0" />;
}

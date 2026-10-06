import React, { useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';

interface TopologicalBackdropProps {
  scrollContainerRef: React.RefObject<HTMLDivElement | null>;
}

interface ContourPolyline {
  points: Float32Array; // alternating [u0, v0, u1, v1, ...] in normalized [0, 1]
  levelIndex: number;
  isMajor: boolean;
}

interface ElevationMarker {
  u: number;
  v: number;
  label: string;
}

// Procedural high-relief alpine mountain ridge terrain matching topographic contour elevation
function evaluateMountainHeight(nx: number, ny: number): number {
  // 1. Primary diagonal knife-edge ridge spine:
  // Runs from top-left (0.12, 0.04) curving through (0.42, 0.35) down towards (0.95, 0.50)
  const spineX = 0.12 + 0.40 * Math.sin(ny * Math.PI * 0.95) + 0.35 * Math.pow(ny, 1.3);
  const distToSpine = nx - spineX;

  // Asymmetric cliff headwall: steep drop to the right, sweeping descent to the left
  let ridge = 0;
  if (ny < 0.68) {
    const k = distToSpine > 0 ? 11.5 : 3.6;
    ridge = Math.exp(-Math.pow(distToSpine * k, 2)) * (1.35 - ny * 0.85);
  }

  // 2. Middle-left finger/spur ridge wrapping around a valley bowl (closed teardrop loop):
  const fingerDist = Math.hypot((nx - 0.34) * 2.1, (ny - 0.52) * 1.25);
  const fingerPeak = 0.70 * Math.exp(-Math.pow(fingerDist * 4.2, 2));

  // 3. Lower secondary ridge wrapping toward bottom-left:
  const spineLowerX = 0.20 + 0.22 * Math.cos((ny - 0.5) * Math.PI * 1.6);
  const distLower = nx - spineLowerX;
  const ridgeLower = (ny >= 0.42)
    ? Math.exp(-Math.pow(distLower * 4.2, 2)) * Math.sin((ny - 0.42) / 0.58 * Math.PI) * 0.92
    : 0;

  // 4. Upper peak cluster in the top 20%:
  const peak1 = 0.85 * Math.exp(-Math.pow((nx - 0.36) * 8.5, 2) - Math.pow((ny - 0.08) * 8.5, 2));
  const peak2 = 0.70 * Math.exp(-Math.pow((nx - 0.12) * 9.0, 2) - Math.pow((ny - 0.16) * 8.0, 2));

  // 5. Lowland terraces in bottom right (wide sweeping gentle valley contours):
  const lowlandRamp = (ny * 0.45 + (1.0 - nx) * 0.35) * 0.55;

  // 6. Multi-octave ridged noise harmonics for alpine arêtes and gullies:
  const r1 = 0.22 * (1.0 - Math.abs(Math.sin(nx * 14.0 + ny * 9.0) * Math.cos(nx * 9.0 - ny * 11.0)));
  const r2 = 0.11 * (1.0 - Math.abs(Math.sin(nx * 26.0 - ny * 19.0) * Math.sin(nx * 17.0 + ny * 22.0)));
  const r3 = 0.04 * Math.sin(nx * 44.0 + ny * 36.0);

  return ridge * 1.5 + fingerPeak + ridgeLower + peak1 + peak2 + lowlandRamp + r1 + r2 + r3;
}

// Generate continuous chained contour polylines from the mountain scalar field
function generateMountainTerrainContours(gridW = 120, gridH = 200, numLevels = 65): ContourPolyline[] {
  const grid = new Float32Array(gridW * gridH);

  for (let y = 0; y < gridH; y++) {
    const ny = y / (gridH - 1);
    for (let x = 0; x < gridW; x++) {
      const nx = x / (gridW - 1);
      grid[y * gridW + x] = evaluateMountainHeight(nx, ny);
    }
  }

  let minVal = Infinity;
  let maxVal = -Infinity;
  for (let i = 0; i < grid.length; i++) {
    const v = grid[i];
    if (v < minVal) minVal = v;
    if (v > maxVal) maxVal = v;
  }

  const polylines: ContourPolyline[] = [];

  for (let l = 0; l < numLevels; l++) {
    const t = l / (numLevels - 1);
    // Non-linear distribution concentrates contours along steep mountain cliffs
    const iso = minVal + (maxVal - minVal) * (0.04 + 0.93 * Math.pow(t, 1.15));
    const isMajor = l % 6 === 0;

    // Segment extraction
    const segments: Array<[[number, number], [number, number]]> = [];
    for (let y = 0; y < gridH - 1; y++) {
      const row = y * gridW;
      const nextRow = row + gridW;
      for (let x = 0; x < gridW - 1; x++) {
        const v0 = grid[row + x];
        const v1 = grid[row + x + 1];
        const v2 = grid[nextRow + x + 1];
        const v3 = grid[nextRow + x];

        let mask = 0;
        if (v0 >= iso) mask |= 1;
        if (v1 >= iso) mask |= 2;
        if (v2 >= iso) mask |= 4;
        if (v3 >= iso) mask |= 8;

        if (mask === 0 || mask === 15) continue;

        const pTop: [number, number] = [x + (iso - v0) / (v1 - v0), y];
        const pRight: [number, number] = [x + 1, y + (iso - v1) / (v2 - v1)];
        const pBottom: [number, number] = [x + (iso - v3) / (v2 - v3), y + 1];
        const pLeft: [number, number] = [x, y + (iso - v0) / (v3 - v0)];

        switch (mask) {
          case 1: case 14: segments.push([pLeft, pTop]); break;
          case 2: case 13: segments.push([pTop, pRight]); break;
          case 3: case 12: segments.push([pLeft, pRight]); break;
          case 4: case 11: segments.push([pRight, pBottom]); break;
          case 5: segments.push([pLeft, pTop], [pRight, pBottom]); break;
          case 6: case 9: segments.push([pTop, pBottom]); break;
          case 7: case 8: segments.push([pLeft, pBottom]); break;
          case 10: segments.push([pTop, pRight], [pLeft, pBottom]); break;
        }
      }
    }

    if (segments.length === 0) continue;

    // Build adjacency graph for continuous path chaining
    const keyOf = (p: [number, number]) => `${Math.round(p[0] * 100)},${Math.round(p[1] * 100)}`;
    const adj = new Map<string, Array<{ pt: [number, number]; segIdx: number; key: string }>>();

    for (let i = 0; i < segments.length; i++) {
      const [p1, p2] = segments[i];
      const k1 = keyOf(p1);
      const k2 = keyOf(p2);
      if (!adj.has(k1)) adj.set(k1, []);
      if (!adj.has(k2)) adj.set(k2, []);
      adj.get(k1)!.push({ pt: p2, segIdx: i, key: k2 });
      adj.get(k2)!.push({ pt: p1, segIdx: i, key: k1 });
    }

    const used = new Uint8Array(segments.length);

    for (let i = 0; i < segments.length; i++) {
      if (used[i]) continue;
      used[i] = 1;
      const poly: [number, number][] = [segments[i][0], segments[i][1]];

      // Extend forward
      let currKey = keyOf(poly[poly.length - 1]);
      while (true) {
        const neighbors = adj.get(currKey) || [];
        const next = neighbors.find((n) => !used[n.segIdx]);
        if (!next) break;
        used[next.segIdx] = 1;
        poly.push(next.pt);
        currKey = next.key;
      }

      // Extend backward
      currKey = keyOf(poly[0]);
      while (true) {
        const neighbors = adj.get(currKey) || [];
        const next = neighbors.find((n) => !used[n.segIdx]);
        if (!next) break;
        used[next.segIdx] = 1;
        poly.unshift(next.pt);
        currKey = next.key;
      }

      if (poly.length >= 3) {
        // Convert to normalized Float32Array [u0, v0, u1, v1, ...]
        const points = new Float32Array(poly.length * 2);
        for (let j = 0; j < poly.length; j++) {
          points[j * 2] = poly[j][0] / (gridW - 1);
          points[j * 2 + 1] = poly[j][1] / (gridH - 1);
        }
        polylines.push({ points, levelIndex: l, isMajor });
      }
    }
  }

  return polylines;
}

export const TopologicalBackdrop: React.FC<TopologicalBackdropProps> = ({ scrollContainerRef }) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d', { alpha: true });
    if (!ctx) return;

    let animId = 0;
    let time = 0;
    const scrollState = {
      targetY: 0,
      currentY: 0,
      lastY: 0,
      velocity: 0,
    };

    // Precompute mountain terrain contour polylines once
    const contours = generateMountainTerrainContours(120, 200, 65);

    // Geological elevation markers along the primary ridge and saddle
    const markers: ElevationMarker[] = [
      { u: 0.36, v: 0.08, label: 'SUMMIT +1,842M [RIDGE_NORTH]' },
      { u: 0.44, v: 0.35, label: 'ARÊTE ESCARPMENT 68°' },
      { u: 0.34, v: 0.52, label: 'SADDLE PASS +1,120M' },
      { u: 0.68, v: 0.75, label: 'VALLEY DRAINAGE BASIN' },
    ];

    // Detect active theme
    const getTheme = (): 'dark' | 'light' => {
      if (typeof document === 'undefined') return 'dark';
      return document.documentElement.getAttribute('data-theme') === 'light' ? 'light' : 'dark';
    };

    let currentTheme = getTheme();

    const observer = new MutationObserver(() => {
      currentTheme = getTheme();
    });
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['data-theme'],
    });

    const handleResize = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      const width = window.innerWidth;
      const height = window.innerHeight;

      canvas.width = Math.floor(width * dpr);
      canvas.height = Math.floor(height * dpr);
      canvas.style.width = `${width}px`;
      canvas.style.height = `${height}px`;

      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };

    handleResize();
    window.addEventListener('resize', handleResize, { passive: true });

    // Mouse position tracking for tactical interactive spotlight
    const mouse = {
      x: -1000,
      y: -1000,
      targetX: -1000,
      targetY: -1000,
    };

    const handleMouseMove = (e: MouseEvent) => {
      mouse.targetX = e.clientX;
      mouse.targetY = e.clientY;
    };
    const handleMouseLeave = () => {
      mouse.targetX = -1000;
      mouse.targetY = -1000;
    };

    window.addEventListener('mousemove', handleMouseMove, { passive: true });
    document.addEventListener('mouseleave', handleMouseLeave, { passive: true });

    // Scroll listener on the scroll container
    const container = scrollContainerRef.current;
    const handleScroll = () => {
      if (!container) return;
      scrollState.targetY = container.scrollTop;
    };

    if (container) {
      container.addEventListener('scroll', handleScroll, { passive: true });
      scrollState.targetY = container.scrollTop;
      scrollState.currentY = container.scrollTop;
      scrollState.lastY = container.scrollTop;
    }

    const render = () => {
      const width = window.innerWidth;
      const height = window.innerHeight;

      // Mouse smooth interpolation
      mouse.x += (mouse.targetX - mouse.x) * 0.12;
      mouse.y += (mouse.targetY - mouse.y) * 0.12;

      // Smooth scroll interpolation and velocity damping
      scrollState.currentY += (scrollState.targetY - scrollState.currentY) * 0.10;
      const rawDelta = scrollState.targetY - scrollState.lastY;
      scrollState.lastY = scrollState.targetY;
      scrollState.velocity += (rawDelta - scrollState.velocity) * 0.18;
      scrollState.velocity *= 0.94; // natural decay

      // Dynamic amplitude surge during active scrolling
      const velocitySurge = Math.min(Math.abs(scrollState.velocity) * 0.25, 20);

      // Ambient time progression + scroll-reactive phase boost (always active for video-like motion)
      time += 0.022 + Math.abs(scrollState.velocity) * 0.0006;

      ctx.clearRect(0, 0, width, height);

      const isLight = currentTheme === 'light';
      const spanHeight = height * 1.5;
      const parallaxY = scrollState.currentY * 0.32;

      ctx.save();
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';

      // 1. Lidar Scan Horizon Sweep: continuous vertical scanning laser plane
      const scanCycle = (time * 85.0) % (spanHeight + 400);
      const scanY = scanCycle - 200;

      // 2. Render each continuous mountain contour polyline
      for (let i = 0; i < contours.length; i++) {
        const poly = contours[i];
        const pts = poly.points;
        const len = pts.length;
        if (len < 4) continue;

        // Streaming telemetry contours: lines with continuous traveling dash flows
        const isStreaming = !poly.isMajor && i % 3 === 1;
        if (isStreaming) {
          ctx.setLineDash([22, 26]);
          ctx.lineDashOffset = -time * 58.0;
        } else {
          ctx.setLineDash([]);
        }

        ctx.beginPath();
        let started = false;

        // Elevation breathing wave: lines ripple in sequence across the mountain
        const levelPhase = poly.levelIndex * 0.25 - time * 2.2;
        const levelRipple = Math.sin(levelPhase) * (10.0 + velocitySurge * 0.4);

        let avgScreenY = 0;
        let count = 0;

        for (let j = 0; j < len; j += 2) {
          const u = pts[j];
          const v = pts[j + 1];

          // Continuous, fluid flowing waves across the alpine landscape
          const flowWave1 = Math.sin(v * 8.0 - time * 1.8 + u * 5.0) * (20.0 + velocitySurge * 0.6);
          const flowWave2 = Math.cos(u * 10.0 + time * 1.4 + v * 6.0) * (16.0 + velocitySurge * 0.5);

          const screenX = u * width + flowWave1;
          const screenY = v * spanHeight - parallaxY + flowWave2 + levelRipple;

          avgScreenY += screenY;
          count++;

          if (!started) {
            ctx.moveTo(screenX, screenY);
            started = true;
          } else {
            ctx.lineTo(screenX, screenY);
          }
        }

        const midY = count > 0 ? avgScreenY / count : 0;

        // Check proximity to vertical Lidar scan beam
        const distToScan = Math.abs(midY - scanY);
        const scanGlow = Math.max(0, 1.0 - distToScan / 90.0);

        // Visual hierarchy: major index contours vs intermediate contours with scan glow
        if (isLight) {
          const baseAlpha = poly.isMajor ? 0.52 : (isStreaming ? 0.38 : 0.22);
          const alpha = Math.min(1.0, baseAlpha + scanGlow * 0.45);
          ctx.strokeStyle = scanGlow > 0.4
            ? `rgba(26, 86, 219, ${alpha.toFixed(3)})`
            : `rgba(43, 98, 165, ${alpha.toFixed(3)})`;
          ctx.lineWidth = (poly.isMajor ? 1.4 : 0.85) + scanGlow * 1.1;
        } else {
          const baseAlpha = poly.isMajor ? 0.76 : (isStreaming ? 0.48 : 0.32);
          const alpha = Math.min(1.0, baseAlpha + scanGlow * 0.55);
          ctx.strokeStyle = scanGlow > 0.4
            ? `rgba(56, 189, 248, ${alpha.toFixed(3)})`
            : `rgba(255, 255, 255, ${alpha.toFixed(3)})`;
          ctx.lineWidth = (poly.isMajor ? 1.4 : 0.85) + scanGlow * 1.2;
        }

        ctx.stroke();
      }

      // Reset line dash for pulses and markers
      ctx.setLineDash([]);

      // 3. Luminous Telemetry Pulse Beads traveling along contour paths
      const pulseCount = 22;
      for (let p = 0; p < pulseCount; p++) {
        const polyIdx = (p * 11) % contours.length;
        const poly = contours[polyIdx];
        const pts = poly.points;
        const numPts = pts.length / 2;
        if (numPts < 6) continue;

        const pulseSpeed = 0.06 + (p % 4) * 0.025;
        const progress = ((time * pulseSpeed + (p * 0.27)) % 1.0);
        const ptIdx = Math.floor(progress * (numPts - 1)) * 2;

        const u = pts[ptIdx];
        const v = pts[ptIdx + 1];
        const flowWave1 = Math.sin(v * 8.0 - time * 1.8 + u * 5.0) * (20.0 + velocitySurge * 0.6);
        const flowWave2 = Math.cos(u * 10.0 + time * 1.4 + v * 6.0) * (16.0 + velocitySurge * 0.5);
        const levelPhase = poly.levelIndex * 0.25 - time * 2.2;
        const levelRipple = Math.sin(levelPhase) * (10.0 + velocitySurge * 0.4);

        const px = u * width + flowWave1;
        const py = v * spanHeight - parallaxY + flowWave2 + levelRipple;

        if (py >= -20 && py <= height + 20) {
          ctx.save();
          ctx.beginPath();
          ctx.arc(px, py, isLight ? 2.5 : 3.0, 0, Math.PI * 2);
          ctx.fillStyle = isLight ? 'rgba(37, 99, 235, 0.95)' : 'rgba(56, 189, 248, 0.95)';
          ctx.shadowColor = isLight ? 'rgba(37, 99, 235, 0.8)' : 'rgba(56, 189, 248, 0.9)';
          ctx.shadowBlur = 10;
          ctx.fill();
          ctx.restore();
        }
      }

      // 4. Interactive Mouse Spotlight Halo
      if (mouse.x > -500 && mouse.y > -500) {
        ctx.save();
        const mouseGrad = ctx.createRadialGradient(mouse.x, mouse.y, 10, mouse.x, mouse.y, 220);
        if (isLight) {
          mouseGrad.addColorStop(0, 'rgba(37, 99, 235, 0.12)');
          mouseGrad.addColorStop(1, 'rgba(37, 99, 235, 0)');
        } else {
          mouseGrad.addColorStop(0, 'rgba(56, 189, 248, 0.15)');
          mouseGrad.addColorStop(1, 'rgba(56, 189, 248, 0)');
        }
        ctx.fillStyle = mouseGrad;
        ctx.beginPath();
        ctx.arc(mouse.x, mouse.y, 220, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      }

      // 5. Render technical elevation markers on key geological features
      for (const marker of markers) {
        const markerFlow1 = Math.sin(marker.v * 9.0 - time * 1.4 + marker.u * 6.0) * 14.0;
        const markerFlow2 = Math.cos(marker.u * 11.0 + time * 1.1 + marker.v * 7.0) * 10.0;
        const markerScreenX = marker.u * width + markerFlow1;
        const markerScreenY = marker.v * spanHeight - parallaxY + markerFlow2;

        // Only draw if within visible viewport
        if (markerScreenY >= -20 && markerScreenY <= height + 20) {
          ctx.save();

          // Marker vertex dot
          ctx.fillStyle = isLight ? 'rgba(43, 98, 165, 0.65)' : 'rgba(255, 255, 255, 0.75)';
          ctx.beginPath();
          ctx.arc(markerScreenX, markerScreenY, 2.2, 0, Math.PI * 2);
          ctx.fill();

          // Subtle concentric radar ring
          ctx.strokeStyle = isLight ? 'rgba(43, 98, 165, 0.30)' : 'rgba(255, 255, 255, 0.35)';
          ctx.lineWidth = 1;
          ctx.beginPath();
          ctx.arc(markerScreenX, markerScreenY, 5, 0, Math.PI * 2);
          ctx.stroke();

          // Technical label
          ctx.font = '10px "JetBrains Mono", monospace';
          ctx.fillStyle = isLight ? 'rgba(30, 41, 59, 0.70)' : 'rgba(255, 255, 255, 0.65)';
          ctx.fillText(marker.label, markerScreenX + 9, markerScreenY - 4);

          ctx.restore();
        }
      }

      ctx.restore();

      animId = requestAnimationFrame(render);
    };

    animId = requestAnimationFrame(render);

    return () => {
      cancelAnimationFrame(animId);
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseleave', handleMouseLeave);
      if (container) {
        container.removeEventListener('scroll', handleScroll);
      }
      observer.disconnect();
    };
  }, [scrollContainerRef]);

  if (typeof document === 'undefined') {
    return null;
  }

  return createPortal(
    <div
      aria-hidden="true"
      className="fixed inset-0 pointer-events-none z-0 overflow-hidden select-none"
    >
      <canvas ref={canvasRef} className="block w-full h-full" />
    </div>,
    document.body
  );
};

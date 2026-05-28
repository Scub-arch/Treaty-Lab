"use client";

import { useEffect, useRef } from "react";
import createGlobe from "cobe";

interface GlobeMarker {
  id: string;
  /** [latitude, longitude] in degrees */
  location: [number, number];
  /** Display label (rendered as text caption, not on globe) */
  label: string;
  /** Optional kind for filtering / future legend */
  kind?: "project" | "territory" | "datacentre" | "watershed";
}

interface GlobeArc {
  start: [number, number];
  end: [number, number];
}

interface Props {
  markers: GlobeMarker[];
  arcs?: GlobeArc[];
  /** Rotation speed in radians per frame; set 0 to pause */
  speed?: number;
  /** Initial phi (longitude rotation) — default centred on Western Canada */
  initialPhi?: number;
  /** Initial theta (tilt) */
  initialTheta?: number;
  className?: string;
}

/**
 * Institutional-flavor globe (cobe-canvas). Strips the demo's weather-emoji
 * styling — no sticker outlines, no experimental CSS Anchor Positioning, no
 * floating animations. Markers are subtle brand-coloured dots on the globe
 * itself; the surrounding caption list pairs each dot with its label.
 */
export function GeographicOverview({
  markers,
  arcs = [],
  speed = 0.0025,
  initialPhi = 4.4, // ~Western Canada longitude facing camera
  initialTheta = 0.25,
  className = "",
}: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const pointerInteracting = useRef<{ x: number; y: number } | null>(null);
  const dragOffset = useRef({ phi: 0, theta: 0 });
  const phiOffsetRef = useRef(0);
  const thetaOffsetRef = useRef(0);
  const isPausedRef = useRef(false);

  useEffect(() => {
    if (!canvasRef.current) return;
    const canvas = canvasRef.current;
    let globe: ReturnType<typeof createGlobe> | null = null;
    let animationId = 0;
    let phi = initialPhi;

    const handlePointerMove = (e: PointerEvent) => {
      if (pointerInteracting.current !== null) {
        dragOffset.current = {
          phi: (e.clientX - pointerInteracting.current.x) / 300,
          theta: (e.clientY - pointerInteracting.current.y) / 1000,
        };
      }
    };
    const handlePointerUp = () => {
      if (pointerInteracting.current !== null) {
        phiOffsetRef.current += dragOffset.current.phi;
        thetaOffsetRef.current += dragOffset.current.theta;
        dragOffset.current = { phi: 0, theta: 0 };
      }
      pointerInteracting.current = null;
      if (canvas) canvas.style.cursor = "grab";
      isPausedRef.current = false;
    };

    function init() {
      const width = canvas.offsetWidth;
      if (width === 0 || globe) return;

      globe = createGlobe(canvas, {
        devicePixelRatio: Math.min(window.devicePixelRatio || 1, 2),
        width,
        height: width,
        phi: 0,
        theta: initialTheta,
        // Institutional dark theme: dark base, near-white land, warm-amber markers
        dark: 1,
        diffuse: 1.2,
        mapSamples: 16000,
        mapBrightness: 5,
        baseColor: [0.12, 0.12, 0.14],
        markerColor: [0.85, 0.65, 0.35], // matches --brand (oklch warm amber)
        glowColor: [0.18, 0.18, 0.2],
        markerElevation: 0.06,
        markers: markers.map((m) => ({ location: m.location, size: 0.05 })),
        arcs: arcs.map((a) => ({ from: a.start, to: a.end })),
        arcColor: [0.85, 0.65, 0.35],
        arcWidth: 0.6,
        arcHeight: 0.18,
        opacity: 0.95,
      });

      function animate() {
        if (!isPausedRef.current) phi += speed;
        globe!.update({
          phi: phi + phiOffsetRef.current + dragOffset.current.phi,
          theta: initialTheta + thetaOffsetRef.current + dragOffset.current.theta,
        });
        animationId = requestAnimationFrame(animate);
      }

      animate();
    }

    if (canvas.offsetWidth > 0) {
      init();
    } else {
      const ro = new ResizeObserver((entries) => {
        if (entries[0]?.contentRect.width > 0) {
          ro.disconnect();
          init();
        }
      });
      ro.observe(canvas);
    }

    window.addEventListener("pointermove", handlePointerMove, { passive: true });
    window.addEventListener("pointerup", handlePointerUp, { passive: true });

    return () => {
      if (animationId) cancelAnimationFrame(animationId);
      if (globe) globe.destroy();
      window.removeEventListener("pointermove", handlePointerMove);
      window.removeEventListener("pointerup", handlePointerUp);
    };
  }, [markers, arcs, speed, initialPhi, initialTheta]);

  return (
    <div className={`flex flex-col gap-4 ${className}`}>
      <div className="relative aspect-square w-full max-w-[420px] mx-auto select-none">
        <canvas
          ref={canvasRef}
          onPointerDown={(e) => {
            pointerInteracting.current = { x: e.clientX, y: e.clientY };
            if (canvasRef.current) canvasRef.current.style.cursor = "grabbing";
            isPausedRef.current = true;
          }}
          style={{
            width: "100%",
            height: "100%",
            cursor: "grab",
            borderRadius: "50%",
            touchAction: "none",
          }}
        />
      </div>
      <ul className="space-y-1 text-xs text-muted-foreground font-mono tracking-wider max-w-[420px] mx-auto w-full">
        {markers.map((m) => (
          <li key={m.id} className="flex items-center gap-2">
            <span className="inline-block w-1.5 h-1.5 rounded-full bg-[var(--brand)]" aria-hidden />
            <span className="text-foreground/85">{m.label}</span>
            <span className="ml-auto tabular-nums">
              {m.location[0].toFixed(2)}°, {m.location[1].toFixed(2)}°
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}

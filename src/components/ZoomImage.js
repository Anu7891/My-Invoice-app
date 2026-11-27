import React, { useCallback, useEffect, useRef, useState } from 'react';

const MIN = 1;
const MAX = 8;
const clamp = (v, a, b) => Math.min(b, Math.max(a, v));

/**
 * Zoomable / pannable image.
 *  - Mouse: scroll to zoom (at the cursor), drag to move, double-click to zoom in/out
 *  - Touch: pinch to zoom, drag with one finger to move, double-tap to zoom in/out
 *  - Buttons: − / + / Fit / Rotate
 */
const ZoomImage = ({ src, rotate = 0, onRotate, initialZoom = 1.6 }) => {
  const boxRef = useRef(null);
  const [view, setView] = useState({ z: initialZoom, x: 0, y: 0 });
  const pointers = useRef(new Map());
  const gesture = useRef(null);
  const lastTap = useRef(0);

  // Reset when a different photo is shown
  useEffect(() => {
    setView({ z: initialZoom, x: 0, y: 0 });
  }, [src, rotate, initialZoom]);

  /** Zoom keeping the point (cx, cy) — relative to the box centre — fixed on screen. */
  const zoomAt = useCallback((factor, cx = 0, cy = 0) => {
    setView((v) => {
      const z = clamp(v.z * factor, MIN, MAX);
      const k = z / v.z;
      return { z, x: cx - (cx - v.x) * k, y: cy - (cy - v.y) * k };
    });
  }, []);

  const centerOffset = (clientX, clientY) => {
    const r = boxRef.current.getBoundingClientRect();
    return { cx: clientX - r.left - r.width / 2, cy: clientY - r.top - r.height / 2 };
  };

  // Wheel zoom (needs a non-passive listener to stop the page scrolling)
  useEffect(() => {
    const el = boxRef.current;
    if (!el) return undefined;
    const onWheel = (e) => {
      e.preventDefault();
      const { cx, cy } = centerOffset(e.clientX, e.clientY);
      zoomAt(e.deltaY < 0 ? 1.2 : 1 / 1.2, cx, cy);
    };
    el.addEventListener('wheel', onWheel, { passive: false });
    return () => el.removeEventListener('wheel', onWheel);
  }, [zoomAt]);

  const onPointerDown = (e) => {
    boxRef.current.setPointerCapture(e.pointerId);
    pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });

    // double click / double tap
    const now = Date.now();
    if (pointers.current.size === 1 && now - lastTap.current < 300) {
      const { cx, cy } = centerOffset(e.clientX, e.clientY);
      setView((v) => (v.z > 1.5 ? { z: 1, x: 0, y: 0 } : { z: 3, x: -cx * 2, y: -cy * 2 }));
      lastTap.current = 0;
      return;
    }
    lastTap.current = now;
    startGesture();
  };

  const startGesture = () => {
    const pts = Array.from(pointers.current.values());
    if (pts.length === 1) {
      gesture.current = { type: 'pan', start: pts[0], view: { ...viewRef.current } };
    } else if (pts.length >= 2) {
      const [a, b] = pts;
      const mid = { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
      gesture.current = { type: 'pinch', dist: Math.hypot(a.x - b.x, a.y - b.y), mid, view: { ...viewRef.current } };
    }
  };

  const viewRef = useRef(view);
  viewRef.current = view;

  const onPointerMove = (e) => {
    if (!pointers.current.has(e.pointerId)) return;
    pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    const g = gesture.current;
    if (!g) return;
    const pts = Array.from(pointers.current.values());
    if (g.type === 'pan' && pts.length === 1) {
      setView({ ...g.view, x: g.view.x + pts[0].x - g.start.x, y: g.view.y + pts[0].y - g.start.y });
    } else if (g.type === 'pinch' && pts.length >= 2) {
      const [a, b] = pts;
      const dist = Math.hypot(a.x - b.x, a.y - b.y);
      const mid = { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
      const z = clamp((g.view.z * dist) / g.dist, MIN, MAX);
      const k = z / g.view.z;
      const { cx, cy } = centerOffset(g.mid.x, g.mid.y);
      setView({
        z,
        x: cx - (cx - g.view.x) * k + (mid.x - g.mid.x),
        y: cy - (cy - g.view.y) * k + (mid.y - g.mid.y),
      });
    }
  };

  const onPointerUp = (e) => {
    pointers.current.delete(e.pointerId);
    if (pointers.current.size) startGesture();
    else gesture.current = null;
  };

  return (
    <div className="zoom-wrap">
      <div
        ref={boxRef}
        className="zoom-box"
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
      >
        <img
          src={src}
          alt="Slip"
          draggable={false}
          style={{ transform: `translate(${view.x}px, ${view.y}px) scale(${view.z}) rotate(${rotate}deg)` }}
        />
      </div>
      <div className="zoom-controls">
        <button type="button" onClick={() => zoomAt(1 / 1.4)} title="Zoom out">−</button>
        <span>{Math.round(view.z * 100)}%</span>
        <button type="button" onClick={() => zoomAt(1.4)} title="Zoom in">＋</button>
        <button type="button" onClick={() => setView({ z: 1, x: 0, y: 0 })} title="Show whole photo">Fit</button>
        {onRotate && (
          <button type="button" onClick={onRotate} title="Rotate 90° and read again">↻ Rotate</button>
        )}
      </div>
      <div className="zoom-tip">Scroll / pinch to zoom · drag to move · double-tap to zoom</div>
    </div>
  );
};

export default ZoomImage;

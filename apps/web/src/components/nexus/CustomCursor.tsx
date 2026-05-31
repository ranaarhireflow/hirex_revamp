import { useEffect, useRef } from 'react';

/**
 * Cyan dot + lagging 38px ring with mix-blend-mode: screen.
 * Ring expands to 64px and turns magenta over interactive elements.
 */
export default function CustomCursor() {
  const dotRef = useRef<HTMLDivElement>(null);
  const ringRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const dot = dotRef.current;
    const ring = ringRef.current;
    if (!dot || !ring) return;

    let mx = window.innerWidth / 2;
    let my = window.innerHeight / 2;
    let rx = mx;
    let ry = my;
    let raf = 0;

    function onMove(e: MouseEvent) {
      mx = e.clientX;
      my = e.clientY;
      dot!.style.transform = `translate(${mx}px, ${my}px) translate(-50%, -50%)`;
    }
    function onOver(e: MouseEvent) {
      const t = e.target as HTMLElement;
      const hot = !!t.closest('a, button, [data-cursor="hot"]');
      ring!.classList.toggle('hot', hot);
    }
    function tick() {
      rx += (mx - rx) * 0.18;
      ry += (my - ry) * 0.18;
      ring!.style.transform = `translate(${rx}px, ${ry}px) translate(-50%, -50%)`;
      raf = requestAnimationFrame(tick);
    }
    tick();

    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseover', onOver);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseover', onOver);
    };
  }, []);

  return (
    <>
      <div ref={ringRef} className="nx-cursor-ring" />
      <div ref={dotRef} className="nx-cursor-dot" />
    </>
  );
}

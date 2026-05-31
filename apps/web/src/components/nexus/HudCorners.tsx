import { useEffect, useState } from 'react';

function pad(n: number, w = 2) { return String(n).padStart(w, '0'); }

export default function HudCorners() {
  const [tick, setTick] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setTick((t) => t + 1), 1000);
    return () => clearInterval(id);
  }, []);
  const d = new Date();
  const utc = `${pad(d.getUTCHours())}:${pad(d.getUTCMinutes())}:${pad(d.getUTCSeconds())} UTC`;
  const frame = String(tick * 60).padStart(6, '0');

  return (
    <>
      <div className="nx-hud-corner tl">
        <span><span className="label">SECTOR</span> · 04-B / NEXUS-IN</span>
        <span><span className="label">SYNC</span> · 100% · UPLINK ACTIVE</span>
      </div>
      <div className="nx-hud-corner tr">
        <span>{utc}</span>
        <span><span className="label">FRAME</span> · {frame}</span>
      </div>
      <div className="nx-hud-corner bl">
        <span><span className="label">COORD</span> · 28.6139° N / 77.2090° E</span>
        <span><span className="label">OP</span> · OPERATOR-01</span>
      </div>
      <div className="nx-hud-corner br">
        <span><span className="label">TEMP</span> · 33.4°C</span>
        <span><span className="label">CHANNEL</span> · HIREX-MESH-A</span>
      </div>
    </>
  );
}

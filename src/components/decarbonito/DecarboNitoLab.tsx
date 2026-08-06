/**
 * DecarboNitoLab — dev-only visual test bench (mejora-general/files/13_decarbonito_character.md §5.3).
 *
 * Without this, reviewing an animation means playing the game until it happens to trigger, which
 * makes iterating on the 14 states x 6 expressions x 4 tones combinations prohibitively slow.
 * Mounted only behind the `#dev/decarbonito` hash (see src/main.tsx) — never reachable from the
 * normal play flow, so it is intentionally excluded from the Capa A i18n scope (see
 * scripts/i18n-audit.mjs IGNORED_COMPONENTS) the same way scripts/simulate.ts is outside src/.
 */
import React, { useState } from 'react';
import { DecarboNitoAvatar } from './DecarboNitoAvatar';
import { DN_EMOTIONS, DN_STATES, DN_TONES, type DnEmotion, type DnState, type DnTone } from './types';

const SIZES = [32, 48, 96, 160];

export const DecarboNitoLab: React.FC = () => {
  const [emotion, setEmotion] = useState<DnEmotion>('neutral');
  const [tone, setTone] = useState<DnTone>('normal');
  const [size, setSize] = useState<number>(96);
  const [targetAngle, setTargetAngle] = useState<number>(-30);
  const [beamLength, setBeamLength] = useState<number>(70);
  const [pinned, setPinned] = useState<DnState | null>(null);
  const [completedLog, setCompletedLog] = useState<string[]>([]);

  const handleComplete = (s: DnState) => {
    setCompletedLog((log) => [`${new Date().toLocaleTimeString()} — ${s}`, ...log].slice(0, 20));
  };

  return (
    <div className="min-h-screen bg-basalt-950 text-bone p-8">
      <header className="mb-6">
        <p className="label-eyebrow">Dev-only — #dev/decarbonito</p>
        <h1 className="text-[28px] font-[var(--font-display)]">DecarboNito Lab</h1>
        <p className="text-ash text-sm mt-1">
          14 estados x 6 expresiones x 4 tonos. No forma parte del flujo de juego.
        </p>
      </header>

      <div className="panel p-5 mb-6 flex flex-wrap items-end gap-6">
        <label className="flex flex-col gap-1 text-sm">
          <span className="text-ash">emotion</span>
          <select
            className="bg-basalt-800 border border-basalt-600 rounded-md px-2 py-1"
            value={emotion}
            onChange={(e) => setEmotion(e.target.value as DnEmotion)}
          >
            {DN_EMOTIONS.map((e) => <option key={e} value={e}>{e}</option>)}
          </select>
        </label>

        <label className="flex flex-col gap-1 text-sm">
          <span className="text-ash">tone</span>
          <select
            className="bg-basalt-800 border border-basalt-600 rounded-md px-2 py-1"
            value={tone}
            onChange={(e) => setTone(e.target.value as DnTone)}
          >
            {DN_TONES.map((t) => <option key={t} value={t}>{t}</option>)}
          </select>
        </label>

        <label className="flex flex-col gap-1 text-sm">
          <span className="text-ash">size</span>
          <select
            className="bg-basalt-800 border border-basalt-600 rounded-md px-2 py-1"
            value={size}
            onChange={(e) => setSize(Number(e.target.value))}
          >
            {SIZES.map((s) => <option key={s} value={s}>{s}px</option>)}
          </select>
        </label>

        <label className="flex flex-col gap-1 text-sm w-40">
          <span className="text-ash">targetAngle: {targetAngle}°</span>
          <input
            type="range" min={-90} max={90} value={targetAngle}
            onChange={(e) => setTargetAngle(Number(e.target.value))}
          />
        </label>

        <label className="flex flex-col gap-1 text-sm w-40">
          <span className="text-ash">beamLength: {beamLength}</span>
          <input
            type="range" min={0} max={140} value={beamLength}
            onChange={(e) => setBeamLength(Number(e.target.value))}
          />
        </label>

        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={pinned === 'point'}
            onChange={(e) => setPinned(e.target.checked ? 'point' : null)}
          />
          <span className="text-ash">pin "point" (usa targetAngle/beamLength)</span>
        </label>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-4">
        {DN_STATES.map((s) => (
          <figure key={s} className="panel p-4 flex flex-col items-center gap-2">
            <DecarboNitoAvatar
              state={pinned ?? s}
              emotion={emotion}
              tone={tone}
              size={size}
              targetAngle={targetAngle}
              beamLength={beamLength}
              onStateComplete={handleComplete}
            />
            <figcaption className="font-[var(--font-mono)] text-[13px] text-ash">{s}</figcaption>
          </figure>
        ))}
      </div>

      <section className="panel p-4 mt-6">
        <p className="label-eyebrow mb-2">onStateComplete log (one-shot states)</p>
        <ul className="font-[var(--font-mono)] text-[12px] text-ash-dim space-y-0.5 max-h-40 overflow-y-auto">
          {completedLog.length === 0 && <li>—</li>}
          {completedLog.map((entry, i) => <li key={i}>{entry}</li>)}
        </ul>
      </section>
    </div>
  );
};

export default DecarboNitoLab;

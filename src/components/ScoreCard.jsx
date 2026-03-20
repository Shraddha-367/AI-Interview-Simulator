import { useEffect, useState } from 'react';
import {
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  Radar,
  ResponsiveContainer,
} from 'recharts';

/* ── SVG ring constants ── */
const RING_RADIUS = 40;
const RING_CIRCUMFERENCE = 2 * Math.PI * RING_RADIUS;
const ANIM_DURATION = 1200; // ms
const TICK_INTERVAL = 16;   // ~60 fps

/* ── Color helpers ── */
const ringColor = (v) =>
  v >= 80 ? '#22c55e' : v >= 60 ? '#f59e0b' : '#ef4444';

const ringColorClass = (v) =>
  v >= 80
    ? 'text-emerald-400'
    : v >= 60
    ? 'text-amber-400'
    : 'text-red-400';

/* ── Verdict text ── */
const verdict = (v) => {
  if (v >= 90) return 'Outstanding performance!';
  if (v >= 80) return 'Great job — very strong!';
  if (v >= 70) return 'Good — room to improve';
  if (v >= 60) return 'Fair — keep practising';
  return 'Needs work — don\'t give up!';
};

/* ── Individual score dimensions ── */
const DIMENSIONS = [
  { key: 'content', label: 'Content' },
  { key: 'grammar', label: 'Grammar' },
  { key: 'clarity', label: 'Clarity' },
  { key: 'confidence', label: 'Confidence' },
];

/* ══════════════════════════════════════════════
   CircleRing — animated SVG progress
   ══════════════════════════════════════════════ */
function CircleRing({ value, label, delay = 0 }) {
  const [animValue, setAnimValue] = useState(0);

  useEffect(() => {
    const start = performance.now() + delay;
    let rafId;

    const tick = (now) => {
      const elapsed = now - start;
      if (elapsed < 0) {
        rafId = requestAnimationFrame(tick);
        return;
      }
      const progress = Math.min(elapsed / ANIM_DURATION, 1);
      // ease-out cubic
      const eased = 1 - Math.pow(1 - progress, 3);
      setAnimValue(Math.round(eased * value));
      if (progress < 1) rafId = requestAnimationFrame(tick);
    };

    rafId = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafId);
  }, [value, delay]);

  const offset = RING_CIRCUMFERENCE * (1 - animValue / 100);
  const color = ringColor(value);
  const textClass = ringColorClass(value);

  return (
    <div className="flex flex-col items-center gap-2">
      <div className="relative flex items-center justify-center">
        <svg className="h-24 w-24 -rotate-90" viewBox="0 0 96 96">
          {/* Track */}
          <circle
            cx="48" cy="48" r={RING_RADIUS}
            fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="5"
          />
          {/* Progress */}
          <circle
            cx="48" cy="48" r={RING_RADIUS}
            fill="none" stroke={color} strokeWidth="5"
            strokeLinecap="round"
            strokeDasharray={RING_CIRCUMFERENCE}
            strokeDashoffset={offset}
            style={{ transition: 'stroke-dashoffset 0.08s linear' }}
          />
        </svg>
        {/* Center number */}
        <span className={`absolute text-xl font-bold ${textClass}`}>
          {animValue}
        </span>
      </div>
      <span className="text-xs font-medium text-gray-400">{label}</span>
    </div>
  );
}

/* ══════════════════════════════════════════════
   ScoreCard
   ══════════════════════════════════════════════ */
function ScoreCard({
  scores = { content: 0, grammar: 0, clarity: 0, confidence: 0, overall: 0 },
}) {
  /* ── Count-up for overall ── */
  const [overallAnim, setOverallAnim] = useState(0);

  useEffect(() => {
    const start = performance.now();
    let rafId;
    const tick = (now) => {
      const t = Math.min((now - start) / ANIM_DURATION, 1);
      const eased = 1 - Math.pow(1 - t, 3);
      setOverallAnim(Math.round(eased * scores.overall));
      if (t < 1) rafId = requestAnimationFrame(tick);
    };
    rafId = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafId);
  }, [scores.overall]);

  /* ── Radar data ── */
  const radarData = DIMENSIONS.map((d) => ({
    dimension: d.label,
    score: scores[d.key] ?? 0,
    fullMark: 100,
  }));

  return (
    <div className="scorecard-appear w-full max-w-3xl mx-auto flex flex-col items-center gap-10">
      {/* ── Overall score ── */}
      <div className="flex flex-col items-center gap-2 text-center">
        <span className={`text-6xl font-extrabold tracking-tight ${ringColorClass(scores.overall)}`}>
          {overallAnim}
          <span className="text-2xl font-semibold text-gray-600"> / 100</span>
        </span>
        <p className="text-sm text-gray-400">{verdict(scores.overall)}</p>
      </div>

      {/* ── Four rings row ── */}
      <div className="grid grid-cols-2 gap-8 sm:grid-cols-4">
        {DIMENSIONS.map((d, i) => (
          <CircleRing
            key={d.key}
            value={scores[d.key] ?? 0}
            label={d.label}
            delay={i * 150}
          />
        ))}
      </div>

      {/* ── Radar chart ── */}
      <div className="w-full rounded-2xl border border-white/[0.06] bg-white/[0.02] p-6">
        <ResponsiveContainer width="100%" height={280}>
          <RadarChart data={radarData} cx="50%" cy="50%" outerRadius="75%">
            <PolarGrid stroke="rgba(255,255,255,0.06)" />
            <PolarAngleAxis
              dataKey="dimension"
              tick={{ fill: '#9ca3af', fontSize: 12 }}
            />
            <Radar
              dataKey="score"
              stroke="#818cf8"
              fill="#6366f1"
              fillOpacity={0.2}
              strokeWidth={2}
              dot={{ r: 4, fill: '#818cf8', stroke: '#0a0d14', strokeWidth: 2 }}
            />
          </RadarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

export default ScoreCard;

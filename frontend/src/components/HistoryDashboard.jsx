import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from 'recharts';
import { useFirebase } from '../hooks/useFirebase';

/* ── Persona badge colors ── */
const PERSONA = {
  hr:         { label: 'HR',         cls: 'bg-amber-500/10 text-amber-400 border-amber-500/20' },
  tech:       { label: 'Technical',  cls: 'bg-cyan-500/10 text-cyan-400 border-cyan-500/20' },
  behavioral: { label: 'Behavioral', cls: 'bg-purple-500/10 text-purple-400 border-purple-500/20' },
};

const scoreColor = (v) =>
  v >= 80 ? 'text-emerald-400' : v >= 60 ? 'text-amber-400' : 'text-red-400';

/* ── Skeleton card ── */
function SkeletonCard() {
  return (
    <div className="animate-pulse rounded-xl border border-white/[0.06] bg-white/[0.02] p-5">
      <div className="mb-3 h-3 w-24 rounded bg-white/[0.06]" />
      <div className="mb-2 h-6 w-16 rounded bg-white/[0.06]" />
      <div className="flex gap-2">
        <div className="h-5 w-16 rounded-full bg-white/[0.06]" />
        <div className="h-5 w-20 rounded-full bg-white/[0.06]" />
      </div>
    </div>
  );
}

/* ── Custom Recharts tooltip ── */
function CustomTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-lg border border-white/10 bg-[#0a0d14]/95 px-3 py-2 text-xs shadow-lg backdrop-blur-sm">
      <p className="text-gray-500">{label}</p>
      <p className="font-semibold text-indigo-400">{payload[0].value}%</p>
    </div>
  );
}

function HistoryDashboard() {
  const navigate = useNavigate();
  const { getSessions } = useFirebase();

  const [sessions, setSessions] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetch = async () => {
      try {
        const data = await getSessions();
        setSessions(data);
      } catch (err) {
        toast.error('Failed to load session history');
      } finally {
        setLoading(false);
      }
    };
    fetch();
  }, [getSessions]);

  /* ── Chart data ── */
  const chartData = [...sessions]
    .reverse()
    .map((s) => ({
      date: s.createdAt?.toDate
        ? s.createdAt.toDate().toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
        : 'N/A',
      score: s.avg_score ?? s.scores?.overall ?? 0,
    }));

  /* ── Loading ── */
  if (loading) {
    return (
      <div className="w-full max-w-3xl mx-auto flex flex-col gap-6">
        <div className="h-48 animate-pulse rounded-xl border border-white/[0.06] bg-white/[0.02]" />
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <SkeletonCard />
          <SkeletonCard />
          <SkeletonCard />
        </div>
      </div>
    );
  }

  /* ── Empty state ── */
  if (sessions.length === 0) {
    return (
      <div className="flex flex-col items-center gap-6 py-20 text-center">
        <div className="flex h-16 w-16 items-center justify-center rounded-full bg-white/[0.04]">
          <svg className="h-7 w-7 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
          </svg>
        </div>
        <div>
          <p className="text-lg font-semibold text-gray-300">No interviews yet</p>
          <p className="mt-1 text-sm text-gray-500">Start your first one!</p>
        </div>
        <button
          id="history-start"
          type="button"
          onClick={() => navigate('/dashboard')}
          className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-6 py-2.5 text-sm font-semibold text-white shadow-lg shadow-indigo-500/25 transition-all duration-300 hover:bg-indigo-500 hover:scale-[1.03] active:scale-[0.98]"
        >
          Start Interview
        </button>
      </div>
    );
  }

  /* ── Populated ── */
  return (
    <div className="w-full max-w-3xl mx-auto flex flex-col gap-8">
      {/* ── Line chart ── */}
      <div className="rounded-2xl border border-white/[0.06] bg-white/[0.02] p-5">
        <h3 className="mb-4 text-xs font-semibold uppercase tracking-widest text-gray-500">
          Score Trend
        </h3>
        <ResponsiveContainer width="100%" height={200}>
          <LineChart data={chartData}>
            <CartesianGrid stroke="rgba(255,255,255,0.04)" strokeDasharray="4 4" />
            <XAxis
              dataKey="date"
              tick={{ fill: '#6b7280', fontSize: 11 }}
              axisLine={false}
              tickLine={false}
            />
            <YAxis
              domain={[0, 100]}
              tick={{ fill: '#6b7280', fontSize: 11 }}
              axisLine={false}
              tickLine={false}
              width={32}
            />
            <Tooltip content={<CustomTooltip />} />
            <Line
              type="monotone"
              dataKey="score"
              stroke="#6366f1"
              strokeWidth={2}
              dot={{ r: 4, fill: '#6366f1', stroke: '#0a0d14', strokeWidth: 2 }}
              activeDot={{ r: 6 }}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* ── Session cards ── */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        {sessions.map((s) => {
          const score = s.avg_score ?? s.scores?.overall ?? 0;
          const persona = PERSONA[s.persona] || { label: s.persona || '—', cls: 'bg-white/5 text-gray-400 border-white/10' };
          const weakAreas = (s.feedback?.weaknesses ?? s.weak_areas ?? []).slice(0, 2);
          const dateStr = s.createdAt?.toDate
            ? s.createdAt.toDate().toLocaleDateString('en-US', {
                month: 'short',
                day: 'numeric',
                year: 'numeric',
              })
            : '—';

          return (
            <div
              key={s.id}
              className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-5 transition-colors hover:border-white/[0.12]"
            >
              {/* Date + persona */}
              <div className="mb-3 flex items-center justify-between">
                <span className="text-[11px] text-gray-500">{dateStr}</span>
                <span className={`rounded-full border px-2.5 py-0.5 text-[10px] font-semibold ${persona.cls}`}>
                  {persona.label}
                </span>
              </div>

              {/* Score */}
              <p className={`text-2xl font-bold ${scoreColor(score)}`}>
                {score}<span className="text-sm font-normal text-gray-600"> / 100</span>
              </p>

              {/* Weak areas */}
              {weakAreas.length > 0 && (
                <div className="mt-3 flex flex-wrap gap-1.5">
                  {weakAreas.map((w, i) => (
                    <span
                      key={i}
                      className="rounded-full bg-red-500/8 border border-red-500/15 px-2.5 py-0.5 text-[10px] text-red-400"
                    >
                      {typeof w === 'string' ? w.slice(0, 40) : w}
                    </span>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default HistoryDashboard;

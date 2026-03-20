import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import useInterviewStore from '../store/useInterviewStore';

/* ── Persona data ── */
const PERSONAS = [
  {
    id: 'hr',
    title: 'HR Interviewer',
    description: 'Culture fit, communication, teamwork',
    icon: (
      <svg className="h-7 w-7" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M20.25 14.15v4.25c0 1.094-.787 2.036-1.872 2.18-2.087.277-4.216.42-6.378.42s-4.291-.143-6.378-.42c-1.085-.144-1.872-1.086-1.872-2.18v-4.25m16.5 0a2.18 2.18 0 0 0 .75-1.661V8.706c0-1.081-.768-2.015-1.837-2.175a48.114 48.114 0 0 0-3.413-.387m4.5 8.006c-.194.165-.42.295-.673.38A23.978 23.978 0 0 1 12 15.75c-2.648 0-5.195-.429-7.577-1.22a2.016 2.016 0 0 1-.673-.38m0 0A2.18 2.18 0 0 1 3 12.489V8.706c0-1.081.768-2.015 1.837-2.175a48.111 48.111 0 0 1 3.413-.387m7.5 0V5.25A2.25 2.25 0 0 0 13.5 3h-3a2.25 2.25 0 0 0-2.25 2.25v.894m7.5 0a48.667 48.667 0 0 0-7.5 0" />
      </svg>
    ),
  },
  {
    id: 'tech',
    title: 'Technical Expert',
    description: 'DSA, system design, tech stack',
    icon: (
      <svg className="h-7 w-7" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M17.25 6.75 22.5 12l-5.25 5.25m-10.5 0L1.5 12l5.25-5.25m7.5-3-4.5 16.5" />
      </svg>
    ),
  },
  {
    id: 'behavioral',
    title: 'Behavioral Coach',
    description: 'STAR method, leadership, conflict',
    icon: (
      <svg className="h-7 w-7" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904 9 18.75l-.813-2.846a4.5 4.5 0 0 0-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 0 0 3.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 0 0 3.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 0 0-3.09 3.09ZM18.259 8.715 18 9.75l-.259-1.035a3.375 3.375 0 0 0-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 0 0 2.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 0 0 2.455 2.456L21.75 6l-1.036.259a3.375 3.375 0 0 0-2.455 2.456Z" />
      </svg>
    ),
  },
];

const DIFFICULTIES = ['Easy', 'Medium', 'Hard'];

function PersonaSelector() {
  const navigate = useNavigate();
  const setPersona = useInterviewStore((s) => s.setPersona);
  const setDifficulty = useInterviewStore((s) => s.setDifficulty);

  const [selectedPersona, setSelectedPersona] = useState(null);
  const [selectedDifficulty, setSelectedDifficulty] = useState('Medium');

  const canConfirm = !!selectedPersona;

  const handleConfirm = () => {
    if (!canConfirm) return;
    setPersona(selectedPersona);
    setDifficulty(selectedDifficulty);
    navigate('/interview');
  };

  return (
    <div className="w-full max-w-3xl mx-auto flex flex-col items-center gap-10">
      {/* ── Persona Cards ── */}
      <div className="grid w-full grid-cols-1 gap-4 sm:grid-cols-3">
        {PERSONAS.map((p) => {
          const active = selectedPersona === p.id;
          return (
            <button
              key={p.id}
              id={`persona-${p.id}`}
              type="button"
              onClick={() => setSelectedPersona(p.id)}
              className={`
                group relative flex flex-col items-center gap-3 rounded-2xl
                border bg-white/[0.02] px-5 py-8 text-center
                transition-all duration-300 cursor-pointer
                focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500
                ${
                  active
                    ? 'border-indigo-500 shadow-[0_0_30px_-5px_rgba(99,102,241,0.3)]'
                    : 'border-white/[0.06] hover:border-white/[0.14] hover:-translate-y-1 hover:shadow-lg hover:shadow-black/30'
                }
              `}
            >
              {/* Icon circle */}
              <div
                className={`
                  flex h-12 w-12 items-center justify-center rounded-full transition-colors duration-300
                  ${active ? 'bg-indigo-500/20 text-indigo-400' : 'bg-white/5 text-gray-400 group-hover:text-indigo-400 group-hover:bg-indigo-500/10'}
                `}
              >
                {p.icon}
              </div>

              {/* Title */}
              <h3 className="text-sm font-semibold text-white">{p.title}</h3>

              {/* Description */}
              <p className="text-xs leading-relaxed text-gray-500">{p.description}</p>

              {/* Selected indicator dot */}
              {active && (
                <span className="absolute top-3 right-3 flex h-2.5 w-2.5">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-indigo-400 opacity-75" />
                  <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-indigo-500" />
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* ── Difficulty Toggle ── */}
      <div className="flex flex-col items-center gap-3">
        <span className="text-xs font-semibold uppercase tracking-widest text-gray-500">
          Difficulty
        </span>
        <div className="inline-flex rounded-full border border-white/[0.06] bg-white/[0.02] p-1">
          {DIFFICULTIES.map((d) => {
            const active = selectedDifficulty === d;
            return (
              <button
                key={d}
                id={`difficulty-${d.toLowerCase()}`}
                type="button"
                onClick={() => setSelectedDifficulty(d)}
                className={`
                  rounded-full px-5 py-1.5 text-xs font-medium transition-all duration-300
                  focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500
                  ${
                    active
                      ? 'bg-indigo-600 text-white shadow-md shadow-indigo-500/25'
                      : 'text-gray-400 hover:text-white'
                  }
                `}
              >
                {d}
              </button>
            );
          })}
        </div>
      </div>

      {/* ── Confirm Button ── */}
      <button
        id="persona-confirm"
        type="button"
        disabled={!canConfirm}
        onClick={handleConfirm}
        className={`
          group inline-flex items-center gap-2 rounded-xl px-8 py-3 text-sm font-semibold
          transition-all duration-300 focus-visible:outline-none focus-visible:ring-2
          focus-visible:ring-indigo-400 focus-visible:ring-offset-2 focus-visible:ring-offset-[#0a0d14]
          ${
            canConfirm
              ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-500/25 hover:bg-indigo-500 hover:shadow-indigo-500/40 hover:scale-[1.03] active:scale-[0.98] cursor-pointer'
              : 'bg-white/5 text-gray-600 cursor-not-allowed'
          }
        `}
      >
        Start Interview
        <svg
          className="h-4 w-4 transition-transform duration-300 group-hover:translate-x-1"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2}
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5 21 12m0 0-7.5 7.5M21 12H3" />
        </svg>
      </button>
    </div>
  );
}

export default PersonaSelector;

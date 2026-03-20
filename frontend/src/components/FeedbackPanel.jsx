/* ── SVG icons ── */
const CheckIcon = ({ className = 'h-4 w-4' }) => (
  <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" />
  </svg>
);
const XIcon = ({ className = 'h-4 w-4' }) => (
  <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
  </svg>
);

/* ── Difficulty label colors ── */
const DIFF = {
  Easy:   'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
  Medium: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
  Hard:   'bg-red-500/10 text-red-400 border-red-500/20',
};

/* ── Section header ── */
function SectionTitle({ children }) {
  return (
    <h3 className="mb-3 text-xs font-semibold uppercase tracking-widest text-gray-500">
      {children}
    </h3>
  );
}

/**
 * FeedbackPanel
 *
 * Props:
 *   keywordCoverage : { found: string[], missed: string[] }
 *   fillerWords     : string[]
 *   feedback        : { strengths: string[], weaknesses: string[], improvement_tips: string[] }
 *   nextDifficulty  : string
 */
function FeedbackPanel({
  keywordCoverage = { found: [], missed: [] },
  fillerWords = [],
  feedback = { strengths: [], weaknesses: [], improvement_tips: [] },
  nextDifficulty = '',
}) {
  const hasKeywords =
    keywordCoverage.found.length > 0 || keywordCoverage.missed.length > 0;

  return (
    <div className="feedbackpanel-appear w-full max-w-3xl mx-auto flex flex-col gap-8 overflow-y-auto">

      {/* ═══════ 1. Keyword Coverage ═══════ */}
      {hasKeywords && (
        <section>
          <SectionTitle>Keyword Coverage</SectionTitle>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            {/* Found */}
            <div className="rounded-xl border border-emerald-500/10 bg-emerald-500/[0.03] p-4">
              <p className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-emerald-500">
                Covered
              </p>
              <ul className="space-y-1.5">
                {keywordCoverage.found.map((kw) => (
                  <li key={kw} className="flex items-center gap-2 text-sm text-gray-300">
                    <CheckIcon className="h-3.5 w-3.5 shrink-0 text-emerald-400" />
                    {kw}
                  </li>
                ))}
                {keywordCoverage.found.length === 0 && (
                  <li className="text-xs text-gray-600">None covered</li>
                )}
              </ul>
            </div>

            {/* Missed */}
            <div className="rounded-xl border border-red-500/10 bg-red-500/[0.03] p-4">
              <p className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-red-500">
                Missed
              </p>
              <ul className="space-y-1.5">
                {keywordCoverage.missed.map((kw) => (
                  <li key={kw} className="flex items-center gap-2 text-sm text-gray-300">
                    <XIcon className="h-3.5 w-3.5 shrink-0 text-red-400" />
                    {kw}
                  </li>
                ))}
                {keywordCoverage.missed.length === 0 && (
                  <li className="text-xs text-gray-600">None missed — great job!</li>
                )}
              </ul>
            </div>
          </div>
        </section>
      )}

      {/* ═══════ 2. Filler Words ═══════ */}
      {fillerWords.length > 0 && (
        <section>
          <SectionTitle>Filler Words Detected</SectionTitle>
          <div className="flex flex-wrap gap-2">
            {/* Aggregate counts */}
            {Object.entries(
              fillerWords.reduce((map, w) => {
                const key = w.toLowerCase();
                map[key] = (map[key] || 0) + 1;
                return map;
              }, {})
            ).map(([word, count]) => (
              <span
                key={word}
                className="inline-flex items-center gap-1.5 rounded-full border border-amber-500/20 bg-amber-500/10 px-3 py-1 text-xs font-medium text-amber-400"
              >
                "{word}"
                <span className="rounded-full bg-amber-500/20 px-1.5 text-[10px] font-bold">
                  ×{count}
                </span>
              </span>
            ))}
          </div>
        </section>
      )}

      {/* ═══════ 3. Strengths ═══════ */}
      {feedback.strengths.length > 0 && (
        <section>
          <SectionTitle>Strengths</SectionTitle>
          <div className="grid gap-2.5 sm:grid-cols-2">
            {feedback.strengths.map((s, i) => (
              <div
                key={i}
                className="flex items-start gap-3 rounded-xl border border-emerald-500/10 bg-emerald-500/[0.03] px-4 py-3"
              >
                <div className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-emerald-500/20">
                  <CheckIcon className="h-3 w-3 text-emerald-400" />
                </div>
                <p className="text-sm leading-relaxed text-gray-300">{s}</p>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* ═══════ 4. Weaknesses ═══════ */}
      {feedback.weaknesses.length > 0 && (
        <section>
          <SectionTitle>Areas to Improve</SectionTitle>
          <div className="grid gap-2.5 sm:grid-cols-2">
            {feedback.weaknesses.map((w, i) => (
              <div
                key={i}
                className="flex items-start gap-3 rounded-xl border border-red-500/10 bg-red-500/[0.03] px-4 py-3"
              >
                <div className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-red-500/20">
                  <XIcon className="h-3 w-3 text-red-400" />
                </div>
                <p className="text-sm leading-relaxed text-gray-300">{w}</p>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* ═══════ 5. Improvement Tips ═══════ */}
      {feedback.improvement_tips.length > 0 && (
        <section>
          <SectionTitle>Improvement Tips</SectionTitle>
          <div className="flex flex-col gap-2.5">
            {feedback.improvement_tips.map((tip, i) => (
              <div
                key={i}
                className="flex items-start gap-4 rounded-xl border border-indigo-500/15 bg-indigo-500/[0.03] px-5 py-3.5"
              >
                <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-indigo-500/15 text-xs font-bold text-indigo-400">
                  {i + 1}
                </span>
                <p className="text-sm leading-relaxed text-gray-300">{tip}</p>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* ═══════ 6. Adaptive Difficulty Notice ═══════ */}
      {nextDifficulty && (
        <div className="flex items-center justify-center gap-2 rounded-xl border border-white/[0.06] bg-white/[0.02] px-5 py-3">
          <svg className="h-4 w-4 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 0 1 3 19.875v-6.75ZM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 0 1-1.125-1.125V8.625ZM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 0 1-1.125-1.125V4.125Z" />
          </svg>
          <span className="text-sm text-gray-400">
            Next question:{' '}
            <span className={`inline-flex rounded-full border px-2.5 py-0.5 text-[11px] font-semibold ${DIFF[nextDifficulty] || 'text-gray-400 border-white/10 bg-white/5'}`}>
              {nextDifficulty}
            </span>
          </span>
        </div>
      )}
    </div>
  );
}

export default FeedbackPanel;

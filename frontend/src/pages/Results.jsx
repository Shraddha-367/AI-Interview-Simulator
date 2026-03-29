import { useNavigate } from 'react-router-dom';
import useInterviewStore from '../store/useInterviewStore';
import ScoreCard from '../components/ScoreCard';
import FeedbackPanel from '../components/FeedbackPanel';

function Results() {
  const navigate = useNavigate();
  const resetInterview = useInterviewStore((s) => s.resetInterview);
  const evaluations = useInterviewStore((s) => s.evaluations);
  const answers = useInterviewStore((s) => s.answers);

  /* ── Aggregate scores from per-question evaluations ── */
  const hasEvaluations = evaluations.length > 0;

  const scores = hasEvaluations
    ? (() => {
        const axes = ['content', 'grammar', 'clarity', 'confidence', 'overall'];
        const totals = {};
        axes.forEach((a) => { totals[a] = 0; });
        evaluations.forEach((ev) => {
          const s = ev.scores || {};
          axes.forEach((a) => { totals[a] += s[a] ?? 0; });
        });
        const result = {};
        axes.forEach((a) => {
          result[a] = Math.round(totals[a] / evaluations.length);
        });
        return result;
      })()
    : { content: 0, grammar: 0, clarity: 0, confidence: 0, overall: 0 };

  /* ── Aggregate keyword coverage ── */
  const keywordCoverage = hasEvaluations
    ? (() => {
        const found = new Set();
        const missed = new Set();
        evaluations.forEach((ev) => {
          const kc = ev.keyword_coverage || {};
          (kc.found || []).forEach((w) => found.add(w));
          (kc.missed || []).forEach((w) => missed.add(w));
        });
        return { found: [...found], missed: [...missed] };
      })()
    : { found: [], missed: [] };

  /* ── Aggregate filler words ── */
  const fillerWords = hasEvaluations
    ? evaluations.flatMap((ev) => ev.feedback?.filler_words || [])
    : [];

  /* ── Aggregate feedback ── */
  const feedback = hasEvaluations
    ? (() => {
        const strengths = [];
        const weaknesses = [];
        const tips = [];
        evaluations.forEach((ev) => {
          const fb = ev.feedback || {};
          (fb.strengths || []).forEach((s) => { if (!strengths.includes(s)) strengths.push(s); });
          (fb.weaknesses || []).forEach((w) => { if (!weaknesses.includes(w)) weaknesses.push(w); });
          (fb.improvement_tips || []).forEach((t) => { if (!tips.includes(t)) tips.push(t); });
        });
        return { strengths, weaknesses, improvement_tips: tips };
      })()
    : { strengths: [], weaknesses: [], improvement_tips: [] };

  /* ── Next difficulty (from last evaluation) ── */
  const nextDifficulty = hasEvaluations
    ? evaluations[evaluations.length - 1]?.next_difficulty ?? 'Medium'
    : 'Medium';

  const handleRestart = () => {
    resetInterview();
    navigate('/');
  };

  return (
    <div className="relative min-h-screen bg-[#0a0d14] text-white overflow-x-hidden">
      {/* Background glow */}
      <div aria-hidden="true" className="pointer-events-none absolute inset-0 flex justify-center">
        <div className="blob absolute top-32 h-[360px] w-[360px] rounded-full bg-indigo-500/10 blur-[120px]" />
      </div>

      <div className="relative z-10 mx-auto max-w-3xl px-6 py-16">
        {/* Header */}
        <div className="mb-12 text-center">
          <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">
            Your Results
          </h1>
          <p className="mt-2 text-gray-400">
            {hasEvaluations
              ? "Here's how you performed in your practice interview."
              : 'No evaluation data available. Results will appear after completing an interview.'}
          </p>
        </div>

        {/* ScoreCard */}
        <ScoreCard scores={scores} />

        {/* Divider */}
        <div className="my-12 h-px bg-gradient-to-r from-transparent via-white/[0.06] to-transparent" />

        {/* FeedbackPanel */}
        <FeedbackPanel
          keywordCoverage={keywordCoverage}
          fillerWords={fillerWords}
          feedback={feedback}
          nextDifficulty={nextDifficulty}
        />

        {/* Actions */}
        <div className="mt-12 flex justify-center gap-4">
          <button
            id="results-restart"
            type="button"
            onClick={handleRestart}
            className="group inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-8 py-3 text-sm font-semibold text-white shadow-lg shadow-indigo-500/25 transition-all duration-300 hover:bg-indigo-500 hover:shadow-indigo-500/40 hover:scale-[1.03] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400 focus-visible:ring-offset-2 focus-visible:ring-offset-[#0a0d14] active:scale-[0.98]"
          >
            Try Again
            <svg className="h-4 w-4 transition-transform duration-300 group-hover:translate-x-1" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0 3.181 3.183a8.25 8.25 0 0 0 13.803-3.7M4.031 9.865a8.25 8.25 0 0 1 13.803-3.7l3.181 3.182" />
            </svg>
          </button>
        </div>
      </div>
    </div>
  );
}

export default Results;

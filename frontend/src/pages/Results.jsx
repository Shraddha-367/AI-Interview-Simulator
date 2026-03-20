import { useNavigate } from 'react-router-dom';
import useInterviewStore from '../store/useInterviewStore';
import ScoreCard from '../components/ScoreCard';
import FeedbackPanel from '../components/FeedbackPanel';

function Results() {
  const navigate = useNavigate();
  const resetInterview = useInterviewStore((s) => s.resetInterview);

  // TODO: replace with real data from API / Zustand
  const scores = {
    content: 78,
    grammar: 85,
    clarity: 72,
    confidence: 68,
    overall: 76,
  };

  const keywordCoverage = {
    found: ['React', 'Hooks', 'State Management', 'REST API'],
    missed: ['Testing', 'CI/CD', 'TypeScript'],
  };

  const fillerWords = ['um', 'like', 'um', 'basically', 'like', 'you know'];

  const feedback = {
    strengths: [
      'Clear explanation of React component lifecycle',
      'Good use of real-world project examples',
    ],
    weaknesses: [
      'Could elaborate more on system design trade-offs',
      'Answers were slightly rushed towards the end',
    ],
    improvement_tips: [
      'Use the STAR method to structure behavioral answers with concrete metrics.',
      'Reduce filler words by pausing briefly before answering.',
      'Practice whiteboard-style system design with time constraints.',
    ],
  };

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
            Here's how you performed in your practice interview.
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
          nextDifficulty="Hard"
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

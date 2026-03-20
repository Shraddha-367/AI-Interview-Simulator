import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import useInterviewStore from '../store/useInterviewStore';
import useInterview from '../hooks/useInterview';
import QuestionCard from './QuestionCard';
import AnswerInput from './AnswerInput';

/* ── Constants ── */
const QUESTION_TIME = 120; // seconds per question
const RADIUS = 20;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

/* ── Difficulty badge colors ── */
const DIFF_COLORS = {
  Easy: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
  Medium: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
  Hard: 'bg-red-500/10 text-red-400 border-red-500/20',
};

function InterviewRoom() {
  const navigate = useNavigate();
  const difficulty = useInterviewStore((s) => s.difficulty);

  const {
    phase,
    currentIndex,
    totalQuestions,
    currentQuestion,
    submitAnswer,
  } = useInterview();

  /* ── Countdown timer ── */
  const [timeLeft, setTimeLeft] = useState(QUESTION_TIME);

  // Reset timer each time the question changes
  useEffect(() => {
    setTimeLeft(QUESTION_TIME);
  }, [currentIndex]);

  // Tick every second while active
  useEffect(() => {
    if (phase !== 'active') return;
    if (timeLeft <= 0) {
      // auto-submit empty answer when time runs out
      submitAnswer('(time expired)');
      return;
    }
    const id = setInterval(() => setTimeLeft((t) => t - 1), 1000);
    return () => clearInterval(id);
  }, [phase, timeLeft, submitAnswer]);

  const progress = timeLeft / QUESTION_TIME;
  const dashOffset = CIRCUMFERENCE * (1 - progress);
  const minutes = String(Math.floor(timeLeft / 60)).padStart(2, '0');
  const seconds = String(timeLeft % 60).padStart(2, '0');

  /* ── Phase: done → redirect ── */
  useEffect(() => {
    if (phase === 'done') {
      const t = setTimeout(() => navigate('/results'), 800);
      return () => clearTimeout(t);
    }
  }, [phase, navigate]);

  /* ── Phase: loading ── */
  if (phase === 'loading') {
    return (
      <div className="flex h-screen items-center justify-center bg-[#0a0d14]">
        <div className="flex flex-col items-center gap-4">
          <div className="h-10 w-10 animate-spin rounded-full border-2 border-indigo-500 border-t-transparent" />
          <p className="text-sm text-gray-400">Generating questions…</p>
        </div>
      </div>
    );
  }

  /* ── Phase: done (brief flash before redirect) ── */
  if (phase === 'done') {
    return (
      <div className="flex h-screen items-center justify-center bg-[#0a0d14]">
        <div className="flex flex-col items-center gap-4 text-center">
          <div className="flex h-14 w-14 items-center justify-center rounded-full bg-emerald-500/10">
            <svg className="h-7 w-7 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75 11.25 15 15 9.75M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
            </svg>
          </div>
          <p className="text-lg font-semibold text-white">Interview Complete!</p>
          <p className="text-sm text-gray-400">Redirecting to results…</p>
        </div>
      </div>
    );
  }

  /* ── Phase: active ── */
  return (
    <div className="flex h-screen flex-col bg-[#0a0d14] text-white overflow-hidden">
      {/* ═══════ Top Bar ═══════ */}
      <header className="flex items-center justify-between border-b border-white/[0.06] px-6 py-3">
        {/* Question counter */}
        <span className="text-sm font-medium text-gray-400">
          Question{' '}
          <span className="text-white font-semibold">{currentIndex + 1}</span>
          {' '}of{' '}
          <span className="text-white font-semibold">{totalQuestions}</span>
        </span>

        {/* SVG circular countdown */}
        <div className="flex items-center gap-3">
          <div className="relative flex items-center justify-center">
            <svg className="h-12 w-12 -rotate-90" viewBox="0 0 48 48">
              {/* Background track */}
              <circle cx="24" cy="24" r={RADIUS} fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="3" />
              {/* Progress arc */}
              <circle
                cx="24"
                cy="24"
                r={RADIUS}
                fill="none"
                stroke={timeLeft <= 15 ? '#ef4444' : '#6366f1'}
                strokeWidth="3"
                strokeLinecap="round"
                strokeDasharray={CIRCUMFERENCE}
                strokeDashoffset={dashOffset}
                className="transition-all duration-1000 ease-linear"
              />
            </svg>
            <span className={`absolute text-[11px] font-mono font-semibold ${timeLeft <= 15 ? 'text-red-400' : 'text-gray-300'}`}>
              {minutes}:{seconds}
            </span>
          </div>

          {/* Difficulty badge */}
          <span className={`rounded-full border px-3 py-1 text-[11px] font-semibold ${DIFF_COLORS[difficulty] || DIFF_COLORS.Medium}`}>
            {difficulty}
          </span>
        </div>
      </header>

      {/* ═══════ Center: Question Card ═══════ */}
      <main className="flex flex-1 items-center justify-center px-6">
        <QuestionCard
          question={currentQuestion}
          index={currentIndex}
          type={typeof currentQuestion === 'object' ? currentQuestion?.type : ''}
          topic={typeof currentQuestion === 'object' ? currentQuestion?.topic : ''}
          timeLimit={QUESTION_TIME}
        />
      </main>

      {/* ═══════ Bottom: Answer Input ═══════ */}
      <footer className="border-t border-white/[0.06] px-6 py-5 flex justify-center">
        <AnswerInput onSubmit={submitAnswer} disabled={phase !== 'active'} />
      </footer>
    </div>
  );
}

export default InterviewRoom;

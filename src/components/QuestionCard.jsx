import { useEffect, useRef, useState } from 'react';

/* ── Type badge color map ── */
const TYPE_COLORS = {
  Technical: 'bg-cyan-500/10 text-cyan-400 border-cyan-500/20',
  HR: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
  Behavioral: 'bg-purple-500/10 text-purple-400 border-purple-500/20',
};

const CHAR_DELAY = 30; // ms per character

/**
 * QuestionCard
 * Props: { question, type, topic, timeLimit, index }
 *
 * - Typewriter animation (30 ms/char)
 * - Topic badge (top-left, indigo)
 * - Type badge (top-right, color-coded)
 * - Fade + slide-up appear animation on question change
 */
function QuestionCard({ question = '', type = '', topic = '', timeLimit, index = 0 }) {
  /* ── Resolve question text ── */
  const text =
    typeof question === 'string'
      ? question
      : question?.question ?? question?.text ?? '';

  const resolvedType =
    type || (typeof question === 'object' ? question.type : '') || '';
  const resolvedTopic =
    topic || (typeof question === 'object' ? question.topic : '') || '';

  /* ── Typewriter state ── */
  const [displayed, setDisplayed] = useState('');
  const [done, setDone] = useState(false);
  const intervalRef = useRef(null);

  // restart typewriter whenever the question text changes
  useEffect(() => {
    setDisplayed('');
    setDone(false);

    if (!text) {
      setDone(true);
      return;
    }

    let charIdx = 0;
    intervalRef.current = setInterval(() => {
      charIdx += 1;
      setDisplayed(text.slice(0, charIdx));
      if (charIdx >= text.length) {
        clearInterval(intervalRef.current);
        setDone(true);
      }
    }, CHAR_DELAY);

    return () => clearInterval(intervalRef.current);
  }, [text]);

  /* ── Empty state ── */
  if (!text) {
    return (
      <div className="flex items-center justify-center rounded-2xl border border-white/[0.06] bg-white/[0.02] p-10">
        <p className="text-gray-500 text-sm">No question available.</p>
      </div>
    );
  }

  return (
    <div
      key={index}
      className="question-card-appear relative w-full max-w-2xl rounded-2xl border border-white/[0.06] bg-white/[0.02] px-8 py-10 backdrop-blur-sm"
    >
      {/* ── Top row: badges ── */}
      <div className="mb-6 flex items-center justify-between">
        {/* Topic badge — top-left */}
        {resolvedTopic ? (
          <span className="rounded-full border border-indigo-500/20 bg-indigo-500/10 px-3.5 py-1 text-[11px] font-semibold text-indigo-400">
            {resolvedTopic}
          </span>
        ) : (
          <span />
        )}

        {/* Type badge — top-right */}
        {resolvedType ? (
          <span
            className={`rounded-full border px-3.5 py-1 text-[11px] font-semibold ${
              TYPE_COLORS[resolvedType] || 'bg-white/5 text-gray-400 border-white/10'
            }`}
          >
            {resolvedType}
          </span>
        ) : (
          <span />
        )}
      </div>

      {/* ── Question text with typewriter ── */}
      <p className="min-h-[60px] text-center text-xl font-medium leading-relaxed text-gray-200 sm:text-[22px]">
        {displayed}
        {/* blinking cursor while typing */}
        {!done && (
          <span className="ml-0.5 inline-block h-5 w-[2px] animate-pulse bg-indigo-400 align-middle" />
        )}
      </p>

      {/* ── Optional time-limit hint ── */}
      {timeLimit && (
        <p className="mt-6 text-center text-[11px] text-gray-600">
          Time limit: {timeLimit}s
        </p>
      )}
    </div>
  );
}

export default QuestionCard;

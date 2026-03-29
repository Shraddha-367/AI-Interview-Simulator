import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import useVoiceInput from '../hooks/useVoiceInput';

/* ── Number of waveform bars ── */
const BAR_COUNT = 20;

/**
 * AnswerInput
 *
 * Voice / text toggle for the interview room.
 * Props: { onSubmit(text), disabled }
 */
function AnswerInput({ onSubmit, disabled }) {
  /* ── Mode: 'voice' | 'text' ── */
  const [mode, setMode] = useState('voice');
  const [textValue, setTextValue] = useState('');
  const [toast, setToast] = useState('');
  const [recSeconds, setRecSeconds] = useState(0);
  const timerRef = useRef(null);
  const textareaRef = useRef(null);

  const {
    isRecording,
    audioLevel,
    transcript,
    fillerWords,
    error: voiceError,
    startRecording,
    stopRecording,
    clearTranscript,
  } = useVoiceInput();

  /* ── Auto-switch to text if voice unavailable ── */
  useEffect(() => {
    if (voiceError && mode === 'voice') {
      setMode('text');
      setToast(voiceError);
      const t = setTimeout(() => setToast(''), 4000);
      return () => clearTimeout(t);
    }
  }, [voiceError, mode]);

  /* ── Recording timer ── */
  useEffect(() => {
    if (isRecording) {
      setRecSeconds(0);
      timerRef.current = setInterval(() => setRecSeconds((s) => s + 1), 1000);
    } else {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    return () => clearInterval(timerRef.current);
  }, [isRecording]);

  const formattedTime = useMemo(() => {
    const m = String(Math.floor(recSeconds / 60)).padStart(2, '0');
    const s = String(recSeconds % 60).padStart(2, '0');
    return `${m}:${s}`;
  }, [recSeconds]);

  /* ── Auto-expand textarea ── */
  useEffect(() => {
    const el = textareaRef.current;
    if (el) {
      el.style.height = 'auto';
      el.style.height = `${Math.max(el.scrollHeight, 72)}px`;
    }
  }, [textValue]);

  /* ── Derive the final answer text ── */
  const answerText = mode === 'voice' ? transcript : textValue;

  /* ── Submit ── */
  const handleSubmit = useCallback(() => {
    const trimmed = answerText.trim();
    if (!trimmed || disabled || isRecording) return;
    onSubmit(trimmed, fillerWords);
    setTextValue('');
    clearTranscript();
  }, [answerText, disabled, isRecording, onSubmit, fillerWords, clearTranscript]);

  /* Ctrl/Cmd + Enter shortcut */
  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
      e.preventDefault();
      handleSubmit();
    }
  };

  /* ── Toggle voice / text ── */
  const toggleMode = () => {
    if (isRecording) return; // don't toggle while recording
    setMode((m) => (m === 'voice' ? 'text' : 'voice'));
  };

  /* ── Voice record toggle ── */
  const handleMicClick = async () => {
    if (isRecording) {
      await stopRecording();
    } else {
      clearTranscript();
      await startRecording();
    }
  };

  /* ── Waveform bar heights (derived from audioLevel) ── */
  const bars = useMemo(() => {
    return Array.from({ length: BAR_COUNT }, (_, i) => {
      // create some variance per bar using sine offset
      const phase = (i / BAR_COUNT) * Math.PI * 2;
      const wave = 0.5 + 0.5 * Math.sin(phase + Date.now() / 200);
      const base = isRecording ? audioLevel : 0;
      return Math.max(4, Math.round(base * wave * 0.6));
    });
  }, [audioLevel, isRecording]);

  const canSubmit = answerText.trim().length > 0 && !isRecording && !disabled;

  return (
    <div className="w-full max-w-2xl flex flex-col gap-2">
      {/* ── Toast ── */}
      {toast && (
        <div className="flex items-center gap-2 rounded-lg bg-amber-500/10 border border-amber-500/20 px-4 py-2 text-xs text-amber-400 animate-pulse">
          <svg className="h-3.5 w-3.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126ZM12 15.75h.007v.008H12v-.008Z" />
          </svg>
          {toast}
        </div>
      )}

      {/* ── Main card ── */}
      <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] backdrop-blur-sm transition-colors focus-within:border-indigo-500/40 focus-within:shadow-[0_0_20px_-6px_rgba(99,102,241,0.2)]">
        {/* ════ Voice mode ════ */}
        {mode === 'voice' && (
          <div className="flex flex-col items-center gap-4 px-5 py-6">
            {/* Waveform bars */}
            <div className="flex items-end gap-[3px] h-12">
              {bars.map((h, i) => (
                <div
                  key={i}
                  className={`w-[3px] rounded-full transition-all duration-75 ${
                    isRecording ? 'bg-indigo-400' : 'bg-white/10'
                  }`}
                  style={{ height: `${h}px` }}
                />
              ))}
            </div>

            {/* Recording timer */}
            {isRecording && (
              <div className="flex items-center gap-2">
                <span className="relative flex h-2 w-2">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-red-400 opacity-75" />
                  <span className="relative inline-flex h-2 w-2 rounded-full bg-red-500" />
                </span>
                <span className="text-xs font-mono text-gray-400">{formattedTime}</span>
              </div>
            )}

            {/* Transcript preview */}
            {transcript && (
              <p className="w-full rounded-lg bg-white/[0.03] px-4 py-3 text-sm leading-relaxed text-gray-300">
                {transcript}
              </p>
            )}

            {/* Mic button */}
            <button
              id="mic-toggle"
              type="button"
              onClick={handleMicClick}
              disabled={disabled}
              className={`
                flex h-14 w-14 items-center justify-center rounded-full transition-all duration-300
                focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500
                ${
                  isRecording
                    ? 'bg-red-500 text-white shadow-lg shadow-red-500/30 hover:bg-red-400 animate-pulse'
                    : 'bg-indigo-600 text-white shadow-lg shadow-indigo-500/25 hover:bg-indigo-500 hover:scale-105'
                }
                disabled:opacity-40 disabled:cursor-not-allowed
              `}
            >
              {isRecording ? (
                /* Stop icon */
                <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 24 24">
                  <rect x="6" y="6" width="12" height="12" rx="2" />
                </svg>
              ) : (
                /* Mic icon */
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 18.75a6 6 0 0 0 6-6v-1.5m-6 7.5a6 6 0 0 1-6-6v-1.5m6 7.5v3.75m-3.75 0h7.5M12 15.75a3 3 0 0 1-3-3V4.5a3 3 0 1 1 6 0v8.25a3 3 0 0 1-3 3Z" />
                </svg>
              )}
            </button>
          </div>
        )}

        {/* ════ Text mode ════ */}
        {mode === 'text' && (
          <textarea
            ref={textareaRef}
            id="answer-input"
            value={textValue}
            onChange={(e) => setTextValue(e.target.value)}
            onKeyDown={handleKeyDown}
            disabled={disabled}
            placeholder="Type your answer..."
            className="w-full resize-none bg-transparent px-5 py-4 text-sm leading-relaxed text-gray-200 placeholder-gray-600 outline-none disabled:opacity-40"
            style={{ minHeight: '72px' }}
          />
        )}

        {/* ════ Bottom bar ════ */}
        <div className="flex items-center justify-between border-t border-white/[0.04] px-4 py-2.5">
          {/* Left: mode toggle */}
          <button
            id="mode-toggle"
            type="button"
            onClick={toggleMode}
            disabled={isRecording}
            className="flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-[11px] text-gray-500 transition-colors hover:text-gray-300 disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {mode === 'voice' ? (
              <>
                {/* Keyboard icon → switch to text */}
                <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25H12" />
                </svg>
                Text mode
              </>
            ) : (
              <>
                {/* Mic icon → switch to voice */}
                <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 18.75a6 6 0 0 0 6-6v-1.5m-6 7.5a6 6 0 0 1-6-6v-1.5m6 7.5v3.75m-3.75 0h7.5M12 15.75a3 3 0 0 1-3-3V4.5a3 3 0 1 1 6 0v8.25a3 3 0 0 1-3 3Z" />
                </svg>
                Voice mode
              </>
            )}
          </button>

          {/* Center: hint */}
          <span className="text-[11px] text-gray-600 hidden sm:inline">
            {mode === 'text' ? 'Ctrl + Enter to submit' : isRecording ? 'Click mic to stop' : 'Click mic to record'}
          </span>

          {/* Right: submit */}
          <button
            id="answer-submit"
            type="button"
            onClick={handleSubmit}
            disabled={!canSubmit}
            className={`
              rounded-lg px-5 py-1.5 text-xs font-semibold transition-all duration-200
              focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500
              ${
                canSubmit
                  ? 'bg-indigo-600 text-white hover:bg-indigo-500 active:scale-95 cursor-pointer'
                  : 'bg-white/5 text-gray-600 cursor-not-allowed'
              }
            `}
          >
            Submit
          </button>
        </div>
      </div>
    </div>
  );
}

export default AnswerInput;

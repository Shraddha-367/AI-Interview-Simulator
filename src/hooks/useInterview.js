import { useCallback, useEffect, useRef, useState } from 'react';
import axios from 'axios';
import useInterviewStore from '../store/useInterviewStore';

/**
 * Hook that drives the full interview lifecycle:
 *   loading → active → done
 *
 * On mount it POSTs to generate questions, then exposes helpers
 * to cycle through them and record answers.
 */
export function useInterview() {
  /* ── Zustand slices ── */
  const resumeData = useInterviewStore((s) => s.resumeData);
  const persona = useInterviewStore((s) => s.persona);
  const difficulty = useInterviewStore((s) => s.difficulty);
  const storeSetQuestions = useInterviewStore((s) => s.setQuestions);
  const storeAddAnswer = useInterviewStore((s) => s.addAnswer);

  /* ── Local state ── */
  const [phase, setPhase] = useState('loading'); // loading | active | done
  const [questions, setQuestions] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState([]);
  const [error, setError] = useState(null);

  // guard against double-fetch in StrictMode
  const fetched = useRef(false);

  /* ── Fetch questions on mount ── */
  useEffect(() => {
    if (fetched.current) return;
    fetched.current = true;

    const generate = async () => {
      try {
        setPhase('loading');
        setError(null);

        const { data } = await axios.post(
          'http://localhost:8000/api/interview/generate',
          {
            resume_id: resumeData?.id ?? null,
            persona,
            difficulty,
            num_questions: 5,
          }
        );

        const q = Array.isArray(data) ? data : data.questions ?? [];
        setQuestions(q);
        storeSetQuestions(q);
        setPhase('active');
      } catch (err) {
        setError(err.response?.data?.message || err.message);
        setPhase('active'); // degrade gracefully — show empty state
      }
    };

    generate();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  /* ── Submit answer & advance ── */
  const submitAnswer = useCallback(
    (answerText) => {
      const entry = {
        questionIndex: currentIndex,
        question: questions[currentIndex] ?? '',
        answer: answerText,
        timestamp: Date.now(),
      };
      const next = [...answers, entry];
      setAnswers(next);
      storeAddAnswer(entry);

      if (currentIndex + 1 >= questions.length) {
        setPhase('done');
      } else {
        setCurrentIndex((i) => i + 1);
      }
    },
    [currentIndex, questions, answers, storeAddAnswer]
  );

  return {
    phase,
    questions,
    currentIndex,
    answers,
    error,
    totalQuestions: questions.length,
    currentQuestion: questions[currentIndex] ?? null,
    submitAnswer,
  };
}

export default useInterview;

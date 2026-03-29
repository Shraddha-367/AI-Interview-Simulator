import { useCallback, useEffect, useRef, useState } from 'react';
import useInterviewStore from '../store/useInterviewStore';
import { generateQuestions, evaluateAnswer } from '../services/interviewService';

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
  const storeAddEvaluation = useInterviewStore((s) => s.addEvaluation);

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

        const data = await generateQuestions({
          resume_data: resumeData ?? {},
          persona: persona ?? 'hr',
          difficulty: (difficulty ?? 'Medium').toLowerCase(),
          num_questions: 5,
        });

        const q = data.questions ?? [];
        setQuestions(q);
        storeSetQuestions(q);
        setPhase('active');
      } catch (err) {
        setError(err.response?.data?.detail || err.message);
        setPhase('active'); // degrade gracefully — show empty state
      }
    };

    generate();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  /* ── Submit answer, evaluate, & advance ── */
  const submitAnswer = useCallback(
    async (answerText, fillerWords = []) => {
      const currentQ = questions[currentIndex];
      const entry = {
        questionIndex: currentIndex,
        question: currentQ ?? '',
        answer: answerText,
        timestamp: Date.now(),
      };
      const next = [...answers, entry];
      setAnswers(next);
      storeAddAnswer(entry);

      // Fire evaluation in background (non-blocking for UX)
      try {
        const questionText =
          typeof currentQ === 'object' ? currentQ.question : currentQ ?? '';
        const expectedKeywords =
          typeof currentQ === 'object' ? currentQ.expected_keywords ?? [] : [];

        const evalResult = await evaluateAnswer({
          question_text: questionText,
          answer_text: answerText,
          expected_keywords: expectedKeywords,
          current_difficulty: (difficulty ?? 'Medium').toLowerCase(),
          filler_words: fillerWords,
        });

        storeAddEvaluation({
          questionIndex: currentIndex,
          ...evalResult,
        });
      } catch (err) {
        console.error('Evaluation failed (non-fatal):', err.message);
      }

      if (currentIndex + 1 >= questions.length) {
        setPhase('done');
      } else {
        setCurrentIndex((i) => i + 1);
      }
    },
    [currentIndex, questions, answers, difficulty, storeAddAnswer, storeAddEvaluation]
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

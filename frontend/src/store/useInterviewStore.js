import { create } from 'zustand';

const useInterviewStore = create((set) => ({
  // ── Resume state ──
  resumeData: null, // { skills:[], experience:[], projects:[], name, resume_id, ... }
  setResumeData: (data) => set({ resumeData: data }),
  clearResumeData: () => set({ resumeData: null }),

  // ── Persona & difficulty ──
  persona: null,   // 'hr' | 'tech' | 'behavioral'
  difficulty: 'Medium', // 'Easy' | 'Medium' | 'Hard'
  setPersona: (persona) => set({ persona }),
  setDifficulty: (difficulty) => set({ difficulty }),

  // ── Interview state ──
  questions: [],
  currentQuestionIndex: 0,
  answers: [],
  isInterviewActive: false,

  // ── Evaluation results (per-question) ──
  evaluations: [],
  sessionId: null,

  // ── Interview actions ──
  setQuestions: (questions) => set({ questions }),
  setCurrentQuestionIndex: (index) => set({ currentQuestionIndex: index }),
  addAnswer: (answer) =>
    set((state) => ({ answers: [...state.answers, answer] })),
  addEvaluation: (evaluation) =>
    set((state) => ({ evaluations: [...state.evaluations, evaluation] })),
  setSessionId: (id) => set({ sessionId: id }),
  startInterview: () => set({ isInterviewActive: true }),
  endInterview: () => set({ isInterviewActive: false }),

  // ── Full reset ──
  resetInterview: () =>
    set({
      resumeData: null,
      persona: null,
      difficulty: 'Medium',
      questions: [],
      currentQuestionIndex: 0,
      answers: [],
      isInterviewActive: false,
      evaluations: [],
      sessionId: null,
    }),
}));

export default useInterviewStore;

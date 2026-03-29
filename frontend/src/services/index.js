export { default as apiClient } from './apiClient';
export { generateQuestions, evaluateAnswer } from './interviewService';
export { uploadResume } from './resumeService';
export { transcribeAudio } from './speechService';
export { getUserSessions, saveSession } from './historyService';
export { auth, googleProvider, db } from './firebase';

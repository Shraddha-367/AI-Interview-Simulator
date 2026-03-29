import apiClient from './apiClient';

/**
 * Interview & evaluation API service functions.
 */

/**
 * Generate personalised interview questions using GPT-4o.
 *
 * @param {{ resume_data: object, persona: string, difficulty: string, num_questions: number }} params
 * @returns {Promise<{ questions: object[], count: number }>}
 */
export const generateQuestions = async ({
  resume_data,
  persona = 'hr',
  difficulty = 'medium',
  num_questions = 5,
}) => {
  const response = await apiClient.post('/interview/generate', {
    resume_data,
    persona,
    difficulty,
    num_questions,
  });
  return response.data;
};

/**
 * Evaluate a candidate's answer using GPT-4o.
 *
 * @param {{ question_text: string, answer_text: string, expected_keywords?: string[], current_difficulty?: string, filler_words?: string[] }} params
 * @returns {Promise<{ scores: object, keyword_coverage: object, feedback: object, next_difficulty: string }>}
 */
export const evaluateAnswer = async ({
  question_text,
  answer_text,
  expected_keywords = [],
  current_difficulty = 'medium',
  filler_words = [],
}) => {
  const response = await apiClient.post('/evaluation/evaluate', {
    question_text,
    answer_text,
    expected_keywords,
    current_difficulty,
    filler_words,
  });
  return response.data;
};

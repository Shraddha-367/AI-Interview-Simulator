import apiClient from './apiClient';

/**
 * Interview-related API service functions.
 */

export const getQuestions = async (topic) => {
  const response = await apiClient.get('/questions', { params: { topic } });
  return response.data;
};

export const submitAnswers = async (answers) => {
  const response = await apiClient.post('/submit', { answers });
  return response.data;
};

export const getResults = async (sessionId) => {
  const response = await apiClient.get(`/results/${sessionId}`);
  return response.data;
};

import apiClient from './apiClient';

/**
 * History-related API service functions.
 * All endpoints require Firebase auth Bearer token (handled by apiClient interceptor).
 */

/**
 * Get all interview sessions for a user, newest first.
 *
 * @param {string} userId - Firebase UID
 * @returns {Promise<{ sessions: object[] }>}
 */
export const getUserSessions = async (userId) => {
  const response = await apiClient.get(`/history/${userId}`);
  return response.data;
};

/**
 * Save an interview session to the backend (persisted to Firestore).
 *
 * @param {{ uid: string, session_id: string, session_data: object }} payload
 * @returns {Promise<{ saved: boolean }>}
 */
export const saveSession = async ({ uid, session_id, session_data }) => {
  const response = await apiClient.post('/history/save', {
    uid,
    session_id,
    session_data,
  });
  return response.data;
};

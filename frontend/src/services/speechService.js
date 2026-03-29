import apiClient from './apiClient';

/**
 * Speech-related API service functions.
 */

/**
 * Send an audio blob to the backend for Whisper transcription.
 *
 * @param {Blob} blob - Audio blob (webm, wav, etc.)
 * @param {string} [filename='recording.webm'] - Filename hint
 * @returns {Promise<{ transcript: string, filler_words: string[], filler_count: number, duration_seconds: number }>}
 */
export const transcribeAudio = async (blob, filename = 'recording.webm') => {
  const form = new FormData();
  form.append('file', blob, filename);

  const response = await apiClient.post('/speech/transcribe', form, {
    headers: { 'Content-Type': 'multipart/form-data' },
    timeout: 30000,
  });
  return response.data;
};

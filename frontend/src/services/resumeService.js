import apiClient from './apiClient';

/**
 * Resume-related API service functions.
 */

/**
 * Upload a resume file (.pdf or .docx) and get parsed data back.
 *
 * @param {File} file - The resume file to upload
 * @param {function} [onProgress] - Optional upload progress callback (0-100)
 * @returns {Promise<object>} Parsed resume data { name, skills, experience, projects, resume_id, ... }
 */
export const uploadResume = async (file, onProgress) => {
  const formData = new FormData();
  formData.append('file', file);

  const response = await apiClient.post('/resume/upload', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
    timeout: 30000,
    onUploadProgress: onProgress
      ? (e) => {
          const pct = Math.round((e.loaded * 100) / (e.total ?? e.loaded));
          onProgress(pct);
        }
      : undefined,
  });
  return response.data;
};

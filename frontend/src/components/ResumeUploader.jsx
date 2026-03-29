import { useState, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import useInterviewStore from '../store/useInterviewStore';
import { uploadResume } from '../services/resumeService';

const ACCEPTED_TYPES = [
  'application/pdf',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
];
const ACCEPTED_EXT = ['.pdf', '.docx'];
const MAX_SIZE = 5 * 1024 * 1024; // 5 MB

function ResumeUploader() {
  const navigate = useNavigate();
  const fileInputRef = useRef(null);
  const setResumeData = useInterviewStore((s) => s.setResumeData);

  const [dragActive, setDragActive] = useState(false);
  const [file, setFile] = useState(null);
  const [error, setError] = useState('');
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [parsed, setParsed] = useState(null); // { skills, experience, projects }

  /* ── Validation ── */
  const validate = useCallback((f) => {
    if (!f) return 'No file selected.';
    const ext = f.name.substring(f.name.lastIndexOf('.')).toLowerCase();
    if (!ACCEPTED_TYPES.includes(f.type) && !ACCEPTED_EXT.includes(ext)) {
      return 'Only PDF or DOCX files are accepted.';
    }
    if (f.size > MAX_SIZE) {
      return `File exceeds 5 MB limit (${(f.size / 1024 / 1024).toFixed(1)} MB).`;
    }
    return '';
  }, []);

  /* ── Handle file pick ── */
  const handleFile = useCallback(
    (f) => {
      setError('');
      setParsed(null);
      setProgress(0);
      const err = validate(f);
      if (err) {
        setError(err);
        setFile(null);
        return;
      }
      setFile(f);
      uploadFile(f);
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [validate]
  );

  /* ── Drag events ── */
  const onDragOver = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(true);
  };
  const onDragLeave = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
  };
  const onDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files?.[0]) handleFile(e.dataTransfer.files[0]);
  };
  const onBrowse = () => fileInputRef.current?.click();
  const onInputChange = (e) => {
    if (e.target.files?.[0]) handleFile(e.target.files[0]);
  };

  /* ── Upload ── */
  const uploadFile = async (f) => {
    setUploading(true);
    setProgress(0);
    setError('');

    try {
      const data = await uploadResume(f, (pct) => setProgress(pct));

      // data = { name, skills:[], experience:[], projects:[], resume_id, ... }
      setParsed(data);
      setResumeData(data);
    } catch (err) {
      const msg =
        err.response?.data?.detail ||
        err.message ||
        'Upload failed. Please try again.';
      setError(msg);
    } finally {
      setUploading(false);
    }
  };

  /* ── Derived state ── */
  const isComplete = !!parsed && !uploading;

  return (
    <div className="w-full max-w-2xl mx-auto flex flex-col items-center gap-8">
      {/* ──────── Drop-zone ──────── */}
      <button
        type="button"
        id="resume-dropzone"
        onClick={onBrowse}
        onDragOver={onDragOver}
        onDragLeave={onDragLeave}
        onDrop={onDrop}
        className={`
          dropzone-border relative w-full cursor-pointer rounded-2xl
          bg-white/[0.02] p-10 text-center transition-all duration-300
          focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500
          ${dragActive ? 'dropzone-glow scale-[1.01]' : 'hover:dropzone-glow'}
        `}
      >
        {/* Icon */}
        <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-indigo-500/10">
          <svg
            className="h-6 w-6 text-indigo-400"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={1.5}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M3 16.5v2.25A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75V16.5m-13.5-9L12 3m0 0 4.5 4.5M12 3v13.5"
            />
          </svg>
        </div>

        <p className="text-sm font-medium text-gray-300">
          {file && !error
            ? file.name
            : 'Drag & drop your resume here, or click to browse'}
        </p>
        <p className="mt-1 text-xs text-gray-500">PDF or DOCX · max 5 MB</p>

        <input
          ref={fileInputRef}
          type="file"
          accept=".pdf,.docx"
          className="hidden"
          onChange={onInputChange}
        />
      </button>

      {/* ──────── Inline Error ──────── */}
      {error && (
        <div className="flex items-center gap-2 rounded-lg bg-red-500/10 border border-red-500/20 px-4 py-2.5 text-sm text-red-400 w-full">
          <svg className="h-4 w-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126ZM12 15.75h.007v.008H12v-.008Z" />
          </svg>
          {error}
        </div>
      )}

      {/* ──────── Progress Bar ──────── */}
      {uploading && (
        <div className="w-full space-y-2">
          <div className="flex items-center justify-between text-xs text-gray-400">
            <span>Uploading…</span>
            <span>{progress}%</span>
          </div>
          <div className="h-2 w-full overflow-hidden rounded-full bg-white/5">
            <div
              className="h-full rounded-full bg-gradient-to-r from-indigo-500 to-purple-500 transition-all duration-300 ease-out"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>
      )}

      {/* ──────── Skill Tag Cloud ──────── */}
      {parsed?.skills?.length > 0 && (
        <div className="w-full space-y-3">
          <h3 className="text-xs font-semibold uppercase tracking-widest text-gray-500">
            Extracted Skills
          </h3>
          <div className="flex flex-wrap gap-2">
            {parsed.skills.map((skill, i) => (
              <span
                key={skill}
                className="skill-pill inline-flex items-center rounded-full border border-indigo-500/20 bg-indigo-500/10 px-3.5 py-1 text-xs font-medium text-indigo-300 backdrop-blur-sm"
                style={{ animationDelay: `${i * 60}ms` }}
              >
                {skill}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* ──────── Continue Button ──────── */}
      {isComplete && (
        <button
          id="resume-continue"
          onClick={() => navigate('/interview')}
          className="group inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-8 py-3 text-sm font-semibold text-white shadow-lg shadow-indigo-500/25 transition-all duration-300 hover:bg-indigo-500 hover:shadow-indigo-500/40 hover:scale-[1.03] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400 focus-visible:ring-offset-2 focus-visible:ring-offset-[#0a0d14] active:scale-[0.98]"
        >
          Continue
          <svg
            className="h-4 w-4 transition-transform duration-300 group-hover:translate-x-1"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5 21 12m0 0-7.5 7.5M21 12H3" />
          </svg>
        </button>
      )}
    </div>
  );
}

export default ResumeUploader;

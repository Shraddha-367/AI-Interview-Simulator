import { useCallback, useEffect, useRef, useState } from 'react';
import axios from 'axios';

/**
 * useVoiceInput
 *
 * React hook for browser-based voice recording.
 *
 * Exposes:
 *   isRecording  – bool
 *   audioLevel   – 0‒100 (from AnalyserNode RMS)
 *   transcript   – string (set after server transcription)
 *   error        – string | null
 *   startRecording()
 *   stopRecording()   → Promise<string>  (resolves with transcript)
 *   clearTranscript()
 */
export function useVoiceInput() {
  /* ── State ── */
  const [isRecording, setIsRecording] = useState(false);
  const [audioLevel, setAudioLevel] = useState(0);
  const [transcript, setTranscript] = useState('');
  const [error, setError] = useState(null);

  /* ── Refs (never cause re-renders) ── */
  const mediaRecorderRef = useRef(null);
  const streamRef = useRef(null);
  const audioCtxRef = useRef(null);
  const analyserRef = useRef(null);
  const rafIdRef = useRef(null);
  const chunksRef = useRef([]);

  /* ─────────────────────────────────────────────
     Audio-level metering (rAF loop)
     ───────────────────────────────────────────── */
  const startMeter = useCallback(() => {
    const analyser = analyserRef.current;
    if (!analyser) return;

    const buf = new Uint8Array(analyser.fftSize);

    const tick = () => {
      analyser.getByteTimeDomainData(buf);

      // RMS → 0‒100
      let sum = 0;
      for (let i = 0; i < buf.length; i++) {
        const v = (buf[i] - 128) / 128;
        sum += v * v;
      }
      const rms = Math.sqrt(sum / buf.length);
      setAudioLevel(Math.min(100, Math.round(rms * 300)));

      rafIdRef.current = requestAnimationFrame(tick);
    };
    tick();
  }, []);

  const stopMeter = useCallback(() => {
    if (rafIdRef.current) {
      cancelAnimationFrame(rafIdRef.current);
      rafIdRef.current = null;
    }
    setAudioLevel(0);
  }, []);

  /* ─────────────────────────────────────────────
     startRecording
     ───────────────────────────────────────────── */
  const startRecording = useCallback(async () => {
    setError(null);
    setTranscript('');
    chunksRef.current = [];

    /* 1. Request mic access */
    let stream;
    try {
      stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    } catch (err) {
      // covers NotAllowedError, NotFoundError, etc.
      const msg =
        err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError'
          ? 'Mic unavailable, use text mode'
          : `Microphone error: ${err.message}`;
      setError(msg);
      return;
    }

    streamRef.current = stream;

    /* 2. Set up AnalyserNode for audio level */
    try {
      const ctx = new (window.AudioContext || window.webkitAudioContext)();
      const source = ctx.createMediaStreamSource(stream);
      const analyser = ctx.createAnalyser();
      analyser.fftSize = 256;
      source.connect(analyser);
      audioCtxRef.current = ctx;
      analyserRef.current = analyser;
      startMeter();
    } catch {
      // non-fatal — recording still works, just no level data
    }

    /* 3. Create MediaRecorder */
    try {
      const mimeType = MediaRecorder.isTypeSupported('audio/webm;codecs=opus')
        ? 'audio/webm;codecs=opus'
        : 'audio/webm';

      const recorder = new MediaRecorder(stream, { mimeType });

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };

      recorder.onerror = (e) => {
        setError(`Recording error: ${e.error?.message || 'unknown'}`);
        setIsRecording(false);
        stopMeter();
      };

      recorder.start(250); // collect data every 250 ms
      mediaRecorderRef.current = recorder;
      setIsRecording(true);
    } catch (err) {
      setError(`MediaRecorder error: ${err.message}`);
      cleanup();
    }
  }, [startMeter, stopMeter]); // eslint-disable-line react-hooks/exhaustive-deps

  /* ─────────────────────────────────────────────
     stopRecording  →  POST blob  →  set transcript
     ───────────────────────────────────────────── */
  const stopRecording = useCallback(() => {
    return new Promise((resolve) => {
      const recorder = mediaRecorderRef.current;
      if (!recorder || recorder.state === 'inactive') {
        resolve('');
        return;
      }

      recorder.onstop = async () => {
        setIsRecording(false);
        stopMeter();

        const blob = new Blob(chunksRef.current, { type: 'audio/webm' });
        chunksRef.current = [];

        // Stop all mic tracks
        streamRef.current?.getTracks().forEach((t) => t.stop());
        streamRef.current = null;

        // Close AudioContext
        if (audioCtxRef.current?.state !== 'closed') {
          audioCtxRef.current?.close().catch(() => {});
        }
        audioCtxRef.current = null;
        analyserRef.current = null;

        /* POST to transcription endpoint */
        try {
          const form = new FormData();
          form.append('audio', blob, 'recording.webm');

          const { data } = await axios.post(
            'http://localhost:8000/api/speech/transcribe',
            form,
            {
              headers: { 'Content-Type': 'multipart/form-data' },
              timeout: 30000,
            }
          );

          const text = data?.transcript ?? '';
          setTranscript(text);
          resolve(text);
        } catch (err) {
          const msg =
            err.response?.data?.message ||
            err.message ||
            'Transcription failed';
          setError(msg);
          resolve('');
        }
      };

      recorder.stop();
    });
  }, [stopMeter]);

  /* ── clearTranscript ── */
  const clearTranscript = useCallback(() => setTranscript(''), []);

  /* ─────────────────────────────────────────────
     Cleanup helper & unmount
     ───────────────────────────────────────────── */
  const cleanup = useCallback(() => {
    // Stop recorder
    if (
      mediaRecorderRef.current &&
      mediaRecorderRef.current.state !== 'inactive'
    ) {
      mediaRecorderRef.current.stop();
    }
    mediaRecorderRef.current = null;

    // Stop meter
    stopMeter();

    // Release mic
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;

    // Close audio context
    if (audioCtxRef.current?.state !== 'closed') {
      audioCtxRef.current?.close().catch(() => {});
    }
    audioCtxRef.current = null;
    analyserRef.current = null;

    setIsRecording(false);
    setAudioLevel(0);
  }, [stopMeter]);

  useEffect(() => {
    return () => cleanup();
  }, [cleanup]);

  return {
    isRecording,
    audioLevel,
    transcript,
    error,
    startRecording,
    stopRecording,
    clearTranscript,
  };
}

export default useVoiceInput;

import { useState, useRef, useCallback, useEffect } from "react";

export function useVoiceRecorder(onComplete) {
  const [recording, setRecording] = useState(false);
  const [duration, setDuration] = useState(0);
  const recorderRef = useRef(null);
  const chunksRef = useRef([]);
  const streamRef = useRef(null);
  const timerRef = useRef(null);
  const onCompleteRef = useRef(onComplete);

  useEffect(() => { onCompleteRef.current = onComplete; }, [onComplete]);

  const cleanup = useCallback(() => {
    if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null; }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
    recorderRef.current = null;
    setRecording(false);
  }, []);

  const start = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      const recorder = new MediaRecorder(stream);
      chunksRef.current = [];
      recorder.ondataavailable = (e) => { if (e.data.size > 0) chunksRef.current.push(e.data); };
      recorderRef.current = recorder;
      recorder.start();
      setRecording(true);
      setDuration(0);
      timerRef.current = setInterval(() => setDuration((d) => d + 1), 1000);
    } catch {
      // Permission denied or not supported
    }
  }, []);

  const stopAndSend = useCallback(() => {
    if (!recorderRef.current) { cleanup(); return; }
    recorderRef.current.onstop = () => {
      const blob = new Blob(chunksRef.current, { type: "audio/webm" });
      const dur = duration;
      cleanup();
      if (blob.size > 0) onCompleteRef.current?.(blob, dur);
    };
    recorderRef.current.stop();
  }, [duration, cleanup]);

  const cancel = useCallback(() => {
    if (recorderRef.current) {
      recorderRef.current.onstop = () => cleanup();
      recorderRef.current.stop();
    } else {
      cleanup();
    }
  }, [cleanup]);

  useEffect(() => () => cleanup(), [cleanup]);

  return { recording, duration, start, stopAndSend, cancel };
}
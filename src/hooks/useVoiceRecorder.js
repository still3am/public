import { useCallback, useEffect, useRef, useState } from "react";

const CANDIDATES = ["audio/webm;codecs=opus", "audio/webm", "audio/mp4", "audio/ogg;codecs=opus"];

function pickMimeType() {
  if (typeof MediaRecorder === "undefined") return "";
  return CANDIDATES.find((type) => MediaRecorder.isTypeSupported?.(type)) || "";
}

function extensionFor(type) {
  if (type.includes("mp4")) return "m4a";
  if (type.includes("ogg")) return "ogg";
  return "webm";
}

/**
 * Records a voice note in the browser and hands back a ready-to-upload File.
 * `onDone(file)` fires only for a kept recording; cancel and unmount discard it.
 */
export default function useVoiceRecorder({ onDone } = {}) {
  const [recording, setRecording] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const [error, setError] = useState("");
  const recorderRef = useRef(null);
  const streamRef = useRef(null);
  const chunksRef = useRef([]);
  const timerRef = useRef(null);
  const discardRef = useRef(false);
  const startedAtRef = useRef(0);
  const onDoneRef = useRef(onDone);

  useEffect(() => {
    onDoneRef.current = onDone;
  }, [onDone]);

  const cleanup = useCallback(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
    recorderRef.current = null;
    chunksRef.current = [];
    setRecording(false);
    setElapsed(0);
  }, []);

  const start = useCallback(async () => {
    setError("");
    const mimeType = pickMimeType();
    if (!navigator.mediaDevices?.getUserMedia || !mimeType) {
      setError("Voice notes aren't supported in this browser.");
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream, { mimeType });
      streamRef.current = stream;
      recorderRef.current = recorder;
      chunksRef.current = [];
      discardRef.current = false;

      recorder.ondataavailable = (e) => {
        if (e.data?.size) chunksRef.current.push(e.data);
      };
      recorder.onstop = () => {
        const type = recorder.mimeType || mimeType;
        const chunks = chunksRef.current;
        const discarded = discardRef.current;
        cleanup();
        if (discarded || !chunks.length) return;
        onDoneRef.current?.(
          new File(chunks, `voice-note.${extensionFor(type)}`, { type })
        );
      };

      startedAtRef.current = Date.now();
      recorder.start();
      setRecording(true);
      timerRef.current = setInterval(
        () => setElapsed(Date.now() - startedAtRef.current),
        250
      );
    } catch (err) {
      cleanup();
      setError(
        err?.name === "NotAllowedError"
          ? "Microphone access is blocked."
          : "Couldn't start recording."
      );
    }
  }, [cleanup]);

  const stop = useCallback(() => {
    if (recorderRef.current?.state === "recording") recorderRef.current.stop();
  }, []);

  const cancel = useCallback(() => {
    discardRef.current = true;
    if (recorderRef.current?.state === "recording") recorderRef.current.stop();
    else {
      cleanup();
      setError("");
    }
  }, [cleanup]);

  useEffect(() => {
    return () => {
      discardRef.current = true;
      cleanup();
    };
  }, [cleanup]);

  return { recording, elapsed, error, active: recording || !!error, start, stop, cancel };
}
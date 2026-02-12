"use client";

import { useRef, useState, useCallback, useEffect } from "react";
import { useSettingsStore } from "@/store/settings-store";

interface MicButtonProps {
    onTranscript: (transcript: string) => void;
}

export default function MicButton({ onTranscript }: MicButtonProps) {
    const [recording, setRecording] = useState(false);
    const [transcribing, setTranscribing] = useState(false);
    const mediaRecorderRef = useRef<MediaRecorder | null>(null);
    const chunksRef = useRef<Blob[]>([]);
    const canvasRef = useRef<HTMLCanvasElement | null>(null);
    const analyserRef = useRef<AnalyserNode | null>(null);
    const animFrameRef = useRef<number>(0);
    const streamRef = useRef<MediaStream | null>(null);
    const openaiKey = useSettingsStore((s) => s.openaiKey);

    // Visualiser
    const draw = useCallback(() => {
        const canvas = canvasRef.current;
        const analyser = analyserRef.current;
        if (!canvas || !analyser) return;
        const ctx = canvas.getContext("2d")!;
        const data = new Uint8Array(analyser.frequencyBinCount);
        analyser.getByteTimeDomainData(data);
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.lineWidth = 2;
        ctx.strokeStyle = getComputedStyle(document.documentElement)
            .getPropertyValue("--accent-primary")
            .trim() || "#a78bfa";
        ctx.beginPath();
        const sliceW = canvas.width / data.length;
        let x = 0;
        for (let i = 0; i < data.length; i++) {
            const v = data[i] / 128.0;
            const y = (v * canvas.height) / 2;
            i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
            x += sliceW;
        }
        ctx.lineTo(canvas.width, canvas.height / 2);
        ctx.stroke();
        animFrameRef.current = requestAnimationFrame(draw);
    }, []);

    const startRecording = useCallback(async () => {
        if (!openaiKey) return;
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            streamRef.current = stream;

            // Set up analyser for visualisation
            const audioCtx = new AudioContext();
            const source = audioCtx.createMediaStreamSource(stream);
            const analyser = audioCtx.createAnalyser();
            analyser.fftSize = 256;
            source.connect(analyser);
            analyserRef.current = analyser;

            // MediaRecorder
            const mr = new MediaRecorder(stream, { mimeType: "audio/webm;codecs=opus" });
            chunksRef.current = [];
            mr.ondataavailable = (e) => {
                if (e.data.size > 0) chunksRef.current.push(e.data);
            };
            mr.onstop = async () => {
                // Stop visualisation
                cancelAnimationFrame(animFrameRef.current);
                analyserRef.current = null;

                const blob = new Blob(chunksRef.current, { type: "audio/webm" });
                if (blob.size < 1000) return; // too short

                setTranscribing(true);
                try {
                    const formData = new FormData();
                    formData.append("file", blob, "recording.webm");
                    formData.append("model", "whisper-1");

                    const res = await fetch("https://api.openai.com/v1/audio/transcriptions", {
                        method: "POST",
                        headers: { Authorization: `Bearer ${openaiKey}` },
                        body: formData,
                    });

                    if (!res.ok) {
                        const errorBody = await res.text();
                        console.error("Whisper API error:", errorBody);
                        return;
                    }

                    const data = await res.json();
                    const text = (data.text || "").trim();
                    if (text) onTranscript(text);
                } catch (err) {
                    console.error("Transcription error:", err);
                } finally {
                    setTranscribing(false);
                }
            };

            mediaRecorderRef.current = mr;
            mr.start();
            setRecording(true);
        } catch (err) {
            console.error("Mic access error:", err);
        }
    }, [openaiKey, onTranscript, draw]);

    const stopRecording = useCallback(() => {
        const mr = mediaRecorderRef.current;
        if (mr && mr.state === "recording") {
            mr.stop();
        }
        // Stop mic stream
        streamRef.current?.getTracks().forEach((t) => t.stop());
        streamRef.current = null;
        setRecording(false);
    }, []);

    const toggle = useCallback(() => {
        if (recording) {
            stopRecording();
        } else {
            startRecording();
        }
    }, [recording, startRecording, stopRecording]);

    // Start draw loop once canvas is mounted (recording=true triggers re-render)
    useEffect(() => {
        if (recording && canvasRef.current && analyserRef.current) {
            draw();
        }
        return () => {
            cancelAnimationFrame(animFrameRef.current);
        };
    }, [recording, draw]);

    // Cleanup on unmount
    useEffect(() => {
        return () => {
            cancelAnimationFrame(animFrameRef.current);
            streamRef.current?.getTracks().forEach((t) => t.stop());
        };
    }, []);

    if (!openaiKey) return null;

    return (
        <div className="flex items-center gap-2">
            {recording && (
                <canvas
                    ref={canvasRef}
                    width={80}
                    height={28}
                    className="rounded-[var(--radius-sm)] bg-[var(--bg-elevated)]"
                />
            )}
            <button
                onClick={toggle}
                disabled={transcribing}
                title={recording ? "Stop recording" : transcribing ? "Transcribing..." : "Voice input"}
                className={`flex h-9 w-9 items-center justify-center rounded-full border transition-all ${recording
                    ? "border-[var(--accent-error)] bg-[var(--accent-error)]/20 text-[var(--accent-error)] animate-pulse"
                    : transcribing
                        ? "border-[var(--accent-warning)] bg-[var(--accent-warning)]/10 text-[var(--accent-warning)] cursor-wait"
                        : "border-[var(--border-subtle)] text-[var(--accent-muted)] hover:border-[var(--accent-primary)] hover:text-[var(--accent-primary)]"
                    }`}
            >
                {transcribing ? (
                    <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none">
                        <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2" opacity="0.3" />
                        <path d="M12 2a10 10 0 0 1 10 10" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                    </svg>
                ) : (
                    <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z" />
                        <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
                        <line x1="12" x2="12" y1="19" y2="22" />
                    </svg>
                )}
            </button>
        </div>
    );
}

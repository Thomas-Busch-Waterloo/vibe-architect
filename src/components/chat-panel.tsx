"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import Markdown from "@/components/markdown";
import { useProjectStore } from "@/store/project-store";
import { useSettingsStore } from "@/store/settings-store";
import { streamChat } from "@/lib/llm-client";
import { PHASE_SPEC_PROMPTS } from "@/lib/system-prompt";
import { extractUiPreviews, getLatestUiPreview, hasCompleteUiPreview } from "@/lib/ui-parser";
import { getModelConfig, ConversationPhase } from "@/types";
import MicButton from "./mic-button";

const PHASE_ORDER: ConversationPhase[] = ["vision", "design", "stack", "export"];
const PHASE_LABELS: Record<ConversationPhase, string> = {
    vision: "Vision & Scope",
    design: "Design System",
    stack: "Tech Stack",
    export: "Implementation",
};

export default function ChatPanel() {
    const {
        activeConversationId,
        isStreaming,
        getActiveConversation,
        addMessage,
        appendToLastAssistant,
        setStreaming,
        setSandboxCode,
        setPhase,
        setSpecDoc,
    } = useProjectStore();

    const { activeLLMModel, getKeyForProvider, isConfigured } = useSettingsStore();

    const [input, setInput] = useState("");
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const abortRef = useRef<AbortController | null>(null);
    const textareaRef = useRef<HTMLTextAreaElement>(null);

    const conversation = getActiveConversation();
    const messages = conversation?.messages || [];
    const currentPhase = conversation?.phase || "vision";

    // Auto-scroll on new messages
    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }, [messages]);

    // Auto-resize textarea
    useEffect(() => {
        if (textareaRef.current) {
            textareaRef.current.style.height = "auto";
            textareaRef.current.style.height =
                Math.min(textareaRef.current.scrollHeight, 160) + "px";
        }
    }, [input]);

    // Shared streaming logic
    const startStream = useCallback(
        (text: string, onSpecDone?: (fullResponse: string) => void) => {
            if (!activeConversationId || !isConfigured) return;

            const abortController = new AbortController();
            abortRef.current = abortController;

            let fullResponse = "";

            const config = getModelConfig(activeLLMModel);
            const apiKey = getKeyForProvider(config.provider);

            streamChat({
                messages: [
                    ...messages,
                    { id: "", role: "user", content: text, timestamp: Date.now() },
                ],
                apiKey,
                model: activeLLMModel,
                signal: abortController.signal,
                onChunk: (chunk) => {
                    fullResponse += chunk;
                    appendToLastAssistant(activeConversationId, chunk);

                    if (hasCompleteUiPreview(fullResponse)) {
                        const preview = getLatestUiPreview(fullResponse);
                        if (preview) {
                            setSandboxCode(activeConversationId, preview);
                        }
                    }
                },
                onDone: () => {
                    setStreaming(false);
                    abortRef.current = null;
                    if (onSpecDone) onSpecDone(fullResponse);
                    useProjectStore.getState().persistAll();
                },
                onError: (error) => {
                    appendToLastAssistant(
                        activeConversationId,
                        `\n\n**Error:** ${error.message}`
                    );
                    setStreaming(false);
                    abortRef.current = null;
                },
            });
        },
        [
            activeConversationId,
            isConfigured,
            messages,
            activeLLMModel,
            getKeyForProvider,
            appendToLastAssistant,
            setSandboxCode,
            setStreaming,
        ]
    );

    const handleSend = useCallback(async () => {
        const text = input.trim();
        if (!text || !activeConversationId || !isConfigured || isStreaming) return;

        setInput("");
        await addMessage(activeConversationId, "user", text);
        await addMessage(activeConversationId, "assistant", "");
        setStreaming(true);
        startStream(text);
    }, [input, activeConversationId, isConfigured, isStreaming, addMessage, setStreaming, startStream]);

    const handleVoiceTranscript = useCallback(
        async (transcript: string) => {
            if (!transcript.trim() || !activeConversationId) return;
            setInput(transcript);
            await addMessage(activeConversationId, "user", transcript);
            await addMessage(activeConversationId, "assistant", "");
            setStreaming(true);
            startStream(transcript);
            setInput("");
        },
        [activeConversationId, addMessage, setStreaming, startStream]
    );

    // ── Lock Phase & Generate Spec ──
    const handleLockPhase = useCallback(async () => {
        if (!activeConversationId || isStreaming || !isConfigured) return;

        const phase = currentPhase;
        const nextPhaseIdx = PHASE_ORDER.indexOf(phase) + 1;
        const specPrompt = PHASE_SPEC_PROMPTS[phase];
        if (!specPrompt) return;

        // Send a system-like user message indicating the lock
        await addMessage(
            activeConversationId,
            "user",
            `✅ I'm locking the **${PHASE_LABELS[phase]}** phase. Generate the spec document.`
        );
        await addMessage(activeConversationId, "assistant", "");
        setStreaming(true);

        // Stream the spec generation and save to specDocs on completion
        const config = getModelConfig(activeLLMModel);
        const apiKey = getKeyForProvider(config.provider);

        const abortController = new AbortController();
        abortRef.current = abortController;
        let fullResponse = "";

        streamChat({
            messages: [
                ...messages,
                {
                    id: "",
                    role: "user",
                    content: specPrompt,
                    timestamp: Date.now(),
                },
            ],
            apiKey,
            model: activeLLMModel,
            signal: abortController.signal,
            onChunk: (chunk) => {
                fullResponse += chunk;
                appendToLastAssistant(activeConversationId, chunk);
            },
            onDone: async () => {
                setStreaming(false);
                abortRef.current = null;

                // Save the spec doc
                await setSpecDoc(activeConversationId, phase, fullResponse);

                // Advance to next phase
                if (nextPhaseIdx < PHASE_ORDER.length) {
                    await setPhase(activeConversationId, PHASE_ORDER[nextPhaseIdx]);
                }

                await useProjectStore.getState().persistAll();
            },
            onError: (error) => {
                appendToLastAssistant(
                    activeConversationId,
                    `\n\n**Error:** ${error.message}`
                );
                setStreaming(false);
                abortRef.current = null;
            },
        });
    }, [
        activeConversationId,
        isStreaming,
        isConfigured,
        currentPhase,
        messages,
        activeLLMModel,
        getKeyForProvider,
        addMessage,
        appendToLastAssistant,
        setStreaming,
        setPhase,
        setSpecDoc,
    ]);

    const handleStop = () => {
        abortRef.current?.abort();
    };

    if (!activeConversationId) {
        return (
            <div className="flex h-full flex-col items-center justify-center text-center">
                <div className="mb-4 text-4xl">🏗️</div>
                <h2 className="mb-2 text-lg font-semibold text-[var(--accent-primary)]">
                    Vibe Architect
                </h2>
                <p className="max-w-sm text-sm text-[var(--accent-dim)]">
                    Select a conversation from the sidebar or create a new project to
                    start brainstorming your next app.
                </p>
            </div>
        );
    }

    const isLastPhase = PHASE_ORDER.indexOf(currentPhase) >= PHASE_ORDER.length - 1;
    const hasMessages = messages.length > 0;

    return (
        <div className="flex h-full flex-col">
            {/* Messages */}
            <div className="flex-1 overflow-y-auto overflow-x-hidden px-4 py-4">
                {messages.length === 0 && (
                    <div className="flex h-full flex-col items-center justify-center text-center">
                        <div className="mb-3 text-3xl">💡</div>
                        <p className="text-sm text-[var(--accent-dim)]">
                            Describe your app idea and I&apos;ll architect it for you.
                        </p>
                    </div>
                )}

                {messages.map((msg, i) => {
                    // Detect spec messages: assistant message following a lock message
                    const prevMsg = i > 0 ? messages[i - 1] : null;
                    const isSpecMsg =
                        msg.role === "assistant" &&
                        prevMsg?.role === "user" &&
                        prevMsg.content.includes("I'm locking the");

                    return (
                        <div
                            key={msg.id || i}
                            className={`mb-4 animate-fade-in ${msg.role === "user" ? "flex justify-end" : ""
                                }`}
                        >
                            {msg.role === "user" ? (
                                <div className="max-w-[80%] rounded-[var(--radius-md)] bg-[var(--bg-elevated)] px-4 py-3 text-sm">
                                    {msg.content}
                                </div>
                            ) : (
                                <div className={`min-w-0 max-w-full overflow-x-hidden text-sm text-[var(--accent-muted)] ${isSpecMsg
                                        ? "rounded-[var(--radius-md)] border-l-[3px] border-[var(--accent-primary)] bg-[var(--accent-primary)]/5 px-4 py-3"
                                        : ""
                                    }`}>
                                    {isSpecMsg && (
                                        <div className="mb-2 text-[10px] font-semibold uppercase tracking-widest text-[var(--accent-primary)]/60">
                                            📄 Generated Spec
                                        </div>
                                    )}
                                    <AssistantMessage
                                        content={msg.content}
                                        onPreviewClick={(code) => {
                                            if (activeConversationId) {
                                                setSandboxCode(activeConversationId, code);
                                            }
                                        }}
                                    />
                                    {isStreaming && i === messages.length - 1 && (
                                        <span className="inline-block h-4 w-1.5 animate-pulse bg-[var(--accent-primary)]" />
                                    )}
                                </div>
                            )}
                        </div>
                    );
                })}
                <div ref={messagesEndRef} />
            </div>

            {/* Lock Phase Button */}
            {hasMessages && !isStreaming && !isLastPhase && (
                <div className="border-t border-[var(--border-subtle)] px-4 py-2">
                    <button
                        onClick={handleLockPhase}
                        disabled={!isConfigured}
                        className="w-full flex items-center justify-center gap-2 rounded-[var(--radius-sm)] border border-[var(--accent-success)]/30 bg-[var(--accent-success)]/5 px-4 py-2.5 text-sm font-medium text-[var(--accent-success)] transition-all hover:bg-[var(--accent-success)]/15 hover:border-[var(--accent-success)]/60 disabled:opacity-30 cursor-pointer"
                    >
                        <span>🔒</span>
                        <span>
                            Lock {PHASE_LABELS[currentPhase]} & Generate Spec
                        </span>
                        <span className="text-xs opacity-60">
                            → {PHASE_LABELS[PHASE_ORDER[PHASE_ORDER.indexOf(currentPhase) + 1]]}
                        </span>
                    </button>
                </div>
            )}

            {/* Final export button */}
            {hasMessages && !isStreaming && isLastPhase && !conversation?.specDocs?.export && (
                <div className="border-t border-[var(--border-subtle)] px-4 py-2">
                    <button
                        onClick={handleLockPhase}
                        disabled={!isConfigured}
                        className="w-full flex items-center justify-center gap-2 rounded-[var(--radius-sm)] border border-[var(--accent-primary)]/30 bg-[var(--accent-primary)]/5 px-4 py-2.5 text-sm font-medium text-[var(--accent-primary)] transition-all hover:bg-[var(--accent-primary)]/15 hover:border-[var(--accent-primary)]/60 disabled:opacity-30 cursor-pointer"
                    >
                        <span>📥</span>
                        <span>
                            Generate Final Implementation Plan
                        </span>
                    </button>
                </div>
            )}

            {/* Input */}
            <div className="border-t border-[var(--border-subtle)] px-4 py-3">
                {!isConfigured && (
                    <div className="mb-2 rounded-[var(--radius-sm)] bg-[var(--accent-warning)]/10 px-3 py-2 text-xs text-[var(--accent-warning)]">
                        ⚠️ Add an API key in Settings to start chatting.
                    </div>
                )}
                <div className="flex items-end gap-2">
                    <MicButton onTranscript={handleVoiceTranscript} />
                    <textarea
                        ref={textareaRef}
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        onKeyDown={(e) => {
                            if (e.key === "Enter" && !e.shiftKey) {
                                e.preventDefault();
                                handleSend();
                            }
                        }}
                        placeholder={
                            isConfigured
                                ? "Describe your app idea..."
                                : "Configure API key first"
                        }
                        disabled={!isConfigured}
                        rows={1}
                        className="flex-1 resize-none rounded-[var(--radius-sm)] border border-[var(--border-subtle)] bg-[var(--bg-surface)] px-3 py-2 text-sm text-[var(--accent-primary)] placeholder-[var(--accent-dim)] transition-colors focus:border-[var(--border-focus)] focus:outline-none disabled:opacity-50"
                    />
                    {isStreaming ? (
                        <button
                            onClick={handleStop}
                            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[var(--radius-sm)] bg-[var(--accent-error)] text-white transition-colors hover:bg-[var(--accent-error)]/80"
                        >
                            ■
                        </button>
                    ) : (
                        <button
                            onClick={handleSend}
                            disabled={!input.trim() || !isConfigured}
                            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[var(--radius-sm)] bg-[var(--accent-primary)] text-[var(--bg-base)] transition-colors hover:bg-[var(--accent-muted)] disabled:opacity-30"
                        >
                            ↑
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
}

// ── Helper: Renders assistant message content with clickable preview buttons ──

function AssistantMessage({
    content,
    onPreviewClick,
}: {
    content: string;
    onPreviewClick: (code: string) => void;
}) {
    const previews = extractUiPreviews(content);

    if (previews.length === 0) {
        return (
            <Markdown>
                {content}
            </Markdown>
        );
    }

    const parts = content.split(/<ui_preview>[\s\S]*?<\/ui_preview>/);
    const elements: React.ReactNode[] = [];

    for (let i = 0; i < parts.length; i++) {
        const text = parts[i].trim();
        if (text) {
            elements.push(
                <Markdown key={`text-${i}`}>
                    {text}
                </Markdown>
            );
        }

        if (i < previews.length) {
            const previewCode = previews[i];
            elements.push(
                <button
                    key={`preview-${i}`}
                    onClick={() => onPreviewClick(previewCode)}
                    className="my-2 flex items-center gap-2 rounded-[var(--radius-sm)] border border-[var(--accent-primary)]/30 bg-[var(--accent-primary)]/5 px-3 py-2 text-xs text-[var(--accent-primary)] transition-all hover:bg-[var(--accent-primary)]/15 hover:border-[var(--accent-primary)]/60 cursor-pointer"
                >
                    <span>🎨</span>
                    <span>Show Design Preview {previews.length > 1 ? `#${i + 1}` : ""} in Sandbox →</span>
                </button>
            );
        }
    }

    return <>{elements}</>;
}

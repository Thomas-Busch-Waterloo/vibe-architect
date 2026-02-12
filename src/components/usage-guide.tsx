"use client";

import { useState, useEffect } from "react";

const STORAGE_KEY = "vibe-architect-guide-seen";

export default function UsageGuide() {
    const [visible, setVisible] = useState(false);

    useEffect(() => {
        const seen = localStorage.getItem(STORAGE_KEY);
        if (!seen) setVisible(true);
    }, []);

    if (!visible) return null;

    const dismiss = () => {
        localStorage.setItem(STORAGE_KEY, "1");
        setVisible(false);
    };

    return (
        <div
            className="fixed inset-0 z-[100] flex items-center justify-center"
            onClick={dismiss}
        >
            <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" />

            <div
                className="relative w-full max-w-lg max-h-[85vh] overflow-y-auto animate-fade-in rounded-[var(--radius-md)] border border-[var(--border-subtle)] bg-[var(--bg-surface)] p-6 shadow-2xl"
                onClick={(e) => e.stopPropagation()}
            >
                {/* Header */}
                <div className="mb-5 text-center">
                    <div className="mb-2 text-3xl">🏗️</div>
                    <h2 className="text-xl font-bold text-[var(--accent-primary)]">
                        Welcome to Vibe Architect
                    </h2>
                    <p className="mt-1.5 text-sm text-[var(--accent-muted)]">
                        Your AI-powered project spec generator
                    </p>
                </div>

                {/* How it works */}
                <div className="mb-5">
                    <h3 className="mb-3 text-xs font-semibold uppercase tracking-wider text-[var(--accent-dim)]">
                        How It Works
                    </h3>
                    <div className="space-y-3">
                        {[
                            {
                                step: "1",
                                title: "Describe Your Idea",
                                desc: "Tell the AI about your app concept. It will propose an MVP scope with features to include and cut.",
                                color: "var(--accent-primary)",
                            },
                            {
                                step: "2",
                                title: "Design System",
                                desc: "The AI proposes visual identities with live previews. Pick a vibe or remix them.",
                                color: "var(--accent-success)",
                            },
                            {
                                step: "3",
                                title: "Tech Stack",
                                desc: "Get an opinionated, tailored tech stack recommendation with reasoning.",
                                color: "var(--accent-warning)",
                            },
                            {
                                step: "4",
                                title: "Implementation Spec",
                                desc: "Generate a complete, coding-agent-ready markdown spec for your project.",
                                color: "var(--accent-error)",
                            },
                        ].map((item) => (
                            <div
                                key={item.step}
                                className="flex gap-3 rounded-[var(--radius-sm)] border border-[var(--border-subtle)] bg-[var(--bg-base)] p-3"
                            >
                                <div
                                    className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-bold text-[var(--bg-base)]"
                                    style={{ background: item.color }}
                                >
                                    {item.step}
                                </div>
                                <div>
                                    <p className="text-sm font-medium text-[var(--accent-muted)]">
                                        {item.title}
                                    </p>
                                    <p className="mt-0.5 text-xs text-[var(--accent-dim)] leading-relaxed">
                                        {item.desc}
                                    </p>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Important note */}
                <div className="mb-5 rounded-[var(--radius-sm)] border border-[var(--accent-primary)]/20 bg-[var(--accent-primary)]/5 p-3">
                    <p className="text-xs text-[var(--accent-muted)] leading-relaxed">
                        <strong className="text-[var(--accent-primary)]">You don&apos;t have to complete all 4 steps!</strong>{" "}
                        Stop at any phase when you feel your plan is complete. Each phase is independently useful —
                        even just the Vision &amp; Scope alone makes a great project brief.
                    </p>
                </div>

                {/* Quick tips */}
                <div className="mb-5">
                    <h3 className="mb-2 text-xs font-semibold uppercase tracking-wider text-[var(--accent-dim)]">
                        Quick Tips
                    </h3>
                    <ul className="space-y-1.5 text-xs text-[var(--accent-dim)] leading-relaxed">
                        <li>• Set your API key in <strong className="text-[var(--accent-muted)]">Settings</strong> (gear icon) to get started</li>
                        <li>• Use the <strong className="text-[var(--accent-muted)]">mic button</strong> for voice input (requires OpenAI key)</li>
                        <li>• The <strong className="text-[var(--accent-muted)]">Design tab</strong> shows live previews of your design system</li>
                        <li>• The <strong className="text-[var(--accent-muted)]">Spec tab</strong> collects all your locked specs in one place</li>
                        <li>• Use <strong className="text-[var(--accent-muted)]">Export</strong> to download your specs as markdown files</li>
                    </ul>
                </div>

                {/* CTA */}
                <button
                    onClick={dismiss}
                    className="w-full rounded-[var(--radius-sm)] bg-[var(--accent-primary)] py-2.5 text-sm font-semibold text-[var(--bg-base)] transition-colors hover:brightness-110"
                >
                    Got it, let&apos;s go!
                </button>
            </div>
        </div>
    );
}

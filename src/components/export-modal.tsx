"use client";

import { useState } from "react";
import { useProjectStore } from "@/store/project-store";
import { compileSingleFile, compileMultiFile } from "@/lib/spec-compiler";
import JSZip from "jszip";
import { saveAs } from "file-saver";

interface ExportModalProps {
    isOpen: boolean;
    onClose: () => void;
}

export default function ExportModal({ isOpen, onClose }: ExportModalProps) {
    const { getActiveConversation } = useProjectStore();
    const [exporting, setExporting] = useState(false);

    if (!isOpen) return null;

    const conversation = getActiveConversation();
    if (!conversation) return null;

    const handleSingleFile = async () => {
        setExporting(true);
        try {
            const content = compileSingleFile(conversation);
            const blob = new Blob([content], { type: "text/markdown" });
            saveAs(blob, `${slugify(conversation.title)}-spec.md`);
        } finally {
            setExporting(false);
            onClose();
        }
    };

    const handleMultiFile = async () => {
        setExporting(true);
        try {
            const files = compileMultiFile(conversation);
            const zip = new JSZip();

            const folder = zip.folder(slugify(conversation.title));
            if (folder) {
                Object.entries(files).forEach(([name, content]) => {
                    folder.file(name, content);
                });
            }

            const blob = await zip.generateAsync({ type: "blob" });
            saveAs(blob, `${slugify(conversation.title)}-specs.zip`);
        } finally {
            setExporting(false);
            onClose();
        }
    };

    const messageCount = conversation.messages.length;
    const hasContent = messageCount > 0;

    return (
        <div
            className="fixed inset-0 z-50 flex items-center justify-center"
            onClick={onClose}
        >
            <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />

            <div
                className="relative w-full max-w-sm animate-fade-in rounded-[var(--radius-md)] border border-[var(--border-subtle)] bg-[var(--bg-surface)] p-6"
                onClick={(e) => e.stopPropagation()}
            >
                <div className="mb-4 flex items-center justify-between">
                    <h2 className="text-lg font-semibold">Export Spec</h2>
                    <button
                        onClick={onClose}
                        className="flex h-8 w-8 items-center justify-center rounded-[var(--radius-sm)] text-[var(--accent-muted)] transition-colors hover:bg-[var(--bg-elevated)] hover:text-[var(--accent-primary)]"
                    >
                        ✕
                    </button>
                </div>

                <p className="mb-4 text-sm text-[var(--accent-dim)]">
                    Export your brainstorming session as implementation specs for coding
                    agents.
                </p>

                {!hasContent && (
                    <div className="mb-4 rounded-[var(--radius-sm)] bg-[var(--accent-warning)]/10 px-3 py-2 text-xs text-[var(--accent-warning)]">
                        No conversation content to export yet.
                    </div>
                )}

                <div className="space-y-2">
                    <button
                        onClick={handleSingleFile}
                        disabled={!hasContent || exporting}
                        className="flex w-full items-center gap-3 rounded-[var(--radius-sm)] border border-[var(--border-subtle)] px-4 py-3 text-left transition-colors hover:bg-[var(--bg-elevated)] disabled:opacity-40"
                    >
                        <span className="text-xl">📄</span>
                        <div>
                            <div className="text-sm font-medium">Single Markdown</div>
                            <div className="text-xs text-[var(--accent-dim)]">
                                master-spec.md — All sections in one file
                            </div>
                        </div>
                    </button>

                    <button
                        onClick={handleMultiFile}
                        disabled={!hasContent || exporting}
                        className="flex w-full items-center gap-3 rounded-[var(--radius-sm)] border border-[var(--border-subtle)] px-4 py-3 text-left transition-colors hover:bg-[var(--bg-elevated)] disabled:opacity-40"
                    >
                        <span className="text-xl">📦</span>
                        <div>
                            <div className="text-sm font-medium">Multi-File ZIP</div>
                            <div className="text-xs text-[var(--accent-dim)]">
                                @vision.md, @design.md, @stack.md, @steps.md
                            </div>
                        </div>
                    </button>
                </div>

                <div className="mt-4 text-xs text-[var(--accent-dim)]">
                    {messageCount} messages in conversation
                </div>
            </div>
        </div>
    );
}

function slugify(text: string): string {
    return text
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-|-$/g, "");
}

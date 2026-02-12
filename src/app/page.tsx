"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import { useProjectStore } from "@/store/project-store";
import { useSettingsStore } from "@/store/settings-store";
import { LLM_MODELS } from "@/types";
import Sidebar from "@/components/sidebar";
import ChatPanel from "@/components/chat-panel";
import SandboxPanel from "@/components/sandbox-panel";
import SettingsModal from "@/components/settings-modal";
import ExportModal from "@/components/export-modal";
import UsageGuide from "@/components/usage-guide";

export default function Home() {
  const {
    activeProjectId,
    activeConversationId,
    sidebarOpen,
    setSidebarOpen,
    loadFromDB,
    projects,
    getActiveConversation,
  } = useProjectStore();

  const { loadFromStorage, activeLLMModel } = useSettingsStore();

  const [settingsOpen, setSettingsOpen] = useState(false);
  const [exportOpen, setExportOpen] = useState(false);
  const [loaded, setLoaded] = useState(false);

  // Load persisted state
  useEffect(() => {
    loadFromStorage();
    loadFromDB().then(() => setLoaded(true));
  }, [loadFromStorage, loadFromDB]);

  const conversation = getActiveConversation();
  const activeProject = projects.find((p) => p.id === activeProjectId);

  if (!loaded) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="animate-shimmer h-8 w-32 rounded-[var(--radius-sm)]" />
      </div>
    );
  }

  return (
    <div className="flex h-screen flex-col overflow-hidden">
      {/* Top bar */}
      <header className="flex h-12 shrink-0 items-center justify-between border-b border-[var(--border-subtle)] px-3 sm:px-4">
        <div className="flex items-center gap-2 sm:gap-3 min-w-0">
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-[var(--radius-sm)] text-[var(--accent-dim)] transition-colors hover:bg-[var(--bg-elevated)] hover:text-[var(--accent-primary)]"
            title="Toggle sidebar"
          >
            ☰
          </button>
          <div className="flex items-center gap-2 min-w-0">
            <span className="text-sm font-semibold tracking-tight whitespace-nowrap">
              Vibe Architect
            </span>
            {activeProject && (
              <>
                <span className="hidden sm:inline text-xs text-[var(--accent-dim)]">/</span>
                <span className="hidden sm:inline text-xs text-[var(--accent-muted)] truncate max-w-[120px]">
                  {activeProject.name}
                </span>
              </>
            )}
            {conversation && (
              <>
                <span className="hidden md:inline text-xs text-[var(--accent-dim)]">/</span>
                <span className="hidden md:inline text-xs text-[var(--accent-dim)] truncate max-w-[120px]">
                  {conversation.title}
                </span>
              </>
            )}
          </div>
        </div>

        <div className="flex items-center gap-1">
          {/* Phase indicator - hidden on small screens */}
          {conversation && (
            <div className="mr-2 hidden sm:flex items-center gap-1.5">
              {(["vision", "design", "stack", "export"] as const).map(
                (phase) => (
                  <div
                    key={phase}
                    className={`h-1.5 w-6 rounded-full transition-colors ${conversation.phase === phase
                      ? "bg-[var(--accent-primary)]"
                      : "bg-[var(--border-subtle)]"
                      }`}
                    title={phase.charAt(0).toUpperCase() + phase.slice(1)}
                  />
                )
              )}
            </div>
          )}

          {/* Model badge - hidden on small screens */}
          <div className="mr-2 hidden md:block rounded-[var(--radius-sm)] border border-[var(--border-subtle)] px-2 py-0.5 text-xs text-[var(--accent-dim)]">
            {LLM_MODELS.find((m) => m.id === activeLLMModel)?.name || activeLLMModel}
          </div>

          <button
            onClick={() => setExportOpen(true)}
            disabled={!activeConversationId}
            className="flex h-8 items-center gap-1.5 rounded-[var(--radius-sm)] border border-[var(--border-subtle)] px-2 sm:px-3 text-xs text-[var(--accent-muted)] transition-colors hover:bg-[var(--bg-elevated)] disabled:opacity-30"
          >
            📥 <span className="hidden sm:inline">Export</span>
          </button>
          <button
            onClick={() => setSettingsOpen(true)}
            className="flex h-8 w-8 items-center justify-center rounded-[var(--radius-sm)] text-[var(--accent-dim)] transition-colors hover:bg-[var(--bg-elevated)] hover:text-[var(--accent-primary)]"
            title="Settings"
          >
            ⚙
          </button>
        </div>
      </header>

      {/* Main content */}
      <MainContent />

      {/* Modals */}
      <SettingsModal isOpen={settingsOpen} onClose={() => setSettingsOpen(false)} />
      <ExportModal isOpen={exportOpen} onClose={() => setExportOpen(false)} />
      <UsageGuide />
    </div>
  );
}

// ── Resizable Split Layout ──

function MainContent() {
  const containerRef = useRef<HTMLDivElement>(null);
  const [rightPanelWidth, setRightPanelWidth] = useState(45); // percentage
  const [isDragging, setIsDragging] = useState(false);
  const [mobilePanel, setMobilePanel] = useState<"chat" | "preview">("chat");

  const startDrag = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault();
      setIsDragging(true);

      const handleMouseMove = (moveEvent: MouseEvent) => {
        if (!containerRef.current) return;
        const rect = containerRef.current.getBoundingClientRect();
        const totalWidth = rect.width;
        const mouseX = moveEvent.clientX - rect.left;
        const newRightPct = ((totalWidth - mouseX) / totalWidth) * 100;
        // Clamp between 20% and 75%
        setRightPanelWidth(Math.max(20, Math.min(75, newRightPct)));
      };

      const handleMouseUp = () => {
        setIsDragging(false);
        document.removeEventListener("mousemove", handleMouseMove);
        document.removeEventListener("mouseup", handleMouseUp);
      };

      document.addEventListener("mousemove", handleMouseMove);
      document.addEventListener("mouseup", handleMouseUp);
    },
    []
  );

  return (
    <div ref={containerRef} className="relative flex flex-1 flex-col lg:flex-row overflow-hidden">
      {/* Mobile panel toggle */}
      <div className="flex lg:hidden h-9 shrink-0 border-b border-[var(--border-subtle)]">
        <button
          onClick={() => setMobilePanel("chat")}
          className={`flex-1 text-xs font-medium transition-colors border-b-2 ${mobilePanel === "chat"
            ? "border-[var(--accent-primary)] text-[var(--accent-primary)]"
            : "border-transparent text-[var(--accent-dim)]"
            }`}
        >
          💬 Chat
        </button>
        <button
          onClick={() => setMobilePanel("preview")}
          className={`flex-1 text-xs font-medium transition-colors border-b-2 ${mobilePanel === "preview"
            ? "border-[var(--accent-primary)] text-[var(--accent-primary)]"
            : "border-transparent text-[var(--accent-dim)]"
            }`}
        >
          🎨 Preview
        </button>
      </div>

      {/* Sidebar overlay */}
      <Sidebar />

      {/* Chat panel */}
      <div className={`min-w-0 flex-1 flex-col overflow-hidden ${mobilePanel === "chat" ? "flex" : "hidden lg:flex"
        }`}>
        <ChatPanel />
      </div>

      {/* Drag handle - desktop only */}
      <div
        onMouseDown={startDrag}
        className={`hidden lg:flex w-1.5 shrink-0 cursor-col-resize items-center justify-center transition-colors ${isDragging
          ? "bg-[var(--accent-primary)]"
          : "bg-[var(--border-subtle)] hover:bg-[var(--accent-primary)]/40"
          }`}
      >
        <div className="h-8 w-0.5 rounded-full bg-[var(--accent-dim)]" />
      </div>

      {/* Right panel */}
      <div
        className={`shrink-0 flex-col overflow-hidden ${mobilePanel === "preview" ? "flex flex-1" : "hidden lg:flex"
          }`}
        style={mobilePanel === "preview" ? undefined : { width: `${rightPanelWidth}%` }}
      >
        <SandboxPanel />
      </div>

      {/* Overlay during drag to prevent iframe from swallowing mouse events */}
      {isDragging && (
        <div className="fixed inset-0 z-50 cursor-col-resize" />
      )}
    </div>
  );
}

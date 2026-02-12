"use client";

import { useState } from "react";
import { useProjectStore } from "@/store/project-store";

export default function Sidebar() {
    const {
        projects,
        conversations,
        activeProjectId,
        activeConversationId,
        sidebarOpen,
        setSidebarOpen,
        createProject,
        deleteProject,
        renameProject,
        renameConversation,
        setActiveProject,
        createConversation,
        deleteConversation,
        switchConversation,
    } = useProjectStore();

    const [newProjectName, setNewProjectName] = useState("");
    const [showNewProject, setShowNewProject] = useState(false);
    const [editingId, setEditingId] = useState<string | null>(null);
    const [editName, setEditName] = useState("");
    const [expandedProjects, setExpandedProjects] = useState<Set<string>>(
        new Set()
    );

    if (!sidebarOpen) return null;

    const toggleExpand = (projectId: string) => {
        const next = new Set(expandedProjects);
        if (next.has(projectId)) {
            next.delete(projectId);
        } else {
            next.add(projectId);
        }
        setExpandedProjects(next);
    };

    const handleCreateProject = async () => {
        const name = newProjectName.trim();
        if (!name) return;
        const project = await createProject(name);
        setNewProjectName("");
        setShowNewProject(false);
        setExpandedProjects((prev) => new Set(prev).add(project.id));
    };

    const handleStartRename = (id: string, currentName: string) => {
        setEditingId(id);
        setEditName(currentName);
    };

    const handleFinishRename = async (
        type: "project" | "conversation",
        id: string
    ) => {
        const name = editName.trim();
        if (name) {
            if (type === "project") {
                await renameProject(id, name);
            } else {
                await renameConversation(id, name);
            }
        }
        setEditingId(null);
        setEditName("");
    };

    const sortedProjects = [...projects].sort(
        (a, b) => b.updatedAt - a.updatedAt
    );

    const handleConversationClick = (convId: string) => {
        switchConversation(convId);
        // Close sidebar on mobile after selecting
        if (window.innerWidth < 1024) {
            setSidebarOpen(false);
        }
    };

    return (
        <>
            {/* Backdrop - closes sidebar on tap */}
            <div
                className="fixed inset-0 z-30 bg-black/40 backdrop-blur-sm"
                onClick={() => setSidebarOpen(false)}
            />
            <div className="animate-slide-in-left fixed top-0 left-0 z-40 flex h-[100dvh] w-72 max-w-[85vw] flex-col border-r border-[var(--border-subtle)] bg-[var(--bg-surface)]">
                {/* Header */}
                <div className="flex h-12 items-center justify-between border-b border-[var(--border-subtle)] px-4">
                    <span className="text-sm font-semibold text-[var(--accent-muted)]">
                        Projects
                    </span>
                    <button
                        onClick={() => setSidebarOpen(false)}
                        className="flex h-7 w-7 items-center justify-center rounded-[var(--radius-sm)] text-[var(--accent-dim)] transition-colors hover:bg-[var(--bg-elevated)] hover:text-[var(--accent-primary)]"
                    >
                        ✕
                    </button>
                </div>

                {/* Project list */}
                <div className="flex-1 overflow-y-auto p-2">
                    {sortedProjects.map((project) => {
                        const projectConvs = conversations
                            .filter((c) => c.projectId === project.id)
                            .sort((a, b) => b.updatedAt - a.updatedAt);
                        const isExpanded = expandedProjects.has(project.id);
                        const isActive = activeProjectId === project.id;

                        return (
                            <div key={project.id} className="mb-1">
                                {/* Project row */}
                                <div
                                    className={`group flex items-center gap-1 rounded-[var(--radius-sm)] px-2 py-1.5 text-sm transition-colors cursor-pointer ${isActive
                                        ? "bg-[var(--bg-elevated)] text-[var(--accent-primary)]"
                                        : "text-[var(--accent-muted)] hover:bg-[var(--bg-elevated)]"
                                        }`}
                                    onClick={() => {
                                        setActiveProject(project.id);
                                        toggleExpand(project.id);
                                    }}
                                >
                                    <span className="mr-1 text-xs text-[var(--accent-dim)]">
                                        {isExpanded ? "▾" : "▸"}
                                    </span>

                                    {editingId === project.id ? (
                                        <input
                                            value={editName}
                                            onChange={(e) => setEditName(e.target.value)}
                                            onBlur={() => handleFinishRename("project", project.id)}
                                            onKeyDown={(e) => {
                                                if (e.key === "Enter")
                                                    handleFinishRename("project", project.id);
                                                if (e.key === "Escape") setEditingId(null);
                                            }}
                                            autoFocus
                                            className="flex-1 bg-transparent text-sm outline-none"
                                            onClick={(e) => e.stopPropagation()}
                                        />
                                    ) : (
                                        <span className="flex-1 truncate">{project.name}</span>
                                    )}

                                    {/* Actions */}
                                    <div className="flex gap-0.5 opacity-0 group-hover:opacity-100">
                                        <button
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                createConversation(project.id);
                                                if (!isExpanded) toggleExpand(project.id);
                                            }}
                                            title="New conversation"
                                            className="flex h-5 w-5 items-center justify-center rounded text-xs text-[var(--accent-dim)] hover:bg-[var(--border-subtle)] hover:text-[var(--accent-primary)]"
                                        >
                                            +
                                        </button>
                                        <button
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                handleStartRename(project.id, project.name);
                                            }}
                                            title="Rename"
                                            className="flex h-5 w-5 items-center justify-center rounded text-xs text-[var(--accent-dim)] hover:bg-[var(--border-subtle)] hover:text-[var(--accent-primary)]"
                                        >
                                            ✎
                                        </button>
                                        <button
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                if (confirm("Delete this project and all conversations?"))
                                                    deleteProject(project.id);
                                            }}
                                            title="Delete"
                                            className="flex h-5 w-5 items-center justify-center rounded text-xs text-[var(--accent-dim)] hover:bg-[var(--accent-error)]/20 hover:text-[var(--accent-error)]"
                                        >
                                            ✕
                                        </button>
                                    </div>
                                </div>

                                {/* Conversations */}
                                {isExpanded && (
                                    <div className="ml-4 mt-0.5">
                                        {projectConvs.length === 0 && (
                                            <div className="px-2 py-1 text-xs text-[var(--accent-dim)] italic">
                                                No conversations yet
                                            </div>
                                        )}
                                        {projectConvs.map((conv) => (
                                            <div
                                                key={conv.id}
                                                className={`group flex items-center gap-1 rounded-[var(--radius-sm)] px-2 py-1 text-sm transition-colors cursor-pointer ${activeConversationId === conv.id
                                                    ? "bg-[var(--bg-base)] text-[var(--accent-primary)]"
                                                    : "text-[var(--accent-dim)] hover:text-[var(--accent-muted)] hover:bg-[var(--bg-elevated)]"
                                                    }`}
                                                onClick={() => handleConversationClick(conv.id)}
                                            >
                                                <span className="mr-1 text-xs">💬</span>
                                                {editingId === conv.id ? (
                                                    <input
                                                        value={editName}
                                                        onChange={(e) => setEditName(e.target.value)}
                                                        onBlur={() => handleFinishRename("conversation", conv.id)}
                                                        onKeyDown={(e) => {
                                                            if (e.key === "Enter")
                                                                handleFinishRename("conversation", conv.id);
                                                            if (e.key === "Escape") setEditingId(null);
                                                        }}
                                                        autoFocus
                                                        className="flex-1 bg-transparent text-xs outline-none"
                                                        onClick={(e) => e.stopPropagation()}
                                                    />
                                                ) : (
                                                    <span className="flex-1 truncate text-xs">
                                                        {conv.title}
                                                    </span>
                                                )}
                                                <div className="flex gap-0.5 opacity-0 group-hover:opacity-100">
                                                    <button
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            handleStartRename(conv.id, conv.title);
                                                        }}
                                                        title="Rename"
                                                        className="flex h-4 w-4 items-center justify-center rounded text-xs text-[var(--accent-dim)] hover:text-[var(--accent-primary)]"
                                                    >
                                                        ✎
                                                    </button>
                                                    <button
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            if (confirm("Delete this conversation?"))
                                                                deleteConversation(conv.id);
                                                        }}
                                                        title="Delete"
                                                        className="flex h-4 w-4 items-center justify-center rounded text-xs text-[var(--accent-dim)] hover:text-[var(--accent-error)]"
                                                    >
                                                        ✕
                                                    </button>
                                                </div>
                                            </div>
                                        ))}
                                        <button
                                            onClick={() => createConversation(project.id)}
                                            className="mt-0.5 flex w-full items-center gap-1 rounded-[var(--radius-sm)] px-2 py-1 text-xs text-[var(--accent-dim)] transition-colors hover:bg-[var(--bg-elevated)] hover:text-[var(--accent-muted)]"
                                        >
                                            <span>+</span> New conversation
                                        </button>
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </div>

                {/* New project input */}
                <div className="border-t border-[var(--border-subtle)] p-3">
                    {showNewProject ? (
                        <div className="flex gap-2">
                            <input
                                value={newProjectName}
                                onChange={(e) => setNewProjectName(e.target.value)}
                                onKeyDown={(e) => {
                                    if (e.key === "Enter") handleCreateProject();
                                    if (e.key === "Escape") setShowNewProject(false);
                                }}
                                placeholder="Project name..."
                                autoFocus
                                className="flex-1 rounded-[var(--radius-sm)] border border-[var(--border-subtle)] bg-[var(--bg-base)] px-2 py-1.5 text-sm text-[var(--accent-primary)] placeholder-[var(--accent-dim)] focus:border-[var(--border-focus)] focus:outline-none"
                            />
                            <button
                                onClick={handleCreateProject}
                                className="rounded-[var(--radius-sm)] bg-[var(--accent-primary)] px-3 py-1.5 text-xs font-medium text-[var(--bg-base)]"
                            >
                                Create
                            </button>
                        </div>
                    ) : (
                        <button
                            onClick={() => setShowNewProject(true)}
                            className="flex w-full items-center justify-center gap-2 rounded-[var(--radius-sm)] border border-dashed border-[var(--border-subtle)] py-2 text-sm text-[var(--accent-dim)] transition-colors hover:border-[var(--border-focus)] hover:text-[var(--accent-muted)]"
                        >
                            <span>+</span> New Project
                        </button>
                    )}
                </div>
            </div>
        </>
    );
}

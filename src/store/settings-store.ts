import { create } from "zustand";
import { LLMModel } from "@/types";

type KeyProvider = "openai" | "gemini" | "anthropic";

interface SettingsState {
    // API Keys
    openaiKey: string;
    geminiKey: string;
    anthropicKey: string;

    // Model selection
    activeLLMModel: LLMModel;

    // Derived
    isConfigured: boolean;

    // Actions
    setKey: (provider: KeyProvider, value: string) => void;
    setLLMModel: (model: LLMModel) => void;
    clearKeys: () => void;
    loadFromStorage: () => void;

    // Helpers
    getKeyForProvider: (provider: "openai" | "gemini" | "anthropic") => string;
    hasKeyForModel: (model: LLMModel) => boolean;
}

const STORAGE_KEY = "vibe-architect-settings";

function computeIsConfigured(state: {
    openaiKey: string;
    geminiKey: string;
    anthropicKey: string;
}): boolean {
    return (
        state.openaiKey.length > 0 ||
        state.geminiKey.length > 0 ||
        state.anthropicKey.length > 0
    );
}

export const useSettingsStore = create<SettingsState>((set, get) => ({
    openaiKey: "",
    geminiKey: "",
    anthropicKey: "",
    activeLLMModel: "gpt-5.2-high",
    isConfigured: false,

    setKey: (provider, value) => {
        const keyMap: Record<KeyProvider, string> = {
            openai: "openaiKey",
            gemini: "geminiKey",
            anthropic: "anthropicKey",
        };
        const update = { [keyMap[provider]]: value };
        const state = { ...get(), ...update };
        set({ ...update, isConfigured: computeIsConfigured(state as typeof state & { openaiKey: string; geminiKey: string; anthropicKey: string }) });
        persistSettings({ ...get(), ...update });
    },

    setLLMModel: (model) => {
        set({ activeLLMModel: model });
        persistSettings({ ...get(), activeLLMModel: model });
    },

    clearKeys: () => {
        set({
            openaiKey: "",
            geminiKey: "",
            anthropicKey: "",
            isConfigured: false,
        });
        localStorage.removeItem(STORAGE_KEY);
    },

    loadFromStorage: () => {
        try {
            const stored = localStorage.getItem(STORAGE_KEY);
            if (stored) {
                const p = JSON.parse(stored);
                const state = {
                    openaiKey: p.openaiKey || "",
                    geminiKey: p.geminiKey || "",
                    anthropicKey: p.anthropicKey || "",
                    activeLLMModel: p.activeLLMModel || "gpt-5.2-high",
                };
                set({
                    ...state,
                    isConfigured: computeIsConfigured(state),
                });
            }
        } catch {
            // ignore corrupted storage
        }
    },

    getKeyForProvider: (provider) => {
        const s = get();
        return provider === "openai"
            ? s.openaiKey
            : provider === "gemini"
                ? s.geminiKey
                : s.anthropicKey;
    },

    hasKeyForModel: (model) => {
        const s = get();
        if (model.startsWith("gpt-")) return s.openaiKey.length > 0;
        if (model.startsWith("gemini")) return s.geminiKey.length > 0;
        if (model.startsWith("claude")) return s.anthropicKey.length > 0;
        return false;
    },
}));

function persistSettings(state: Record<string, unknown>) {
    try {
        localStorage.setItem(
            STORAGE_KEY,
            JSON.stringify({
                openaiKey: state.openaiKey,
                geminiKey: state.geminiKey,
                anthropicKey: state.anthropicKey,
                activeLLMModel: state.activeLLMModel,
            })
        );
    } catch {
        // storage full or unavailable
    }
}

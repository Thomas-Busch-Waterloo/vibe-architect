"use client";

import { useMemo } from "react";
import { marked } from "marked";

// Configure marked for GFM
marked.setOptions({
    gfm: true,
    breaks: true,
});

/**
 * Strip outer code fences that wrap the entire content.
 * AI models often wrap markdown output in ```markdown ... ``` fences,
 * which causes `marked` to render it as a <pre><code> block instead
 * of as rendered HTML.
 */
function stripOuterCodeFence(text: string): string {
    const trimmed = text.trim();
    // Match ```markdown or ```md or just ``` at the start, and ``` at the end
    const match = trimmed.match(
        /^```(?:markdown|md)?\s*\n([\s\S]*?)\n\s*```\s*$/
    );
    if (match) {
        return match[1];
    }
    return trimmed;
}

export default function Markdown({ children }: { children: string }) {
    const html = useMemo(() => {
        if (!children) return "";
        const cleaned = stripOuterCodeFence(children);
        return marked.parse(cleaned) as string;
    }, [children]);

    return (
        <div
            className="markdown-body"
            dangerouslySetInnerHTML={{ __html: html }}
        />
    );
}

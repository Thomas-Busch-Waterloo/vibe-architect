/**
 * Parses AI responses for <ui_preview>...</ui_preview> blocks
 * and extracts the React/JSX code for rendering in the sandbox iframe.
 */

export function extractUiPreviews(content: string): string[] {
    const matches: string[] = [];
    // Use matchAll to avoid global regex lastIndex state bugs
    const regex = /<ui_preview>([\s\S]*?)<\/ui_preview>/g;

    for (const match of content.matchAll(regex)) {
        const code = match[1].trim();
        if (code) {
            matches.push(code);
        }
    }

    return matches;
}

export function getLatestUiPreview(content: string): string | null {
    const previews = extractUiPreviews(content);
    return previews.length > 0 ? previews[previews.length - 1] : null;
}

/**
 * Checks if a streaming message contains a complete ui_preview block.
 * Returns true once the closing tag is found.
 */
export function hasCompleteUiPreview(content: string): boolean {
    return /<ui_preview>[\s\S]*?<\/ui_preview>/.test(content);
}

/**
 * Removes <ui_preview> blocks from displayed message content
 * to avoid showing raw code in the chat.
 */
export function stripUiPreviews(content: string): string {
    return content
        .replace(/<ui_preview>[\s\S]*?<\/ui_preview>/g, "[🎨 Design preview rendered in sandbox →]")
        .trim();
}

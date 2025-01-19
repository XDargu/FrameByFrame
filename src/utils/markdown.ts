type Token = { type: string; content: string };

const urlRegex = /(https?:\/\/(?:www\.|(?!www))[a-zA-Z0-9][a-zA-Z0-9-]+[a-zA-Z0-9]\.[^\s]{2,}|www\.[a-zA-Z0-9][a-zA-Z0-9-]+[a-zA-Z0-9]\.[^\s]{2,}|https?:\/\/(?:www\.|(?!www))[a-zA-Z0-9]+\.[^\s]{2,}|www\.[a-zA-Z0-9]+\.[^\s]{2,})/gi;

/**
 * Tokenize the input Markdown string into a series of tokens.
 * @param markdown The raw Markdown string.
 * @returns An array of tokens.
 */
function tokenize(markdown: string): Token[] {
    const tokens: Token[] = [];
    const lines = markdown.split("\n");

    let inCodeBlock = false;

    for (const line of lines) {
        // Code Block Start/End
        if (/^```/.test(line)) {
            if (inCodeBlock) {
                tokens.push({ type: "code-block-end", content: "" });
                inCodeBlock = false;
            } else {
                tokens.push({ type: "code-block-start", content: "" });
                inCodeBlock = true;
            }
            continue;
        }

        if (inCodeBlock) {
            tokens.push({ type: "code-block-content", content: line });
            continue;
        }

        // Heading
        if (/^#{1,6}\s/.test(line)) {
            const level = line.match(/^#+/)![0].length;
            tokens.push({ type: `heading-${level}`, content: line.replace(/^#{1,6}\s/, "") });
            continue;
        }

        // Unordered List
        if (/^\*\s/.test(line)) {
            tokens.push({ type: "unordered-list-item", content: line.replace(/^\*\s/, "") });
            continue;
        }

        // Ordered List
        if (/^\d+\.\s/.test(line)) {
            tokens.push({ type: "ordered-list-item", content: line.replace(/^\d+\.\s/, "") });
            continue;
        }

        // Bold
        if (/\*\*.*?\*\*/.test(line)) {
            tokens.push({ type: "bold", content: line });
            continue;
        }

        // Italic
        if (/\*.*?\*/.test(line)) {
            tokens.push({ type: "italic", content: line });
            continue;
        }

        // Link
        if (/\[.*?\]\(.*?\)/.test(line)) {
            tokens.push({ type: "link", content: line });
            continue;
        }

        // Paragraph
        if (line.trim() === "") {
            tokens.push({ type: "blank-line", content: "" });
        } else {
            if (urlRegex.test(line))
                tokens.push({ type: "paragraph-link", content: line });
            else
                tokens.push({ type: "paragraph", content: line });
        }
    }

    return tokens;
}

/**
 * Convert tokens to HTML.
 * @param tokens The array of tokens.
 * @returns The HTML string.
 */
function tokensToHtml(tokens: Token[]): string {
    let html = "";
    let inUnorderedList = false;
    let inOrderedList = false;
    let inCodeBlock = false;

    for (const token of tokens) {
        if (inUnorderedList && token.type != "unordered-list-item")
        {
            html += "</ul>";
            inUnorderedList = false;
        }
        if (inOrderedList && token.type != "ordered-list-item")
        {
            html += "</ol>";
            inUnorderedList = false;
        }
        switch (token.type) {
            case "heading-1":
            case "heading-2":
            case "heading-3":
            case "heading-4":
            case "heading-5":
            case "heading-6": {
                const level = token.type.split("-")[1];
                html += `<h${level}>${token.content}</h${level}>`;
                break;
            }
            case "unordered-list-item": {
                if (!inUnorderedList) {
                    html += "<ul>";
                    inUnorderedList = true;
                }
                html += `<li>${token.content}</li>`;
                break;
            }
            case "ordered-list-item": {
                if (!inOrderedList) {
                    html += "<ol>";
                    inOrderedList = true;
                }
                html += `<li>${token.content}</li>`;
                break;
            }
            case "bold": {
                html += token.content.replace(/\*\*(.*?)\*\*/g, "<b>$1</b>");
                break;
            }
            case "italic": {
                html += token.content.replace(/\*(.*?)\*/g, "<em>$1</em>");
                break;
            }
            case "code-block-start": {
                html += "<pre><code>";
                inCodeBlock = true;
                break;
            }
            case "code-block-end": {
                html += "</code></pre>";
                inCodeBlock = false;
                break;
            }
            case "code-block-content": {
                if (inCodeBlock) {
                    html += `${token.content}\n`;
                }
                break;
            }
            case "link": {
                html += token.content.replace(/\[(.*?)\]\((.*?)\)/g, '<a href="$2">$1</a>');
                break;
            }
            case "paragraph": {
                if (!inUnorderedList && !inOrderedList && !inCodeBlock) {
                    html += `<p>${token.content}</p>`;
                }
                break;
            }
            case "paragraph-link": {
                if (!inUnorderedList && !inOrderedList && !inCodeBlock) {
                    html += `<a href="${token.content}">${token.content}</a>`;
                }
                break;
            }
            case "blank-line": {
                if (inUnorderedList) {
                    html += "</ul>";
                    inUnorderedList = false;
                }
                if (inOrderedList) {
                    html += "</ol>";
                    inOrderedList = false;
                }
                html += "<br>";
                break;
            }
        }
    }

    if (inUnorderedList) html += "</ul>";
    if (inOrderedList) html += "</ol>";
    if (inCodeBlock) html += "</code></pre>";

    return html;
}

/**
 * Convert a Markdown string to HTML.
 * @param markdown The raw Markdown string.
 * @returns The HTML string.
 */
export function markdownToHtml(markdown: string): string {
    const tokens = tokenize(markdown);
    console.log(tokens);
    return tokensToHtml(tokens);
}
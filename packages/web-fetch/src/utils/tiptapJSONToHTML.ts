type Mark = {
    type: string;
    attrs?: Record<string, any>;
};

type TiptapNode = {
    type: string;
    text?: string;
    attrs?: Record<string, any>;
    content?: TiptapNode[];
    marks?: Mark[];
};

function escapeHtml(text: string): string {
    return text
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}

function applyMarks(html: string, marks: Mark[]): string {
    return marks.reduce((acc, mark) => {
        switch (mark.type) {
            case 'bold':
                return `<strong>${acc}</strong>`;
            case 'italic':
                return `<em>${acc}</em>`;
            case 'strike':
                return `<s>${acc}</s>`;
            case 'underline':
                return `<u>${acc}</u>`;
            case 'code':
                return `<code>${acc}</code>`;
            case 'link': {
                const href = mark.attrs?.href ? ` href="${escapeHtml(mark.attrs.href)}"` : '';
                const title = mark.attrs?.title ? ` title="${escapeHtml(mark.attrs.title)}"` : '';
                return `<a${href}${title}>${acc}</a>`;
            }
            case 'textStyle': {
                const style = mark.attrs?.color ? ` style="color:${escapeHtml(mark.attrs.color)}"` : '';
                return style ? `<span${style}>${acc}</span>` : acc;
            }
            default:
                return acc;
        }
    }, html);
}

function renderNodes(nodes: TiptapNode[] | undefined): string {
    if (!nodes) return '';
    return nodes.map(renderNode).join('');
}

function renderNode(node: TiptapNode): string {
    switch (node.type) {
        case 'doc':
            return renderNodes(node.content);

        case 'paragraph': {
            const inner = renderNodes(node.content);
            return `<p>${inner || '<br>'}</p>`;
        }

        case 'heading': {
            const level = node.attrs?.level ?? 1;
            return `<h${level}>${renderNodes(node.content)}</h${level}>`;
        }

        case 'blockquote':
            return `<blockquote>${renderNodes(node.content)}</blockquote>`;

        case 'bulletList':
            return `<ul>${renderNodes(node.content)}</ul>`;

        case 'orderedList': {
            const start = node.attrs?.start ? ` start="${node.attrs.start}"` : '';
            return `<ol${start}>${renderNodes(node.content)}</ol>`;
        }

        case 'listItem':
            return `<li>${renderNodes(node.content)}</li>`;

        case 'codeBlock': {
            const lang = node.attrs?.language ? ` class="language-${escapeHtml(node.attrs.language)}"` : '';
            return `<pre><code${lang}>${renderNodes(node.content)}</code></pre>`;
        }

        case 'hardBreak':
            return '<br>';

        case 'horizontalRule':
            return '<hr>';

        case 'image': {
            const src = node.attrs?.src ? ` src="${escapeHtml(node.attrs.src)}"` : '';
            const alt = node.attrs?.alt ? ` alt="${escapeHtml(node.attrs.alt)}"` : '';
            const title = node.attrs?.title ? ` title="${escapeHtml(node.attrs.title)}"` : '';
            return `<img${src}${alt}${title}>`;
        }

        case 'text': {
            const escaped = escapeHtml(node.text ?? '');
            if (node.marks && node.marks.length > 0) {
                return applyMarks(escaped, node.marks);
            }
            return escaped;
        }

        case 'table':
            return `<table>${renderNodes(node.content)}</table>`;

        case 'tableRow':
            return `<tr>${renderNodes(node.content)}</tr>`;

        case 'tableHeader':
            return `<th>${renderNodes(node.content)}</th>`;

        case 'tableCell':
            return `<td>${renderNodes(node.content)}</td>`;

        default:
            // 未知节点类型，尝试渲染子节点
            return renderNodes(node.content);
    }
}

export function tiptapJSONToHTML(json: TiptapNode): string {
    return renderNode(json);
}

import React, { useState } from 'react';
import { Copy, Check } from 'lucide-react';

interface MarkdownRendererProps {
  content: string;
  className?: string;
}

function renderInline(text: string): React.ReactNode {
  // Regex to match inline elements: code, bold, italic, links
  // 1: `code`
  // 2: **bold** or __bold__
  // 3: *italic* or _italic_
  // 4: [text](url)
  const regex = /(`[^`]+`|\*\*[^*]+\*\*|__[^_]+__|(?<!\*)\*[^*]+?\*(?!\*)|(?<!_)_[^_]+?_(?!_)|\[[^\]]+\]\([^)]+\))/g;
  const parts = text.split(regex);

  return parts.map((part, index) => {
    if (!part) return null;

    // Inline Code
    if (part.startsWith('`') && part.endsWith('`') && part.length >= 2) {
      return (
        <code
          key={index}
          className="px-1.5 py-0.5 mx-0.5 rounded text-[11px] font-mono bg-base/90 border border-border-subtle text-accent-sapphire font-semibold"
        >
          {part.slice(1, -1)}
        </code>
      );
    }

    // Bold (**text** or __text__)
    if (
      (part.startsWith('**') && part.endsWith('**') && part.length >= 4) ||
      (part.startsWith('__') && part.endsWith('__') && part.length >= 4)
    ) {
      return (
        <strong key={index} className="font-bold text-text-primary">
          {part.slice(2, -2)}
        </strong>
      );
    }

    // Italic (*text* or _text_)
    if (
      (part.startsWith('*') && part.endsWith('*') && part.length >= 2) ||
      (part.startsWith('_') && part.endsWith('_') && part.length >= 2)
    ) {
      return (
        <em key={index} className="italic text-text-muted">
          {part.slice(1, -1)}
        </em>
      );
    }

    // Links [text](url)
    const linkMatch = part.match(/^\[([^\]]+)\]\(([^)]+)\)$/);
    if (linkMatch) {
      return (
        <a
          key={index}
          href={linkMatch[2]}
          target="_blank"
          rel="noopener noreferrer"
          className="text-accent-sapphire hover:underline font-medium inline-flex items-center gap-0.5"
        >
          {linkMatch[1]}
        </a>
      );
    }

    return <span key={index}>{part}</span>;
  });
}

function CodeBlock({ code, language }: { code: string; language: string }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="my-2 rounded-lg border border-border-subtle bg-base/95 overflow-hidden font-mono text-[11px]">
      <div className="flex items-center justify-between px-3 py-1.5 bg-surface-elevated/70 border-b border-border-subtle text-text-muted text-[10px] uppercase font-bold tracking-wider">
        <span>{language || 'CODE'}</span>
        <button
          type="button"
          onClick={handleCopy}
          className="flex items-center gap-1 hover:text-text-primary transition-colors cursor-pointer px-1 py-0.5 rounded"
          title="Copy code"
        >
          {copied ? (
            <>
              <Check className="h-3 w-3 text-status-merged" />
              <span className="text-status-merged">COPIED</span>
            </>
          ) : (
            <>
              <Copy className="h-3 w-3" />
              <span>COPY</span>
            </>
          )}
        </button>
      </div>
      <pre className="p-3 overflow-x-auto text-text-primary font-mono leading-relaxed select-text whitespace-pre">
        <code>{code}</code>
      </pre>
    </div>
  );
}

export const MarkdownRenderer: React.FC<MarkdownRendererProps> = ({ content, className = '' }) => {
  if (!content) return null;

  const lines = content.split('\n');
  const blocks: React.ReactNode[] = [];
  let inCodeBlock = false;
  let codeBlockLines: string[] = [];
  let codeBlockLang = '';

  let listType: 'ul' | 'ol' | null = null;
  let listItems: React.ReactNode[] = [];

  const flushList = () => {
    if (listType && listItems.length > 0) {
      if (listType === 'ul') {
        blocks.push(
          <ul key={`list_${blocks.length}`} className="my-1.5 space-y-1 pl-1">
            {listItems}
          </ul>
        );
      } else {
        blocks.push(
          <ol key={`list_${blocks.length}`} className="my-1.5 space-y-1 pl-1">
            {listItems}
          </ol>
        );
      }
      listType = null;
      listItems = [];
    }
  };

  for (let i = 0; i < lines.length; i++) {
    const rawLine = lines[i];
    const trimmed = rawLine.trim();

    // Check code block fence
    if (trimmed.startsWith('```')) {
      if (inCodeBlock) {
        // End code block
        blocks.push(
          <CodeBlock
            key={`code_${blocks.length}`}
            code={codeBlockLines.join('\n')}
            language={codeBlockLang}
          />
        );
        inCodeBlock = false;
        codeBlockLines = [];
        codeBlockLang = '';
      } else {
        // Start code block
        flushList();
        inCodeBlock = true;
        codeBlockLang = trimmed.slice(3).trim();
      }
      continue;
    }

    if (inCodeBlock) {
      codeBlockLines.push(rawLine);
      continue;
    }

    // Empty lines flush active lists
    if (!trimmed) {
      flushList();
      continue;
    }

    // Headings
    if (trimmed.startsWith('### ')) {
      flushList();
      blocks.push(
        <h4
          key={`h4_${blocks.length}`}
          className="text-xs font-bold text-text-primary tracking-wide mt-2.5 mb-1 flex items-center gap-1.5"
        >
          <span className="text-accent-sapphire font-mono text-[10px]">#</span>
          {renderInline(trimmed.slice(4))}
        </h4>
      );
      continue;
    }

    if (trimmed.startsWith('## ')) {
      flushList();
      blocks.push(
        <h3
          key={`h3_${blocks.length}`}
          className="text-sm font-bold text-text-primary tracking-wide mt-3 mb-1.5 flex items-center gap-1.5 border-b border-border-subtle/50 pb-1"
        >
          <span className="text-accent-sapphire font-mono text-xs">##</span>
          {renderInline(trimmed.slice(3))}
        </h3>
      );
      continue;
    }

    if (trimmed.startsWith('# ')) {
      flushList();
      blocks.push(
        <h2
          key={`h2_${blocks.length}`}
          className="text-base font-bold text-text-primary tracking-wide mt-3 mb-1.5 flex items-center gap-2 border-b border-border-subtle pb-1"
        >
          <span className="text-accent-sapphire font-mono text-sm">#</span>
          {renderInline(trimmed.slice(2))}
        </h2>
      );
      continue;
    }

    // Blockquotes
    if (trimmed.startsWith('> ')) {
      flushList();
      blocks.push(
        <blockquote
          key={`quote_${blocks.length}`}
          className="my-1.5 pl-3 border-l-2 border-accent-sapphire/60 text-text-muted italic bg-surface-elevated/30 py-1 rounded-r-md text-xs"
        >
          {renderInline(trimmed.slice(2))}
        </blockquote>
      );
      continue;
    }

    // Unordered Lists (* or -)
    const bulletMatch = trimmed.match(/^(\*|-)\s+(.*)$/);
    if (bulletMatch) {
      if (listType !== 'ul') {
        flushList();
        listType = 'ul';
      }
      listItems.push(
        <li key={`li_${listItems.length}`} className="flex items-start gap-2 leading-relaxed">
          <span className="text-accent-sapphire select-none mt-0.5 text-xs font-bold leading-none shrink-0">
            •
          </span>
          <span className="flex-1">{renderInline(bulletMatch[2])}</span>
        </li>
      );
      continue;
    }

    // Ordered Lists (1., 2., etc.)
    const orderedMatch = trimmed.match(/^(\d+)\.\s+(.*)$/);
    if (orderedMatch) {
      if (listType !== 'ol') {
        flushList();
        listType = 'ol';
      }
      listItems.push(
        <li key={`li_${listItems.length}`} className="flex items-start gap-2 leading-relaxed">
          <span className="text-accent-sapphire font-mono text-[10px] font-bold select-none shrink-0 mt-0.5 bg-accent-sapphire/15 px-1 py-0.2 rounded">
            {orderedMatch[1]}
          </span>
          <span className="flex-1">{renderInline(orderedMatch[2])}</span>
        </li>
      );
      continue;
    }

    // Standard paragraph
    flushList();
    blocks.push(
      <p key={`p_${blocks.length}`} className="leading-relaxed my-1 select-text">
        {renderInline(trimmed)}
      </p>
    );
  }

  // Flush remaining items
  if (inCodeBlock && codeBlockLines.length > 0) {
    blocks.push(
      <CodeBlock
        key={`code_${blocks.length}`}
        code={codeBlockLines.join('\n')}
        language={codeBlockLang}
      />
    );
  }
  flushList();

  return <div className={`space-y-1 text-xs select-text ${className}`}>{blocks}</div>;
};

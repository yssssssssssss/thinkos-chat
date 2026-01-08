/**
 * 轻量级 Markdown 渲染组件（浅色主题）
 * 用于 Chat 界面的文本响应渲染
 */
import React, { useMemo, useState } from 'react';
import { Copy, Check } from 'lucide-react';

type InlineToken =
  | { type: 'text'; value: string }
  | { type: 'code'; value: string }
  | { type: 'strong'; children: InlineToken[] }
  | { type: 'em'; children: InlineToken[] }
  | { type: 'link'; label: InlineToken[]; href: string };

type BlockToken =
  | { type: 'heading'; level: 1 | 2 | 3 | 4 | 5 | 6; content: InlineToken[] }
  | { type: 'paragraph'; content: InlineToken[] }
  | { type: 'code'; lang?: string; content: string }
  | { type: 'ul'; items: InlineToken[][] }
  | { type: 'ol'; items: InlineToken[][] }
  | { type: 'blockquote'; content: InlineToken[] }
  | { type: 'hr' };

const isSafeHref = (href: string): boolean => {
  const trimmed = (href || '').trim();
  if (!trimmed) return false;
  if (trimmed.startsWith('http://') || trimmed.startsWith('https://')) return true;
  if (trimmed.startsWith('mailto:')) return true;
  return false;
};

const parseInline = (input: string): InlineToken[] => {
  const s = input || '';
  const tokens: InlineToken[] = [];
  let i = 0;

  const pushText = (value: string) => {
    if (!value) return;
    tokens.push({ type: 'text', value });
  };

  const findNext = (needle: string, from: number): number => s.indexOf(needle, from);

  while (i < s.length) {
    if (s[i] === '`') {
      const end = findNext('`', i + 1);
      if (end > i + 1) {
        tokens.push({ type: 'code', value: s.slice(i + 1, end) });
        i = end + 1;
        continue;
      }
    }

    if (s[i] === '[') {
      const closeLabel = findNext(']', i + 1);
      const openHref = closeLabel >= 0 ? s[closeLabel + 1] : '';
      if (closeLabel >= 0 && openHref === '(') {
        const closeHref = findNext(')', closeLabel + 2);
        if (closeHref >= 0) {
          const labelRaw = s.slice(i + 1, closeLabel);
          const href = s.slice(closeLabel + 2, closeHref).trim();
          tokens.push({ type: 'link', label: parseInline(labelRaw), href });
          i = closeHref + 1;
          continue;
        }
      }
    }

    if (s.startsWith('**', i)) {
      const end = findNext('**', i + 2);
      if (end > i + 2) {
        tokens.push({ type: 'strong', children: parseInline(s.slice(i + 2, end)) });
        i = end + 2;
        continue;
      }
    }

    if (s[i] === '*') {
      const end = findNext('*', i + 1);
      if (end > i + 1) {
        tokens.push({ type: 'em', children: parseInline(s.slice(i + 1, end)) });
        i = end + 1;
        continue;
      }
    }

    const nextSpecialCandidates = [
      findNext('`', i),
      findNext('[', i),
      findNext('**', i),
      findNext('*', i),
    ].filter((n) => n >= 0);

    const nextSpecial = nextSpecialCandidates.length ? Math.min(...nextSpecialCandidates) : -1;
    if (nextSpecial === -1 || nextSpecial === i) {
      pushText(s[i]);
      i += 1;
      continue;
    }

    pushText(s.slice(i, nextSpecial));
    i = nextSpecial;
  }

  return tokens;
};

const tokenize = (markdown: string): BlockToken[] => {
  const lines = (markdown || '').replace(/\r\n/g, '\n').split('\n');
  const blocks: BlockToken[] = [];
  let i = 0;

  while (i < lines.length) {
    const line = lines[i];

    if (!line.trim()) {
      i += 1;
      continue;
    }

    const fence = line.match(/^```(\w+)?\s*$/);
    if (fence) {
      const lang = fence[1];
      i += 1;
      const codeLines: string[] = [];
      while (i < lines.length && !lines[i].match(/^```\s*$/)) {
        codeLines.push(lines[i]);
        i += 1;
      }
      if (i < lines.length) i += 1;
      blocks.push({ type: 'code', lang, content: codeLines.join('\n') });
      continue;
    }

    if (line.match(/^\s*-{3,}\s*$/)) {
      blocks.push({ type: 'hr' });
      i += 1;
      continue;
    }

    const heading = line.match(/^(#{1,6})\s+(.*)$/);
    if (heading) {
      const level = Math.min(6, heading[1].length) as 1 | 2 | 3 | 4 | 5 | 6;
      blocks.push({ type: 'heading', level, content: parseInline(heading[2] || '') });
      i += 1;
      continue;
    }

    if (line.trim().startsWith('>')) {
      const quoteLines: string[] = [];
      while (i < lines.length && lines[i].trim().startsWith('>')) {
        quoteLines.push(lines[i].replace(/^\s*>\s?/, ''));
        i += 1;
      }
      blocks.push({ type: 'blockquote', content: parseInline(quoteLines.join('\n')) });
      continue;
    }

    const ul = line.match(/^\s*[-*+]\s+(.*)$/);
    if (ul) {
      const items: InlineToken[][] = [];
      while (i < lines.length) {
        const m = lines[i].match(/^\s*[-*+]\s+(.*)$/);
        if (!m) break;
        items.push(parseInline(m[1] || ''));
        i += 1;
      }
      blocks.push({ type: 'ul', items });
      continue;
    }

    const ol = line.match(/^\s*\d+\.\s+(.*)$/);
    if (ol) {
      const items: InlineToken[][] = [];
      while (i < lines.length) {
        const m = lines[i].match(/^\s*\d+\.\s+(.*)$/);
        if (!m) break;
        items.push(parseInline(m[1] || ''));
        i += 1;
      }
      blocks.push({ type: 'ol', items });
      continue;
    }

    const paraLines: string[] = [];
    while (i < lines.length && lines[i].trim()) {
      paraLines.push(lines[i]);
      i += 1;
    }
    blocks.push({ type: 'paragraph', content: parseInline(paraLines.join('\n')) });
  }

  return blocks;
};

const Inline: React.FC<{ tokens: InlineToken[] }> = ({ tokens }) => {
  const nodes: React.ReactNode[] = [];
  let key = 0;

  const push = (node: React.ReactNode) => {
    nodes.push(<React.Fragment key={key++}>{node}</React.Fragment>);
  };

  for (const t of tokens) {
    if (t.type === 'text') {
      const parts = t.value.split('\n');
      for (let i = 0; i < parts.length; i++) {
        if (parts[i]) push(parts[i]);
        if (i < parts.length - 1) push(<br />);
      }
      continue;
    }
    if (t.type === 'code') {
      push(
        <code className="px-1.5 py-0.5 rounded bg-gray-100 border border-gray-200 font-mono text-xs text-gray-700">
          {t.value}
        </code>
      );
      continue;
    }
    if (t.type === 'strong') {
      push(<strong className="font-semibold text-gray-800"><Inline tokens={t.children} /></strong>);
      continue;
    }
    if (t.type === 'em') {
      push(<em className="italic text-gray-600"><Inline tokens={t.children} /></em>);
      continue;
    }
    if (t.type === 'link') {
      const safe = isSafeHref(t.href);
      if (!safe) {
        push(<Inline tokens={t.label} />);
        continue;
      }
      push(
        <a href={t.href} target="_blank" rel="noreferrer" className="text-blue-600 hover:text-blue-700 underline underline-offset-2">
          <Inline tokens={t.label} />
        </a>
      );
      continue;
    }
  }

  return <>{nodes}</>;
};

// 代码块组件（带复制按钮）
const CodeBlock: React.FC<{ lang?: string; content: string }> = ({ lang, content }) => {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(content);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  return (
    <div className="relative group rounded-xl overflow-hidden border border-gray-200">
      {lang && (
        <div className="flex items-center justify-between px-3 py-1.5 bg-gray-100 border-b border-gray-200">
          <span className="text-xs text-gray-500 font-medium">{lang}</span>
          <button
            onClick={handleCopy}
            className="flex items-center gap-1 px-2 py-1 text-xs text-gray-500 hover:text-gray-700 hover:bg-gray-200 rounded transition-colors"
          >
            {copied ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
            {copied ? '已复制' : '复制'}
          </button>
        </div>
      )}
      {!lang && (
        <button
          onClick={handleCopy}
          className="absolute top-2 right-2 p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-200 rounded opacity-0 group-hover:opacity-100 transition-all"
        >
          {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
        </button>
      )}
      <pre className="p-3 bg-gray-50 overflow-x-auto">
        <code className="text-xs text-gray-700 font-mono whitespace-pre">{content}</code>
      </pre>
    </div>
  );
};

export const MarkdownLight: React.FC<{ text: string; className?: string }> = ({ text, className = '' }) => {
  const blocks = useMemo(() => tokenize(text), [text]);

  const renderHeading = (level: 1 | 2 | 3 | 4 | 5 | 6, content: InlineToken[], key: number) => {
    const size = level === 1 ? 'text-lg' : level === 2 ? 'text-base' : 'text-sm';
    const className = `${size} font-semibold text-gray-800 mt-3 first:mt-0`;

    if (level === 1) return <h1 key={key} className={className}><Inline tokens={content} /></h1>;
    if (level === 2) return <h2 key={key} className={className}><Inline tokens={content} /></h2>;
    if (level === 3) return <h3 key={key} className={className}><Inline tokens={content} /></h3>;
    if (level === 4) return <h4 key={key} className={className}><Inline tokens={content} /></h4>;
    if (level === 5) return <h5 key={key} className={className}><Inline tokens={content} /></h5>;
    return <h6 key={key} className={className}><Inline tokens={content} /></h6>;
  };

  return (
    <div className={`space-y-2 ${className}`}>
      {blocks.map((b, idx) => {
        if (b.type === 'hr') return <hr key={idx} className="border-gray-200" />;
        if (b.type === 'heading') return renderHeading(b.level, b.content, idx);
        if (b.type === 'code') return <CodeBlock key={idx} lang={b.lang} content={b.content} />;
        if (b.type === 'blockquote') {
          return (
            <blockquote key={idx} className="pl-3 border-l-2 border-gray-300 text-gray-600 italic">
              <Inline tokens={b.content} />
            </blockquote>
          );
        }
        if (b.type === 'ul') {
          return (
            <ul key={idx} className="list-disc pl-5 space-y-1 text-gray-600 text-sm">
              {b.items.map((it, i) => <li key={i}><Inline tokens={it} /></li>)}
            </ul>
          );
        }
        if (b.type === 'ol') {
          return (
            <ol key={idx} className="list-decimal pl-5 space-y-1 text-gray-600 text-sm">
              {b.items.map((it, i) => <li key={i}><Inline tokens={it} /></li>)}
            </ol>
          );
        }
        return (
          <p key={idx} className="text-sm text-gray-600 leading-relaxed">
            <Inline tokens={b.content} />
          </p>
        );
      })}
    </div>
  );
};

export default MarkdownLight;

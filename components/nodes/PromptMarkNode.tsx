import React, { useEffect, useMemo, useState } from 'react';
import { Search, Copy, ExternalLink } from 'lucide-react';
import { PromptMarkNodeData } from '../../types';
import { getPromptMarks, PromptMarkPreset } from '../../services/promptMarkService';

interface PromptMarkNodeProps {
  data: PromptMarkNodeData;
  updateData: (newData: Partial<PromptMarkNodeData>) => void;
}

const PromptMarkNode: React.FC<PromptMarkNodeProps> = ({ data, updateData }) => {
  const [presets, setPresets] = useState<PromptMarkPreset[]>([]);
  const [activeCategory, setActiveCategory] = useState<string>('all');
  const [query, setQuery] = useState('');

  useEffect(() => {
    let active = true;
    (async () => {
      const loaded = await getPromptMarks();
      if (!active) return;
      setPresets(loaded);
      if (activeCategory === 'all') return;
      if (!loaded.some((p) => (p.category || 'default') === activeCategory)) {
        setActiveCategory('all');
      }
    })();
    return () => {
      active = false;
    };
  }, []);

  const categories = useMemo(() => {
    const set = new Set<string>();
    for (const p of presets) set.add(p.category || 'default');
    return ['all', ...Array.from(set)];
  }, [presets]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return presets.filter((p) => {
      const category = p.category || 'default';
      if (activeCategory !== 'all' && category !== activeCategory) return false;
      if (!q) return true;
      return (
        p.title.toLowerCase().includes(q) ||
        (p.summary || '').toLowerCase().includes(q) ||
        p.prompt.toLowerCase().includes(q)
      );
    });
  }, [presets, query, activeCategory]);

  const selectPreset = (preset: PromptMarkPreset) => {
    updateData({ selectedPresetId: preset.id, text: preset.prompt });
  };

  const copyPrompt = async () => {
    const text = (data.text || '').trim();
    if (!text) return;
    try {
      await navigator.clipboard.writeText(text);
    } catch {
      // ignore
    }
  };

  const selected = presets.find((p) => p.id === data.selectedPresetId);

  return (
    <div className="flex flex-col gap-3 h-full">
      <div className="flex gap-2 items-center">
        <div className="relative flex-1">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search prompts…"
            className="w-full pl-9 pr-3 py-2 rounded-2xl bg-black/20 border border-transparent hover:border-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-500/40 text-sm text-gray-200"
          />
        </div>
        <select
          value={activeCategory}
          onChange={(e) => setActiveCategory(e.target.value)}
          className="px-3 py-2 rounded-2xl bg-black/20 border border-transparent hover:border-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-500/40 text-sm text-gray-200"
        >
          {categories.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>
      </div>

      <div className="h-[420px] overflow-y-auto custom-scrollbar pr-1">
        <div className="grid grid-cols-4 gap-6">
          {filtered.map((p) => {
            const isSelected = p.id === data.selectedPresetId;
            return (
              <button
                key={p.id}
                type="button"
                onClick={() => selectPreset(p)}
                className={`text-left rounded-2xl border transition overflow-hidden group ${
                  isSelected
                    ? 'border-blue-400/70 bg-blue-500/10 shadow-[0_0_18px_rgba(59,130,246,0.2)]'
                    : 'border-transparent bg-black/20 hover:bg-black/35 hover:border-gray-800'
                }`}
                title={p.summary ? `${p.title}\n${p.summary}` : p.title}
              >
                <div className="relative w-full aspect-[4/3]">
                  <div
                    className="absolute inset-0 bg-cover bg-center transition-transform duration-300 group-hover:scale-[1.02]"
                    style={{
                      backgroundImage: p.image ? `url(${p.image})` : undefined,
                      backgroundColor: p.image ? undefined : 'rgba(0,0,0,0.25)',
                    }}
                  />
                  {!p.image ? (
                    <div className="absolute inset-0 bg-gradient-to-br from-slate-700/60 to-slate-950/60" />
                  ) : (
                    <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/10 to-transparent" />
                  )}

                  <div className="absolute inset-x-0 bottom-0 p-2">
                    <div className="text-xs font-semibold text-white leading-snug line-clamp-2">
                      {p.title}
                    </div>
                  </div>
                </div>
              </button>
            );
          })}

          {filtered.length === 0 ? (
            <div className="col-span-2 text-xs text-gray-300 bg-black/20 rounded-2xl p-3">
              No promptmarks found.
            </div>
          ) : null}
        </div>
      </div>

      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={copyPrompt}
          className="flex items-center gap-2 px-3 py-2 rounded-2xl bg-black/20 hover:bg-black/35 border border-transparent hover:border-gray-800 text-sm text-gray-200"
          title="Copy prompt"
        >
          <Copy size={14} />
          Copy
        </button>
        {selected?.jumpUrl ? (
          <a
            href={selected.jumpUrl}
            target="_blank"
            rel="noreferrer"
            className="flex items-center gap-2 px-3 py-2 rounded-2xl bg-black/20 hover:bg-black/35 border border-transparent hover:border-gray-800 text-sm text-gray-200"
            title="Open reference"
          >
            <ExternalLink size={14} />
            Link
          </a>
        ) : null}
      </div>

      <textarea
        value={data.text || ''}
        onChange={(e) => updateData({ text: e.target.value })}
        placeholder="Selected prompt appears here…"
        className="w-full min-h-[120px] resize-none p-3 rounded-2xl bg-black/20 border border-transparent hover:border-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-500/40 text-sm text-gray-200"
      />
    </div>
  );
};

export default PromptMarkNode;

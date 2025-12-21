import React, { useEffect, useMemo, useState, useRef, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { Sparkles, GitBranch, Images } from 'lucide-react';
import { optimizePrompt } from '../../services/geminiService';
import { chatCompletions } from '../../services/textModelService';
import { PromptNodeData } from '../../types';

const OPTIMIZE_PRESETS = [
  {
    id: 'structure',
    label: '结构化描写',
    description: '拆分主体、场景、光效与镜头语言。',
    systemPrompt:
      'You rewrite prompts for image generation into concise structured clauses covering subject, environment, lighting, and camera style. Output one polished prompt under 120 words.',
  },
  {
    id: 'cinematic',
    label: '电影质感',
    description: '强调镜头、景深与色彩氛围。',
    systemPrompt:
      'You are a cinematic prompt director. Rewrite the prompt to evoke a film still with references to lens, depth of field, color grading, and atmosphere.',
  },
  {
    id: 'illustration',
    label: '插画风格',
    description: '突出笔触、材质与构图。',
    systemPrompt:
      'You are an illustration prompt expert. Rewrite the prompt emphasizing art medium, brushwork, textures, composition, and stylistic influences.',
  },
];

interface PromptNodeProps {
  data: PromptNodeData;
  updateData: (newData: Partial<PromptNodeData>) => void;
}

const PromptNode: React.FC<PromptNodeProps> = ({ data, updateData }) => {
  const [optimizedPreview, setOptimizedPreview] = useState<string>('');
  const [derivedOptions, setDerivedOptions] = useState<string[]>(data.derivedOptions || []);
  const [selectedDerived, setSelectedDerived] = useState<string[]>(data.selectedDerived || []);
  const [isMarketOpen, setIsMarketOpen] = useState(false);
  const [marketPos, setMarketPos] = useState({ left: 0, top: 0 });
  const [marketDragging, setMarketDragging] = useState(false);
  const marketDragStart = useState({ x: 0, y: 0, left: 0, top: 0 })[0];
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const derivedTextareaRefs = useRef<Map<number, HTMLTextAreaElement>>(new Map());
  const optimizeButtonRef = useRef<HTMLButtonElement>(null);
  const optimizeMenuRef = useRef<HTMLDivElement | null>(null);
  const [isOptimizeMenuOpen, setIsOptimizeMenuOpen] = useState(false);
  const [optimizeMenuPos, setOptimizeMenuPos] = useState({ left: 0, top: 0 });
  const [isOptimizing, setIsOptimizing] = useState(false);
  const [optimizeError, setOptimizeError] = useState<string | null>(null);

  const adjustTextareaHeight = useCallback((element: HTMLTextAreaElement | null) => {
    if (!element) return;
    element.style.height = 'auto';
    element.style.height = `${element.scrollHeight}px`;
  }, []);

  const autoResizeTextarea = useCallback(() => {
    requestAnimationFrame(() => adjustTextareaHeight(textareaRef.current));
  }, [adjustTextareaHeight]);

  useEffect(() => {
    setDerivedOptions(data.derivedOptions || []);
    setSelectedDerived(data.selectedDerived || []);
  }, [data.derivedOptions, data.selectedDerived]);

  useEffect(() => {
    if (isMarketOpen) {
      const left = Math.max(20, (window.innerWidth - 820) / 2);
      const top = Math.max(20, (window.innerHeight - 520) / 2);
      setMarketPos({ left, top });
    }
  }, [isMarketOpen]);

  useEffect(() => {
    if (!isOptimizeMenuOpen) return;
    const handleClick = (e: MouseEvent) => {
      if (
        optimizeMenuRef.current?.contains(e.target as Node) ||
        optimizeButtonRef.current?.contains(e.target as Node)
      ) {
        return;
      }
      setIsOptimizeMenuOpen(false);
    };
    window.addEventListener('mousedown', handleClick);
    return () => window.removeEventListener('mousedown', handleClick);
  }, [isOptimizeMenuOpen]);

  const colorizeSegments = (prompt: string) => {
    const palette = ['#f97316', '#22c55e', '#3b82f6', '#e11d48', '#a855f7'];
    return prompt
      .split(/[,，]/)
      .filter(Boolean)
      .map((seg, idx) => ({
        text: seg.trim(),
        color: palette[idx % palette.length],
      }));
  };

  const toggleOptimizeMenu = () => {
    if (optimizeButtonRef.current) {
      const rect = optimizeButtonRef.current.getBoundingClientRect();
      const left = Math.min(rect.left, window.innerWidth - 260);
      const top = Math.min(rect.bottom + 8, window.innerHeight - 240);
      setOptimizeMenuPos({ left, top });
    }
    setIsOptimizeMenuOpen((prev) => !prev);
  };

  const runPresetOptimization = async (presetId: string) => {
    const preset = OPTIMIZE_PRESETS.find((p) => p.id === presetId);
    if (!preset) return;
    const base = (data.text || '').trim();
    if (!base) {
      alert('请先输入需要优化的描述。');
      return;
    }
    setIsOptimizing(true);
    setOptimizeError(null);
    try {
      const optimized = await chatCompletions(
        'Gemini-2.5-pro',
        [{ role: 'user', content: base }],
        undefined,
        undefined,
        preset.systemPrompt
      );
      if (optimized) {
        updateData({ text: optimized });
        setOptimizedPreview(optimized);
      }
      setIsOptimizeMenuOpen(false);
    } catch (error) {
      console.error('[PromptNode] Optimize failed', error);
      setOptimizeError(error instanceof Error ? error.message : '优化失败，请稍后重试');
    } finally {
      setIsOptimizing(false);
    }
  };

  const handleDerive = async () => {
    const base = data.text || '描述一幅有氛围的画面';
    const results = await optimizePrompt(base);
    const list = results.slice(0, 5);
    setDerivedOptions(list);
    setSelectedDerived(list.slice(0, 2));
    updateData({ derivedOptions: list, selectedDerived: list.slice(0, 2) });
  };

  const toggleDerived = (prompt: string) => {
    setSelectedDerived((prev) => {
      const next = prev.includes(prompt) ? prev.filter((p) => p !== prompt) : [...prev, prompt];
      updateData({ selectedDerived: next });
      return next;
    });
  };

  const marketPresets = useMemo(
    () => [
      {
        id: 'mk1',
        text: '日落城市，玻璃幕墙反射光晕，航拍视角',
        img: 'https://images.unsplash.com/photo-1505761671935-60b3a7427bad?auto=format&fit=crop&w=400&q=60',
      },
      {
        id: 'mk2',
        text: '森林小屋，雾气，清晨光束，胶片感',
        img: 'https://images.unsplash.com/photo-1501785888041-af3ef285b470?auto=format&fit=crop&w=400&q=60',
      },
      {
        id: 'mk3',
        text: '科幻机甲，蓝色霓虹，雨夜街道，电影光',
        img: 'https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?auto=format&fit=crop&w=400&q=60',
      },
      {
        id: 'mk4',
        text: '极简产品拍摄，柔光背景，立体阴影',
        img: 'https://images.unsplash.com/photo-1503602642458-232111445657?auto=format&fit=crop&w=400&q=60',
      },
      {
        id: 'mk5',
        text: '东方庭院，下雨，倒影，长曝光氛围',
        img: 'https://images.unsplash.com/photo-1433838552652-f9a46b332c40?auto=format&fit=crop&w=400&q=60',
      },
    ],
    []
  );

  const applyPreset = (text: string) => {
    updateData({ text });
  };

  useEffect(() => {
    autoResizeTextarea();
  }, [data.text, autoResizeTextarea]);

  useEffect(() => {
    requestAnimationFrame(() => {
      derivedTextareaRefs.current.forEach((element) => adjustTextareaHeight(element));
    });
  }, [derivedOptions, adjustTextareaHeight]);

  useEffect(() => {
    const move = (e: MouseEvent) => {
      if (!marketDragging) return;
      const left = Math.min(Math.max(marketDragStart.left + (e.clientX - marketDragStart.x), 10), window.innerWidth - 840);
      const top = Math.min(Math.max(marketDragStart.top + (e.clientY - marketDragStart.y), 10), window.innerHeight - 400);
      setMarketPos({ left, top });
    };
    const up = () => setMarketDragging(false);
    if (marketDragging) {
      window.addEventListener('mousemove', move);
      window.addEventListener('mouseup', up);
    }
    return () => {
      window.removeEventListener('mousemove', move);
      window.removeEventListener('mouseup', up);
    };
  }, [marketDragging, marketDragStart]);

  return (
    <div className="flex flex-col gap-3 pr-1">
      <div className="flex gap-2">
        <button
          ref={optimizeButtonRef}
          onClick={toggleOptimizeMenu}
          disabled={isOptimizing}
          className="flex-1 flex items-center justify-center gap-2 bg-black/20 hover:bg-black/40 text-gray-300 text-xs px-3 py-2 rounded-xl transition backdrop-blur-sm disabled:opacity-60 disabled:cursor-not-allowed"
        >
          <Sparkles size={12} className={isOptimizing ? 'animate-spin text-blue-400' : ''} /> 
          <span>{isOptimizing ? '优化中...' : '优化'}</span>
        </button>
        <button
          onClick={handleDerive}
          className="flex-1 flex items-center justify-center gap-2 bg-black/20 hover:bg-black/40 text-gray-300 text-xs px-3 py-2 rounded-xl transition backdrop-blur-sm"
        >
          <GitBranch size={12} /> 
          <span>衍生</span>
        </button>
        <button
          onClick={() => setIsMarketOpen(true)}
          className="flex-1 flex items-center justify-center gap-2 bg-black/20 hover:bg-black/40 text-gray-300 text-xs px-3 py-2 rounded-xl transition backdrop-blur-sm"
        >
          <Images size={12} /> 
          <span>市场</span>
        </button>
      </div>

      {optimizeError && (
        <div className="text-xs text-red-300 bg-red-500/10 border border-red-500/30 rounded-xl px-3 py-2">
          优化失败：{optimizeError}
        </div>
      )}

      <textarea
        className="w-full bg-black/20 border border-transparent rounded-2xl p-4 text-white placeholder-gray-400 focus:bg-black/40 focus:ring-0 outline-none transition-colors"
        placeholder="描述你想要的画面..."
        value={data.text}
        onChange={(e) => {
          updateData({ text: e.target.value });
          autoResizeTextarea();
        }}
        ref={textareaRef}
        style={{ resize: 'none', overflow: 'hidden' }}
      />

      {optimizedPreview && (
        <div className="bg-black/20 rounded-2xl p-3 space-y-2 border border-gray-800">
          <div className="flex items-center justify-between px-1">
            <span className="text-blue-400 text-[10px] font-bold uppercase tracking-wider">优化预览</span>
          </div>
          <div className="flex flex-wrap gap-2">
            {colorizeSegments(optimizedPreview).map((seg, idx) => (
              <input
                key={idx}
                value={seg.text}
                onChange={(e) => {
                  const parts = colorizeSegments(optimizedPreview);
                  parts[idx].text = e.target.value;
                  const next = parts.map((p) => p.text).join(', ');
                  setOptimizedPreview(next);
                  updateData({ text: next });
                }}
                style={{ color: seg.color, borderColor: `${seg.color}44` }}
                className="bg-gray-900 border rounded-lg px-2 py-1 text-[11px] focus:outline-none min-w-[40px]"
              />
            ))}
          </div>
        </div>
      )}

      {isOptimizeMenuOpen &&
        createPortal(
          <div
            ref={optimizeMenuRef}
            className="fixed z-50 w-64 bg-white/80 backdrop-blur-xl border border-gray-200 rounded-2xl shadow-2xl overflow-hidden text-sm text-gray-800"
            style={{ left: optimizeMenuPos.left, top: optimizeMenuPos.top }}
            data-stop-canvas-zoom="true"
            onWheelCapture={(e) => e.stopPropagation()}
          >
            <div className="px-4 py-3 border-b border-white/40 text-xs font-semibold text-gray-600 tracking-widest">
              GEMINI 提示优化
            </div>
            <div className="flex flex-col">
              {OPTIMIZE_PRESETS.map((preset) => (
                <button
                  key={preset.id}
                  className="w-full text-left px-4 py-3 hover:bg-white/90 transition disabled:opacity-60 disabled:cursor-not-allowed"
                  onClick={() => runPresetOptimization(preset.id)}
                  disabled={isOptimizing}
                >
                  <div className="text-sm font-semibold text-gray-900">{preset.label}</div>
                  <div className="text-xs text-gray-500">{preset.description}</div>
                </button>
              ))}
            </div>
          </div>,
          document.body
        )}

      {derivedOptions.length > 0 && (
        <div className="bg-black/20 rounded-2xl p-3 space-y-2 border border-gray-800">
          <div className="text-gray-400 text-[10px] font-bold uppercase tracking-wider px-1">衍生选项</div>
          <div className="space-y-2 pr-1">
            {derivedOptions.map((opt, idx) => {
              const checked = selectedDerived.includes(opt);
              return (
                <div key={`derived-${idx}`} className={`p-3 rounded-2xl border transition ${checked ? 'border-blue-500/40 bg-black/40' : 'border-gray-800 bg-black/20'}`}>
                  <div className="flex items-start gap-3">
                    <input
                      type="checkbox"
                      className="mt-1 accent-blue-500"
                      checked={checked}
                      onChange={() => toggleDerived(opt)}
                    />
                    <textarea
                      readOnly
                      value={opt}
                      className={`flex-1 bg-transparent text-xs leading-relaxed resize-none overflow-hidden ${checked ? 'text-white' : 'text-gray-400'}`}
                      style={{ minHeight: '40px' }}
                      ref={(el) => {
                        if (el) {
                          derivedTextareaRefs.current.set(idx, el);
                          adjustTextareaHeight(el);
                        } else {
                          derivedTextareaRefs.current.delete(idx);
                        }
                      }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {isMarketOpen &&
        createPortal(
          <div className="fixed inset-0 z-50 flex items-center justify-center" data-stop-canvas-zoom="true" onWheelCapture={(e) => e.stopPropagation()}>
            <div className="absolute inset-0 bg-black/40" />
            <div
              className="absolute bg-gray-900/95 backdrop-blur-2xl border border-gray-700 rounded-3xl w-[820px] max-h-[80vh] overflow-hidden shadow-2xl"
              style={{ left: marketPos.left, top: marketPos.top }}
              onMouseDown={(e) => e.stopPropagation()}
              onWheelCapture={(e) => e.stopPropagation()}
            >
              <div
                className="flex items-center justify-between px-6 py-4 border-b border-gray-700 cursor-move"
                onMouseDown={(e) => {
                  e.preventDefault();
                  marketDragStart.x = e.clientX;
                  marketDragStart.y = e.clientY;
                  marketDragStart.left = marketPos.left;
                  marketDragStart.top = marketPos.top;
                  setMarketDragging(true);
                }}
              >
                <div className="text-sm text-white font-medium">Prompt 灵感市场</div>
                <button onClick={() => setIsMarketOpen(false)} className="w-6 h-6 flex items-center justify-center rounded-full bg-black/20 hover:bg-black/40 text-white transition">
                  ×
                </button>
              </div>
              <div className="p-6 grid grid-cols-3 gap-4 overflow-y-auto max-h-[70vh] custom-scrollbar">
                {marketPresets.map((preset) => (
                  <button
                    key={preset.id}
                    onClick={() => applyPreset(preset.text)}
                    className="rounded-xl border border-gray-800 overflow-hidden bg-gray-950 hover:border-blue-500/50 hover:bg-black transition text-left group"
                  >
                    <div className="h-32 w-full bg-cover bg-center group-hover:scale-105 transition duration-500" style={{ backgroundImage: `url(${preset.img})` }} />
                    <div className="p-4 text-xs text-gray-300 group-hover:text-white transition leading-relaxed">{preset.text}</div>
                  </button>
                ))}
              </div>
            </div>
          </div>,
          document.body
        )}
    </div>
  );
};

export default PromptNode;

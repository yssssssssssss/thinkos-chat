/**
 * /web 工具入口弹窗
 * - 先集成：小红书封面（xhs-cover-skill 思路：生成 JSON prompts，可选一键生图）
 * - 预留：后续可扩展更多 Web/Design 工具
 */

import React, { useMemo, useState } from 'react';
import { Check, Globe, Image as ImageIcon, Loader2, X } from 'lucide-react';
import { generateImagesFromWorkflow } from '../../../../services/geminiImageService';
import {
  generateXhsCoverPrompts,
  type XhsCoverImagePrompt,
  type XhsCoverOutput,
  type XhsCoverTemplateId,
} from '../../../../services/xhsCoverService';

type GenerateMode = 'json' | 'cover' | 'all';

export interface WebToolsDialogResult {
  toolId: 'xhs-cover';
  template: XhsCoverTemplateId;
  generateMode: GenerateMode;
  input: string;
  jsonText: string;
  parsed: XhsCoverOutput;
  images: Array<{
    index: number;
    type: string;
    prompt: string;
    imageUrl: string;
  }>;
}

interface WebToolsDialogProps {
  initialText?: string;
  textModelId: string;
  imageModelId: string;
  onClose: () => void;
  onComplete: (result: WebToolsDialogResult) => void;
}

const DEFAULT_TEMPLATE: XhsCoverTemplateId = 'infographic-cartoon';

const appendNegativePrompt = (prompt: string, negativePrompt?: string): string => {
  const p = (prompt || '').trim();
  const n = (negativePrompt || '').trim();
  if (!n) return p;
  if (!p) return '';
  return `${p}\n\nAvoid: ${n}`;
};

const pickCoverPrompt = (prompts: XhsCoverImagePrompt[]): XhsCoverImagePrompt | undefined => {
  const list = Array.isArray(prompts) ? prompts : [];
  return (
    list.find((p) => String(p.type || '').toLowerCase() === 'cover') ||
    list.find((p) => p.index === 1) ||
    list[0]
  );
};

export const WebToolsDialog: React.FC<WebToolsDialogProps> = ({
  initialText,
  textModelId,
  imageModelId,
  onClose,
  onComplete,
}) => {
  const [activeTool, setActiveTool] = useState<'xhs-cover' | 'coming-soon'>('xhs-cover');
  const [template, setTemplate] = useState<XhsCoverTemplateId>(DEFAULT_TEMPLATE);
  const [generateMode, setGenerateMode] = useState<GenerateMode>('cover');
  const [input, setInput] = useState((initialText || '').trim());
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [streamPreview, setStreamPreview] = useState<string>('');

  const templateLabel = useMemo(() => {
    if (template === 'infographic-pro') return 'Plan B · 高级配色（Pro）';
    return 'Plan A · 卡通信息图（默认）';
  }, [template]);

  const generateModeLabel = useMemo(() => {
    if (generateMode === 'json') return '仅生成 JSON';
    if (generateMode === 'all') return '生成全套图片（1-N 张）';
    return '生成封面图（第 1 张）';
  }, [generateMode]);

  const handleGenerate = async () => {
    if (activeTool !== 'xhs-cover') return;
    if (!input.trim()) {
      setError('请先输入要生成的小红书内容');
      return;
    }

    setError(null);
    setIsGenerating(true);
    setStreamPreview('');

    try {
      const { jsonText, parsed } = await generateXhsCoverPrompts(textModelId, input, template, {
        onStream: (t) => setStreamPreview(t),
      });

      const images: WebToolsDialogResult['images'] = [];

      if (generateMode !== 'json') {
        const promptList = Array.isArray(parsed.image_prompts) ? parsed.image_prompts : [];
        const selected =
          generateMode === 'cover'
            ? (pickCoverPrompt(promptList) ? [pickCoverPrompt(promptList)!] : [])
            : promptList.slice(0, 10);

        for (const p of selected) {
          const fullPrompt = appendNegativePrompt(p.prompt, p.negative_prompt);
          if (!fullPrompt) continue;
          const generated = await generateImagesFromWorkflow(fullPrompt, [{ id: imageModelId }], undefined);
          const first = generated[0];
          if (!first?.url) continue;
          images.push({
            index: typeof p.index === 'number' ? p.index : images.length + 1,
            type: String(p.type || 'Content'),
            prompt: fullPrompt,
            imageUrl: first.url,
          });
        }
      }

      onComplete({
        toolId: 'xhs-cover',
        template,
        generateMode,
        input,
        jsonText,
        parsed,
        images,
      });
    } catch (e) {
      setError(e instanceof Error ? e.message : '生成失败，请稍后重试');
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl max-h-[90vh] overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <h2 className="text-lg font-semibold text-gray-800 flex items-center gap-2">
            <Globe className="w-5 h-5 text-teal-600" />
            Web 工具（/web）
          </h2>
          <button onClick={onClose} className="p-1 hover:bg-gray-100 rounded-lg">
            <X className="w-5 h-5 text-gray-400" />
          </button>
        </div>

        <div className="p-6 overflow-y-auto max-h-[calc(90vh-140px)] space-y-6">
          {/* Tool selector */}
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setActiveTool('xhs-cover')}
              className={`px-3 py-2 rounded-xl border text-sm transition ${
                activeTool === 'xhs-cover'
                  ? 'border-teal-500 bg-teal-50 text-teal-700'
                  : 'border-gray-200 bg-white hover:bg-gray-50 text-gray-700'
              }`}
            >
              小红书封面
            </button>
            <button
              type="button"
              onClick={() => setActiveTool('coming-soon')}
              className={`px-3 py-2 rounded-xl border text-sm transition ${
                activeTool === 'coming-soon'
                  ? 'border-gray-400 bg-gray-50 text-gray-700'
                  : 'border-gray-200 bg-white hover:bg-gray-50 text-gray-400'
              }`}
            >
              页面生成（待接入）
            </button>
          </div>

          {activeTool === 'coming-soon' ? (
            <div className="p-4 bg-gray-50 rounded-xl text-sm text-gray-600">
              页面生成工具待接入（可后续对接 UI/UX Pro Max / 生成可预览落地页）。
            </div>
          ) : (
            <>
              <div>
                <div className="text-sm text-gray-500 mb-2">内容</div>
                <textarea
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  placeholder="粘贴你的原始内容（中文/英文都可以）"
                  className="w-full min-h-[140px] max-h-[320px] px-4 py-3 border border-gray-200 rounded-xl text-sm text-gray-700 placeholder-gray-400 outline-none focus:ring-2 focus:ring-teal-200 focus:border-teal-300 resize-y"
                  disabled={isGenerating}
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <div className="text-sm text-gray-500 mb-2">风格模板</div>
                  <div className="flex flex-col gap-2">
                    <label className={`flex items-start gap-3 p-3 rounded-xl border cursor-pointer transition ${
                      template === 'infographic-cartoon'
                        ? 'border-teal-500 bg-teal-50'
                        : 'border-gray-200 bg-white hover:bg-gray-50'
                    }`}>
                      <input
                        type="radio"
                        name="xhs-template"
                        checked={template === 'infographic-cartoon'}
                        onChange={() => setTemplate('infographic-cartoon')}
                        disabled={isGenerating}
                        className="mt-1"
                      />
                      <div>
                        <div className="font-medium text-sm text-gray-800">Plan A · 卡通信息图</div>
                        <div className="text-xs text-gray-500">更活泼、可爱、高饱和，适合教程/大众话题</div>
                      </div>
                    </label>
                    <label className={`flex items-start gap-3 p-3 rounded-xl border cursor-pointer transition ${
                      template === 'infographic-pro'
                        ? 'border-teal-500 bg-teal-50'
                        : 'border-gray-200 bg-white hover:bg-gray-50'
                    }`}>
                      <input
                        type="radio"
                        name="xhs-template"
                        checked={template === 'infographic-pro'}
                        onChange={() => setTemplate('infographic-pro')}
                        disabled={isGenerating}
                        className="mt-1"
                      />
                      <div>
                        <div className="font-medium text-sm text-gray-800">Plan B · 高级配色（Pro）</div>
                        <div className="text-xs text-gray-500">更克制、留白多、莫兰迪配色，适合深度内容</div>
                      </div>
                    </label>
                  </div>
                </div>

                <div>
                  <div className="text-sm text-gray-500 mb-2">生成方式</div>
                  <div className="flex flex-col gap-2">
                    <label className={`flex items-start gap-3 p-3 rounded-xl border cursor-pointer transition ${
                      generateMode === 'cover'
                        ? 'border-teal-500 bg-teal-50'
                        : 'border-gray-200 bg-white hover:bg-gray-50'
                    }`}>
                      <input
                        type="radio"
                        name="xhs-mode"
                        checked={generateMode === 'cover'}
                        onChange={() => setGenerateMode('cover')}
                        disabled={isGenerating}
                        className="mt-1"
                      />
                      <div className="flex items-center gap-2">
                        <ImageIcon className="w-4 h-4 text-teal-600" />
                        <span className="font-medium text-sm text-gray-800">生成封面图（第 1 张）</span>
                      </div>
                    </label>

                    <label className={`flex items-start gap-3 p-3 rounded-xl border cursor-pointer transition ${
                      generateMode === 'all'
                        ? 'border-teal-500 bg-teal-50'
                        : 'border-gray-200 bg-white hover:bg-gray-50'
                    }`}>
                      <input
                        type="radio"
                        name="xhs-mode"
                        checked={generateMode === 'all'}
                        onChange={() => setGenerateMode('all')}
                        disabled={isGenerating}
                        className="mt-1"
                      />
                      <div className="flex items-center gap-2">
                        <ImageIcon className="w-4 h-4 text-teal-600" />
                        <span className="font-medium text-sm text-gray-800">生成全套图片（1-N 张）</span>
                      </div>
                    </label>

                    <label className={`flex items-start gap-3 p-3 rounded-xl border cursor-pointer transition ${
                      generateMode === 'json'
                        ? 'border-teal-500 bg-teal-50'
                        : 'border-gray-200 bg-white hover:bg-gray-50'
                    }`}>
                      <input
                        type="radio"
                        name="xhs-mode"
                        checked={generateMode === 'json'}
                        onChange={() => setGenerateMode('json')}
                        disabled={isGenerating}
                        className="mt-1"
                      />
                      <div>
                        <div className="font-medium text-sm text-gray-800">仅生成 JSON（不生图）</div>
                        <div className="text-xs text-gray-500">只输出 prompts，便于复制到其他生图工具</div>
                      </div>
                    </label>
                  </div>
                </div>
              </div>

              <div className="p-3 bg-teal-50 rounded-xl text-sm text-teal-800">
                <div>模板：<strong>{templateLabel}</strong></div>
                <div>方式：<strong>{generateModeLabel}</strong></div>
                <div className="text-xs text-teal-700 mt-1">文本模型：{textModelId} · 图片模型：{imageModelId}</div>
              </div>

              {(streamPreview || isGenerating) && (
                <div>
                  <div className="text-sm text-gray-500 mb-2">生成预览（流式）</div>
                  <pre className="p-3 bg-gray-50 border border-gray-200 rounded-xl text-xs text-gray-700 overflow-auto max-h-64 whitespace-pre-wrap">
                    {streamPreview || '正在生成...'}
                  </pre>
                </div>
              )}

              {error && (
                <div className="p-3 bg-red-50 text-red-600 rounded-lg text-sm">
                  {error}
                </div>
              )}
            </>
          )}
        </div>

        <div className="px-6 py-4 border-t border-gray-100 flex justify-end gap-3">
          <button
            onClick={onClose}
            className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg transition"
            disabled={isGenerating}
          >
            取消
          </button>
          <button
            onClick={handleGenerate}
            disabled={isGenerating || activeTool !== 'xhs-cover'}
            className="px-6 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700 transition disabled:opacity-50 flex items-center gap-2"
          >
            {isGenerating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
            {isGenerating ? '生成中...' : '开始生成'}
          </button>
        </div>
      </div>
    </div>
  );
};


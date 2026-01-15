/**
 * AI 图片扩展对话框（Gemini 3 Pro）
 * - 用户选择输出像素尺寸（作为 size 参数）
 * - 将图片与系统提示词发送给大模型生成延展结果
 */

import React, { useMemo, useState } from 'react';
import { X, Sparkles, ChevronDown, Check } from 'lucide-react';
import { expandImageWithGeminiPro } from '../../../../services/geminiImageService';

interface AiImageExpandDialogProps {
  imageUrl: string;
  onClose: () => void;
  onComplete: (result: {
    imageUrl: string;
    size: string;
    generatedAt: string;
    model: string;
  }) => void;
}

type SizePreset = {
  id: string;
  name: string;
  width: number;
  height: number;
};

const SIZE_PRESETS: SizePreset[] = [
  { id: 'hd', name: 'HD', width: 1280, height: 720 },
  { id: 'fhd', name: '全高清 (FHD)', width: 1920, height: 1080 },
  { id: 'qhd', name: '2K QHD', width: 2560, height: 1440 },
  { id: '4k', name: '4K UHD', width: 3840, height: 2160 },
  { id: 'square', name: '1:1 方图', width: 1080, height: 1080 },
  { id: 'story', name: '竖图 9:16', width: 1080, height: 1920 },
  { id: 'cover', name: '封面图', width: 1200, height: 630 },
  { id: 'a4', name: 'A4 海报', width: 2480, height: 3508 },
];

const formatSize = (width: number, height: number): string => `${width}x${height}`;

export const AiImageExpandDialog: React.FC<AiImageExpandDialogProps> = ({
  imageUrl,
  onClose,
  onComplete,
}) => {
  const [isPickingSize, setIsPickingSize] = useState(false);
  const [selectedPresetId, setSelectedPresetId] = useState<string>('fhd');
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const selectedPreset = useMemo(
    () => SIZE_PRESETS.find((p) => p.id === selectedPresetId) || SIZE_PRESETS[1],
    [selectedPresetId]
  );

  const selectedSize = useMemo(
    () => formatSize(selectedPreset.width, selectedPreset.height),
    [selectedPreset]
  );

  const handleGenerate = async () => {
    setError(null);
    setIsGenerating(true);
    try {
      const model = 'Gemini 3-Pro-Image-Preview';
      const resultUrl = await expandImageWithGeminiPro(imageUrl, selectedSize, model);
      onComplete({
        imageUrl: resultUrl,
        size: selectedSize,
        generatedAt: new Date().toISOString(),
        model,
      });
    } catch (e) {
      setError(e instanceof Error ? e.message : '生成失败，请稍后重试');
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <h2 className="text-lg font-semibold text-gray-800 flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-purple-500" />
            AI 图片扩展
          </h2>
          <button onClick={onClose} className="p-1 hover:bg-gray-100 rounded-lg">
            <X className="w-5 h-5 text-gray-400" />
          </button>
        </div>

        <div className="p-6 overflow-y-auto max-h-[calc(90vh-140px)] space-y-6">
          <div>
            <div className="text-sm text-gray-500 mb-2">当前图片</div>
            <div className="bg-gray-100 rounded-xl p-4 flex items-center justify-center min-h-[120px]">
              <img src={imageUrl} alt="预览" className="max-w-full max-h-[240px] rounded-lg" />
            </div>
          </div>

          <div>
            <div className="text-sm text-gray-500 mb-2">扩展尺寸</div>
            <button
              type="button"
              onClick={() => setIsPickingSize((v) => !v)}
              className="w-full px-4 py-3 border border-gray-200 rounded-xl flex items-center justify-between hover:bg-gray-50 transition"
            >
              <span className="text-gray-700">
                {selectedPreset.name}（{selectedPreset.width} × {selectedPreset.height}）
              </span>
              <ChevronDown className={`w-4 h-4 text-gray-400 transition ${isPickingSize ? 'rotate-180' : ''}`} />
            </button>

            {isPickingSize && (
              <div className="mt-3 grid grid-cols-2 gap-2">
                {SIZE_PRESETS.map((preset) => {
                  const isSelected = preset.id === selectedPresetId;
                  return (
                    <button
                      key={preset.id}
                      type="button"
                      onClick={() => {
                        setSelectedPresetId(preset.id);
                        setIsPickingSize(false);
                      }}
                      className={`px-3 py-2 rounded-lg text-sm border transition text-left ${
                        isSelected
                          ? 'border-purple-500 bg-purple-50 text-purple-700'
                          : 'border-gray-200 bg-white hover:bg-gray-50 text-gray-700'
                      }`}
                    >
                      <div className="font-medium">{preset.name}</div>
                      <div className="text-xs text-gray-400">{preset.width}×{preset.height}</div>
                    </button>
                  );
                })}
              </div>
            )}

            <div className="mt-3 p-3 bg-purple-50 rounded-xl text-sm text-purple-700">
              目标尺寸: <strong>{selectedPreset.width} × {selectedPreset.height}</strong> px（size={selectedSize}）
            </div>
          </div>

          <div className="p-4 bg-purple-50 rounded-xl text-sm text-purple-700">
            系统提示词：严格保持图片的主图不变，将背景按照需要的{selectedSize}尺寸进行扩展
          </div>

          {error && (
            <div className="p-3 bg-red-50 text-red-600 rounded-lg text-sm">
              {error}
            </div>
          )}
        </div>

        <div className="px-6 py-4 border-t border-gray-100 flex justify-end gap-3">
          <button
            onClick={onClose}
            className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg transition"
          >
            取消
          </button>
          <button
            onClick={handleGenerate}
            disabled={isGenerating}
            className="px-6 py-2 bg-purple-500 text-white rounded-lg hover:bg-purple-600 transition disabled:opacity-50 flex items-center gap-2"
          >
            {isGenerating ? (
              <>
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                生成中...
              </>
            ) : (
              <>
                <Check className="w-4 h-4" />
                开始生成
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};


import React, { useEffect, useRef } from 'react';
import { AlertCircle, Download, Image as ImageIcon, RefreshCw } from 'lucide-react';
import { GlassMosaicNodeData, GlassMosaicOptions } from '../../types';
import { renderGlassMosaic, loadImageElement } from '../../utils/glassMosaic';
import { GLASS_MOSAIC_DEFAULT_OPTIONS } from '../../constants';

interface GlassMosaicNodeProps {
  data: GlassMosaicNodeData;
  updateData: (newData: Partial<GlassMosaicNodeData>) => void;
  sourceImage?: string | null;
  onResult: (payload: { image: string; options: GlassMosaicOptions } | null) => void;
}

const sliderConfig: Array<{
  key: keyof GlassMosaicOptions;
  label: string;
  min: number;
  max: number;
  step: number;
}> = [
  { key: 'cellSize', label: '网格尺寸', min: 5, max: 100, step: 1 },
  { key: 'sparkleIntensity', label: '随机亮点', min: 0, max: 1, step: 0.01 },
  { key: 'glassOpacity', label: '磨砂强度', min: 0, max: 1, step: 0.05 },
  { key: 'bevelIntensity', label: '边缘深度', min: 0, max: 1, step: 0.05 },
  { key: 'innerShine', label: '光泽程度', min: 0, max: 1, step: 0.05 },
  { key: 'gap', label: '填缝宽度', min: 0, max: 10, step: 1 },
];

const formatValue = (key: keyof GlassMosaicOptions, value: number) => {
  if (['cellSize', 'gap'].includes(key)) return `${Math.round(value)}px`;
  if (['sparkleIntensity', 'glassOpacity', 'bevelIntensity', 'innerShine'].includes(key)) {
    return `${Math.round(value * 100)}%`;
  }
  return value;
};

const GlassMosaicNode: React.FC<GlassMosaicNodeProps> = ({ data, updateData, sourceImage, onResult }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const previousOptionsRef = useRef(data.options);
  const previousSourceRef = useRef<string | null>(sourceImage || null);
  const onResultRef = useRef(onResult);

  const handleOptionChange = <K extends keyof GlassMosaicOptions>(key: K, value: GlassMosaicOptions[K]) => {
    updateData({ options: { ...data.options, [key]: value } });
  };

  const handleShapeChange = (shape: GlassMosaicOptions['renderShape']) => {
    if (shape === data.options.renderShape) return;
    updateData({ options: { ...data.options, renderShape: shape } });
  };

  const handleDownload = () => {
    if (!data.processedImage) return;
    const link = document.createElement('a');
    link.href = data.processedImage;
    link.download = `glass-mosaic-${Date.now()}.png`;
    link.click();
  };

  const handleReset = () => {
    updateData({ options: { ...GLASS_MOSAIC_DEFAULT_OPTIONS } });
  };

  useEffect(() => {
    onResultRef.current = onResult;
  }, [onResult]);

  useEffect(() => {
    const normalizedSource = sourceImage || null;
    const optionsChanged = previousOptionsRef.current !== data.options;
    const sourceChanged = previousSourceRef.current !== normalizedSource;

    previousOptionsRef.current = data.options;
    previousSourceRef.current = normalizedSource;

    if (!sourceImage) {
      if (data.status !== 'idle' || data.processedImage) {
        updateData({ status: 'idle', processedImage: undefined });
      }
      onResultRef.current?.(null);
      return;
    }

    if (!optionsChanged && !sourceChanged && data.processedImage && data.status === 'ready') {
      onResultRef.current?.({ image: data.processedImage, options: data.options });
      return;
    }

    let cancelled = false;
    const run = async () => {
      if (!canvasRef.current) return;
      updateData({ status: 'processing', error: undefined });
      try {
        const imageElement = await loadImageElement(sourceImage);
        if (cancelled || !canvasRef.current) return;
        renderGlassMosaic(canvasRef.current, imageElement, data.options);
        const url = canvasRef.current.toDataURL('image/png');
        if (cancelled) return;
        updateData({ processedImage: url, status: 'ready' });
        onResultRef.current?.({ image: url, options: data.options });
      } catch (error) {
        if (cancelled) return;
        const message = error instanceof Error ? error.message : '处理失败';
        updateData({ status: 'error', error: message });
        onResultRef.current?.(null);
      }
    };

    run();
    return () => {
      cancelled = true;
    };
  }, [data.options, sourceImage]);

  const hasImage = Boolean(sourceImage);
  const isBusy = data.status === 'processing';

  return (
    <div className="flex flex-col gap-4">
      <canvas ref={canvasRef} className="hidden" />

      <div className="rounded-2xl border border-gray-700 bg-black/30 overflow-hidden relative">
        {data.processedImage ? (
          <img
            src={data.processedImage}
            alt="Glass mosaic preview"
            className="w-full h-40 object-cover"
          />
        ) : (
          <div className="h-40 flex flex-col items-center justify-center text-gray-400 gap-2">
            <ImageIcon size={32} />
            {hasImage ? '等待渲染...' : '连接 Image Input 节点以开始'}
          </div>
        )}
        {isBusy && (
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center gap-2 text-indigo-200 text-sm">
            <RefreshCw className="animate-spin" size={16} />
            渲染玻璃马赛克...
          </div>
        )}
        {data.status === 'error' && (
          <div className="absolute inset-0 bg-red-900/80 flex flex-col items-center justify-center text-white text-xs text-center px-4">
            <AlertCircle className="mb-1" size={18} />
            {data.error || '处理失败'}
          </div>
        )}
      </div>

      <div className="grid grid-cols-2 gap-2">
        <button
          className={`py-1.5 text-xs rounded-lg border transition ${
            data.options.renderShape === 'square'
              ? 'border-indigo-400 bg-indigo-500/20 text-white'
              : 'border-gray-700 text-gray-300 hover:border-gray-500'
          }`}
          onClick={() => handleShapeChange('square')}
        >
          方块
        </button>
        <button
          className={`py-1.5 text-xs rounded-lg border transition ${
            data.options.renderShape === 'circle'
              ? 'border-indigo-400 bg-indigo-500/20 text-white'
              : 'border-gray-700 text-gray-300 hover:border-gray-500'
          }`}
          onClick={() => handleShapeChange('circle')}
        >
          圆形
        </button>
      </div>

      <div className="flex flex-col gap-3 max-h-72 overflow-y-auto pr-1">
        {sliderConfig.map((config) => (
          <div key={config.key} className="space-y-1">
            <div className="flex justify-between text-[11px] text-gray-300">
              <span>{config.label}</span>
              <span className="text-gray-400">{formatValue(config.key, data.options[config.key] as number)}</span>
            </div>
            <input
              type="range"
              min={config.min}
              max={config.max}
              step={config.step}
              value={data.options[config.key]}
              onChange={(e) => handleOptionChange(config.key, Number(e.target.value) as GlassMosaicOptions[typeof config.key])}
              className="w-full h-1.5 rounded-full accent-indigo-500 bg-gray-700"
            />
          </div>
        ))}
      </div>

      <div className="flex gap-2">
        <button
          onClick={handleReset}
          className="flex-1 py-2 text-xs rounded-xl bg-gray-800 hover:bg-gray-700 text-gray-200 border border-gray-700 transition disabled:opacity-50"
          disabled={isBusy}
        >
          重置参数
        </button>
        <button
          onClick={handleDownload}
          disabled={!data.processedImage || isBusy}
          className="flex-1 py-2 text-xs rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white border border-indigo-400 transition disabled:opacity-40 flex items-center justify-center gap-1"
        >
          <Download size={12} />
          下载
        </button>
      </div>
    </div>
  );
};

GlassMosaicNode.defaultProps = {
  sourceImage: null,
};

export default GlassMosaicNode;

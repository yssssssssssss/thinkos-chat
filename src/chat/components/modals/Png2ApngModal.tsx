/**
 * PNG→APNG 工具弹窗
 * 在当前应用内完成序列帧上传、排序与 APNG 生成（不依赖 iframe/页面跳转）
 */

import React, { useEffect, useMemo, useRef, useState } from 'react';
import { ArrowDown, ArrowUp, Download, FileImage, GripVertical, Loader2, Settings, Trash2, Upload, X } from 'lucide-react';
import UPNG from 'upng-js';

type FrameItem = {
  id: string;
  file: File;
  name: string;
  previewUrl: string;
};

type ApngConfig = {
  fps: number;
  loops: number; // 0 = 无限循环
  quality: number; // 10-100
};

interface Png2ApngModalProps {
  onClose: () => void;
}

const collator = new Intl.Collator(undefined, { numeric: true, sensitivity: 'base' });

const createId = (): string => {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return crypto.randomUUID();
  }
  return `${Math.random().toString(36).slice(2)}_${Date.now()}`;
};

const isPng = (file: File): boolean => file.type === 'image/png' || /\.png$/i.test(file.name);

const downloadBlob = (blob: Blob, filename: string) => {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
};

const CRC_TABLE = (() => {
  const table = new Uint32Array(256);
  for (let i = 0; i < 256; i++) {
    let c = i;
    for (let j = 0; j < 8; j++) {
      c = (c & 1) ? (0xedb88320 ^ (c >>> 1)) : (c >>> 1);
    }
    table[i] = c >>> 0;
  }
  return table;
})();

const crc32 = (data: Uint8Array): number => {
  let crc = 0xffffffff;
  for (let i = 0; i < data.length; i++) {
    crc = CRC_TABLE[(crc ^ data[i]) & 0xff] ^ (crc >>> 8);
  }
  return (crc ^ 0xffffffff) >>> 0;
};

const setApngLoopCount = (buffer: ArrayBuffer, loops: number): ArrayBuffer => {
  const view = new Uint8Array(buffer);
  const result = new Uint8Array(buffer.byteLength);
  result.set(view);

  // PNG signature = 8 bytes
  let offset = 8;
  while (offset < result.length - 8) {
    const chunkLength = new DataView(result.buffer, offset).getUint32(0);
    const chunkType = new TextDecoder().decode(result.slice(offset + 4, offset + 8));

    if (chunkType === 'acTL') {
      // acTL: length(4) + type(4) + num_frames(4) + num_plays(4) + crc(4)
      const dataView = new DataView(result.buffer, offset + 8);
      dataView.setUint32(4, loops);

      const chunkData = result.slice(offset + 4, offset + 8 + chunkLength);
      const newCrc = crc32(chunkData);
      new DataView(result.buffer, offset + 8 + chunkLength).setUint32(0, newCrc);
      break;
    }

    offset += 8 + chunkLength + 4;
  }

  return result.buffer;
};

const compressImageData = (imageData: ImageData, quality: number): ImageData => {
  if (quality >= 100) return imageData;

  const data = new Uint8ClampedArray(imageData.data);
  const quantizationLevel = Math.max(2, Math.floor((quality / 100) * 254) + 2);
  const step = 256 / quantizationLevel;

  for (let i = 0; i < data.length; i += 4) {
    data[i] = Math.floor(data[i] / step) * step;
    data[i + 1] = Math.floor(data[i + 1] / step) * step;
    data[i + 2] = Math.floor(data[i + 2] / step) * step;
  }

  return new ImageData(data, imageData.width, imageData.height);
};

const fileToImageData = async (file: File, width?: number, height?: number): Promise<ImageData> => {
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  if (!ctx) {
    throw new Error('无法创建 canvas context');
  }

  // 优先 createImageBitmap（更快、无 ObjectURL）
  if (typeof createImageBitmap !== 'undefined') {
    const bitmap = await createImageBitmap(file);
    canvas.width = width ?? bitmap.width;
    canvas.height = height ?? bitmap.height;
    ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    bitmap.close?.();
    return ctx.getImageData(0, 0, canvas.width, canvas.height);
  }

  const objectUrl = URL.createObjectURL(file);
  try {
    const img = new Image();
    img.decoding = 'async';
    img.src = objectUrl;
    await new Promise<void>((resolve, reject) => {
      img.onload = () => resolve();
      img.onerror = () => reject(new Error('图片加载失败'));
    });

    canvas.width = width ?? img.width;
    canvas.height = height ?? img.height;
    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
    return ctx.getImageData(0, 0, canvas.width, canvas.height);
  } finally {
    URL.revokeObjectURL(objectUrl);
  }
};

const generateApng = async (frames: FrameItem[], config: ApngConfig): Promise<Blob> => {
  if (frames.length === 0) {
    throw new Error('请先上传 PNG 图片');
  }

  const upngAny = (UPNG as any)?.default ?? UPNG;
  if (!upngAny || typeof upngAny.encode !== 'function') {
    throw new Error('UPNG.encode 不可用：依赖导入异常（请刷新或重启开发服务后重试）');
  }

  const firstImage = await fileToImageData(frames[0].file);
  const width = firstImage.width;
  const height = firstImage.height;

  const imageDataArray: ImageData[] = [firstImage];
  for (let i = 1; i < frames.length; i++) {
    imageDataArray.push(await fileToImageData(frames[i].file, width, height));
  }

  const processedFrames = imageDataArray.map((img) => compressImageData(img, config.quality));
  const buffers = processedFrames.map((img) => {
    const buffer = new ArrayBuffer(img.data.length);
    new Uint8Array(buffer).set(img.data);
    return buffer;
  });

  const delay = Math.round(1000 / Math.max(1, config.fps));
  const delays = new Array(frames.length).fill(delay);

  const apngBuffer = upngAny.encode(buffers, width, height, 0, delays) as ArrayBuffer;
  const modified = setApngLoopCount(apngBuffer, config.loops);
  return new Blob([modified], { type: 'image/apng' });
};

export const Png2ApngModal: React.FC<Png2ApngModalProps> = ({ onClose }) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const framesRef = useRef<FrameItem[]>([]);
  const previewUrlRef = useRef<string | null>(null);
  const [frames, setFrames] = useState<FrameItem[]>([]);
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState<{ id: string; position: 'above' | 'below' } | null>(null);
  const [config, setConfig] = useState<ApngConfig>({ fps: 15, loops: 0, quality: 80 });
  const [isGenerating, setIsGenerating] = useState(false);
  const [apngBlob, setApngBlob] = useState<Blob | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const totalSizeBytes = useMemo(() => frames.reduce((sum, f) => sum + f.file.size, 0), [frames]);

  const clearResult = () => {
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setPreviewUrl(null);
    setApngBlob(null);
  };

  const cleanupFramePreviews = (items: FrameItem[]) => {
    for (const f of items) {
      URL.revokeObjectURL(f.previewUrl);
    }
  };

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  useEffect(() => {
    framesRef.current = frames;
  }, [frames]);

  useEffect(() => {
    previewUrlRef.current = previewUrl;
  }, [previewUrl]);

  useEffect(() => {
    return () => {
      cleanupFramePreviews(framesRef.current);
      if (previewUrlRef.current) URL.revokeObjectURL(previewUrlRef.current);
    };
  }, []);

  const addFiles = async (fileList: FileList | File[]) => {
    const incoming = Array.from(fileList).filter(isPng);
    if (incoming.length === 0) {
      setError('未检测到 PNG 图片，请重新选择');
      return;
    }

    setError(null);
    clearResult();

    // 按文件名做自然排序，更符合“序列帧”预期
    incoming.sort((a, b) => collator.compare(a.name, b.name));
    const newItems: FrameItem[] = incoming.map((file) => ({
      id: createId(),
      file,
      name: file.name,
      previewUrl: URL.createObjectURL(file),
    }));

    setFrames((prev) => [...prev, ...newItems]);
  };

  const removeFrame = (id: string) => {
    setFrames((prev) => {
      const target = prev.find((f) => f.id === id);
      if (target) URL.revokeObjectURL(target.previewUrl);
      const next = prev.filter((f) => f.id !== id);
      if (next.length === 0) {
        clearResult();
        setError(null);
      } else {
        clearResult();
      }
      return next;
    });
  };

  const moveFrame = (id: string, direction: 'up' | 'down') => {
    setFrames((prev) => {
      const index = prev.findIndex((f) => f.id === id);
      if (index < 0) return prev;
      const nextIndex = direction === 'up' ? index - 1 : index + 1;
      if (nextIndex < 0 || nextIndex >= prev.length) return prev;
      const next = prev.slice();
      const [item] = next.splice(index, 1);
      next.splice(nextIndex, 0, item);
      clearResult();
      return next;
    });
  };

  const computeInsertPosition = (e: React.DragEvent, targetEl: HTMLElement): 'above' | 'below' => {
    const rect = targetEl.getBoundingClientRect();
    const midY = rect.top + rect.height / 2;
    return e.clientY < midY ? 'above' : 'below';
  };

  const reorderFrames = (items: FrameItem[], sourceId: string, targetId: string, position: 'above' | 'below'): FrameItem[] => {
    if (sourceId === targetId) return items;
    const sourceItem = items.find((f) => f.id === sourceId);
    if (!sourceItem) return items;

    const without = items.filter((f) => f.id !== sourceId);
    const targetIndex = without.findIndex((f) => f.id === targetId);
    if (targetIndex < 0) return items;

    const insertIndex = position === 'below' ? targetIndex + 1 : targetIndex;
    without.splice(insertIndex, 0, sourceItem);
    return without;
  };

  const beginDrag = (id: string) => (e: React.DragEvent) => {
    if (isGenerating) return;
    setDraggingId(id);
    setDragOver(null);
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', id);
  };

  const endDrag = () => {
    setDraggingId(null);
    setDragOver(null);
  };

  const clearAll = () => {
    if (frames.length === 0) return;
    if (!confirm('确定要清空所有图片吗？')) return;
    cleanupFramePreviews(frames);
    setFrames([]);
    clearResult();
    setError(null);
  };

  const handleGenerate = async () => {
    if (frames.length === 0) {
      setError('请先上传 PNG 图片');
      return;
    }

    setIsGenerating(true);
    setError(null);
    clearResult();

    try {
      const blob = await generateApng(frames, config);
      setApngBlob(blob);
      setPreviewUrl(URL.createObjectURL(blob));
    } catch (e) {
      const message = e instanceof Error ? e.message : '生成失败，请重试';
      setError(message);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleDownload = () => {
    if (!apngBlob) return;
    downloadBlob(apngBlob, `animation_${Date.now()}.png`);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4" onClick={onClose}>
      <div
        className="bg-white rounded-2xl shadow-2xl w-full max-w-6xl h-[90vh] overflow-hidden flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between">
          <div className="font-medium text-gray-800 flex items-center gap-2">
            <FileImage className="w-5 h-5 text-emerald-600" />
            PNG 转 APNG
          </div>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-xl transition-colors" title="关闭">
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto bg-gray-50">
          <div className="p-6 grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* 上传与帧列表 */}
            <div className="lg:col-span-2 space-y-4">
              <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <Upload className="w-5 h-5 text-blue-600" />
                    <h3 className="font-medium text-gray-900">上传 PNG 序列帧</h3>
                  </div>
                  {frames.length > 0 && (
                    <button
                      onClick={clearAll}
                      className="flex items-center gap-1 px-3 py-1.5 text-sm text-red-600 hover:text-red-700 hover:bg-red-50 rounded-lg transition-colors"
                    >
                      <Trash2 className="w-4 h-4" />
                      清空
                    </button>
                  )}
                </div>

                <div
                  className={`border-2 border-dashed rounded-2xl p-8 text-center cursor-pointer transition-colors ${isGenerating ? 'opacity-60 pointer-events-none' : 'border-gray-200 hover:border-blue-300 hover:bg-blue-50/30'
                    }`}
                  onClick={() => fileInputRef.current?.click()}
                  onDragOver={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                  }}
                  onDrop={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    void addFiles(e.dataTransfer.files);
                  }}
                >
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/png"
                    multiple
                    className="hidden"
                    onChange={(e) => {
                      if (e.target.files) void addFiles(e.target.files);
                      e.target.value = '';
                    }}
                  />
                  <div className="flex flex-col items-center gap-3">
                    <div className="w-14 h-14 rounded-2xl bg-blue-50 flex items-center justify-center">
                      <Upload className="w-7 h-7 text-blue-600" />
                    </div>
                    <div className="text-gray-700">
                      <div className="font-medium">拖拽 PNG 到此处，或点击选择</div>
                      <div className="text-sm text-gray-500 mt-1">支持多选；将按文件名自动排序</div>
                    </div>
                  </div>
                </div>

                {frames.length > 0 && (
                  <div className="mt-4 flex items-center justify-between text-sm text-gray-600">
                    <span>
                      已上传 <span className="font-medium text-gray-900">{frames.length}</span> 张
                    </span>
                    <span>总大小 {(totalSizeBytes / 1024 / 1024).toFixed(2)} MB</span>
                  </div>
                )}
              </div>

              <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
                <div className="flex items-center justify-between mb-4">
                  <div className="font-medium text-gray-900">帧列表（生成时会按此顺序）</div>
                  {frames.length > 0 && <div className="text-sm text-gray-500">{Math.max(0, frames.length / config.fps).toFixed(1)} 秒</div>}
                </div>

                {frames.length === 0 ? (
                  <div className="text-sm text-gray-500 py-10 text-center">暂无图片，请先上传 PNG</div>
                ) : (
                  <div className="space-y-2">
                    {frames.map((frame, index) => (
                      <div
                        key={frame.id}
                        onDragOver={(e) => {
                          if (!draggingId || draggingId === frame.id || isGenerating) return;
                          e.preventDefault();
                          e.stopPropagation();
                          const position = computeInsertPosition(e, e.currentTarget);
                          setDragOver({ id: frame.id, position });
                          e.dataTransfer.dropEffect = 'move';
                        }}
                        onDrop={(e) => {
                          if (isGenerating) return;
                          e.preventDefault();
                          e.stopPropagation();

                          const sourceId = draggingId || e.dataTransfer.getData('text/plain');
                          if (!sourceId || sourceId === frame.id) return;

                          const position = dragOver?.id === frame.id ? dragOver.position : computeInsertPosition(e, e.currentTarget);
                          setFrames((prev) => reorderFrames(prev, sourceId, frame.id, position));
                          clearResult();
                          setDraggingId(null);
                          setDragOver(null);
                        }}
                        onDragLeave={(e) => {
                          if (dragOver?.id !== frame.id) return;
                          const related = e.relatedTarget as HTMLElement | null;
                          if (related && e.currentTarget.contains(related)) return;
                          setDragOver(null);
                        }}
                        className={`relative flex items-center gap-3 p-3 rounded-xl border bg-gray-50 transition-colors ${
                          draggingId === frame.id ? 'opacity-60' : ''
                        } ${dragOver?.id === frame.id ? 'border-blue-200 bg-blue-50/40' : 'border-gray-100'}`}
                      >
                        {dragOver?.id === frame.id && (
                          <div
                            className={`absolute left-3 right-3 h-0.5 bg-blue-500 rounded-full ${
                              dragOver.position === 'above' ? 'top-0' : 'bottom-0'
                            }`}
                          />
                        )}

                        <div
                          draggable={!isGenerating}
                          onDragStart={beginDrag(frame.id)}
                          onDragEnd={endDrag}
                          className={`p-2 rounded-lg transition-colors ${
                            isGenerating
                              ? 'text-gray-300 cursor-not-allowed'
                              : 'text-gray-400 hover:bg-white hover:text-gray-700 cursor-grab active:cursor-grabbing'
                          }`}
                          title="拖拽排序"
                        >
                          <GripVertical className="w-4 h-4" />
                        </div>

                        <div className="w-8 h-8 rounded-lg bg-blue-100 text-blue-700 flex items-center justify-center text-sm font-medium">
                          {index + 1}
                        </div>
                        <div
                          draggable={!isGenerating}
                          onDragStart={beginDrag(frame.id)}
                          onDragEnd={endDrag}
                          className={`w-16 h-16 rounded-xl overflow-hidden border bg-white shrink-0 ${
                            isGenerating ? '' : 'cursor-grab active:cursor-grabbing'
                          }`}
                          title="拖拽排序"
                        >
                          <img src={frame.previewUrl} alt={frame.name} className="w-full h-full object-cover" loading="lazy" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="text-sm font-medium text-gray-800 truncate">{frame.name}</div>
                          <div className="text-xs text-gray-500 mt-1">{(frame.file.size / 1024).toFixed(1)} KB</div>
                        </div>
                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => moveFrame(frame.id, 'up')}
                            disabled={index === 0}
                            className={`p-2 rounded-lg transition-colors ${index === 0 ? 'text-gray-300 cursor-not-allowed' : 'text-gray-500 hover:bg-white hover:text-gray-800'}`}
                            title="上移"
                          >
                            <ArrowUp className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => moveFrame(frame.id, 'down')}
                            disabled={index === frames.length - 1}
                            className={`p-2 rounded-lg transition-colors ${index === frames.length - 1 ? 'text-gray-300 cursor-not-allowed' : 'text-gray-500 hover:bg-white hover:text-gray-800'
                              }`}
                            title="下移"
                          >
                            <ArrowDown className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => removeFrame(frame.id)}
                            className="p-2 rounded-lg text-gray-500 hover:bg-white hover:text-red-600 transition-colors"
                            title="删除"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* 参数与结果 */}
            <div className="space-y-4">
              <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
                <div className="flex items-center gap-2 mb-4">
                  <Settings className="w-5 h-5 text-green-600" />
                  <div className="font-medium text-gray-900">动画参数</div>
                </div>

                <div className="space-y-5">
                  <div>
                    <label className="text-sm font-medium text-gray-700">帧率（FPS）</label>
                    <div className="mt-2 flex items-center gap-3">
                      <input
                        type="range"
                        min={1}
                        max={60}
                        value={config.fps}
                        onChange={(e) => setConfig((p) => ({ ...p, fps: Math.max(1, Number(e.target.value)) }))}
                        className="flex-1"
                      />
                      <input
                        type="number"
                        min={1}
                        max={60}
                        value={config.fps}
                        onChange={(e) => setConfig((p) => ({ ...p, fps: Math.max(1, Number(e.target.value) || 1) }))}
                        className="w-16 px-2 py-1 text-sm border border-gray-200 rounded-lg"
                      />
                    </div>
                    <div className="text-xs text-gray-500 mt-1">推荐 10–30 FPS</div>
                  </div>

                  <div>
                    <label className="text-sm font-medium text-gray-700">循环次数</label>
                    <select
                      value={config.loops}
                      onChange={(e) => setConfig((p) => ({ ...p, loops: Number(e.target.value) }))}
                      className="mt-2 w-full px-3 py-2 border border-gray-200 rounded-xl bg-white"
                    >
                      <option value={0}>无限循环</option>
                      <option value={1}>播放 1 次</option>
                      <option value={2}>播放 2 次</option>
                      <option value={3}>播放 3 次</option>
                    </select>
                  </div>

                  <div>
                    <label className="text-sm font-medium text-gray-700">压缩质量（{config.quality}%）</label>
                    <input
                      type="range"
                      min={10}
                      max={100}
                      value={config.quality}
                      onChange={(e) => setConfig((p) => ({ ...p, quality: Number(e.target.value) }))}
                      className="mt-2 w-full"
                    />
                    <div className="text-xs text-gray-500 mt-1">质量越高越清晰，但文件更大</div>
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
                <div className="font-medium text-gray-900 mb-3">生成与预览</div>

                <button
                  onClick={handleGenerate}
                  disabled={isGenerating || frames.length === 0}
                  className={`w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl font-medium transition-all ${isGenerating || frames.length === 0
                      ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                      : 'bg-emerald-600 text-white hover:bg-emerald-700 shadow-sm'
                    }`}
                >
                  {isGenerating ? <Loader2 className="w-5 h-5 animate-spin" /> : <FileImage className="w-5 h-5" />}
                  {isGenerating ? '正在生成…' : '生成 APNG'}
                </button>

                {apngBlob && (
                  <button
                    onClick={handleDownload}
                    className="mt-3 w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl font-medium bg-blue-600 text-white hover:bg-blue-700 transition-colors"
                  >
                    <Download className="w-5 h-5" />
                    下载 PNG（APNG）
                  </button>
                )}

                {error && (
                  <div className="mt-3 p-3 rounded-xl bg-red-50 border border-red-100 text-sm text-red-700">{error}</div>
                )}

                {previewUrl && (
                  <div className="mt-4">
                    <div className="text-sm text-gray-600 mb-2">预览</div>
                    <div className="bg-gray-50 border border-gray-100 rounded-xl p-3 flex justify-center">
                      <img src={previewUrl} alt="APNG预览" className="max-w-full max-h-64 rounded-lg bg-white" style={{ imageRendering: 'pixelated' }} />
                    </div>
                    {apngBlob && (
                      <div className="mt-3 text-xs text-gray-500">
                        文件大小 {(apngBlob.size / 1024 / 1024).toFixed(2)} MB · {frames.length} 帧 · {(frames.length / config.fps).toFixed(1)} 秒
                      </div>
                    )}
                  </div>
                )}
              </div>

              <div className="text-xs text-gray-500 px-1">
                提示：可拖拽帧列表调整顺序；请确保所有帧尺寸一致（不一致会按第一帧尺寸缩放合成）。
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

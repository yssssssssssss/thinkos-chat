import React, { useEffect, useMemo, useState } from 'react';
import { Upload, Image as ImageIcon } from 'lucide-react';
import { ImageNodeData } from '../../types';
import { fileToBase64 } from '../../services/geminiService';
import { deleteNodeImages, loadNodeImages, persistNodeImages } from '../../utils/imageStorage';
import { useVisibility } from '../../utils/useVisibility';

interface ImageNodeProps {
  nodeId: string;
  data: ImageNodeData;
  updateData: (newData: Partial<ImageNodeData>) => void;
}

const isHttpUrl = (value: string): boolean => /^https?:\/\//i.test((value || '').trim());
const isDataUrl = (value: string): boolean => /^data:/i.test((value || '').trim());
const MAX_DIMENSION = 1600;

const toImageList = (imageData: ImageNodeData['imageData']): string[] => {
  if (!imageData) return [];
  return Array.isArray(imageData) ? imageData.filter(Boolean) : [imageData];
};

const parseImageInputs = (raw: string): string[] => {
  const normalized = (raw || '').replace(/\r\n/g, '\n').trim();
  if (!normalized) return [];
  return normalized
    .split(/\s*\n+\s*/g)
    .map(s => s.trim())
    .filter(Boolean);
};

const downscaleDataUrl = async (dataUrl: string): Promise<string> => {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      const { naturalWidth: w, naturalHeight: h } = img;
      const maxSide = Math.max(w, h);
      if (!maxSide || maxSide <= MAX_DIMENSION) {
        resolve(dataUrl);
        return;
      }
      const scale = MAX_DIMENSION / maxSide;
      const canvas = document.createElement('canvas');
      canvas.width = Math.round(w * scale);
      canvas.height = Math.round(h * scale);
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        resolve(dataUrl);
        return;
      }
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      resolve(canvas.toDataURL('image/jpeg', 0.82));
    };
    img.onerror = () => resolve(dataUrl);
    img.src = dataUrl;
  });
};

const ImageNode: React.FC<ImageNodeProps> = ({ nodeId, data, updateData }) => {
  const images = useMemo(() => toImageList(data.imageData), [data.imageData]);
  const initialUrlText = useMemo(() => images.filter(isHttpUrl).join('\n'), [images]);
  const [urlInput, setUrlInput] = useState(initialUrlText);
  const [showInputEditor, setShowInputEditor] = useState(!images.length);
  const { targetRef, isVisible } = useVisibility({ rootMargin: '320px' });

  useEffect(() => {
    let cancelled = false;
    if (images.length) return;
    loadNodeImages(nodeId).then((saved) => {
      if (cancelled || !saved || !saved.length) return;
      const next = saved.length === 1 ? saved[0] : saved;
      updateData({ imageData: next });
    });
    return () => {
      cancelled = true;
    };
  }, [images.length, nodeId, updateData]);

  useEffect(() => {
    setUrlInput(initialUrlText);
  }, [initialUrlText]);

  useEffect(() => {
    if (!images.length) setShowInputEditor(true);
  }, [images.length]);

  const persistAndSet = async (list: string[]) => {
    const normalized = list.filter(Boolean);
    const nextValue = normalized.length === 1 ? normalized[0] : normalized.length ? normalized : null;
    updateData({ imageData: nextValue });
    if (normalized.length) {
      await persistNodeImages(nodeId, normalized);
    } else {
      await deleteNodeImages(nodeId);
    }
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files: File[] = e.target.files ? Array.from(e.target.files) : [];
    if (!files.length) return;

    const base64List = await Promise.all(files.map(file => fileToBase64(file)));
    const optimized = await Promise.all(base64List.map(downscaleDataUrl));
    await persistAndSet(optimized);
  };

  const applyUrl = () => {
    const inputs = parseImageInputs(urlInput);
    if (!inputs.length) return;

    const invalid = inputs.find(v => !(isHttpUrl(v) || isDataUrl(v)));
    if (invalid) {
      alert('请输入可访问的图片 URL（http/https），或 Base64 DataURL（data:image/<format>;base64,...）');
      return;
    }

    void persistAndSet(inputs);
    setShowInputEditor(false);
  };

  const clearImage = () => {
    setUrlInput('');
    setShowInputEditor(true);
    void persistAndSet([]);
  };

  const removeAt = (indexToRemove: number) => {
    const next = images.filter((_, idx) => idx !== indexToRemove);
    void persistAndSet(next);
  };

  return (
    <div className="flex flex-col gap-2 h-full">
      <div ref={targetRef} className="relative flex-1 min-h-0">
        {images.length ? (
          isVisible ? (
            <div className="relative group h-full">
              {images.length === 1 ? (
                <img 
                  src={images[0]} 
                  alt="Uploaded" 
                  className="w-full h-full object-contain rounded-2xl border border-gray-700 bg-black/40"
                  loading="lazy"
                  decoding="async"
                />
              ) : (
                <div className="grid grid-cols-2 gap-2 w-full h-full overflow-auto rounded-2xl border border-gray-700 bg-black/40 p-2">
                  {images.map((src, idx) => (
                    <div key={`${idx}-${src.slice(0, 24)}`} className="relative aspect-video rounded-xl overflow-hidden border border-gray-700 bg-black/30">
                      <img src={src} alt={`Uploaded ${idx + 1}`} className="w-full h-full object-cover" loading="lazy" decoding="async" />
                      <button
                        onClick={() => removeAt(idx)}
                        className="absolute top-1 right-1 bg-red-500/80 px-2 py-1 rounded-lg text-xs text-white opacity-0 group-hover:opacity-100 transition backdrop-blur-sm hover:bg-red-500"
                        title="移除此图"
                      >
                        移除
                      </button>
                    </div>
                  ))}
                </div>
              )}

              <button 
                onClick={clearImage}
                className="absolute top-2 right-2 bg-red-500/80 p-1.5 rounded-full text-white opacity-0 group-hover:opacity-100 transition backdrop-blur-sm hover:bg-red-500"
                title="清空图片"
              >
                <Upload size={14} className="rotate-45" /> 
              </button>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center w-full h-full min-h-[100px] rounded-2xl border border-dashed border-gray-700 bg-black/30 text-gray-400 text-xs">
              <p className="font-semibold text-gray-200">离屏暂停渲染</p>
              <p className="opacity-75">{images.length} 张图片</p>
            </div>
          )
        ) : (
          <label className="flex flex-col items-center justify-center w-full h-full min-h-[100px] border-2 border-dashed border-gray-700 rounded-2xl cursor-pointer hover:border-gray-500 hover:bg-gray-900/50 transition group">
            <div className="flex flex-col items-center justify-center pt-5 pb-6">
              <div className="p-3 rounded-full bg-black/20 group-hover:bg-black/40 transition mb-3">
                <ImageIcon className="w-6 h-6 text-gray-400 group-hover:text-white" />
              </div>
              <p className="text-xs text-gray-400 group-hover:text-gray-300">点击上传图片（支持多选）</p>
            </div>
            <input type="file" className="hidden" accept="image/*" multiple onChange={handleFileChange} />
          </label>
        )}
      </div>

      <div className="flex items-center justify-between gap-2">
        <button
          onClick={() => setShowInputEditor(v => !v)}
          className="px-3 py-2 rounded-xl bg-black/20 hover:bg-black/30 border border-gray-700 text-sm text-gray-200 transition"
          title="展开/收起输入"
        >
          {showInputEditor ? '收起输入' : '粘贴 URL/Base64'}
        </button>
        <div className="text-xs text-gray-500">
          {images.length ? `已加载 ${images.length} 张` : '未加载图片'}
        </div>
      </div>

      {showInputEditor ? (
        <div className="flex items-center gap-2">
          <textarea
            value={urlInput}
            onChange={(e) => setUrlInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) applyUrl();
            }}
            placeholder="粘贴图片 URL（每行一个，http/https）或 Base64 DataURL（data:image/<format>;base64,...）"
            rows={2}
            className="flex-1 px-3 py-2 rounded-xl bg-black/20 border border-gray-700 text-sm text-gray-200 placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500/40 resize-none"
          />
          <button
            onClick={applyUrl}
            className="px-3 py-2 rounded-xl bg-blue-600/80 hover:bg-blue-600 text-sm text-white transition"
            title="应用输入（Ctrl/Cmd+Enter）"
          >
            应用
          </button>
        </div>
      ) : null}
    </div>
  );
};

export default ImageNode;

/**
 * GlassMosaic 面板
 * 玻璃马赛克效果工具
 */

import React, { useState, useRef } from 'react';
import { X, Palette, Upload, Download, Sliders } from 'lucide-react';

interface GlassMosaicPanelProps {
  onClose: () => void;
}

export const GlassMosaicPanel: React.FC<GlassMosaicPanelProps> = ({ onClose }) => {
  const [image, setImage] = useState<string | null>(null);
  const [blockSize, setBlockSize] = useState(20);
  const [opacity, setOpacity] = useState(0.8);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        setImage(event.target?.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const applyEffect = () => {
    if (!image || !canvasRef.current) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const img = new Image();
    img.onload = () => {
      canvas.width = img.width;
      canvas.height = img.height;
      ctx.drawImage(img, 0, 0);

      // 简单的马赛克效果
      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      const data = imageData.data;

      for (let y = 0; y < canvas.height; y += blockSize) {
        for (let x = 0; x < canvas.width; x += blockSize) {
          // 获取块的平均颜色
          let r = 0, g = 0, b = 0, count = 0;
          for (let dy = 0; dy < blockSize && y + dy < canvas.height; dy++) {
            for (let dx = 0; dx < blockSize && x + dx < canvas.width; dx++) {
              const i = ((y + dy) * canvas.width + (x + dx)) * 4;
              r += data[i];
              g += data[i + 1];
              b += data[i + 2];
              count++;
            }
          }
          r = Math.round(r / count);
          g = Math.round(g / count);
          b = Math.round(b / count);

          // 填充块
          for (let dy = 0; dy < blockSize && y + dy < canvas.height; dy++) {
            for (let dx = 0; dx < blockSize && x + dx < canvas.width; dx++) {
              const i = ((y + dy) * canvas.width + (x + dx)) * 4;
              data[i] = r;
              data[i + 1] = g;
              data[i + 2] = b;
              data[i + 3] = Math.round(255 * opacity);
            }
          }
        }
      }

      ctx.putImageData(imageData, 0, 0);
    };
    img.src = image;
  };

  const downloadImage = () => {
    if (!canvasRef.current) return;
    const link = document.createElement('a');
    link.download = `glass-mosaic-${Date.now()}.png`;
    link.href = canvasRef.current.toDataURL();
    link.click();
  };

  return (
    <div className="bg-white rounded-2xl shadow-xl border border-gray-100 p-4 max-h-96 overflow-hidden flex flex-col">
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-medium text-gray-800 flex items-center gap-2">
          <Palette className="w-4 h-4 text-indigo-500" />
          GlassMosaic
        </h3>
        <button onClick={onClose} className="p-1 hover:bg-gray-100 rounded-lg">
          <X className="w-4 h-4 text-gray-400" />
        </button>
      </div>

      {!image ? (
        <label className="flex-1 flex flex-col items-center justify-center border-2 border-dashed border-gray-200 rounded-xl cursor-pointer hover:border-indigo-300 transition py-8">
          <Upload className="w-8 h-8 text-gray-300 mb-2" />
          <span className="text-sm text-gray-400">点击上传图片</span>
          <input type="file" className="hidden" accept="image/*" onChange={handleFileChange} />
        </label>
      ) : (
        <>
          {/* 参数调节 */}
          <div className="space-y-3 mb-3">
            <div className="flex items-center gap-3">
              <Sliders className="w-4 h-4 text-gray-400" />
              <span className="text-xs text-gray-500 w-16">块大小</span>
              <input
                type="range"
                min="5"
                max="50"
                value={blockSize}
                onChange={(e) => setBlockSize(Number(e.target.value))}
                className="flex-1"
              />
              <span className="text-xs text-gray-500 w-8">{blockSize}</span>
            </div>
            <div className="flex items-center gap-3">
              <Sliders className="w-4 h-4 text-gray-400" />
              <span className="text-xs text-gray-500 w-16">透明度</span>
              <input
                type="range"
                min="0.1"
                max="1"
                step="0.1"
                value={opacity}
                onChange={(e) => setOpacity(Number(e.target.value))}
                className="flex-1"
              />
              <span className="text-xs text-gray-500 w-8">{opacity}</span>
            </div>
          </div>

          {/* 预览 */}
          <div className="flex-1 overflow-hidden rounded-xl bg-gray-100 mb-3">
            <canvas ref={canvasRef} className="max-w-full max-h-40 mx-auto" />
          </div>

          {/* 操作按钮 */}
          <div className="flex gap-2">
            <button
              onClick={() => setImage(null)}
              className="flex-1 py-2 text-sm text-gray-500 bg-gray-100 rounded-xl hover:bg-gray-200 transition"
            >
              重新选择
            </button>
            <button
              onClick={applyEffect}
              className="flex-1 py-2 text-sm text-white bg-indigo-500 rounded-xl hover:bg-indigo-600 transition"
            >
              应用效果
            </button>
            <button
              onClick={downloadImage}
              className="p-2 text-indigo-500 bg-indigo-50 rounded-xl hover:bg-indigo-100 transition"
            >
              <Download className="w-4 h-4" />
            </button>
          </div>
        </>
      )}
    </div>
  );
};

/**
 * 图像编辑弹窗组件
 * 支持 Refine（优化提示词）、Inpaint（局部重绘）、Remix（风格混合）三种模式
 * 
 * 尺寸控制说明：
 * - 弹窗宽度：max-w-5xl (1024px) - 在弹窗容器的 className 中
 * - 画布容器高度：maxHeight: '75vh' - 在画布容器的 style 中
 * - 图片最大高度：maxHeight: '70vh' - 在 img 标签的 style 中
 * - 画布分辨率：width={1024} height={1024} - 在 canvas 标签中
 */

import React, { useState, useRef, useEffect } from 'react';
import { X, Wand2, Edit2, Sliders, Loader2, Send } from 'lucide-react';
import { editImageWithGeminiFlash, editImageWithSeedream } from '../../../../services/geminiImageService';
import { saveImageSilently } from '../../../../utils/imageStorage';
import { log } from '../../../../utils/logger';

type EditAction = 'refine' | 'inpaint' | 'remix';

interface ImageEditModalProps {
  imageUrl: string;
  action: EditAction;
  onClose: () => void;
  onComplete: (newImageUrl: string, action: EditAction, prompt: string) => void;
}

// 简单的绘图画布组件
const SimpleDrawingCanvas: React.FC<{
  imageUrl: string;
  onMaskChange: (maskDataUrl: string) => void;
}> = ({ imageUrl, onMaskChange }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const maskCanvasRef = useRef<HTMLCanvasElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [brushSize, setBrushSize] = useState(40);

  useEffect(() => {
    const canvas = canvasRef.current;
    const maskCanvas = maskCanvasRef.current;
    if (!canvas || !maskCanvas) return;

    // 初始化遮罩画布为黑色
    const maskCtx = maskCanvas.getContext('2d');
    if (maskCtx) {
      maskCtx.fillStyle = 'black';
      maskCtx.fillRect(0, 0, maskCanvas.width, maskCanvas.height);
    }
  }, []);

  const getCoordinates = (e: React.MouseEvent<HTMLCanvasElement>): { x: number; y: number } => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    return {
      x: (e.clientX - rect.left) * scaleX,
      y: (e.clientY - rect.top) * scaleY
    };
  };

  const startDrawing = (e: React.MouseEvent<HTMLCanvasElement>): void => {
    setIsDrawing(true);
    draw(e);
  };

  const draw = (e: React.MouseEvent<HTMLCanvasElement>): void => {
    if (!isDrawing && e.type !== 'mousedown') return;
    
    const { x, y } = getCoordinates(e);
    const canvas = canvasRef.current;
    const maskCanvas = maskCanvasRef.current;
    
    if (canvas && maskCanvas) {
      // 在可见画布上绘制半透明绿色
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.fillStyle = 'rgba(0, 255, 0, 0.5)';
        ctx.beginPath();
        ctx.arc(x, y, brushSize / 2, 0, Math.PI * 2);
        ctx.fill();
      }
      
      // 在遮罩画布上绘制白色
      const maskCtx = maskCanvas.getContext('2d');
      if (maskCtx) {
        maskCtx.fillStyle = 'white';
        maskCtx.beginPath();
        maskCtx.arc(x, y, brushSize / 2, 0, Math.PI * 2);
        maskCtx.fill();
      }
    }
  };

  const stopDrawing = (): void => {
    if (isDrawing) {
      setIsDrawing(false);
      // 导出遮罩
      const maskCanvas = maskCanvasRef.current;
      if (maskCanvas) {
        onMaskChange(maskCanvas.toDataURL('image/png'));
      }
    }
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-4">
        <label className="text-sm text-gray-600">画笔大小:</label>
        <input
          type="range"
          min="10"
          max="150"
          value={brushSize}
          onChange={(e: React.ChangeEvent<HTMLInputElement>) => setBrushSize(Number(e.target.value))}
          className="flex-1"
        />
        <span className="text-sm text-gray-500 w-8">{brushSize}</span>
      </div>
      {/* 画布容器 - 高度控制在这里，使用视口高度单位 */}
      <div className="relative bg-gray-100 rounded-lg overflow-hidden" style={{ maxHeight: '75vh' }}>
        <img 
          src={imageUrl} 
          alt="Edit" 
          className="w-full h-auto object-contain pointer-events-none"
          style={{ maxHeight: '70vh' }}
        />
        <canvas
          ref={canvasRef}
          width={1024}
          height={1024}
          onMouseDown={startDrawing}
          onMouseMove={draw}
          onMouseUp={stopDrawing}
          onMouseLeave={stopDrawing}
          className="absolute inset-0 w-full h-full cursor-crosshair"
          style={{ objectFit: 'contain' }}
        />
        <canvas
          ref={maskCanvasRef}
          width={1024}
          height={1024}
          className="hidden"
        />
      </div>
      <p className="text-xs text-gray-500 text-center">在图片上绘制要修改的区域（绿色标记）</p>
    </div>
  );
};

export const ImageEditModal: React.FC<ImageEditModalProps> = ({
  imageUrl,
  action,
  onClose,
  onComplete,
}) => {
  const [prompt, setPrompt] = useState('');
  const [maskDataUrl, setMaskDataUrl] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const getTitle = () => {
    switch (action) {
      case 'refine': return '优化图像';
      case 'inpaint': return '局部重绘';
      case 'remix': return '风格混合';
    }
  };

  const getIcon = () => {
    switch (action) {
      case 'refine': return <Wand2 className="w-5 h-5" />;
      case 'inpaint': return <Edit2 className="w-5 h-5" />;
      case 'remix': return <Sliders className="w-5 h-5" />;
    }
  };

  const getPlaceholder = () => {
    switch (action) {
      case 'refine': return '描述你想要的优化效果，如：提高清晰度、增强色彩...';
      case 'inpaint': return '描述要在选中区域生成的内容...';
      case 'remix': return '描述想要的风格变化，如：转换为油画风格...';
    }
  };

  const handleSubmit = async () => {
    if (!prompt.trim()) {
      setError('请输入描述');
      return;
    }

    if (action === 'inpaint' && !maskDataUrl) {
      setError('请在图片上绘制要修改的区域');
      return;
    }

    setIsProcessing(true);
    setError(null);

    try {
      log.info('ImageEditModal', `开始 ${action} 操作`, { prompt: prompt.slice(0, 50) });
      
      let resultUrl: string;
      
      if (action === 'inpaint' && maskDataUrl) {
        // 使用 Gemini 进行局部重绘
        resultUrl = await editImageWithGeminiFlash(
          imageUrl,
          maskDataUrl,
          prompt
        );
      } else {
        // Refine 和 Remix 使用即梦 API
        resultUrl = await editImageWithSeedream({
          originalImage: imageUrl,
          prompt: action === 'refine' 
            ? `优化这张图片: ${prompt}` 
            : `将这张图片转换为: ${prompt}`,
          mode: action === 'remix' ? 'remix' : undefined,
        });
      }

      log.info('ImageEditModal', `${action} 操作完成`);
      
      // 静默保存编辑后的图片到 IndexedDB
      const actionName = action === 'refine' ? 'Refine' : action === 'inpaint' ? 'Inpaint' : 'Remix';
      await saveImageSilently(resultUrl, `${actionName}-编辑`, prompt);
      log.info('ImageEditModal', '编辑后的图片已保存到本地存储');
      
      // 传递结果给父组件，包含 action 和 prompt 信息
      onComplete(resultUrl, action, prompt);
      onClose();
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : '操作失败，请重试';
      setError(errorMessage);
      log.error('ImageEditModal', `${action} 操作失败`, err);
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
      onClick={onClose}
    >
      {/* 弹窗宽度控制在这里：max-w-5xl = 1024px */}
      <div 
        className="bg-white rounded-2xl shadow-2xl w-full max-w-5xl max-h-[95vh] overflow-hidden flex flex-col"
        onClick={(e: React.MouseEvent) => e.stopPropagation()}
      >
        {/* 头部 */}
        <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className={`p-2 rounded-xl ${
              action === 'refine' ? 'bg-purple-100 text-purple-600' :
              action === 'inpaint' ? 'bg-blue-100 text-blue-600' :
              'bg-green-100 text-green-600'
            }`}>
              {getIcon()}
            </div>
            <h3 className="font-semibold text-gray-800">{getTitle()}</h3>
          </div>
          <button 
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-xl transition"
          >
            <X className="w-5 h-5 text-gray-400" />
          </button>
        </div>

        {/* 内容 - 添加 flex-1 和 overflow-auto 使内容区域可滚动 */}
        <div className="p-6 space-y-4 flex-1 overflow-auto">
          {/* 原图预览 / 绘制区域 */}
          {action === 'inpaint' ? (
            <SimpleDrawingCanvas
              imageUrl={imageUrl}
              onMaskChange={setMaskDataUrl}
            />
          ) : (
            <div className="bg-gray-100 rounded-lg overflow-hidden">
              <img 
                src={imageUrl} 
                alt="Original" 
                className="w-full h-auto object-contain"
                style={{ maxHeight: '70vh' }}
              />
            </div>
          )}

          {/* 提示词输入 */}
          <div>
            <textarea
              value={prompt}
              onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setPrompt(e.target.value)}
              placeholder={getPlaceholder()}
              className="w-full px-4 py-3 border border-gray-200 rounded-xl resize-none focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
              rows={3}
            />
          </div>

          {/* 错误提示 */}
          {error && (
            <div className="px-4 py-2 bg-red-50 text-red-600 rounded-lg text-sm">
              {error}
            </div>
          )}
        </div>

        {/* 底部按钮 */}
        <div className="px-6 py-4 border-t border-gray-100 flex justify-end gap-3">
          <button
            onClick={onClose}
            className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-xl transition"
            disabled={isProcessing}
          >
            取消
          </button>
          <button
            onClick={handleSubmit}
            disabled={isProcessing || !prompt.trim()}
            className={`px-6 py-2 rounded-xl flex items-center gap-2 transition ${
              isProcessing || !prompt.trim()
                ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                : action === 'refine' ? 'bg-purple-500 text-white hover:bg-purple-600' :
                  action === 'inpaint' ? 'bg-blue-500 text-white hover:bg-blue-600' :
                  'bg-green-500 text-white hover:bg-green-600'
            }`}
          >
            {isProcessing ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                处理中...
              </>
            ) : (
              <>
                <Send className="w-4 h-4" />
                开始处理
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ImageEditModal;

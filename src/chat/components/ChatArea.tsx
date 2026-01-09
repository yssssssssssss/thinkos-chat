/**
 * 聊天区域组件
 * 显示对话消息和多模型响应结果
 */

import React, { useState } from 'react';
import { Sparkles, Loader2, Copy, RotateCcw, Download, AlertCircle, Edit2, Wand2, Sliders, X, ZoomIn } from 'lucide-react';
import { TextModelResponse, ImageModelResponse } from '../../../services/multiModelService';
import { Message } from '../../../services/conversationService';
import { MarkdownLight } from '../../../components/MarkdownLight';

type ModeType = 'text' | 'image';

// 历史消息中的响应类型
interface HistoryTextResponse {
  modelId: string;
  modelName: string;
  content: string;
  status: 'complete' | 'error';
  error?: string;
}

interface HistoryImageResponse {
  modelId: string;
  modelName: string;
  imageUrl?: string;
  prompt?: string;
  status: 'complete' | 'error';
  error?: string;
}

interface ChatAreaProps {
  activeMode: ModeType;
  showResults: boolean;
  lastPrompt: string;
  textResponses: TextModelResponse[];
  imageResponses: ImageModelResponse[];
  selectedResultImage: string | null;
  historyMessages?: Message[]; // 新增：历史消息
  onCopyText: (text: string) => void;
  onRetryTextModel: (modelId: string, modelName: string) => void;
  onRetryImageModel: (modelId: string, modelName: string) => void;
  onDownloadImage: (imageUrl: string, modelName: string) => void;
  onSelectImage: (modelId: string) => void;
  onImageAction: (imageUrl: string, action: 'refine' | 'inpaint' | 'remix') => void;
  onClosePanel?: () => void; // 新增：关闭面板回调
}

// 图片预览弹窗组件（包含编辑功能）
const ImagePreviewModal: React.FC<{
  imageUrl: string;
  modelName: string;
  onClose: () => void;
  onDownload: () => void;
  onImageAction: (action: 'refine' | 'inpaint' | 'remix') => void;
}> = ({ imageUrl, modelName, onClose, onDownload, onImageAction }) => (
  <div 
    className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm"
    onClick={onClose}
  >
    <div className="relative max-w-[90vw] max-h-[90vh]" onClick={(e: React.MouseEvent) => e.stopPropagation()}>
      {/* 关闭按钮 */}
      <button 
        onClick={onClose}
        className="absolute -top-12 right-0 p-2 text-white/80 hover:text-white transition"
      >
        <X className="w-6 h-6" />
      </button>
      
      {/* 图片 */}
      <img 
        src={imageUrl} 
        alt={modelName}
        className="max-w-full max-h-[75vh] object-contain rounded-lg shadow-2xl"
      />
      
      {/* 底部工具栏 */}
      <div className="absolute -bottom-16 left-0 right-0 flex flex-col items-center gap-3">
        <span className="text-white/60 text-sm">{modelName}</span>
        <div className="flex items-center gap-2">
          {/* 编辑按钮 */}
          <button 
            onClick={() => { onImageAction('refine'); onClose(); }}
            className="flex items-center gap-2 px-4 py-2 bg-purple-500/80 hover:bg-purple-500 text-white rounded-lg transition"
          >
            <Wand2 className="w-4 h-4" />
            Refine
          </button>
          <button 
            onClick={() => { onImageAction('inpaint'); onClose(); }}
            className="flex items-center gap-2 px-4 py-2 bg-blue-500/80 hover:bg-blue-500 text-white rounded-lg transition"
          >
            <Edit2 className="w-4 h-4" />
            Inpaint
          </button>
          <button 
            onClick={() => { onImageAction('remix'); onClose(); }}
            className="flex items-center gap-2 px-4 py-2 bg-green-500/80 hover:bg-green-500 text-white rounded-lg transition"
          >
            <Sliders className="w-4 h-4" />
            Remix
          </button>
          <button 
            onClick={onDownload}
            className="flex items-center gap-2 px-4 py-2 bg-white/10 hover:bg-white/20 text-white rounded-lg transition"
          >
            <Download className="w-4 h-4" />
            下载
          </button>
        </div>
      </div>
    </div>
  </div>
);

export const ChatArea: React.FC<ChatAreaProps> = ({
  activeMode,
  showResults,
  lastPrompt,
  textResponses,
  imageResponses,
  selectedResultImage,
  historyMessages = [], // 默认空数组
  onCopyText,
  onRetryTextModel,
  onRetryImageModel,
  onDownloadImage,
  onSelectImage,
  onImageAction,
  onClosePanel,
}) => {
  // 图片预览状态
  const [previewImage, setPreviewImage] = useState<{ url: string; modelName: string } | null>(null);

  // 获取状态指示器颜色
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'complete': return 'bg-green-400';
      case 'streaming': return 'bg-blue-400 animate-pulse';
      case 'error': return 'bg-red-400';
      default: return 'bg-gray-300';
    }
  };

  // 渲染图像操作按钮
  const renderImageActions = (imageUrl: string) => (
    <div className="flex gap-2 p-3 border-t border-gray-100">
      <button onClick={(e: React.MouseEvent) => { e.stopPropagation(); onImageAction(imageUrl, 'refine'); }} 
        className="flex-1 flex items-center justify-center gap-1.5 py-2 bg-purple-50 text-purple-600 rounded-xl text-xs font-medium hover:bg-purple-100 transition">
        <Wand2 className="w-3.5 h-3.5" />Refine
      </button>
      <button onClick={(e: React.MouseEvent) => { e.stopPropagation(); onImageAction(imageUrl, 'inpaint'); }} 
        className="flex-1 flex items-center justify-center gap-1.5 py-2 bg-blue-50 text-blue-600 rounded-xl text-xs font-medium hover:bg-blue-100 transition">
        <Edit2 className="w-3.5 h-3.5" />Inpaint
      </button>
      <button onClick={(e: React.MouseEvent) => { e.stopPropagation(); onImageAction(imageUrl, 'remix'); }} 
        className="flex-1 flex items-center justify-center gap-1.5 py-2 bg-green-50 text-green-600 rounded-xl text-xs font-medium hover:bg-green-100 transition">
        <Sliders className="w-3.5 h-3.5" />Remix
      </button>
    </div>
  );

  if (!showResults && historyMessages.length === 0) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="text-center max-w-md">
          <div className="w-20 h-20 bg-gradient-to-br from-blue-100 to-purple-100 rounded-3xl flex items-center justify-center mx-auto mb-6">
            <Sparkles className="w-10 h-10 text-blue-500" />
          </div>
          <h3 className="text-xl font-semibold text-gray-800 mb-2">开始新对话</h3>
          <p className="text-gray-500">选择下方的功能开始，支持多模型并行生成</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6" onClick={() => onClosePanel?.()}>
      {/* 渲染历史消息 */}
      {historyMessages.map((message) => (
        <div key={message.id} className="space-y-4">
          {/* 用户消息 */}
          {message.role === 'user' && (
            <div className="flex justify-end">
              <div className="max-w-[70%] bg-blue-500 text-white rounded-2xl rounded-tr-md px-5 py-3 shadow-lg shadow-blue-500/20">
                <p className="text-[15px] whitespace-pre-wrap">{message.content}</p>
                {message.referenceImage && (
                  <img 
                    src={message.referenceImage} 
                    alt="Reference" 
                    className="mt-2 rounded-lg max-w-[512px] max-h-[512px] object-cover cursor-pointer hover:opacity-90 transition"
                    onClick={(e: React.MouseEvent) => {
                      e.stopPropagation();
                      setPreviewImage({ url: message.referenceImage!, modelName: '参考图' });
                    }}
                  />
                )}
              </div>
            </div>
          )}

          {/* AI 文本响应 */}
          {message.role === 'assistant' && message.textResponses && (
            <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4">
              {message.textResponses.map((response: HistoryTextResponse) => (
                <div key={response.modelId} className="bg-white rounded-2xl border border-gray-100 overflow-hidden shadow-sm hover:shadow-md transition">
                  <div className="px-4 py-3 bg-gray-50 border-b border-gray-100 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className={`w-2 h-2 rounded-full ${response.status === 'complete' ? 'bg-green-400' : 'bg-red-400'}`} />
                      <span className="font-medium text-sm text-gray-700">{response.modelName}</span>
                    </div>
                    <button 
                      onClick={() => onCopyText(response.content)}
                      className="p-1.5 hover:bg-gray-100 rounded-lg"
                      title="复制"
                    >
                      <Copy className="w-3.5 h-3.5 text-gray-400" />
                    </button>
                  </div>
                  <div className="p-4 text-sm text-gray-600 max-h-64 overflow-y-auto">
                    {response.status === 'error' ? (
                      <div className="flex items-center gap-2 text-red-500">
                        <AlertCircle className="w-4 h-4" />
                        <span>{response.error || '生成失败'}</span>
                      </div>
                    ) : (
                      <MarkdownLight text={response.content} />
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* AI 图像响应 */}
          {message.role === 'assistant' && message.imageResponses && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {message.imageResponses.map((response: HistoryImageResponse) => (
                <div 
                  key={response.modelId} 
                  className="bg-white rounded-2xl border border-gray-100 overflow-hidden shadow-sm hover:shadow-md transition"
                >
                  <div className="px-4 py-3 bg-gray-50 border-b border-gray-100 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className={`w-2 h-2 rounded-full ${response.status === 'complete' ? 'bg-green-400' : 'bg-red-400'}`} />
                      <span className="font-medium text-sm text-gray-700">{response.modelName}</span>
                    </div>
                    <div className="flex gap-1">
                      {response.imageUrl && (
                        <>
                          <button 
                            onClick={() => setPreviewImage({ url: response.imageUrl!, modelName: response.modelName })}
                            className="p-1.5 hover:bg-gray-100 rounded-lg"
                            title="预览"
                          >
                            <ZoomIn className="w-3.5 h-3.5 text-gray-400" />
                          </button>
                          <button 
                            onClick={() => onDownloadImage(response.imageUrl!, response.modelName)}
                            className="p-1.5 hover:bg-gray-100 rounded-lg"
                            title="下载"
                          >
                            <Download className="w-3.5 h-3.5 text-gray-400" />
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                  <div 
                    className="aspect-square bg-gray-100 flex items-center justify-center cursor-pointer"
                    onClick={() => response.imageUrl && setPreviewImage({ url: response.imageUrl, modelName: response.modelName })}
                  >
                    {response.status === 'error' ? (
                      <div className="text-center text-red-400 p-4">
                        <AlertCircle className="w-8 h-8 mx-auto mb-2" />
                        <span className="text-sm">{response.error || '生成失败'}</span>
                      </div>
                    ) : response.imageUrl ? (
                      <img src={response.imageUrl} alt="Generated" className="w-full h-full object-cover" />
                    ) : (
                      <div className="text-center text-gray-400">
                        <span className="text-sm">无图像</span>
                      </div>
                    )}
                  </div>
                  {selectedResultImage === response.modelId && response.imageUrl && renderImageActions(response.imageUrl)}
                </div>
              ))}
            </div>
          )}
        </div>
      ))}

      {/* 当前生成的消息（如果有） */}
      {lastPrompt && (
        <div className="flex justify-end">
          <div className="max-w-[70%] bg-blue-500 text-white rounded-2xl rounded-tr-md px-5 py-3 shadow-lg shadow-blue-500/20">
            <p className="text-[15px] whitespace-pre-wrap">{lastPrompt}</p>
          </div>
        </div>
      )}

      {/* 文本模式结果 - 只在有响应时显示 */}
      {activeMode === 'text' && textResponses.length > 0 && (
        <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4">
          {textResponses.map((response) => (
            <div key={response.modelId} className="bg-white rounded-2xl border border-gray-100 overflow-hidden shadow-sm hover:shadow-md transition">
              <div className="px-4 py-3 bg-gray-50 border-b border-gray-100 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className={`w-2 h-2 rounded-full ${getStatusColor(response.status)}`} />
                  <span className="font-medium text-sm text-gray-700">{response.modelName}</span>
                </div>
                {response.status === 'streaming' || response.status === 'pending' ? (
                  <Loader2 className="w-4 h-4 text-blue-500 animate-spin" />
                ) : response.status === 'error' ? (
                  <button 
                    onClick={() => onRetryTextModel(response.modelId, response.modelName)}
                    className="p-1.5 hover:bg-red-50 rounded-lg"
                    title="重试"
                  >
                    <RotateCcw className="w-3.5 h-3.5 text-red-400" />
                  </button>
                ) : (
                  <div className="flex gap-1">
                    <button 
                      onClick={() => onCopyText(response.content)}
                      className="p-1.5 hover:bg-gray-100 rounded-lg"
                      title="复制"
                    >
                      <Copy className="w-3.5 h-3.5 text-gray-400" />
                    </button>
                    <button 
                      onClick={() => onRetryTextModel(response.modelId, response.modelName)}
                      className="p-1.5 hover:bg-gray-100 rounded-lg"
                      title="重试"
                    >
                      <RotateCcw className="w-3.5 h-3.5 text-gray-400" />
                    </button>
                  </div>
                )}
              </div>
              <div className="p-4 text-sm text-gray-600 max-h-64 overflow-y-auto">
                {response.status === 'pending' ? (
                  <div className="flex items-center gap-2 text-gray-400">
                    <div className="flex gap-1">
                      <div className="w-2 h-2 bg-blue-400 rounded-full animate-bounce" />
                      <div className="w-2 h-2 bg-blue-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                      <div className="w-2 h-2 bg-blue-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                    </div>
                    等待中...
                  </div>
                ) : response.status === 'streaming' ? (
                  <div>
                    <div className="whitespace-pre-wrap">{response.content || '正在思考...'}</div>
                    <span className="inline-block w-2 h-4 bg-blue-400 animate-pulse ml-1" />
                  </div>
                ) : response.status === 'error' ? (
                  <div className="flex items-center gap-2 text-red-500">
                    <AlertCircle className="w-4 h-4" />
                    <span>{response.error || '生成失败'}</span>
                  </div>
                ) : (
                  <MarkdownLight text={response.content} />
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* 图像模式结果 - 只在有响应时显示 */}
      {activeMode === 'image' && imageResponses.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {imageResponses.map((response) => (
            <div 
              key={response.modelId} 
              className={`bg-white rounded-2xl border overflow-hidden transition ${
                selectedResultImage === response.modelId ? 'border-blue-300 ring-4 ring-blue-100 shadow-lg' : 'border-gray-100 shadow-sm hover:shadow-md'
              }`}
            >
              <div className="px-4 py-3 bg-gray-50 border-b border-gray-100 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className={`w-2 h-2 rounded-full ${getStatusColor(response.status)}`} />
                  <span className="font-medium text-sm text-gray-700">{response.modelName}</span>
                </div>
                {response.status === 'streaming' || response.status === 'pending' ? (
                  <Loader2 className="w-4 h-4 text-pink-500 animate-spin" />
                ) : response.status === 'error' ? (
                  <button 
                    onClick={() => onRetryImageModel(response.modelId, response.modelName)}
                    className="p-1.5 hover:bg-red-50 rounded-lg"
                    title="重试"
                  >
                    <RotateCcw className="w-3.5 h-3.5 text-red-400" />
                  </button>
                ) : response.image ? (
                  <div className="flex gap-1">
                    <button 
                      onClick={() => setPreviewImage({ url: response.image!.url, modelName: response.modelName })}
                      className="p-1.5 hover:bg-gray-100 rounded-lg"
                      title="预览"
                    >
                      <ZoomIn className="w-3.5 h-3.5 text-gray-400" />
                    </button>
                    <button 
                      onClick={() => onDownloadImage(response.image!.url, response.modelName)}
                      className="p-1.5 hover:bg-gray-100 rounded-lg"
                      title="下载"
                    >
                      <Download className="w-3.5 h-3.5 text-gray-400" />
                    </button>
                  </div>
                ) : null}
              </div>
              <div 
                className="aspect-square bg-gray-100 flex items-center justify-center cursor-pointer"
                onClick={() => {
                  if (response.status === 'complete' && response.image) {
                    setPreviewImage({ url: response.image.url, modelName: response.modelName });
                  } else {
                    onSelectImage(response.modelId);
                  }
                }}
              >
                {response.status === 'pending' || response.status === 'streaming' ? (
                  <div className="text-center text-gray-400">
                    <Loader2 className="w-8 h-8 animate-spin mx-auto mb-2" />
                    <span className="text-sm">生成中...</span>
                  </div>
                ) : response.status === 'error' ? (
                  <div className="text-center text-red-400 p-4">
                    <AlertCircle className="w-8 h-8 mx-auto mb-2" />
                    <span className="text-sm">{response.error || '生成失败'}</span>
                  </div>
                ) : response.image ? (
                  <img src={response.image.url} alt="Generated" className="w-full h-full object-cover" />
                ) : (
                  <div className="text-center text-gray-400">
                    <span className="text-sm">无图像</span>
                  </div>
                )}
              </div>
              {selectedResultImage === response.modelId && response.status === 'complete' && response.image && renderImageActions(response.image.url)}
            </div>
          ))}
        </div>
      )}

      {/* 图片预览弹窗 */}
      {previewImage && (
        <ImagePreviewModal
          imageUrl={previewImage.url}
          modelName={previewImage.modelName}
          onClose={() => setPreviewImage(null)}
          onDownload={() => onDownloadImage(previewImage.url, previewImage.modelName)}
          onImageAction={(action) => onImageAction(previewImage.url, action)}
        />
      )}
    </div>
  );
};

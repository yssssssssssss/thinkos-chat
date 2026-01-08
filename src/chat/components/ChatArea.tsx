/**
 * 聊天区域组件
 * 显示对话消息和多模型响应结果
 */

import React from 'react';
import { Sparkles, Loader2, Copy, RotateCcw, Download, AlertCircle, Edit2, Wand2, Sliders } from 'lucide-react';
import { TextModelResponse, ImageModelResponse } from '../../services/multiModelService';
import { MarkdownLight } from '../../components/MarkdownLight';
import { ModeType } from '../types';

interface ChatAreaProps {
  activeMode: ModeType;
  showResults: boolean;
  lastPrompt: string;
  textResponses: TextModelResponse[];
  imageResponses: ImageModelResponse[];
  selectedResultImage: string | null;
  onCopyText: (text: string) => void;
  onRetryTextModel: (modelId: string, modelName: string) => void;
  onRetryImageModel: (modelId: string, modelName: string) => void;
  onDownloadImage: (imageUrl: string, modelName: string) => void;
  onSelectImage: (modelId: string) => void;
  onImageAction: (imageUrl: string, action: 'refine' | 'inpaint' | 'remix') => void;
}

export const ChatArea: React.FC<ChatAreaProps> = ({
  activeMode,
  showResults,
  lastPrompt,
  textResponses,
  imageResponses,
  selectedResultImage,
  onCopyText,
  onRetryTextModel,
  onRetryImageModel,
  onDownloadImage,
  onSelectImage,
  onImageAction,
}) => {
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
      <button onClick={(e) => { e.stopPropagation(); onImageAction(imageUrl, 'refine'); }} 
        className="flex-1 flex items-center justify-center gap-1.5 py-2 bg-purple-50 text-purple-600 rounded-xl text-xs font-medium hover:bg-purple-100 transition">
        <Wand2 className="w-3.5 h-3.5" />Refine
      </button>
      <button onClick={(e) => { e.stopPropagation(); onImageAction(imageUrl, 'inpaint'); }} 
        className="flex-1 flex items-center justify-center gap-1.5 py-2 bg-blue-50 text-blue-600 rounded-xl text-xs font-medium hover:bg-blue-100 transition">
        <Edit2 className="w-3.5 h-3.5" />Inpaint
      </button>
      <button onClick={(e) => { e.stopPropagation(); onImageAction(imageUrl, 'remix'); }} 
        className="flex-1 flex items-center justify-center gap-1.5 py-2 bg-green-50 text-green-600 rounded-xl text-xs font-medium hover:bg-green-100 transition">
        <Sliders className="w-3.5 h-3.5" />Remix
      </button>
    </div>
  );

  if (!showResults) {
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
    <div className="space-y-6">
      {/* 用户消息 */}
      {lastPrompt && (
        <div className="flex justify-end">
          <div className="max-w-[70%] bg-blue-500 text-white rounded-2xl rounded-tr-md px-5 py-3 shadow-lg shadow-blue-500/20">
            <p className="text-[15px] whitespace-pre-wrap">{lastPrompt}</p>
          </div>
        </div>
      )}

      {/* 文本模式结果 */}
      {activeMode === 'text' ? (
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
      ) : (
        /* 图像模式结果 */
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {imageResponses.map((response) => (
            <div 
              key={response.modelId} 
              onClick={() => response.status === 'complete' && onSelectImage(response.modelId)}
              className={`bg-white rounded-2xl border overflow-hidden transition cursor-pointer ${
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
                    onClick={(e) => { e.stopPropagation(); onRetryImageModel(response.modelId, response.modelName); }}
                    className="p-1.5 hover:bg-red-50 rounded-lg"
                    title="重试"
                  >
                    <RotateCcw className="w-3.5 h-3.5 text-red-400" />
                  </button>
                ) : response.image ? (
                  <button 
                    onClick={(e) => { e.stopPropagation(); onDownloadImage(response.image!.url, response.modelName); }}
                    className="p-1.5 hover:bg-gray-100 rounded-lg"
                    title="下载"
                  >
                    <Download className="w-3.5 h-3.5 text-gray-400" />
                  </button>
                ) : null}
              </div>
              <div className="aspect-square bg-gray-100 flex items-center justify-center">
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
    </div>
  );
};

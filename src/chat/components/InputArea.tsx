/**
 * 输入区域组件
 * 包含输入框、工具栏按钮和发送按钮
 */

import React from 'react';
import { Send, Loader2, Paperclip, Link, AlertCircle } from 'lucide-react';
import { ToolButton, ModeType } from '../types';

interface InputAreaProps {
  inputText: string;
  isGenerating: boolean;
  isOnline: boolean;
  referenceImage: string | null;
  activeMode: ModeType;
  selectedTextCount: number;
  selectedImageCount: number;
  toolButtons: ToolButton[];
  activePanel: string;
  onInputChange: (text: string) => void;
  onSend: () => void;
  onRemoveReference: () => void;
  onFileUpload: (file: File) => void;
  onUrlUpload: (url: string) => void;
  onToolClick: (toolId: string) => void;
  onClosePanel?: () => void; // 新增：关闭面板回调
  children?: React.ReactNode; // 用于渲染工具面板
}

export const InputArea: React.FC<InputAreaProps> = ({
  inputText,
  isGenerating,
  isOnline,
  referenceImage,
  activeMode,
  selectedTextCount,
  selectedImageCount,
  toolButtons,
  activePanel,
  onInputChange,
  onSend,
  onRemoveReference,
  onFileUpload,
  onUrlUpload,
  onToolClick,
  onClosePanel,
  children,
}) => {
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      onSend();
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) onFileUpload(file);
  };

  const handleUrlClick = () => {
    const url = prompt('输入图片 URL:');
    if (url) onUrlUpload(url);
  };

  // 点击输入框时关闭面板
  const handleInputFocus = () => {
    if (onClosePanel) {
      onClosePanel();
    }
  };

  return (
    <div className="p-4 pb-6">
      <div className="max-w-3xl mx-auto relative">
        {children}
        
        {/* 离线提示 */}
        {!isOnline && (
          <div className="mb-3 px-4 py-2 bg-amber-50 border border-amber-200 rounded-2xl flex items-center gap-2 text-amber-700">
            <AlertCircle className="w-4 h-4" />
            <span className="text-sm">网络已断开，请检查网络连接</span>
          </div>
        )}
        
        {/* 主输入框 */}
        <div className="bg-white rounded-3xl shadow-lg shadow-gray-200/50 border border-gray-100 overflow-hidden">
          {/* 参考图预览 */}
          {referenceImage && (
            <div className="px-4 pt-4 flex items-center gap-3">
              <div className="relative group">
                <img src={referenceImage} alt="Reference" className="w-16 h-16 object-cover rounded-xl border border-gray-100" />
                <button onClick={onRemoveReference} 
                  className="absolute -top-2 -right-2 p-1 bg-gray-900 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity">
                  <span className="text-xs">×</span>
                </button>
              </div>
              <span className="text-sm text-gray-500">参考图已添加</span>
            </div>
          )}
          
          {/* 输入框 */}
          <div className="px-5 py-4">
            <textarea 
              value={inputText} 
              onChange={(e) => onInputChange(e.target.value)}
              onFocus={handleInputFocus}
              placeholder='发消息或输入 "/" 选择技能'
              className="w-full bg-transparent resize-none outline-none text-gray-700 placeholder-gray-400 text-[15px] min-h-[24px] max-h-32"
              rows={1}
              onKeyDown={handleKeyDown}
            />
          </div>
          
          {/* 底部工具栏 */}
          <div className="px-4 pb-4 flex items-center justify-between">
            <div className="flex items-center gap-1">
              {/* 附件上传 */}
              <label className="p-2 hover:bg-gray-100 rounded-xl cursor-pointer transition-colors" title="上传图片">
                <Paperclip className="w-5 h-5 text-gray-400" />
                <input type="file" className="hidden" accept="image/*" onChange={handleFileChange} />
              </label>
              
              {/* URL 输入 */}
              <button 
                onClick={handleUrlClick}
                className="p-2 hover:bg-gray-100 rounded-xl transition-colors"
                title="从 URL 添加图片"
              >
                <Link className="w-5 h-5 text-gray-400" />
              </button>
              
              <div className="w-px h-5 bg-gray-200 mx-1" />
              
              {/* 工具按钮 */}
              {toolButtons.map((tool: ToolButton) => (
                <button 
                  key={tool.id} 
                  onClick={() => onToolClick(tool.id)}
                  className={`relative group p-2 rounded-xl transition-all hover:bg-gray-100 ${
                    (tool.id === 'text-chat' && activeMode === 'text') ||
                    (tool.id === 'image-gen' && activeMode === 'image') ||
                    (tool.id === 'prompt-market' && activePanel === 'promptMarket') ||
                    (tool.id === 'system-prompt' && activePanel === 'systemPrompt') ||
                    (tool.id === 'glass-mosaic' && activePanel === 'glassMosaic')
                      ? 'bg-gray-100' : ''
                  }`}
                >
                  <tool.icon className={`w-5 h-5 ${tool.color}`} />
                  {/* Tooltip */}
                  <span className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-2 py-1 bg-gray-800 text-white text-xs rounded-lg whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
                    {tool.label}
                  </span>
                </button>
              ))}
            </div>
            
            {/* 发送按钮 */}
            <button onClick={onSend} disabled={!inputText.trim() || isGenerating || !isOnline}
              className={`p-2.5 rounded-xl transition-all ${
                inputText.trim() && !isGenerating && isOnline
                  ? 'bg-blue-500 text-white shadow-lg shadow-blue-500/30 hover:bg-blue-600'
                  : 'bg-gray-100 text-gray-400 cursor-not-allowed'
              }`}>
              {isGenerating ? <Loader2 className="w-5 h-5 animate-spin" /> : <Send className="w-5 h-5" />}
            </button>
          </div>
        </div>
        
        <p className="text-center text-xs text-gray-400 mt-3">
          {activeMode === 'image' ? `图像模式 · ${selectedImageCount} 个模型` : `文本模式 · ${selectedTextCount} 个模型`} · 按 Enter 发送
        </p>
      </div>
    </div>
  );
};

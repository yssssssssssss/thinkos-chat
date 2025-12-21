import React from 'react';
import { Copy, CheckCircle, AlertCircle, Loader } from 'lucide-react';
import { TextResultNodeData } from '../../types';

interface TextResultNodeProps {
  data: TextResultNodeData;
  updateData: (newData: Partial<TextResultNodeData>) => void;
}

const TextResultNode: React.FC<TextResultNodeProps> = ({ data }) => {
  const [copied, setCopied] = React.useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(data.text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between mb-3 shrink-0">
        <div className="text-[10px] font-bold text-gray-500 uppercase tracking-widest flex items-center gap-2">
          {data.status === 'loading' && <Loader size={10} className="animate-spin" />}
          {data.status === 'success' && <CheckCircle size={10} className="text-green-500" />}
          {data.status === 'error' && <AlertCircle size={10} className="text-red-500" />}
          <span>{data.model}</span>
        </div>
        {data.status === 'success' && (
          <button
            onClick={handleCopy}
            className="p-1.5 rounded-lg hover:bg-black/20 transition-colors"
            title="复制文本"
          >
            {copied ? (
              <CheckCircle size={14} className="text-green-400" />
            ) : (
              <Copy size={14} className="text-gray-400" />
            )}
          </button>
        )}
      </div>

      {(data.status === 'loading' && !data.text) && (
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center space-y-2">
            <Loader size={32} className="animate-spin text-blue-400 mx-auto" />
            <p className="text-sm text-gray-400">生成中...</p>
          </div>
        </div>
      )}

      {data.status === 'error' && (
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center space-y-2 p-4">
            <AlertCircle size={32} className="text-red-400 mx-auto" />
            <p className="text-sm text-red-400">生成失败</p>
            {data.error && (
              <p className="text-xs text-gray-500 max-w-xs">{data.error}</p>
            )}
          </div>
        </div>
      )}

      {(data.status === 'success' || (data.status === 'loading' && data.text)) && (
        <div className="flex-1 overflow-y-auto custom-scrollbar">
          <div className="bg-black/20 rounded-xl p-4 border border-gray-800 relative">
            <div className="text-sm text-gray-300 leading-relaxed whitespace-pre-wrap">
              {data.text}
              {data.status === 'loading' && (
                <span className="inline-block w-1.5 h-4 ml-1 bg-blue-400 animate-pulse align-middle" />
              )}
            </div>
          </div>
          {data.sourcePrompt && (
            <div className="mt-3 pt-3 border-t border-gray-800">
              <p className="text-[10px] text-gray-500 uppercase tracking-wider mb-1">提示词</p>
              <p className="text-xs text-gray-400 leading-relaxed">{data.sourcePrompt}</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default TextResultNode;

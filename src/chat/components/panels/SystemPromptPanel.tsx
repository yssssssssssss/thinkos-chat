/**
 * SystemPrompt 面板
 * 显示系统提示词预设列表
 */

import React, { useState, useEffect } from 'react';
import { X, FileText, Check } from 'lucide-react';
import { getSystemPrompts, SystemPromptPreset } from '../../../../services/systemPromptService';

interface SystemPromptPanelProps {
  selectedId: string;
  onSelect: (id: string) => void;
  onClose: () => void;
}

export const SystemPromptPanel: React.FC<SystemPromptPanelProps> = ({ selectedId, onSelect, onClose }) => {
  const [prompts, setPrompts] = useState<SystemPromptPreset[]>([]);

  useEffect(() => {
    getSystemPrompts().then(setPrompts).catch(console.error);
  }, []);

  return (
    <div className="bg-white rounded-2xl shadow-xl border border-gray-100 p-4 max-h-80 overflow-hidden flex flex-col">
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-medium text-gray-800 flex items-center gap-2">
          <FileText className="w-4 h-4 text-purple-500" />
          SystemPrompt
        </h3>
        <button onClick={onClose} className="p-1 hover:bg-gray-100 rounded-lg">
          <X className="w-4 h-4 text-gray-400" />
        </button>
      </div>

      <p className="text-xs text-gray-400 mb-3">选择一个系统提示词来定义 AI 的行为方式</p>

      {/* 提示词列表 */}
      <div className="flex-1 overflow-y-auto space-y-2">
        {prompts.length === 0 ? (
          <p className="text-center text-gray-400 text-sm py-4">暂无系统提示词</p>
        ) : (
          prompts.map(p => (
            <button
              key={p.id}
              onClick={() => { onSelect(p.id); }}
              className={`w-full text-left p-3 rounded-xl transition flex items-start gap-3 ${
                selectedId === p.id
                  ? 'bg-purple-50 border border-purple-200'
                  : 'bg-gray-50 hover:bg-purple-50 border border-transparent'
              }`}
            >
              <div className="flex-1">
                <div className="font-medium text-sm text-gray-700">{p.name}</div>
                <div className="text-xs text-gray-400 mt-1 line-clamp-2">{p.prompt}</div>
              </div>
              {selectedId === p.id && (
                <Check className="w-4 h-4 text-purple-500 shrink-0 mt-0.5" />
              )}
            </button>
          ))
        )}
      </div>
    </div>
  );
};

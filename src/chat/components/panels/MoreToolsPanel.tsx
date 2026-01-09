/**
 * 更多工具面板
 * 显示其他可用工具
 */

import React from 'react';
import { X, MoreHorizontal, BookOpen, History, Settings, HelpCircle } from 'lucide-react';

interface MoreToolsPanelProps {
  onClose: () => void;
  onAction: (action: string) => void;
}

const tools = [
  { id: 'knowledge', icon: BookOpen, label: '知识库', description: '添加上下文知识', color: 'text-emerald-500' },
  { id: 'history', icon: History, label: '历史记录', description: '查看生成历史', color: 'text-blue-500' },
  { id: 'settings', icon: Settings, label: '设置', description: '调整应用设置', color: 'text-gray-500' },
  { id: 'help', icon: HelpCircle, label: '帮助', description: '使用指南', color: 'text-amber-500' },
];

export const MoreToolsPanel: React.FC<MoreToolsPanelProps> = ({ onClose, onAction }) => {
  return (
    <div className="bg-white rounded-2xl shadow-xl border border-gray-100 p-4">
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-medium text-gray-800 flex items-center gap-2">
          <MoreHorizontal className="w-4 h-4 text-gray-500" />
          更多工具
        </h3>
        <button onClick={onClose} className="p-1 hover:bg-gray-100 rounded-lg">
          <X className="w-4 h-4 text-gray-400" />
        </button>
      </div>

      <div className="grid grid-cols-2 gap-2">
        {tools.map(tool => (
          <button
            key={tool.id}
            onClick={() => { onAction(tool.id); onClose(); }}
            className="flex items-start gap-3 p-3 bg-gray-50 hover:bg-gray-100 rounded-xl transition text-left"
          >
            <tool.icon className={`w-5 h-5 ${tool.color} shrink-0 mt-0.5`} />
            <div>
              <div className="font-medium text-sm text-gray-700">{tool.label}</div>
              <div className="text-xs text-gray-400">{tool.description}</div>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
};

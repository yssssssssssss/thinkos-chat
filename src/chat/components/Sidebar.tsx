/**
 * 侧边栏组件
 * 显示对话列表，支持新建、选择和删除对话
 */

import React from 'react';
import { MessageSquare, Plus, Trash2 } from 'lucide-react';

interface SidebarProps {
  isOpen: boolean;
  conversations: Array<{ id: string; title: string; time: string }>;
  selectedConversation: string | null;
  onNewConversation: () => void;
  onSelectConversation: (id: string) => void;
  onDeleteConversation: (id: string) => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  isOpen,
  conversations,
  selectedConversation,
  onNewConversation,
  onSelectConversation,
  onDeleteConversation,
}) => {
  return (
    <aside className={`${isOpen ? 'w-72' : 'w-0'} bg-gray-50/50 border-r border-gray-100 flex flex-col transition-all duration-300 overflow-hidden shrink-0`}>
      <div className="p-4">
        <button 
          onClick={onNewConversation}
          className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-blue-500 text-white rounded-2xl hover:bg-blue-600 transition-all shadow-lg shadow-blue-500/25 font-medium"
        >
          <Plus className="w-4 h-4" />新建对话
        </button>
      </div>
      <div className="flex-1 overflow-y-auto px-3 pb-4">
        <p className="text-xs text-gray-400 font-medium px-3 py-2">最近对话</p>
        {conversations.length === 0 ? (
          <div className="text-center py-8 text-gray-400">
            <MessageSquare className="w-8 h-8 mx-auto mb-2 opacity-50" />
            <p className="text-sm">暂无对话</p>
          </div>
        ) : (
          conversations.map((conv) => (
            <div key={conv.id} className="group relative">
              <button 
                onClick={() => onSelectConversation(conv.id)}
                className={`w-full text-left px-4 py-3 rounded-xl mb-1 transition-all ${
                  selectedConversation === conv.id ? 'bg-white shadow-sm border border-gray-100' : 'hover:bg-white/60'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="font-medium text-sm text-gray-700 truncate pr-2">{conv.title}</span>
                  <span className="text-xs text-gray-400">{conv.time}</span>
                </div>
              </button>
              <button
                onClick={(e) => { e.stopPropagation(); onDeleteConversation(conv.id); }}
                className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 rounded-lg opacity-0 group-hover:opacity-100 hover:bg-red-50 text-gray-400 hover:text-red-500 transition-all"
                title="删除对话"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          ))
        )}
      </div>
    </aside>
  );
};

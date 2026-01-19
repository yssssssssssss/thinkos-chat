import React, { useMemo, useState } from 'react';
import { MessageSquare, Search, Trash2, X } from 'lucide-react';

export type RecentConversationItem = {
  id: string;
  title: string;
  time: string;
};

type RecentConversationsModalProps = {
  conversations: RecentConversationItem[];
  selectedConversationId: string | null;
  onSelect: (id: string) => void;
  onDelete: (id: string) => void;
  onClose: () => void;
};

const RecentConversationsModal: React.FC<RecentConversationsModalProps> = ({
  conversations,
  selectedConversationId,
  onSelect,
  onDelete,
  onClose,
}) => {
  const [query, setQuery] = useState('');

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return conversations;
    return conversations.filter((c) => c.title.toLowerCase().includes(q));
  }, [conversations, query]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-2xl shadow-2xl w-full max-w-xl max-h-[85vh] overflow-hidden flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between">
          <div className="font-medium text-gray-800 flex items-center gap-2">
            <MessageSquare className="w-5 h-5 text-blue-600" />
            最近对话
          </div>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-xl transition-colors" title="关闭">
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        <div className="p-4 border-b border-gray-100 bg-white">
          <div className="relative">
            <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-2 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-200"
              placeholder="搜索对话标题…"
            />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto px-3 py-4">
          {filtered.length === 0 ? (
            <div className="text-center py-10 text-gray-400">
              <MessageSquare className="w-10 h-10 mx-auto mb-2 opacity-50" />
              <p className="text-sm">{conversations.length ? '没有匹配的对话' : '暂无对话'}</p>
            </div>
          ) : (
            filtered.map((conv) => (
              <div key={conv.id} className="group relative">
                <button
                  onClick={() => onSelect(conv.id)}
                  className={`w-full text-left px-4 py-3 rounded-xl mb-1 transition-all ${
                    selectedConversationId === conv.id
                      ? 'bg-white shadow-sm border border-gray-100'
                      : 'hover:bg-white/60'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-medium text-sm text-gray-700 truncate pr-2">{conv.title}</span>
                    <span className="text-xs text-gray-400">{conv.time}</span>
                  </div>
                </button>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onDelete(conv.id);
                  }}
                  className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 rounded-lg opacity-0 group-hover:opacity-100 hover:bg-red-50 text-gray-400 hover:text-red-500 transition-all"
                  title="删除对话"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};

export default RecentConversationsModal;


/**
 * PromptMarket 面板
 * 显示预设提示词列表，支持搜索和分类筛选
 * 使用图片+标题的卡片预览模式
 */

import React, { useState, useEffect } from 'react';
import { X, Search, Sparkles, ImageIcon } from 'lucide-react';
import { getPromptMarks, PromptMarkPreset } from '../../../../services/promptMarkService';

interface PromptMarketPanelProps {
  onSelect: (prompt: string) => void;
  onClose: () => void;
}

export const PromptMarketPanel: React.FC<PromptMarketPanelProps> = ({ onSelect, onClose }) => {
  const [prompts, setPrompts] = useState<PromptMarkPreset[]>([]);
  const [searchText, setSearchText] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');

  useEffect(() => {
    getPromptMarks().then(setPrompts).catch(console.error);
  }, []);

  // 获取所有分类
  const categories = ['all', ...new Set(prompts.map(p => p.category).filter(Boolean))];

  // 过滤提示词
  const filteredPrompts = prompts.filter(p => {
    const matchSearch = !searchText || 
      p.title.toLowerCase().includes(searchText.toLowerCase()) ||
      p.prompt.toLowerCase().includes(searchText.toLowerCase());
    const matchCategory = selectedCategory === 'all' || p.category === selectedCategory;
    return matchSearch && matchCategory;
  });

  return (
    <div className="bg-white rounded-2xl shadow-xl border border-gray-100 p-4 max-h-96 overflow-hidden flex flex-col">
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-medium text-gray-800 flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-orange-500" />
          PromptMarket
        </h3>
        <button onClick={onClose} className="p-1 hover:bg-gray-100 rounded-lg">
          <X className="w-4 h-4 text-gray-400" />
        </button>
      </div>

      {/* 搜索框 */}
      <div className="relative mb-3">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
        <input
          type="text"
          value={searchText}
          onChange={(e) => setSearchText(e.target.value)}
          placeholder="搜索提示词..."
          className="w-full pl-9 pr-3 py-2 bg-gray-50 rounded-xl text-sm outline-none focus:ring-2 focus:ring-orange-200"
        />
      </div>

      {/* 分类标签 */}
      <div className="flex gap-2 mb-3 overflow-x-auto pb-1">
        {categories.map(cat => (
          <button
            key={cat}
            onClick={() => setSelectedCategory(cat)}
            className={`px-3 py-1 rounded-full text-xs whitespace-nowrap transition ${
              selectedCategory === cat
                ? 'bg-orange-100 text-orange-600'
                : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
            }`}
          >
            {cat === 'all' ? '全部' : cat}
          </button>
        ))}
      </div>

      {/* 提示词网格 - 图片+标题卡片模式 */}
      <div className="flex-1 overflow-y-auto">
        {filteredPrompts.length === 0 ? (
          <p className="text-center text-gray-400 text-sm py-4">暂无提示词</p>
        ) : (
          <div className="grid grid-cols-3 gap-3">
            {filteredPrompts.map(p => (
              <button
                key={p.id}
                onClick={() => { onSelect(p.prompt); onClose(); }}
                className="group flex flex-col bg-gray-50 hover:bg-orange-50 rounded-xl overflow-hidden transition border border-transparent hover:border-orange-200"
              >
                {/* 图片区域 */}
                <div className="aspect-square bg-gradient-to-br from-orange-100 to-amber-50 flex items-center justify-center overflow-hidden">
                  {p.image ? (
                    <img 
                      src={p.image} 
                      alt={p.title} 
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                    />
                  ) : (
                    <div className="flex flex-col items-center justify-center text-orange-300">
                      <ImageIcon className="w-8 h-8" />
                    </div>
                  )}
                </div>
                {/* 标题区域 */}
                <div className="p-2">
                  <div className="font-medium text-xs text-gray-700 group-hover:text-orange-600 line-clamp-2 text-center">
                    {p.title}
                  </div>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

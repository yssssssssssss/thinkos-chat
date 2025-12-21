import React from 'react';
import { KnowledgeNodeData } from '../../types';

interface KnowledgeNodeProps {
  data: KnowledgeNodeData;
  updateData: (newData: Partial<KnowledgeNodeData>) => void;
}

const KnowledgeNode: React.FC<KnowledgeNodeProps> = ({ data, updateData }) => {
  return (
    <div className="flex flex-col gap-3">
      <textarea
        className="w-full bg-black/20 border border-transparent rounded-xl p-4 text-white focus:bg-black/40 focus:ring-0 outline-none resize-none h-24 transition-colors placeholder-gray-400"
        placeholder="输入检索/知识查询..."
        value={data.query}
        onChange={(e) => updateData({ query: e.target.value })}
      />
      <textarea
        className="w-full bg-black/20 border border-transparent rounded-xl p-4 text-gray-300 focus:bg-black/40 focus:ring-0 outline-none resize-none h-20 transition-colors placeholder-gray-500"
        placeholder="可在此记录上游提供的 context 或手动粘贴资料"
        value={data.context || ''}
        onChange={(e) => updateData({ context: e.target.value })}
      />
    </div>
  );
};

export default KnowledgeNode;

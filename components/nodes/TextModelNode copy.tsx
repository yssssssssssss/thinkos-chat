import React from 'react';
import { Play, Type } from 'lucide-react';
import { TextModelNodeData } from '../../types';

interface TextModelNodeProps {
  data: TextModelNodeData;
  updateData: (newData: Partial<TextModelNodeData>) => void;
  onGenerate: () => void;
  canGenerate: boolean;
  isGenerating: boolean;
}

const TextModelNode: React.FC<TextModelNodeProps> = ({ data, updateData, onGenerate, canGenerate, isGenerating }) => {
  const toggleModel = (id: string) => {
    const newModels = data.models.map(m => 
      m.id === id ? { ...m, selected: !m.selected } : m
    );
    updateData({ models: newModels });
  };

  return (
    <div className="flex flex-col h-full">
      <div className="text-[10px] font-bold text-gray-500 mb-3 flex items-center gap-2 uppercase tracking-widest shrink-0 px-1">
        <Type size={10} />
        <span>文本生成模型</span>
      </div>

      <div className="space-y-2 flex-1 overflow-y-auto mb-4 custom-scrollbar pr-1">
        {data.models.map(model => (
          <div 
            key={model.id}
            onClick={() => toggleModel(model.id)}
            className={`flex items-center p-3 rounded-2xl border cursor-pointer transition-all duration-200 ${
              model.selected 
                ? 'bg-green-600/20 border-green-500/50 shadow-[0_0_15px_rgba(34,197,94,0.2)]' 
                : 'bg-black/20 border-transparent hover:bg-black/40 hover:border-gray-800'
            }`}
          >
            <div className={`w-5 h-5 rounded-full border flex items-center justify-center mr-3 transition-colors ${
              model.selected ? 'bg-green-500 border-green-500' : 'border-gray-600 bg-transparent'
            }`}>
              {model.selected && <div className="w-2 h-2 bg-white rounded-full" />}
            </div>
            <div className="flex flex-col">
                <span className={`text-sm font-medium truncate transition-colors ${model.selected ? 'text-white' : 'text-gray-300'}`} title={model.name}>{model.name}</span>
                {model.selected && <span className="text-[10px] text-green-200/70">已选择</span>}
            </div>
          </div>
        ))}
      </div>

      <button
        onClick={onGenerate}
        disabled={!canGenerate || isGenerating}
        className={`w-full py-3 rounded-2xl font-bold flex items-center justify-center gap-2 transition-all shrink-0 ${
          canGenerate && !isGenerating
            ? 'bg-white text-black hover:bg-gray-200 shadow-lg shadow-black/30 transform hover:scale-[1.02] active:scale-[0.98]'
            : 'bg-black/20 text-gray-500 cursor-not-allowed'
        }`}
      >
        <Play size={16} fill={canGenerate ? "currentColor" : "none"} />
        {isGenerating ? 'Generating...' : 'Generate'}
      </button>
      
      {!canGenerate && (
        <p className="text-[10px] text-red-400/80 text-center mt-3 shrink-0 font-medium bg-red-500/10 py-1 rounded-lg">
            需要输入连接
        </p>
      )}
    </div>
  );
};

export default TextModelNode;

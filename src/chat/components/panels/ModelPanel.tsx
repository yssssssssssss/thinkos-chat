/**
 * 模型选择面板
 */

import React from 'react';
import { X, Check } from 'lucide-react';
import { ModelOption, ModeType } from '../../types';

interface ModelPanelProps {
  activeMode: ModeType;
  textModels: ModelOption[];
  imageModels: ModelOption[];
  onToggleModel: (id: string, isImage: boolean) => void;
  onClose: () => void;
}

export const ModelPanel: React.FC<ModelPanelProps> = ({
  activeMode,
  textModels,
  imageModels,
  onToggleModel,
  onClose,
}) => {
  const models = activeMode === 'image' ? imageModels : textModels;

  return (
    <div className="bg-white rounded-2xl shadow-xl border border-gray-100 p-4 mx-4">
      <div className="flex items-center justify-between mb-3">
        <h4 className="font-medium text-gray-800">选择{activeMode === 'image' ? '图像' : '文本'}模型（多选并行）</h4>
        <button onClick={onClose} className="p-1 hover:bg-gray-100 rounded-lg">
          <X className="w-4 h-4 text-gray-400" />
        </button>
      </div>
      <div className="grid grid-cols-3 gap-2">
        {models.map((model) => (
          <button key={model.id} onClick={() => onToggleModel(model.id, activeMode === 'image')}
            className={`flex items-center gap-2 px-3 py-2.5 rounded-xl border text-sm transition-all ${
              model.selected ? 'border-blue-200 bg-blue-50 text-blue-700' : 'border-gray-100 bg-gray-50 text-gray-600 hover:bg-white'
            }`}>
            <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center ${
              model.selected ? 'bg-blue-500 border-blue-500' : 'border-gray-300'
            }`}>
              {model.selected && <Check className="w-2.5 h-2.5 text-white" />}
            </div>
            <span className="truncate">{model.name}</span>
          </button>
        ))}
      </div>
    </div>
  );
};

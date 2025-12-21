import React from 'react';
import { WorkflowNodeData } from '../../types';

interface WorkflowNodeProps {
  data: WorkflowNodeData;
  updateData: (newData: Partial<WorkflowNodeData>) => void;
}

const WorkflowNode: React.FC<WorkflowNodeProps> = ({ data, updateData }) => {
  const params = data.params || { strength: 0.5, scale: 1.0, steps: 20 };

  return (
    <div className="flex flex-col gap-3">
      <input
        className="w-full bg-black/20 border border-transparent rounded-xl px-4 py-3 text-white font-medium placeholder-gray-400 focus:bg-black/40 focus:ring-0 outline-none transition-colors"
        placeholder="App name"
        value={data.title}
        onChange={(e) => updateData({ title: e.target.value })}
      />
      <textarea
        className="w-full bg-black/20 border border-transparent rounded-xl p-4 text-gray-300 placeholder-gray-500 focus:bg-black/40 focus:ring-0 outline-none resize-none h-20 transition-colors"
        placeholder="Description or config..."
        value={data.description || ''}
        onChange={(e) => updateData({ description: e.target.value })}
      />
      <div className="grid grid-cols-3 gap-3 text-[11px] text-gray-400 font-medium tracking-wide">
        <label className="flex flex-col gap-2">
          <span className="uppercase">Strength</span>
          <input
            type="range"
            min={0}
            max={1}
            step={0.05}
            value={params.strength}
            onChange={(e) =>
              updateData({ params: { ...params, strength: Number(e.target.value) } })
            }
            className="accent-blue-500 h-1 bg-gray-700 rounded-lg appearance-none cursor-pointer"
          />
        </label>
        <label className="flex flex-col gap-2">
          <span className="uppercase">Scale</span>
          <input
            type="number"
            min={0.5}
            max={3}
            step={0.1}
            className="bg-black/20 border border-transparent rounded-lg px-2 py-1 text-white text-center focus:bg-black/40 outline-none"
            value={params.scale}
            onChange={(e) =>
              updateData({ params: { ...params, scale: Number(e.target.value) } })
            }
          />
        </label>
        <label className="flex flex-col gap-2">
          <span className="uppercase">Steps</span>
          <input
            type="number"
            min={1}
            max={50}
            className="bg-black/20 border border-transparent rounded-lg px-2 py-1 text-white text-center focus:bg-black/40 outline-none"
            value={params.steps}
            onChange={(e) =>
              updateData({ params: { ...params, steps: Number(e.target.value) } })
            }
          />
        </label>
      </div>
    </div>
  );
};

export default WorkflowNode;


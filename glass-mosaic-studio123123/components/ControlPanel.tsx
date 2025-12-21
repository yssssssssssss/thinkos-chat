import React from 'react';
import { ProcessingOptions } from '../types';
import { Settings2, Grid, Sparkles, Box, LayoutGrid, Zap } from 'lucide-react';

interface ControlPanelProps {
  options: ProcessingOptions;
  onChange: (newOptions: ProcessingOptions) => void;
  onDownload: () => void;
  isProcessing: boolean;
}

export const ControlPanel: React.FC<ControlPanelProps> = ({
  options,
  onChange,
  onDownload,
  isProcessing
}) => {
  const handleChange = (key: keyof ProcessingOptions, value: number | string) => {
    onChange({ ...options, [key]: value });
  };

  return (
    <div className="w-full md:w-80 bg-gray-800 border-l border-gray-700 flex flex-col h-full shadow-2xl z-10">
      <div className="p-6 border-b border-gray-700 bg-gray-800/50 backdrop-blur-sm">
        <h2 className="text-xl font-bold flex items-center text-white">
          <Settings2 className="w-5 h-5 mr-2 text-indigo-400" />
          Configuration
        </h2>
        <p className="text-sm text-gray-400 mt-1">Adjust the glass mosaic properties</p>
      </div>

      <div className="flex-1 overflow-y-auto p-6 space-y-8">
        {/* Cell Size */}
        <div className="space-y-3">
          <div className="flex justify-between items-center">
            <label className="text-sm font-medium text-gray-300 flex items-center">
              <Grid className="w-4 h-4 mr-2 text-blue-400" />
              Grid Size
            </label>
            <span className="text-xs bg-gray-700 px-2 py-1 rounded text-gray-300">{options.cellSize}px</span>
          </div>
          <input
            type="range"
            min="5"
            max="100"
            value={options.cellSize}
            onChange={(e) => handleChange('cellSize', Number(e.target.value))}
            className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-indigo-500"
          />
          <p className="text-xs text-gray-500">Controls the resolution of the mosaic.</p>
        </div>

        {/* Random Highlights */}
        <div className="space-y-3">
          <div className="flex justify-between items-center">
            <label className="text-sm font-medium text-gray-300 flex items-center">
              <Zap className="w-4 h-4 mr-2 text-yellow-300" />
              Random Sparkles
            </label>
            <span className="text-xs bg-gray-700 px-2 py-1 rounded text-gray-300">{Math.round(options.sparkleIntensity * 100)}%</span>
          </div>
          <input
            type="range"
            min="0"
            max="1"
            step="0.01"
            value={options.sparkleIntensity}
            onChange={(e) => handleChange('sparkleIntensity', Number(e.target.value))}
            className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-yellow-400"
          />
           <p className="text-xs text-gray-500">Randomly adds bright glass highlights.</p>
        </div>

        {/* Glass Opacity */}
        <div className="space-y-3">
          <div className="flex justify-between items-center">
            <label className="text-sm font-medium text-gray-300 flex items-center">
              <Sparkles className="w-4 h-4 mr-2 text-cyan-400" />
              Glass Frosting
            </label>
            <span className="text-xs bg-gray-700 px-2 py-1 rounded text-gray-300">{Math.round(options.glassOpacity * 100)}%</span>
          </div>
          <input
            type="range"
            min="0"
            max="1"
            step="0.05"
            value={options.glassOpacity}
            onChange={(e) => handleChange('glassOpacity', Number(e.target.value))}
            className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-cyan-500"
          />
        </div>

         {/* Bevel Intensity */}
         <div className="space-y-3">
          <div className="flex justify-between items-center">
            <label className="text-sm font-medium text-gray-300 flex items-center">
              <Box className="w-4 h-4 mr-2 text-emerald-400" />
              Edge Depth
            </label>
            <span className="text-xs bg-gray-700 px-2 py-1 rounded text-gray-300">{Math.round(options.bevelIntensity * 100)}%</span>
          </div>
          <input
            type="range"
            min="0"
            max="1"
            step="0.05"
            value={options.bevelIntensity}
            onChange={(e) => handleChange('bevelIntensity', Number(e.target.value))}
            className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-emerald-500"
          />
        </div>

        {/* Inner Shine/Gloss */}
        <div className="space-y-3">
          <div className="flex justify-between items-center">
            <label className="text-sm font-medium text-gray-300 flex items-center">
              <Sparkles className="w-4 h-4 mr-2 text-purple-400" />
              Gloss Level
            </label>
            <span className="text-xs bg-gray-700 px-2 py-1 rounded text-gray-300">{Math.round(options.innerShine * 100)}%</span>
          </div>
          <input
            type="range"
            min="0"
            max="1"
            step="0.05"
            value={options.innerShine}
            onChange={(e) => handleChange('innerShine', Number(e.target.value))}
            className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-purple-500"
          />
        </div>

        {/* Gap */}
        <div className="space-y-3">
          <div className="flex justify-between items-center">
            <label className="text-sm font-medium text-gray-300 flex items-center">
              <LayoutGrid className="w-4 h-4 mr-2 text-pink-400" />
              Grout Gap
            </label>
            <span className="text-xs bg-gray-700 px-2 py-1 rounded text-gray-300">{options.gap}px</span>
          </div>
          <input
            type="range"
            min="0"
            max="10"
            step="1"
            value={options.gap}
            onChange={(e) => handleChange('gap', Number(e.target.value))}
            className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-pink-500"
          />
        </div>

         {/* Shape Selector */}
         <div className="space-y-3">
          <label className="text-sm font-medium text-gray-300 block mb-2">Tile Shape</label>
          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={() => handleChange('renderShape', 'square')}
              className={`p-2 rounded-md text-sm border ${options.renderShape === 'square' ? 'bg-indigo-600 border-indigo-500 text-white' : 'bg-gray-700 border-gray-600 text-gray-300 hover:bg-gray-600'}`}
            >
              Square
            </button>
            <button
              onClick={() => handleChange('renderShape', 'circle')}
              className={`p-2 rounded-md text-sm border ${options.renderShape === 'circle' ? 'bg-indigo-600 border-indigo-500 text-white' : 'bg-gray-700 border-gray-600 text-gray-300 hover:bg-gray-600'}`}
            >
              Circle
            </button>
          </div>
        </div>

      </div>

      <div className="p-6 border-t border-gray-700 bg-gray-800">
        <button
          onClick={onDownload}
          disabled={isProcessing}
          className="w-full py-3 px-4 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg text-white font-medium shadow-lg shadow-indigo-500/30 transition-all flex items-center justify-center"
        >
          {isProcessing ? 'Processing...' : 'Download Result'}
        </button>
      </div>
    </div>
  );
};
import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { X, Sparkles, Loader2, ArrowRight, CheckSquare, Square, Copy } from 'lucide-react';
import { optimizePrompt } from '../../services/geminiService';

interface FixModelModalProps {
  isOpen: boolean;
  onClose: () => void;
  originalPrompt: string;
  onConfirm: (prompts: string[]) => void;
  anchorRect: { left: number; top: number; width: number; height: number };
}

const FixModelModal: React.FC<FixModelModalProps> = ({ isOpen, onClose, originalPrompt, onConfirm, anchorRect }) => {
  const MODAL_WIDTH = 600;
  const MODAL_HEIGHT = 500;
  const [currentPrompt, setCurrentPrompt] = useState(originalPrompt);
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [selectedIndices, setSelectedIndices] = useState<number[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [position, setPosition] = useState({ left: 0, top: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const dragStartRef = useRef({ x: 0, y: 0, left: 0, top: 0 });

  useEffect(() => {
    setCurrentPrompt(originalPrompt);
    setSuggestions([]);
    setSelectedIndices([]);
  }, [originalPrompt, isOpen]);

  useEffect(() => {
    if (!isOpen) return;
    const { left: anchorLeft, top: anchorTop, width } = anchorRect;
    let left = anchorLeft + width + 16;
    let top = anchorTop;

    if (left + MODAL_WIDTH > window.innerWidth) {
        left = anchorLeft - MODAL_WIDTH - 16;
    }
    if (top + MODAL_HEIGHT > window.innerHeight) {
        top = Math.max(20, window.innerHeight - MODAL_HEIGHT - 16);
    }
    if (top < 20) top = 20;
    if (left < 20) left = 20;

    setPosition({ left, top });
  }, [isOpen, anchorRect]);

  useEffect(() => {
    const handleMove = (e: MouseEvent) => {
      if (!isDragging) return;
      const deltaX = e.clientX - dragStartRef.current.x;
      const deltaY = e.clientY - dragStartRef.current.y;
      const left = Math.min(Math.max(dragStartRef.current.left + deltaX, 10), window.innerWidth - MODAL_WIDTH - 10);
      const top = Math.min(Math.max(dragStartRef.current.top + deltaY, 10), window.innerHeight - MODAL_HEIGHT - 10);
      setPosition({ left, top });
    };

    const handleUp = () => setIsDragging(false);

    if (isDragging) {
      window.addEventListener('mousemove', handleMove);
      window.addEventListener('mouseup', handleUp);
    }

    return () => {
      window.removeEventListener('mousemove', handleMove);
      window.removeEventListener('mouseup', handleUp);
    };
  }, [isDragging]);

  const handleOptimize = async () => {
    setIsLoading(true);
    const results = await optimizePrompt(currentPrompt);
    setSuggestions(results);
    setSelectedIndices([]); // Reset selection on new optimization
    setIsLoading(false);
  };

  const toggleSelection = (index: number) => {
    setSelectedIndices(prev => 
      prev.includes(index) ? prev.filter(i => i !== index) : [...prev, index]
    );
  };

  const handleConfirm = () => {
    if (selectedIndices.length > 0) {
        // Use selected suggestions
        const selectedPrompts = selectedIndices.map(i => suggestions[i]);
        onConfirm(selectedPrompts);
    } else {
        // Use manual input
        onConfirm([currentPrompt]);
    }
  };

  const copyToEditor = (text: string, e: React.MouseEvent) => {
      e.stopPropagation();
      setCurrentPrompt(text);
  };

  if (!isOpen) return null;

  return createPortal(
    <>
    <div className="fixed inset-0 z-40 bg-transparent" onClick={onClose} data-stop-canvas-zoom="true" onWheelCapture={(e) => e.stopPropagation()} />
    <div 
        className="fixed z-50 rounded-3xl w-[600px] p-8 shadow-2xl backdrop-blur-2xl border border-gray-300"
        style={{ 
            left: position.left, 
            top: position.top,
            background: 'linear-gradient(to bottom, rgba(31, 41, 55, 0.98), rgba(17, 24, 39, 0.98))'
        }}
        onMouseDown={(e) => e.stopPropagation()}
        onWheelCapture={(e) => e.stopPropagation()}
        data-stop-canvas-zoom="true"
    >
        <div 
          className="flex justify-between items-center mb-6 cursor-move"
          onMouseDown={(e) => {
            e.preventDefault();
            dragStartRef.current = { x: e.clientX, y: e.clientY, left: position.left, top: position.top };
            setIsDragging(true);
          }}
        >
          <h2 className="text-xl font-semibold text-white flex items-center gap-2 tracking-tight">
            <div className="p-2 bg-purple-500/20 rounded-lg text-purple-400">
                <Sparkles size={20} />
            </div>
            固定模型
          </h2>
          <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-full bg-black/20 hover:bg-black/40 text-gray-400 hover:text-white transition">
            <X size={18} />
          </button>
        </div>

        <div className="space-y-5">
          <div>
            <label className="block text-xs font-bold text-gray-400 mb-2 uppercase tracking-wider">
                当前提示词 {selectedIndices.length > 0 && <span className="text-blue-400 ml-2Normal normal-case tracking-normal font-normal">(优先使用选中项)</span>}
            </label>
            <textarea
              className={`w-full bg-black/20 border rounded-2xl p-4 text-white focus:ring-0 focus:bg-black/40 outline-none h-32 resize-none transition-all ${
                  selectedIndices.length > 0 ? 'border-transparent opacity-50' : 'border-transparent focus:border-purple-500/30'
              }`}
              value={currentPrompt}
              onChange={(e) => setCurrentPrompt(e.target.value)}
              disabled={selectedIndices.length > 0}
              placeholder="输入提示词..."
            />
          </div>

          <div className="flex justify-between items-center pt-2">
             <button
              onClick={handleOptimize}
              disabled={isLoading}
              className="px-5 py-2.5 bg-purple-600 hover:bg-purple-500 text-white rounded-xl flex items-center gap-2 disabled:opacity-50 transition font-medium shadow-lg shadow-purple-900/20"
            >
              {isLoading ? <Loader2 className="animate-spin" size={16} /> : <Sparkles size={16} />}
              AI 智能优化
            </button>
            
            <button
                onClick={handleConfirm}
                className="px-6 py-2.5 bg-white hover:bg-gray-200 text-black rounded-xl flex items-center gap-2 font-bold shadow-lg shadow-black/30 transition transform hover:scale-105"
            >
                生成新结果 ({selectedIndices.length > 0 ? selectedIndices.length : 1})
                <ArrowRight size={16} />
            </button>
          </div>

          {suggestions.length > 0 && (
            <div className="mt-6 pt-6 border-t border-gray-700">
              <h3 className="text-xs font-bold text-gray-400 mb-3 uppercase tracking-wider">AI 建议</h3>
              <div className="grid grid-cols-1 gap-2 max-h-56 overflow-y-auto custom-scrollbar pr-1">
                {suggestions.map((s, idx) => {
                  const isSelected = selectedIndices.includes(idx);
                  return (
                    <div
                      key={idx}
                      onClick={() => toggleSelection(idx)}
                      className={`p-4 border rounded-xl cursor-pointer transition flex items-start gap-3 group ${
                        isSelected 
                            ? 'bg-purple-500/10 border-purple-500/50' 
                            : 'bg-black/20 hover:bg-black/40 border-transparent'
                      }`}
                    >
                      <div className={`mt-0.5 shrink-0 transition-colors ${isSelected ? 'text-purple-400' : 'text-gray-600 group-hover:text-gray-500'}`}>
                          {isSelected ? <CheckSquare size={18} /> : <Square size={18} />}
                      </div>
                      <span className={`text-sm leading-relaxed flex-1 ${isSelected ? 'text-white' : 'text-gray-300'}`}>
                        {s}
                      </span>
                      <button 
                        onClick={(e) => copyToEditor(s, e)}
                        className="p-1.5 text-gray-500 hover:text-white hover:bg-black/40 rounded-lg transition opacity-0 group-hover:opacity-100"
                        title="复制到输入框"
                      >
                          <Copy size={14} />
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  , document.body);
};

export default FixModelModal;

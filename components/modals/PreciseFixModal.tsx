import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { X, Check, Loader2 } from 'lucide-react';
import DrawingCanvas from './DrawingCanvas';

interface PreciseFixModalProps {
  isOpen: boolean;
  onClose: () => void;
  imageUrl: string;
  onConfirm: (mask: string, instruction: string) => void;
  anchorRect: { left: number; top: number; width: number; height: number };
}

const PreciseFixModal: React.FC<PreciseFixModalProps> = ({ isOpen, onClose, imageUrl, onConfirm, anchorRect }) => {
  const MODAL_WIDTH = 800;
  const MODAL_HEIGHT = 750;
  const [mask, setMask] = useState<string | null>(null);
  const [instruction, setInstruction] = useState('');
  const [position, setPosition] = useState({ left: 0, top: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const dragStartRef = useRef({ x: 0, y: 0, left: 0, top: 0 });

  useEffect(() => {
    if (!isOpen) return;
    const { left: anchorLeft, top: anchorTop, width } = anchorRect;
    let left = anchorLeft + width + 16;
    let top = anchorTop - 40;

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

  const handleApply = () => {
    if (mask && instruction) {
        onConfirm(mask, instruction);
    }
  };

  if (!isOpen) return null;

  return createPortal(
    <>
      <div className="fixed inset-0 z-40 bg-transparent" onClick={onClose} data-stop-canvas-zoom="true" onWheelCapture={(e) => e.stopPropagation()} />
      <div
        className="fixed z-50 rounded-3xl w-[800px] h-[750px] flex flex-col shadow-2xl backdrop-blur-2xl overflow-hidden border border-gray-300"
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
          className="flex justify-between items-center p-5 border-b border-gray-700 cursor-move bg-black/10"
          onMouseDown={(e) => {
            e.preventDefault();
            dragStartRef.current = { x: e.clientX, y: e.clientY, left: position.left, top: position.top };
            setIsDragging(true);
          }}
        >
          <h2 className="text-lg font-semibold text-white flex items-center gap-2">
            <div className="w-2 h-6 bg-blue-500 rounded-full"></div>
            精确修正
          </h2>
          <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-full bg-black/20 hover:bg-black/40 text-gray-400 hover:text-white transition">
            <X size={18} />
          </button>
        </div>

        <div className="flex-1 overflow-hidden relative bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] bg-gray-950 flex items-center justify-center">
            <DrawingCanvas 
                imageUrl={imageUrl} 
                width={600} 
                height={500} 
                onMaskChange={setMask} 
                strokeColor="rgba(59, 130, 246, 0.6)"
            />
        </div>

        <div className="p-5 bg-gray-900 border-t border-gray-700">
           <div className="flex gap-3 items-center">
                <div className="flex-1 relative">
                    <input 
                        type="text"
                        value={instruction}
                        onChange={(e) => setInstruction(e.target.value)}
                        placeholder="描述修改意图 (例如: '把花朵换成蓝色的')"
                        className="w-full bg-black/20 border border-transparent rounded-xl pl-4 pr-4 py-3 text-white placeholder-gray-400 focus:bg-black/40 focus:ring-0 outline-none transition-colors"
                    />
                </div>
                <button 
                    onClick={handleApply}
                    disabled={!mask || !instruction}
                    className="bg-blue-600 hover:bg-blue-500 text-white px-6 py-3 rounded-xl font-bold flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-blue-900/30 transition transform active:scale-95"
                >
                    <Check size={18} />
                    <span>确认</span>
                </button>
           </div>
        </div>
      </div>
    </>
  , document.body);
};

export default PreciseFixModal;

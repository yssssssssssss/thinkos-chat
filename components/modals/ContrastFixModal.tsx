import React, { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { X, Check, Upload } from 'lucide-react';
import DrawingCanvas from './DrawingCanvas';
import { fileToBase64 } from '../../services/geminiService';

interface ContrastFixModalProps {
  isOpen: boolean;
  onClose: () => void;
  originalImageUrl: string;
  onConfirm: (mask: string, instruction: string, refImage: string) => void;
  anchorRect: { left: number; top: number; width: number; height: number };
}

const ContrastFixModal: React.FC<ContrastFixModalProps> = ({ isOpen, onClose, originalImageUrl, onConfirm, anchorRect }) => {
  const MODAL_WIDTH = 1000;
  const MODAL_HEIGHT = 650;
  const [refImage, setRefImage] = useState<string | null>(null);
  const [maskA, setMaskA] = useState<string | null>(null);
  const [maskB, setMaskB] = useState<string | null>(null);
  const [instruction, setInstruction] = useState('');
  
  const [position, setPosition] = useState({ left: 0, top: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const dragStartRef = useRef({ x: 0, y: 0, left: 0, top: 0 });

  useEffect(() => {
    if (!isOpen) return;
    const { left: anchorLeft, top: anchorTop, width } = anchorRect;
    let left = anchorLeft + width + 16;
    let top = anchorTop - 60;

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
    if (maskA && maskB && !instruction) {
        setInstruction('将图B的绿色区域，替换到图A的绿色区域');
    }
  }, [maskA, maskB, instruction]);
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

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
      if (e.target.files && e.target.files[0]) {
          const base64 = await fileToBase64(e.target.files[0]);
          setRefImage(base64);
      }
  };

  const handleApply = async () => {
    if (!maskA || !maskB || !instruction || !refImage) return;
    onConfirm(maskA, instruction, refImage);
  };

  if (!isOpen) return null;

  return createPortal(
    <>
      <div className="fixed inset-0 z-40 bg-transparent" onClick={onClose} data-stop-canvas-zoom="true" onWheelCapture={(e) => e.stopPropagation()} />
      <div
        className="fixed z-50 rounded-3xl w-[1000px] h-[650px] flex flex-col shadow-2xl backdrop-blur-2xl overflow-hidden border border-gray-300"
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
             <div className="w-2 h-6 bg-green-500 rounded-full"></div>
             对比修正
          </h2>
          <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-full bg-black/20 hover:bg-black/40 text-gray-400 hover:text-white transition">
            <X size={18} />
          </button>
        </div>

        <div className="flex-1 overflow-hidden p-6 flex gap-8 justify-center items-center bg-gray-950">
            <div className="flex flex-col items-center gap-3">
                <span className="text-xs font-bold text-gray-400 uppercase tracking-widest">原图 (图 A)</span>
                <div className="border border-gray-700 rounded-2xl overflow-hidden relative w-[400px] h-[400px] bg-black shadow-2xl">
                     <DrawingCanvas 
                        imageUrl={originalImageUrl} 
                        width={400} 
                        height={400} 
                        onMaskChange={setMaskA} 
                        strokeColor="rgba(50, 255, 50, 0.6)"
                    />
                </div>
            </div>

            <div className="flex flex-col items-center gap-3">
                 <span className="text-xs font-bold text-gray-400 uppercase tracking-widest">参考图 (图 B)</span>
                 <div className="border border-gray-700 rounded-2xl overflow-hidden relative w-[400px] h-[400px] bg-black/20 flex items-center justify-center shadow-2xl hover:bg-black/40 transition">
                    {!refImage ? (
                        <label className="cursor-pointer flex flex-col items-center gap-3 text-gray-400 hover:text-white transition group w-full h-full justify-center">
                            <div className="p-4 bg-black/20 rounded-full group-hover:bg-black/40 transition">
                                <Upload size={32} />
                            </div>
                            <span className="text-sm">上传参考图</span>
                            <input type="file" className="hidden" accept="image/*" onChange={handleUpload} />
                        </label>
                    ) : (
                        <div className="relative w-full h-full group">
                             <img src={refImage} className="absolute inset-0 w-full h-full object-contain" alt="Ref"/>
                             <DrawingCanvas 
                                imageUrl={refImage} 
                                width={400} 
                                height={400} 
                                onMaskChange={setMaskB} 
                                strokeColor="rgba(34,197,94,0.6)"
                              />
                             <button 
                                onClick={() => setRefImage(null)} 
                                className="absolute top-2 right-2 p-2 bg-black/50 hover:bg-red-500 text-white rounded-full opacity-0 group-hover:opacity-100 transition backdrop-blur-md"
                             >
                                <X size={16} />
                             </button>
                        </div>
                    )}
                 </div>
            </div>
        </div>

        <div className="p-5 bg-gray-900 border-t border-gray-700">
           <div className="flex gap-3 items-center">
                <div className="flex-1 relative">
                    <input 
                        type="text"
                        value={instruction}
                        onChange={(e) => setInstruction(e.target.value)}
                        placeholder="描述迁移意图..."
                        className="w-full bg-black/20 border border-transparent rounded-xl pl-4 pr-4 py-3 text-white placeholder-gray-400 focus:bg-black/40 focus:ring-0 outline-none transition-colors"
                    />
                </div>
                <button 
                    onClick={handleApply}
                    disabled={!maskA || !maskB || !instruction || !refImage}
                    className="bg-green-600 hover:bg-green-500 text-white px-6 py-3 rounded-xl font-bold flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-green-900/30 transition transform active:scale-95"
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

export default ContrastFixModal;

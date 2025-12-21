import React, { useRef, useEffect, useState } from 'react';

interface DrawingCanvasProps {
  imageUrl: string;
  width: number;
  height: number;
  onMaskChange: (base64Mask: string) => void;
  strokeColor?: string;
  lineWidth?: number;
  syncRef?: React.MutableRefObject<HTMLCanvasElement | null>; // For syncing two canvases
}

const DrawingCanvas: React.FC<DrawingCanvasProps> = ({ 
  imageUrl, 
  width, 
  height, 
  onMaskChange,
  strokeColor = "rgba(0, 255, 0, 0.5)",
  lineWidth = 20,
  syncRef
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const maskCanvasRef = useRef<HTMLCanvasElement>(null); // Hidden canvas to generate black/white mask
  const [isDrawing, setIsDrawing] = useState(false);

  useEffect(() => {
    const canvas = canvasRef.current;
    const maskCanvas = maskCanvasRef.current;
    if (!canvas || !maskCanvas) return;

    // Setup visual canvas
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.strokeStyle = strokeColor;
    ctx.lineWidth = lineWidth;

    // Setup mask canvas (black background, white drawing)
    const maskCtx = maskCanvas.getContext('2d');
    if (!maskCtx) return;
    maskCtx.fillStyle = 'black';
    maskCtx.fillRect(0, 0, width, height);
    maskCtx.lineCap = 'round';
    maskCtx.lineJoin = 'round';
    maskCtx.strokeStyle = 'white';
    maskCtx.lineWidth = lineWidth;

  }, [width, height, strokeColor, lineWidth]);

  const getCoordinates = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    return {
      x: (e.clientX - rect.left) * scaleX,
      y: (e.clientY - rect.top) * scaleY
    };
  };

  const startDrawing = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const { x, y } = getCoordinates(e);
    const ctx = canvasRef.current?.getContext('2d');
    const maskCtx = maskCanvasRef.current?.getContext('2d');
    
    if (ctx && maskCtx) {
        ctx.beginPath();
        ctx.moveTo(x, y);
        maskCtx.beginPath();
        maskCtx.moveTo(x, y);

        // Sync logic
        if (syncRef?.current) {
             const syncCtx = syncRef.current.getContext('2d');
             if(syncCtx) {
                 syncCtx.beginPath();
                 syncCtx.moveTo(x, y);
                 syncCtx.strokeStyle = strokeColor;
                 syncCtx.lineWidth = lineWidth;
                 syncCtx.lineCap = 'round';
                 syncCtx.lineJoin = 'round';
             }
        }
    }
    setIsDrawing(true);
  };

  const draw = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDrawing) return;
    const { x, y } = getCoordinates(e);
    const ctx = canvasRef.current?.getContext('2d');
    const maskCtx = maskCanvasRef.current?.getContext('2d');
    
    if (ctx && maskCtx) {
      ctx.lineTo(x, y);
      ctx.stroke();
      
      maskCtx.lineTo(x, y);
      maskCtx.stroke();

      // Sync logic
       if (syncRef?.current) {
             const syncCtx = syncRef.current.getContext('2d');
             if(syncCtx) {
                 syncCtx.lineTo(x, y);
                 syncCtx.stroke();
             }
        }
    }
  };

  const stopDrawing = () => {
    if (!isDrawing) return;
    setIsDrawing(false);
    
    const maskCanvas = maskCanvasRef.current;
    if (maskCanvas) {
        onMaskChange(maskCanvas.toDataURL('image/png'));
    }
  };

  return (
    <div className="relative" style={{ width, height }}>
      {/* Background Image */}
      <img 
        src={imageUrl} 
        alt="Base" 
        className="absolute inset-0 w-full h-full object-contain pointer-events-none select-none"
      />
      {/* Drawing Layer */}
      <canvas
        ref={canvasRef}
        width={width}
        height={height}
        onMouseDown={startDrawing}
        onMouseMove={draw}
        onMouseUp={stopDrawing}
        onMouseLeave={stopDrawing}
        className="absolute inset-0 cursor-crosshair touch-none"
      />
      {/* Hidden Mask Layer */}
      <canvas 
        ref={maskCanvasRef}
        width={width}
        height={height}
        className="hidden"
      />
    </div>
  );
};

export default DrawingCanvas;

import React, { useRef, useState, useEffect } from 'react';
import { NodeData, NodeType } from '../types';
import { GripHorizontal, Trash2 } from 'lucide-react';

interface NodeProps {
  node: NodeData;
  isSelected: boolean;
  canvasOffset: { x: number; y: number };
  scale: number; // Added scale for zoom correction
  onSelect: (id: string) => void;
  onMove: (id: string, x: number, y: number) => void;
  onResize: (id: string, width: number, height: number) => void; // Added resize callback
  onConnectStart: (nodeId: string, handleType: 'input' | 'output', e: React.MouseEvent) => void;
  onConnectEnd: (nodeId: string, handleType: 'input' | 'output') => void;
  onDelete: (id: string) => void;
  children: React.ReactNode;
}

const MIN_WIDTH = 200;
const MIN_HEIGHT = 150;

const Node: React.FC<NodeProps> = ({ 
  node, 
  isSelected, 
  canvasOffset,
  scale,
  onSelect, 
  onMove, 
  onResize,
  onConnectStart,
  onConnectEnd,
  onDelete,
  children 
}) => {
  const nodeRef = useRef<HTMLDivElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isResizing, setIsResizing] = useState(false);
  const dragStartPos = useRef({ x: 0, y: 0 }); // Mouse start pos
  const nodeStartPos = useRef({ x: 0, y: 0 }); // Node start pos
  const nodeStartDim = useRef({ w: 0, h: 0 }); // Node start dimensions

  // ---------------- Drag Logic ----------------
  const handleMouseDown = (e: React.MouseEvent) => {
    if ((e.target as HTMLElement).closest('input, textarea, button, .node-handle, .resize-handle')) return;
    
    e.stopPropagation();
    onSelect(node.id);
    setIsDragging(true);
    
    dragStartPos.current = { x: e.clientX, y: e.clientY };
    nodeStartPos.current = { x: node.position.x, y: node.position.y };
  };

  // ---------------- Resize Logic ----------------
  const handleResizeDown = (e: React.MouseEvent) => {
      e.stopPropagation();
      setIsResizing(true);
      dragStartPos.current = { x: e.clientX, y: e.clientY };
      const defaultWidth = node.type === NodeType.TEXT_RESULT_OUTPUT ? 500 : 320;
      nodeStartDim.current = { 
          w: node.dimensions?.width || defaultWidth, 
          h: node.dimensions?.height || 'auto' as any // simplified
      };
      // We need exact current pixel height if it was auto
      if (nodeRef.current) {
          nodeStartDim.current.h = nodeRef.current.offsetHeight;
      }
  };

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (isDragging) {
          const dx = (e.clientX - dragStartPos.current.x) / scale;
          const dy = (e.clientY - dragStartPos.current.y) / scale;
          onMove(node.id, nodeStartPos.current.x + dx, nodeStartPos.current.y + dy);
      }
      
      if (isResizing) {
          const dx = (e.clientX - dragStartPos.current.x) / scale;
          const dy = (e.clientY - dragStartPos.current.y) / scale;
          const newWidth = Math.max(MIN_WIDTH, nodeStartDim.current.w + dx);
          const newHeight = Math.max(MIN_HEIGHT, nodeStartDim.current.h + dy);
          onResize(node.id, newWidth, newHeight);
      }
    };

    const handleMouseUp = () => {
      setIsDragging(false);
      setIsResizing(false);
    };

    if (isDragging || isResizing) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
    }
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDragging, isResizing, onMove, onResize, node.id, scale]);

  // Determine handles based on node type
  // ResultOutput now allows output to support chaining
  const showInput =
    node.type !== NodeType.IMAGE_INPUT &&
    node.type !== NodeType.PROMPT_INPUT &&
    node.type !== NodeType.PROMPTMARK;
  const showOutput = true; // All nodes can potentially output to trigger next steps

  // Different default widths for different node types
  const getDefaultWidth = () => {
    if (node.type === NodeType.TEXT_RESULT_OUTPUT) return 500;
    return 320;
  };

  const width = node.dimensions?.width || getDefaultWidth();
  const height = node.dimensions?.height;
  const borderColor = node.lineageColor || (isSelected ? '#a855f7' : '#334155');
  const shadowColor = node.lineageColor 
    ? `${node.lineageColor}55` 
    : isSelected 
      ? 'rgba(168, 85, 247, 0.35)' 
      : 'rgba(0, 0, 0, 0.5)';

  const typeLabels: Record<NodeType, string> = {
    [NodeType.IMAGE_INPUT]: 'Image Input',
    [NodeType.PROMPT_INPUT]: 'Prompt',
    [NodeType.PROMPTMARK]: 'Promptmark',
    [NodeType.IMAGE_MODEL_SELECTOR]: 'Image Models',
    [NodeType.IMAGE_TO_IMAGE_MODEL_SELECTOR]: 'Image-to-Image',
    [NodeType.TEXT_MODEL_SELECTOR]: 'Text Models',
    [NodeType.RESULT_OUTPUT]: 'Image Result',
    [NodeType.TEXT_RESULT_OUTPUT]: 'Text Result',
    [NodeType.KNOWLEDGE]: 'Knowledge',
    [NodeType.WORKFLOW]: 'Application',
    [NodeType.GLASS_MOSAIC]: 'Glass Mosaic',
  };

  return (
    <div
      ref={nodeRef}
      onMouseDown={handleMouseDown}
      onWheelCapture={(e) => e.stopPropagation()}
      className={`absolute shadow-lg rounded-3xl border border-gray-300 ${!(isDragging || isResizing) ? 'transition-shadow duration-300' : ''} flex flex-col bg-gray-900/90 backdrop-blur-2xl text-white select-none z-10`}
      style={{ 
        left: node.position.x, 
        top: node.position.y,
        minWidth: MIN_WIDTH,
        width: width,
        height: height,
        minHeight: 'fit-content',
        cursor: isDragging ? 'grabbing' : 'grab',
        borderColor: isSelected ? '#3b82f6' : '#d1d5db', // Light gray border when not selected
        boxShadow: isSelected ? '0 0 0 2px rgba(59, 130, 246, 0.5), 0 20px 40px -12px rgba(0,0,0,0.4)' : '0 20px 40px -12px rgba(0,0,0,0.2)',
        background: 'linear-gradient(to bottom, rgba(55, 73, 95, 1), rgba(63, 83, 126, 1))' // Gray-800 to Gray-900
      }}
      data-node-id={node.id}
      data-stop-canvas-zoom="true"
    >
      {/* Input Handle */}
      {showInput && (
        <div 
          className="node-handle bg-gray-400 -left-3 top-[40px] transform -translate-y-1/2 hover:scale-125 transition-transform border-2 border-gray-900 shadow-lg shadow-black/50"
          onMouseDown={(e) => onConnectStart(node.id, 'input', e)}
          onMouseUp={() => onConnectEnd(node.id, 'input')}
          title="Input"
        />
      )}

      {/* Output Handle */}
      {showOutput && (
        <div 
          className="node-handle bg-gray-400 -right-3 top-[40px] transform -translate-y-1/2 hover:scale-125 transition-transform border-2 border-gray-900 shadow-lg shadow-black/50"
          onMouseDown={(e) => onConnectStart(node.id, 'output', e)}
          onMouseUp={() => onConnectEnd(node.id, 'output')}
          title="Output"
        />
      )}

      {/* Header */}
      <div className="px-5 py-4 rounded-t-3xl font-bold text-sm tracking-wide text-white flex justify-between items-center flex-shrink-0 bg-black/10 border-b border-gray-700">
        <span className="opacity-100 drop-shadow-md">{typeLabels[node.type] || node.type}</span>
        <button
          onClick={(e) => {
            e.stopPropagation();
            onDelete(node.id);
          }}
          className="text-gray-400 hover:text-red-400 transition p-1.5 rounded-full hover:bg-black/20"
          title="Delete node"
        >
          <Trash2 size={16} />
        </button>
      </div>

      {/* Content */}
      <div className="px-5 pb-5 pt-5 cursor-auto flex flex-col gap-4 overflow-visible">
        {children}
      </div>

      {/* Resize Handle */}
      <div 
        className="resize-handle absolute bottom-2 right-2 cursor-se-resize text-gray-500 hover:text-gray-300 p-1"
        onMouseDown={handleResizeDown}
      >
         <GripHorizontal size={16} />
      </div>
    </div>
  );
};

export default Node;

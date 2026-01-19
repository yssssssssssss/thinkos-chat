import React, { useEffect, useMemo, useRef, useState } from 'react';
import { LayoutGrid, Workflow } from 'lucide-react';

import Canvas from '../../Canvas';
import BoardCanvas from '../board/BoardCanvas';
import ChatView from '../chat/ChatView';
import { useWorkspace } from './WorkspaceContext';

const STORAGE_KEY = 'thinkos.workspace.splitLeftWidth';
const MIN_LEFT_PX = 360;
const MIN_RIGHT_PX = 420;

const WorkspaceLayout: React.FC = () => {
  const { mode, setMode, board } = useWorkspace();
  const containerRef = useRef<HTMLDivElement>(null);
  const [isDragging, setIsDragging] = useState(false);

  const [leftWidth, setLeftWidth] = useState<number>(() => {
    const raw = localStorage.getItem(STORAGE_KEY);
    const parsed = raw ? Number(raw) : NaN;
    return Number.isFinite(parsed) && parsed > 0 ? parsed : 640;
  });

  const clampLeftWidth = useMemo(() => {
    return (value: number) => {
      const containerWidth = containerRef.current?.clientWidth ?? 0;
      const maxLeft = Math.max(MIN_LEFT_PX, containerWidth - MIN_RIGHT_PX);
      return Math.max(MIN_LEFT_PX, Math.min(maxLeft, value));
    };
  }, []);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, String(leftWidth));
  }, [leftWidth]);

  useEffect(() => {
    if (!isDragging) return;

    const handleMove = (e: MouseEvent) => {
      const rect = containerRef.current?.getBoundingClientRect();
      if (!rect) return;
      const next = clampLeftWidth(e.clientX - rect.left);
      setLeftWidth(next);
    };

    const handleUp = () => {
      setIsDragging(false);
    };

    window.addEventListener('mousemove', handleMove);
    window.addEventListener('mouseup', handleUp);
    return () => {
      window.removeEventListener('mousemove', handleMove);
      window.removeEventListener('mouseup', handleUp);
    };
  }, [clampLeftWidth, isDragging]);

  return (
    <div ref={containerRef} className="h-full w-full overflow-hidden flex bg-white">
      <div
        className="h-full flex flex-col border-r border-gray-200 bg-white min-w-0"
        style={{ width: leftWidth }}
      >
        <div className="h-12 px-3 border-b border-gray-100 flex items-center justify-between gap-2 bg-white/80 backdrop-blur-sm">
          <div className="flex items-center gap-2">
            <button
              onClick={() => setMode('board')}
              className={`px-3 py-1.5 rounded-xl text-sm flex items-center gap-2 border transition ${
                mode === 'board'
                  ? 'bg-gray-900 text-white border-gray-900'
                  : 'bg-white text-gray-700 border-gray-200 hover:bg-gray-50'
              }`}
              title="画板（自由排版）"
            >
              <LayoutGrid className="w-4 h-4" />
              画板
            </button>
            <button
              onClick={() => setMode('workflow')}
              className={`px-3 py-1.5 rounded-xl text-sm flex items-center gap-2 border transition ${
                mode === 'workflow'
                  ? 'bg-gray-900 text-white border-gray-900'
                  : 'bg-white text-gray-700 border-gray-200 hover:bg-gray-50'
              }`}
              title="工作流（节点画布）"
            >
              <Workflow className="w-4 h-4" />
              工作流
            </button>
          </div>

          <div className="flex items-center gap-2">
            {!board.autoSyncEnabled && (
              <button
                onClick={() => board.setAutoSyncEnabled(true)}
                className="px-3 py-1.5 rounded-xl text-sm border border-amber-300 bg-amber-50 text-amber-900 hover:bg-amber-100 transition"
                title="恢复自动同步"
              >
                自动同步已暂停
              </button>
            )}
          </div>
        </div>

        <div className="flex-1 min-h-0">
          {mode === 'board' ? <BoardCanvas /> : <Canvas />}
        </div>
      </div>

      <div
        className={`w-1.5 h-full bg-gray-100 hover:bg-gray-200 cursor-col-resize transition ${
          isDragging ? 'bg-gray-300' : ''
        }`}
        onMouseDown={(e) => {
          e.preventDefault();
          setIsDragging(true);
        }}
        title="拖拽调整左右宽度"
      />

      <div className="flex-1 min-w-0 h-full bg-white">
        <ChatView />
      </div>
    </div>
  );
};

export default WorkspaceLayout;


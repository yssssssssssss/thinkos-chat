import React, { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import {
  Copy,
  Download,
  Eraser,
  Focus,
  Link2,
  Trash2,
  Wand2,
} from 'lucide-react';

import type { BoardItem, BoardViewport } from './types';
import { getBoardActions, type BoardActionContext } from './boardActions';
import { useWorkspace } from '../workspace/WorkspaceContext';

type DragState =
  | {
      type: 'pan';
      startClientX: number;
      startClientY: number;
      startPanX: number;
      startPanY: number;
    }
  | {
      type: 'move';
      itemId: string;
      startWorldX: number;
      startWorldY: number;
      startItemX: number;
      startItemY: number;
    }
  | {
      type: 'resize';
      itemId: string;
      startWorldX: number;
      startWorldY: number;
      startItemX: number;
      startItemY: number;
      startW: number;
      startH: number;
    };

const clamp = (value: number, min: number, max: number): number => Math.max(min, Math.min(max, value));

const BoardCanvas: React.FC = () => {
  const { board, setChatReferenceImage, openChatTool } = useWorkspace();
  const containerRef = useRef<HTMLDivElement>(null);
  const stageRef = useRef<HTMLDivElement>(null);
  const containerRectRef = useRef<DOMRect | null>(null);
  const itemRefs = useRef<Record<string, HTMLDivElement | null>>({});

  const [drag, setDrag] = useState<DragState | null>(null);
  const isSpaceDownRef = useRef(false);

  const viewportRef = useRef<BoardViewport>(board.state.viewport);
  const pendingViewportRef = useRef<BoardViewport>(board.state.viewport);
  const viewportRafRef = useRef<number | null>(null);
  const viewportCommitTimerRef = useRef<number | null>(null);

  const pendingItemRef = useRef<{ itemId: string; transform?: string; width?: number; height?: number } | null>(null);
  const itemRafRef = useRef<number | null>(null);

  const dragFinalRef = useRef<
    | { type: 'pan'; viewport: BoardViewport }
    | { type: 'move'; itemId: string; x: number; y: number }
    | { type: 'resize'; itemId: string; w: number; h: number }
    | null
  >(null);

  const formatStageTransform = useCallback((v: BoardViewport) => {
    return `translate3d(${v.panX}px, ${v.panY}px, 0) scale(${v.zoom})`;
  }, []);

  const applyViewport = useCallback(
    (next: BoardViewport) => {
      viewportRef.current = next;
      const el = stageRef.current;
      if (!el) return;
      el.style.transform = formatStageTransform(next);
    },
    [formatStageTransform]
  );

  const scheduleViewportApply = useCallback(
    (next: BoardViewport) => {
      pendingViewportRef.current = next;
      if (viewportRafRef.current != null) return;
      viewportRafRef.current = window.requestAnimationFrame(() => {
        viewportRafRef.current = null;
        applyViewport(pendingViewportRef.current);
      });
    },
    [applyViewport]
  );

  const scheduleViewportCommit = useCallback(
    (next: BoardViewport) => {
      if (viewportCommitTimerRef.current != null) {
        window.clearTimeout(viewportCommitTimerRef.current);
      }
      viewportCommitTimerRef.current = window.setTimeout(() => {
        viewportCommitTimerRef.current = null;
        board.setViewport(next);
      }, 160);
    },
    [board]
  );

  const scheduleItemApply = useCallback((pending: { itemId: string; transform?: string; width?: number; height?: number }) => {
    pendingItemRef.current = pending;
    if (itemRafRef.current != null) return;
    itemRafRef.current = window.requestAnimationFrame(() => {
      itemRafRef.current = null;
      const next = pendingItemRef.current;
      if (!next) return;
      const el = itemRefs.current[next.itemId];
      if (!el) return;
      if (next.transform != null) el.style.transform = next.transform;
      if (next.width != null) el.style.width = `${next.width}px`;
      if (next.height != null) el.style.height = `${next.height}px`;
    });
  }, []);

  useLayoutEffect(() => {
    if (!board.isReady) return;
    const next = board.state.viewport;
    pendingViewportRef.current = next;
    applyViewport(next);
  }, [applyViewport, board.isReady, board.state.viewport]);

  useEffect(() => {
    return () => {
      if (viewportRafRef.current != null) window.cancelAnimationFrame(viewportRafRef.current);
      if (itemRafRef.current != null) window.cancelAnimationFrame(itemRafRef.current);
      if (viewportCommitTimerRef.current != null) window.clearTimeout(viewportCommitTimerRef.current);
    };
  }, []);

  const maxZIndex = useMemo(() => {
    return board.items.reduce((acc, it) => Math.max(acc, it.zIndex ?? 0), 0);
  }, [board.items]);

  const selectedItem = useMemo(() => {
    if (!board.state.selectedItemId) return null;
    return board.items.find((it) => it.id === board.state.selectedItemId) ?? null;
  }, [board.items, board.state.selectedItemId]);

  const getWorldPoint = useCallback(
    (clientX: number, clientY: number): { x: number; y: number } | null => {
      const rect = containerRectRef.current ?? containerRef.current?.getBoundingClientRect();
      if (!rect) return null;
      const v = viewportRef.current;
      const x = (clientX - rect.left - v.panX) / v.zoom;
      const y = (clientY - rect.top - v.panY) / v.zoom;
      return { x, y };
    },
    []
  );

  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.code === 'Space') isSpaceDownRef.current = true;
    };
    const up = (e: KeyboardEvent) => {
      if (e.code === 'Space') isSpaceDownRef.current = false;
    };
    window.addEventListener('keydown', down);
    window.addEventListener('keyup', up);
    return () => {
      window.removeEventListener('keydown', down);
      window.removeEventListener('keyup', up);
    };
  }, []);

  useEffect(() => {
    if (!drag) return;

    const handleMove = (e: PointerEvent) => {
      e.preventDefault();
      if (drag.type === 'pan') {
        const dx = e.clientX - drag.startClientX;
        const dy = e.clientY - drag.startClientY;
        const v = viewportRef.current;
        const next: BoardViewport = { ...v, panX: drag.startPanX + dx, panY: drag.startPanY + dy };
        dragFinalRef.current = { type: 'pan', viewport: next };
        scheduleViewportApply(next);
        return;
      }

      const point = getWorldPoint(e.clientX, e.clientY);
      if (!point) return;

      if (drag.type === 'move') {
        const dx = point.x - drag.startWorldX;
        const dy = point.y - drag.startWorldY;
        const x = drag.startItemX + dx;
        const y = drag.startItemY + dy;
        dragFinalRef.current = { type: 'move', itemId: drag.itemId, x, y };
        scheduleItemApply({ itemId: drag.itemId, transform: `translate3d(${x}px, ${y}px, 0)` });
        return;
      }

      if (drag.type === 'resize') {
        const dx = point.x - drag.startWorldX;
        const dy = point.y - drag.startWorldY;
        const w = Math.max(120, drag.startW + dx);
        const h = Math.max(120, drag.startH + dy);
        dragFinalRef.current = { type: 'resize', itemId: drag.itemId, w, h };
        const sx = drag.startW ? w / drag.startW : 1;
        const sy = drag.startH ? h / drag.startH : 1;
        scheduleItemApply({
          itemId: drag.itemId,
          transform: `translate3d(${drag.startItemX}px, ${drag.startItemY}px, 0) scale(${sx}, ${sy})`,
        });
      }
    };

    const handleUp = () => {
      const final = dragFinalRef.current;
      dragFinalRef.current = null;
      containerRectRef.current = null;

      if (viewportCommitTimerRef.current != null) {
        window.clearTimeout(viewportCommitTimerRef.current);
        viewportCommitTimerRef.current = null;
      }

      if (final?.type === 'pan') {
        board.setViewport(final.viewport);
      } else if (final?.type === 'move') {
        board.updateItem(final.itemId, { x: final.x, y: final.y });
      } else if (final?.type === 'resize') {
        board.updateItem(final.itemId, { w: final.w, h: final.h });
      }
      setDrag(null);
    };

    window.addEventListener('pointermove', handleMove);
    window.addEventListener('pointerup', handleUp);
    return () => {
      window.removeEventListener('pointermove', handleMove);
      window.removeEventListener('pointerup', handleUp);
    };
  }, [board, containerRectRef, drag, getWorldPoint, scheduleItemApply, scheduleViewportApply, viewportCommitTimerRef]);

  const handleWheel: React.WheelEventHandler<HTMLDivElement> = (e) => {
    e.preventDefault();
    const rect = containerRef.current?.getBoundingClientRect();
    if (!rect) return;

    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;

    const v = viewportRef.current;
    const worldX = (mouseX - v.panX) / v.zoom;
    const worldY = (mouseY - v.panY) / v.zoom;

    const nextZoom = clamp(v.zoom * Math.exp(-e.deltaY * 0.001), 0.2, 4);
    const nextPanX = mouseX - worldX * nextZoom;
    const nextPanY = mouseY - worldY * nextZoom;

    const next: BoardViewport = { panX: nextPanX, panY: nextPanY, zoom: nextZoom };
    scheduleViewportApply(next);
    scheduleViewportCommit(next);
  };

  const beginPan: React.PointerEventHandler<HTMLDivElement> = (e) => {
    if (e.button === 1 || isSpaceDownRef.current) {
      (e.currentTarget as HTMLDivElement).setPointerCapture(e.pointerId);
      containerRectRef.current = containerRef.current?.getBoundingClientRect() ?? null;
      const v = viewportRef.current;
      setDrag({
        type: 'pan',
        startClientX: e.clientX,
        startClientY: e.clientY,
        startPanX: v.panX,
        startPanY: v.panY,
      });
    } else {
      board.selectItem(null);
    }
  };

  const selectAndRaise = (item: BoardItem) => {
    board.selectItem(item.id);
    if ((item.zIndex ?? 0) < maxZIndex) {
      board.updateItem(item.id, { zIndex: maxZIndex + 1 });
    }
  };

  const actionContext = useMemo<BoardActionContext>(() => {
    return {
      board,
      setChatReferenceImage,
      openChatTool,
    };
  }, [board, openChatTool, setChatReferenceImage]);

  const handleCopy = async (item: BoardItem) => {
    const url = board.resolveItemUrl(item);
    if (!url) return;
    await navigator.clipboard.writeText(url);
  };

  const handleDownload = (item: BoardItem) => {
    const url = board.resolveItemUrl(item);
    if (!url) return;
    const filename =
      item.meta.filename ||
      `${item.kind}_${new Date(item.createdAt || Date.now()).toISOString().replace(/[:.]/g, '-')}`;
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  if (!board.isReady) {
    return (
      <div className="w-full h-full flex items-center justify-center text-gray-500 text-sm">
        画板加载中…
      </div>
    );
  }

  return (
    <div className="w-full h-full bg-white relative overflow-hidden select-none">
      <div className="absolute left-3 bottom-3 z-20 px-2 py-1 rounded-lg bg-white/85 border border-gray-100 text-xs text-gray-600">
        滚轮缩放 / 中键或空格拖拽平移
      </div>

      {board.items.length === 0 && (
        <div className="absolute inset-0 flex items-center justify-center text-gray-400 text-sm pointer-events-none">
          暂无画布内容（工具产物与 AI 图片会自动沉淀到这里）
        </div>
      )}

      <div
        ref={containerRef}
        className="absolute inset-0"
        onWheel={handleWheel}
        onPointerDown={beginPan}
        style={{ touchAction: 'none' }}
      >
        <div
          ref={stageRef}
          className="absolute inset-0"
          style={{
            transformOrigin: '0 0',
            willChange: 'transform',
          }}
        >
          {board.items.map((item) => {
            const url = board.resolveItemUrl(item);
            const isSelected = item.id === board.state.selectedItemId;
            const isDragging = drag?.type !== 'pan' && drag?.itemId === item.id;
            return (
              <div
                key={item.id}
                ref={(el) => {
                  if (el) itemRefs.current[item.id] = el;
                  else {
                    // eslint-disable-next-line @typescript-eslint/no-dynamic-delete
                    delete itemRefs.current[item.id];
                  }
                }}
                className={`absolute rounded-2xl border shadow-sm bg-white overflow-hidden ${
                  isSelected ? 'border-blue-500 shadow-blue-200/50' : 'border-gray-200'
                }`}
                style={{
                  left: 0,
                  top: 0,
                  width: item.w,
                  height: item.h,
                  zIndex: item.zIndex,
                  transformOrigin: '0 0',
                  willChange: isDragging ? 'transform' : undefined,
                  transform: `translate3d(${item.x}px, ${item.y}px, 0)`,
                }}
                onPointerDown={(e) => {
                  e.stopPropagation();
                  selectAndRaise(item);
                  containerRectRef.current = containerRef.current?.getBoundingClientRect() ?? null;
                  const world = getWorldPoint(e.clientX, e.clientY);
                  if (!world) return;
                  setDrag({
                    type: 'move',
                    itemId: item.id,
                    startWorldX: world.x,
                    startWorldY: world.y,
                    startItemX: item.x,
                    startItemY: item.y,
                  });
                }}
              >
                <div className="absolute inset-0 bg-gray-50 flex items-center justify-center">
                  {!url ? (
                    <div className="text-xs text-gray-400">资源不可用</div>
                  ) : item.kind === 'video' ? (
                    <video src={url} className="w-full h-full object-contain" controls preload="metadata" />
                  ) : (
                    <img
                      src={url}
                      className="w-full h-full object-contain"
                      loading="lazy"
                      decoding="async"
                      draggable={false}
                    />
                  )}
                </div>

                {isSelected && (
                  <div className="absolute top-2 left-2 right-2 z-10 flex items-center gap-1 rounded-xl bg-white/90 border border-gray-100 p-1">
                    {(item.kind === 'image' || item.kind === 'gif' || item.kind === 'apng') && (
                      <button
                        className="px-2 py-1 rounded-lg text-xs text-gray-700 hover:bg-gray-100 transition flex items-center gap-1"
                        onPointerDown={(e) => e.stopPropagation()}
                        onClick={() => setChatReferenceImage(board.resolveItemUrl(item))}
                        title="设为参考图"
                      >
                        <Focus className="w-3.5 h-3.5" />
                        参考图
                      </button>
                    )}

                    <button
                      className="px-2 py-1 rounded-lg text-xs text-gray-700 hover:bg-gray-100 transition flex items-center gap-1"
                      onPointerDown={(e) => e.stopPropagation()}
                      onClick={() => handleDownload(item)}
                      title="下载"
                    >
                      <Download className="w-3.5 h-3.5" />
                      下载
                    </button>

                    <button
                      className="px-2 py-1 rounded-lg text-xs text-gray-700 hover:bg-gray-100 transition flex items-center gap-1"
                      onPointerDown={(e) => e.stopPropagation()}
                      onClick={() => void handleCopy(item)}
                      title="复制链接"
                    >
                      <Copy className="w-3.5 h-3.5" />
                      复制
                    </button>

                    {getBoardActions()
                      .filter((action) => (action.placement ?? 'left') === 'left')
                      .filter((action) => action.isVisible?.(item, actionContext) ?? true)
                      .map((action) => {
                        const Icon = action.icon;
                        const tone = action.tone ?? 'default';
                        const toneClass =
                          tone === 'danger' ? 'text-red-600 hover:bg-red-50' : 'text-gray-700 hover:bg-gray-100';
                        return (
                          <button
                            key={action.id}
                            className={`px-2 py-1 rounded-lg text-xs transition flex items-center gap-1 ${toneClass}`}
                            onPointerDown={(e) => e.stopPropagation()}
                            onClick={() => void action.onClick(item, actionContext)}
                            title={action.label}
                          >
                            {Icon && <Icon className="w-3.5 h-3.5" />}
                            {action.label}
                          </button>
                        );
                      })}

                    {item.kind === 'video' && (
                      <button
                        className="px-2 py-1 rounded-lg text-xs text-gray-700 hover:bg-gray-100 transition flex items-center gap-1"
                        onPointerDown={(e) => e.stopPropagation()}
                        onClick={() => openChatTool('video2gif')}
                        title="转 GIF（打开工具）"
                      >
                        <Wand2 className="w-3.5 h-3.5" />
                        转 GIF
                      </button>
                    )}

                    <div className="flex-1" />

                    {getBoardActions()
                      .filter((action) => (action.placement ?? 'left') === 'right')
                      .filter((action) => action.isVisible?.(item, actionContext) ?? true)
                      .map((action) => {
                        const Icon = action.icon;
                        const tone = action.tone ?? 'default';
                        const toneClass =
                          tone === 'danger' ? 'text-red-600 hover:bg-red-50' : 'text-gray-700 hover:bg-gray-100';
                        return (
                          <button
                            key={action.id}
                            className={`px-2 py-1 rounded-lg text-xs transition flex items-center gap-1 ${toneClass}`}
                            onPointerDown={(e) => e.stopPropagation()}
                            onClick={() => void action.onClick(item, actionContext)}
                            title={action.label}
                          >
                            {Icon && <Icon className="w-3.5 h-3.5" />}
                            {action.label}
                          </button>
                        );
                      })}

                    <button
                      className="px-2 py-1 rounded-lg text-xs text-red-600 hover:bg-red-50 transition flex items-center gap-1"
                      onPointerDown={(e) => e.stopPropagation()}
                      onClick={() => board.removeItem(item.id)}
                      title="从画布移除"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      移除
                    </button>
                  </div>
                )}

                <div
                  className="absolute bottom-2 right-2 z-10 w-5 h-5 rounded-full bg-white/90 border border-gray-200 flex items-center justify-center cursor-se-resize"
                  onPointerDown={(e) => {
                    e.stopPropagation();
                    selectAndRaise(item);
                    containerRectRef.current = containerRef.current?.getBoundingClientRect() ?? null;
                    const world = getWorldPoint(e.clientX, e.clientY);
                    if (!world) return;
                    setDrag({
                      type: 'resize',
                      itemId: item.id,
                      startWorldX: world.x,
                      startWorldY: world.y,
                      startItemX: item.x,
                      startItemY: item.y,
                      startW: item.w,
                      startH: item.h,
                    });
                  }}
                  title="拖拽缩放"
                >
                  <Eraser className="w-3.5 h-3.5 text-gray-400" />
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {selectedItem && (
        <div className="absolute right-3 top-14 z-20 px-3 py-2 rounded-2xl bg-white/85 border border-gray-100 text-xs text-gray-600 max-w-[260px]">
          <div className="flex items-center gap-1 text-gray-700 font-medium">
            <Link2 className="w-3.5 h-3.5" />
            {selectedItem.meta.source}
          </div>
          <div className="mt-1 text-gray-500 break-words">
            {selectedItem.meta.filename || selectedItem.id}
          </div>
        </div>
      )}
    </div>
  );
};

export default BoardCanvas;

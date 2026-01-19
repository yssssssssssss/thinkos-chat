import React, { createContext, useContext, useMemo, useRef, useState } from 'react';

import { useBoardController } from '../board/useBoardController';
import type { BoardController } from '../board/types';

export type WorkspaceMode = 'board' | 'workflow';
export type WorkspaceTool = 'video2gif' | 'png2apng' | 'particleize';

export type WorkspaceChatHandlers = {
  setReferenceImage: (url: string | null) => void;
  openTool?: (tool: WorkspaceTool) => void;
};

export type WorkspaceContextValue = {
  mode: WorkspaceMode;
  setMode: (mode: WorkspaceMode) => void;

  board: BoardController;

  registerChatHandlers: (handlers: WorkspaceChatHandlers) => void;
  setChatReferenceImage: (url: string | null) => void;
  openChatTool: (tool: WorkspaceTool) => void;
};

const WorkspaceContext = createContext<WorkspaceContextValue | null>(null);

export const WorkspaceProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [mode, setMode] = useState<WorkspaceMode>('board');
  const chatHandlersRef = useRef<WorkspaceChatHandlers | null>(null);
  const hasShownQuotaAlertRef = useRef(false);

  const board = useBoardController({
    onQuotaExceeded: () => {
      if (hasShownQuotaAlertRef.current) return;
      hasShownQuotaAlertRef.current = true;
      window.alert('画板自动同步已暂停：浏览器本地存储空间不足。请删除部分画板资源后在画板顶部恢复同步。');
    },
  });

  const registerChatHandlers = (handlers: WorkspaceChatHandlers) => {
    chatHandlersRef.current = handlers;
  };

  const setChatReferenceImage = (url: string | null) => {
    chatHandlersRef.current?.setReferenceImage(url);
  };

  const openChatTool = (tool: WorkspaceTool) => {
    chatHandlersRef.current?.openTool?.(tool);
  };

  const value = useMemo<WorkspaceContextValue>(() => {
    return {
      mode,
      setMode,
      board,
      registerChatHandlers,
      setChatReferenceImage,
      openChatTool,
    };
  }, [board, mode]);

  return <WorkspaceContext.Provider value={value}>{children}</WorkspaceContext.Provider>;
};

export const useWorkspace = (): WorkspaceContextValue => {
  const ctx = useContext(WorkspaceContext);
  if (!ctx) {
    throw new Error('useWorkspace must be used within WorkspaceProvider');
  }
  return ctx;
};


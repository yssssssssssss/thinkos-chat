import type React from 'react';

import type { BoardController, BoardItem } from './types';

export type BoardActionContext = {
  board: BoardController;
  setChatReferenceImage: (url: string | null) => void;
  openChatTool: (tool: 'video2gif' | 'png2apng' | 'particleize') => void;
};

export type BoardAction = {
  id: string;
  label: string;
  icon?: React.ComponentType<{ className?: string }>;
  order?: number;
  placement?: 'left' | 'right';
  tone?: 'default' | 'danger';
  isVisible?: (item: BoardItem, ctx: BoardActionContext) => boolean;
  onClick: (item: BoardItem, ctx: BoardActionContext) => void | Promise<void>;
};

const registry = new Map<string, BoardAction>();

export const registerBoardAction = (action: BoardAction) => {
  registry.set(action.id, action);
};

export const unregisterBoardAction = (id: string) => {
  registry.delete(id);
};

export const getBoardActions = (): BoardAction[] => {
  return Array.from(registry.values()).sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
};

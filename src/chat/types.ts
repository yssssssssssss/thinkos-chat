/**
 * Chat 模块类型定义
 */

export type TabType = 'chat' | 'canvas';
export type ModeType = 'text' | 'image';
export type PanelType = 'none' | 'promptMarket' | 'systemPrompt' | 'glassMosaic' | 'models' | 'moreTools' | 'inpaint' | 'remix' | 'refine';

export interface ModelOption {
  id: string;
  name: string;
  selected: boolean;
}

export interface ToolButton {
  id: string;
  icon: any;
  label: string;
  color: string;
}

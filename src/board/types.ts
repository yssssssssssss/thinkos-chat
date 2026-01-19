export type BoardItemKind = 'image' | 'gif' | 'video' | 'apng';

export type BoardItemSource =
  | { type: 'url'; url: string }
  | { type: 'blob'; blobId: string }
  | {
      type: 'conversation-image';
      conversationId: string;
      messageId: string;
      imageIndex: number;
    };

export type BoardItemMeta = {
  source: 'chat' | 'video2gif' | 'png2apng' | 'particleize' | 'other';
  filename?: string;
  modelName?: string;
  prompt?: string;
  createdAt?: number;
};

export type BoardItem = {
  id: string;
  kind: BoardItemKind;
  source: BoardItemSource;
  x: number;
  y: number;
  w: number;
  h: number;
  zIndex: number;
  createdAt: number;
  meta: BoardItemMeta;
};

export type BoardViewport = {
  panX: number;
  panY: number;
  zoom: number;
};

export type BoardState = {
  viewport: BoardViewport;
  selectedItemId: string | null;
  autoSyncEnabled: boolean;
  seededFromConversations: boolean;
  suppressedConversationImageIds: string[];
};

export type AddBoardBlobParams = {
  kind: BoardItemKind;
  blob: Blob;
  filename: string;
  meta: Omit<BoardItemMeta, 'filename'>;
};

export type ConversationImageAsset = {
  conversationId: string;
  messageId: string;
  imageIndex: number;
  imageUrl: string;
  modelName: string;
  prompt?: string;
  createdAt: number;
};

export type BoardController = {
  isReady: boolean;
  items: BoardItem[];
  state: BoardState;
  autoSyncEnabled: boolean;

  selectItem: (id: string | null) => void;
  setViewport: (viewport: BoardViewport) => void;
  updateItem: (id: string, updates: Partial<Pick<BoardItem, 'x' | 'y' | 'w' | 'h' | 'zIndex'>>) => void;
  removeItem: (id: string) => void;
  clearAll: () => void;

  resolveItemUrl: (item: BoardItem) => string | null;

  addBlobItem: (
    params: AddBoardBlobParams
  ) => Promise<{ ok: true } | { ok: false; reason: 'autosync_disabled' | 'quota_exceeded' | 'unknown' }>;
  upsertConversationImages: (assets: ConversationImageAsset[]) => void;

  setAutoSyncEnabled: (enabled: boolean) => void;
};

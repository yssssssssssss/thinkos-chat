import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import { getAllConversations, getConversation, initConversationService } from '@/services/conversationService';

import { boardDb } from './boardDb';
import type {
  AddBoardBlobParams,
  BoardController,
  BoardItem,
  BoardItemKind,
  BoardItemSource,
  BoardState,
  BoardViewport,
  ConversationImageAsset,
} from './types';

export type UseBoardControllerOptions = {
  onQuotaExceeded?: () => void;
};

const DEFAULT_VIEWPORT: BoardViewport = { panX: 0, panY: 0, zoom: 1 };

const DEFAULT_STATE: BoardState = {
  viewport: DEFAULT_VIEWPORT,
  selectedItemId: null,
  autoSyncEnabled: true,
  seededFromConversations: false,
  suppressedConversationImageIds: [],
};

const isQuotaExceededError = (error: unknown): boolean => {
  if (!error) return false;
  if (error instanceof DOMException && error.name === 'QuotaExceededError') return true;
  if (typeof error === 'object' && 'name' in error && (error as any).name === 'QuotaExceededError') return true;
  if (typeof error === 'object' && 'message' in error && typeof (error as any).message === 'string') {
    return (error as any).message.includes('QuotaExceededError');
  }
  return false;
};

const createId = (): string => `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;

const toConversationImageId = (asset: Pick<ConversationImageAsset, 'conversationId' | 'messageId' | 'imageIndex'>): string =>
  `conv:${asset.conversationId}:${asset.messageId}:${asset.imageIndex}`;

const inferKindFromUrl = (url: string): BoardItemKind => {
  const lower = (url || '').toLowerCase();
  if (lower.startsWith('data:video/')) return 'video';
  if (lower.endsWith('.webm') || lower.endsWith('.mp4') || lower.endsWith('.mov') || lower.endsWith('.mkv')) return 'video';
  if (lower.startsWith('data:image/gif') || lower.endsWith('.gif')) return 'gif';
  if (lower.startsWith('data:image/apng') || lower.endsWith('.apng')) return 'apng';
  return 'image';
};

const getDefaultSizeForKind = (kind: BoardItemKind): { w: number; h: number } => {
  if (kind === 'video') return { w: 420, h: 240 };
  if (kind === 'gif' || kind === 'apng') return { w: 360, h: 240 };
  return { w: 360, h: 240 };
};

const getNextSpawnPosition = (count: number): { x: number; y: number } => {
  const col = count % 3;
  const row = Math.floor(count / 3);
  return { x: 40 + col * 400, y: 40 + row * 280 };
};

export const useBoardController = (options?: UseBoardControllerOptions): BoardController => {
  const [items, setItems] = useState<BoardItem[]>([]);
  const [state, setState] = useState<BoardState>(DEFAULT_STATE);
  const [isReady, setIsReady] = useState(false);
  const [blobUrls, setBlobUrls] = useState<Record<string, string>>({});

  const itemsRef = useRef<BoardItem[]>([]);
  const stateRef = useRef<BoardState>(state);
  const blobUrlsRef = useRef<Record<string, string>>({});

  const dirtyItemIdsRef = useRef<Set<string>>(new Set());
  const flushItemsTimerRef = useRef<number | null>(null);
  const flushStateTimerRef = useRef<number | null>(null);

  useEffect(() => {
    itemsRef.current = items;
  }, [items]);

  useEffect(() => {
    stateRef.current = state;
  }, [state]);

  useEffect(() => {
    blobUrlsRef.current = blobUrls;
  }, [blobUrls]);

  const revokeBlobUrl = useCallback((blobId: string) => {
    setBlobUrls((prev) => {
      const url = prev[blobId];
      if (url) URL.revokeObjectURL(url);
      const { [blobId]: _removed, ...rest } = prev;
      return rest;
    });
  }, []);

  const flushDirtyItems = useCallback(async () => {
    const ids = Array.from(dirtyItemIdsRef.current);
    if (!ids.length) return;
    dirtyItemIdsRef.current.clear();
    flushItemsTimerRef.current = null;

    const current = itemsRef.current;
    const toSave = ids
      .map((id) => current.find((it) => it.id === id))
      .filter((it): it is BoardItem => Boolean(it));

    try {
      await boardDb.putItems(toSave);
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error('[Board] Failed to persist items', error);
    }
  }, []);

  const schedulePersistItem = useCallback(
    (id: string) => {
      dirtyItemIdsRef.current.add(id);
      if (flushItemsTimerRef.current) return;
      flushItemsTimerRef.current = window.setTimeout(() => {
        void flushDirtyItems();
      }, 500);
    },
    [flushDirtyItems]
  );

  const flushState = useCallback(async () => {
    flushStateTimerRef.current = null;
    try {
      await boardDb.putState(stateRef.current);
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error('[Board] Failed to persist state', error);
    }
  }, []);

  const schedulePersistState = useCallback(() => {
    if (flushStateTimerRef.current) {
      window.clearTimeout(flushStateTimerRef.current);
    }
    flushStateTimerRef.current = window.setTimeout(() => {
      void flushState();
    }, 250);
  }, [flushState]);

  const ensureSeededFromConversations = useCallback(async () => {
    const snapshot = stateRef.current;
    if (snapshot.seededFromConversations) return;
    if (itemsRef.current.length) return;

    try {
      await initConversationService();
      const conversations = getAllConversations();
      const assets: ConversationImageAsset[] = [];
      const suppressed = new Set(snapshot.suppressedConversationImageIds ?? []);
      for (const conv of conversations) {
        for (const msg of conv.messages) {
          if (msg.role !== 'assistant') continue;
          const responses = msg.imageResponses || [];
          for (let idx = 0; idx < responses.length; idx++) {
            const resp = responses[idx];
            if (resp.status !== 'complete') continue;
            if (!resp.imageUrl) continue;
            const id = toConversationImageId({ conversationId: conv.id, messageId: msg.id, imageIndex: idx });
            if (suppressed.has(id)) continue;
            assets.push({
              conversationId: conv.id,
              messageId: msg.id,
              imageIndex: idx,
              imageUrl: resp.imageUrl,
              modelName: resp.modelName,
              prompt: resp.prompt,
              createdAt: msg.timestamp,
            });
          }
        }
      }

      if (assets.length) {
        const seedItems: BoardItem[] = assets.map((asset, index) => {
          const { w, h } = getDefaultSizeForKind(inferKindFromUrl(asset.imageUrl));
          const { x, y } = getNextSpawnPosition(index);
          const id = toConversationImageId(asset);
          const source: BoardItemSource = {
            type: 'conversation-image',
            conversationId: asset.conversationId,
            messageId: asset.messageId,
            imageIndex: asset.imageIndex,
          };
          return {
            id,
            kind: inferKindFromUrl(asset.imageUrl),
            source,
            x,
            y,
            w,
            h,
            zIndex: index + 1,
            createdAt: asset.createdAt,
            meta: {
              source: 'chat',
              modelName: asset.modelName,
              prompt: asset.prompt,
              createdAt: asset.createdAt,
            },
          };
        });

        setItems(seedItems);
        await boardDb.putItems(seedItems);
      }

      setState((prev) => ({ ...prev, seededFromConversations: true }));
      await boardDb.putState({ ...stateRef.current, seededFromConversations: true });
    } catch (error) {
      // eslint-disable-next-line no-console
      console.warn('[Board] Seed from conversations skipped', error);
      setState((prev) => ({ ...prev, seededFromConversations: true }));
      schedulePersistState();
    }
  }, [schedulePersistState]);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const [savedState, savedItems] = await Promise.all([boardDb.getState(), boardDb.getAllItems()]);
        if (cancelled) return;

        const nextState: BoardState = {
          ...DEFAULT_STATE,
          ...savedState,
          viewport: savedState?.viewport ?? DEFAULT_VIEWPORT,
          selectedItemId: null,
        };

        setState(nextState);
        setItems(savedItems.sort((a, b) => (a.zIndex ?? 0) - (b.zIndex ?? 0)));

        const blobIds = Array.from(
          new Set(
            savedItems
              .map((it) => it.source)
              .filter((src): src is { type: 'blob'; blobId: string } => src.type === 'blob')
              .map((src) => src.blobId)
          )
        );

        if (blobIds.length) {
          const entries = await Promise.all(
            blobIds.map(async (blobId) => {
              try {
                const record = await boardDb.getBlob(blobId);
                if (!record) return null;
                return [blobId, URL.createObjectURL(record.blob)] as const;
              } catch {
                return null;
              }
            })
          );

          if (!cancelled) {
            const nextUrls: Record<string, string> = {};
            for (const ent of entries) {
              if (!ent) continue;
              nextUrls[ent[0]] = ent[1];
            }
            setBlobUrls(nextUrls);
          }
        }

        setIsReady(true);

        if (!nextState.seededFromConversations && savedItems.length === 0) {
          void ensureSeededFromConversations();
        }
      } catch (error) {
        // eslint-disable-next-line no-console
        console.error('[Board] Failed to load', error);
        setIsReady(true);
      }
    })();

    return () => {
      cancelled = true;
      if (flushItemsTimerRef.current) window.clearTimeout(flushItemsTimerRef.current);
      if (flushStateTimerRef.current) window.clearTimeout(flushStateTimerRef.current);
      for (const url of Object.values(blobUrlsRef.current)) {
        URL.revokeObjectURL(url);
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const selectItem = useCallback((id: string | null) => {
    setState((prev) => ({ ...prev, selectedItemId: id }));
  }, []);

  const setViewport = useCallback((viewport: BoardViewport) => {
    setState((prev) => ({ ...prev, viewport }));
    schedulePersistState();
  }, [schedulePersistState]);

  const updateItem = useCallback(
    (id: string, updates: Partial<Pick<BoardItem, 'x' | 'y' | 'w' | 'h' | 'zIndex'>>) => {
    setItems((prev) => prev.map((it) => (it.id === id ? { ...it, ...updates } : it)));
    schedulePersistItem(id);
    },
    [schedulePersistItem]
  );

  const removeItem = useCallback((id: string) => {
    const removedItem = itemsRef.current.find((it) => it.id === id);
    setItems((prev) => {
      const target = prev.find((it) => it.id === id);
      if (target?.source.type === 'blob') {
        const blobId = target.source.blobId;
        void boardDb.deleteBlob(blobId).catch(console.error);
        revokeBlobUrl(blobId);
      }
      void boardDb.deleteItem(id).catch(console.error);
      return prev.filter((it) => it.id !== id);
    });
    setState((prev) => {
      const selectedItemId = prev.selectedItemId === id ? null : prev.selectedItemId;
      if (removedItem?.source.type !== 'conversation-image') return { ...prev, selectedItemId };
      if (prev.suppressedConversationImageIds.includes(id)) return { ...prev, selectedItemId };
      return { ...prev, selectedItemId, suppressedConversationImageIds: [...prev.suppressedConversationImageIds, id] };
    });
    schedulePersistState();
  }, [revokeBlobUrl, schedulePersistState]);

  const clearAll = useCallback(() => {
    for (const url of Object.values(blobUrls)) {
      URL.revokeObjectURL(url);
    }
    setBlobUrls({});
    setItems([]);
    const nextState: BoardState = { ...DEFAULT_STATE, autoSyncEnabled: true, seededFromConversations: true };
    setState({ ...nextState, selectedItemId: null });
    void boardDb
      .clearAll()
      .then(() => boardDb.putState(nextState))
      .catch(console.error);
  }, [blobUrls]);

  const resolveItemUrl = useCallback(
    (item: BoardItem): string | null => {
      if (item.source.type === 'url') return item.source.url;
      if (item.source.type === 'blob') return blobUrls[item.source.blobId] ?? null;
      if (item.source.type === 'conversation-image') {
        const conv = getConversation(item.source.conversationId);
        const msg = conv?.messages.find((m) => m.id === item.source.messageId);
        const resp = msg?.imageResponses?.[item.source.imageIndex];
        return resp?.imageUrl ?? null;
      }
      return null;
    },
    [blobUrls]
  );

  const addBlobItem: BoardController['addBlobItem'] = useCallback(
    async (params: AddBoardBlobParams) => {
      if (!stateRef.current.autoSyncEnabled) return { ok: false, reason: 'autosync_disabled' };

      const blobId = createId();
      const itemId = `blob:${blobId}`;
      const createdAt = Date.now();

      try {
        await boardDb.putBlob({
          id: blobId,
          blob: params.blob,
          kind: params.kind,
          createdAt,
          filename: params.filename,
          size: params.blob.size,
        });
      } catch (error) {
        if (isQuotaExceededError(error)) {
          setState((prev) => ({ ...prev, autoSyncEnabled: false }));
          schedulePersistState();
          options?.onQuotaExceeded?.();
          return { ok: false, reason: 'quota_exceeded' };
        }
        // eslint-disable-next-line no-console
        console.error('[Board] Failed to store blob', error);
        return { ok: false, reason: 'unknown' };
      }

      const url = URL.createObjectURL(params.blob);
      setBlobUrls((prev) => ({ ...prev, [blobId]: url }));

      const maxZ = itemsRef.current.reduce((acc, it) => Math.max(acc, it.zIndex ?? 0), 0);
      const { w, h } = getDefaultSizeForKind(params.kind);
      const { x, y } = getNextSpawnPosition(itemsRef.current.length);

      const item: BoardItem = {
        id: itemId,
        kind: params.kind,
        source: { type: 'blob', blobId },
        x,
        y,
        w,
        h,
        zIndex: maxZ + 1,
        createdAt,
        meta: {
          ...params.meta,
          filename: params.filename,
          createdAt,
        },
      };

      setItems((prev) => [...prev, item]);
      try {
        await boardDb.putItems([item]);
      } catch (error) {
        // eslint-disable-next-line no-console
        console.error('[Board] Failed to store item', error);
      }

      return { ok: true };
    },
    [options, schedulePersistState]
  );

  const upsertConversationImages = useCallback(
    (assets: ConversationImageAsset[]) => {
      if (!assets.length) return;
      const suppressed = new Set(stateRef.current.suppressedConversationImageIds ?? []);

      setItems((prev) => {
        const existingIds = new Set(prev.map((it) => it.id));
        const maxZ = prev.reduce((acc, it) => Math.max(acc, it.zIndex ?? 0), 0);
        let z = maxZ;
        const next = [...prev];
        const toPersist: BoardItem[] = [];

        for (const asset of assets) {
          const id = toConversationImageId(asset);
          if (suppressed.has(id)) continue;
          if (existingIds.has(id)) continue;
          existingIds.add(id);
          z += 1;

          const kind = inferKindFromUrl(asset.imageUrl);
          const { w, h } = getDefaultSizeForKind(kind);
          const { x, y } = getNextSpawnPosition(next.length);

          const item: BoardItem = {
            id,
            kind,
            source: {
              type: 'conversation-image',
              conversationId: asset.conversationId,
              messageId: asset.messageId,
              imageIndex: asset.imageIndex,
            },
            x,
            y,
            w,
            h,
            zIndex: z,
            createdAt: asset.createdAt,
            meta: {
              source: 'chat',
              modelName: asset.modelName,
              prompt: asset.prompt,
              createdAt: asset.createdAt,
            },
          };

          next.push(item);
          toPersist.push(item);
        }

        if (toPersist.length) {
          void boardDb.putItems(toPersist).catch(console.error);
        }

        return next;
      });
    },
    []
  );

  const setAutoSyncEnabled = useCallback((enabled: boolean) => {
    setState((prev) => ({ ...prev, autoSyncEnabled: enabled }));
    schedulePersistState();
  }, [schedulePersistState]);

  return useMemo<BoardController>(() => {
    return {
      isReady,
      items,
      state,
      autoSyncEnabled: state.autoSyncEnabled,
      selectItem,
      setViewport,
      updateItem,
      removeItem,
      clearAll,
      resolveItemUrl,
      addBlobItem,
      upsertConversationImages,
      setAutoSyncEnabled,
    };
  }, [
    addBlobItem,
    clearAll,
    isReady,
    items,
    removeItem,
    resolveItemUrl,
    selectItem,
    setAutoSyncEnabled,
    setViewport,
    state,
    updateItem,
    upsertConversationImages,
  ]);
};

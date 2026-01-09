/**
 * 对话管理服务
 * 实现对话的 CRUD 操作和持久化存储
 * 使用 IndexedDB 存储大数据（如图片），localStorage 作为备份
 */

// ========== 类型定义 ==========

export interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: number;
  // 文本响应
  textResponses?: Array<{
    modelId: string;
    modelName: string;
    content: string;
    status: 'complete' | 'error';
    error?: string;
  }>;
  // 图像响应
  imageResponses?: Array<{
    modelId: string;
    modelName: string;
    imageUrl?: string;
    prompt?: string;
    status: 'complete' | 'error';
    error?: string;
  }>;
  // 参考图
  referenceImage?: string;
}

export interface Conversation {
  id: string;
  title: string;
  createdAt: number;
  updatedAt: number;
  messages: Message[];
}

// ========== 常量 ==========

const STORAGE_KEY = 'geminiflow_conversations';
const DB_NAME = 'GeminiFlowConversations';
const DB_VERSION = 1;
const STORE_NAME = 'conversations';
const MAX_CONVERSATIONS = 100;

// ========== IndexedDB 操作 ==========

let db: IDBDatabase | null = null;
let dbInitPromise: Promise<IDBDatabase> | null = null;

const initDB = (): Promise<IDBDatabase> => {
  if (db) return Promise.resolve(db);
  if (dbInitPromise) return dbInitPromise;

  dbInitPromise = new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onerror = () => {
      console.error('[ConversationService] Failed to open IndexedDB:', request.error);
      dbInitPromise = null;
      reject(request.error);
    };

    request.onsuccess = () => {
      db = request.result;
      console.log('[ConversationService] IndexedDB opened successfully');
      resolve(db);
    };

    request.onupgradeneeded = (event) => {
      const database = (event.target as IDBOpenDBRequest).result;
      if (!database.objectStoreNames.contains(STORE_NAME)) {
        database.createObjectStore(STORE_NAME, { keyPath: 'id' });
        console.log('[ConversationService] IndexedDB store created');
      }
    };
  });

  return dbInitPromise;
};

// 从 IndexedDB 加载所有对话
const loadFromIndexedDB = async (): Promise<Conversation[]> => {
  try {
    const database = await initDB();
    return new Promise((resolve, reject) => {
      const transaction = database.transaction([STORE_NAME], 'readonly');
      const store = transaction.objectStore(STORE_NAME);
      const request = store.getAll();

      request.onsuccess = () => {
        const conversations = (request.result || []) as Conversation[];
        resolve(conversations.sort((a, b) => b.updatedAt - a.updatedAt));
      };

      request.onerror = () => {
        console.error('[ConversationService] Failed to load from IndexedDB');
        reject(request.error);
      };
    });
  } catch (error) {
    console.error('[ConversationService] IndexedDB load error:', error);
    return [];
  }
};

// 保存单个对话到 IndexedDB
const saveToIndexedDB = async (conversation: Conversation): Promise<void> => {
  try {
    const database = await initDB();
    return new Promise((resolve, reject) => {
      const transaction = database.transaction([STORE_NAME], 'readwrite');
      const store = transaction.objectStore(STORE_NAME);
      const request = store.put(conversation);

      request.onsuccess = () => {
        resolve();
      };

      request.onerror = () => {
        console.error('[ConversationService] Failed to save to IndexedDB');
        reject(request.error);
      };
    });
  } catch (error) {
    console.error('[ConversationService] IndexedDB save error:', error);
    throw error;
  }
};

// 从 IndexedDB 删除对话
const deleteFromIndexedDB = async (id: string): Promise<void> => {
  try {
    const database = await initDB();
    return new Promise((resolve, reject) => {
      const transaction = database.transaction([STORE_NAME], 'readwrite');
      const store = transaction.objectStore(STORE_NAME);
      const request = store.delete(id);

      request.onsuccess = () => {
        resolve();
      };

      request.onerror = () => {
        reject(request.error);
      };
    });
  } catch (error) {
    console.error('[ConversationService] IndexedDB delete error:', error);
    throw error;
  }
};

// 清空 IndexedDB
const clearIndexedDB = async (): Promise<void> => {
  try {
    const database = await initDB();
    return new Promise((resolve, reject) => {
      const transaction = database.transaction([STORE_NAME], 'readwrite');
      const store = transaction.objectStore(STORE_NAME);
      const request = store.clear();

      request.onsuccess = () => {
        resolve();
      };

      request.onerror = () => {
        reject(request.error);
      };
    });
  } catch (error) {
    console.error('[ConversationService] IndexedDB clear error:', error);
    throw error;
  }
};

// ========== 辅助函数 ==========

const generateId = (): string => {
  return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
};

const formatTime = (timestamp: number): string => {
  const now = Date.now();
  const diff = now - timestamp;
  
  // 今天
  if (diff < 24 * 60 * 60 * 1000) {
    const date = new Date(timestamp);
    return `${date.getHours().toString().padStart(2, '0')}:${date.getMinutes().toString().padStart(2, '0')}`;
  }
  
  // 昨天
  if (diff < 48 * 60 * 60 * 1000) {
    return '昨天';
  }
  
  // 本周
  if (diff < 7 * 24 * 60 * 60 * 1000) {
    const days = ['周日', '周一', '周二', '周三', '周四', '周五', '周六'];
    return days[new Date(timestamp).getDay()];
  }
  
  // 更早
  const date = new Date(timestamp);
  return `${date.getMonth() + 1}/${date.getDate()}`;
};

// ========== localStorage 备份（用于小数据和迁移） ==========

const loadFromLocalStorage = (): Conversation[] => {
  try {
    const data = localStorage.getItem(STORAGE_KEY);
    if (!data) return [];
    return JSON.parse(data) as Conversation[];
  } catch (error) {
    console.error('[ConversationService] Failed to load from localStorage:', error);
    return [];
  }
};

const clearLocalStorage = (): void => {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch (error) {
    console.error('[ConversationService] Failed to clear localStorage:', error);
  }
};

// ========== 缓存 ==========

let cachedConversations: Conversation[] | null = null;
let isInitialized = false;

// 初始化：从 IndexedDB 加载，如果为空则从 localStorage 迁移
const initializeCache = async (): Promise<Conversation[]> => {
  if (cachedConversations && isInitialized) {
    return cachedConversations;
  }

  try {
    // 先从 IndexedDB 加载
    let conversations = await loadFromIndexedDB();
    
    // 如果 IndexedDB 为空，尝试从 localStorage 迁移
    if (conversations.length === 0) {
      const localData = loadFromLocalStorage();
      if (localData.length > 0) {
        console.log('[ConversationService] Migrating data from localStorage to IndexedDB...');
        for (const conv of localData) {
          await saveToIndexedDB(conv);
        }
        conversations = localData;
        // 迁移成功后清除 localStorage
        clearLocalStorage();
        console.log('[ConversationService] Migration complete');
      }
    }

    cachedConversations = conversations.sort((a, b) => b.updatedAt - a.updatedAt);
    isInitialized = true;
    return cachedConversations;
  } catch (error) {
    console.error('[ConversationService] Failed to initialize:', error);
    // 降级到 localStorage
    cachedConversations = loadFromLocalStorage();
    isInitialized = true;
    return cachedConversations;
  }
};

// 同步获取缓存（用于同步 API）
const getConversationsSync = (): Conversation[] => {
  if (!cachedConversations) {
    // 如果缓存未初始化，先从 localStorage 加载作为临时数据
    cachedConversations = loadFromLocalStorage();
    // 异步初始化 IndexedDB
    initializeCache().catch(console.error);
  }
  return cachedConversations;
};

// 更新缓存并保存
const updateCacheAndSave = async (conversation: Conversation): Promise<void> => {
  const conversations = getConversationsSync();
  const index = conversations.findIndex(c => c.id === conversation.id);
  
  if (index >= 0) {
    conversations[index] = conversation;
  } else {
    conversations.unshift(conversation);
  }
  
  // 限制数量
  if (conversations.length > MAX_CONVERSATIONS) {
    const removed = conversations.splice(MAX_CONVERSATIONS);
    // 删除超出的对话
    for (const conv of removed) {
      deleteFromIndexedDB(conv.id).catch(console.error);
    }
  }
  
  cachedConversations = conversations.sort((a, b) => b.updatedAt - a.updatedAt);
  
  // 保存到 IndexedDB
  try {
    await saveToIndexedDB(conversation);
  } catch (error) {
    console.error('[ConversationService] Failed to save conversation:', error);
  }
};

// ========== 公开 API ==========

/**
 * 初始化服务（异步）
 */
export const initConversationService = async (): Promise<void> => {
  await initializeCache();
};

/**
 * 获取所有对话列表
 */
export const getAllConversations = (): Conversation[] => {
  return getConversationsSync();
};

/**
 * 获取对话列表（简化版，用于侧边栏显示）
 */
export const getConversationList = (): Array<{ id: string; title: string; time: string }> => {
  return getConversationsSync().map(conv => ({
    id: conv.id,
    title: conv.title,
    time: formatTime(conv.updatedAt),
  }));
};

/**
 * 获取单个对话
 */
export const getConversation = (id: string): Conversation | null => {
  return getConversationsSync().find(conv => conv.id === id) || null;
};

/**
 * 创建新对话
 */
export const createConversation = (title?: string): Conversation => {
  const now = Date.now();
  const conversation: Conversation = {
    id: generateId(),
    title: title || '新对话',
    createdAt: now,
    updatedAt: now,
    messages: [],
  };
  
  // 异步保存
  updateCacheAndSave(conversation).catch(console.error);
  
  return conversation;
};

/**
 * 更新对话标题
 */
export const updateConversationTitle = (id: string, title: string): Conversation | null => {
  const conversations = getConversationsSync();
  const conversation = conversations.find(conv => conv.id === id);
  
  if (!conversation) return null;
  
  conversation.title = title;
  conversation.updatedAt = Date.now();
  
  // 异步保存
  updateCacheAndSave(conversation).catch(console.error);
  
  return conversation;
};

/**
 * 删除对话
 */
export const deleteConversation = (id: string): boolean => {
  const conversations = getConversationsSync();
  const index = conversations.findIndex(conv => conv.id === id);
  
  if (index === -1) return false;
  
  conversations.splice(index, 1);
  cachedConversations = conversations;
  
  // 异步从 IndexedDB 删除
  deleteFromIndexedDB(id).catch(console.error);
  
  return true;
};

/**
 * 添加消息到对话
 */
export const addMessage = (conversationId: string, message: Omit<Message, 'id' | 'timestamp'>): Message | null => {
  const conversations = getConversationsSync();
  const conversation = conversations.find(conv => conv.id === conversationId);
  
  if (!conversation) return null;
  
  const newMessage: Message = {
    ...message,
    id: generateId(),
    timestamp: Date.now(),
  };
  
  conversation.messages.push(newMessage);
  conversation.updatedAt = Date.now();
  
  // 如果是第一条用户消息，自动更新标题
  if (conversation.messages.length === 1 && message.role === 'user') {
    conversation.title = message.content.slice(0, 30) + (message.content.length > 30 ? '...' : '');
  }
  
  // 异步保存
  updateCacheAndSave(conversation).catch(console.error);
  
  return newMessage;
};

/**
 * 更新消息
 */
export const updateMessage = (conversationId: string, messageId: string, updates: Partial<Message>): Message | null => {
  const conversations = getConversationsSync();
  const conversation = conversations.find(conv => conv.id === conversationId);
  
  if (!conversation) return null;
  
  const messageIndex = conversation.messages.findIndex(msg => msg.id === messageId);
  if (messageIndex === -1) return null;
  
  conversation.messages[messageIndex] = {
    ...conversation.messages[messageIndex],
    ...updates,
  };
  conversation.updatedAt = Date.now();
  
  // 异步保存
  updateCacheAndSave(conversation).catch(console.error);
  
  return conversation.messages[messageIndex];
};

/**
 * 获取对话的所有消息
 */
export const getMessages = (conversationId: string): Message[] => {
  const conversation = getConversation(conversationId);
  return conversation?.messages || [];
};

/**
 * 清空对话消息
 */
export const clearMessages = (conversationId: string): boolean => {
  const conversations = getConversationsSync();
  const conversation = conversations.find(conv => conv.id === conversationId);
  
  if (!conversation) return false;
  
  conversation.messages = [];
  conversation.updatedAt = Date.now();
  
  // 异步保存
  updateCacheAndSave(conversation).catch(console.error);
  
  return true;
};

/**
 * 清空所有对话
 */
export const clearAllConversations = (): void => {
  cachedConversations = [];
  clearIndexedDB().catch(console.error);
};

/**
 * 导出对话数据
 */
export const exportConversations = (): string => {
  return JSON.stringify(getConversationsSync(), null, 2);
};

/**
 * 导入对话数据
 */
export const importConversations = async (data: string): Promise<boolean> => {
  try {
    const conversations = JSON.parse(data) as Conversation[];
    if (!Array.isArray(conversations)) return false;
    
    // 验证数据结构
    for (const conv of conversations) {
      if (!conv.id || !conv.title || !Array.isArray(conv.messages)) {
        return false;
      }
    }
    
    // 保存到 IndexedDB
    for (const conv of conversations) {
      await saveToIndexedDB(conv);
    }
    
    cachedConversations = conversations.sort((a, b) => b.updatedAt - a.updatedAt);
    return true;
  } catch {
    return false;
  }
};

/**
 * 对话管理服务
 * 实现对话的 CRUD 操作和 localStorage 持久化
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
const MAX_CONVERSATIONS = 100;

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

// ========== 存储操作 ==========

const loadFromStorage = (): Conversation[] => {
  try {
    const data = localStorage.getItem(STORAGE_KEY);
    if (!data) return [];
    
    const conversations = JSON.parse(data) as Conversation[];
    // 按更新时间排序
    return conversations.sort((a, b) => b.updatedAt - a.updatedAt);
  } catch (error) {
    console.error('[ConversationService] Failed to load from storage:', error);
    return [];
  }
};

const saveToStorage = (conversations: Conversation[]): void => {
  try {
    // 限制最大数量
    const limited = conversations.slice(0, MAX_CONVERSATIONS);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(limited));
  } catch (error) {
    console.error('[ConversationService] Failed to save to storage:', error);
  }
};

// ========== 缓存 ==========

let cachedConversations: Conversation[] | null = null;

const getConversations = (): Conversation[] => {
  if (!cachedConversations) {
    cachedConversations = loadFromStorage();
  }
  return cachedConversations;
};

const updateCache = (conversations: Conversation[]): void => {
  cachedConversations = conversations;
  saveToStorage(conversations);
};

// ========== 公开 API ==========

/**
 * 获取所有对话列表
 */
export const getAllConversations = (): Conversation[] => {
  return getConversations();
};

/**
 * 获取对话列表（简化版，用于侧边栏显示）
 */
export const getConversationList = (): Array<{ id: string; title: string; time: string }> => {
  return getConversations().map(conv => ({
    id: conv.id,
    title: conv.title,
    time: formatTime(conv.updatedAt),
  }));
};

/**
 * 获取单个对话
 */
export const getConversation = (id: string): Conversation | null => {
  return getConversations().find(conv => conv.id === id) || null;
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
  
  const conversations = getConversations();
  conversations.unshift(conversation);
  updateCache(conversations);
  
  return conversation;
};

/**
 * 更新对话标题
 */
export const updateConversationTitle = (id: string, title: string): Conversation | null => {
  const conversations = getConversations();
  const index = conversations.findIndex(conv => conv.id === id);
  
  if (index === -1) return null;
  
  conversations[index].title = title;
  conversations[index].updatedAt = Date.now();
  updateCache(conversations);
  
  return conversations[index];
};

/**
 * 删除对话
 */
export const deleteConversation = (id: string): boolean => {
  const conversations = getConversations();
  const index = conversations.findIndex(conv => conv.id === id);
  
  if (index === -1) return false;
  
  conversations.splice(index, 1);
  updateCache(conversations);
  
  return true;
};

/**
 * 添加消息到对话
 */
export const addMessage = (conversationId: string, message: Omit<Message, 'id' | 'timestamp'>): Message | null => {
  const conversations = getConversations();
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
  
  updateCache(conversations);
  
  return newMessage;
};

/**
 * 更新消息
 */
export const updateMessage = (conversationId: string, messageId: string, updates: Partial<Message>): Message | null => {
  const conversations = getConversations();
  const conversation = conversations.find(conv => conv.id === conversationId);
  
  if (!conversation) return null;
  
  const messageIndex = conversation.messages.findIndex(msg => msg.id === messageId);
  if (messageIndex === -1) return null;
  
  conversation.messages[messageIndex] = {
    ...conversation.messages[messageIndex],
    ...updates,
  };
  conversation.updatedAt = Date.now();
  
  updateCache(conversations);
  
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
  const conversations = getConversations();
  const conversation = conversations.find(conv => conv.id === conversationId);
  
  if (!conversation) return false;
  
  conversation.messages = [];
  conversation.updatedAt = Date.now();
  
  updateCache(conversations);
  
  return true;
};

/**
 * 清空所有对话
 */
export const clearAllConversations = (): void => {
  updateCache([]);
};

/**
 * 导出对话数据
 */
export const exportConversations = (): string => {
  return JSON.stringify(getConversations(), null, 2);
};

/**
 * 导入对话数据
 */
export const importConversations = (data: string): boolean => {
  try {
    const conversations = JSON.parse(data) as Conversation[];
    if (!Array.isArray(conversations)) return false;
    
    // 验证数据结构
    for (const conv of conversations) {
      if (!conv.id || !conv.title || !Array.isArray(conv.messages)) {
        return false;
      }
    }
    
    updateCache(conversations);
    return true;
  } catch {
    return false;
  }
};

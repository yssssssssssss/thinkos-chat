/**
 * ChatView 主组件
 * 使用重构后的子组件，保持 ChatDemo 的所有功能
 * 
 * 注意：这是一个渐进式重构版本，核心逻辑暂时保留在此文件中
 * 未来可以进一步拆分为更小的自定义 hooks 和工具函数
 */

import React, { useState, useCallback, useEffect, useRef } from 'react';
import {
  Sparkles, Bot, ChevronDown, Menu, X, Settings,
  MessageSquare, Image, Search, FileText, Palette, FileImage, Film, Globe, Wand2
} from 'lucide-react';

// 导入服务
import {
  generateTextMultiModel,
  generateImageMultiModel,
  retryTextModel,
  retryImageModel,
  TextModelResponse,
  ImageModelResponse
} from '../../services/multiModelService';
import { getSystemPrompts, SystemPromptPreset } from '../../services/systemPromptService';
import { getPromptMarks, PromptMarkPreset } from '../../services/promptMarkService';
import {
  getConversationList,
  getConversation,
  createConversation,
  deleteConversation,
  addMessage,
  initConversationService,
  Conversation
} from '../../services/conversationService';
import { compressImage } from '../../utils/imageUtils';
import { saveImagesBatch } from '../../utils/imageStorage';
import { log } from '../utils/logger';

// 导入 Agent Hook
import { useAgent } from '../hooks/useAgent';

// 导入重构后的组件
import { Sidebar } from './components/Sidebar';
import { ChatArea } from './components/ChatArea';
import { InputArea } from './components/InputArea';
import { ModelPanel } from './components/panels/ModelPanel';
import { PromptMarketPanel } from './components/panels/PromptMarketPanel';
import { SystemPromptPanel } from './components/panels/SystemPromptPanel';
import { GlassMosaicPanel } from './components/panels/GlassMosaicPanel';
import { MoreToolsPanel } from './components/panels/MoreToolsPanel';
import { AiImageExpandDialog } from './components/dialogs/AiImageExpandDialog';
import { WebToolsDialog } from './components/dialogs/WebToolsDialog';
import { ImageEditModal } from './components/modals/ImageEditModal';
import { Png2ApngModal } from './components/modals/Png2ApngModal';
import { Video2GifModal } from './components/modals/Video2GifModal';
import LuminaParticleizeModal from './components/modals/LuminaParticleizeModal';
import { DEFAULT_LUMINA_PARTICLEIZE_CONFIG, DEFAULT_LUMINA_PARTICLEIZE_IMAGE_SRC } from './components/particleize/defaults';

// 导入类型
import { TabType, ModeType, PanelType, ModelOption, ToolButton } from './types';

// 图像处理工具函数
const fileToBase64 = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = (error) => reject(error);
  });
};

const isValidImageUrl = (url: string): boolean => {
  const trimmed = url.trim();
  if (!trimmed) return false;
  if (trimmed.startsWith('http://') || trimmed.startsWith('https://')) {
    return /\.(jpg|jpeg|png|gif|webp|bmp|svg)(\?.*)?$/i.test(trimmed) ||
      trimmed.includes('/image') ||
      trimmed.includes('unsplash') ||
      trimmed.includes('imgur');
  }
  if (trimmed.startsWith('data:image/')) {
    return true;
  }
  return false;
};

const urlToBase64 = async (url: string): Promise<string> => {
  if (url.startsWith('data:image/')) {
    return url;
  }

  try {
    const response = await fetch(url);
    const blob = await response.blob();
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(blob);
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = (error) => reject(error);
    });
  } catch (error) {
    console.error('Failed to convert URL to Base64:', error);
    return url;
  }
};

const processImage = async (source: string | File): Promise<string> => {
  let base64: string;

  if (source instanceof File) {
    base64 = await fileToBase64(source);
  } else if (source.startsWith('http')) {
    base64 = await urlToBase64(source);
  } else {
    base64 = source;
  }

  return compressImage(base64, 1600, 0.85);
};

// 配置常量
const TEXT_MODELS: ModelOption[] = [
  { id: 'Gemini-2.5-pro', name: 'Gemini 2.5 Pro', selected: true },
  { id: 'Claude-opus-4', name: 'Claude Opus 4', selected: false },
  { id: 'qwen3-vl-235', name: 'Qwen3 VL', selected: false },
  { id: 'Kimi-K2-0905-jcloud', name: 'Kimi K2', selected: false },
  { id: 'DeepSeek-V3.2', name: 'DeepSeek V3.2', selected: false },
];

const IMAGE_MODELS: ModelOption[] = [
  { id: 'Gemini 3-Pro-Image-Preview', name: 'Gemini 3 Pro', selected: true },
  { id: 'Gemini-2.5-flash-image-preview', name: 'Gemini 2.5 Flash', selected: false },
  { id: 'doubao-seedream-4-0-250828', name: '即梦 4.0', selected: false },
];

const TOOL_BUTTONS: ToolButton[] = [
  { id: 'text-chat', icon: MessageSquare, label: '文本对话', color: 'text-blue-500' },
  { id: 'image-gen', icon: Image, label: '图像生成', color: 'text-pink-500' },
  { id: 'web', icon: Globe, label: 'Web', color: 'text-teal-600' },
  { id: 'ai-image-expand', icon: Sparkles, label: 'AI图片扩展', color: 'text-purple-500' },
  { id: 'lumina-particleize', icon: Wand2, label: '粒子化', color: 'text-cyan-500' },
  { id: 'prompt-market', icon: Search, label: 'PromptMarket', color: 'text-orange-500' },
  { id: 'system-prompt', icon: FileText, label: 'SystemPrompt', color: 'text-purple-500' },
  { id: 'glass-mosaic', icon: Palette, label: 'GlassMosaic', color: 'text-indigo-500' },
  { id: 'png2apng', icon: FileImage, label: 'PNG→APNG', color: 'text-emerald-600' },
  { id: 'video2gif', icon: Film, label: 'Video→GIF', color: 'text-emerald-600' },
];


export const ChatView: React.FC = () => {
  // 基础状态
  const [activeTab, setActiveTab] = useState<TabType>('chat');
  const [activeMode, setActiveMode] = useState<ModeType>('text');
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [inputText, setInputText] = useState('');
  const [activePanel, setActivePanel] = useState<PanelType>('none');
  const [showScrollButton, setShowScrollButton] = useState(false);

  // 对话管理
  const [conversations, setConversations] = useState<Array<{ id: string; title: string; time: string }>>([]);
  const [selectedConversation, setSelectedConversation] = useState<string | null>(null);
  const [currentConversation, setCurrentConversation] = useState<Conversation | null>(null);

  // 模型选择
  const [textModels, setTextModels] = useState(TEXT_MODELS);
  const [imageModels, setImageModels] = useState(IMAGE_MODELS);
  const [selectedPromptId, setSelectedPromptId] = useState('default');

  // 生成状态
  const [referenceImage, setReferenceImage] = useState<string | null>(null);
  const [selectedResultImage, setSelectedResultImage] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [showResults, setShowResults] = useState(false);
  const [textResponses, setTextResponses] = useState<TextModelResponse[]>([]);
  const [imageResponses, setImageResponses] = useState<ImageModelResponse[]>([]);
  const [lastPrompt, setLastPrompt] = useState('');

  // 图像编辑状态
  const [editingImage, setEditingImage] = useState<{
    url: string;
    action: 'refine' | 'inpaint' | 'remix';
  } | null>(null);

  // AI 图片扩展弹窗
  const [aiImageExpandSourceImage, setAiImageExpandSourceImage] = useState<string | null>(null);

  // /web 工具弹窗
  const [webToolsOpen, setWebToolsOpen] = useState(false);
  const [webToolsInitialText, setWebToolsInitialText] = useState<string>('');

  // 内嵌工具弹窗
  const [embeddedTool, setEmbeddedTool] = useState<'none' | 'png2apng' | 'video2gif'>('none');

  // Lumina 粒子化弹窗
  const [particleizeOpen, setParticleizeOpen] = useState(false);
  const [particleizeImageSrc, setParticleizeImageSrc] = useState<string | null>(null);
  const [particleizeConfig, setParticleizeConfig] = useState(DEFAULT_LUMINA_PARTICLEIZE_CONFIG);

  // Agent 状态和功能
  const {
    isExecuting: isAgentExecuting,
    currentSkill,
    error: agentError,
    executeChat,
    executeSkill,
    resetError: resetAgentError
  } = useAgent();

  // 服务数据
  const [systemPrompts, setSystemPrompts] = useState<SystemPromptPreset[]>([]);
  // promptMarks 暂时保留用于未来 PromptMarket 面板的扩展功能
  const [, setPromptMarks] = useState<PromptMarkPreset[]>([]);

  // 网络状态
  const [isOnline, setIsOnline] = useState(typeof navigator !== 'undefined' ? navigator.onLine : true);

  // Refs
  const chatScrollRef = useRef<HTMLDivElement>(null);

  // 加载数据
  useEffect(() => {
    const loadData = async () => {
      try {
        const [prompts, marks] = await Promise.all([
          getSystemPrompts(),
          getPromptMarks()
        ]);
        setSystemPrompts(prompts);
        setPromptMarks(marks);
      } catch (error) {
        console.error('Failed to load data:', error);
      }
    };
    loadData();
  }, []);

  // 加载对话列表
  useEffect(() => {
    const loadConversations = async () => {
      log.info('ChatView', '初始化对话服务...');
      // 先初始化 IndexedDB
      await initConversationService();
      log.info('ChatView', '加载对话列表');
      const list = getConversationList();
      setConversations(list);
      if (list.length > 0 && !selectedConversation) {
        setSelectedConversation(list[0].id);
      }
    };
    loadConversations();
  }, []);

  // 加载选中的对话
  useEffect(() => {
    if (selectedConversation) {
      const conv = getConversation(selectedConversation);
      setCurrentConversation(conv);
      setTextResponses([]);
      setImageResponses([]);
      setShowResults(false);
      setLastPrompt('');
    }
  }, [selectedConversation]);

  // 网络状态监听
  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // 监听滚动事件以显示/隐藏“回到底部”按钮
  useEffect(() => {
    const scrollContainer = chatScrollRef.current;
    if (!scrollContainer) return;

    const handleScroll = () => {
      const { scrollTop, scrollHeight, clientHeight } = scrollContainer;
      // 如果距离底部超过 300px，显示按钮
      const isNearBottom = scrollHeight - scrollTop - clientHeight < 300;
      setShowScrollButton(!isNearBottom);
    };

    scrollContainer.addEventListener('scroll', handleScroll);
    return () => scrollContainer.removeEventListener('scroll', handleScroll);
  }, []);

  // 自动滚动
  useEffect(() => {
    if (chatScrollRef.current) {
      chatScrollRef.current.scrollTo({
        top: chatScrollRef.current.scrollHeight,
        behavior: 'smooth'
      });
    }
  }, [textResponses, imageResponses, showResults, currentConversation?.messages]);

  const scrollToBottom = () => {
    if (chatScrollRef.current) {
      chatScrollRef.current.scrollTo({
        top: chatScrollRef.current.scrollHeight,
        behavior: 'smooth'
      });
    }
  };


  // 对话管理函数
  const refreshConversations = useCallback(() => {
    setConversations(getConversationList());
  }, []);

  const handleNewConversation = useCallback(() => {
    const newConv = createConversation();
    refreshConversations();
    setSelectedConversation(newConv.id);
  }, [refreshConversations]);

  const handleDeleteConversation = useCallback((id: string) => {
    deleteConversation(id);
    refreshConversations();
    if (selectedConversation === id) {
      const list = getConversationList();
      setSelectedConversation(list.length > 0 ? list[0].id : null);
    }
  }, [selectedConversation, refreshConversations]);

  // 模型切换
  const toggleModel = (id: string, isImage: boolean) => {
    if (isImage) {
      setImageModels(prev => prev.map((m: ModelOption) => m.id === id ? { ...m, selected: !m.selected } : m));
    } else {
      setTextModels(prev => prev.map((m: ModelOption) => m.id === id ? { ...m, selected: !m.selected } : m));
    }
  };

  const selectedTextCount = textModels.filter(m => m.selected).length;
  const selectedImageCount = imageModels.filter(m => m.selected).length;

  // 获取选中的 System Prompt
  const getSelectedSystemPrompt = useCallback(() => {
    const selected = systemPrompts.find((p: SystemPromptPreset) => p.id === selectedPromptId);
    return selected?.prompt;
  }, [selectedPromptId, systemPrompts]);

  // 处理 Agent 智能调用
  const handleAgentInput = async () => {
    if (!inputText.trim()) return;
    if (!referenceImage) {
      log.warn('ChatView', 'Agent 调用需要参考图片');
      return;
    }

    const prompt = inputText.trim();
    setInputText('');

    log.info('ChatView', 'Agent 开始处理用户输入', { prompt });

    // 创建或使用现有对话
    let conversationId = selectedConversation;
    if (!conversationId) {
      const newConv = createConversation(prompt.slice(0, 30));
      conversationId = newConv.id;
      setSelectedConversation(conversationId);
      refreshConversations();
    }

    // 保存用户操作消息
    addMessage(conversationId, {
      role: 'user',
      content: `🤖 AI 智能处理: ${prompt}`,
      referenceImage: referenceImage || undefined,
    });
    refreshConversations();

    // 调用 Agent 处理
    const response = await executeChat(prompt);

    // 保存 Agent 响应
    if (response.success && response.data) {
      addMessage(conversationId, {
        role: 'assistant',
        content: response.message,
        imageResponses: response.data.imageUrl ? [{
          modelId: 'expand-image',
          modelName: '图片扩展',
          imageUrl: response.data.imageUrl,
          prompt: prompt,
          status: 'complete' as const,
        }] : undefined,
      });

      // 更新参考图片为处理后的图片
      if (response.data.imageUrl) {
        setReferenceImage(response.data.imageUrl);
      }

      log.info('ChatView', 'Agent 处理成功', { skillId: response.skillId });
    } else {
      addMessage(conversationId, {
        role: 'assistant',
        content: `❌ ${response.message}`,
      });
      log.error('ChatView', 'Agent 处理失败', { error: response.message });
    }

    refreshConversations();

    // 重新加载当前对话
    const updatedConv = getConversation(conversationId);
    setCurrentConversation(updatedConv);
  };

  // 发送消息
  const handleSend = async () => {
    if (!inputText.trim()) return;

    const prompt = inputText.trim();

    // Slash 命令：/web 打开 Web 工具弹窗（不发送到对话）
    if (prompt === '/web' || prompt.startsWith('/web ')) {
      const rest = prompt.slice(4).trim();
      setInputText('');
      setActivePanel('none');
      setWebToolsInitialText(rest);
      setWebToolsOpen(true);
      return;
    }

    setLastPrompt(prompt);
    setIsGenerating(true);
    setShowResults(true);
    setInputText('');

    log.info('ChatView', `开始发送消息 [${activeMode}模式]`, {
      prompt: prompt.slice(0, 100),
      hasReference: !!referenceImage
    });

    // 创建或使用现有对话
    let conversationId = selectedConversation;
    if (!conversationId) {
      const newConv = createConversation(prompt.slice(0, 30));
      conversationId = newConv.id;
      setSelectedConversation(conversationId);
      refreshConversations();
    }

    // 保存用户消息
    addMessage(conversationId, {
      role: 'user',
      content: prompt,
      referenceImage: referenceImage || undefined,
    });
    refreshConversations();

    if (activeMode === 'text') {
      const selectedModels = textModels
        .filter((m: ModelOption) => m.selected)
        .map((m: ModelOption) => ({ id: m.id, name: m.name }));

      if (selectedModels.length === 0) {
        setIsGenerating(false);
        return;
      }

      await generateTextMultiModel({
        prompt,
        models: selectedModels,
        globalSystemPrompt: getSelectedSystemPrompt(),
        onUpdate: (responses) => {
          setTextResponses(responses);
          const allDone = responses.every(r => r.status === 'complete' || r.status === 'error');
          if (allDone) {
            setIsGenerating(false);
            if (conversationId) {
              addMessage(conversationId, {
                role: 'assistant',
                content: '',
                textResponses: responses.map(r => ({
                  modelId: r.modelId,
                  modelName: r.modelName,
                  content: r.content,
                  status: r.status as 'complete' | 'error',
                  error: r.error,
                })),
              });
              refreshConversations();

              // 重新加载当前对话以更新历史消息
              const updatedConv = getConversation(conversationId);
              setCurrentConversation(updatedConv);

              // 清空当前响应状态，避免重复显示
              setTextResponses([]);
              setLastPrompt('');
              setShowResults(false);
            }
          }
        }
      });
    } else {
      const selectedModels = imageModels
        .filter((m: ModelOption) => m.selected)
        .map((m: ModelOption) => ({ id: m.id, name: m.name }));

      if (selectedModels.length === 0) {
        setIsGenerating(false);
        return;
      }

      await generateImageMultiModel({
        prompt,
        models: selectedModels,
        inputImage: referenceImage,
        onUpdate: (responses) => {
          setImageResponses(responses);
          const allDone = responses.every(r => r.status === 'complete' || r.status === 'error');
          if (allDone) {
            setIsGenerating(false);

            // 静默保存成功生成的图片到 IndexedDB（用户无感知）
            const successfulImages = responses
              .filter(r => r.status === 'complete' && r.image?.url)
              .map(r => ({
                url: r.image!.url,
                modelName: r.modelName,
                prompt: prompt
              }));

            if (successfulImages.length > 0) {
              saveImagesBatch(successfulImages).then(ids => {
                log.info('ChatView', `静默保存 ${ids.length} 张图片到本地存储`);
              });
            }

            // 保存到对话历史
            if (conversationId) {
              addMessage(conversationId, {
                role: 'assistant',
                content: '',
                imageResponses: responses.map(r => ({
                  modelId: r.modelId,
                  modelName: r.modelName,
                  imageUrl: r.image?.url,
                  prompt: r.image?.prompt,
                  status: r.status as 'complete' | 'error',
                  error: r.error,
                })),
              });
              refreshConversations();

              // 重新加载当前对话以更新历史消息
              const updatedConv = getConversation(conversationId);
              setCurrentConversation(updatedConv);

              // 清空当前响应状态，避免重复显示
              setImageResponses([]);
              setLastPrompt('');
              setShowResults(false);
            }
          }
        }
      });
    }
  };

  // 文件上传处理
  const handleFileUpload = async (file: File) => {
    try {
      const compressed = await processImage(file);
      setReferenceImage(compressed);
    } catch (error) {
      console.error('Failed to process image:', error);
      const base64 = await fileToBase64(file);
      setReferenceImage(base64);
    }
  };

  // URL 上传处理
  const handleUrlUpload = async (url: string) => {
    if (isValidImageUrl(url)) {
      try {
        const compressed = await processImage(url);
        setReferenceImage(compressed);
      } catch (error) {
        console.error('Failed to process URL image:', error);
        setReferenceImage(url);
      }
    } else {
      alert('请输入有效的图片 URL');
    }
  };

  // 工具按钮点击
  const handleToolClick = (toolId: string) => {
    switch (toolId) {
      case 'text-chat':
        setActiveMode('text');
        setActivePanel('models');
        break;
      case 'image-gen':
        setActiveMode('image');
        setActivePanel('models');
        break;
      case 'web':
        setActivePanel('none');
        setWebToolsInitialText('');
        setWebToolsOpen(true);
        break;
      case 'ai-image-expand':
        if (!referenceImage) {
          alert('请先上传图片');
          break;
        }
        setAiImageExpandSourceImage(referenceImage);
        setActivePanel('none');
        break;
      case 'prompt-market':
        setActivePanel(activePanel === 'promptMarket' ? 'none' : 'promptMarket');
        break;
      case 'system-prompt':
        setActivePanel(activePanel === 'systemPrompt' ? 'none' : 'systemPrompt');
        break;
      case 'glass-mosaic':
        setActivePanel(activePanel === 'glassMosaic' ? 'none' : 'glassMosaic');
        break;
      case 'lumina-particleize':
        setActivePanel('none');
        setParticleizeImageSrc((prev) => prev ?? referenceImage ?? DEFAULT_LUMINA_PARTICLEIZE_IMAGE_SRC);
        setParticleizeOpen(true);
        break;
      case 'png2apng':
        setEmbeddedTool('png2apng');
        setActivePanel('none');
        break;
      case 'video2gif':
        setEmbeddedTool('video2gif');
        setActivePanel('none');
        break;
    }
  };

  // 渲染头部
  const renderHeader = () => (
    <header className="h-14 bg-white border-b border-gray-100 flex items-center px-6 shrink-0">
      <div className="flex items-center gap-3 mr-8">
        <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-purple-600 rounded-xl flex items-center justify-center">
          <Sparkles className="w-4 h-4 text-white" />
        </div>
        <span className="font-semibold text-lg text-gray-800">thinkos</span>
      </div>
      <nav className="flex gap-1">
        <button onClick={() => setActiveTab('chat')}
          className={`px-5 py-2 rounded-full text-sm font-medium transition-all ${activeTab === 'chat' ? 'bg-gray-900 text-white' : 'text-gray-500 hover:bg-gray-100'
            }`}>
          AI 对话
        </button>
        <button onClick={() => setActiveTab('canvas')}
          className={`px-5 py-2 rounded-full text-sm font-medium transition-all ${activeTab === 'canvas' ? 'bg-gray-900 text-white' : 'text-gray-500 hover:bg-gray-100'
            }`}>
          Canvas
        </button>
      </nav>
      <div className="ml-auto">
        <button onClick={() => setActivePanel(activePanel === 'models' ? 'none' : 'models')}
          className="flex items-center gap-2 px-3 py-1.5 bg-blue-50 text-blue-600 rounded-lg text-sm hover:bg-blue-100 transition-colors">
          <Bot className="w-4 h-4" />
          {activeMode === 'image' ? selectedImageCount : selectedTextCount} 个模型
          <ChevronDown className="w-3 h-3" />
        </button>
      </div>
    </header>
  );

  // 渲染工具面板
  const renderToolPanel = () => {
    if (activePanel === 'none') return null;

    return (
      <div className="absolute bottom-full left-0 right-0 mb-3">
        {activePanel === 'models' && (
          <ModelPanel
            activeMode={activeMode}
            textModels={textModels}
            imageModels={imageModels}
            onToggleModel={toggleModel}
            onClose={() => setActivePanel('none')}
          />
        )}
        {activePanel === 'promptMarket' && (
          <div className="w-[150%] left-1/2 -translate-x-1/2 relative">
            <PromptMarketPanel
              onSelect={(prompt: string) => setInputText(prompt)}
              onClose={() => setActivePanel('none')}
            />
          </div>
        )}
        {activePanel === 'systemPrompt' && (
          <SystemPromptPanel
            selectedId={selectedPromptId}
            onSelect={(id: string) => { setSelectedPromptId(id); setActivePanel('none'); }}
            onClose={() => setActivePanel('none')}
          />
        )}
        {activePanel === 'glassMosaic' && (
          <GlassMosaicPanel
            onClose={() => setActivePanel('none')}
          />
        )}
        {activePanel === 'moreTools' && (
          <MoreToolsPanel
            onClose={() => setActivePanel('none')}
            onAction={(action: string) => {
              log.info('ChatView', `更多工具: ${action}`);
            }}
          />
        )}
      </div>
    );
  };

  return (
    <div className="h-screen w-screen flex flex-col bg-gradient-to-b from-gray-50 to-white">
      {renderHeader()}

      {activeTab === 'chat' ? (
        <div className="flex-1 flex overflow-hidden">
          <Sidebar
            isOpen={sidebarOpen}
            conversations={conversations}
            selectedConversation={selectedConversation}
            onNewConversation={handleNewConversation}
            onSelectConversation={setSelectedConversation}
            onDeleteConversation={handleDeleteConversation}
          />

          <main className="flex-1 flex flex-col overflow-hidden">
            <div className="px-6 py-3 border-b border-gray-100 bg-white/80 backdrop-blur-sm flex items-center justify-between">
              <div className="flex items-center gap-3">
                <button onClick={() => setSidebarOpen(!sidebarOpen)} className="p-2 hover:bg-gray-100 rounded-xl lg:hidden">
                  {sidebarOpen ? <X className="w-5 h-5 text-gray-500" /> : <Menu className="w-5 h-5 text-gray-500" />}
                </button>
                <h2 className="font-medium text-gray-700">多模型对比测试</h2>
              </div>
              <span className="px-2 py-1 bg-gray-100 rounded-lg text-xs text-gray-500">
                {activeMode === 'image' ? '图像模式' : '文本模式'}
              </span>
            </div>

            <div ref={chatScrollRef} className="flex-1 overflow-y-auto p-6">
              <ChatArea
                activeMode={activeMode}
                showResults={showResults}
                lastPrompt={lastPrompt}
                textResponses={textResponses}
                imageResponses={imageResponses}
                selectedResultImage={selectedResultImage}
                historyMessages={currentConversation?.messages || []}
                onClosePanel={() => setActivePanel('none')}
                onCopyText={async (text: string) => {
                  try {
                    await navigator.clipboard.writeText(text);
                  } catch (err) {
                    console.error('Failed to copy:', err);
                  }
                }}
                onRetryTextModel={async (modelId: string, modelName: string) => {
                  if (!lastPrompt) return;
                  setTextResponses((prev: TextModelResponse[]) => prev.map((r: TextModelResponse) =>
                    r.modelId === modelId ? { ...r, status: 'streaming' as const, content: '', error: undefined } : r
                  ));
                  await retryTextModel(modelId, modelName, lastPrompt, getSelectedSystemPrompt(), (response) => {
                    setTextResponses((prev: TextModelResponse[]) => prev.map((r: TextModelResponse) => r.modelId === modelId ? response : r));
                  });
                }}
                onRetryImageModel={async (modelId: string, modelName: string) => {
                  if (!lastPrompt) return;
                  setImageResponses((prev: ImageModelResponse[]) => prev.map((r: ImageModelResponse) =>
                    r.modelId === modelId ? { ...r, status: 'streaming' as const, image: undefined, error: undefined } : r
                  ));
                  await retryImageModel(modelId, modelName, lastPrompt, referenceImage, (response) => {
                    setImageResponses((prev: ImageModelResponse[]) => prev.map((r: ImageModelResponse) => r.modelId === modelId ? response : r));
                  });
                }}
                onDownloadImage={(imageUrl: string, modelName: string) => {
                  const link = document.createElement('a');
                  link.href = imageUrl;
                  link.download = `${modelName}-${Date.now()}.png`;
                  document.body.appendChild(link);
                  link.click();
                  document.body.removeChild(link);
                }}
                onSelectImage={setSelectedResultImage}
                onImageAction={(imageUrl: string, action: 'refine' | 'inpaint' | 'remix') => {
                  log.info('ChatView', `图像编辑: ${action}`, { imageUrl: imageUrl.slice(0, 100) });
                  setEditingImage({ url: imageUrl, action });
                }}
              />
            </div>

            {/* 回到底部按钮 */}
            {showScrollButton && (
              <button
                onClick={scrollToBottom}
                className="fixed bottom-32 right-8 p-3 bg-white border border-gray-100 rounded-full shadow-lg text-gray-500 hover:text-gray-800 hover:bg-gray-50 transition-all z-10 animate-bounce"
                title="回到底部"
              >
                <ChevronDown className="w-6 h-6" />
              </button>
            )}

            <InputArea
              inputText={inputText}
              isGenerating={isGenerating}
              isOnline={isOnline}
              referenceImage={referenceImage}
              activeMode={activeMode}
              selectedTextCount={selectedTextCount}
              selectedImageCount={selectedImageCount}
              toolButtons={TOOL_BUTTONS}
              activePanel={activePanel}
              onInputChange={setInputText}
              onSend={handleSend}
              onRemoveReference={() => setReferenceImage(null)}
              onFileUpload={handleFileUpload}
              onUrlUpload={handleUrlUpload}
              onToolClick={handleToolClick}
              onClosePanel={() => setActivePanel('none')}
              onAgentInput={handleAgentInput}
              isAgentExecuting={isAgentExecuting}
            >
              {renderToolPanel()}
            </InputArea>
          </main>
        </div>
      ) : (
        <div className="flex-1 flex items-center justify-center bg-gray-50">
          <div className="text-center">
            <div className="w-24 h-24 bg-white rounded-3xl shadow-lg flex items-center justify-center mx-auto mb-6">
              <Settings className="w-10 h-10 text-gray-400" />
            </div>
            <h3 className="text-xl font-semibold text-gray-700 mb-2">Canvas 工作区</h3>
            <p className="text-gray-500">这里将显示原有的 Canvas 节点编辑器</p>
          </div>
        </div>
      )}

      {/* AI 图片扩展弹窗（Gemini 3 Pro） */}
      {aiImageExpandSourceImage && (
        <AiImageExpandDialog
          imageUrl={aiImageExpandSourceImage}
          onClose={() => setAiImageExpandSourceImage(null)}
          onComplete={(result) => {
            log.info('ChatView', 'AI 图片扩展完成', { size: result.size, model: result.model });

            // 将扩展后的图片添加到对话历史
            let conversationId = selectedConversation;
            if (!conversationId) {
              const newConv = createConversation('AI 图片扩展');
              conversationId = newConv.id;
              setSelectedConversation(conversationId);
              refreshConversations();
            }

            // 添加用户操作消息
            addMessage(conversationId, {
              role: 'user',
              content: `[AI 图片扩展] size=${result.size}`,
              referenceImage: aiImageExpandSourceImage,
            });

            // 添加 AI 响应（扩展后的图片）
            addMessage(conversationId, {
              role: 'assistant',
              content: '',
              imageResponses: [{
                modelId: 'ai-image-expand',
                modelName: 'AI 图片扩展',
                imageUrl: result.imageUrl,
                prompt: `严格保持图片的主图不变，将背景按照需要的${result.size}尺寸进行扩展`,
                status: 'complete' as const,
              }],
            });

            refreshConversations();

            // 重新加载当前对话以更新历史消息
            const updatedConv = getConversation(conversationId);
            setCurrentConversation(updatedConv);

            // 同时设置为参考图，方便继续后续操作
            setReferenceImage(result.imageUrl);
            setAiImageExpandSourceImage(null);
          }}
        />
      )}

      {/* Web 工具弹窗（/web） */}
      {webToolsOpen && (
        <WebToolsDialog
          initialText={webToolsInitialText}
          textModelId={textModels.find(m => m.selected)?.id || 'Gemini-2.5-pro'}
          imageModelId={imageModels.find(m => m.selected)?.id || 'Gemini 3-Pro-Image-Preview'}
          onClose={() => {
            setWebToolsOpen(false);
            setWebToolsInitialText('');
          }}
          onComplete={(result) => {
            log.info('ChatView', 'Web 工具完成', {
              toolId: result.toolId,
              template: result.template,
              generateMode: result.generateMode,
              images: result.images.length,
            });

            let conversationId = selectedConversation;
            if (!conversationId) {
              const title = (result.parsed?.title || '小红书封面').slice(0, 30);
              const newConv = createConversation(title);
              conversationId = newConv.id;
              setSelectedConversation(conversationId);
              refreshConversations();
            }

            const templateName = result.template === 'infographic-pro' ? 'Plan B · Pro' : 'Plan A · 卡通';
            const modeName =
              result.generateMode === 'json' ? '仅 JSON' : result.generateMode === 'all' ? '全套生图' : '封面生图';
            const inputPreview = result.input.length > 280 ? `${result.input.slice(0, 280)}...` : result.input;

            addMessage(conversationId, {
              role: 'user',
              content: `[小红书封面] ${templateName} · ${modeName}\n${inputPreview}`,
            });

            const jsonMarkdown = `\`\`\`json\n${result.jsonText}\n\`\`\``;
            const imageResponses = result.images.map((img, idx) => ({
              modelId: `xhs-cover-${img.index}-${idx}`,
              modelName: `XHS ${img.type} #${img.index}`,
              imageUrl: img.imageUrl,
              prompt: img.prompt,
              status: 'complete' as const,
            }));

            addMessage(conversationId, {
              role: 'assistant',
              content: '',
              textResponses: [{
                modelId: 'xhs-cover-json',
                modelName: 'XHS 封面 JSON',
                content: jsonMarkdown,
                status: 'complete' as const,
              }],
              imageResponses: imageResponses.length ? imageResponses : undefined,
            });

            refreshConversations();
            const updatedConv = getConversation(conversationId);
            setCurrentConversation(updatedConv);

            if (result.images[0]?.imageUrl) {
              setReferenceImage(result.images[0].imageUrl);
            }

            setWebToolsOpen(false);
            setWebToolsInitialText('');
          }}
        />
      )}

      {/* 图像编辑弹窗 */}
      {editingImage && (
        <ImageEditModal
          imageUrl={editingImage.url}
          action={editingImage.action}
          onClose={() => setEditingImage(null)}
          onComplete={(newImageUrl: string, action: 'refine' | 'inpaint' | 'remix', editPrompt: string) => {
            log.info('ChatView', '图像编辑完成', { action, newImageUrl: newImageUrl.slice(0, 100) });

            // 将编辑后的图片添加到对话历史
            let conversationId = selectedConversation;
            if (!conversationId) {
              const newConv = createConversation(`图像${action === 'refine' ? '优化' : action === 'inpaint' ? '局部重绘' : '风格混合'}`);
              conversationId = newConv.id;
              setSelectedConversation(conversationId);
              refreshConversations();
            }

            // 添加用户操作消息
            const actionName = action === 'refine' ? '优化图像' : action === 'inpaint' ? '局部重绘' : '风格混合';
            addMessage(conversationId, {
              role: 'user',
              content: `[${actionName}] ${editPrompt}`,
              referenceImage: editingImage.url,
            });

            // 添加 AI 响应（编辑后的图片）
            addMessage(conversationId, {
              role: 'assistant',
              content: '',
              imageResponses: [{
                modelId: `${action}-edit`,
                modelName: actionName,
                imageUrl: newImageUrl,
                prompt: editPrompt,
                status: 'complete' as const,
              }],
            });

            refreshConversations();

            // 重新加载当前对话以更新历史消息
            const updatedConv = getConversation(conversationId);
            setCurrentConversation(updatedConv);

            // 同时设置为参考图，方便继续编辑
            setReferenceImage(newImageUrl);
            setEditingImage(null);
          }}
        />
      )}

      {/* 内嵌工具弹窗 */}
      {embeddedTool === 'png2apng' && <Png2ApngModal onClose={() => setEmbeddedTool('none')} />}
      {embeddedTool === 'video2gif' && <Video2GifModal onClose={() => setEmbeddedTool('none')} />}

      {particleizeOpen && (
        <LuminaParticleizeModal
          imageSrc={particleizeImageSrc}
          setImageSrc={setParticleizeImageSrc}
          config={particleizeConfig}
          setConfig={setParticleizeConfig}
          onClose={() => setParticleizeOpen(false)}
        />
      )}
    </div>
  );
};

export default ChatView;

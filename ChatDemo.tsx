import React, { useState, useCallback, useEffect, useRef } from 'react';
import { 
  MessageSquare, Plus, Send, Settings, ChevronDown, Menu, X, Sparkles, 
  Image, Check, Loader2, Copy, RotateCcw, Download, Edit2, Sliders, 
  Wand2, Search, BookOpen, Palette, FileText, Upload, Paperclip, 
  MoreHorizontal, Bot, Zap, AlertCircle, Link, Trash2
} from 'lucide-react';
import { 
  generateTextMultiModel, 
  generateImageMultiModel,
  retryTextModel,
  retryImageModel,
  TextModelResponse, 
  ImageModelResponse 
} from './services/multiModelService';
import { getSystemPrompts, SystemPromptPreset } from './services/systemPromptService';
import { getPromptMarks, PromptMarkPreset } from './services/promptMarkService';
import { editImageWithGeminiFlash, editImageWithSeedream } from './services/geminiImageService';
import { chatCompletionsStream } from './services/textModelService';
import { 
  getConversationList, 
  getConversation, 
  createConversation, 
  deleteConversation,
  addMessage,
  Conversation
} from './services/conversationService';
import DrawingCanvas from './components/modals/DrawingCanvas';
import { MarkdownLight } from './components/MarkdownLight';
import { renderGlassMosaic, loadImageElement } from './utils/glassMosaic';
import { compressImage } from './utils/imageUtils';
import { saveImageToLocal } from './utils/imageSaver';
import { log } from './src/utils/logger';
import { GlassMosaicOptions } from './types';

// ========== 图像处理工具函数 ==========
// 将文件转换为 Base64 格式
const fileToBase64 = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = (error) => reject(error);
  });
};

// 检测是否为有效的图像 URL
const isValidImageUrl = (url: string): boolean => {
  const trimmed = url.trim();
  if (!trimmed) return false;
  // HTTP/HTTPS URL
  if (trimmed.startsWith('http://') || trimmed.startsWith('https://')) {
    return /\.(jpg|jpeg|png|gif|webp|bmp|svg)(\?.*)?$/i.test(trimmed) || 
           trimmed.includes('/image') || 
           trimmed.includes('unsplash') ||
           trimmed.includes('imgur');
  }
  // Base64 data URL
  if (trimmed.startsWith('data:image/')) {
    return true;
  }
  return false;
};

// 从 URL 加载图像并转换为 Base64
const urlToBase64 = async (url: string): Promise<string> => {
  // 如果已经是 data URL，直接返回
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
    // 如果转换失败，返回原始 URL
    return url;
  }
};

// 处理图像：转换为 Base64 并压缩
const processImage = async (source: string | File): Promise<string> => {
  let base64: string;
  
  if (source instanceof File) {
    base64 = await fileToBase64(source);
  } else if (source.startsWith('http')) {
    base64 = await urlToBase64(source);
  } else {
    base64 = source;
  }
  
  // 压缩图像（最大边 1600px）
  return compressImage(base64, 1600, 0.85);
};

// ========== 原项目功能配置 ==========
const TEXT_MODELS = [
  { id: 'Gemini-2.5-pro', name: 'Gemini 2.5 Pro', selected: true },
  { id: 'Claude-opus-4', name: 'Claude Opus 4', selected: false },
  { id: 'qwen3-vl-235', name: 'Qwen3 VL', selected: false },
  { id: 'Kimi-K2-0905-jcloud', name: 'Kimi K2', selected: false },
  { id: 'DeepSeek-V3.2', name: 'DeepSeek V3.2', selected: false },
];

const IMAGE_MODELS = [
  { id: 'Gemini 3-Pro-Image-Preview', name: 'Gemini 3 Pro', selected: true },
  { id: 'Gemini-2.5-flash-image-preview', name: 'Gemini 2.5 Flash', selected: false },
  { id: 'doubao-seedream-4-0-250828', name: '即梦 4.0', selected: false },
];

const SYSTEM_PROMPTS_FALLBACK = [
  { id: 'default', name: '默认助手', prompt: 'You are a helpful AI assistant.' },
  { id: 'coder', name: '代码专家', prompt: 'You are an expert programmer.' },
  { id: 'writer', name: '写作助手', prompt: 'You are a creative writer.' },
];

const PROMPT_MARKS_FALLBACK = [
  { id: '1', title: '赛博朋克城市', category: '风格', image: 'https://images.unsplash.com/photo-1480714378408-67cf0d13bc1b?w=200', prompt: 'A futuristic cyberpunk city with neon lights...' },
  { id: '2', title: '水彩风景', category: '风格', image: 'https://images.unsplash.com/photo-1472214103451-9374bd1c798e?w=200', prompt: 'Watercolor landscape painting...' },
  { id: '3', title: '产品摄影', category: '商业', image: 'https://images.unsplash.com/photo-1498050108023-c5249f4df085?w=200', prompt: 'Professional product photography...' },
];

// 基于原项目功能的工具栏按钮
const TOOL_BUTTONS = [
  { id: 'text-chat', icon: MessageSquare, label: '文本对话', color: 'text-blue-500' },
  { id: 'image-gen', icon: Image, label: '图像生成', color: 'text-pink-500' },
  { id: 'prompt-market', icon: Search, label: 'PromptMarket', color: 'text-orange-500' },
  { id: 'system-prompt', icon: FileText, label: 'SystemPrompt', color: 'text-purple-500' },
  { id: 'glass-mosaic', icon: Palette, label: 'GlassMosaic', color: 'text-indigo-500' },
  { id: 'more', icon: MoreHorizontal, label: '更多', color: 'text-gray-400' },
];

// ========== 类型定义 ==========
type TabType = 'chat' | 'canvas';
type ModeType = 'text' | 'image';
type PanelType = 'none' | 'promptMarket' | 'systemPrompt' | 'glassMosaic' | 'models' | 'moreTools' | 'inpaint' | 'remix' | 'refine';

// ========== 主组件 ==========
const ChatDemo: React.FC = () => {
  const [activeTab, setActiveTab] = useState<TabType>('chat');
  const [activeMode, setActiveMode] = useState<ModeType>('text');
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [inputText, setInputText] = useState('');
  
  // 对话管理状态
  const [conversations, setConversations] = useState<Array<{ id: string; title: string; time: string }>>([]);
  const [selectedConversation, setSelectedConversation] = useState<string | null>(null);
  const [currentConversation, setCurrentConversation] = useState<Conversation | null>(null);
  
  const [textModels, setTextModels] = useState(TEXT_MODELS);
  const [imageModels, setImageModels] = useState(IMAGE_MODELS);
  const [selectedPromptId, setSelectedPromptId] = useState('default');
  const [activePanel, setActivePanel] = useState<PanelType>('none');
  const [referenceImage, setReferenceImage] = useState<string | null>(null);
  const [selectedResultImage, setSelectedResultImage] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [showResults, setShowResults] = useState(false);
  
  // 多模型响应状态
  const [textResponses, setTextResponses] = useState<TextModelResponse[]>([]);
  const [imageResponses, setImageResponses] = useState<ImageModelResponse[]>([]);
  const [lastPrompt, setLastPrompt] = useState('');

  // 从服务加载的数据
  const [systemPrompts, setSystemPrompts] = useState<SystemPromptPreset[]>(SYSTEM_PROMPTS_FALLBACK);
  const [promptMarks, setPromptMarks] = useState<PromptMarkPreset[]>([]);
  const [promptMarksLoading, setPromptMarksLoading] = useState(false);
  
  // PromptMarket 搜索和筛选
  const [promptSearchQuery, setPromptSearchQuery] = useState('');
  const [promptCategory, setPromptCategory] = useState('全部');

  // 图像编辑状态
  const [editingImage, setEditingImage] = useState<string | null>(null);
  const [inpaintMask, setInpaintMask] = useState<string>('');
  const [inpaintInstruction, setInpaintInstruction] = useState('');
  const [isInpainting, setIsInpainting] = useState(false);
  
  // Remix 状态
  const [remixReferenceImage, setRemixReferenceImage] = useState<string | null>(null);
  const [remixOriginalMask, setRemixOriginalMask] = useState<string>('');
  const [remixReferenceMask, setRemixReferenceMask] = useState<string>('');
  const [remixInstruction, setRemixInstruction] = useState('');
  const [isRemixing, setIsRemixing] = useState(false);
  
  // Refine 状态
  const [refinePrompt, setRefinePrompt] = useState('');
  const [refineSuggestions, setRefineSuggestions] = useState<string[]>([]);
  const [selectedRefineSuggestions, setSelectedRefineSuggestions] = useState<number[]>([]);
  const [isRefining, setIsRefining] = useState(false);

  // GlassMosaic 状态
  const [glassMosaicImage, setGlassMosaicImage] = useState<string | null>(null);
  const [glassMosaicOptions, setGlassMosaicOptions] = useState<GlassMosaicOptions>({
    cellSize: 20,
    glassOpacity: 0.3,
    bevelIntensity: 0.5,
    innerShine: 0.3,
    gap: 2,
    renderShape: 'square',
    sparkleIntensity: 0.1
  });
  const [glassMosaicResult, setGlassMosaicResult] = useState<string | null>(null);
  const [isProcessingMosaic, setIsProcessingMosaic] = useState(false);
  const glassMosaicCanvasRef = useRef<HTMLCanvasElement>(null);
  const chatScrollRef = useRef<HTMLDivElement>(null);

  // 网络状态
  const [isOnline, setIsOnline] = useState(typeof navigator !== 'undefined' ? navigator.onLine : true);

  // 知识库状态
  const [knowledgeContext, setKnowledgeContext] = useState('');
  const [showKnowledgePanel, setShowKnowledgePanel] = useState(false);

  // 监听网络状态变化
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

  // 加载 SystemPrompts 和 PromptMarks
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
    const loadConversations = () => {
      log.info('ChatDemo', '加载对话列表');
      const list = getConversationList();
      setConversations(list);
      log.debug('ChatDemo', `加载了 ${list.length} 个对话`);
      // 如果有对话，选中第一个
      if (list.length > 0 && !selectedConversation) {
        setSelectedConversation(list[0].id);
        log.info('ChatDemo', `自动选中第一个对话: ${list[0].title}`);
      }
    };
    loadConversations();
  }, []);

  // 加载选中的对话
  useEffect(() => {
    if (selectedConversation) {
      log.info('ChatDemo', `加载对话: ${selectedConversation}`);
      const conv = getConversation(selectedConversation);
      setCurrentConversation(conv);
      log.debug('ChatDemo', `对话包含 ${conv?.messages.length || 0} 条消息`);
      // 清空当前响应状态
      setTextResponses([]);
      setImageResponses([]);
      setShowResults(false);
      setLastPrompt('');
    }
  }, [selectedConversation]);

  // 刷新对话列表
  const refreshConversations = useCallback(() => {
    setConversations(getConversationList());
  }, []);

  // 创建新对话
  const handleNewConversation = useCallback(() => {
    const newConv = createConversation();
    refreshConversations();
    setSelectedConversation(newConv.id);
  }, [refreshConversations]);

  // 删除对话
  const handleDeleteConversation = useCallback((id: string) => {
    deleteConversation(id);
    refreshConversations();
    // 如果删除的是当前选中的对话，选择第一个
    if (selectedConversation === id) {
      const list = getConversationList();
      setSelectedConversation(list.length > 0 ? list[0].id : null);
    }
  }, [selectedConversation, refreshConversations]);

  // 获取所有分类
  const promptCategories = ['全部', ...new Set(promptMarks.map(p => p.category).filter(Boolean))];

  // 过滤 PromptMarks
  const filteredPromptMarks = promptMarks.filter(pm => {
    const matchesSearch = !promptSearchQuery || 
      pm.title.toLowerCase().includes(promptSearchQuery.toLowerCase()) ||
      (pm.summary || '').toLowerCase().includes(promptSearchQuery.toLowerCase()) ||
      pm.prompt.toLowerCase().includes(promptSearchQuery.toLowerCase());
    
    const matchesCategory = promptCategory === '全部' || pm.category === promptCategory;
    
    return matchesSearch && matchesCategory;
  });

  const toggleModel = (id: string, isImage: boolean) => {
    if (isImage) {
      setImageModels(prev => prev.map(m => m.id === id ? { ...m, selected: !m.selected } : m));
    } else {
      setTextModels(prev => prev.map(m => m.id === id ? { ...m, selected: !m.selected } : m));
    }
  };

  const selectedTextCount = textModels.filter(m => m.selected).length;
  const selectedImageCount = imageModels.filter(m => m.selected).length;

  // 获取当前选中的 System Prompt
  const getSelectedSystemPrompt = useCallback(() => {
    const selected = systemPrompts.find(p => p.id === selectedPromptId);
    return selected?.prompt;
  }, [selectedPromptId, systemPrompts]);

  const handleSend = async () => {
    if (!inputText.trim()) return;
    
    const prompt = inputText.trim();
    setLastPrompt(prompt);
    setIsGenerating(true);
    setShowResults(true);
    setInputText('');

    log.info('ChatDemo', `开始发送消息 [${activeMode}模式]`, { 
      prompt: prompt.slice(0, 100), 
      hasReference: !!referenceImage,
      hasKnowledge: !!knowledgeContext 
    });

    // 如果没有选中对话，创建新对话
    let conversationId = selectedConversation;
    if (!conversationId) {
      log.info('ChatDemo', '创建新对话');
      const newConv = createConversation(prompt.slice(0, 30));
      conversationId = newConv.id;
      setSelectedConversation(conversationId);
      refreshConversations();
    }

    // 保存用户消息
    log.debug('ChatDemo', '保存用户消息到对话', { conversationId });
    addMessage(conversationId, {
      role: 'user',
      content: prompt,
      referenceImage: referenceImage || undefined,
    });
    refreshConversations();

    if (activeMode === 'text') {
      // 文本模式：调用多模型文本生成
      const selectedModels = textModels
        .filter(m => m.selected)
        .map(m => ({ id: m.id, name: m.name }));

      if (selectedModels.length === 0) {
        log.warn('ChatDemo', '未选择文本模型');
        setIsGenerating(false);
        return;
      }

      log.info('ChatDemo', `开始文本生成`, { models: selectedModels.map(m => m.name) });

      // 如果有知识库上下文，将其添加到提示词前面
      const finalPrompt = knowledgeContext 
        ? `[上下文知识]\n${knowledgeContext}\n\n[用户问题]\n${prompt}`
        : prompt;

      await generateTextMultiModel({
        prompt: finalPrompt,
        models: selectedModels,
        globalSystemPrompt: getSelectedSystemPrompt(),
        onUpdate: (responses) => {
          setTextResponses(responses);
          // 检查是否所有模型都完成
          const allDone = responses.every(r => r.status === 'complete' || r.status === 'error');
          if (allDone) {
            log.info('ChatDemo', '文本生成完成', { 
              completed: responses.filter(r => r.status === 'complete').length,
              errors: responses.filter(r => r.status === 'error').length 
            });
            setIsGenerating(false);
            // 保存 AI 响应
            if (conversationId) {
              log.debug('ChatDemo', '保存文本响应到对话', { conversationId });
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
            }
          }
        }
      });
    } else {
      // 图像模式：调用多模型图像生成
      const selectedModels = imageModels
        .filter(m => m.selected)
        .map(m => ({ id: m.id, name: m.name }));

      if (selectedModels.length === 0) {
        log.warn('ChatDemo', '未选择图像模型');
        setIsGenerating(false);
        return;
      }

      log.info('ChatDemo', `开始图像生成`, { 
        models: selectedModels.map(m => m.name),
        hasInputImage: !!referenceImage 
      });

      await generateImageMultiModel({
        prompt,
        models: selectedModels,
        inputImage: referenceImage,
        onUpdate: (responses) => {
          setImageResponses(responses);
          // 检查是否所有模型都完成
          const allDone = responses.every(r => r.status === 'complete' || r.status === 'error');
          if (allDone) {
            log.info('ChatDemo', '图像生成完成', { 
              completed: responses.filter(r => r.status === 'complete').length,
              errors: responses.filter(r => r.status === 'error').length 
            });
            setIsGenerating(false);
            
            // 保存成功生成的图像到本地
            const successfulImages = responses
              .filter(r => r.status === 'complete' && r.image?.url)
              .map(r => ({
                url: r.image!.url,
                modelName: r.modelName,
                prompt: prompt
              }));
            
            if (successfulImages.length > 0) {
              log.info('ChatDemo', `准备保存 ${successfulImages.length} 张图像到本地`);
              // 异步保存图像，不阻塞 UI
              Promise.all(
                successfulImages.map(img => 
                  saveImageToLocal(img.url, img.modelName, img.prompt)
                    .catch(err => log.error('ChatDemo', '保存图像失败', err))
                )
              );
            }
            
            // 保存 AI 响应到对话历史
            if (conversationId) {
              log.debug('ChatDemo', '保存图像响应到对话', { 
                conversationId,
                imageCount: responses.length 
              });
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
              log.info('ChatDemo', '图像响应已保存到对话历史');
            }
          }
        }
      });
    }
  };

  // 重试单个文本模型
  const handleRetryTextModel = async (modelId: string, modelName: string) => {
    if (!lastPrompt) return;
    
    // 更新该模型状态为 streaming
    setTextResponses(prev => prev.map(r => 
      r.modelId === modelId ? { ...r, status: 'streaming' as const, content: '', error: undefined } : r
    ));

    await retryTextModel(
      modelId,
      modelName,
      lastPrompt,
      getSelectedSystemPrompt(),
      (response) => {
        setTextResponses(prev => prev.map(r => 
          r.modelId === modelId ? response : r
        ));
      }
    );
  };

  // 重试单个图像模型
  const handleRetryImageModel = async (modelId: string, modelName: string) => {
    if (!lastPrompt) return;
    
    // 更新该模型状态为 streaming
    setImageResponses(prev => prev.map(r => 
      r.modelId === modelId ? { ...r, status: 'streaming' as const, image: undefined, error: undefined } : r
    ));

    await retryImageModel(
      modelId,
      modelName,
      lastPrompt,
      referenceImage,
      (response) => {
        setImageResponses(prev => prev.map(r => 
          r.modelId === modelId ? response : r
        ));
      }
    );
  };

  // 复制文本到剪贴板
  const handleCopyText = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  // 下载图像
  const handleDownloadImage = (imageUrl: string, modelName: string) => {
    const link = document.createElement('a');
    link.href = imageUrl;
    link.download = `${modelName}-${Date.now()}.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // 打开图像编辑弹窗
  const openImageEditor = (imageUrl: string, panel: 'inpaint' | 'remix' | 'refine') => {
    setEditingImage(imageUrl);
    setActivePanel(panel);
    
    if (panel === 'inpaint') {
      setInpaintMask('');
      setInpaintInstruction('');
    } else if (panel === 'remix') {
      setRemixReferenceImage(null);
      setRemixOriginalMask('');
      setRemixReferenceMask('');
      setRemixInstruction('');
    } else if (panel === 'refine') {
      setRefinePrompt(lastPrompt);
      setRefineSuggestions([]);
      setSelectedRefineSuggestions([]);
    }
  };

  // Inpaint 处理
  const handleInpaint = async () => {
    if (!editingImage || !inpaintMask || !inpaintInstruction.trim()) return;
    
    setIsInpainting(true);
    try {
      const result = await editImageWithGeminiFlash(
        editingImage,
        inpaintMask,
        inpaintInstruction
      );
      
      // 将结果添加到图像响应中
      setImageResponses(prev => [{
        modelId: 'inpaint-result',
        modelName: 'Inpaint 结果',
        status: 'complete',
        image: {
          id: crypto.randomUUID(),
          url: result,
          prompt: inpaintInstruction,
          model: 'Gemini Flash Inpaint'
        }
      }, ...prev]);
      
      setActivePanel('none');
      setShowResults(true);
    } catch (error) {
      console.error('Inpaint failed:', error);
    } finally {
      setIsInpainting(false);
    }
  };

  // Remix 处理
  const handleRemix = async () => {
    if (!editingImage || !remixReferenceImage || !remixInstruction.trim()) return;
    
    setIsRemixing(true);
    try {
      const result = await editImageWithSeedream({
        originalImage: editingImage,
        prompt: remixInstruction,
        maskImage: remixOriginalMask || undefined,
        referenceImage: remixReferenceImage,
        referenceMask: remixReferenceMask || undefined,
        mode: 'remix'
      });
      
      // 将结果添加到图像响应中
      setImageResponses(prev => [{
        modelId: 'remix-result',
        modelName: 'Remix 结果',
        status: 'complete',
        image: {
          id: crypto.randomUUID(),
          url: result,
          prompt: remixInstruction,
          model: 'Seedream Remix'
        }
      }, ...prev]);
      
      setActivePanel('none');
      setShowResults(true);
    } catch (error) {
      console.error('Remix failed:', error);
    } finally {
      setIsRemixing(false);
    }
  };

  // Refine 处理 - 生成优化建议
  const handleGenerateRefineSuggestions = async () => {
    if (!refinePrompt.trim()) return;
    
    setIsRefining(true);
    setRefineSuggestions([]);
    
    try {
      const systemPrompt = `你是一个专业的 AI 图像生成提示词优化专家。用户会给你一个提示词，请生成 3 个优化后的版本。
每个优化版本应该：
1. 更加详细和具体
2. 包含风格、光线、构图等细节
3. 保持原始意图

请直接输出 3 个优化后的提示词，每个用 "---" 分隔，不要有其他解释。`;

      let fullText = '';
      await chatCompletionsStream(
        'Gemini-2.5-pro',
        [{ role: 'user', content: `请优化这个图像生成提示词：\n\n${refinePrompt}` }],
        undefined,
        undefined,
        systemPrompt,
        (text) => {
          fullText = text;
        }
      );
      
      // 解析建议
      const suggestions = fullText.split('---').map(s => s.trim()).filter(s => s.length > 0);
      setRefineSuggestions(suggestions);
    } catch (error) {
      console.error('Refine failed:', error);
    } finally {
      setIsRefining(false);
    }
  };

  // 使用选中的优化建议重新生成
  const handleApplyRefineSuggestions = async () => {
    if (selectedRefineSuggestions.length === 0) return;
    
    const selectedPrompts = selectedRefineSuggestions.map(i => refineSuggestions[i]);
    const combinedPrompt = selectedPrompts.join('\n\n');
    
    setInputText(combinedPrompt);
    setActivePanel('none');
  };

  // GlassMosaic 处理
  const handleGlassMosaicImageUpload = (file: File) => {
    const url = URL.createObjectURL(file);
    setGlassMosaicImage(url);
    setGlassMosaicResult(null);
  };

  const processGlassMosaic = async () => {
    if (!glassMosaicImage || !glassMosaicCanvasRef.current) return;
    
    setIsProcessingMosaic(true);
    try {
      const img = await loadImageElement(glassMosaicImage);
      renderGlassMosaic(glassMosaicCanvasRef.current, img, glassMosaicOptions);
      const resultUrl = glassMosaicCanvasRef.current.toDataURL('image/png');
      setGlassMosaicResult(resultUrl);
    } catch (error) {
      console.error('GlassMosaic processing failed:', error);
    } finally {
      setIsProcessingMosaic(false);
    }
  };

  // 当选项改变时自动处理
  useEffect(() => {
    if (glassMosaicImage) {
      processGlassMosaic();
    }
  }, [glassMosaicImage, glassMosaicOptions]);

  // 自动滚动到底部
  useEffect(() => {
    if (chatScrollRef.current && (textResponses.length > 0 || imageResponses.length > 0)) {
      chatScrollRef.current.scrollTo({
        top: chatScrollRef.current.scrollHeight,
        behavior: 'smooth'
      });
    }
  }, [textResponses, imageResponses, showResults]);

  const downloadGlassMosaicResult = () => {
    if (!glassMosaicResult) return;
    const link = document.createElement('a');
    link.href = glassMosaicResult;
    link.download = `glass-mosaic-${Date.now()}.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleToolClick = (toolId: string) => {
    switch (toolId) {
      case 'text-chat':
        setActiveMode('text');
        setActivePanel('models'); // 自动弹出模型选择
        break;
      case 'image-gen':
        setActiveMode('image');
        setActivePanel('models'); // 自动弹出模型选择
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
      case 'more':
        setActivePanel(activePanel === 'moreTools' ? 'none' : 'moreTools');
        break;
    }
  };

  // ========== 渲染：顶部导航 ==========
  const renderHeader = () => (
    <header className="h-14 bg-white border-b border-gray-100 flex items-center px-6 shrink-0">
      <div className="flex items-center gap-3 mr-8">
        <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-purple-600 rounded-xl flex items-center justify-center">
          <Sparkles className="w-4 h-4 text-white" />
        </div>
        <span className="font-semibold text-lg text-gray-800">GeminiFlow</span>
      </div>
      <nav className="flex gap-1">
        <button onClick={() => setActiveTab('chat')} 
          className={`px-5 py-2 rounded-full text-sm font-medium transition-all ${
            activeTab === 'chat' ? 'bg-gray-900 text-white' : 'text-gray-500 hover:bg-gray-100'
          }`}>
          AI 对话
        </button>
        <button onClick={() => setActiveTab('canvas')} 
          className={`px-5 py-2 rounded-full text-sm font-medium transition-all ${
            activeTab === 'canvas' ? 'bg-gray-900 text-white' : 'text-gray-500 hover:bg-gray-100'
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

  // ========== 渲染：侧边栏 ==========
  const renderSidebar = () => (
    <aside className={`${sidebarOpen ? 'w-72' : 'w-0'} bg-gray-50/50 border-r border-gray-100 flex flex-col transition-all duration-300 overflow-hidden shrink-0`}>
      <div className="p-4">
        <button 
          onClick={handleNewConversation}
          className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-blue-500 text-white rounded-2xl hover:bg-blue-600 transition-all shadow-lg shadow-blue-500/25 font-medium"
        >
          <Plus className="w-4 h-4" />新建对话
        </button>
      </div>
      <div className="flex-1 overflow-y-auto px-3 pb-4">
        <p className="text-xs text-gray-400 font-medium px-3 py-2">最近对话</p>
        {conversations.length === 0 ? (
          <div className="text-center py-8 text-gray-400">
            <MessageSquare className="w-8 h-8 mx-auto mb-2 opacity-50" />
            <p className="text-sm">暂无对话</p>
          </div>
        ) : (
          conversations.map((conv) => (
            <div key={conv.id} className="group relative">
              <button 
                onClick={() => setSelectedConversation(conv.id)}
                className={`w-full text-left px-4 py-3 rounded-xl mb-1 transition-all ${
                  selectedConversation === conv.id ? 'bg-white shadow-sm border border-gray-100' : 'hover:bg-white/60'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="font-medium text-sm text-gray-700 truncate pr-2">{conv.title}</span>
                  <span className="text-xs text-gray-400 shrink-0">{conv.time}</span>
                </div>
              </button>
              <button
                onClick={(e) => { e.stopPropagation(); handleDeleteConversation(conv.id); }}
                className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 rounded-lg opacity-0 group-hover:opacity-100 hover:bg-red-50 text-gray-400 hover:text-red-500 transition-all"
                title="删除对话"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          ))
        )}
      </div>
    </aside>
  );

  // ========== 渲染：工具弹出面板 ==========
  const renderToolPanel = () => {
    if (activePanel === 'none') return null;

    return (
      <div className="absolute bottom-full left-0 right-0 mb-3">
        {/* 模型选择面板 */}
        {activePanel === 'models' && (
          <div className="bg-white rounded-2xl shadow-xl border border-gray-100 p-4 mx-4">
            <div className="flex items-center justify-between mb-3">
              <h4 className="font-medium text-gray-800">选择{activeMode === 'image' ? '图像' : '文本'}模型（多选并行）</h4>
              <button onClick={() => setActivePanel('none')} className="p-1 hover:bg-gray-100 rounded-lg">
                <X className="w-4 h-4 text-gray-400" />
              </button>
            </div>
            <div className="grid grid-cols-3 gap-2">
              {(activeMode === 'image' ? imageModels : textModels).map((model) => (
                <button key={model.id} onClick={() => toggleModel(model.id, activeMode === 'image')}
                  className={`flex items-center gap-2 px-3 py-2.5 rounded-xl border text-sm transition-all ${
                    model.selected ? 'border-blue-200 bg-blue-50 text-blue-700' : 'border-gray-100 bg-gray-50 text-gray-600 hover:bg-white'
                  }`}>
                  <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center ${
                    model.selected ? 'bg-blue-500 border-blue-500' : 'border-gray-300'
                  }`}>
                    {model.selected && <Check className="w-2.5 h-2.5 text-white" />}
                  </div>
                  <span className="truncate">{model.name}</span>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* PromptMarket 面板 */}
        {activePanel === 'promptMarket' && (
          <div className="bg-white rounded-2xl shadow-xl border border-gray-100 p-4 mx-4">
            <div className="flex items-center justify-between mb-3">
              <h4 className="font-medium text-gray-800 flex items-center gap-2">
                <Search className="w-4 h-4 text-orange-500" />PromptMarket
              </h4>
              <button onClick={() => setActivePanel('none')} className="p-1 hover:bg-gray-100 rounded-lg">
                <X className="w-4 h-4 text-gray-400" />
              </button>
            </div>
            <div className="flex gap-2 mb-3">
              <input 
                type="text" 
                placeholder="搜索提示词..." 
                value={promptSearchQuery}
                onChange={(e) => setPromptSearchQuery(e.target.value)}
                className="flex-1 px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-orange-100" 
              />
              <select 
                value={promptCategory}
                onChange={(e) => setPromptCategory(e.target.value)}
                className="px-3 py-2 border border-gray-200 rounded-xl text-sm bg-white"
              >
                {promptCategories.map(cat => (
                  <option key={cat} value={cat}>{cat}</option>
                ))}
              </select>
            </div>
            <div className="grid grid-cols-3 gap-3 max-h-64 overflow-y-auto">
              {filteredPromptMarks.length > 0 ? (
                filteredPromptMarks.map((pm) => (
                  <button key={pm.id} onClick={() => { setInputText(pm.prompt); setActivePanel('none'); }}
                    className="text-left rounded-xl border border-gray-100 overflow-hidden hover:border-orange-300 hover:shadow-md transition group">
                    <div className="aspect-[4/3] bg-gray-100 relative">
                      {pm.image ? (
                        <img src={pm.image} alt={pm.title} className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-orange-100 to-orange-200">
                          <Sparkles className="w-6 h-6 text-orange-400" />
                        </div>
                      )}
                      <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
                      <span className="absolute bottom-2 left-2 text-white text-xs font-medium">{pm.title}</span>
                    </div>
                  </button>
                ))
              ) : (
                <div className="col-span-3 text-center py-8 text-gray-400">
                  <Search className="w-8 h-8 mx-auto mb-2 opacity-50" />
                  <p className="text-sm">没有找到匹配的提示词</p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* SystemPrompt 面板 */}
        {activePanel === 'systemPrompt' && (
          <div className="bg-white rounded-2xl shadow-xl border border-gray-100 p-4 mx-4">
            <div className="flex items-center justify-between mb-3">
              <h4 className="font-medium text-gray-800 flex items-center gap-2">
                <FileText className="w-4 h-4 text-purple-500" />System Prompt
              </h4>
              <button onClick={() => setActivePanel('none')} className="p-1 hover:bg-gray-100 rounded-lg">
                <X className="w-4 h-4 text-gray-400" />
              </button>
            </div>
            <div className="space-y-2 max-h-64 overflow-y-auto">
              {systemPrompts.map((prompt) => (
                <button key={prompt.id} onClick={() => { setSelectedPromptId(prompt.id); setActivePanel('none'); }}
                  className={`w-full text-left px-4 py-3 rounded-xl transition-all ${
                    selectedPromptId === prompt.id ? 'bg-purple-50 border border-purple-200' : 'bg-gray-50 hover:bg-gray-100 border border-transparent'
                  }`}>
                  <div className="font-medium text-sm text-gray-700">{prompt.name}</div>
                  <div className="text-xs text-gray-400 truncate mt-0.5">{prompt.prompt}</div>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* GlassMosaic 面板 */}
        {activePanel === 'glassMosaic' && (
          <div className="bg-white rounded-2xl shadow-xl border border-gray-100 p-4 mx-4">
            <div className="flex items-center justify-between mb-3">
              <h4 className="font-medium text-gray-800 flex items-center gap-2">
                <Palette className="w-4 h-4 text-indigo-500" />Glass Mosaic
              </h4>
              <button onClick={() => setActivePanel('none')} className="p-1 hover:bg-gray-100 rounded-lg">
                <X className="w-4 h-4 text-gray-400" />
              </button>
            </div>
            <div className="grid grid-cols-2 gap-4">
              {/* 图片上传/预览区域 */}
              <div>
                {glassMosaicResult ? (
                  <div className="relative rounded-xl overflow-hidden bg-gray-100">
                    <img src={glassMosaicResult} alt="Glass Mosaic Result" className="w-full h-48 object-contain" />
                    <button 
                      onClick={() => { setGlassMosaicImage(null); setGlassMosaicResult(null); }}
                      className="absolute top-2 right-2 p-1 bg-gray-900/80 text-white rounded-full hover:bg-gray-900"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                ) : glassMosaicImage ? (
                  <div className="relative rounded-xl overflow-hidden bg-gray-100">
                    <img src={glassMosaicImage} alt="Source" className="w-full h-48 object-contain" />
                    {isProcessingMosaic && (
                      <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                        <Loader2 className="w-8 h-8 text-white animate-spin" />
                      </div>
                    )}
                  </div>
                ) : (
                  <label className="border-2 border-dashed border-gray-200 rounded-xl p-8 h-48 flex flex-col items-center justify-center text-gray-400 hover:border-indigo-400 cursor-pointer transition">
                    <Upload className="w-8 h-8 mb-2" />
                    <span className="text-sm">上传图片</span>
                    <input 
                      type="file" 
                      className="hidden" 
                      accept="image/*"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) handleGlassMosaicImageUpload(file);
                      }}
                    />
                  </label>
                )}
                {/* 隐藏的 canvas 用于渲染 */}
                <canvas ref={glassMosaicCanvasRef} className="hidden" />
              </div>
              
              {/* 参数控制区域 */}
              <div className="space-y-3">
                <div>
                  <label className="text-xs text-gray-500 flex justify-between">
                    <span>网格尺寸</span>
                    <span>{glassMosaicOptions.cellSize}px</span>
                  </label>
                  <input 
                    type="range" 
                    className="w-full" 
                    min={5} 
                    max={50} 
                    value={glassMosaicOptions.cellSize}
                    onChange={(e) => setGlassMosaicOptions(prev => ({ ...prev, cellSize: Number(e.target.value) }))}
                  />
                </div>
                <div>
                  <label className="text-xs text-gray-500 flex justify-between">
                    <span>透明度</span>
                    <span>{Math.round(glassMosaicOptions.glassOpacity * 100)}%</span>
                  </label>
                  <input 
                    type="range" 
                    className="w-full" 
                    min={0} 
                    max={100} 
                    value={glassMosaicOptions.glassOpacity * 100}
                    onChange={(e) => setGlassMosaicOptions(prev => ({ ...prev, glassOpacity: Number(e.target.value) / 100 }))}
                  />
                </div>
                <div>
                  <label className="text-xs text-gray-500 flex justify-between">
                    <span>边缘深度</span>
                    <span>{Math.round(glassMosaicOptions.bevelIntensity * 100)}%</span>
                  </label>
                  <input 
                    type="range" 
                    className="w-full" 
                    min={0} 
                    max={100} 
                    value={glassMosaicOptions.bevelIntensity * 100}
                    onChange={(e) => setGlassMosaicOptions(prev => ({ ...prev, bevelIntensity: Number(e.target.value) / 100 }))}
                  />
                </div>
                <div className="flex gap-2">
                  <button 
                    onClick={() => setGlassMosaicOptions(prev => ({ ...prev, renderShape: 'square' }))}
                    className={`flex-1 py-2 text-xs rounded-lg border transition ${
                      glassMosaicOptions.renderShape === 'square' 
                        ? 'border-indigo-300 text-indigo-600 bg-indigo-50' 
                        : 'border-gray-200 text-gray-500 hover:bg-gray-50'
                    }`}
                  >
                    方块
                  </button>
                  <button 
                    onClick={() => setGlassMosaicOptions(prev => ({ ...prev, renderShape: 'circle' }))}
                    className={`flex-1 py-2 text-xs rounded-lg border transition ${
                      glassMosaicOptions.renderShape === 'circle' 
                        ? 'border-indigo-300 text-indigo-600 bg-indigo-50' 
                        : 'border-gray-200 text-gray-500 hover:bg-gray-50'
                    }`}
                  >
                    圆形
                  </button>
                </div>
                {glassMosaicResult && (
                  <button 
                    onClick={downloadGlassMosaicResult}
                    className="w-full py-2 text-xs rounded-lg bg-indigo-500 text-white hover:bg-indigo-600 flex items-center justify-center gap-2"
                  >
                    <Download className="w-3.5 h-3.5" />
                    下载结果
                  </button>
                )}
              </div>
            </div>
          </div>
        )}

        {/* 更多工具面板 */}
        {activePanel === 'moreTools' && (
          <div className="bg-white rounded-2xl shadow-xl border border-gray-100 p-4 mx-4">
            <div className="flex items-center justify-between mb-3">
              <h4 className="font-medium text-gray-800">更多工具</h4>
              <button onClick={() => setActivePanel('none')} className="p-1 hover:bg-gray-100 rounded-lg">
                <X className="w-4 h-4 text-gray-400" />
              </button>
            </div>
            
            {/* 知识库面板 */}
            {showKnowledgePanel ? (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <label className="text-xs text-gray-500 font-medium flex items-center gap-2">
                    <BookOpen className="w-4 h-4 text-green-500" />
                    添加上下文知识
                  </label>
                  <span className="text-xs text-gray-400">{knowledgeContext.length} 字</span>
                </div>
                <textarea 
                  value={knowledgeContext}
                  onChange={(e) => setKnowledgeContext(e.target.value)}
                  placeholder="输入或粘贴上下文内容，AI 将基于此知识进行回答..."
                  className="w-full h-32 px-3 py-2 border border-gray-200 rounded-xl text-sm resize-none focus:outline-none focus:ring-2 focus:ring-green-100"
                />
                {knowledgeContext.length > 5000 && (
                  <p className="text-xs text-amber-500">⚠️ 上下文较长，可能影响响应质量</p>
                )}
                <div className="flex gap-2">
                  <button 
                    onClick={() => setShowKnowledgePanel(false)}
                    className="flex-1 py-2 text-xs rounded-lg border border-gray-200 text-gray-500 hover:bg-gray-50"
                  >
                    返回
                  </button>
                  <button 
                    onClick={() => { setShowKnowledgePanel(false); setActivePanel('none'); }}
                    className="flex-1 py-2 text-xs rounded-lg bg-green-500 text-white hover:bg-green-600"
                  >
                    确认
                  </button>
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-3 gap-3">
                <button 
                  onClick={() => setShowKnowledgePanel(true)}
                  className="flex flex-col items-center gap-2 p-4 rounded-xl hover:bg-gray-50 transition group"
                >
                  <div className="p-3 rounded-xl bg-gray-50 group-hover:bg-white group-hover:shadow transition text-green-500">
                    <BookOpen className="w-5 h-5" />
                  </div>
                  <span className="text-xs font-medium text-gray-700">知识库</span>
                  <span className="text-xs text-gray-400">
                    {knowledgeContext ? '已添加' : '添加上下文'}
                  </span>
                </button>
                <button className="flex flex-col items-center gap-2 p-4 rounded-xl hover:bg-gray-50 transition group">
                  <div className="p-3 rounded-xl bg-gray-50 group-hover:bg-white group-hover:shadow transition text-amber-500">
                    <Zap className="w-5 h-5" />
                  </div>
                  <span className="text-xs font-medium text-gray-700">Workflow</span>
                  <span className="text-xs text-gray-400">工作流预设</span>
                </button>
                <button 
                  onClick={() => { setActivePanel('none'); setTimeout(() => openImageEditor('', 'refine'), 100); }}
                  className="flex flex-col items-center gap-2 p-4 rounded-xl hover:bg-gray-50 transition group"
                >
                  <div className="p-3 rounded-xl bg-gray-50 group-hover:bg-white group-hover:shadow transition text-purple-500">
                    <Wand2 className="w-5 h-5" />
                  </div>
                  <span className="text-xs font-medium text-gray-700">Refine</span>
                  <span className="text-xs text-gray-400">提示词优化</span>
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    );
  };

  // ========== 渲染：输入区域 ==========
  const renderInputArea = () => (
    <div className="p-4 pb-6">
      <div className="max-w-3xl mx-auto relative">
        {renderToolPanel()}
        
        {/* 离线提示 */}
        {!isOnline && (
          <div className="mb-3 px-4 py-2 bg-amber-50 border border-amber-200 rounded-2xl flex items-center gap-2 text-amber-700">
            <AlertCircle className="w-4 h-4" />
            <span className="text-sm">网络已断开，请检查网络连接</span>
          </div>
        )}
        
        {/* 主输入框 */}
        <div className="bg-white rounded-3xl shadow-lg shadow-gray-200/50 border border-gray-100 overflow-hidden">
          {/* 参考图预览 */}
          {referenceImage && (
            <div className="px-4 pt-4 flex items-center gap-3">
              <div className="relative group">
                <img src={referenceImage} alt="Reference" className="w-16 h-16 object-cover rounded-xl border border-gray-100" />
                <button onClick={() => setReferenceImage(null)} 
                  className="absolute -top-2 -right-2 p-1 bg-gray-900 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity">
                  <X className="w-3 h-3" />
                </button>
              </div>
              <span className="text-sm text-gray-500">参考图已添加</span>
            </div>
          )}
          
          {/* 输入框 */}
          <div className="px-5 py-4">
            <textarea 
              value={inputText} 
              onChange={(e) => setInputText(e.target.value)}
              placeholder='发消息或输入 "/" 选择技能'
              className="w-full bg-transparent resize-none outline-none text-gray-700 placeholder-gray-400 text-[15px] min-h-[24px] max-h-32"
              rows={1}
              onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); } }}
            />
          </div>
          
          {/* 底部工具栏 */}
          <div className="px-4 pb-4 flex items-center justify-between">
            <div className="flex items-center gap-1">
              {/* 附件上传 */}
              <label className="p-2 hover:bg-gray-100 rounded-xl cursor-pointer transition-colors" title="上传图片">
                <Paperclip className="w-5 h-5 text-gray-400" />
                <input type="file" className="hidden" accept="image/*" onChange={async (e) => {
                  const file = e.target.files?.[0];
                  if (file) {
                    try {
                      // 使用 processImage 进行转换和压缩
                      const compressed = await processImage(file);
                      setReferenceImage(compressed);
                    } catch (error) {
                      console.error('Failed to process image:', error);
                      // 降级处理：直接使用 base64
                      const base64 = await fileToBase64(file);
                      setReferenceImage(base64);
                    }
                  }
                }} />
              </label>
              
              {/* URL 输入 */}
              <button 
                onClick={async () => {
                  const url = prompt('输入图片 URL:');
                  if (url && isValidImageUrl(url)) {
                    try {
                      // 使用 processImage 进行转换和压缩
                      const compressed = await processImage(url);
                      setReferenceImage(compressed);
                    } catch (error) {
                      console.error('Failed to process URL image:', error);
                      // 降级处理：直接使用 URL
                      setReferenceImage(url);
                    }
                  } else if (url) {
                    alert('请输入有效的图片 URL');
                  }
                }}
                className="p-2 hover:bg-gray-100 rounded-xl transition-colors"
                title="从 URL 添加图片"
              >
                <Link className="w-5 h-5 text-gray-400" />
              </button>
              
              <div className="w-px h-5 bg-gray-200 mx-1" />
              
              {/* 工具按钮 */}
              {TOOL_BUTTONS.map((tool) => (
                <button key={tool.id} onClick={() => handleToolClick(tool.id)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-sm transition-all hover:bg-gray-100 ${
                    (tool.id === 'text-chat' && activeMode === 'text') ||
                    (tool.id === 'image-gen' && activeMode === 'image') ||
                    (tool.id === 'prompt-market' && activePanel === 'promptMarket') ||
                    (tool.id === 'system-prompt' && activePanel === 'systemPrompt') ||
                    (tool.id === 'glass-mosaic' && activePanel === 'glassMosaic')
                      ? 'bg-gray-100 text-gray-700' : 'text-gray-500'
                  }`}>
                  <tool.icon className={`w-4 h-4 ${tool.color}`} />
                  <span className="hidden sm:inline">{tool.label}</span>
                </button>
              ))}
            </div>
            
            {/* 发送按钮 */}
            <button onClick={handleSend} disabled={!inputText.trim() || isGenerating || !isOnline}
              className={`p-2.5 rounded-xl transition-all ${
                inputText.trim() && !isGenerating && isOnline
                  ? 'bg-blue-500 text-white shadow-lg shadow-blue-500/30 hover:bg-blue-600'
                  : 'bg-gray-100 text-gray-400 cursor-not-allowed'
              }`}>
              {isGenerating ? <Loader2 className="w-5 h-5 animate-spin" /> : <Send className="w-5 h-5" />}
            </button>
          </div>
        </div>
        
        <p className="text-center text-xs text-gray-400 mt-3">
          {activeMode === 'image' ? `图像模式 · ${selectedImageCount} 个模型` : `文本模式 · ${selectedTextCount} 个模型`} · 按 Enter 发送
        </p>
      </div>
    </div>
  );

  // ========== 渲染：图像操作按钮 ==========
  const renderImageActions = (imageUrl: string) => (
    <div className="flex gap-2 p-3 border-t border-gray-100">
      <button onClick={(e) => { e.stopPropagation(); openImageEditor(imageUrl, 'refine'); }} 
        className="flex-1 flex items-center justify-center gap-1.5 py-2 bg-purple-50 text-purple-600 rounded-xl text-xs font-medium hover:bg-purple-100 transition">
        <Wand2 className="w-3.5 h-3.5" />Refine
      </button>
      <button onClick={(e) => { e.stopPropagation(); openImageEditor(imageUrl, 'inpaint'); }} 
        className="flex-1 flex items-center justify-center gap-1.5 py-2 bg-blue-50 text-blue-600 rounded-xl text-xs font-medium hover:bg-blue-100 transition">
        <Edit2 className="w-3.5 h-3.5" />Inpaint
      </button>
      <button onClick={(e) => { e.stopPropagation(); openImageEditor(imageUrl, 'remix'); }} 
        className="flex-1 flex items-center justify-center gap-1.5 py-2 bg-green-50 text-green-600 rounded-xl text-xs font-medium hover:bg-green-100 transition">
        <Sliders className="w-3.5 h-3.5" />Remix
      </button>
    </div>
  );

  // ========== 渲染：结果区域 ==========
  const renderResults = () => {
    // 获取状态指示器颜色
    const getStatusColor = (status: string) => {
      switch (status) {
        case 'complete': return 'bg-green-400';
        case 'streaming': return 'bg-blue-400 animate-pulse';
        case 'error': return 'bg-red-400';
        default: return 'bg-gray-300';
      }
    };

    return (
      <div className="space-y-6">
        {/* 用户消息 */}
        {lastPrompt && (
          <div className="flex justify-end">
            <div className="max-w-[70%] bg-blue-500 text-white rounded-2xl rounded-tr-md px-5 py-3 shadow-lg shadow-blue-500/20">
              <p className="text-[15px] whitespace-pre-wrap">{lastPrompt}</p>
            </div>
          </div>
        )}

        {/* 文本模式结果 */}
        {activeMode === 'text' ? (
          <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4">
            {textResponses.map((response) => (
              <div key={response.modelId} className="bg-white rounded-2xl border border-gray-100 overflow-hidden shadow-sm hover:shadow-md transition">
                <div className="px-4 py-3 bg-gray-50 border-b border-gray-100 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className={`w-2 h-2 rounded-full ${getStatusColor(response.status)}`} />
                    <span className="font-medium text-sm text-gray-700">{response.modelName}</span>
                  </div>
                  {response.status === 'streaming' || response.status === 'pending' ? (
                    <Loader2 className="w-4 h-4 text-blue-500 animate-spin" />
                  ) : response.status === 'error' ? (
                    <button 
                      onClick={() => handleRetryTextModel(response.modelId, response.modelName)}
                      className="p-1.5 hover:bg-red-50 rounded-lg"
                      title="重试"
                    >
                      <RotateCcw className="w-3.5 h-3.5 text-red-400" />
                    </button>
                  ) : (
                    <div className="flex gap-1">
                      <button 
                        onClick={() => handleCopyText(response.content)}
                        className="p-1.5 hover:bg-gray-100 rounded-lg"
                        title="复制"
                      >
                        <Copy className="w-3.5 h-3.5 text-gray-400" />
                      </button>
                      <button 
                        onClick={() => handleRetryTextModel(response.modelId, response.modelName)}
                        className="p-1.5 hover:bg-gray-100 rounded-lg"
                        title="重试"
                      >
                        <RotateCcw className="w-3.5 h-3.5 text-gray-400" />
                      </button>
                    </div>
                  )}
                </div>
                <div className="p-4 text-sm text-gray-600 max-h-64 overflow-y-auto">
                  {response.status === 'pending' ? (
                    <div className="flex items-center gap-2 text-gray-400">
                      <div className="flex gap-1">
                        <div className="w-2 h-2 bg-blue-400 rounded-full animate-bounce" />
                        <div className="w-2 h-2 bg-blue-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                        <div className="w-2 h-2 bg-blue-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                      </div>
                      等待中...
                    </div>
                  ) : response.status === 'streaming' ? (
                    <div>
                      <div className="whitespace-pre-wrap">{response.content || '正在思考...'}</div>
                      <span className="inline-block w-2 h-4 bg-blue-400 animate-pulse ml-1" />
                    </div>
                  ) : response.status === 'error' ? (
                    <div className="flex items-center gap-2 text-red-500">
                      <AlertCircle className="w-4 h-4" />
                      <span>{response.error || '生成失败'}</span>
                    </div>
                  ) : (
                    <MarkdownLight text={response.content} />
                  )}
                </div>
              </div>
            ))}
          </div>
        ) : (
          /* 图像模式结果 */
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {imageResponses.map((response) => (
              <div 
                key={response.modelId} 
                onClick={() => response.status === 'complete' && setSelectedResultImage(response.modelId)}
                className={`bg-white rounded-2xl border overflow-hidden transition cursor-pointer ${
                  selectedResultImage === response.modelId ? 'border-blue-300 ring-4 ring-blue-100 shadow-lg' : 'border-gray-100 shadow-sm hover:shadow-md'
                }`}
              >
                <div className="px-4 py-3 bg-gray-50 border-b border-gray-100 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className={`w-2 h-2 rounded-full ${getStatusColor(response.status)}`} />
                    <span className="font-medium text-sm text-gray-700">{response.modelName}</span>
                  </div>
                  {response.status === 'streaming' || response.status === 'pending' ? (
                    <Loader2 className="w-4 h-4 text-pink-500 animate-spin" />
                  ) : response.status === 'error' ? (
                    <button 
                      onClick={(e) => { e.stopPropagation(); handleRetryImageModel(response.modelId, response.modelName); }}
                      className="p-1.5 hover:bg-red-50 rounded-lg"
                      title="重试"
                    >
                      <RotateCcw className="w-3.5 h-3.5 text-red-400" />
                    </button>
                  ) : response.image ? (
                    <button 
                      onClick={(e) => { e.stopPropagation(); handleDownloadImage(response.image!.url, response.modelName); }}
                      className="p-1.5 hover:bg-gray-100 rounded-lg"
                      title="下载"
                    >
                      <Download className="w-3.5 h-3.5 text-gray-400" />
                    </button>
                  ) : null}
                </div>
                <div className="aspect-square bg-gray-100 flex items-center justify-center">
                  {response.status === 'pending' || response.status === 'streaming' ? (
                    <div className="text-center text-gray-400">
                      <Loader2 className="w-8 h-8 animate-spin mx-auto mb-2" />
                      <span className="text-sm">生成中...</span>
                    </div>
                  ) : response.status === 'error' ? (
                    <div className="text-center text-red-400 p-4">
                      <AlertCircle className="w-8 h-8 mx-auto mb-2" />
                      <span className="text-sm">{response.error || '生成失败'}</span>
                    </div>
                  ) : response.image ? (
                    <img src={response.image.url} alt="Generated" className="w-full h-full object-cover" />
                  ) : (
                    <div className="text-center text-gray-400">
                      <span className="text-sm">无图像</span>
                    </div>
                  )}
                </div>
                {selectedResultImage === response.modelId && response.status === 'complete' && response.image && renderImageActions(response.image.url)}
              </div>
            ))}
          </div>
        )}
      </div>
    );
  };

  // ========== 渲染：弹窗 ==========
  const renderModals = () => (
    <>
      {/* Inpaint 弹窗 */}
      {activePanel === 'inpaint' && editingImage && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50" onClick={() => setActivePanel('none')}>
          <div className="bg-white rounded-3xl w-[800px] max-h-[90vh] overflow-hidden shadow-2xl" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between p-5 border-b border-gray-100">
              <h3 className="font-semibold text-gray-800 flex items-center gap-3">
                <div className="w-1.5 h-6 bg-blue-500 rounded-full" />精确修正 (Inpaint)
              </h3>
              <button onClick={() => setActivePanel('none')} className="p-2 hover:bg-gray-100 rounded-xl">
                <X className="w-5 h-5 text-gray-400" />
              </button>
            </div>
            <div className="p-5">
              <div className="bg-gray-50 rounded-2xl overflow-hidden mb-4 flex items-center justify-center" style={{ height: 400 }}>
                <DrawingCanvas
                  imageUrl={editingImage}
                  width={400}
                  height={400}
                  onMaskChange={setInpaintMask}
                  strokeColor="rgba(0, 255, 0, 0.5)"
                  lineWidth={20}
                />
              </div>
              <p className="text-xs text-gray-400 mb-3">在图像上绘制需要修改的区域</p>
              <div className="flex gap-3">
                <input 
                  type="text" 
                  placeholder="描述修改意图..." 
                  value={inpaintInstruction}
                  onChange={(e) => setInpaintInstruction(e.target.value)}
                  className="flex-1 px-4 py-3 bg-gray-50 border border-gray-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-blue-100" 
                />
                <button 
                  onClick={handleInpaint}
                  disabled={!inpaintMask || !inpaintInstruction.trim() || isInpainting}
                  className={`px-6 py-3 rounded-2xl font-medium flex items-center gap-2 ${
                    inpaintMask && inpaintInstruction.trim() && !isInpainting
                      ? 'bg-blue-500 text-white hover:bg-blue-600'
                      : 'bg-gray-200 text-gray-400 cursor-not-allowed'
                  }`}
                >
                  {isInpainting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                  {isInpainting ? '处理中...' : '确认'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Remix 弹窗 */}
      {activePanel === 'remix' && editingImage && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50" onClick={() => setActivePanel('none')}>
          <div className="bg-white rounded-3xl w-[1000px] max-h-[90vh] overflow-hidden shadow-2xl" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between p-5 border-b border-gray-100">
              <h3 className="font-semibold text-gray-800 flex items-center gap-3">
                <div className="w-1.5 h-6 bg-green-500 rounded-full" />对比修正 (Remix)
              </h3>
              <button onClick={() => setActivePanel('none')} className="p-2 hover:bg-gray-100 rounded-xl">
                <X className="w-5 h-5 text-gray-400" />
              </button>
            </div>
            <div className="p-5 flex gap-5">
              <div className="flex-1">
                <p className="text-xs text-gray-500 font-medium mb-2">原图 (图 A) - 绘制遮罩</p>
                <div className="bg-gray-50 rounded-2xl overflow-hidden" style={{ height: 300 }}>
                  <DrawingCanvas
                    imageUrl={editingImage}
                    width={300}
                    height={300}
                    onMaskChange={setRemixOriginalMask}
                    strokeColor="rgba(0, 255, 0, 0.5)"
                    lineWidth={15}
                  />
                </div>
              </div>
              <div className="flex-1">
                <p className="text-xs text-gray-500 font-medium mb-2">参考图 (图 B)</p>
                {remixReferenceImage ? (
                  <div className="bg-gray-50 rounded-2xl overflow-hidden relative" style={{ height: 300 }}>
                    <DrawingCanvas
                      imageUrl={remixReferenceImage}
                      width={300}
                      height={300}
                      onMaskChange={setRemixReferenceMask}
                      strokeColor="rgba(255, 0, 0, 0.5)"
                      lineWidth={15}
                    />
                    <button 
                      onClick={() => setRemixReferenceImage(null)}
                      className="absolute top-2 right-2 p-1 bg-gray-900/80 text-white rounded-full hover:bg-gray-900"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                ) : (
                  <label className="bg-gray-50 rounded-2xl h-[300px] flex items-center justify-center border-2 border-dashed border-gray-200 hover:border-green-400 cursor-pointer transition">
                    <div className="text-center text-gray-400">
                      <Upload className="w-8 h-8 mx-auto mb-2" />
                      <span className="text-sm">上传参考图</span>
                    </div>
                    <input 
                      type="file" 
                      className="hidden" 
                      accept="image/*"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) setRemixReferenceImage(URL.createObjectURL(file));
                      }}
                    />
                  </label>
                )}
              </div>
            </div>
            <div className="p-5 border-t border-gray-100 flex gap-3">
              <input 
                type="text" 
                placeholder="描述迁移意图..." 
                value={remixInstruction}
                onChange={(e) => setRemixInstruction(e.target.value)}
                className="flex-1 px-4 py-3 bg-gray-50 border border-gray-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-green-100" 
              />
              <button 
                onClick={handleRemix}
                disabled={!remixReferenceImage || !remixInstruction.trim() || isRemixing}
                className={`px-6 py-3 rounded-2xl font-medium flex items-center gap-2 ${
                  remixReferenceImage && remixInstruction.trim() && !isRemixing
                    ? 'bg-green-500 text-white hover:bg-green-600'
                    : 'bg-gray-200 text-gray-400 cursor-not-allowed'
                }`}
              >
                {isRemixing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                {isRemixing ? '处理中...' : '确认'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Refine 弹窗 */}
      {activePanel === 'refine' && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50" onClick={() => setActivePanel('none')}>
          <div className="bg-white rounded-3xl w-[600px] max-h-[90vh] overflow-hidden shadow-2xl" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between p-5 border-b border-gray-100">
              <h3 className="font-semibold text-gray-800 flex items-center gap-3">
                <div className="w-1.5 h-6 bg-purple-500 rounded-full" />提示词优化 (Refine)
              </h3>
              <button onClick={() => setActivePanel('none')} className="p-2 hover:bg-gray-100 rounded-xl">
                <X className="w-5 h-5 text-gray-400" />
              </button>
            </div>
            <div className="p-5 space-y-4">
              <div>
                <label className="text-xs text-gray-500 font-medium mb-2 block">当前提示词</label>
                <textarea 
                  value={refinePrompt}
                  onChange={(e) => setRefinePrompt(e.target.value)}
                  className="w-full h-28 px-4 py-3 bg-gray-50 border border-gray-200 rounded-2xl resize-none focus:outline-none focus:ring-2 focus:ring-purple-100" 
                  placeholder="输入提示词..." 
                />
              </div>
              
              {/* 优化建议列表 */}
              {refineSuggestions.length > 0 && (
                <div>
                  <label className="text-xs text-gray-500 font-medium mb-2 block">优化建议（点击选择）</label>
                  <div className="space-y-2 max-h-48 overflow-y-auto">
                    {refineSuggestions.map((suggestion, index) => (
                      <button
                        key={index}
                        onClick={() => {
                          setSelectedRefineSuggestions(prev => 
                            prev.includes(index) 
                              ? prev.filter(i => i !== index)
                              : [...prev, index]
                          );
                        }}
                        className={`w-full text-left p-3 rounded-xl text-sm transition-all ${
                          selectedRefineSuggestions.includes(index)
                            ? 'bg-purple-50 border border-purple-200'
                            : 'bg-gray-50 border border-transparent hover:bg-gray-100'
                        }`}
                      >
                        <div className="flex items-start gap-2">
                          <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center mt-0.5 ${
                            selectedRefineSuggestions.includes(index) ? 'bg-purple-500 border-purple-500' : 'border-gray-300'
                          }`}>
                            {selectedRefineSuggestions.includes(index) && <Check className="w-2.5 h-2.5 text-white" />}
                          </div>
                          <span className="flex-1 text-gray-600">{suggestion}</span>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              )}
              
              <div className="flex gap-3">
                <button 
                  onClick={handleGenerateRefineSuggestions}
                  disabled={!refinePrompt.trim() || isRefining}
                  className={`px-5 py-3 rounded-2xl flex items-center gap-2 ${
                    refinePrompt.trim() && !isRefining
                      ? 'bg-purple-500 text-white hover:bg-purple-600'
                      : 'bg-gray-200 text-gray-400 cursor-not-allowed'
                  }`}
                >
                  {isRefining ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
                  {isRefining ? '优化中...' : 'AI 智能优化'}
                </button>
                <button 
                  onClick={handleApplyRefineSuggestions}
                  disabled={selectedRefineSuggestions.length === 0}
                  className={`px-5 py-3 rounded-2xl font-medium ml-auto ${
                    selectedRefineSuggestions.length > 0
                      ? 'bg-gray-900 text-white hover:bg-gray-800'
                      : 'bg-gray-200 text-gray-400 cursor-not-allowed'
                  }`}
                >
                  应用选中
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );

  // ========== 主渲染 ==========
  return (
    <div className="h-screen w-screen flex flex-col bg-gradient-to-b from-gray-50 to-white">
      {renderHeader()}

      {activeTab === 'chat' ? (
        <div className="flex-1 flex overflow-hidden">
          {renderSidebar()}

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
              {showResults ? renderResults() : (
                <div className="h-full flex items-center justify-center">
                  <div className="text-center max-w-md">
                    <div className="w-20 h-20 bg-gradient-to-br from-blue-100 to-purple-100 rounded-3xl flex items-center justify-center mx-auto mb-6">
                      <Sparkles className="w-10 h-10 text-blue-500" />
                    </div>
                    <h3 className="text-xl font-semibold text-gray-800 mb-2">开始新对话</h3>
                    <p className="text-gray-500">选择下方的功能开始，支持多模型并行生成</p>
                  </div>
                </div>
              )}
            </div>

            {renderInputArea()}
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

      {renderModals()}
    </div>
  );
};

export default ChatDemo;

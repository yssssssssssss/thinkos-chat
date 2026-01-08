import React, { useState, useRef, useCallback } from 'react';

import { createPortal } from 'react-dom';

import Node from './components/Node';

import LogConsole, { LogEntry } from './components/LogConsole';

import ImageNode from './components/nodes/ImageNode';

import PromptNode from './components/nodes/PromptNode';

import PromptMarkNode from './components/nodes/PromptMarkNode';

import ImageModelNode from './components/nodes/ImageModelNode';

import ImageToImageModelNode from './components/nodes/ImageToImageModelNode';

import TextModelNode from './components/nodes/TextModelNodePromptSelect';

import TextResultNode from './components/nodes/TextResultNodeStream';

import ResultNode from './components/nodes/ResultNode';

import KnowledgeNode from './components/nodes/KnowledgeNode';

import WorkflowNode from './components/nodes/WorkflowNode';

import GlassMosaicNode from './components/nodes/GlassMosaicNode';

import { INITIAL_NODES, AVAILABLE_IMAGE_MODELS, AVAILABLE_IMAGE_TO_IMAGE_MODELS, AVAILABLE_TEXT_MODELS, GLASS_MOSAIC_DEFAULT_OPTIONS } from './constants';

import { NodeData, Connection, NodeType, ResultNodeData, TextResultNodeData, ImageModelNodeData, ImageToImageModelNodeData, TextModelNodeData, PromptNodeData, PromptMarkNodeData, ImageNodeData, GeneratedImage, KnowledgeNodeData, WorkflowNodeData, GlassMosaicNodeData, GlassMosaicOptions } from './types';

import { generateImagesFromWorkflow as generateImagesMock, editImage } from './services/geminiService';

import { generateImagesFromWorkflow as generateImagesReal, editImageWithGeminiFlash, editImageWithSeedream } from './services/geminiImageService';

import { chatCompletionsStream } from './services/textModelService';
import { resolveSystemPromptText } from './services/systemPromptService';
import { deleteNodeImages } from './utils/imageStorage';
import { randomId } from './utils/id';



// Toggle between real API and mock data (true = real Gemini endpoint)
const USE_REAL_IMAGE_API = true;
const SEEDREAM_MODEL_ID = 'doubao-seedream-4-0-250828';

import { Plus, ZoomIn, ZoomOut, Maximize } from 'lucide-react';



const LINEAGE_COLORS = ['#f97316', '#22c55e', '#3b82f6', '#e11d48', '#a855f7', '#14b8a6'];

type AppGalleryItem = {
  id: string;
  title: string;
  desc: string;
  img: string;
  type: 'workflow' | 'node';
  params?: { strength: number; scale: number; steps: number };
  nodeType?: NodeType;
};

const APP_LIBRARY: AppGalleryItem[] = [
  { id: 'wf-zoom', type: 'workflow', title: 'Zoom Enhance', desc: 'Upscale and sharpen detail while preserving the subject', img: 'https://images.unsplash.com/photo-1498050108023-c5249f4df085?auto=format&fit=crop&w=400&q=60', params: { strength: 0.6, scale: 1.5, steps: 20 } },
  { id: 'wf-upscale', type: 'workflow', title: 'Super Resolution', desc: 'Increase resolution and extend the background', img: 'https://images.unsplash.com/photo-1501004318641-b39e6451bec6?auto=format&fit=crop&w=400&q=60', params: { strength: 0.7, scale: 2.0, steps: 24 } },
  { id: 'wf-explode', type: 'workflow', title: 'Remix Structure', desc: 'Boldly rewrite the composition to explore variants', img: 'https://images.unsplash.com/photo-1472214103451-9374bd1c798e?auto=format&fit=crop&w=400&q=60', params: { strength: 0.85, scale: 1.3, steps: 28 } },
  { id: 'wf-bg-replace', type: 'workflow', title: 'Replace Background', desc: 'Preserve the subject while swapping the backdrop', img: 'https://images.unsplash.com/photo-1433838552652-f9a46b332c40?auto=format&fit=crop&w=400&q=60', params: { strength: 0.55, scale: 1.0, steps: 18 } },
  { id: 'wf-extend', type: 'workflow', title: 'Extend Canvas', desc: 'Fill horizontal or vertical margins intelligently', img: 'https://images.unsplash.com/photo-1487412720507-e7ab37603c6f?auto=format&fit=crop&w=400&q=60', params: { strength: 0.65, scale: 1.8, steps: 22 } },
  { id: 'app-glass-mosaic', type: 'node', nodeType: NodeType.GLASS_MOSAIC, title: 'Glass Mosaic Studio', desc: 'Recreate images as customizable stained glass mosaics.', img: 'https://images.unsplash.com/photo-1471357674240-e1a485acb3e1?auto=format&fit=crop&w=400&q=60' },
];



const Canvas: React.FC = () => {

  const [nodes, setNodes] = useState<NodeData[]>(INITIAL_NODES as any);

  const [connections, setConnections] = useState<Connection[]>([]);

  const [selectedNode, setSelectedNode] = useState<string | null>(null);

  const [offset, setOffset] = useState({ x: 0, y: 0 });

  const [scale, setScale] = useState(1); // Zoom scale

  const [isPanning, setIsPanning] = useState(false);

  const [connectionStart, setConnectionStart] = useState<{ nodeId: string, type: 'input' | 'output', x: number, y: number } | null>(null);

  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });

  const lineageIndex = useRef(0);

  const [isWorkflowGalleryOpen, setIsWorkflowGalleryOpen] = useState(false);

  const [workflowGalleryPos, setWorkflowGalleryPos] = useState({ left: 0, top: 0 });

  const workflowGalleryDrag = useRef<{ x: number; y: number; left: number; top: number } | null>(null);

  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [contextMenu, setContextMenu] = useState<{ visible: boolean; screenX: number; screenY: number; spawnX: number; spawnY: number }>({
    visible: false,
    screenX: 0,
    screenY: 0,
    spawnX: 0,
    spawnY: 0
  });

  const canvasRef = useRef<HTMLDivElement | null>(null);
  const nodeLookup = React.useMemo(() => {
    const map = new Map<string, NodeData>();
    nodes.forEach((n) => map.set(n.id, n));
    return map;
  }, [nodes]);



  const addLog = (level: LogEntry['level'], message: string, nodeId?: string, nodeType?: string, details?: any) => {

    const log: LogEntry = {

      id: randomId(),

      timestamp: new Date(),

      level,

      nodeId,

      nodeType,

      message,

      details

    };

    setLogs(prev => [...prev, log]);

  };



  const clearLogs = () => {

    setLogs([]);

    addLog('info', 'Logs cleared', undefined, 'System');

  };



  const getLineageColor = () => {

    // 使用黄金角分布生成唯一色相，避免重?
    const hue = (lineageIndex.current * 137.508) % 360;

    lineageIndex.current += 1;

    return `hsl(${hue}, 70%, 50%)`;

  };

  const normalizeImageDataUrl = (raw?: string | null): string => {

      if (!raw) return '';

      const url = raw.trim();

      if (!url) return '';

      if (url.startsWith('data:') || url.startsWith('http://') || url.startsWith('https://')) {

          return url;

      }

      return `data:image/png;base64,${url}`;

  };



  const centerModal = (width: number, height: number) => {

    const left = Math.max(20, (window.innerWidth - width) / 2);

    const top = Math.max(20, (window.innerHeight - height) / 2);

    return { left, top };

  };



  // --- Zoom Logic ---

  const handleZoom = (delta: number) => {

      setScale(prev => Math.min(Math.max(0.2, prev + delta), 2.5));

  };

  

  const resetZoom = () => {

      setScale(1);

      setOffset({ x: 0, y: 0 });

  };

  React.useEffect(() => {
    const element = canvasRef.current;
    if (!element) return;

    const onWheel = (e: WheelEvent) => {
      const target = e.target as Element | null;
      if (target?.closest?.('[data-stop-canvas-zoom]')) return;

      const shouldHandleZoom = e.ctrlKey;

      if (!shouldHandleZoom) return;

      e.preventDefault();
      e.stopPropagation();

      const rect = element.getBoundingClientRect();
      const pointerX = e.clientX - rect.left;
      const pointerY = e.clientY - rect.top;
      const worldX = (pointerX - offset.x) / scale;
      const worldY = (pointerY - offset.y) / scale;

      const delta = e.deltaY > 0 ? -0.1 : 0.1;
      const nextScale = Math.min(Math.max(0.2, scale + delta), 2.5);
      if (nextScale === scale) return;

      setScale(nextScale);
      setOffset({
        x: pointerX - worldX * nextScale,
        y: pointerY - worldY * nextScale,
      });
    };

    element.addEventListener('wheel', onWheel, { passive: false });
    return () => element.removeEventListener('wheel', onWheel);
  }, [scale, offset]);



  // --- Panning Logic ---

  const handleMouseDown = (e: React.MouseEvent) => {

    if (e.button === 1 || (e.button === 0 && (e.target as HTMLElement).id === 'canvas-bg')) {

         setIsPanning(true);

    }

  };



  const handleMouseMove = (e: React.MouseEvent) => {

    setMousePos({ x: e.clientX, y: e.clientY });

    if (isPanning) {

      setOffset(prev => ({ x: prev.x + e.movementX, y: prev.y + e.movementY }));

    }

  };



  const handleMouseUp = () => {

    setIsPanning(false);

    setConnectionStart(null);

  };



  // --- Node Management ---

  const updateNodeData = (id: string, newData: any) => {

    setNodes(prev => prev.map(n => n.id === id ? { ...n, data: { ...n.data, ...newData } } : n));

  };



  const handleMoveNode = (id: string, x: number, y: number) => {

    setNodes(prev => prev.map(n => n.id === id ? { ...n, position: { x, y } } : n));

  };



  const handleDeleteNode = (id: string) => {

      const node = nodes.find(n => n.id === id);

      setNodes(prev => prev.filter(n => n.id !== id));

      setConnections(prev => prev.filter(c => c.sourceId !== id && c.targetId !== id));

      setSelectedNode(prev => prev === id ? null : prev);

      if (node) {

        addLog('info', `Node deleted: ${node.type}`, id, node.type);
        if (node.type === NodeType.IMAGE_INPUT) {
          void deleteNodeImages(id);
        }

      }

  };



  const handleResizeNode = (id: string, width: number, height: number) => {

      setNodes(prev => prev.map(n => n.id === id ? { ...n, dimensions: { width, height } } : n));

  };



  // --- Connection Logic ---

  const handleConnectStart = (nodeId: string, handleType: 'input' | 'output', e: React.MouseEvent) => {

    e.stopPropagation();

    setConnectionStart({ nodeId, type: handleType, x: e.clientX, y: e.clientY });

  };



  const handleConnectEnd = (nodeId: string, handleType: 'input' | 'output') => {

    if (!connectionStart) return;

    if (connectionStart.nodeId === nodeId) return; // Self connection

    if (connectionStart.type === handleType) return; // Same type connection



    const sourceId = connectionStart.type === 'output' ? connectionStart.nodeId : nodeId;

    const targetId = connectionStart.type === 'input' ? connectionStart.nodeId : nodeId;



    const existingConnection = connections.find(c => c.sourceId === sourceId && c.targetId === targetId);

    if (!existingConnection) {

        const sourceNode = nodes.find(n => n.id === sourceId);

        const targetNode = nodes.find(n => n.id === targetId);

        setConnections(prev => [...prev, { id: randomId(), sourceId, targetId }]);

        addLog('info', `Connection created: ${sourceNode?.type} ?${targetNode?.type}`, undefined, 'Connection', { sourceId, targetId });

    }

    setConnectionStart(null);

  };



  const addNode = (type: NodeType, spawnPosition?: { x: number; y: number }) => {

      const id = randomId();

      // Add new node in center of view (corrected for scale)

      const centerX = (window.innerWidth / 2 - offset.x) / scale;

      const centerY = (window.innerHeight / 2 - offset.y) / scale;



      const defaultPos = { x: centerX - 160, y: centerY - 100 };
      const pos = spawnPosition ? spawnPosition : defaultPos;

      let initialData = {};
      const cloneModels = (models: Array<any>) => models.map(m => ({ ...m }));

      

      switch(type) {

          case NodeType.IMAGE_INPUT: initialData = { imageData: null }; break;

          case NodeType.PROMPT_INPUT: initialData = { text: '' }; break;

          case NodeType.PROMPTMARK: initialData = { text: '', selectedPresetId: undefined }; break;

          case NodeType.IMAGE_MODEL_SELECTOR: initialData = { models: cloneModels(AVAILABLE_IMAGE_MODELS) }; break;

          case NodeType.IMAGE_TO_IMAGE_MODEL_SELECTOR: initialData = { models: cloneModels(AVAILABLE_IMAGE_TO_IMAGE_MODELS) }; break;

          case NodeType.TEXT_MODEL_SELECTOR: initialData = { models: cloneModels(AVAILABLE_TEXT_MODELS), systemPromptId: 'default' }; break;

          case NodeType.KNOWLEDGE: initialData = { query: '', context: '' }; break;

          case NodeType.WORKFLOW: initialData = { title: '', description: '', params: { strength: 0.5, scale: 1.0, steps: 20 } }; break;

          case NodeType.GLASS_MOSAIC: initialData = { options: { ...GLASS_MOSAIC_DEFAULT_OPTIONS }, status: 'idle', processedImage: undefined }; break;

          case NodeType.RESULT_OUTPUT: initialData = { images: [], status: 'idle', sourcePrompt: '' }; break;

          case NodeType.TEXT_RESULT_OUTPUT: initialData = { text: '', model: '', status: 'idle', sourcePrompt: '' }; break;

      }



      setNodes(prev => [...prev, { id, type, position: pos, data: initialData }]);

      addLog('info', `Node created: ${type}`, id, type, { position: pos });

  };



  const spawnAppInstance = (appId: string) => {
      const app = APP_LIBRARY.find(p => p.id === appId);
      if (!app) return;

      const id = randomId();
      const centerX = (window.innerWidth / 2 - offset.x) / scale;
      const centerY = (window.innerHeight / 2 - offset.y) / scale;
      const pos = { x: centerX - 160, y: centerY - 100 };

      if (app.type === 'workflow' && app.params) {
          const initialData = { title: app.title, description: app.desc, params: app.params };
          setNodes(prev => [...prev, { id, type: NodeType.WORKFLOW, position: pos, data: initialData }]);
      } else if (app.type === 'node' && app.nodeType) {
          let initialData: any = {};
          switch(app.nodeType) {
              case NodeType.GLASS_MOSAIC:
                  initialData = { options: { ...GLASS_MOSAIC_DEFAULT_OPTIONS }, status: 'idle', processedImage: undefined };
                  break;
              default:
                  initialData = {};
          }
          setNodes(prev => [...prev, { id, type: app.nodeType!, position: pos, data: initialData }]);
      }

      setSelectedNode(id);
      setIsWorkflowGalleryOpen(false);
  };

  const openWorkflowGallery = () => {

      setWorkflowGalleryPos(centerModal(900, 620));

      setIsWorkflowGalleryOpen(true);

  };



  // --- Application Execution ---

  const findUpstreamNodes = (nodeId: string): NodeData[] => {
      const incomingConnections = connections.filter(c => c.targetId === nodeId);
      return incomingConnections
        .map(c => nodeLookup.get(c.sourceId))
        .filter(Boolean) as NodeData[];
  };

  const getPromptInputForNode = (nodeId: string) => {
      const upstreamNodes = findUpstreamNodes(nodeId);
      const promptNode =
        upstreamNodes.find(n => n.type === NodeType.PROMPT_INPUT) ||
        upstreamNodes.find(n => n.type === NodeType.PROMPTMARK);

      if (!promptNode) return { promptText: '', derivedVariants: [] as string[] };

      if (promptNode.type === NodeType.PROMPT_INPUT) {
          const promptText = (promptNode.data as PromptNodeData)?.text || '';
          const derivedVariants = (promptNode.data as PromptNodeData)?.selectedDerived || [];
          return { promptText, derivedVariants };
      }

      const promptText = (promptNode.data as PromptMarkNodeData)?.text || '';
      return { promptText, derivedVariants: [] as string[] };
  };

  const getImageInputForNode = (nodeId: string) => {
      const upstreamNodes = findUpstreamNodes(nodeId);
      const imageNode = upstreamNodes.find(n => n.type === NodeType.IMAGE_INPUT);
      return (imageNode?.data as ImageNodeData | undefined)?.imageData || null;
  };

  const getNextDownstreamImageResultY = (sourceNodeId: string, baseY: number, verticalSpacing: number): number => {
      const downstreamResultNodes = connections
        .filter(c => c.sourceId === sourceNodeId)
        .map(c => nodeLookup.get(c.targetId))
        .filter(n => n?.type === NodeType.RESULT_OUTPUT) as NodeData[];

      if (!downstreamResultNodes.length) return baseY;
      const maxY = Math.max(...downstreamResultNodes.map(n => n.position.y));
      return Math.max(baseY, maxY + verticalSpacing);
  };

  const getNextDownstreamTextResultY = (sourceNodeId: string, baseY: number, fallbackHeight: number, gap: number): number => {
      const downstreamTextNodes = connections
        .filter(c => c.sourceId === sourceNodeId)
        .map(c => nodeLookup.get(c.targetId))
        .filter(n => n?.type === NodeType.TEXT_RESULT_OUTPUT) as NodeData[];

      if (!downstreamTextNodes.length) return baseY;

      const maxBottom = Math.max(
        ...downstreamTextNodes.map(n => {
          const h = typeof n.dimensions?.height === 'number' ? n.dimensions.height : fallbackHeight;
          return n.position.y + h;
        })
      );

      return Math.max(baseY, maxBottom + gap);
  };

  const propagateGlassMosaicResult = useCallback((
      nodeId: string,
      payload: { image: string; options: GlassMosaicOptions } | null
  ) => {
      const downstreamIds = connections
        .filter(c => c.sourceId === nodeId)
        .map(c => c.targetId);

      if (!downstreamIds.length) return;

      const promptLabel = payload ? `Glass Mosaic (${payload.options.renderShape})` : 'Glass Mosaic';

      setNodes(prev => {
          let changed = false;
          const sourceNode = prev.find(n => n.id === nodeId);
          const lineageColor = sourceNode?.lineageColor || '#f97316';

          const nextNodes = prev.map(node => {
              if (node.type !== NodeType.RESULT_OUTPUT || !downstreamIds.includes(node.id)) {
                  return node;
              }

              const data = node.data as ResultNodeData;

              if (!payload) {
                  if (!data.images.length && data.status !== 'success') {
                      return node;
                  }
                  changed = true;
                  return {
                      ...node,
                      lineageColor,
                      data: {
                          ...data,
                          images: [],
                          status: 'idle',
                          sourcePrompt: promptLabel
                      }
                  };
              }

              const existing = data.images[0];
              if (existing && existing.url === payload.image && data.status === 'success') {
                  return node;
              }

              const newImage: GeneratedImage = {
                  id: randomId(),
                  url: payload.image,
                  prompt: promptLabel,
                  model: 'Glass Mosaic Studio',
                  lineageColor
              };

              changed = true;
              return {
                  ...node,
                  lineageColor,
                  data: {
                      ...data,
                      images: [newImage],
                      status: 'success',
                      sourcePrompt: promptLabel
                  }
              };
          });

          return changed ? nextNodes : prev;
      });
  }, [connections, setNodes]);



  const executeWorkflow = async (modelNodeId: string) => {

      const modelNode = nodes.find(n => n.id === modelNodeId);

      if (!modelNode) return;



      const isTextModel = modelNode.type === NodeType.TEXT_MODEL_SELECTOR;

      const upstreamNodes = findUpstreamNodes(modelNodeId);

      const imageNode = upstreamNodes.find(n => n.type === NodeType.IMAGE_INPUT);



      const imageData = (imageNode?.data as ImageNodeData)?.imageData;
      const { promptText, derivedVariants } = getPromptInputForNode(modelNodeId);

      const promptVariantsBase = derivedVariants.length ? derivedVariants : (promptText ? [promptText] : []);

      const promptVariants = promptVariantsBase.length ? promptVariantsBase : (imageData ? [''] : []);

      const selectedModels = (modelNode.data as ImageModelNodeData | TextModelNodeData).models.filter(m => m.selected).map(m => m.id);



      addLog('info', `应用执行开始`, modelNodeId, modelNode.type, { 

        isTextModel, 

        selectedModels, 

        hasPrompt: !!promptText, 

        hasImage: !!imageData 

      });



      if (isTextModel && !promptText) {

          addLog('error', 'Text model requires prompt input', modelNodeId, modelNode.type);

          alert("Text models require a connected prompt node.");

          return;

      }

      if (!isTextModel && !promptVariants.length && !imageData) {

          addLog('error', 'Image model requires prompt or image input', modelNodeId, modelNode.type);

          alert("Please connect at least one prompt or image to the model node.");

          return;

      }

      if (!selectedModels.length) {

          addLog('error', 'No models selected', modelNodeId, modelNode.type);

          alert("Please select at least one model before generating.");

          return;

      }

      updateNodeData(modelNodeId, { isGenerating: true });



      try {

          const newResultNodes: NodeData[] = [];

          const newConnections: Connection[] = [];

          const modelWidth = modelNode.dimensions?.width || 320;
          const baseX = modelNode.position.x + modelWidth + 120;
          const baseY = modelNode.position.y;
          const textVerticalSpacing = 240;
          const imageVerticalSpacing = 760;
          const resultWidth = 320;
          const horizontalSpacing = resultWidth + 60;



          if (isTextModel) {

              // Text model workflow
              addLog('info', `Calling text models: ${selectedModels.join(', ')}`, modelNodeId, modelNode.type, { prompt: promptText.slice(0, 100) });

              

              const modelConfigs = (modelNode.data as TextModelNodeData).models
                .filter(m => m.selected)
                .map(m => ({ id: m.id }));

              const systemPrompt = await resolveSystemPromptText(
                (modelNode.data as TextModelNodeData).systemPromptId
              );

              const textResultWidth = 500;
              const textResultHeight = 360;
              const textHorizontalSpacing = textResultWidth + 60;
              const batchBaseY = getNextDownstreamTextResultY(modelNodeId, baseY, textResultHeight, 80);
              const columnsPerRow = Math.max(1, modelConfigs.length);

              const streamTasks = modelConfigs.map((cfg, idx) => {
                  const col = idx % columnsPerRow;
                  const row = Math.floor(idx / columnsPerRow);
                  const lineageColor = getLineageColor();
                  const resultNodeId = crypto.randomUUID();

                  newResultNodes.push({
                      id: resultNodeId,
                      type: NodeType.TEXT_RESULT_OUTPUT,
                      position: {
                        x: baseX + col * textHorizontalSpacing,
                        y: batchBaseY + row * (textResultHeight + 60)
                      },
                      dimensions: { width: textResultWidth, height: textResultHeight },
                      lineageColor,
                      data: {
                          text: '',
                          model: cfg.id,
                          status: 'loading',
                          sourcePrompt: promptText,
                          error: undefined
                      }
                  });

                  newConnections.push({
                      id: crypto.randomUUID(),
                      sourceId: modelNodeId,
                      targetId: resultNodeId,
                      color: lineageColor
                  });

                  return { cfg, resultNodeId };
              });

              setNodes(prev => [...prev, ...newResultNodes]);
              setConnections(prev => [...prev, ...newConnections]);

              if (typeof requestAnimationFrame !== 'undefined') {
                await new Promise<void>(resolve => requestAnimationFrame(() => resolve()));
              }

              await Promise.all(streamTasks.map(async ({ cfg, resultNodeId }) => {
                try {
                  addLog('info', `Streaming text from ${cfg.id}`, resultNodeId, 'TEXT_RESULT_OUTPUT');

                  let lastUpdateAt = 0;
                  const text = await chatCompletionsStream(
                    cfg.id,
                    [{ role: 'user', content: promptText }],
                    undefined,
                    undefined,
                    systemPrompt,
                    (fullText) => {
                      const now = Date.now();
                      if (now - lastUpdateAt < 60) return;
                      lastUpdateAt = now;
                      updateNodeData(resultNodeId, { text: fullText, status: 'loading' });
                    }
                  );

                  updateNodeData(resultNodeId, { text, status: 'success', error: undefined });
                  addLog('success', `Text generated successfully by ${cfg.id}`, resultNodeId, 'TEXT_RESULT_OUTPUT', { textLength: text.length });
                } catch (error) {
                  const message = error instanceof Error ? error.message : 'Unknown error';
                  updateNodeData(resultNodeId, { status: 'error', error: message });
                  addLog('error', `Text generation failed for ${cfg.id}`, resultNodeId, 'TEXT_RESULT_OUTPUT', { error: message });
                }
              }));

              addLog('success', `Workflow completed: ${streamTasks.length} result(s) generated`, modelNodeId, modelNode.type);
              return;

          } else {

              // Image model workflow

              addLog('info', `Calling image models: ${selectedModels.join(', ')}`, modelNodeId, modelNode.type, { variants: promptVariants.length });

              // Collect selected image model configs (id + optional system prompt)
              const imageModelConfigs = (modelNode.data as ImageModelNodeData).models
                .filter(m => m.selected)
                .map(m => ({ id: m.id, systemPrompt: m.systemPrompt }));

              const batchBaseY = getNextDownstreamImageResultY(modelNodeId, baseY, imageVerticalSpacing);

              for (let vi = 0; vi < promptVariants.length; vi++) {

                  const variant = promptVariants[vi];

                  addLog('info', `Generating images for variant ${vi + 1}/${promptVariants.length}`, modelNodeId, modelNode.type, { variant: variant.slice(0, 50) });

                  const generateImages = USE_REAL_IMAGE_API ? generateImagesReal : generateImagesMock;

                  try {

                    const generated = await generateImages(variant, imageModelConfigs, imageData);

                    if (!generated.length) {
                        addLog('warning', `No images returned for variant ${vi + 1}`, modelNodeId, modelNode.type);
                        continue;
                    }

                    generated.forEach((img, modelIdx) => {
                        const lineageColor = getLineageColor();
                        const enrichedImage: GeneratedImage = { ...img, url: normalizeImageDataUrl(img.url), lineageColor };
                        const resultNodeId = randomId();

                        addLog('success', `Image generated successfully by ${img.model}`, resultNodeId, 'RESULT_OUTPUT');

                        newResultNodes.push({
                            id: resultNodeId,
                            type: NodeType.RESULT_OUTPUT,
                        position: { 
                              x: baseX + modelIdx * horizontalSpacing, 
                              y: batchBaseY + vi * imageVerticalSpacing 
                            },
                            lineageColor,
                            data: { 
                                images: [enrichedImage], 
                                status: 'success', 
                                sourcePrompt: enrichedImage.prompt || variant || promptText 
                            }
                        });

                        newConnections.push({
                            id: randomId(),
                            sourceId: modelNodeId,
                            targetId: resultNodeId,
                            color: lineageColor
                        });
                    });

                  } catch (error) {

                    addLog('error', `Image generation failed for variant ${vi + 1}`, modelNodeId, modelNode.type, { error: error instanceof Error ? error.message : 'Unknown error' });

                  }

              }

          }



          if (newResultNodes.length) {

              setNodes(prev => [...prev, ...newResultNodes]);

              setConnections(prev => [...prev, ...newConnections]);

              addLog('success', `Workflow completed: ${newResultNodes.length} result(s) generated`, modelNodeId, modelNode.type);

          } else {

              addLog('warning', 'Workflow completed but no results generated', modelNodeId, modelNode.type);

          }

      } catch (error) {

           console.error(error);

           addLog('error', `应用执行失败: ${error instanceof Error ? error.message : 'Unknown error'}`, modelNodeId, modelNode.type, { error });

      } finally {

          updateNodeData(modelNodeId, { isGenerating: false });

      }

  };

  const executeImageToImage = async (modelNodeId: string) => {

      const modelNode = nodes.find(n => n.id === modelNodeId);

      if (!modelNode || modelNode.type !== NodeType.IMAGE_TO_IMAGE_MODEL_SELECTOR) return;



      const upstreamNodes = findUpstreamNodes(modelNodeId);

      const imageNode = upstreamNodes.find(n => n.type === NodeType.IMAGE_INPUT);



      const imageData = (imageNode?.data as ImageNodeData)?.imageData;

      const { promptText } = getPromptInputForNode(modelNodeId);

      const selectedModels = (modelNode.data as ImageToImageModelNodeData).models
        .filter(m => m.selected)
        .map(m => ({ id: m.id, systemPrompt: m.systemPrompt }));



      addLog('info', `图生图开始`, modelNodeId, modelNode.type, {

        selectedModels: selectedModels.map(m => m.id),

        hasPrompt: !!promptText,

        hasImage: !!imageData

      });



      if (!promptText || !imageData) {

          addLog('error', 'Image-to-image requires prompt and image input', modelNodeId, modelNode.type);

          alert("Please connect both a prompt and an image to the Image-to-Image node.");

          return;

      }

      if (!selectedModels.length) {

          addLog('error', 'No models selected', modelNodeId, modelNode.type);

          alert("Please select at least one model before generating.");

          return;

      }

      const seedreamSelected = selectedModels.some(m => m.id === 'doubao-seedream-4-0-250828');
      const previewImage = Array.isArray(imageData) ? (imageData[0] || '') : imageData;
      const trimmedImage = (previewImage || '').trim();
      if (seedreamSelected && trimmedImage && !/^https?:\/\//i.test(trimmedImage) && !/^data:image\/[a-z0-9.+-]+;base64,/i.test(trimmedImage)) {
          addLog('error', 'Seedream img2img requires an image URL or base64 data URL', modelNodeId, modelNode.type, {
            selectedModels: selectedModels.map(m => m.id),
            imagePreview: trimmedImage.slice(0, 32)
          });
          alert('即梦4.0 图生图仅支持图片 URL（http/https）或 Base64 DataURL（data:image/<format>;base64,...）。');
          return;
      }



      updateNodeData(modelNodeId, { isGenerating: true });



      try {

          const generateImages = USE_REAL_IMAGE_API ? generateImagesReal : generateImagesMock;

          const generated = await generateImages(promptText, selectedModels, imageData);



          if (!generated.length) {

              addLog('warning', 'No images returned', modelNodeId, modelNode.type);

              return;

          }

          const modelWidth = modelNode.dimensions?.width || 320;

          const baseX = modelNode.position.x + modelWidth + 120;

          const baseY = modelNode.position.y;

          const verticalSpacing = 760;
          const resultWidth = 320;
          const horizontalSpacing = resultWidth + 60;

          const batchBaseY = getNextDownstreamImageResultY(modelNodeId, baseY, verticalSpacing);

          const newResultNodes: NodeData[] = [];
          const newConnections: Connection[] = [];

          generated.forEach((img, modelIdx) => {
              const lineageColor = getLineageColor();
              const enrichedImage: GeneratedImage = { ...img, url: normalizeImageDataUrl(img.url), lineageColor };
              const resultNodeId = randomId();

              newResultNodes.push({
                  id: resultNodeId,
                  type: NodeType.RESULT_OUTPUT,
                  position: {
                      x: baseX + modelIdx * horizontalSpacing,
                      y: batchBaseY
                  },
                  lineageColor,
                  data: { images: [enrichedImage], status: 'success', sourcePrompt: enrichedImage.prompt || promptText }
              });

              newConnections.push({
                  id: randomId(),
                  sourceId: modelNodeId,
                  targetId: resultNodeId,
                  color: lineageColor
              });
          });

          setNodes(prev => [...prev, ...newResultNodes]);
          setConnections(prev => [...prev, ...newConnections]);

          addLog('success', `图生图完成: ${newResultNodes.length} 张`, modelNodeId, modelNode.type);

      } catch (error) {

          console.error(error);

          addLog('error', `图生图失败: ${error instanceof Error ? error.message : 'Unknown error'}`, modelNodeId, modelNode.type, { error });

      } finally {

          updateNodeData(modelNodeId, { isGenerating: false });

      }

  };



  // --- Logic to Spawn a NEW Node for Fixes ---

  const handleSpawnNextNode = async (

      sourceImage: GeneratedImage, 

      instructions: string[], 

      type: 'fix' | 'precise' | 'contrast',

      mask?: string,

      refImage?: string,

      refMask?: string

  ) => {

        // Find current node containing this image to calculate position

        const sourceNode = nodes.find(n => 

            n.type === NodeType.RESULT_OUTPUT && 

            (n.data as ResultNodeData).images.some(img => img.id === sourceImage.id)

        );



        if (!sourceNode) return;



        const lineageColor = sourceImage.lineageColor || getLineageColor();



        // Create new Node ID and Position

        const newNodeId = randomId();

        const newPos = { 

            x: sourceNode.position.x + (sourceNode.dimensions?.width || 320) + 100, 

            y: sourceNode.position.y 

        };



        const newResultNode: NodeData = {

            id: newNodeId,

            type: NodeType.RESULT_OUTPUT,

            position: newPos,

            lineageColor,

            data: { 

                images: [], 

                status: 'loading', 

                sourcePrompt: instructions.length > 1 ? `Multi-prompt optimization (${instructions.length})` : instructions[0] 

            }

        };



        // Highlight current node/image and append the new node with the same color

        setNodes(prev => {

            const updated = prev.map(n => {

                if (n.id === sourceNode.id) {

                    const data = n.data as ResultNodeData;

                    const updatedImages = data.images.map(img => 

                        img.id === sourceImage.id ? { ...img, lineageColor } : img

                    );

                    return { ...n, data: { ...data, images: updatedImages }, lineageColor };

                }

                return n;

            });

            return [...updated, newResultNode];

        });



        // Color the lineage edge

        setConnections(prev => [...prev, { id: randomId(), sourceId: sourceNode.id, targetId: newNodeId, color: lineageColor }]);



        // Execute processing logic

        try {

            let newImages: GeneratedImage[] = [];



            if (type === 'fix') {

                 const generateImages = USE_REAL_IMAGE_API ? generateImagesReal : generateImagesMock;
                 const inputImage = sourceImage.url ? normalizeImageDataUrl(sourceImage.url) : null;
                 const prompts = instructions.length ? instructions : [sourceImage.prompt || ''];
                 const safePrompts = prompts.filter((text) => typeof text === 'string' && text.trim().length);
                 const promptsToUse = safePrompts.length ? safePrompts : prompts;

                 for (const prompt of promptsToUse) {

                     const imgs = await generateImages(prompt, [{ id: sourceImage.model }], inputImage);

                     newImages.push(...imgs.map(img => ({
                        ...img,
                        url: normalizeImageDataUrl(img.url),
                        originalRef: sourceImage.id
                     })));

                 }

            } else {

                // Precise or Contrast - Edit existing image (Usually single instruction)

                const prompt = instructions[0];
                const normalizedSourceImage = normalizeImageDataUrl(sourceImage.url);
                const normalizedMask = mask ? normalizeImageDataUrl(mask) : undefined;
                const normalizedRefImage = refImage ? normalizeImageDataUrl(refImage) : undefined;
                const normalizedRefMask = refMask ? normalizeImageDataUrl(refMask) : undefined;

                let resultUrl: string | null = null;

                if (USE_REAL_IMAGE_API) {
                    if (sourceImage.model === SEEDREAM_MODEL_ID) {
                        resultUrl = await editImageWithSeedream({
                            originalImage: normalizedSourceImage,
                            prompt,
                            maskImage: normalizedMask,
                            referenceImage: normalizedRefImage,
                            referenceMask: normalizedRefMask,
                            mode: type === 'contrast' ? 'remix' : 'inpaint'
                        });
                    } else {
                        resultUrl = await editImageWithGeminiFlash(
                            normalizedSourceImage,
                            normalizedMask || '',
                            prompt,
                            normalizedRefImage,
                            sourceImage.model
                        );
                    }
                } else {
                    resultUrl = await editImage(
                        normalizedSourceImage,
                        normalizedMask || '',
                        prompt,
                        normalizedRefImage,
                        sourceImage.model
                    );
                }

                if (resultUrl) {

                    newImages = [{

                         id: randomId(),

                         url: normalizeImageDataUrl(resultUrl),

                         prompt: prompt,

                         model: sourceImage.model,

                         lineageColor,

                         originalRef: sourceImage.id

                     }];

                 }

            }



            const coloredImages = newImages.map(img => ({ ...img, lineageColor }));

            if (!coloredImages.length) {

                updateNodeData(newNodeId, { status: 'error', images: [] });

                return;

            }



            const [firstImage, ...restImages] = coloredImages;

            updateNodeData(newNodeId, { status: 'success', images: [firstImage] });



            if (restImages.length) {

                const extraNodes: NodeData[] = [];

                const extraConnections: Connection[] = [];

                const verticalSpacing = 220;



                restImages.forEach((img, idx) => {

                    const extraId = randomId();

                    const pos = { x: newPos.x, y: newPos.y + (idx + 1) * verticalSpacing };



                    extraNodes.push({

                        id: extraId,

                        type: NodeType.RESULT_OUTPUT,

                        position: pos,

                        lineageColor,

                        data: { images: [img], status: 'success', sourcePrompt: img.prompt }

                    });



                    extraConnections.push({

                        id: randomId(),

                        sourceId: sourceNode.id,

                        targetId: extraId,

                        color: lineageColor

                    });

                });



                if (extraNodes.length) {

                    setNodes(prev => [...prev, ...extraNodes]);

                    setConnections(prev => [...prev, ...extraConnections]);

                }

            }



        } catch (e) {

            console.error(e);

            updateNodeData(newNodeId, { status: 'error' });

        }

  };



  // --- Rendering Helpers ---

  

  const getHandlePosition = (node: NodeData, type: 'input' | 'output') => {

      const w = node.dimensions?.width || 320;

      const x = type === 'input' ? node.position.x : node.position.x + w;

      const y = node.position.y + 40; // Fixed offset from top

      return { x, y };

  };



  const renderConnections = () => {

    return connections.map(conn => {

        const source = nodeLookup.get(conn.sourceId);

        const target = nodeLookup.get(conn.targetId);

        if (!source || !target) return null;



        const sourcePos = getHandlePosition(source, 'output');

        const targetPos = getHandlePosition(target, 'input');



        const delta = Math.abs(targetPos.x - sourcePos.x) * 0.5;

        const path = `M ${sourcePos.x} ${sourcePos.y} C ${sourcePos.x + delta} ${sourcePos.y}, ${targetPos.x - delta} ${targetPos.y}, ${targetPos.x} ${targetPos.y}`;

        const color = conn.color || '#64748b';



        return (

            <path 

                key={conn.id} 

                d={path} 

                stroke={color} 

                strokeWidth="3" 

                fill="none" 

            />

        );

    });

  };



  const renderTempConnection = () => {

      if (!connectionStart) return null;

      const startNode = nodeLookup.get(connectionStart.nodeId);

      if(!startNode) return null;



      const startPos = getHandlePosition(startNode, connectionStart.type);

      

      // Calculate mouse pos relative to canvas scale/offset

      const mx = (mousePos.x - offset.x) / scale;

      const my = (mousePos.y - offset.y) / scale;



      return (

          <line x1={startPos.x} y1={startPos.y} x2={mx} y2={my} stroke="#a855f7" strokeWidth="2" strokeDasharray="5,5" />

      );

  }



  const canModelGenerate = (nodeId: string) => {

      const inputs = findUpstreamNodes(nodeId);

      const hasPrompt = inputs.some(n => n.type === NodeType.PROMPT_INPUT || n.type === NodeType.PROMPTMARK);

      const hasImage = inputs.some(n => n.type === NodeType.IMAGE_INPUT);

      return hasPrompt || hasImage;

  };

  const canImageToImageGenerate = (nodeId: string) => {

      const inputs = findUpstreamNodes(nodeId);

      const hasPrompt = inputs.some(n => n.type === NodeType.PROMPT_INPUT || n.type === NodeType.PROMPTMARK);

      const hasImage = inputs.some(n => n.type === NodeType.IMAGE_INPUT);

      return hasPrompt && hasImage;

  };



  // Workflow gallery drag

  React.useEffect(() => {

    const move = (e: MouseEvent) => {

      if (!workflowGalleryDrag.current) return;

      const dx = e.clientX - workflowGalleryDrag.current.x;

      const dy = e.clientY - workflowGalleryDrag.current.y;

      const left = Math.min(Math.max(workflowGalleryDrag.current.left + dx, 10), window.innerWidth - 920);

      const top = Math.min(Math.max(workflowGalleryDrag.current.top + dy, 10), window.innerHeight - 680);

      setWorkflowGalleryPos({ left, top });

    };

    const up = () => { workflowGalleryDrag.current = null; };

    window.addEventListener('mousemove', move);

    window.addEventListener('mouseup', up);

    return () => {

      window.removeEventListener('mousemove', move);

      window.removeEventListener('mouseup', up);

    };

  }, []);

  React.useEffect(() => {
    const closeMenu = () => {
        setContextMenu(prev => prev.visible ? { ...prev, visible: false } : prev);
    };
    window.addEventListener('click', closeMenu);
    return () => window.removeEventListener('click', closeMenu);
  }, []);



  return (

    <div className="w-screen h-screen overflow-hidden bg-white relative text-black font-sans">

      {/* Toolbar */}

      <div className="absolute top-6 left-1/2 -translate-x-1/2 z-50 flex gap-3">

        <div className="bg-white/60 backdrop-blur-md border border-gray-300 px-4 py-2 rounded-full shadow-lg flex gap-3 items-center text-xs text-gray-700">
            <span>右键画布以添加节点</span>
            <div className="w-px h-4 bg-gray-300"></div>
            <button onClick={openWorkflowGallery} className="px-3 py-1.5 hover:bg-gray-200 rounded-full text-gray-800 hover:text-black flex items-center gap-2 text-xs font-medium transition-all active:scale-95">
                <Plus size={14} /> App
            </button>
        </div>



        <div className="bg-white/60 backdrop-blur-md border border-gray-300 p-1.5 rounded-full shadow-lg flex gap-1 items-center">

             <button onClick={() => handleZoom(-0.1)} className="p-2 hover:bg-gray-200 rounded-full text-gray-800 hover:text-black transition-all active:scale-95" title="缩小">

                <ZoomOut size={16} />

             </button>

             <span className="text-xs text-gray-600 w-10 text-center font-medium">{Math.round(scale * 100)}%</span>

             <button onClick={() => handleZoom(0.1)} className="p-2 hover:bg-gray-200 rounded-full text-gray-800 hover:text-black transition-all active:scale-95" title="放大">

                <ZoomIn size={16} />

             </button>

             <button onClick={resetZoom} className="p-2 hover:bg-gray-200 rounded-full text-gray-800 hover:text-black transition-all active:scale-95" title="重置视角">

                <Maximize size={16} />

             </button>

        </div>

      </div>



      <div className="absolute bottom-6 right-6 z-50 text-gray-400 text-[10px] font-medium tracking-widest pointer-events-none select-none opacity-50">

         GEMINIFLOW CANVAS 1.2

      </div>



      {/* Workspace */}

      <div 

        id="canvas-bg"
        ref={canvasRef}

        className="w-full h-full cursor-move overflow-hidden"

        onMouseDown={handleMouseDown}

        onMouseMove={handleMouseMove}

        onMouseUp={handleMouseUp}
        onContextMenu={(e) => {
            e.preventDefault();
            const screenX = e.clientX;
            const screenY = e.clientY;
            const spawnX = (e.clientX - offset.x) / scale - 160;
            const spawnY = (e.clientY - offset.y) / scale - 100;
            setContextMenu({ visible: true, screenX, screenY, spawnX, spawnY });
        }}

        style={{

            backgroundImage: 'radial-gradient(#e5e7eb 1px, transparent 1px)', // Light gray dots

            backgroundSize: `${24 * scale}px ${24 * scale}px`, // Scale grid

            backgroundPosition: `${offset.x}px ${offset.y}px`,

            opacity: 1 // No opacity on light background

        }}

      >

        <div 

            style={{ 

                transform: `translate(${offset.x}px, ${offset.y}px) scale(${scale})`, 

                transformOrigin: '0 0',

                width: '100%', 

                height: '100%', 

                position: 'absolute', 

                pointerEvents: 'none' 

            }}

        >

            <svg className="w-full h-full overflow-visible pointer-events-none absolute top-0 left-0">

                {renderConnections()}

                {renderTempConnection()}

            </svg>



            {/* Nodes Layer */}

            <div className="pointer-events-auto">

                {nodes.map(node => (

                    <Node

                        key={node.id}

                        node={node}

                        isSelected={selectedNode === node.id}

                        canvasOffset={offset}

                        scale={scale} // Pass scale for calc

                        onSelect={setSelectedNode}

                        onMove={handleMoveNode}

                        onResize={handleResizeNode}

                        onConnectStart={handleConnectStart}

                        onConnectEnd={handleConnectEnd}

                        onDelete={handleDeleteNode}

                    >

                        {node.type === NodeType.IMAGE_INPUT && (
                            <ImageNode 
                                nodeId={node.id}
                                data={node.data as ImageNodeData} 
                                updateData={(d) => updateNodeData(node.id, d)} 
                            />
                        )}

                        {node.type === NodeType.PROMPT_INPUT && (

                            <PromptNode 

                                data={node.data as PromptNodeData} 

                                updateData={(d) => updateNodeData(node.id, d)} 

                            />

                        )}

                        {node.type === NodeType.PROMPTMARK && (

                            <PromptMarkNode

                                data={node.data as PromptMarkNodeData}

                                updateData={(d) => updateNodeData(node.id, d)}

                            />

                        )}

                        {node.type === NodeType.IMAGE_MODEL_SELECTOR && (

                            <ImageModelNode 

                                data={node.data as ImageModelNodeData} 

                                updateData={(d) => updateNodeData(node.id, d)}

                                onGenerate={() => executeWorkflow(node.id)}

                                canGenerate={

                                    canModelGenerate(node.id) &&

                                    (node.data as ImageModelNodeData).models.some(m => m.selected)

                                }

                                isGenerating={(node.data as any).isGenerating}

                            />

                        )}

                        {node.type === NodeType.IMAGE_TO_IMAGE_MODEL_SELECTOR && (

                            <ImageToImageModelNode

                                data={node.data as ImageToImageModelNodeData}

                                updateData={(d) => updateNodeData(node.id, d)}

                                onGenerate={() => executeImageToImage(node.id)}

                                canGenerate={

                                    canImageToImageGenerate(node.id) &&

                                    (node.data as ImageToImageModelNodeData).models.some(m => m.selected)

                                }

                                isGenerating={(node.data as any).isGenerating}

                            />

                        )}

                        {node.type === NodeType.TEXT_MODEL_SELECTOR && (

                            <TextModelNode 

                                data={node.data as TextModelNodeData} 

                                updateData={(d) => updateNodeData(node.id, d)}

                                onGenerate={() => executeWorkflow(node.id)}

                                canGenerate={

                                    canModelGenerate(node.id) &&

                                    (node.data as TextModelNodeData).models.some(m => m.selected)

                                }

                                isGenerating={(node.data as any).isGenerating}

                            />

                        )}

                        {node.type === NodeType.RESULT_OUTPUT && (

                            <ResultNode 

                                data={node.data as ResultNodeData} 

                                updateData={(d) => updateNodeData(node.id, d)} 

                                onSpawnNextNode={handleSpawnNextNode}

                            />

                        )}

                        {node.type === NodeType.TEXT_RESULT_OUTPUT && (

                            <TextResultNode 

                                data={node.data as TextResultNodeData} 

                                updateData={(d) => updateNodeData(node.id, d)}

                            />

                        )}

                        {node.type === NodeType.KNOWLEDGE && (

                            <KnowledgeNode 

                                data={node.data as KnowledgeNodeData}

                                updateData={(d) => updateNodeData(node.id, d)}

                            />

                        )}

                        {node.type === NodeType.WORKFLOW && (

                            <WorkflowNode 

                                data={node.data as WorkflowNodeData}

                                updateData={(d) => updateNodeData(node.id, d)}

                            />

                        )}

                        {node.type === NodeType.GLASS_MOSAIC && (

                            <GlassMosaicNode

                                data={node.data as GlassMosaicNodeData}

                                updateData={(d) => updateNodeData(node.id, d)}

                                sourceImage={getImageInputForNode(node.id)}

                                onResult={(payload) => propagateGlassMosaicResult(node.id, payload)}

                            />

                        )}

                    </Node>

                ))}

            </div>

        </div>

      </div>

      {isWorkflowGalleryOpen && createPortal(

        <div className="fixed inset-0 z-50" data-stop-canvas-zoom="true" onWheelCapture={(e) => e.stopPropagation()}>

          <div className="absolute inset-0 bg-black/50" onClick={() => setIsWorkflowGalleryOpen(false)} />

          <div 

            className="absolute border border-gray-300 rounded-3xl w-[900px] max-h-[80vh] shadow-lg overflow-hidden backdrop-blur-2xl"

            style={{ 

                left: workflowGalleryPos.left, 

                top: workflowGalleryPos.top,

                background: 'linear-gradient(to bottom, rgba(31, 41, 55, 0.98), rgba(17, 24, 39, 0.98))'

            }}

            onMouseDown={(e) => e.stopPropagation()}
            onWheelCapture={(e) => e.stopPropagation()}

          >

            <div 

              className="flex items-center justify-between px-6 py-4 border-b border-gray-700 cursor-move bg-black/10"

              onMouseDown={(e) => {

                e.preventDefault();

                workflowGalleryDrag.current = { x: e.clientX, y: e.clientY, left: workflowGalleryPos.left, top: workflowGalleryPos.top };

              }}

            >

              <div className="text-lg font-semibold text-white flex items-center gap-2">

                  <div className="w-2 h-6 bg-purple-500 rounded-full"></div>

                  选择应用模板

              </div>

              <button onClick={() => setIsWorkflowGalleryOpen(false)} className="w-8 h-8 flex items-center justify-center rounded-full bg-black/20 hover:bg-black/40 text-gray-400 hover:text-white transition">

                  <span className="text-lg">×</span>

              </button>

            </div>

            <div className="p-6 grid grid-cols-3 gap-5 overflow-y-auto max-h-[70vh] custom-scrollbar">

              {APP_LIBRARY.map(app => (
                <button
                  key={app.id}
                  onClick={() => spawnAppInstance(app.id)}
                  className="rounded-2xl border border-gray-800 bg-gray-950 hover:bg-black/80 hover:border-blue-500/30 transition text-left overflow-hidden group"
                >
                  <div className="h-36 w-full bg-cover bg-center group-hover:scale-105 transition duration-500" style={{ backgroundImage: `url(${app.img})` }} />
                  <div className="p-4 space-y-1 text-sm text-gray-300">
                    <div className="font-semibold text-white group-hover:text-blue-300 transition flex items-center justify-between">
                      <span>{app.title}</span>
                      <span className="text-[10px] uppercase tracking-wider text-gray-500">{app.type === 'workflow' ? 'Workflow' : 'Node'}</span>
                    </div>
                    <div className="text-gray-400 text-xs leading-relaxed">{app.desc}</div>
                    <div className="pt-2 text-gray-500 text-[10px] uppercase tracking-wider font-medium">
                      {app.type === 'workflow' && app.params
                        ? <>强度 {app.params.strength} · 扩展 {app.params.scale}x · 步数 {app.params.steps}</>
                        : '连接 Image Input → Result 输出预览'}
                    </div>
                  </div>
                </button>
              ))}

            </div>

          </div>

        </div>,

        document.body

      )}

      

      {/* Log Console */}

      <LogConsole logs={logs} onClear={clearLogs} />

      {contextMenu.visible && (
        <div
          className="fixed z-50 min-w-[220px] bg-white/70 backdrop-blur-md border border-gray-300 rounded-2xl shadow-2xl text-sm text-gray-800 overflow-hidden flex flex-col"
          style={{ left: contextMenu.screenX, top: contextMenu.screenY }}
          onClick={(e) => e.stopPropagation()}
          onWheelCapture={(e) => e.stopPropagation()}
          data-stop-canvas-zoom="true"
        >
          <button className="w-full text-left px-4 py-2 hover:bg-white/80 transition" onClick={() => { addNode(NodeType.IMAGE_INPUT, { x: contextMenu.spawnX, y: contextMenu.spawnY }); setContextMenu(prev => ({ ...prev, visible: false })); }}>+ Image Input</button>
          <button className="w-full text-left px-4 py-2 hover:bg-white/80 transition" onClick={() => { addNode(NodeType.PROMPT_INPUT, { x: contextMenu.spawnX, y: contextMenu.spawnY }); setContextMenu(prev => ({ ...prev, visible: false })); }}>+ Prompt Input</button>
          <button className="w-full text-left px-4 py-2 hover:bg-white/80 transition" onClick={() => { addNode(NodeType.PROMPTMARK, { x: contextMenu.spawnX, y: contextMenu.spawnY }); setContextMenu(prev => ({ ...prev, visible: false })); }}>+ Promptmark</button>
          <button className="w-full text-left px-4 py-2 hover:bg-white/80 transition" onClick={() => { addNode(NodeType.IMAGE_MODEL_SELECTOR, { x: contextMenu.spawnX, y: contextMenu.spawnY }); setContextMenu(prev => ({ ...prev, visible: false })); }}>+ Image Models</button>
          <button className="w-full text-left px-4 py-2 hover:bg-white/80 transition" onClick={() => { addNode(NodeType.IMAGE_TO_IMAGE_MODEL_SELECTOR, { x: contextMenu.spawnX, y: contextMenu.spawnY }); setContextMenu(prev => ({ ...prev, visible: false })); }}>+ Image-to-Image</button>
          <button className="w-full text-left px-4 py-2 hover:bg-white/80 transition" onClick={() => { addNode(NodeType.TEXT_MODEL_SELECTOR, { x: contextMenu.spawnX, y: contextMenu.spawnY }); setContextMenu(prev => ({ ...prev, visible: false })); }}>+ Text Models</button>
          <button className="w-full text-left px-4 py-2 hover:bg-white/80 transition" onClick={() => { addNode(NodeType.KNOWLEDGE, { x: contextMenu.spawnX, y: contextMenu.spawnY }); setContextMenu(prev => ({ ...prev, visible: false })); }}>+ Knowledge</button>
          <button className="w-full text-left px-4 py-2 hover:bg-white/80 transition" onClick={() => { addNode(NodeType.RESULT_OUTPUT, { x: contextMenu.spawnX, y: contextMenu.spawnY }); setContextMenu(prev => ({ ...prev, visible: false })); }}>+ Image Result</button>
          <button className="w-full text-left px-4 py-2 hover:bg-white/80 transition" onClick={() => { addNode(NodeType.TEXT_RESULT_OUTPUT, { x: contextMenu.spawnX, y: contextMenu.spawnY }); setContextMenu(prev => ({ ...prev, visible: false })); }}>+ Text Result</button>
        </div>
      )}

    </div>

  );

};



export default Canvas;

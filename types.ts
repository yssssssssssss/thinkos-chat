export enum NodeType {
  IMAGE_INPUT = 'IMAGE_INPUT',
  PROMPT_INPUT = 'PROMPT_INPUT',
  PROMPTMARK = 'PROMPTMARK',
  IMAGE_MODEL_SELECTOR = 'IMAGE_MODEL_SELECTOR',
  IMAGE_TO_IMAGE_MODEL_SELECTOR = 'IMAGE_TO_IMAGE_MODEL_SELECTOR',
  TEXT_MODEL_SELECTOR = 'TEXT_MODEL_SELECTOR',
  RESULT_OUTPUT = 'RESULT_OUTPUT',
  TEXT_RESULT_OUTPUT = 'TEXT_RESULT_OUTPUT',
  KNOWLEDGE = 'KNOWLEDGE',
  WORKFLOW = 'WORKFLOW',
  GLASS_MOSAIC = 'GLASS_MOSAIC',
}

export interface Position {
  x: number;
  y: number;
}

export interface Dimensions {
  width: number;
  height: number;
}

export interface Connection {
  id: string;
  sourceId: string;
  targetId: string;
  color?: string;
}

export interface NodeData {
  id: string;
  type: NodeType;
  position: Position;
  dimensions?: Dimensions; // Added for resizing
  lineageColor?: string;
  data: any;
}

export interface AppState {
  nodes: NodeData[];
  connections: Connection[];
}

export interface GeneratedImage {
  id: string;
  url: string; // Base64 or Blob URL
  prompt: string;
  model: string;
  lineageColor?: string;
  originalRef?: string;
}

export interface ModelOption {
  id: string;
  name: string;
  selected: boolean;
  systemPrompt?: string; // 可选的模型专属 system prompt
}

// Data structures for specific node types
export interface ImageNodeData {
  imageData: string | string[] | null; // URL or base64 data URL; supports multi-image
}

export interface PromptNodeData {
  text: string;
  derivedOptions?: string[];
  selectedDerived?: string[];
}

export interface PromptMarkNodeData {
  text: string;
  selectedPresetId?: string;
}

export interface KnowledgeNodeData {
  query: string;
  context?: string;
}

export interface WorkflowNodeData {
  title: string;
  description?: string;
  params?: {
    strength: number;
    scale: number;
    steps: number;
  };
}

export interface GlassMosaicOptions {
  cellSize: number;
  glassOpacity: number;
  bevelIntensity: number;
  innerShine: number;
  gap: number;
  renderShape: 'square' | 'circle';
  sparkleIntensity: number;
}

export interface ImageModelNodeData {
  models: ModelOption[];
}

export interface ImageToImageModelNodeData {
  models: ModelOption[];
}

export interface TextModelNodeData {
  models: ModelOption[];
  systemPromptId?: string;
}

export interface ResultNodeData {
  images: GeneratedImage[];
  sourcePrompt: string;
  status: 'idle' | 'loading' | 'success' | 'error';
}

export interface TextResultNodeData {
  text: string;
  model: string;
  sourcePrompt: string;
  status: 'idle' | 'loading' | 'success' | 'error';
  error?: string;
}

export interface GlassMosaicNodeData {
  options: GlassMosaicOptions;
  processedImage?: string;
  status: 'idle' | 'processing' | 'ready' | 'error';
  error?: string;
}

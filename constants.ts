import { GlassMosaicOptions, ModelOption } from "./types";

export const AVAILABLE_IMAGE_MODELS: ModelOption[] = [
  {
    id: 'Gemini 3-Pro-Image-Preview',
    name: 'Gemini 3 Pro (High Quality)',
    selected: true,
    systemPrompt: 'Generate high-quality, detailed images with professional composition and lighting.'
  },
  {
    id: 'Gemini-2.5-flash-image-preview',
    name: 'Gemini 2.5 Flash (Fast)',
    selected: false,
    systemPrompt: 'Generate images quickly while maintaining good quality and artistic style.'
  },
  {
    id: 'doubao-seedream-4-0-250828',
    name: '即梦4.0',
    selected: false,
    systemPrompt: 'Generate creative images with Chinese prompt understanding.'
  },
];

export const AVAILABLE_IMAGE_TO_IMAGE_MODELS: ModelOption[] = [
  {
    id: 'Gemini 3-Pro-Image-Preview',
    name: 'Gemini 3 Pro (High Quality)',
    selected: true,
    systemPrompt: 'Edit the input image with high fidelity, clean composition, and realistic lighting.'
  },
  {
    id: 'Gemini-2.5-flash-image-preview',
    name: 'Gemini 2.5 Flash (Fast)',
    selected: false,
    systemPrompt: 'Edit the input image quickly while preserving the subject and style.'
  },
  {
    id: 'doubao-seedream-4-0-250828',
    name: '即梦4.0',
    selected: false,
    systemPrompt: 'Edit the input image with strong Chinese prompt understanding.'
  },
];

export const AVAILABLE_TEXT_MODELS: ModelOption[] = [
  {
    id: 'Gemini-2.5-pro',
    name: 'Gemini-2.5-pro',
    selected: true
  },
  {
    id: 'Claude-opus-4',
    name: 'Claude-opus-4',
    selected: false
  },
  {
    id: 'qwen3-vl-235',
    name: 'qwen3-vl-235',
    selected: false
  },
  {
    id: 'Kimi-K2-0905-jcloud',
    name: 'Kimi-K2-0905-jcloud',
    selected: false
  },
  {
    id: 'DeepSeek-V3.2',
    name: 'DeepSeek-V3.2',
    selected: false
  },
  {
    id: 'doubao-seed-1-6-thinking-250715',
    name: 'doubao-seed-1-6-thinking-250715',
    selected: false
  },
];

export const GLASS_MOSAIC_DEFAULT_OPTIONS: GlassMosaicOptions = {
  cellSize: 20,
  glassOpacity: 0.2,
  bevelIntensity: 0.3,
  innerShine: 0.5,
  gap: 0,
  renderShape: 'square',
  sparkleIntensity: 0.15,
};

export const INITIAL_NODES = [
  {
    id: 'node-1',
    type: 'IMAGE_INPUT',
    position: { x: 50, y: 100 },
    data: { imageData: null },
  },
  {
    id: 'node-2',
    type: 'PROMPT_INPUT',
    position: { x: 50, y: 350 },
    data: { text: "A futuristic city with flying cars, neon lights, cyberpunk style" },
  },
  {
    id: 'node-3',
    type: 'IMAGE_MODEL_SELECTOR',
    position: { x: 450, y: 200 },
    data: { models: AVAILABLE_IMAGE_MODELS },
  },
];

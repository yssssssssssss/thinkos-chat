import { GeneratedImage } from '../types';

declare const process: any;

const toJdcloudProxyUrl = (url: string): string => {
  const trimmed = (url || '').trim();
  if (!trimmed) return trimmed;
  if (trimmed.startsWith('/jdcloud/')) return trimmed;

  if (typeof window !== 'undefined' && (trimmed.startsWith('http://') || trimmed.startsWith('https://'))) {
    try {
      const u = new URL(trimmed);
      // 支持多个 JDCloud 域名的代理
      if (u.hostname === 'ai-api.jdcloud.com' || u.hostname === 'modelservice.jdcloud.com') {
        return `/jdcloud${u.pathname}${u.search}`;
      }
    } catch {
      // ignore
    }
  }

  return trimmed;
};

// 从环境变量获取 API 配置
const getApiUrl = (): string => {
  if (typeof process !== 'undefined' && process.env?.VITE_GEMINI_IMAGE_API_URL) {
    return toJdcloudProxyUrl(process.env.VITE_GEMINI_IMAGE_API_URL);
  }
  // Use Vite dev-server proxy by default to avoid browser CORS.
  return '/jdcloud/v1/images/gemini_flash/generations';
};

const getJimengApiUrl = (): string => {
  if (typeof process !== 'undefined' && process.env?.VITE_JIMENG_IMAGE_API_URL) {
    return toJdcloudProxyUrl(process.env.VITE_JIMENG_IMAGE_API_URL);
  }
  // Use Vite dev-server proxy by default to avoid browser CORS.
  return '/jdcloud/v1/imageEdit/generations';
};

const getApiKey = (): string => {
  if (typeof process !== 'undefined' && process.env?.VITE_GEMINI_API_KEY) {
    return process.env.VITE_GEMINI_API_KEY;
  }
  console.warn('[Gemini Image Service] Missing API key');
  return '';
};

const getJimengApiKey = (): string => {
  if (typeof process !== 'undefined' && process.env?.VITE_JIMENG_API_KEY) {
    return process.env.VITE_JIMENG_API_KEY;
  }
  // 如果没有单独的即梦 API Key，则使用 Gemini 的 Key
  return getApiKey();
};

// 从 base64 data URL 中提取纯 base64 数据
const extractBase64Data = (dataUrl: string): string => {
  if (dataUrl.startsWith('data:')) {
    const parts = dataUrl.split(',');
    return parts[1] || dataUrl;
  }
  return dataUrl;
};

// 从 data URL 中提取 MIME 类型
const extractMimeType = (dataUrl: string): string => {
  if (dataUrl.startsWith('data:')) {
    const match = dataUrl.match(/data:([^;]+);/);
    return match ? match[1] : 'image/png';
  }
  return 'image/png';
};

// 确保 base64 数据有正确的 data URL 前缀
const ensureDataUrl = (imageData: string, mimeType: string = 'image/png'): string => {
  const trimmed = (imageData || '').trim();
  if (!trimmed) return '';
  
  // 已经是 data URL
  if (trimmed.startsWith('data:')) {
    return trimmed;
  }
  
  // HTTP URL
  if (trimmed.startsWith('http://') || trimmed.startsWith('https://')) {
    return trimmed;
  }
  
  // 检测 base64 图像类型
  let detectedMime = mimeType;
  if (trimmed.startsWith('/9j/')) {
    detectedMime = 'image/jpeg';
  } else if (trimmed.startsWith('iVBORw0')) {
    detectedMime = 'image/png';
  } else if (trimmed.startsWith('R0lGOD')) {
    detectedMime = 'image/gif';
  } else if (trimmed.startsWith('UklGR')) {
    detectedMime = 'image/webp';
  }
  
  console.log('[ensureDataUrl] Converting base64 to data URL, detected mime:', detectedMime, 'length:', trimmed.length);
  return `data:${detectedMime};base64,${trimmed}`;
};

const isHttpUrl = (value: string): boolean => value.startsWith('http://') || value.startsWith('https://');

type ImageInput = string | string[] | null | undefined;

const safeJsonStringify = (value: unknown): string => {
  try {
    return JSON.stringify(
      value,
      (_key, v) => {
        if (typeof v === 'string' && v.length > 256) {
          return `${v.slice(0, 64)}…(len:${v.length})`;
        }
        return v;
      },
      2
    );
  } catch {
    return String(value);
  }
};

const toImageInputList = (input: ImageInput): string[] => {
  if (!input) return [];
  if (Array.isArray(input)) return input.filter(Boolean);
  return [input];
};

const detectImageMimeFromBase64 = (base64: string): string => {
  const trimmed = (base64 || '').trim();
  if (trimmed.startsWith('/9j/')) return 'jpeg';
  if (trimmed.startsWith('iVBORw0')) return 'png';
  if (trimmed.startsWith('R0lGOD')) return 'gif';
  if (trimmed.startsWith('UklGR')) return 'webp';
  return 'png';
};

const normalizeSeedreamImageValue = (value: string): string => {
  const trimmed = (value || '').trim();
  if (!trimmed) return '';

  if (isHttpUrl(trimmed)) return trimmed;

  if (/^data:image\//i.test(trimmed)) {
    const match = trimmed.match(/^data:image\/([^;]+);base64,/i);
    if (!match) return trimmed;
    const format = (match[1] || 'png').toLowerCase();
    return trimmed.replace(/^data:image\/[^;]+;base64,/i, `data:image/${format};base64,`);
  }

  const mime = detectImageMimeFromBase64(trimmed);
  return `data:image/${mime};base64,${trimmed}`;
};

type GeminiInlineData = {
  data: string;
  mimeType?: string;
  mime_type?: string;
};

type GeminiPart = {
  text?: string;
  inline_data?: GeminiInlineData;
  inlineData?: GeminiInlineData;
  file_data?: { mime_type?: string; mimeType?: string; file_uri: string };
  fileData?: { mime_type?: string; mimeType?: string; fileUri: string };
};

type GeminiContents = { role: string; parts: GeminiPart[] } | Array<{ role: string; parts: GeminiPart[] }>;

interface GeminiImageRequest {
  model: string;
  contents: GeminiContents;
  size?: string;
  generation_config?: {
    response_modalities?: string[];
  };
  stream: boolean;
}

const buildGeminiImagePart = (value: string, isJdcloud: boolean): GeminiPart | null => {
  const trimmed = (value || '').trim();
  if (!trimmed) return null;

  if (isHttpUrl(trimmed)) {
    return isJdcloud
      ? {
          file_data: {
            mime_type: 'image/png',
            file_uri: trimmed
          }
        }
      : {
          fileData: {
            mimeType: 'image/png',
            fileUri: trimmed
          }
        };
  }

  const normalized = normalizeSeedreamImageValue(trimmed);
  const base64Data = extractBase64Data(normalized);
  const mimeType = extractMimeType(normalized);
  const inline = {
    ...(isJdcloud ? { mime_type: mimeType } : { mimeType }),
    data: base64Data
  };
  return isJdcloud ? { inline_data: inline } : { inlineData: inline };
};

const extractImageFromParts = (parts?: GeminiPart[] | GeminiPart): string | null => {
  if (!parts) return null;
  const list = Array.isArray(parts) ? parts : [parts];

  console.log('[Gemini Image Service] Extracting from parts, count:', list.length);

  for (let i = 0; i < list.length; i++) {
    const part = list[i];
    if (!part) continue;

    console.log(`[Gemini Image Service] Part ${i} keys:`, Object.keys(part));
    console.log(`[Gemini Image Service] Part ${i} content:`, safeJsonStringify(part));

    const inline = part.inline_data || part.inlineData;
    if (inline?.data) {
      console.log('[Gemini Image Service] Found inline_data with data length:', inline.data.length);
      const mimeType = inline.mime_type || inline.mimeType || 'image/png';
      return ensureDataUrl(inline.data, mimeType);
    }

    const fileData = part.file_data || part.fileData;
    if (fileData) {
      const uri = (fileData as any).file_uri || (fileData as any).fileUri;
      if (typeof uri === 'string' && uri.trim()) {
        console.log('[Gemini Image Service] Found file_data URI');
        return ensureDataUrl(uri.trim());
      }
    }

    const fallbackUrl = (part as any).image_url || (part as any).imageUrl || (part as any).url;
    if (typeof fallbackUrl === 'string' && fallbackUrl.trim()) {
      console.log('[Gemini Image Service] Found fallback URL');
      return ensureDataUrl(fallbackUrl.trim());
    }
    
    // 检查是否有 text 字段（可能是文本响应而非图像）
    if ((part as any).text) {
      console.log('[Gemini Image Service] Part contains text:', (part as any).text.slice(0, 200));
    }
  }

  return null;
};

const pickFirstImageField = (source: any, keys: string[]): string | null => {
  if (!source || typeof source !== 'object') return null;
  for (const key of keys) {
    const value = source[key];
    if (typeof value === 'string' && value.trim()) {
      return ensureDataUrl(value.trim());
    }
  }
  return null;
};

const extractImageFromGeminiResponse = (data: any): string | null => {
  if (!data) return null;

  // 添加详细日志 - 打印完整响应结构（截断大数据）
  console.log('[Gemini Image Service] Extracting image from response...');
  console.log('[Gemini Image Service] Full response structure:', safeJsonStringify(data));

  // 检查 JDCloud 特有的响应格式
  if (data?.images && Array.isArray(data.images) && data.images.length > 0) {
    const firstImage = data.images[0];
    if (typeof firstImage === 'string') {
      console.log('[Gemini Image Service] Found image in images array (string)');
      return ensureDataUrl(firstImage);
    }
    if (firstImage?.b64_json || firstImage?.base64 || firstImage?.data) {
      console.log('[Gemini Image Service] Found image in images array (object)');
      return ensureDataUrl(firstImage.b64_json || firstImage.base64 || firstImage.data);
    }
  }

  if (Array.isArray(data?.data) && data.data.length > 0) {
    const first = data.data[0] || {};
    const fromData = pickFirstImageField(first, ['b64_json', 'image', 'image_base64', 'base64', 'b64', 'data', 'url']);
    if (fromData) {
      console.log('[Gemini Image Service] Found image in data array');
      return fromData;
    }
  }

  if (Array.isArray(data?.candidates)) {
    console.log('[Gemini Image Service] Checking candidates:', data.candidates.length);
    for (const candidate of data.candidates) {
      console.log('[Gemini Image Service] Candidate keys:', Object.keys(candidate || {}));
      console.log('[Gemini Image Service] Candidate content:', safeJsonStringify(candidate?.content));
      const parts = candidate?.content?.parts;
      if (parts) {
        console.log('[Gemini Image Service] Parts count:', Array.isArray(parts) ? parts.length : 1);
        const extracted = extractImageFromParts(parts);
        if (extracted) {
          console.log('[Gemini Image Service] Found image in candidates');
          return extracted;
        }
      }
      
      // 检查 candidate 直接包含图像数据的情况
      const candidateImage = pickFirstImageField(candidate, ['image', 'b64_json', 'image_base64', 'base64']);
      if (candidateImage) {
        console.log('[Gemini Image Service] Found image directly in candidate');
        return candidateImage;
      }
    }
  }

  // 检查 response 字段
  if (data?.response) {
    console.log('[Gemini Image Service] Checking response field');
    const fromResponse = extractImageFromGeminiResponse(data.response);
    if (fromResponse) return fromResponse;
  }

  // 检查 output 字段
  if (data?.output) {
    if (typeof data.output === 'string') {
      console.log('[Gemini Image Service] Found string output');
      return ensureDataUrl(data.output);
    }
    const fromOutput = pickFirstImageField(data.output, ['image', 'b64_json', 'image_base64', 'base64', 'url']);
    if (fromOutput) {
      console.log('[Gemini Image Service] Found image in output');
      return fromOutput;
    }
  }

  const fromResult = pickFirstImageField(data?.result, ['image', 'b64_json', 'image_base64']);
  if (fromResult) {
    console.log('[Gemini Image Service] Found image in result');
    return fromResult;
  }

  const fromImageField = pickFirstImageField(data, ['image', 'image_base64', 'b64_json', 'url']);
  if (fromImageField) {
    console.log('[Gemini Image Service] Found image in root');
    return fromImageField;
  }

  if (Array.isArray(data?.predictions)) {
    for (const prediction of data.predictions) {
      const direct = pickFirstImageField(prediction, ['image', 'image_base64', 'b64_json', 'url']);
      if (direct) return direct;
      const viaParts = extractImageFromParts(prediction?.content);
      if (viaParts) return viaParts;
    }
  }

  if (Array.isArray(data?.output)) {
    for (const output of data.output) {
      const direct = pickFirstImageField(output, ['image', 'image_base64', 'b64_json', 'url']);
      if (direct) return direct;
      const viaParts = extractImageFromParts(output?.content);
      if (viaParts) return viaParts;
    }
  }

  if (typeof data === 'string' && data.trim()) {
    return ensureDataUrl(data.trim());
  }

  console.log('[Gemini Image Service] No image found in any known structure');
  return null;
};


const extractJimengImageFromResponse = (data: any): string | null => {
  if (data?.data && Array.isArray(data.data) && data.data.length > 0) {
    const imageData = data.data[0];

    if (imageData.url) {
      console.log('[Jimeng Image Service] Found URL:', imageData.url);
      return ensureDataUrl(imageData.url, 'image/png');
    }

    if (imageData.b64_json) {
      console.log('[Jimeng Image Service] Found b64_json');
      return ensureDataUrl(imageData.b64_json, 'image/png');
    }

    for (const key of ['image', 'base64', 'b64', 'data'] as const) {
      const value = (imageData as any)[key];
      if (typeof value === 'string' && value.trim()) {
        console.log('[Jimeng Image Service] Found image string field:', key);
        return ensureDataUrl(value.trim(), 'image/png');
      }
    }
  }

  if (typeof data === 'string' && data.trim()) {
    console.log('[Jimeng Image Service] Found string response');
    return ensureDataUrl(data.trim(), 'image/png');
  }

  return null;
};

const parseApiError = (errorText: string): string => {
  try {
    const errorData = JSON.parse(errorText);
    // 检查常见的错误结构
    if (errorData?.error?.message) {
      const code = errorData.error.code || '';
      const message = errorData.error.message;
      
      // 敏感内容检测
      if (code === 'InputTextSensitiveContentDetected' || message.includes('sensitive')) {
        return '内容审核未通过：输入的提示词可能包含敏感内容（如版权角色、不当内容等），请修改后重试';
      }
      
      return message;
    }
    if (errorData?.message) {
      return errorData.message;
    }
    return errorText;
  } catch {
    return errorText;
  }
};

const requestJimengImage = async (requestBody: Record<string, unknown>, action: string): Promise<string> => {
  const apiUrl = getJimengApiUrl();
  const apiKey = getJimengApiKey();

  console.log('[Jimeng Image Service] Request body:', safeJsonStringify(requestBody));

  try {
    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
        'Accept': '*/*'
      },
      body: JSON.stringify(requestBody)
    });

    console.log('[Jimeng Image Service] Response status:', response.status);

    if (!response.ok) {
      const errorText = await response.text();
      console.error('[Jimeng Image Service] Error response:', errorText);
      const friendlyError = parseApiError(errorText);
      throw new Error(friendlyError);
    }

    const data = await response.json();
    console.log('[Jimeng Image Service] Response data:', JSON.stringify(data, null, 2));

    const imageUrl = extractJimengImageFromResponse(data);
    if (imageUrl) {
      return imageUrl;
    }

    console.error('[Jimeng Image Service] No image data found in response');
    throw new Error('No image data in response');
  } catch (error) {
    console.error(`[Jimeng Image Service] ${action} failed:`, error);
    throw error;
  }
};

/**
 * 即梦 (Doubao Seedream) 图片生成 API
 * API 端点: https://modelservice.jdcloud.com/v1/imageEdit/generations
 */
const generateImageWithJimeng = async (
  prompt: string,
  inputImage?: ImageInput,
  model: string = 'doubao-seedream-4-0-250828'
): Promise<string> => {
  console.log('[Jimeng Image Service] Generating image:', { model, prompt: prompt.slice(0, 50) });

  const buildJimengImagePayload = (): Record<string, unknown> => {
    const inputs = toImageInputList(inputImage).map(normalizeSeedreamImageValue).filter(Boolean);
    if (!inputs.length) return {};
    return { image: inputs.length === 1 ? inputs[0] : inputs };
  };

  const requestBody: Record<string, unknown> = {
    model,
    prompt,
    ...buildJimengImagePayload(),
    size: '2K',
    sequential_image_generation: 'disabled',
    response_format: 'b64_json',
    watermark: true
  };

  return requestJimengImage(requestBody, 'generate');
};

/**
 * Gemini 图片生成
 */
export const generateImageWithGeminiFlash = async (
  prompt: string,
  inputImage?: ImageInput,
  model: string = 'Gemini-2.5-flash-image-preview',
  size?: string
): Promise<string> => {
  const apiUrl = getApiUrl();
  const apiKey = getApiKey();
  const isJdcloud = apiUrl.startsWith('/jdcloud') || apiUrl.includes('jdcloud.com');

  console.log('[Gemini Image Service] Generating image:', { model, size, hasInputImage: !!inputImage, apiUrl });

  const parts: GeminiPart[] = [];
  for (const imageValue of toImageInputList(inputImage)) {
    const part = buildGeminiImagePart(imageValue, isJdcloud);
    if (part) parts.push(part);
  }

  if (prompt) {
    parts.push({ text: prompt });
  }

  const requestBody: GeminiImageRequest = {
    model,
    contents: isJdcloud ? { role: 'USER', parts } : [{ role: 'user', parts }],
    ...(size ? { size } : {}),
    generation_config: { response_modalities: ['TEXT', 'IMAGE'] },
    stream: false
  };

  console.log('[Gemini Image Service] Request body:', safeJsonStringify(requestBody));

  try {
    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
        'Accept': '*/*'
      },
      body: JSON.stringify(requestBody)
    });

    console.log('[Gemini Image Service] Response status:', response.status);

    if (!response.ok) {
      const errorText = await response.text();
      console.error('[Gemini Image Service] Error response:', errorText);
      const friendlyError = parseApiError(errorText);
      throw new Error(friendlyError);
    }

    const data = await response.json();
    console.log('[Gemini Image Service] Response data keys:', Object.keys(data));

    const imageUrl = extractImageFromGeminiResponse(data);
    if (imageUrl) {
      console.log('[Gemini Image Service] Extracted image URL length:', imageUrl.length);
      return imageUrl;
    }
    console.error('[Gemini Image Service] No image data found in response structure');
    throw new Error('No image data in response');
  } catch (error) {
    console.error('[Gemini Image Service] Generation failed:', error);
    throw error;
  }
};

/**
 * Gemini 3 Pro 图片扩展（背景延展）
 * - 将用户输入图片连同 size 参数发送给模型，让模型在保持主体不变的前提下扩展背景。
 */
export const expandImageWithGeminiPro = async (
  inputImage: string,
  size: string,
  model: string = 'Gemini 3-Pro-Image-Preview'
): Promise<string> => {
  const safeSize = (size || '').trim();
  if (!safeSize) {
    throw new Error('size 不能为空');
  }

  const systemPrompt = `严格保持图片的主图不变，将背景按照需要的${safeSize}尺寸进行扩展`;
  return generateImageWithGeminiFlash(systemPrompt, inputImage, model, safeSize);
};


/**
 * 批量生成图片（支持多个模型）
 */
export const generateImagesFromWorkflow = async (
  prompt: string,
  models: Array<{ id: string; systemPrompt?: string }>,
  inputImage?: string | string[] | null
): Promise<GeneratedImage[]> => {
  console.log('[Image Service] generateImagesFromWorkflow called:', {
    prompt: prompt.slice(0, 100),
    models: models.map(m => m.id),
    hasInputImage: !!inputImage
  });

  const results: GeneratedImage[] = [];

  // 逐个模型生成，避免并发问题
  for (const modelConfig of models) {
    console.log(`[Image Service] Starting generation for model: ${modelConfig.id}`);
    try {
      let imageUrl: string;
      
      // 根据模型 ID 选择对应的 API
      if (modelConfig.id === 'doubao-seedream-4-0-250828') {
        // 即梦 API (使用 minimax_image01 端点)
        imageUrl = await generateImageWithJimeng(prompt, inputImage, modelConfig.id);
      } else {
        // Gemini API
        imageUrl = await generateImageWithGeminiFlash(prompt, inputImage, modelConfig.id);
      }
      
      console.log(`[Image Service] Got imageUrl for ${modelConfig.id}, length: ${imageUrl?.length || 0}`);
      
      if (imageUrl) {
        const result: GeneratedImage = {
          id: crypto.randomUUID(),
          url: imageUrl,
          prompt,
          model: modelConfig.id
        };
        console.log(`[Image Service] Created result:`, { id: result.id, model: result.model, urlLength: result.url?.length });
        results.push(result);
      }
    } catch (error) {
      console.error(`[Image Service] Failed for model ${modelConfig.id}:`, error);
      // 继续处理其他模型
    }
  }

  console.log('[Image Service] Returning', results.length, 'results');
  return results;
};

export const editImageWithGeminiFlash = async (
  originalImage: string,
  maskImage: string,
  prompt: string,
  referenceImage?: string,
  model: string = 'Gemini-2.5-flash-image-preview'
): Promise<string> => {
  const apiUrl = getApiUrl();
  const apiKey = getApiKey();
  const isJdcloud = apiUrl.startsWith('/jdcloud') || apiUrl.includes('jdcloud.com');

  const parts: GeminiPart[] = [];
  const originalPart = buildGeminiImagePart(originalImage, isJdcloud);
  if (originalPart) parts.push(originalPart);
  const maskPart = buildGeminiImagePart(maskImage, isJdcloud);
  if (maskPart) parts.push(maskPart);
  if (referenceImage) {
    const referencePart = buildGeminiImagePart(referenceImage, isJdcloud);
    if (referencePart) parts.push(referencePart);
  }
  if (prompt) {
    parts.push({ text: prompt });
  }

  const requestBody: GeminiImageRequest = {
    model,
    contents: isJdcloud ? { role: 'USER', parts } : [{ role: 'user', parts }],
    generation_config: { response_modalities: ['IMAGE'] },
    stream: false
  };

  try {
    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
        'Accept': '*/*'
      },
      body: JSON.stringify(requestBody)
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('[Gemini Image Service] Edit error:', errorText);
      throw new Error(`HTTP ${response.status}: ${errorText}`);
    }

    const data = await response.json();

    const imageUrl = extractImageFromGeminiResponse(data);
    if (imageUrl) {
      return imageUrl;
    }
    throw new Error('No image data in edit response');
  } catch (error) {
    console.error('[Gemini Image Service] Edit failed:', error);
    throw error;
  }
};

interface SeedreamEditOptions {
  originalImage: string;
  prompt: string;
  maskImage?: string;
  referenceImage?: string;
  referenceMask?: string;
  model?: string;
  mode?: 'inpaint' | 'remix';
}

export const editImageWithSeedream = async ({
  originalImage,
  prompt,
  maskImage,
  referenceImage,
  referenceMask,
  model = 'doubao-seedream-4-0-250828',
  mode
}: SeedreamEditOptions): Promise<string> => {
  const payload: Record<string, unknown> = {
    model,
    prompt,
    image: normalizeSeedreamImageValue(originalImage),
    size: '2K',
    sequential_image_generation: 'disabled',
    response_format: 'b64_json',
    watermark: true
  };

  if (maskImage) {
    const normalizedMask = normalizeSeedreamImageValue(maskImage);
    payload.mask = normalizedMask;
    payload.mask_image = normalizedMask;
    payload.maskImage = normalizedMask;
  }

  if (referenceImage) {
    payload.reference_image = normalizeSeedreamImageValue(referenceImage);
  }

  if (referenceMask) {
    const normalizedRefMask = normalizeSeedreamImageValue(referenceMask);
    payload.reference_mask = normalizedRefMask;
    payload.referenceMask = normalizedRefMask;
  }

  if (mode) {
    payload.mode = mode;
    payload.operation = mode;
  }

  return requestJimengImage(payload, 'edit');
};

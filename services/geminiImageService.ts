import { GeneratedImage } from '../types';

declare const process: any;

const toJdcloudProxyUrl = (url: string): string => {
  const trimmed = (url || '').trim();
  if (!trimmed) return trimmed;
  if (trimmed.startsWith('/jdcloud/')) return trimmed;

  if (typeof window !== 'undefined' && (trimmed.startsWith('http://') || trimmed.startsWith('https://'))) {
    try {
      const u = new URL(trimmed);
      if (u.hostname === 'ai-api.jdcloud.com') return `/jdcloud${u.pathname}${u.search}`;
    } catch {
      // ignore
    }
  }

  return trimmed;
};

// 从环境变量获取 API 配置
const getApiUrl = (): string => {
  if (typeof process !== 'undefined' && process.env?.GEMINI_IMAGE_API_URL) {
    return toJdcloudProxyUrl(process.env.GEMINI_IMAGE_API_URL);
  }
  // Use Vite dev-server proxy by default to avoid browser CORS.
  return '/jdcloud/v1/images/gemini_flash/generations';
};

const getJimengApiUrl = (): string => {
  if (typeof process !== 'undefined' && process.env?.JIMENG_IMAGE_API_URL) {
    return toJdcloudProxyUrl(process.env.JIMENG_IMAGE_API_URL);
  }
  // Use Vite dev-server proxy by default to avoid browser CORS.
  return '/jdcloud/v1/imageEdit/generations';
};

const getApiKey = (): string => {
  if (typeof process !== 'undefined' && process.env?.GEMINI_API_KEY) {
    return process.env.GEMINI_API_KEY;
  }
  console.warn('[Gemini Image Service] Missing API key');
  return '';
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
  if (imageData.startsWith('data:')) {
    return imageData;
  }
  if (imageData.startsWith('http://') || imageData.startsWith('https://')) {
    return imageData;
  }
  return `data:${mimeType};base64,${imageData}`;
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
};

type GeminiContents = { role: string; parts: GeminiPart[] } | Array<{ role: string; parts: GeminiPart[] }>;

interface GeminiImageRequest {
  model: string;
  contents: GeminiContents;
  generation_config?: {
    response_modalities?: string[];
  };
  stream: boolean;
}


/**
 * 即梦 (Doubao Seedream) 图片生成 API
 * API 端点: http://ai-api.jdcloud.com/v1/imageEdit/generations
 */
const generateImageWithJimeng = async (
  prompt: string,
  inputImage?: ImageInput,
  model: string = 'doubao-seedream-4-0-250828'
): Promise<string> => {
  const apiUrl = getJimengApiUrl();
  const apiKey = getApiKey();

  console.log('[Jimeng Image Service] Generating image:', { model, prompt: prompt.slice(0, 50) });

  const buildJimengImagePayload = (): Record<string, unknown> => {
    const inputs = toImageInputList(inputImage).map(normalizeSeedreamImageValue).filter(Boolean);
    if (!inputs.length) return {};
    return { image: inputs.length === 1 ? inputs[0] : inputs };
  };

  const requestBody = {
    model,
    prompt,
    ...buildJimengImagePayload(),
    size: '2K',
    sequential_image_generation: 'disabled',
    response_format: 'b64_json',
    watermark: true
  };

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
      throw new Error(`HTTP ${response.status}: ${errorText}`);
    }

    const data = await response.json();
    console.log('[Jimeng Image Service] Response data:', JSON.stringify(data, null, 2));

    // 解析响应 - 即梦 API 返回格式
    if (data.data && Array.isArray(data.data) && data.data.length > 0) {
      const imageData = data.data[0];
      
      // 格式 1: url (response_format: 'url')
      if (imageData.url) {
        console.log('[Jimeng Image Service] Found URL:', imageData.url);
        return ensureDataUrl(imageData.url, 'image/png');
      }
      
      // 格式 2: b64_json
      if (imageData.b64_json) {
        console.log('[Jimeng Image Service] Found b64_json');
        return ensureDataUrl(imageData.b64_json, 'image/png');
      }

      // 容错：部分实现可能直接返回 base64 字段
      for (const key of ['image', 'base64', 'b64', 'data'] as const) {
        const value = (imageData as any)[key];
        if (typeof value === 'string' && value.trim()) {
          console.log('[Jimeng Image Service] Found image string field:', key);
          return ensureDataUrl(value.trim(), 'image/png');
        }
      }
    }

    // 兜底：服务端可能直接返回字符串
    if (typeof data === 'string' && data.trim()) {
      console.log('[Jimeng Image Service] Found string response');
      return ensureDataUrl(data.trim(), 'image/png');
    }

    console.error('[Jimeng Image Service] No image data found in response');
    throw new Error('No image data in response');
  } catch (error) {
    console.error('[Jimeng Image Service] Generation failed:', error);
    throw error;
  }
};

/**
 * Gemini 图片生成
 */
const generateImageWithGeminiFlash = async (
  prompt: string,
  inputImage?: ImageInput,
  model: string = 'Gemini-2.5-flash-image-preview'
): Promise<string> => {
  const apiUrl = getApiUrl();
  const apiKey = getApiKey();
  const isJdcloud = apiUrl.startsWith('/jdcloud') || apiUrl.includes('jdcloud.com');

  console.log('[Gemini Image Service] Generating image:', { model, hasInputImage: !!inputImage, apiUrl });

  const parts: any[] = [];

  for (const imageValue of toImageInputList(inputImage)) {
    const trimmed = (imageValue || '').trim();
    if (!trimmed) continue;

    if (isHttpUrl(trimmed)) {
      parts.push(
        isJdcloud
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
            }
      );
      continue;
    }

    const normalized = normalizeSeedreamImageValue(trimmed);
    const base64Data = extractBase64Data(normalized);
    const mimeType = extractMimeType(normalized);
    const inline = {
      ...(isJdcloud ? { mime_type: mimeType } : { mimeType }),
      data: base64Data
    };
    parts.push(isJdcloud ? { inline_data: inline } : { inlineData: inline });
  }

  if (prompt) {
    parts.push({ text: prompt });
  }

  const requestBody: GeminiImageRequest = {
    model,
    contents: isJdcloud ? { role: 'USER', parts } : [{ role: 'user', parts }],
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
      throw new Error(`HTTP ${response.status}: ${errorText}`);
    }

    const data = await response.json();
    console.log('[Gemini Image Service] Response data keys:', Object.keys(data));

    // JDCloud gateway often returns OpenAI-style `data: [{ url | b64_json }]`
    if (data?.data && Array.isArray(data.data) && data.data.length > 0) {
      const first = data.data[0] || {};
      if (typeof first.b64_json === 'string' && first.b64_json) {
        console.log('[Gemini Image Service] Found b64_json in data[0]');
        return ensureDataUrl(first.b64_json, 'image/png');
      }
      if (typeof first.url === 'string' && first.url) {
        console.log('[Gemini Image Service] Found url in data[0]');
        return ensureDataUrl(first.url, 'image/png');
      }
    }

    // 解析响应，提取生成的图片
    if (data.candidates && data.candidates[0]) {
      const responseParts = data.candidates[0].content?.parts || [];
      console.log('[Gemini Image Service] Found', responseParts.length, 'parts in response');
      
      for (let i = 0; i < responseParts.length; i++) {
        const part = responseParts[i];
        console.log(`[Gemini Image Service] Part ${i} keys:`, Object.keys(part));
        
        // inline_data 格式（下划线命名）
        if (part.inline_data && part.inline_data.data) {
          const mimeType = part.inline_data.mime_type || part.inline_data.mimeType || 'image/png';
          console.log('[Gemini Image Service] Found image in part.inline_data, mimeType:', mimeType);
          const dataUrl = ensureDataUrl(part.inline_data.data, mimeType);
          console.log('[Gemini Image Service] Generated data URL length:', dataUrl.length);
          return dataUrl;
        }
        
        // inlineData 格式（驼峰命名）
        if (part.inlineData && part.inlineData.data) {
          const mimeType = part.inlineData.mime_type || part.inlineData.mimeType || 'image/png';
          console.log('[Gemini Image Service] Found image in part.inlineData, mimeType:', mimeType);
          const dataUrl = ensureDataUrl(part.inlineData.data, mimeType);
          console.log('[Gemini Image Service] Generated data URL length:', dataUrl.length);
          return dataUrl;
        }
      }
    }

    // 其他格式
    if (data.result?.image) {
      console.log('[Gemini Image Service] Found image in result.image');
      return ensureDataUrl(data.result.image);
    }
    if (data.image) {
      console.log('[Gemini Image Service] Found image in data.image');
      return ensureDataUrl(data.image);
    }
    if (data.url) {
      console.log('[Gemini Image Service] Found image URL in data.url');
      return ensureDataUrl(data.url);
    }
    if (typeof data === 'string') {
      console.log('[Gemini Image Service] Found base64 string in response');
      return ensureDataUrl(data);
    }

    console.error('[Gemini Image Service] No image data found in response structure');
    throw new Error('No image data in response');
  } catch (error) {
    console.error('[Gemini Image Service] Generation failed:', error);
    throw error;
  }
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
  model: string = 'Gemini-2.5-flash-image-preview'
): Promise<string> => {
  const apiUrl = getApiUrl();
  const apiKey = getApiKey();
  const isJdcloud = apiUrl.startsWith('/jdcloud') || apiUrl.includes('jdcloud.com');

  const parts: any[] = [];
  if (originalImage) {
    parts.push({
      inline_data: {
        ...(isJdcloud ? { mime_type: extractMimeType(originalImage) } : { mimeType: extractMimeType(originalImage) }),
        data: extractBase64Data(originalImage)
      }
    });
  }
  if (maskImage) {
    parts.push({
      inline_data: {
        ...(isJdcloud ? { mime_type: extractMimeType(maskImage) } : { mimeType: extractMimeType(maskImage) }),
        data: extractBase64Data(maskImage)
      }
    });
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

    if (data?.data && Array.isArray(data.data) && data.data.length > 0) {
      const first = data.data[0] || {};
      if (typeof first.b64_json === 'string' && first.b64_json) return ensureDataUrl(first.b64_json, 'image/png');
      if (typeof first.url === 'string' && first.url) return ensureDataUrl(first.url, 'image/png');
    }

    const partsResp = data.candidates?.[0]?.content?.parts || [];
    for (const part of partsResp) {
      if (part.inline_data?.data) {
        return ensureDataUrl(part.inline_data.data, part.inline_data.mime_type || part.inline_data.mimeType);
      }
      if (part.inlineData?.data) {
        return ensureDataUrl(part.inlineData.data, part.inlineData.mime_type || part.inlineData.mimeType);
      }
    }
    if (data.result?.image) return ensureDataUrl(data.result.image);
    if (data.image) return ensureDataUrl(data.image);
    if (data.url) return ensureDataUrl(data.url);
    if (typeof data === 'string') return ensureDataUrl(data);
    throw new Error('No image data in edit response');
  } catch (error) {
    console.error('[Gemini Image Service] Edit failed:', error);
    throw error;
  }
};

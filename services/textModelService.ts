declare const process: any;

interface Message {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

// 默认 System Prompt（可以在这里修改）
const DEFAULT_SYSTEM_PROMPT = 'You are a helpful AI assistant. Please provide clear, accurate, and concise responses.';

interface ChatCompletionResponse {
  choices?: Array<{
    message?: {
      content?: any;
    };
  }>;
  candidates?: Array<{
    content?: any;
  }>;
  output_text?: string;
}

const normalizeContent = (content: any): string => {
  if (content == null) return '';

  if (typeof content === 'string') {
    return content;
  }

  if (Array.isArray(content)) {
    return content
      .map(part => normalizeContent(part))
      .filter(Boolean)
      .join('\n')
      .trim();
  }

  if (typeof content === 'object') {
    if (typeof content.text === 'string') {
      return content.text;
    }

    if ('value' in content && typeof content.value === 'string') {
      return content.value;
    }

    if ('content' in content) {
      return normalizeContent((content as any).content);
    }

    if ('parts' in content) {
      return normalizeContent((content as any).parts);
    }
  }

  return '';
};

const parseText = (data: ChatCompletionResponse): string => {
  try {
    // OpenAI / compatible format
    if (data.choices && data.choices.length > 0) {
      const msg = data.choices[0].message || {};
      const text = normalizeContent(msg.content);
      if (text) return text;
    }
    
    // Gemini / PaLM format
    if (data.candidates && data.candidates.length > 0) {
      const candidate = data.candidates[0];
      const text = normalizeContent(candidate.content);
      if (text) return text;
    }
    
    // Direct output format
    if (data.output_text) {
      return data.output_text;
    }
  } catch (error) {
    console.error('[Text Model Service] Error parsing response:', error);
  }
  
  return '';
};

const getEnvVar = (clientValue?: string, serverValue?: string) => {
  if (clientValue && clientValue.trim()) return clientValue.trim();
  if (typeof serverValue === 'string' && serverValue.trim()) return serverValue.trim();
  return undefined;
};

export const chatCompletions = async (
  model: string,
  messages: Message[],
  apiUrl?: string,
  apiKey?: string,
  systemPrompt?: string
): Promise<string> => {
  const url = getEnvVar(apiUrl, undefined) 
    || process.env?.TEXT_MODEL_API_URL
    || 'https://modelservice.jdcloud.com/v1/chat/completions';
  const key = getEnvVar(apiKey, undefined) 
    || process.env?.TEXT_MODEL_API_KEY
    || 'replace-with-your-text-model-key';
  
  if (key === 'replace-with-your-text-model-key') {
    console.warn('[Text Model Service] Missing TEXT_MODEL_API_KEY, please configure VITE_TEXT_MODEL_API_KEY in .env.local');
  }
  if (!url.startsWith('http')) {
    console.warn('[Text Model Service] TEXT_MODEL_API_URL 看起来不是有效的 HTTP 地址，请检查 .env.local 配置');
  }
  
  console.log('[Text Model Service] Calling API:', { model, url, messageCount: messages.length });
  
  // 添加 system prompt 到消息列表
  const finalMessages: Message[] = systemPrompt 
    ? [{ role: 'system', content: systemPrompt }, ...messages]
    : [{ role: 'system', content: DEFAULT_SYSTEM_PROMPT }, ...messages];
  
  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${key}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model,
        messages: finalMessages,
        stream: false,
      }),
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`HTTP ${response.status}: ${errorText}`);
    }
    
    const data: ChatCompletionResponse = await response.json();
    const text = parseText(data);
    
    if (!text) {
      throw new Error('No text content in response');
    }
    
    return text;
  } catch (error) {
    console.error('[Text Model Service] API call failed:', error);
    throw error;
  }
};

const extractStreamDelta = (data: any): { delta?: string; full?: string } => {
  if (!data || typeof data !== 'object') return {};

  const choice = Array.isArray((data as any).choices) ? (data as any).choices[0] : undefined;
  if (choice) {
    const delta = choice.delta;
    if (delta && typeof delta.content === 'string') return { delta: delta.content };
    if (delta && typeof delta.text === 'string') return { delta: delta.text };

    const message = choice.message;
    if (message && typeof message.content === 'string') return { full: message.content };
    if (message && Array.isArray(message.content)) return { full: normalizeContent(message.content) };
  }

  if (typeof (data as any).output_text === 'string') return { full: (data as any).output_text };

  const candidate = Array.isArray((data as any).candidates) ? (data as any).candidates[0] : undefined;
  if (candidate) {
    const text = normalizeContent(candidate.content);
    if (text) return { full: text };
  }

  return {};
};

const appendCumulative = (current: string, next: string): string => {
  if (!next) return '';
  if (!current) return next;
  if (next.startsWith(current)) return next.slice(current.length);
  return next;
};

export const chatCompletionsStream = async (
  model: string,
  messages: Message[],
  apiUrl?: string,
  apiKey?: string,
  systemPrompt?: string,
  onText?: (fullText: string) => void
): Promise<string> => {
  const url = getEnvVar(apiUrl, undefined) 
    || process.env?.TEXT_MODEL_API_URL
    || 'https://modelservice.jdcloud.com/v1/chat/completions';
  const key = getEnvVar(apiKey, undefined) 
    || process.env?.TEXT_MODEL_API_KEY
    || 'replace-with-your-text-model-key';

  const finalMessages: Message[] = systemPrompt 
    ? [{ role: 'system', content: systemPrompt }, ...messages]
    : [{ role: 'system', content: DEFAULT_SYSTEM_PROMPT }, ...messages];

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${key}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model,
      messages: finalMessages,
      stream: true,
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`HTTP ${response.status}: ${errorText}`);
  }

  if (!response.body) {
    const data: ChatCompletionResponse = await response.json();
    const text = parseText(data);
    if (!text) throw new Error('No text content in response');
    onText?.(text);
    return text;
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder('utf-8');
  let buffer = '';
  let fullText = '';

  try {
    while (true) {
      const { value, done } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });

      while (true) {
        const newlineIdx = buffer.indexOf('\n');
        if (newlineIdx < 0) break;

        const rawLine = buffer.slice(0, newlineIdx);
        buffer = buffer.slice(newlineIdx + 1);

        const line = rawLine.trim();
        if (!line) continue;

        const payload = line.startsWith('data:') ? line.slice(5).trim() : line;
        if (!payload) continue;
        if (payload === '[DONE]') {
          return fullText;
        }

        let json: any;
        try {
          json = JSON.parse(payload);
        } catch {
          continue;
        }

        const { delta, full } = extractStreamDelta(json);
        if (typeof delta === 'string' && delta) {
          fullText += delta;
          onText?.(fullText);
          continue;
        }

        if (typeof full === 'string' && full) {
          const appended = appendCumulative(fullText, full);
          if (appended) {
            fullText += appended;
            onText?.(fullText);
          }
        }
      }
    }
  } finally {
    try {
      reader.releaseLock();
    } catch {
      // ignore
    }
  }

  return fullText;
};

export const generateTextFromPrompt = async (
  prompt: string,
  models: Array<{ id: string; systemPrompt?: string }>,
  globalSystemPrompt?: string
): Promise<Array<{ model: string; text: string; error?: string }>> => {
  console.log('[Text Model Service] Generating text for models:', models.map(m => m.id));
  
  const results = await Promise.allSettled(
    models.map(async (modelConfig) => {
      try {
        // 优先使用模型专属的 system prompt，其次使用全局的，最后使用默认的
        const systemPrompt = modelConfig.systemPrompt || globalSystemPrompt;
        
        const text = await chatCompletions(
          modelConfig.id, 
          [{ role: 'user', content: prompt }],
          undefined,
          undefined,
          systemPrompt
        );
        return { model: modelConfig.id, text };
      } catch (error) {
        return {
          model: modelConfig.id,
          text: '',
          error: error instanceof Error ? error.message : 'Unknown error'
        };
      }
    })
  );
  
  return results.map((result, index) => {
    if (result.status === 'fulfilled') {
      return result.value;
    } else {
      return {
        model: models[index].id,
        text: '',
        error: result.reason?.message || 'Request failed'
      };
    }
  });
};

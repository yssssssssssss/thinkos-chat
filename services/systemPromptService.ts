export type SystemPromptPreset = {
  id: string;
  name: string;
  prompt: string;
};

const FALLBACK_SYSTEM_PROMPTS: SystemPromptPreset[] = [
  {
    id: 'default',
    name: 'Default',
    prompt: 'You are a helpful AI assistant. Please provide clear, accurate, and concise responses.',
  },
];

let cachedPrompts: SystemPromptPreset[] | null = null;
let inFlight: Promise<SystemPromptPreset[]> | null = null;

const isNonEmptyString = (value: unknown): value is string =>
  typeof value === 'string' && value.trim().length > 0;

const isValidPreset = (value: unknown): value is SystemPromptPreset => {
  if (!value || typeof value !== 'object') return false;
  const v = value as Record<string, unknown>;
  return isNonEmptyString(v.id) && isNonEmptyString(v.name) && isNonEmptyString(v.prompt);
};

export const getSystemPrompts = async (): Promise<SystemPromptPreset[]> => {
  if (cachedPrompts) return cachedPrompts;
  if (inFlight) return inFlight;

  inFlight = (async () => {
    try {
      const response = await fetch('/system-prompts.json');
      if (!response.ok) return FALLBACK_SYSTEM_PROMPTS;
      const json: unknown = await response.json();
      if (!Array.isArray(json)) return FALLBACK_SYSTEM_PROMPTS;
      const presets = json.filter(isValidPreset);
      return presets.length ? presets : FALLBACK_SYSTEM_PROMPTS;
    } catch {
      return FALLBACK_SYSTEM_PROMPTS;
    }
  })();

  cachedPrompts = await inFlight;
  inFlight = null;
  return cachedPrompts;
};

export const resolveSystemPromptText = async (
  systemPromptId?: string
): Promise<string | undefined> => {
  const prompts = await getSystemPrompts();
  if (!prompts.length) return undefined;
  if (!systemPromptId) return prompts[0].prompt;
  return prompts.find((p) => p.id === systemPromptId)?.prompt || prompts[0].prompt;
};

export type PromptMarkPreset = {
  id: string;
  title: string;
  summary?: string;
  category?: string;
  image?: string;
  prompt: string;
  jumpUrl?: string;
};

const FALLBACK_PROMPTMARKS: PromptMarkPreset[] = [
  {
    id: 'fallback-1',
    title: 'Example',
    summary: 'Fallback promptmark preset (promptmarks.json not loaded).',
    category: 'default',
    prompt: 'Describe what you want to generate, with style, lighting, and composition details.',
  },
];

let cachedPresets: PromptMarkPreset[] | null = null;
let inFlight: Promise<PromptMarkPreset[]> | null = null;

const isNonEmptyString = (value: unknown): value is string =>
  typeof value === 'string' && value.trim().length > 0;

const isOptionalString = (value: unknown): value is string | undefined =>
  value === undefined || typeof value === 'string';

const isValidPreset = (value: unknown): value is PromptMarkPreset => {
  if (!value || typeof value !== 'object') return false;
  const v = value as Record<string, unknown>;
  return (
    isNonEmptyString(v.id) &&
    isNonEmptyString(v.title) &&
    isNonEmptyString(v.prompt) &&
    isOptionalString(v.summary) &&
    isOptionalString(v.category) &&
    isOptionalString(v.image) &&
    isOptionalString(v.jumpUrl)
  );
};

export const getPromptMarks = async (): Promise<PromptMarkPreset[]> => {
  if (cachedPresets) return cachedPresets;
  if (inFlight) return inFlight;

  inFlight = (async () => {
    try {
      const response = await fetch('/promptmarks.json');
      if (!response.ok) return FALLBACK_PROMPTMARKS;
      const json: unknown = await response.json();
      if (!Array.isArray(json)) return FALLBACK_PROMPTMARKS;
      const presets = json.filter(isValidPreset);
      return presets.length ? presets : FALLBACK_PROMPTMARKS;
    } catch {
      return FALLBACK_PROMPTMARKS;
    }
  })();

  cachedPresets = await inFlight;
  inFlight = null;
  return cachedPresets;
};

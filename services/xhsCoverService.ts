import { chatCompletionsStream } from './textModelService';

export type XhsCoverTemplateId = 'infographic-cartoon' | 'infographic-pro';

export interface XhsCoverImagePrompt {
  index: number;
  type: 'Cover' | 'Content' | 'End' | string;
  text_overlays?: {
    title?: string;
    subtitle?: string;
    notes?: string;
  };
  prompt: string;
  negative_prompt?: string;
}

export interface XhsCoverOutput {
  title: string;
  content_polished: string;
  tags?: string[];
  image_prompts: XhsCoverImagePrompt[];
}

export interface GenerateXhsCoverPromptsResult {
  raw: string;
  jsonText: string;
  parsed: XhsCoverOutput;
}

const BASE_RULES = `
You are a Xiaohongshu (小红书) cover & infographic prompt generator.

Goal:
- Turn the user's raw content into a catchy Xiaohongshu-style title + polished caption + tags.
- Break the content into a short series of images: Cover -> Content (1..N) -> End.
- For each image, output an English image-generation prompt that matches the chosen visual template.

Output rules (STRICT):
- Output MUST be a single JSON object and nothing else.
- No markdown fences, no explanations, no extra keys beyond the schema below.
- Keep output language for title/content_polished consistent with the user's input language.
- If the input is Chinese, use full-width Chinese punctuation（，。！？“”）in title/content_polished.

JSON schema:
{
  "title": "string",
  "content_polished": "string",
  "tags": ["#Tag1", "#Tag2"],
  "image_prompts": [
    {
      "index": 1,
      "type": "Cover | Content | End",
      "text_overlays": { "title": "string", "subtitle": "string", "notes": "string" },
      "prompt": "English image generation prompt",
      "negative_prompt": "string"
    }
  ]
}
`.trim();

const TEMPLATE_RULES: Record<XhsCoverTemplateId, string> = {
  'infographic-cartoon': `
Visual template: Infographic / Cartoon (high-saturation, cute, hand-drawn).
- Format: vertical, suitable for 3:4 (preferred) or 9:16.
- Background: warm pastel / cream / light mint / light pink, clean and bright.
- Typography: hand-drawn style lettering (describe it in the prompt), bold title, clear hierarchy.
- Decorations: simple cute cartoon icons/stickers/bubbles, but keep layout readable.
- Avoid photorealistic, messy, dark, heavy texture.
  `.trim(),
  'infographic-pro': `
Visual template: Infographic / Pro (premium muted palette, more whitespace).
- Format: vertical, suitable for 3:4 (preferred) or 9:16.
- Palette: morandi / low-saturation / calm neutral tones, premium and restrained.
- Typography: hand-drawn-like but mature, minimal, emphasis via highlight blocks/underline.
- Layout: lots of whitespace, 1 clear focal point per slide, modular cards.
- Avoid heavy saturation, clutter, photorealistic, noisy backgrounds.
  `.trim(),
};

const extractJsonObject = (text: string): string => {
  const raw = (text || '').trim();
  if (!raw) throw new Error('Empty model output');

  // Markdown fenced block
  const fence = raw.match(/```(?:json)?\s*([\s\S]*?)\s*```/i);
  if (fence?.[1]) return fence[1].trim();

  const first = raw.indexOf('{');
  const last = raw.lastIndexOf('}');
  if (first >= 0 && last > first) return raw.slice(first, last + 1).trim();

  throw new Error('Model did not return a JSON object');
};

const parseOutput = (jsonText: string): XhsCoverOutput => {
  let parsed: any;
  try {
    parsed = JSON.parse(jsonText);
  } catch (e) {
    throw new Error('Invalid JSON in model output');
  }

  if (!parsed || typeof parsed !== 'object') {
    throw new Error('JSON output is not an object');
  }
  if (typeof parsed.title !== 'string') {
    throw new Error('JSON output missing "title"');
  }
  if (typeof parsed.content_polished !== 'string') {
    throw new Error('JSON output missing "content_polished"');
  }
  if (!Array.isArray(parsed.image_prompts)) {
    throw new Error('JSON output missing "image_prompts" array');
  }

  return parsed as XhsCoverOutput;
};

export const generateXhsCoverPrompts = async (
  model: string,
  content: string,
  template: XhsCoverTemplateId,
  options?: { onStream?: (fullText: string) => void }
): Promise<GenerateXhsCoverPromptsResult> => {
  const trimmed = (content || '').trim();
  if (!trimmed) throw new Error('Please provide content');

  const templateRules = TEMPLATE_RULES[template] || TEMPLATE_RULES['infographic-cartoon'];
  const systemPrompt = `${BASE_RULES}\n\n${templateRules}`.trim();

  const raw = await chatCompletionsStream(
    model,
    [{ role: 'user', content: trimmed }],
    undefined,
    undefined,
    systemPrompt,
    options?.onStream
  );

  const jsonText = extractJsonObject(raw);
  const parsed = parseOutput(jsonText);

  return { raw, jsonText, parsed };
};


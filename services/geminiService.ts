import { GeneratedImage } from "../types";
import { randomId } from "../utils/id";

// Helper to convert Blob/File to Base64 (Keep this as it's used by UI)
export const fileToBase64 = (file: File | Blob): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => {
      resolve(reader.result as string);
    };
    reader.onerror = (error) => reject(error);
  });
};

// --- PURELY MOCKED IMAGE PIPELINE (no real model calls) ---
const MOCK_COLORS = ['#0ea5e9', '#a855f7', '#f97316', '#22c55e', '#e11d48', '#f59e0b'];

const buildMockImage = (prompt: string, model: string, variant: number, note?: string) => {
  const bg = MOCK_COLORS[variant % MOCK_COLORS.length];
  const safePrompt = prompt || 'No prompt provided';
  const label = note ? ` • ${note}` : '';

  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" width="1024" height="576">
      <defs>
        <linearGradient id="g${variant}" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stop-color="${bg}" stop-opacity="0.85"/>
          <stop offset="100%" stop-color="${bg}" stop-opacity="0.65"/>
        </linearGradient>
      </defs>
      <rect width="1024" height="576" fill="url(#g${variant})"/>
      <text x="48" y="96" font-size="42" font-family="Segoe UI, Arial" fill="#e2e8f0" font-weight="700">Mock image</text>
      <text x="48" y="156" font-size="26" font-family="Segoe UI, Arial" fill="#cbd5e1">${model}${label}</text>
      <text x="48" y="220" font-size="24" font-family="Segoe UI, Arial" fill="#e2e8f0">Prompt:</text>
      <foreignObject x="48" y="240" width="928" height="260">
        <div xmlns="http://www.w3.org/1999/xhtml" style="color:#e2e8f0;font-size:22px;font-family:'Segoe UI', Arial;line-height:1.4;">
          ${safePrompt}
        </div>
      </foreignObject>
    </svg>
  `;

  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
};

export const generateImagesFromWorkflow = async (
  prompt: string,
  models: Array<{ id: string; systemPrompt?: string }>,
  inputImage?: string | string[] | null
): Promise<GeneratedImage[]> => {
  console.log("[Mock Service] Generating placeholder images...", { prompt, models: models.map(m => m.id), hasInputImage: !!inputImage });
  
  await new Promise(resolve => setTimeout(resolve, 600));

  return models.map((modelConfig, index) => ({
    id: randomId(),
    url: buildMockImage(prompt, modelConfig.id, index, inputImage ? 'source attached' : 'no source'),
    prompt,
    model: modelConfig.id
  }));
};

export const optimizePrompt = async (originalPrompt: string): Promise<string[]> => {
    console.log("[Mock Service] Optimizing prompt:", originalPrompt);
    
    await new Promise(resolve => setTimeout(resolve, 600));

    return [
        `${originalPrompt}, cinematic lighting, 8k resolution, highly detailed, masterpiece`,
        `${originalPrompt}, cyberpunk style, neon lights, futuristic atmosphere, ray tracing`,
        `${originalPrompt}, watercolor painting, soft edges, pastel colors, artistic`,
        `${originalPrompt}, minimalist vector art, flat design, clean lines, corporate memphis`
    ];
};

export const editImage = async (
    originalImage: string,
    maskImage: string,
    prompt: string,
    referenceImage?: string,
    _modelId?: string
): Promise<string | null> => {
    console.log("[Mock Service] Editing image (mock):", { prompt, hasRef: !!referenceImage });

    await new Promise(resolve => setTimeout(resolve, 700));

    return buildMockImage(prompt, 'edit-preview', Math.floor(Math.random() * 10), referenceImage ? 'ref + mask' : 'mask only');
};

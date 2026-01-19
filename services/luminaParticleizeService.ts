import { generateImageWithGeminiFlash } from './geminiImageService';

export const generateLuminaParticleizeSourceImage = async (prompt: string): Promise<string> => {
  const trimmed = (prompt || '').trim();
  if (!trimmed) {
    throw new Error('Prompt is empty');
  }

  const systemPrompt = `Create a high-contrast, simple graphical logo or shape representing: ${trimmed}. Minimalist, black background, glowing neon main subject. Center the subject.`;
  return generateImageWithGeminiFlash(systemPrompt, null, 'Gemini-2.5-flash-image-preview');
};


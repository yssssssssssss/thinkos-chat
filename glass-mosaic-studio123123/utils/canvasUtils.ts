import { ProcessingOptions } from '../types';

/**
 * Calculates the average color of a region in the image data.
 */
function getAverageColor(
  data: Uint8ClampedArray,
  width: number,
  startX: number,
  startY: number,
  w: number,
  h: number
): { r: number; g: number; b: number } {
  let r = 0, g = 0, b = 0, count = 0;

  for (let y = startY; y < startY + h; y++) {
    for (let x = startX; x < startX + w; x++) {
      const i = (y * width + x) * 4;
      if (i < data.length) {
        r += data[i];
        g += data[i + 1];
        b += data[i + 2];
        count++;
      }
    }
  }

  if (count === 0) return { r: 0, g: 0, b: 0 };
  return { r: Math.round(r / count), g: Math.round(g / count), b: Math.round(b / count) };
}

/**
 * Deterministic pseudo-random number generator based on coordinates.
 * Returns a value between 0 and 1.
 */
function pseudoRandom(x: number, y: number): number {
  return Math.abs(Math.sin(x * 12.9898 + y * 78.233) * 43758.5453) % 1;
}

export const processImage = (
  canvas: HTMLCanvasElement,
  image: HTMLImageElement,
  options: ProcessingOptions
): void => {
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  if (!ctx) return;

  const { width, height } = image;
  canvas.width = width;
  canvas.height = height;

  // Draw original image to get pixel data
  ctx.drawImage(image, 0, 0);
  const imageData = ctx.getImageData(0, 0, width, height);
  const data = imageData.data;

  // Clear canvas for drawing the mosaic
  ctx.clearRect(0, 0, width, height);

  // Fill background with a white grout color as requested
  ctx.fillStyle = '#ffffff'; 
  ctx.fillRect(0, 0, width, height);

  const { cellSize, gap, bevelIntensity, glassOpacity, innerShine, renderShape, sparkleIntensity } = options;

  for (let y = 0; y < height; y += cellSize) {
    for (let x = 0; x < width; x += cellSize) {
      // Determine actual block size (handling edges)
      const w = Math.min(cellSize, width - x);
      const h = Math.min(cellSize, height - y);

      // Get average color
      const color = getAverageColor(data, width, x, y, w, h);
      
      // Calculate drawing dimensions with gap
      const drawX = x + gap / 2;
      const drawY = y + gap / 2;
      const drawW = Math.max(0, w - gap);
      const drawH = Math.max(0, h - gap);

      if (drawW <= 0 || drawH <= 0) continue;

      // Determine if this cell gets a random sparkle highlight on its edge
      const rnd = pseudoRandom(x, y);
      const isSparkle = rnd < sparkleIntensity;

      ctx.save();

      // --- Shape Clipping ---
      ctx.beginPath();
      if (renderShape === 'circle') {
        const radius = Math.min(drawW, drawH) / 2;
        ctx.arc(drawX + drawW / 2, drawY + drawH / 2, radius, 0, Math.PI * 2);
      } else {
        ctx.rect(drawX, drawY, drawW, drawH);
      }
      ctx.clip();

      // --- 1. Base Color ---
      // We keep the base color faithful to the image now, 
      // sparkles are applied as overlays/edges only.
      ctx.fillStyle = `rgb(${color.r}, ${color.g}, ${color.b})`;
      ctx.fill();

      // --- 2. Glass Surface Gradient ---
      // Standard glass frost/sheen
      const surfaceGrad = ctx.createLinearGradient(drawX, drawY, drawX + drawW, drawY + drawH);
      surfaceGrad.addColorStop(0, `rgba(255, 255, 255, ${glassOpacity + 0.1})`);
      surfaceGrad.addColorStop(1, `rgba(255, 255, 255, 0)`);
      
      ctx.fillStyle = surfaceGrad;
      ctx.fill();

      // --- 3. Bevel / Edge Definition ---
      if (bevelIntensity > 0) {
        // Top edge highlight (standard)
        ctx.fillStyle = `rgba(255, 255, 255, ${bevelIntensity})`;
        ctx.fillRect(drawX, drawY, drawW, Math.max(1, drawH * 0.05));

        // Left edge highlight (standard)
        ctx.fillStyle = `rgba(255, 255, 255, ${bevelIntensity * 0.8})`;
        ctx.fillRect(drawX, drawY, Math.max(1, drawW * 0.05), drawH);
        
        // Bottom/Right shadows
        // Since background is white, shadows need to be visible but not too dirty
        ctx.fillStyle = `rgba(0, 0, 0, ${bevelIntensity * 0.4})`; 
        ctx.fillRect(drawX, drawY + drawH - Math.max(1, drawH * 0.02), drawW, Math.max(1, drawH * 0.02));
        ctx.fillRect(drawX + drawW - Math.max(1, drawW * 0.02), drawY, Math.max(1, drawW * 0.02), drawH);
      }

      // --- 4. Sparkle (Edge Highlight) ---
      // If active, we add a very bright, "magical" glint to the edge
      if (isSparkle) {
         ctx.save();
         // Create a glow effect for the sparkle
         ctx.shadowColor = 'white';
         ctx.shadowBlur = 8;
         ctx.fillStyle = '#ffffff';

         // We'll pick a spot on the top or left edge to "glint"
         // Use the randomness to decide position slightly
         const edgePos = (rnd * 100) % 2 < 1 ? 'top' : 'left';
         
         if (edgePos === 'top') {
             // A small bright dash on the top edge
             const glintW = drawW * 0.3;
             const glintX = drawX + (drawW * 0.1) + (rnd * (drawW * 0.5)); // Random pos on top
             ctx.fillRect(glintX, drawY, glintW, Math.max(2, drawH * 0.08));
         } else {
             // A small bright dash on the left edge
             const glintH = drawH * 0.3;
             const glintY = drawY + (drawH * 0.1) + (rnd * (drawH * 0.5)); // Random pos on left
             ctx.fillRect(drawX, glintY, Math.max(2, drawW * 0.08), glintH);
         }
         ctx.restore();
      }

      // --- 5. Inner Gloss / Specular Highlight ---
      if (innerShine > 0) {
        const sheenGrad = ctx.createLinearGradient(drawX, drawY, drawX + drawW, drawY + drawH * 0.8);
        sheenGrad.addColorStop(0, `rgba(255, 255, 255, ${innerShine * 0.3})`);
        sheenGrad.addColorStop(0.3, `rgba(255, 255, 255, 0)`);
        
        ctx.fillStyle = sheenGrad;
        ctx.fill();
      }

      // --- 6. Border Stroke ---
      // Subtle border for definition
      ctx.lineWidth = 0.5;
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.2)';
      ctx.stroke();

      ctx.restore();
    }
  }
};
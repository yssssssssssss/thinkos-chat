import { GlassMosaicOptions } from '../types';

const getAverageColor = (
  data: Uint8ClampedArray,
  width: number,
  startX: number,
  startY: number,
  w: number,
  h: number
) => {
  let r = 0;
  let g = 0;
  let b = 0;
  let count = 0;

  for (let y = startY; y < startY + h; y += 1) {
    for (let x = startX; x < startX + w; x += 1) {
      const i = (y * width + x) * 4;
      if (i >= data.length) continue;
      r += data[i];
      g += data[i + 1];
      b += data[i + 2];
      count += 1;
    }
  }

  if (!count) {
    return { r: 0, g: 0, b: 0 };
  }
  return {
    r: Math.round(r / count),
    g: Math.round(g / count),
    b: Math.round(b / count),
  };
};

const pseudoRandom = (x: number, y: number) => {
  return Math.abs(Math.sin(x * 12.9898 + y * 78.233) * 43758.5453) % 1;
};

export const renderGlassMosaic = (
  canvas: HTMLCanvasElement,
  image: HTMLImageElement,
  options: GlassMosaicOptions
) => {
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  if (!ctx) return;

  const { width, height } = image;
  canvas.width = width;
  canvas.height = height;

  ctx.drawImage(image, 0, 0);
  const imageData = ctx.getImageData(0, 0, width, height);
  const data = imageData.data;

  ctx.clearRect(0, 0, width, height);
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, width, height);

  const { cellSize, gap, bevelIntensity, glassOpacity, innerShine, renderShape, sparkleIntensity } = options;

  for (let y = 0; y < height; y += cellSize) {
    for (let x = 0; x < width; x += cellSize) {
      const w = Math.min(cellSize, width - x);
      const h = Math.min(cellSize, height - y);
      const color = getAverageColor(data, width, x, y, w, h);

      const drawX = x + gap / 2;
      const drawY = y + gap / 2;
      const drawW = Math.max(0, w - gap);
      const drawH = Math.max(0, h - gap);
      if (drawW <= 0 || drawH <= 0) continue;

      const rnd = pseudoRandom(x, y);
      const isSparkle = rnd < sparkleIntensity;

      ctx.save();
      ctx.beginPath();
      if (renderShape === 'circle') {
        const radius = Math.min(drawW, drawH) / 2;
        ctx.arc(drawX + drawW / 2, drawY + drawH / 2, radius, 0, Math.PI * 2);
      } else {
        ctx.rect(drawX, drawY, drawW, drawH);
      }
      ctx.clip();

      ctx.fillStyle = `rgb(${color.r}, ${color.g}, ${color.b})`;
      ctx.fill();

      const surfaceGrad = ctx.createLinearGradient(drawX, drawY, drawX + drawW, drawY + drawH);
      surfaceGrad.addColorStop(0, `rgba(255, 255, 255, ${glassOpacity + 0.1})`);
      surfaceGrad.addColorStop(1, 'rgba(255, 255, 255, 0)');
      ctx.fillStyle = surfaceGrad;
      ctx.fill();

      if (bevelIntensity > 0) {
        ctx.fillStyle = `rgba(255, 255, 255, ${bevelIntensity})`;
        ctx.fillRect(drawX, drawY, drawW, Math.max(1, drawH * 0.05));

        ctx.fillStyle = `rgba(255, 255, 255, ${bevelIntensity * 0.8})`;
        ctx.fillRect(drawX, drawY, Math.max(1, drawW * 0.05), drawH);

        ctx.fillStyle = `rgba(0, 0, 0, ${bevelIntensity * 0.4})`;
        ctx.fillRect(drawX, drawY + drawH - Math.max(1, drawH * 0.02), drawW, Math.max(1, drawH * 0.02));
        ctx.fillRect(drawX + drawW - Math.max(1, drawW * 0.02), drawY, Math.max(1, drawW * 0.02), drawH);
      }

      if (isSparkle) {
        ctx.save();
        ctx.shadowColor = 'white';
        ctx.shadowBlur = 8;
        ctx.fillStyle = '#ffffff';

        const edgePos = (rnd * 100) % 2 < 1 ? 'top' : 'left';
        if (edgePos === 'top') {
          const glintW = drawW * 0.3;
          const glintX = drawX + drawW * 0.1 + rnd * (drawW * 0.5);
          ctx.fillRect(glintX, drawY, glintW, Math.max(2, drawH * 0.08));
        } else {
          const glintH = drawH * 0.3;
          const glintY = drawY + drawH * 0.1 + rnd * (drawH * 0.5);
          ctx.fillRect(drawX, glintY, Math.max(2, drawW * 0.08), glintH);
        }
        ctx.restore();
      }

      if (innerShine > 0) {
        const sheenGrad = ctx.createLinearGradient(drawX, drawY, drawX + drawW, drawY + drawH * 0.8);
        sheenGrad.addColorStop(0, `rgba(255, 255, 255, ${innerShine * 0.3})`);
        sheenGrad.addColorStop(0.3, 'rgba(255, 255, 255, 0)');
        ctx.fillStyle = sheenGrad;
        ctx.fill();
      }

      ctx.lineWidth = 0.5;
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.2)';
      ctx.stroke();
      ctx.restore();
    }
  }
};

export const loadImageElement = (src: string) => {
  return new Promise<HTMLImageElement>((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });
};

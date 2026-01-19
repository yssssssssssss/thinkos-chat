import React, { useRef, useEffect, useState, useCallback, useImperativeHandle, forwardRef } from 'react';
import { Particle, ParticleConfig } from '../types';

interface ParticleSystemProps {
  imageSrc: string | null;
  config: ParticleConfig;
  width: number;
  height: number;
}

export interface ParticleSystemHandle {
  exportImage: () => void;
  recordVideo: (duration: number) => void;
}

// Helper to convert hex to rgb
function hexToRgb(hex: string) {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result ? {
    r: parseInt(result[1], 16),
    g: parseInt(result[2], 16),
    b: parseInt(result[3], 16)
  } : { r: 255, g: 255, b: 255 };
}

const ParticleSystem = forwardRef<ParticleSystemHandle, ParticleSystemProps>(({ imageSrc, config, width, height }, ref) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const requestRef = useRef<number>(0);
  const particlesRef = useRef<Particle[]>([]);
  const mouseRef = useRef({ x: 0, y: 0, isActive: false });
  const [isProcessing, setIsProcessing] = useState(false);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const recordedChunksRef = useRef<Blob[]>([]);
  
  // State to hold the actual render resolution (matches image size)
  const [resolution, setResolution] = useState({ width: 800, height: 600 });

  // Expose methods to parent
  useImperativeHandle(ref, () => ({
    exportImage: () => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const link = document.createElement('a');
      link.download = `lumina-particles-${Date.now()}.png`;
      link.href = canvas.toDataURL('image/png');
      link.click();
    },
    recordVideo: (duration: number) => {
      const canvas = canvasRef.current;
      if (!canvas) return;

      // Capture at native resolution of canvas
      const stream = canvas.captureStream(60); 
      const options = { mimeType: 'video/webm; codecs=vp9' };
      
      try {
        const mediaRecorder = new MediaRecorder(stream, options);
        mediaRecorderRef.current = mediaRecorder;
        recordedChunksRef.current = [];

        mediaRecorder.ondataavailable = (event) => {
          if (event.data.size > 0) {
            recordedChunksRef.current.push(event.data);
          }
        };

        mediaRecorder.onstop = () => {
          const blob = new Blob(recordedChunksRef.current, { type: 'video/webm' });
          const url = URL.createObjectURL(blob);
          const link = document.createElement('a');
          link.href = url;
          link.download = `lumina-animation-${Date.now()}.webm`;
          link.click();
          URL.revokeObjectURL(url);
        };

        mediaRecorder.start();

        setTimeout(() => {
          if (mediaRecorder.state === 'recording') {
            mediaRecorder.stop();
          }
        }, duration);

      } catch (e) {
        console.error("MediaRecorder not supported or codec issue:", e);
        alert("Your browser does not support transparent WebM recording. Try using Chrome or Firefox.");
      }
    }
  }));

  // Initialize Particles from Image
  const initParticles = useCallback(() => {
    if (!imageSrc || !canvasRef.current) return;

    setIsProcessing(true);
    const img = new Image();
    img.crossOrigin = "Anonymous";
    img.src = imageSrc;

    img.onload = () => {
      // Use actual image size for canvas resolution
      const nativeWidth = img.width;
      const nativeHeight = img.height;
      setResolution({ width: nativeWidth, height: nativeHeight });

      // Downsample for analysis to keep particle count reasonable, but map positions to full native resolution
      const MAX_ANALYSIS_SIZE = 400;
      const scaleAnalysis = Math.min(1, MAX_ANALYSIS_SIZE / Math.max(nativeWidth, nativeHeight));
      const analysisW = Math.floor(nativeWidth * scaleAnalysis);
      const analysisH = Math.floor(nativeHeight * scaleAnalysis);

      const tempCanvas = document.createElement('canvas');
      tempCanvas.width = analysisW;
      tempCanvas.height = analysisH;
      const tempCtx = tempCanvas.getContext('2d', { willReadFrequently: true });
      
      if (!tempCtx) {
        setIsProcessing(false);
        return;
      }

      tempCtx.drawImage(img, 0, 0, analysisW, analysisH);
      const imageData = tempCtx.getImageData(0, 0, analysisW, analysisH);
      const data = imageData.data;
      const newParticles: Particle[] = [];
      
      const step = Math.max(1, Math.floor(config.particleDensity));
      
      for (let y = 0; y < analysisH; y += step) {
        for (let x = 0; x < analysisW; x += step) {
          const index = (y * analysisW + x) * 4;
          const alpha = data[index + 3];
          
          if (alpha > 30) {
            const r = data[index];
            const g = data[index + 1];
            const b = data[index + 2];
            
            // Map analysis coordinate (small) to Native Canvas Coordinate (large)
            // No offset needed because we are using the full canvas size matching the image
            const screenX = (x / analysisW) * nativeWidth;
            const screenY = (y / analysisH) * nativeHeight;

            newParticles.push({
              x: screenX, 
              y: screenY,
              originX: screenX,
              originY: screenY,
              vx: 0,
              vy: 0,
              r: r,
              g: g,
              b: b,
              randomFactor: Math.random(), 
              angle: Math.random() * Math.PI * 2,
              life: Math.random()
            });
          }
        }
      }

      particlesRef.current = newParticles;
      setIsProcessing(false);
    };
  }, [imageSrc, config.particleDensity]); // Removed width/height dependency as we use image natural size

  useEffect(() => {
    initParticles();
  }, [initParticles]);

  const animate = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Use current resolution state for clearing
    ctx.clearRect(0, 0, resolution.width, resolution.height);
    
    ctx.globalCompositeOperation = 'screen'; 

    const particles = particlesRef.current;
    const { 
      disruption, 
      mouseRadius, 
      mouseForce, 
      brightness, 
      particleSize, 
      glowIntensity, 
      sizeVariance,
      flowAngle,
      flowSpeed,
      fadeRate,
      useSourceColor,
      customColor
    } = config;

    const flowRad = (flowAngle * Math.PI) / 180;
    const customRGB = !useSourceColor ? hexToRgb(customColor) : null;

    for (let i = 0; i < particles.length; i++) {
      const p = particles[i];

      // --- PHYSICS ---
      const ageFactor = 1.0 - p.life; 
      const acceleration = 1 + (ageFactor * 3); 
      const spread = (p.randomFactor - 0.5) * disruption * (1 + ageFactor * 2); 
      const finalAngle = flowRad + spread;

      const currentSpeed = flowSpeed * acceleration;
      const moveX = Math.cos(finalAngle) * currentSpeed;
      const moveY = Math.sin(finalAngle) * currentSpeed;

      // --- MOUSE ---
      let mouseVx = 0;
      let mouseVy = 0;
      if (mouseRef.current.isActive) {
        const dx = p.x - mouseRef.current.x;
        const dy = p.y - mouseRef.current.y;
        const distance = Math.sqrt(dx * dx + dy * dy);
        
        // Adjust mouse radius logic if resolution is very high (optional, but good for UX)
        // Let's scale mouse radius by resolution ratio to keep feel consistent?
        // For now, keep as is, assumes user adjusts radius slider for large images.
        if (distance < mouseRadius) {
          const forceDirectionX = dx / distance;
          const forceDirectionY = dy / distance;
          const force = (mouseRadius - distance) / mouseRadius;
          const repulsion = force * mouseForce;
          
          mouseVx = forceDirectionX * repulsion;
          mouseVy = forceDirectionY * repulsion;
        }
      }

      p.x += moveX + mouseVx;
      p.y += moveY + mouseVy;
      p.life -= fadeRate;

      if (p.life <= 0) {
        p.x = p.originX;
        p.y = p.originY;
        p.life = 1;
      }

      // --- DRAW ---
      const currentOpacity = p.life * brightness;

      if (currentOpacity > 0.01) {
          ctx.beginPath();
          
          const scale = 1 + (p.randomFactor - 0.5) * 2 * (sizeVariance ?? 0);
          const finalRadius = Math.max(0.1, particleSize * scale); 
          
          ctx.arc(p.x, p.y, finalRadius, 0, Math.PI * 2);
          
          let r, g, b;
          if (useSourceColor || !customRGB) {
            r = Math.min(255, p.r * currentOpacity);
            g = Math.min(255, p.g * currentOpacity);
            b = Math.min(255, p.b * currentOpacity);
          } else {
            r = Math.min(255, customRGB.r * currentOpacity);
            g = Math.min(255, customRGB.g * currentOpacity);
            b = Math.min(255, customRGB.b * currentOpacity);
          }
          
          ctx.fillStyle = `rgb(${r}, ${g}, ${b})`;
          
          if (glowIntensity > 0) {
            ctx.shadowBlur = glowIntensity * 5;
            ctx.shadowColor = `rgb(${r}, ${g}, ${b})`;
          } else {
            ctx.shadowBlur = 0;
          }
          
          ctx.fill();
      }
    }
    
    ctx.globalCompositeOperation = 'source-over';

    requestRef.current = requestAnimationFrame(animate);
  }, [resolution, config]); // Removed width/height, added resolution

  useEffect(() => {
    requestRef.current = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(requestRef.current);
  }, [animate]);

  const handleMouseMove = (e: React.MouseEvent) => {
    const rect = canvasRef.current?.getBoundingClientRect();
    if (rect) {
      // Map Mouse Screen Coordinates -> High Res Canvas Coordinates
      const scaleX = resolution.width / rect.width;
      const scaleY = resolution.height / rect.height;

      mouseRef.current = {
        x: (e.clientX - rect.left) * scaleX,
        y: (e.clientY - rect.top) * scaleY,
        isActive: true
      };
    }
  };

  const handleMouseLeave = () => {
    mouseRef.current.isActive = false;
  };

  return (
    <div className="relative w-full h-full overflow-hidden flex items-center justify-center">
      {isProcessing && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/80 z-20">
          <div className="text-cyan-400 animate-pulse text-xl font-mono tracking-widest">
            正在分析像素...
          </div>
        </div>
      )}
      {!imageSrc && (
        <div className="absolute text-gray-600 font-mono text-sm pointer-events-none">
          无图像输入
        </div>
      )}
      {/* 
        Canvas renders at full resolution (width/height attr).
        CSS max-width/max-height + object-fit ensures it fits in the view without scrollbars.
      */}
      <canvas
        ref={canvasRef}
        width={resolution.width}
        height={resolution.height}
        onMouseMove={handleMouseMove}
        onMouseLeave={handleMouseLeave}
        className="cursor-crosshair block"
        style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain' }}
      />
    </div>
  );
});

export default ParticleSystem;
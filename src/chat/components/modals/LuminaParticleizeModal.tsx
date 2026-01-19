import React, { useEffect, useRef, useState } from 'react';
import { X } from 'lucide-react';
import ParticleSystem, { ParticleSystemHandle } from '../particleize/ParticleSystem';
import Controls from '../particleize/Controls';
import type { ParticleConfig } from '../particleize/types';

interface LuminaParticleizeModalProps {
  imageSrc: string | null;
  setImageSrc: React.Dispatch<React.SetStateAction<string | null>>;
  config: ParticleConfig;
  setConfig: React.Dispatch<React.SetStateAction<ParticleConfig>>;
  onClose: () => void;
  onVideoExported?: (blob: Blob, filename: string) => void;
}

const LuminaParticleizeModal: React.FC<LuminaParticleizeModalProps> = ({
  imageSrc,
  setImageSrc,
  config,
  setConfig,
  onClose,
  onVideoExported,
}) => {
  const particleSystemRef = useRef<ParticleSystemHandle>(null);
  const [dimensions, setDimensions] = useState({ width: window.innerWidth, height: window.innerHeight });

  useEffect(() => {
    const handleResize = () => {
      setDimensions({ width: window.innerWidth, height: window.innerHeight });
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const handleImageUpload = (file: File) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      if (e.target?.result) {
        setImageSrc(e.target.result as string);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleExport = () => {
    particleSystemRef.current?.exportImage();
  };

  const handleRecord = (duration: number) => {
    particleSystemRef.current?.recordVideo(duration);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4" onClick={onClose}>
      <div
        className="w-full max-w-7xl h-[92vh] bg-black rounded-2xl shadow-2xl overflow-hidden flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="px-4 py-3 border-b border-gray-800 flex items-center justify-between">
          <div className="text-sm font-mono text-gray-300">Lumina Particleize</div>
          <button onClick={onClose} className="p-2 hover:bg-white/5 rounded-xl transition">
            <X className="w-5 h-5 text-gray-300" />
          </button>
        </div>

        <div className="flex-1 flex overflow-hidden">
          <div className="flex-1 relative flex items-center justify-center p-6">
            <ParticleSystem
              ref={particleSystemRef}
              imageSrc={imageSrc}
              config={config}
              width={dimensions.width - 320}
              height={dimensions.height}
              onVideoExported={onVideoExported}
            />
          </div>

          <div className="w-80 h-full flex-shrink-0 z-10">
            <Controls
              config={config}
              setConfig={setConfig}
              onImageUpload={handleImageUpload}
              onImageGenerated={setImageSrc}
              onExport={handleExport}
              onRecord={handleRecord}
            />
          </div>
        </div>
      </div>
    </div>
  );
};

export default LuminaParticleizeModal;

import React, { useState, useEffect, useRef } from 'react';
import ParticleSystem, { ParticleSystemHandle } from './components/ParticleSystem';
import Controls from './components/Controls';
import { ParticleConfig } from './types';

// Default configuration updated for the Flow effect
const DEFAULT_CONFIG: ParticleConfig = {
  particleSize: 1.8,
  particleDensity: 4, 
  disruption: 0.5, // Angle spread
  returnSpeed: 0.08, 
  scatterLimit: 0, 
  mouseRadius: 80,
  mouseForce: 10,
  friction: 0.90,
  brightness: 1.5, 
  glowIntensity: 1.2, 
  sizeVariance: 1.0, 
  pulseSpeed: 0, 
  pulseAmplitude: 0,
  // Flow Defaults
  flowAngle: 90, // Downwards
  flowSpeed: 1.5,
  fadeRate: 0.02,
  // New Color Defaults
  customColor: '#00ffff',
  useSourceColor: true,
  // Export Defaults
  recordDuration: 3.0,
};

const DEFAULT_IMAGE = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAJAAAACQCAYAAADnRuK4AAAACXBIWXMAAAsTAAALEwEAmpwYAAAFwUlEQVR4nO2dTXLTQBSFzx92mFwhK1Zt2CErYIeQFVt2yAqwYosVsgFWSAq7bNkBoxRB0UWyPpZGenpG0ki24/G8qlJppfl67vek1k0mEwghhBBCCCFEazb9D/B/W2ttjTEHxpij0t/Hxpj90t9vjTHH/X7/q8t3oza9Xu+qtfaqtfa6tfa69P/XpZ/bWmt/G2N+lP7+vN/vf3f1ptT00cO+tfamtfa2M4J4fDPGfCyJ9LWrt6aW3W73sCTO204J4/F1SeBvXb49Ndxut/eNMZ9bIYrHr9bazzU00O12e2eM+dEaUTy+l23Xl67eoBq22+2jlsji8a0k0Oeurq4S7Xa7J8aYrwMkjMe3ss363tXVVcJ2u31ujPk6UMI4fCvbrm9dXVwlZLvo+0AJ4/C9JNCnq4urhP3+/sAY83OghHH4Wbbd37u6uErIluB9B4Tx+F623V+7urhK2O/3R8aYbwMljMM3Y8zXfr8/cnVxlZAtxfsOCePxtWy7v3Z1cZWQLcn7Dgnj8a1suz93dXGVkC3N+w4J4/GjbLvfu7q4SsiW6H2HhPH4Ubbd711dXCXYEv24I8J4fC/b7reuLq4SbMn+uCPC+Pwo2+53VxdXCbbEf9wRYTx+lG33u6uLqwRb8j/uiDAeP8q2+9XVRVbCfr//XRLo+wAJe5dE+uLqIivh4uLi+wAJe5dt+Iuri6yEs7Oz7wMk7F224S+uLrISzs7Ovg+QsHfZhr+4ushKODs7+z5Awt5lG/7i6iIr4ezs7PsACXuXbfiLq4ushLOzs+8DJOxdtuEvri6yEs7Ozr4PkLB32Ya/uLrISjg7O/s+QMLeZRv+4uoiK+Hi4uL7AAl7l234i6uLrIT9fv+7JNB3g4T9KNvuV1cXWQm25H/cEWE8fpRt993VRVaCLfEfd0QYj+9l2/3W1UVWgi3ZjzsijMePsu1+7+oiK8GW6H2HhPH4Ubbd711dZCXY0rzvkDAe38q2+3NXF1kJ2ZK875AwHl/Ltvsr+7tN0Igsyd93SBiPb8aYr/1+f9T4i6sC2RK875AwHj/Ltvt74y+uCrJd9H2ghHH4XhLoU+MvrgqyXfZ9oIRx+Fa2Xd8bf3FVsN1unxtjvg6UMA7fSgJ9bvzFVcF2u31sjPkyoIRx+FYS6HPjL64Kut3uXmvE8fherlF96eriquF2u71vjPncClE8frXWfm7yB45d6Xa7h8aYj60QxeObMeZjyZ9u6/oNqqH0x+e3rRHH4+vS/3/r8u2pabfbXbXW3rTW3nZGEMdvxpjfJYE+d/XW1LLf739ba38bY36U/v68g/d1gC+l//+8g/d9mEwm/f8B/m9L//i+McYcl/4+Nsbsc4lICCGEEEIIIYQQQgghhBBCCCGEEEIIIYQQQgghhBBCCCGEEEIIIYQQQgghhBBCCCFE//wB+3an44+zW3kAAAAASUVORK5CYII=";

const App: React.FC = () => {
  const [config, setConfig] = useState<ParticleConfig>(DEFAULT_CONFIG);
  const [imageSrc, setImageSrc] = useState<string | null>(DEFAULT_IMAGE);
  const [dimensions, setDimensions] = useState({ width: window.innerWidth, height: window.innerHeight });
  const particleSystemRef = useRef<ParticleSystemHandle>(null);

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

  const handleImageGenerated = (url: string) => {
    setImageSrc(url);
  };

  const handleExport = () => {
    if (particleSystemRef.current) {
      particleSystemRef.current.exportImage();
    }
  };

  const handleRecord = (duration: number) => {
    if (particleSystemRef.current) {
      particleSystemRef.current.recordVideo(duration);
    }
  }

  return (
    <div className="flex h-screen w-screen bg-black overflow-hidden">
      {/* Main Canvas Area */}
      <div className="flex-1 relative flex items-center justify-center p-8">
        <ParticleSystem 
          ref={particleSystemRef}
          imageSrc={imageSrc}
          config={config}
          // Note: width/height props here are just initial hints or fallbacks now.
          // The ParticleSystem will resize itself to the image content.
          width={dimensions.width - 320} 
          height={dimensions.height}
        />
      </div>

      {/* Sidebar Controls */}
      <div className="w-80 h-full flex-shrink-0 z-10">
        <Controls 
          config={config}
          setConfig={setConfig}
          onImageUpload={handleImageUpload}
          onImageGenerated={handleImageGenerated}
          onExport={handleExport}
          onRecord={handleRecord}
        />
      </div>
    </div>
  );
};

export default App;
import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Upload, Image as ImageIcon, Download, RefreshCw, ZoomIn, Info } from 'lucide-react';
import { ControlPanel } from './components/ControlPanel';
import { Button } from './components/Button';
import { ProcessingOptions } from './types';
import { processImage } from './utils/canvasUtils';

const DEFAULT_OPTIONS: ProcessingOptions = {
  cellSize: 20,
  glassOpacity: 0.2,
  bevelIntensity: 0.3,
  innerShine: 0.5,
  gap: 0,
  renderShape: 'square',
  sparkleIntensity: 0.15
};

function App() {
  const [imageSrc, setImageSrc] = useState<string | null>(null);
  const [options, setOptions] = useState<ProcessingOptions>(DEFAULT_OPTIONS);
  const [isProcessing, setIsProcessing] = useState(false);
  const [canvasUrl, setCanvasUrl] = useState<string | null>(null);
  
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const imgRef = useRef<HTMLImageElement>(new Image());
  const containerRef = useRef<HTMLDivElement>(null);

  // Initialize image ref handler
  useEffect(() => {
    imgRef.current.crossOrigin = "anonymous";
    imgRef.current.onload = () => {
      handleProcess();
    };
  }, []);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        if (event.target?.result) {
          setImageSrc(event.target.result as string);
          imgRef.current.src = event.target.result as string;
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const handleProcess = useCallback(() => {
    if (!canvasRef.current || !imgRef.current.src) return;
    
    setIsProcessing(true);
    
    // Use requestAnimationFrame to prevent UI blocking on heavy renders
    requestAnimationFrame(() => {
      if (canvasRef.current) {
        processImage(canvasRef.current, imgRef.current, options);
        // Create a URL for download purposes
        setCanvasUrl(canvasRef.current.toDataURL('image/png'));
      }
      setIsProcessing(false);
    });
  }, [options]);

  // Trigger processing when options change, but debounce slightly for sliders
  useEffect(() => {
    if (imageSrc) {
      const timer = setTimeout(handleProcess, 50);
      return () => clearTimeout(timer);
    }
  }, [options, imageSrc, handleProcess]);

  const handleDownload = () => {
    if (canvasUrl) {
      const link = document.createElement('a');
      link.download = `glass-mosaic-${Date.now()}.png`;
      link.href = canvasUrl;
      link.click();
    }
  };

  return (
    <div className="flex flex-col md:flex-row h-screen bg-gray-900 text-white">
      {/* Sidebar Controls */}
      <ControlPanel 
        options={options} 
        onChange={setOptions} 
        onDownload={handleDownload}
        isProcessing={isProcessing}
      />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 bg-gray-950 relative">
        
        {/* Top Bar */}
        <header className="h-16 bg-gray-900 border-b border-gray-800 flex items-center justify-between px-6 z-20">
          <div className="flex items-center space-x-3">
            <div className="bg-indigo-600 p-2 rounded-lg">
              <RefreshCw className="w-5 h-5 text-white" />
            </div>
            <h1 className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-indigo-400 to-purple-400">
              Glass Mosaic Studio
            </h1>
          </div>
          
          <div className="flex items-center space-x-4">
             <label className="cursor-pointer group">
                <input 
                  type="file" 
                  accept="image/*" 
                  onChange={handleFileUpload} 
                  className="hidden" 
                />
                <div className="flex items-center px-4 py-2 rounded-lg bg-gray-800 hover:bg-gray-700 border border-gray-700 transition-colors">
                  <Upload className="w-4 h-4 mr-2 text-indigo-400 group-hover:text-indigo-300" />
                  <span className="text-sm font-medium">Upload Image</span>
                </div>
              </label>
          </div>
        </header>

        {/* Canvas Workspace */}
        <main className="flex-1 overflow-hidden relative flex items-center justify-center bg-[url('https://www.transparenttextures.com/patterns/dark-matter.png')]">
          
          {/* Empty State */}
          {!imageSrc && (
            <div className="text-center p-12 rounded-2xl border-2 border-dashed border-gray-700 bg-gray-900/50 backdrop-blur-sm max-w-md mx-4">
              <div className="w-20 h-20 bg-gray-800 rounded-full flex items-center justify-center mx-auto mb-6">
                <ImageIcon className="w-10 h-10 text-gray-500" />
              </div>
              <h3 className="text-xl font-bold text-white mb-2">No Image Selected</h3>
              <p className="text-gray-400 mb-6">Upload a photo to start creating your glass mosaic masterpiece.</p>
              <label className="cursor-pointer inline-flex items-center justify-center px-6 py-3 border border-transparent text-base font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-500/30">
                <input 
                  type="file" 
                  accept="image/*" 
                  onChange={handleFileUpload} 
                  className="hidden" 
                />
                <Upload className="w-5 h-5 mr-2" />
                Select Photo
              </label>
            </div>
          )}

          {/* Canvas Container */}
          <div 
            ref={containerRef}
            className={`relative max-w-full max-h-full p-8 transition-opacity duration-300 ${imageSrc ? 'opacity-100' : 'opacity-0 hidden'}`}
          >
             <div className="relative shadow-2xl shadow-black/50 rounded-lg overflow-hidden border border-gray-800 bg-gray-900">
               <canvas 
                 ref={canvasRef}
                 className="max-w-full max-h-[80vh] object-contain block mx-auto"
                 style={{ imageRendering: 'pixelated' }}
               />
               {isProcessing && (
                 <div className="absolute inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center">
                   <div className="flex flex-col items-center">
                     <div className="w-10 h-10 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin mb-3"></div>
                     <span className="text-indigo-300 font-medium">Rendering Mosaic...</span>
                   </div>
                 </div>
               )}
             </div>
             
             <div className="absolute top-4 right-4 flex space-x-2">
                <div className="bg-black/70 backdrop-blur text-xs px-3 py-1.5 rounded-full text-white border border-white/10 flex items-center">
                  <ZoomIn className="w-3 h-3 mr-1.5 text-indigo-400" />
                  Original Resolution
                </div>
             </div>
          </div>
          
        </main>
      </div>
    </div>
  );
}

export default App;
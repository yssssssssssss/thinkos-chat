import React, { useState } from 'react';
import { ParticleConfig, GenerationStatus } from './types';
import { generateLuminaParticleizeSourceImage } from '../../../../services/luminaParticleizeService';

interface ControlsProps {
  config: ParticleConfig;
  setConfig: React.Dispatch<React.SetStateAction<ParticleConfig>>;
  onImageUpload: (file: File) => void;
  onImageGenerated: (url: string) => void;
  onExport: () => void;
  onRecord: (duration: number) => void;
}

const Slider: React.FC<{
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  onChange: (val: number) => void;
}> = ({ label, value, min, max, step, onChange }) => (
  <div className="mb-4">
    <div className="flex justify-between text-xs font-mono text-cyan-300 mb-1">
      <span>{label}</span>
      <span>{value.toFixed(2)}</span>
    </div>
    <input
      type="range"
      min={min}
      max={max}
      step={step}
      value={value}
      onChange={(e) => onChange(parseFloat(e.target.value))}
      className="w-full h-1 bg-gray-800 rounded-lg appearance-none cursor-pointer accent-cyan-500 hover:accent-cyan-400 focus:outline-none"
    />
  </div>
);

const Controls: React.FC<ControlsProps> = ({
  config,
  setConfig,
  onImageUpload,
  onImageGenerated,
  onExport,
  onRecord,
}) => {
  const [prompt, setPrompt] = useState('');
  const [genStatus, setGenStatus] = useState<GenerationStatus>(GenerationStatus.IDLE);
  const [isRecording, setIsRecording] = useState(false);

  const handleGenerate = async () => {
    if (!prompt.trim()) return;
    setGenStatus(GenerationStatus.GENERATING);
    try {
      const url = await generateLuminaParticleizeSourceImage(prompt);
      onImageGenerated(url);
      setGenStatus(GenerationStatus.SUCCESS);
    } catch {
      setGenStatus(GenerationStatus.ERROR);
    } finally {
      setTimeout(() => setGenStatus(GenerationStatus.IDLE), 3000);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      onImageUpload(e.target.files[0]);
    }
  };

  const startRecording = () => {
    setIsRecording(true);
    const durationMs = config.recordDuration * 1000;
    onRecord(durationMs);
    setTimeout(() => {
      setIsRecording(false);
    }, durationMs);
  };

  return (
    <div className="w-full h-full bg-black/90 border-l border-gray-800 p-6 flex flex-col backdrop-blur-sm shadow-2xl overflow-y-auto">
      <h1 className="text-2xl font-bold text-white mb-2 tracking-tighter">LUMINA 粒子化</h1>
      <p className="text-xs text-gray-500 mb-6 font-mono border-b border-gray-800 pb-4">图形粒子合成引擎</p>

      <div className="mb-8 space-y-4">
        <label className="block">
          <span className="text-xs font-mono text-cyan-500 block mb-2">上传图片源</span>
          <input
            type="file"
            accept="image/*"
            onChange={handleFileChange}
            className="block w-full text-xs text-gray-400
              file:mr-4 file:py-2 file:px-4
              file:rounded-none file:border-0
              file:text-xs file:font-semibold
              file:bg-cyan-900/30 file:text-cyan-400
              hover:file:bg-cyan-900/50 cursor-pointer"
          />
        </label>

        <div className="relative">
          <span className="text-xs font-mono text-pink-500 block mb-2">AI 生成 (Gemini)</span>
          <div className="flex gap-2">
            <input
              type="text"
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder="例如：发光的六边形护盾"
              className="flex-1 bg-gray-900 border border-gray-700 text-white text-xs p-2 focus:border-pink-500 focus:outline-none placeholder-gray-600"
            />
            <button
              onClick={handleGenerate}
              disabled={genStatus === GenerationStatus.GENERATING}
              className={`px-3 py-2 text-xs font-bold font-mono transition-colors border ${
                genStatus === GenerationStatus.GENERATING
                  ? 'bg-pink-900/50 border-pink-800 text-pink-300 animate-pulse'
                  : 'bg-transparent border-pink-500 text-pink-500 hover:bg-pink-900/30'
              }`}
            >
              {genStatus === GenerationStatus.GENERATING ? '生成中...' : '生成'}
            </button>
          </div>
          {genStatus === GenerationStatus.ERROR && (
            <span className="text-[10px] text-red-500 mt-1 block">生成失败，请重试。</span>
          )}
        </div>
      </div>

      <div className="space-y-4 mb-8 border-b border-gray-800 pb-4">
        <h2 className="text-xs font-mono text-white/50">色彩设置</h2>

        <div className="flex items-center justify-between">
          <span className="text-xs font-mono text-cyan-300">使用源图颜色</span>
          <label className="relative inline-flex items-center cursor-pointer">
            <input
              type="checkbox"
              checked={config.useSourceColor}
              onChange={(e) => setConfig((p) => ({ ...p, useSourceColor: e.target.checked }))}
              className="sr-only peer"
            />
            <div className="w-9 h-5 bg-gray-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-cyan-600"></div>
          </label>
        </div>

        {!config.useSourceColor && (
          <div className="flex items-center justify-between">
            <span className="text-xs font-mono text-cyan-300">自定义颜色</span>
            <input
              type="color"
              value={config.customColor}
              onChange={(e) => setConfig((p) => ({ ...p, customColor: e.target.value }))}
              className="h-8 w-12 bg-transparent border-0 cursor-pointer"
            />
          </div>
        )}
      </div>

      <div className="space-y-2">
        <h2 className="text-xs font-mono text-white/50 mb-4">流体运动控制</h2>
        <Slider
          label="运动轨迹 (角度)"
          value={config.flowAngle}
          min={0}
          max={360}
          step={1}
          onChange={(v) => setConfig((p) => ({ ...p, flowAngle: v }))}
        />
        <Slider
          label="运动速度"
          value={config.flowSpeed}
          min={0}
          max={10}
          step={0.1}
          onChange={(v) => setConfig((p) => ({ ...p, flowSpeed: v }))}
        />
        <Slider
          label="轨迹随机性(散布)"
          value={config.disruption}
          min={0}
          max={3}
          step={0.1}
          onChange={(v) => setConfig((p) => ({ ...p, disruption: v }))}
        />
        <Slider
          label="消散速度 (数值越小拖尾越长)"
          value={config.fadeRate}
          min={0.005}
          max={0.1}
          step={0.001}
          onChange={(v) => setConfig((p) => ({ ...p, fadeRate: v }))}
        />

        <h2 className="text-xs font-mono text-white/50 mb-4 mt-8">基础参数</h2>
        <Slider
          label="基础大小"
          value={config.particleSize}
          min={0.5}
          max={5}
          step={0.1}
          onChange={(v) => setConfig((p) => ({ ...p, particleSize: v }))}
        />
        <Slider
          label="采样间隔 (密度)"
          value={config.particleDensity}
          min={1}
          max={10}
          step={1}
          onChange={(v) => setConfig((p) => ({ ...p, particleDensity: v }))}
        />
        <Slider
          label="亮度增强"
          value={config.brightness}
          min={0.5}
          max={3}
          step={0.1}
          onChange={(v) => setConfig((p) => ({ ...p, brightness: v }))}
        />
        <Slider
          label="鼠标交互力度"
          value={config.mouseForce}
          min={0}
          max={100}
          step={1}
          onChange={(v) => setConfig((p) => ({ ...p, mouseForce: v }))}
        />
      </div>

      <div className="mt-8 space-y-3">
        <div className="border-t border-gray-800 pt-4 mb-4">
          <h2 className="text-xs font-mono text-white/50 mb-4">导出设置</h2>
          <Slider
            label="录制时长 (秒)"
            value={config.recordDuration}
            min={1}
            max={15}
            step={0.5}
            onChange={(v) => setConfig((p) => ({ ...p, recordDuration: v }))}
          />
        </div>

        <button
          onClick={onExport}
          className="w-full bg-cyan-900/40 hover:bg-cyan-900/60 border border-cyan-500/50 text-cyan-300 py-3 text-xs font-mono tracking-wider transition-all"
        >
          导出图片 (PNG)
        </button>
        <button
          onClick={startRecording}
          disabled={isRecording}
          className={`w-full border py-3 text-xs font-mono tracking-wider transition-all ${
            isRecording
              ? 'bg-red-900/50 border-red-500/50 text-red-300 animate-pulse'
              : 'bg-purple-900/40 hover:bg-purple-900/60 border-purple-500/50 text-purple-300'
          }`}
        >
          {isRecording ? `录制中 (${config.recordDuration}s)...` : '导出透明视频 (WebM)'}
        </button>
      </div>
    </div>
  );
};

export default Controls;


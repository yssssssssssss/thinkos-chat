/**
 * Video→GIF 工具弹窗
 * 在当前应用内完成视频上传、参数设置与 GIF 转换（带进度与预计耗时）
 */

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Download, Film, Loader2, Play, Settings, Upload, X } from 'lucide-react';
import { FFmpeg } from '../../../../reference/jdc-video2gif/node_modules/@ffmpeg/ffmpeg/dist/esm/index.js';
import { toBlobURL } from '../../../../reference/jdc-video2gif/node_modules/@ffmpeg/util/dist/esm/index.js';

type VideoInfo = {
  name: string;
  size: number;
  duration: number;
  width: number;
  height: number;
  format: string;
};

type GifConversionOptions = {
  fps: number;
  startTime: number; // seconds
  endTime: number; // seconds
  width?: number;
  height?: number;
  maxColors: number; // 8-256
};

type ConversionProgress = {
  percentage: number;
  stage: 'initializing' | 'processing' | 'generating' | 'finalizing';
  stageText: string;
  estimatedTimeRemaining?: number; // seconds
  currentFrame?: number;
  totalFrames?: number;
};

type ConversionResult = {
  blob: Blob;
  size: number;
  url: string;
  filename: string;
};

interface Video2GifModalProps {
  onClose: () => void;
}

const SUPPORTED_EXT = ['.mp4', '.mov', '.avi', '.mkv', '.webm'] as const;
const MAX_FILE_BYTES = 100 * 1024 * 1024;

const formatFileSize = (bytes: number): string => {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`;
};

const formatTime = (seconds: number): string => {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
};

const parseTime = (value: string): number => {
  const parts = value.split(':');
  if (parts.length !== 2) return 0;
  const mins = Number(parts[0]) || 0;
  const secs = Number(parts[1]) || 0;
  return Math.max(0, mins * 60 + secs);
};

const estimateGifSizeBytes = (videoInfo: VideoInfo, options: GifConversionOptions): number => {
  const duration = Math.max(0, options.endTime - options.startTime);
  const width = options.width || videoInfo.width;
  const height = options.height || videoInfo.height;
  const frameCount = duration * options.fps;
  const pixelCount = width * height;
  // 非严格估算：像素 * 帧数 * (颜色数/256) * 压缩系数
  const colorFactor = Math.max(8, Math.min(256, options.maxColors)) / 256;
  const compressionFactor = 0.18;
  return Math.round(pixelCount * frameCount * colorFactor * compressionFactor);
};

const downloadBlob = (blob: Blob, filename: string) => {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
};

const getVideoInfo = async (file: File): Promise<VideoInfo> => {
  const video = document.createElement('video');
  video.preload = 'metadata';
  const url = URL.createObjectURL(file);

  try {
    video.src = url;
    await new Promise<void>((resolve, reject) => {
      video.onloadedmetadata = () => resolve();
      video.onerror = () => reject(new Error('无法读取视频信息'));
    });

    return {
      name: file.name,
      size: file.size,
      duration: Number.isFinite(video.duration) ? video.duration : 0,
      width: video.videoWidth,
      height: video.videoHeight,
      format: file.type || 'unknown',
    };
  } finally {
    URL.revokeObjectURL(url);
  }
};

const isSupportedVideo = (file: File): boolean => {
  if (file.type.startsWith('video/')) return true;
  const lower = file.name.toLowerCase();
  return SUPPORTED_EXT.some((ext) => lower.endsWith(ext));
};

class FFmpegService {
  private ffmpeg: FFmpeg | null = null;
  private isLoaded = false;
  private isLoading = false;

  isReady(): boolean {
    return this.isLoaded;
  }

  private getLocalBaseUrl(): string {
    const base = import.meta.env.BASE_URL || '/';
    const normalized = base.endsWith('/') ? base : `${base}/`;
    return `${normalized}ffmpeg`;
  }

  private async checkLocalFiles(): Promise<boolean> {
    try {
      const base = this.getLocalBaseUrl();
      const paths = [`${base}/ffmpeg-core.js`, `${base}/ffmpeg-core.wasm`, `${base}/worker.js`];
      for (const p of paths) {
        const resp = await fetch(p, { method: 'HEAD' });
        if (!resp.ok) return false;
        const len = resp.headers.get('content-length');
        if (len && Number(len) < 1024) return false;
      }
      return true;
    } catch {
      return false;
    }
  }

  async initialize(onProgress?: (p: ConversionProgress) => void): Promise<void> {
    if (this.isLoaded || this.isLoading) return;

    this.isLoading = true;
    try {
      this.ffmpeg = new FFmpeg();
      this.ffmpeg.on('log', ({ message }) => {
        // eslint-disable-next-line no-console
        console.log('[FFmpeg]', message);
      });

      onProgress?.({ percentage: 0, stage: 'initializing', stageText: '正在检查 FFmpeg 资源…' });

      const hasLocal = await this.checkLocalFiles();
      const sources: Array<{ label: string; baseURL: string; hasWorker: boolean }> = [];

      if (hasLocal) {
        sources.push({ label: '本地资源', baseURL: this.getLocalBaseUrl(), hasWorker: true });
      }

      sources.push(
        { label: 'jsDelivr CDN', baseURL: 'https://cdn.jsdelivr.net/npm/@ffmpeg/core@0.12.10/dist/esm', hasWorker: true },
        { label: 'unpkg CDN', baseURL: 'https://unpkg.com/@ffmpeg/core@0.12.10/dist/esm', hasWorker: true }
      );

      let lastError: unknown = null;
      for (const s of sources) {
        try {
          onProgress?.({ percentage: 0, stage: 'initializing', stageText: `正在加载 FFmpeg（${s.label}）…` });
          const coreURL = await toBlobURL(`${s.baseURL}/ffmpeg-core.js`, 'text/javascript');
          const wasmURL = await toBlobURL(`${s.baseURL}/ffmpeg-core.wasm`, 'application/wasm');
          const workerURL = await toBlobURL(`${s.baseURL}/worker.js`, 'text/javascript');

          await this.ffmpeg.load({ coreURL, wasmURL, workerURL });
          this.isLoaded = true;
          return;
        } catch (e) {
          lastError = e;
        }
      }

      throw new Error(`FFmpeg 初始化失败：${lastError instanceof Error ? lastError.message : '未知错误'}`);
    } finally {
      this.isLoading = false;
    }
  }

  async convertToGif(
    file: File,
    info: VideoInfo,
    options: GifConversionOptions,
    onProgress?: (p: ConversionProgress) => void
  ): Promise<ConversionResult> {
    if (!this.isReady()) {
      await this.initialize(onProgress);
    }
    if (!this.ffmpeg) {
      throw new Error('FFmpeg 未初始化');
    }

    const startAt = Date.now();
    const duration = Math.max(0.01, options.endTime - options.startTime);
    const totalFrames = Math.ceil(duration * options.fps);

    const inputExt = file.name.split('.').pop() || 'mp4';
    const inputName = `input.${inputExt}`;
    const outputName = 'output.gif';

    onProgress?.({ percentage: 5, stage: 'processing', stageText: '正在准备文件…', totalFrames });

    await this.ffmpeg.writeFile(inputName, new Uint8Array(await file.arrayBuffer()));

    const args = this.buildArgs(inputName, outputName, options, info);

    const handleProgress = ({ progress }: { progress: number }) => {
      const pct = Math.max(0, Math.min(1, progress));
      const elapsed = (Date.now() - startAt) / 1000;
      const estimatedTotal = pct > 0.02 ? elapsed / pct : undefined;
      const estimatedTimeRemaining = estimatedTotal ? Math.max(0, estimatedTotal - elapsed) : undefined;

      const percentage = Math.round(pct * 100);
      let stage: ConversionProgress['stage'] = 'processing';
      let stageText = '正在处理视频…';

      if (percentage < 30) {
        stage = 'processing';
        stageText = '正在分析视频帧…';
      } else if (percentage < 85) {
        stage = 'generating';
        stageText = '正在生成 GIF…';
      } else {
        stage = 'finalizing';
        stageText = '正在优化输出…';
      }

      onProgress?.({
        percentage: Math.max(5, percentage),
        stage,
        stageText,
        estimatedTimeRemaining,
        currentFrame: Math.min(totalFrames, Math.max(0, Math.round(pct * totalFrames))),
        totalFrames,
      });
    };

    this.ffmpeg.on('progress', handleProgress);

    try {
      onProgress?.({ percentage: 10, stage: 'processing', stageText: '开始转换…', totalFrames });
      await this.ffmpeg.exec(args);

      onProgress?.({ percentage: 95, stage: 'finalizing', stageText: '正在读取输出…', totalFrames, currentFrame: totalFrames });

      const out = await this.ffmpeg.readFile(outputName);
      const bytes = new Uint8Array(out as Uint8Array);
      const blob = new Blob([bytes], { type: 'image/gif' });

      await this.ffmpeg.deleteFile(inputName);
      await this.ffmpeg.deleteFile(outputName);

      onProgress?.({ percentage: 100, stage: 'finalizing', stageText: '转换完成！', totalFrames, currentFrame: totalFrames });

      return {
        blob,
        size: blob.size,
        url: URL.createObjectURL(blob),
        filename: file.name.replace(/\.[^/.]+$/, '.gif'),
      };
    } finally {
      this.ffmpeg.off('progress', handleProgress);
    }
  }

  private buildArgs(
    inputName: string,
    outputName: string,
    options: GifConversionOptions,
    info: VideoInfo
  ): string[] {
    const args: string[] = [];

    // 先 seek 再输入，速度更快
    if (options.startTime > 0) {
      args.push('-ss', options.startTime.toString());
    }
    args.push('-i', inputName);
    if (options.endTime > options.startTime) {
      args.push('-t', (options.endTime - options.startTime).toString());
    }

    args.push('-r', Math.max(1, Math.min(30, options.fps)).toString());

    const targetW = options.width && options.width > 0 ? options.width : info.width;
    const targetH = options.height && options.height > 0 ? options.height : info.height;

    const maxColors = Math.max(8, Math.min(256, Math.round(options.maxColors)));
    const scaleFilter = `scale=${targetW}:${targetH}:flags=lanczos`;
    const paletteFilter = `palettegen=max_colors=${maxColors}`;
    const filterComplex = `[0:v] ${scaleFilter},split [a][b];[a] ${paletteFilter} [p];[b][p] paletteuse=dither=bayer:bayer_scale=5:diff_mode=rectangle`;

    args.push('-filter_complex', filterComplex);
    args.push('-loop', '0');
    args.push(outputName);
    return args;
  }
}

const ffmpegService = new FFmpegService();

export const Video2GifModal: React.FC<Video2GifModalProps> = ({ onClose }) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const videoObjectUrlRef = useRef<string | null>(null);
  const gifObjectUrlRef = useRef<string | null>(null);

  const [videoFile, setVideoFile] = useState<File | null>(null);
  const [videoInfo, setVideoInfo] = useState<VideoInfo | null>(null);
  const [options, setOptions] = useState<GifConversionOptions>({
    fps: 15,
    startTime: 0,
    endTime: 0,
    maxColors: 128,
  });
  const [startTimeInput, setStartTimeInput] = useState('00:00');
  const [endTimeInput, setEndTimeInput] = useState('00:00');
  const [maintainAspectRatio, setMaintainAspectRatio] = useState(true);

  const [isConverting, setIsConverting] = useState(false);
  const [progress, setProgress] = useState<ConversionProgress | null>(null);
  const [result, setResult] = useState<ConversionResult | null>(null);
  const [activeTab, setActiveTab] = useState<'video' | 'gif'>('video');
  const [error, setError] = useState<string | null>(null);

  const estimatedSizeBytes = useMemo(() => (videoInfo ? estimateGifSizeBytes(videoInfo, options) : 0), [videoInfo, options]);
  const selectedDuration = useMemo(() => Math.max(0, options.endTime - options.startTime), [options.endTime, options.startTime]);
  const totalFrames = useMemo(() => Math.max(0, Math.round(selectedDuration * options.fps)), [selectedDuration, options.fps]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  const cleanupVideoUrl = () => {
    if (videoObjectUrlRef.current) {
      URL.revokeObjectURL(videoObjectUrlRef.current);
      videoObjectUrlRef.current = null;
    }
  };

  const cleanupGifUrl = () => {
    if (gifObjectUrlRef.current) {
      URL.revokeObjectURL(gifObjectUrlRef.current);
      gifObjectUrlRef.current = null;
    }
  };

  useEffect(() => {
    return () => {
      cleanupVideoUrl();
      cleanupGifUrl();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const resetResult = () => {
    cleanupGifUrl();
    setResult(null);
    setActiveTab('video');
  };

  const handleSelectFile = async (file: File) => {
    if (!isSupportedVideo(file)) {
      setError(`不支持的文件格式。支持：${SUPPORTED_EXT.join(', ')}`);
      return;
    }
    if (file.size > MAX_FILE_BYTES) {
      setError(`文件过大，最大支持 ${formatFileSize(MAX_FILE_BYTES)}`);
      return;
    }

    setError(null);
    setProgress(null);
    resetResult();

    cleanupVideoUrl();
    setVideoFile(file);

    // 创建视频预览 URL
    videoObjectUrlRef.current = URL.createObjectURL(file);

    try {
      const info = await getVideoInfo(file);
      setVideoInfo(info);
      const end = info.duration || 0;
      setOptions((p) => ({
        ...p,
        startTime: 0,
        endTime: end,
        width: info.width,
        height: info.height,
      }));
      setStartTimeInput('00:00');
      setEndTimeInput(formatTime(end));
    } catch (e) {
      setError(e instanceof Error ? e.message : '读取视频信息失败');
      setVideoFile(null);
      setVideoInfo(null);
      cleanupVideoUrl();
    }
  };

  const handleConvert = useCallback(async () => {
    if (!videoFile || !videoInfo) {
      setError('请先上传视频文件');
      return;
    }

    if (options.endTime <= options.startTime) {
      setError('结束时间必须大于开始时间');
      return;
    }
    if (options.endTime > videoInfo.duration + 0.001) {
      setError('结束时间不能超过视频总时长');
      return;
    }

    const width = options.width || videoInfo.width;
    const height = options.height || videoInfo.height;
    if (width < 1 || height < 1 || width > 1920 || height > 1080) {
      setError('输出尺寸必须在 1×1 到 1920×1080 之间');
      return;
    }

    setIsConverting(true);
    setError(null);
    setProgress({ percentage: 0, stage: 'initializing', stageText: '准备开始…' });
    resetResult();

    try {
      const res = await ffmpegService.convertToGif(videoFile, videoInfo, options, (p) => setProgress(p));
      gifObjectUrlRef.current = res.url;
      setResult(res);
      setActiveTab('gif');
    } catch (e) {
      setError(e instanceof Error ? e.message : '转换失败');
    } finally {
      setIsConverting(false);
    }
  }, [options, videoFile, videoInfo]);

  const handleDownload = () => {
    if (!result) return;
    downloadBlob(result.blob, result.filename);
  };

  const handleTimeChange = (kind: 'start' | 'end', value: string) => {
    if (kind === 'start') setStartTimeInput(value);
    else setEndTimeInput(value);

    const seconds = parseTime(value);
    setOptions((p) => ({ ...p, [kind === 'start' ? 'startTime' : 'endTime']: seconds }));
  };

  const handleSizeChange = (kind: 'width' | 'height', value: string) => {
    const n = Math.max(0, Math.floor(Number(value) || 0));
    if (!videoInfo) {
      setOptions((p) => ({ ...p, [kind]: n || undefined }));
      return;
    }

    if (!maintainAspectRatio || n === 0) {
      setOptions((p) => ({ ...p, [kind]: n || undefined }));
      return;
    }

    const ratio = videoInfo.width / videoInfo.height;
    if (kind === 'width') {
      const h = Math.max(1, Math.round(n / ratio));
      setOptions((p) => ({ ...p, width: n, height: h }));
    } else {
      const w = Math.max(1, Math.round(n * ratio));
      setOptions((p) => ({ ...p, width: w, height: n }));
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4" onClick={onClose}>
      <div
        className="bg-white rounded-2xl shadow-2xl w-full max-w-6xl h-[90vh] overflow-hidden flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between">
          <div className="font-medium text-gray-800 flex items-center gap-2">
            <Film className="w-5 h-5 text-emerald-600" />
            视频转 GIF
          </div>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-xl transition-colors" title="关闭">
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto bg-gray-50">
          <div className="p-6 grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* 左侧：上传与预览 */}
            <div className="lg:col-span-2 space-y-4">
              {!videoFile ? (
                <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
                  <div className="flex items-center gap-2 mb-4">
                    <Upload className="w-5 h-5 text-blue-600" />
                    <h3 className="font-medium text-gray-900">上传视频</h3>
                  </div>
                  <div
                    className="border-2 border-dashed rounded-2xl p-10 text-center cursor-pointer transition-colors border-gray-200 hover:border-blue-300 hover:bg-blue-50/30"
                    onClick={() => fileInputRef.current?.click()}
                    onDragOver={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                    }}
                    onDrop={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      const f = e.dataTransfer.files?.[0];
                      if (f) void handleSelectFile(f);
                    }}
                  >
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="video/*"
                      className="hidden"
                      onChange={(e) => {
                        const f = e.target.files?.[0];
                        if (f) void handleSelectFile(f);
                        e.target.value = '';
                      }}
                    />
                    <div className="flex flex-col items-center gap-3">
                      <div className="w-14 h-14 rounded-2xl bg-blue-50 flex items-center justify-center">
                        <Upload className="w-7 h-7 text-blue-600" />
                      </div>
                      <div className="text-gray-700">
                        <div className="font-medium">拖拽视频到此处，或点击选择</div>
                        <div className="text-sm text-gray-500 mt-1">最大 {formatFileSize(MAX_FILE_BYTES)}</div>
                      </div>
                    </div>
                  </div>
                  <div className="mt-3 text-xs text-gray-500">支持：{SUPPORTED_EXT.join(' / ')}</div>
                </div>
              ) : (
                <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                  <div className="flex border-b border-gray-100">
                    <button
                      onClick={() => setActiveTab('video')}
                      className={`flex-1 px-4 py-3 text-sm font-medium transition-colors ${
                        activeTab === 'video' ? 'bg-blue-50 text-blue-700' : 'text-gray-500 hover:bg-gray-50'
                      }`}
                    >
                      视频预览
                    </button>
                    <button
                      onClick={() => setActiveTab('gif')}
                      disabled={!result}
                      className={`flex-1 px-4 py-3 text-sm font-medium transition-colors ${
                        activeTab === 'gif' ? 'bg-blue-50 text-blue-700' : 'text-gray-500 hover:bg-gray-50'
                      } ${!result ? 'opacity-50 cursor-not-allowed' : ''}`}
                    >
                      GIF 预览
                    </button>
                  </div>

                  <div className="p-5 space-y-4">
                    {activeTab === 'video' && (
                      <>
                        <div className="bg-gray-100 rounded-xl overflow-hidden">
                          <video
                            src={videoObjectUrlRef.current || undefined}
                            controls
                            className="w-full max-h-[52vh] object-contain bg-black"
                          />
                        </div>
                        {videoInfo && (
                          <div className="grid grid-cols-2 gap-3 text-xs text-gray-600">
                            <div>文件名：{videoInfo.name}</div>
                            <div>大小：{formatFileSize(videoInfo.size)}</div>
                            <div>分辨率：{videoInfo.width}×{videoInfo.height}</div>
                            <div>时长：{formatTime(videoInfo.duration)}</div>
                            <div>选择时长：{formatTime(selectedDuration)}</div>
                            <div>预估输出：{formatFileSize(estimatedSizeBytes)}</div>
                          </div>
                        )}
                      </>
                    )}

                    {activeTab === 'gif' && (
                      <>
                        {result ? (
                          <>
                            <div className="bg-gray-100 rounded-xl p-4 flex justify-center">
                              <img src={result.url} alt="GIF预览" className="max-w-full max-h-[52vh] object-contain rounded-lg bg-white" />
                            </div>
                            <div className="grid grid-cols-2 gap-3 text-xs text-gray-600">
                              <div>文件名：{result.filename}</div>
                              <div>大小：{formatFileSize(result.size)}</div>
                              <div>帧率：{options.fps} FPS</div>
                              <div>颜色：{options.maxColors} 色</div>
                              <div>尺寸：{options.width || videoInfo?.width}×{options.height || videoInfo?.height}</div>
                              <div>时长：{formatTime(selectedDuration)}</div>
                            </div>
                          </>
                        ) : (
                          <div className="text-sm text-gray-500 py-10 text-center">请先开始转换生成 GIF</div>
                        )}
                      </>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* 右侧：参数 + 转换 */}
            <div className="space-y-4">
              <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
                <div className="flex items-center gap-2 mb-4">
                  <Settings className="w-5 h-5 text-green-600" />
                  <div className="font-medium text-gray-900">转换参数</div>
                </div>

                {!videoInfo ? (
                  <div className="text-sm text-gray-500">请先上传视频文件</div>
                ) : (
                  <div className="space-y-5">
                    <div>
                      <label className="text-sm font-medium text-gray-700">时间范围（mm:ss）</label>
                      <div className="mt-2 grid grid-cols-2 gap-3">
                        <div>
                          <div className="text-xs text-gray-500 mb-1">开始</div>
                          <input
                            value={startTimeInput}
                            onChange={(e) => handleTimeChange('start', e.target.value)}
                            className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm"
                            placeholder="00:00"
                          />
                        </div>
                        <div>
                          <div className="text-xs text-gray-500 mb-1">结束</div>
                          <input
                            value={endTimeInput}
                            onChange={(e) => handleTimeChange('end', e.target.value)}
                            className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm"
                            placeholder="00:10"
                          />
                        </div>
                      </div>
                      <div className="text-xs text-gray-500 mt-2">建议控制在 10 秒以内，生成更快且文件更小</div>
                    </div>

                    <div>
                      <label className="text-sm font-medium text-gray-700">帧率（{options.fps} FPS）</label>
                      <input
                        type="range"
                        min={5}
                        max={30}
                        value={options.fps}
                        onChange={(e) => setOptions((p) => ({ ...p, fps: Number(e.target.value) }))}
                        className="mt-2 w-full"
                      />
                    </div>

                    <div>
                      <label className="text-sm font-medium text-gray-700">颜色数（{options.maxColors} 色）</label>
                      <select
                        value={options.maxColors}
                        onChange={(e) => setOptions((p) => ({ ...p, maxColors: Number(e.target.value) }))}
                        className="mt-2 w-full px-3 py-2 border border-gray-200 rounded-xl bg-white text-sm"
                      >
                        <option value={32}>32（更小）</option>
                        <option value={64}>64</option>
                        <option value={128}>128（推荐）</option>
                        <option value={256}>256（更清晰）</option>
                      </select>
                    </div>

                    <div>
                      <div className="flex items-center justify-between">
                        <label className="text-sm font-medium text-gray-700">输出尺寸</label>
                        <label className="text-xs text-gray-500 flex items-center gap-2">
                          <input
                            type="checkbox"
                            checked={maintainAspectRatio}
                            onChange={(e) => setMaintainAspectRatio(e.target.checked)}
                          />
                          保持比例
                        </label>
                      </div>
                      <div className="mt-2 grid grid-cols-2 gap-3">
                        <div>
                          <div className="text-xs text-gray-500 mb-1">宽</div>
                          <input
                            type="number"
                            value={options.width ?? ''}
                            onChange={(e) => handleSizeChange('width', e.target.value)}
                            placeholder={String(videoInfo.width)}
                            min={1}
                            max={1920}
                            className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm"
                          />
                        </div>
                        <div>
                          <div className="text-xs text-gray-500 mb-1">高</div>
                          <input
                            type="number"
                            value={options.height ?? ''}
                            onChange={(e) => handleSizeChange('height', e.target.value)}
                            placeholder={String(videoInfo.height)}
                            min={1}
                            max={1080}
                            className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm"
                          />
                        </div>
                      </div>
                    </div>

                    <div className="bg-gray-50 rounded-xl p-4 text-xs text-gray-600 space-y-1">
                      <div>选择时长：{formatTime(selectedDuration)}</div>
                      <div>帧数：{totalFrames} 帧</div>
                      <div>预估大小：{formatFileSize(estimatedSizeBytes)}</div>
                    </div>
                  </div>
                )}
              </div>

              <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
                <div className="font-medium text-gray-900 mb-3">转换</div>

                <button
                  onClick={() => void handleConvert()}
                  disabled={!videoFile || !videoInfo || isConverting}
                  className={`w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl font-medium transition-all ${
                    !videoFile || !videoInfo || isConverting
                      ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                      : 'bg-emerald-600 text-white hover:bg-emerald-700 shadow-sm'
                  }`}
                >
                  {isConverting ? <Loader2 className="w-5 h-5 animate-spin" /> : <Play className="w-5 h-5" />}
                  {isConverting ? '转换中…' : '开始转换'}
                </button>

                {progress && (
                  <div className="mt-4 p-4 rounded-xl bg-blue-50 border border-blue-100">
                    <div className="flex items-center justify-between text-sm text-blue-800">
                      <span className="font-medium">{progress.stageText}</span>
                      <span>{progress.percentage}%</span>
                    </div>
                    <div className="mt-2 h-2 bg-blue-100 rounded-full overflow-hidden">
                      <div className="h-full bg-blue-600 rounded-full transition-all" style={{ width: `${progress.percentage}%` }} />
                    </div>
                    <div className="mt-2 flex items-center justify-between text-xs text-blue-700">
                      <span>
                        {progress.currentFrame && progress.totalFrames ? `帧：${progress.currentFrame}/${progress.totalFrames}` : ''}
                      </span>
                      <span>
                        {typeof progress.estimatedTimeRemaining === 'number' ? `预计剩余：${Math.ceil(progress.estimatedTimeRemaining)} 秒` : '正在估算时间…'}
                      </span>
                    </div>
                  </div>
                )}

                {result && !isConverting && (
                  <button
                    onClick={handleDownload}
                    className="mt-3 w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl font-medium bg-blue-600 text-white hover:bg-blue-700 transition-colors"
                  >
                    <Download className="w-5 h-5" />
                    下载 GIF
                  </button>
                )}

                {error && (
                  <div className="mt-3 p-3 rounded-xl bg-red-50 border border-red-100 text-sm text-red-700">{error}</div>
                )}

                <div className="mt-3 text-xs text-gray-500">
                  转换需要一定时间（取决于视频时长/分辨率/帧率）。请耐心等待，进度与预计剩余时间会持续更新。
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

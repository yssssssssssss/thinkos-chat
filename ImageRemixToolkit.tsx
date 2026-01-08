import React, { useState, useRef, useEffect } from 'react';
import { X, Check, Upload, Loader2, MousePointer2 } from 'lucide-react';

// --- Utilities ---

const extractBase64Data = (dataUrl: string): string => {
    if (dataUrl.startsWith('data:')) {
        const parts = dataUrl.split(',');
        return parts[1] || dataUrl;
    }
    return dataUrl;
};

const extractMimeType = (dataUrl: string): string => {
    if (dataUrl.startsWith('data:')) {
        const match = dataUrl.match(/data:([^;]+);/);
        return match ? match[1] : 'image/png';
    }
    return 'image/png';
};

const fileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = (error) => reject(error);
    });
};

// --- API Service ---

interface GeminiPart {
    text?: string;
    inline_data?: {
        mime_type: string;
        data: string;
    };
    file_data?: {
        mime_type: string;
        file_uri: string;
    };
}

const buildGeminiImagePart = (value: string): GeminiPart | null => {
    const trimmed = (value || '').trim();
    if (!trimmed) return null;

    if (trimmed.startsWith('http://') || trimmed.startsWith('https://')) {
        return {
            file_data: {
                mime_type: 'image/png',
                file_uri: trimmed
            }
        };
    }

    return {
        inline_data: {
            mime_type: extractMimeType(trimmed),
            data: extractBase64Data(trimmed)
        }
    };
};

export const editImageWithGemini = async (
    apiUrl: string,
    apiKey: string,
    originalImage: string,
    maskImage: string,
    prompt: string,
    referenceImage?: string,
    model: string = 'Gemini 3-Pro-Image-Preview'
): Promise<string> => {
    const parts: GeminiPart[] = [];

    const originalPart = buildGeminiImagePart(originalImage);
    if (originalPart) parts.push(originalPart);

    const maskPart = buildGeminiImagePart(maskImage);
    if (maskPart) parts.push(maskPart);

    if (referenceImage) {
        const referencePart = buildGeminiImagePart(referenceImage);
        if (referencePart) parts.push(referencePart);
    }

    if (prompt) {
        parts.push({ text: prompt });
    }

    const requestBody = {
        model,
        contents: {
            role: 'USER',
            parts
        },
        generation_config: {
            response_modalities: ['TEXT', 'IMAGE']
        },
        stream: false
    };

    const response = await fetch(apiUrl, {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${apiKey}`,
            'Content-Type': 'application/json',
            'Accept': '*/*'
        },
        body: JSON.stringify(requestBody)
    });

    if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`HTTP ${response.status}: ${errorText}`);
    }

    const data = await response.json();

    // Extract image from Gemini response
    let b64Data = '';
    if (data.candidates?.[0]?.content?.parts) {
        const imagePart = data.candidates[0].content.parts.find((p: any) => p.inline_data || p.inlineData);
        if (imagePart) {
            const inline = imagePart.inline_data || imagePart.inlineData;
            b64Data = inline.data;
        }
    } else if (data.data?.[0]?.b64_json) {
        b64Data = data.data[0].b64_json;
    }

    if (!b64Data) throw new Error('No image data found in response');
    return `data:image/png;base64,${b64Data}`;
};

// --- Components ---

interface DrawingCanvasProps {
    imageUrl: string;
    width: number;
    height: number;
    onMaskChange: (base64Mask: string) => void;
    strokeColor?: string;
    lineWidth?: number;
}

const DrawingCanvas: React.FC<DrawingCanvasProps> = ({
    imageUrl,
    width,
    height,
    onMaskChange,
    strokeColor = "rgba(0, 255, 0, 0.5)",
    lineWidth = 20
}) => {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const maskCanvasRef = useRef<HTMLCanvasElement>(null);
    const [isDrawing, setIsDrawing] = useState(false);

    useEffect(() => {
        const canvas = canvasRef.current;
        const maskCanvas = maskCanvasRef.current;
        if (!canvas || !maskCanvas) return;

        const ctx = canvas.getContext('2d');
        if (ctx) {
            ctx.lineCap = 'round';
            ctx.lineJoin = 'round';
            ctx.strokeStyle = strokeColor;
            ctx.lineWidth = lineWidth;
        }

        const maskCtx = maskCanvas.getContext('2d');
        if (maskCtx) {
            maskCtx.fillStyle = 'black';
            maskCtx.fillRect(0, 0, width, height);
            maskCtx.lineCap = 'round';
            maskCtx.lineJoin = 'round';
            maskCtx.strokeStyle = 'white';
            maskCtx.lineWidth = lineWidth;
        }
    }, [width, height, strokeColor, lineWidth]);

    const getCoordinates = (e: React.MouseEvent<HTMLCanvasElement>) => {
        const canvas = canvasRef.current;
        if (!canvas) return { x: 0, y: 0 };
        const rect = canvas.getBoundingClientRect();
        const scaleX = canvas.width / rect.width;
        const scaleY = canvas.height / rect.height;
        return {
            x: (e.clientX - rect.left) * scaleX,
            y: (e.clientY - rect.top) * scaleY
        };
    };

    const startDrawing = (e: React.MouseEvent<HTMLCanvasElement>) => {
        const { x, y } = getCoordinates(e);
        const ctx = canvasRef.current?.getContext('2d');
        const maskCtx = maskCanvasRef.current?.getContext('2d');
        if (ctx && maskCtx) {
            ctx.beginPath();
            ctx.moveTo(x, y);
            maskCtx.beginPath();
            maskCtx.moveTo(x, y);
        }
        setIsDrawing(true);
    };

    const draw = (e: React.MouseEvent<HTMLCanvasElement>) => {
        if (!isDrawing) return;
        const { x, y } = getCoordinates(e);
        const ctx = canvasRef.current?.getContext('2d');
        const maskCtx = maskCanvasRef.current?.getContext('2d');
        if (ctx && maskCtx) {
            ctx.lineTo(x, y);
            ctx.stroke();
            maskCtx.lineTo(x, y);
            maskCtx.stroke();
        }
    };

    const stopDrawing = () => {
        if (!isDrawing) return;
        setIsDrawing(false);
        const maskCanvas = maskCanvasRef.current;
        if (maskCanvas) {
            onMaskChange(maskCanvas.toDataURL('image/png'));
        }
    };

    return (
        <div className="relative" style={{ width, height }}>
            <img src={imageUrl} alt="Base" className="absolute inset-0 w-full h-full object-contain pointer-events-none select-none" />
            <canvas
                ref={canvasRef}
                width={width}
                height={height}
                onMouseDown={startDrawing}
                onMouseMove={draw}
                onMouseUp={stopDrawing}
                onMouseLeave={stopDrawing}
                className="absolute inset-0 cursor-crosshair touch-none"
            />
            <canvas ref={maskCanvasRef} width={width} height={height} className="hidden" />
        </div>
    );
};

interface ImageRemixProps {
    baseImageUrl: string;
    apiUrl: string;
    apiKey: string;
    onResult: (resultUrl: string) => void;
    onClose: () => void;
}

export const ImageRemix: React.FC<ImageRemixProps> = ({ baseImageUrl, apiUrl, apiKey, onResult, onClose }) => {
    const [refImage, setRefImage] = useState<string | null>(null);
    const [maskA, setMaskA] = useState<string | null>(null);
    const [maskB, setMaskB] = useState<string | null>(null);
    const [instruction, setInstruction] = useState('将图B的绿色区域，替换到图A的绿色区域');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            const base64 = await fileToBase64(e.target.files[0]);
            setRefImage(base64);
        }
    };

    const handleApply = async () => {
        if (!maskA || !instruction) return;
        setLoading(true);
        setError(null);
        try {
            const result = await editImageWithGemini(
                apiUrl,
                apiKey,
                baseImageUrl,
                maskA,
                instruction,
                refImage || undefined,
                maskB || undefined
            );
            onResult(result);
        } catch (err: any) {
            setError(err.message || '生成失败');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
            <div className="bg-gray-900 border border-gray-700 rounded-3xl w-full max-w-5xl flex flex-col overflow-hidden shadow-2xl">
                {/* Header */}
                <div className="flex justify-between items-center p-6 border-b border-gray-800 bg-gray-900/50">
                    <div className="flex items-center gap-3">
                        <div className="w-2 h-6 bg-blue-500 rounded-full"></div>
                        <h2 className="text-xl font-bold text-white">Gemini 图像重组工具</h2>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-gray-800 rounded-full text-gray-400 hover:text-white transition">
                        <X size={24} />
                    </button>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto p-8 flex flex-col md:flex-row gap-8 items-center justify-center bg-gray-950">
                    {/* Image A */}
                    <div className="flex flex-col items-center gap-4">
                        <span className="text-xs font-bold text-gray-500 uppercase tracking-widest">原图 (图 A)</span>
                        <div className="border border-gray-800 rounded-2xl overflow-hidden relative w-[400px] h-[400px] bg-black shadow-inner">
                            <DrawingCanvas imageUrl={baseImageUrl} width={400} height={400} onMaskChange={setMaskA} strokeColor="rgba(59, 130, 246, 0.5)" />
                        </div>
                    </div>

                    {/* Image B */}
                    <div className="flex flex-col items-center gap-4">
                        <span className="text-xs font-bold text-gray-500 uppercase tracking-widest">参考图 (图 B)</span>
                        <div className="border border-gray-800 rounded-2xl overflow-hidden relative w-[400px] h-[400px] bg-gray-900/50 flex items-center justify-center shadow-inner group">
                            {!refImage ? (
                                <label className="cursor-pointer flex flex-col items-center gap-4 text-gray-500 hover:text-blue-400 transition group w-full h-full justify-center">
                                    <div className="p-6 bg-gray-800 rounded-full group-hover:scale-110 transition-transform">
                                        <Upload size={40} />
                                    </div>
                                    <span className="text-sm font-medium">点击上传参考图</span>
                                    <input type="file" className="hidden" accept="image/*" onChange={handleUpload} />
                                </label>
                            ) : (
                                <div className="relative w-full h-full">
                                    <DrawingCanvas imageUrl={refImage} width={400} height={400} onMaskChange={setMaskB} strokeColor="rgba(34, 197, 94, 0.5)" />
                                    <button onClick={() => setRefImage(null)} className="absolute top-4 right-4 p-2 bg-black/60 hover:bg-red-500 text-white rounded-full opacity-0 group-hover:opacity-100 transition backdrop-blur-md">
                                        <X size={16} />
                                    </button>
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                {/* Footer */}
                <div className="p-6 bg-gray-900 border-t border-gray-800">
                    <div className="flex flex-col gap-4">
                        {error && <div className="text-red-400 text-sm bg-red-400/10 p-3 rounded-xl border border-red-400/20">{error}</div>}
                        <div className="flex gap-4 items-center">
                            <div className="flex-1 relative">
                                <input
                                    type="text"
                                    value={instruction}
                                    onChange={(e) => setInstruction(e.target.value)}
                                    placeholder="描述您的修改意图..."
                                    className="w-full bg-black/40 border border-gray-700 rounded-2xl pl-5 pr-5 py-4 text-white placeholder-gray-500 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none transition-all"
                                />
                            </div>
                            <button
                                onClick={handleApply}
                                disabled={loading || !maskA || !instruction}
                                className="bg-blue-600 hover:bg-blue-500 text-white px-8 py-4 rounded-2xl font-bold flex items-center gap-3 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-blue-600/20 transition-all active:scale-95 min-w-[140px] justify-center"
                            >
                                {loading ? <Loader2 className="animate-spin" size={20} /> : <Check size={20} />}
                                <span>{loading ? '处理中...' : '确认生成'}</span>
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

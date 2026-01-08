import React, { useState } from 'react';
import { ImageRemix } from './ImageRemixToolkit';

const RemixDemo: React.FC = () => {
    const [showRemix, setShowRemix] = useState(false);
    const [resultImage, setResultImage] = useState<string | null>(null);

    // 请替换为您的实际配置
    const API_CONFIG = {
        url: 'http://ai-api.jdcloud.com/v1/images/gemini_flash/generations',
        key: 'YOUR_API_KEY_HERE'
    };

    const baseImage = "https://ark-project.tos-cn-beijing.volces.com/doc_image/seedream4_imageToimage.png";

    return (
        <div className="p-8 bg-gray-100 min-h-screen flex flex-col items-center gap-8">
            <h1 className="text-3xl font-bold text-gray-800">Image Remix 演示</h1>

            {!showRemix ? (
                <div className="flex flex-col items-center gap-4">
                    <div className="w-64 h-64 border-2 border-dashed border-gray-300 rounded-xl overflow-hidden bg-white shadow-sm">
                        <img src={baseImage} alt="Base" className="w-full h-full object-cover" />
                    </div>
                    <button
                        onClick={() => setShowRemix(true)}
                        className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-xl font-bold transition-all shadow-lg"
                    >
                        开始重组 (Remix)
                    </button>
                </div>
            ) : (
                <ImageRemix
                    baseImageUrl={baseImage}
                    apiUrl={API_CONFIG.url}
                    apiKey={API_CONFIG.key}
                    onResult={(url) => {
                        setResultImage(url);
                        setShowRemix(false);
                    }}
                    onClose={() => setShowRemix(false)}
                />
            )}

            {resultImage && (
                <div className="flex flex-col items-center gap-4 mt-8">
                    <h2 className="text-xl font-bold text-gray-700">生成结果:</h2>
                    <div className="max-w-2xl border-4 border-white rounded-2xl shadow-2xl overflow-hidden">
                        <img src={resultImage} alt="Result" className="w-full h-auto" />
                    </div>
                    <button
                        onClick={() => setResultImage(null)}
                        className="text-blue-600 hover:underline font-medium"
                    >
                        清除结果
                    </button>
                </div>
            )}
        </div>
    );
};

export default RemixDemo;

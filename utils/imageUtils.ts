/**
 * 图像处理工具函数
 * 实现图像压缩、格式转换等功能
 */

// 最大图像尺寸（最大边 1600px）
const MAX_IMAGE_SIZE = 1600;

// 压缩质量
const COMPRESSION_QUALITY = 0.85;

/**
 * 压缩图像到指定最大尺寸
 * @param imageSource - 图像源（Base64 data URL、HTTP URL 或 File）
 * @param maxSize - 最大边长，默认 1600px
 * @param quality - 压缩质量 0-1，默认 0.85
 * @returns 压缩后的 Base64 data URL
 */
export const compressImage = async (
  imageSource: string | File,
  maxSize: number = MAX_IMAGE_SIZE,
  quality: number = COMPRESSION_QUALITY
): Promise<string> => {
  // 如果是 File，先转换为 data URL
  let dataUrl: string;
  if (imageSource instanceof File) {
    dataUrl = await fileToDataUrl(imageSource);
  } else {
    dataUrl = imageSource;
  }

  // 如果是 HTTP URL，先加载图像
  if (dataUrl.startsWith('http://') || dataUrl.startsWith('https://')) {
    dataUrl = await urlToDataUrl(dataUrl);
  }

  // 加载图像
  const img = await loadImage(dataUrl);

  // 检查是否需要压缩
  if (img.width <= maxSize && img.height <= maxSize) {
    // 不需要压缩，返回原始数据
    return dataUrl;
  }

  // 计算新尺寸
  const { width, height } = calculateNewSize(img.width, img.height, maxSize);

  // 创建 canvas 进行压缩
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;

  const ctx = canvas.getContext('2d');
  if (!ctx) {
    throw new Error('Failed to get canvas context');
  }

  // 绘制压缩后的图像
  ctx.drawImage(img, 0, 0, width, height);

  // 导出为 Base64
  return canvas.toDataURL('image/jpeg', quality);
};

/**
 * 计算保持宽高比的新尺寸
 */
const calculateNewSize = (
  originalWidth: number,
  originalHeight: number,
  maxSize: number
): { width: number; height: number } => {
  if (originalWidth <= maxSize && originalHeight <= maxSize) {
    return { width: originalWidth, height: originalHeight };
  }

  const ratio = originalWidth / originalHeight;

  if (originalWidth > originalHeight) {
    return {
      width: maxSize,
      height: Math.round(maxSize / ratio),
    };
  } else {
    return {
      width: Math.round(maxSize * ratio),
      height: maxSize,
    };
  }
};

/**
 * 加载图像元素
 */
const loadImage = (src: string): Promise<HTMLImageElement> => {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => resolve(img);
    img.onerror = (error) => reject(error);
    img.src = src;
  });
};

/**
 * 将 File 转换为 data URL
 */
const fileToDataUrl = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = (error) => reject(error);
  });
};

/**
 * 将 HTTP URL 转换为 data URL
 */
const urlToDataUrl = async (url: string): Promise<string> => {
  const response = await fetch(url);
  const blob = await response.blob();
  return fileToDataUrl(blob as File);
};

/**
 * 获取图像尺寸
 */
export const getImageSize = async (
  imageSource: string | File
): Promise<{ width: number; height: number }> => {
  let dataUrl: string;
  if (imageSource instanceof File) {
    dataUrl = await fileToDataUrl(imageSource);
  } else {
    dataUrl = imageSource;
  }

  const img = await loadImage(dataUrl);
  return { width: img.width, height: img.height };
};

/**
 * 检查图像是否需要压缩
 */
export const needsCompression = async (
  imageSource: string | File,
  maxSize: number = MAX_IMAGE_SIZE
): Promise<boolean> => {
  const { width, height } = await getImageSize(imageSource);
  return width > maxSize || height > maxSize;
};

/**
 * 获取图像的 Base64 大小（字节）
 */
export const getBase64Size = (base64: string): number => {
  // 移除 data URL 前缀
  const base64Data = base64.replace(/^data:image\/\w+;base64,/, '');
  // Base64 编码后大小约为原始大小的 4/3
  return Math.ceil((base64Data.length * 3) / 4);
};

/**
 * 格式化文件大小
 */
export const formatFileSize = (bytes: number): string => {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
};


/**
 * 生成带时间戳的文件名
 */
export const generateImageFileName = (modelName: string, prompt?: string): string => {
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
  const sanitizedModel = modelName.replace(/[^a-zA-Z0-9\u4e00-\u9fa5]/g, '_');
  const promptPart = prompt ? `_${prompt.slice(0, 20).replace(/[^a-zA-Z0-9\u4e00-\u9fa5]/g, '_')}` : '';
  return `${timestamp}_${sanitizedModel}${promptPart}.png`;
};

/**
 * 下载图片到本地
 * @param imageUrl - 图片 URL 或 Base64 data URL
 * @param fileName - 文件名
 */
export const downloadImage = (imageUrl: string, fileName: string): void => {
  const link = document.createElement('a');
  link.href = imageUrl;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};

/**
 * 批量保存图片
 * @param images - 图片数组，包含 url、modelName 和可选的 prompt
 * @param autoDownload - 是否自动下载，默认 true
 */
export const saveGeneratedImages = (
  images: Array<{ url: string; modelName: string; prompt?: string }>,
  autoDownload: boolean = true
): void => {
  if (!autoDownload) return;
  
  images.forEach((image, index) => {
    // 延迟下载，避免浏览器阻止多个下载
    setTimeout(() => {
      const fileName = generateImageFileName(image.modelName, image.prompt);
      downloadImage(image.url, fileName);
      console.log(`[ImageUtils] Saved image: ${fileName}`);
    }, index * 500);
  });
};

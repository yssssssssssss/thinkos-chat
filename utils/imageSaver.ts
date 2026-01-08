/**
 * 图像保存工具
 * 将生成的图像保存到本地 output 文件夹
 */

import { log } from './logger';

/**
 * 将 Base64 图像保存到本地
 * 注意：浏览器环境无法直接写入文件系统，这里提供下载功能
 */
export const saveImageToLocal = async (
  imageUrl: string,
  modelName: string,
  prompt: string
): Promise<string> => {
  try {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, -5);
    const sanitizedModelName = modelName.replace(/[^a-zA-Z0-9]/g, '_');
    const filename = `${timestamp}_${sanitizedModelName}.png`;

    log.info('ImageSaver', `准备保存图像: ${filename}`, { modelName, prompt: prompt.slice(0, 50) });

    // 在浏览器环境中，我们触发下载
    if (typeof window !== 'undefined') {
      const link = document.createElement('a');
      link.href = imageUrl;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      log.info('ImageSaver', `图像已触发下载: ${filename}`);
      return filename;
    }

    return filename;
  } catch (error) {
    log.error('ImageSaver', '保存图像失败', error);
    throw error;
  }
};

/**
 * 批量保存图像
 */
export const saveMultipleImages = async (
  images: Array<{ url: string; modelName: string; prompt: string }>
): Promise<string[]> => {
  log.info('ImageSaver', `开始批量保存 ${images.length} 张图像`);
  
  const results: string[] = [];
  for (const img of images) {
    try {
      const filename = await saveImageToLocal(img.url, img.modelName, img.prompt);
      results.push(filename);
    } catch (error) {
      log.error('ImageSaver', `保存图像失败: ${img.modelName}`, error);
    }
  }

  log.info('ImageSaver', `批量保存完成，成功 ${results.length}/${images.length} 张`);
  return results;
};

/**
 * 将 Base64 转换为 Blob
 */
export const base64ToBlob = (base64: string, mimeType: string = 'image/png'): Blob => {
  const byteString = atob(base64.split(',')[1]);
  const ab = new ArrayBuffer(byteString.length);
  const ia = new Uint8Array(ab);
  
  for (let i = 0; i < byteString.length; i++) {
    ia[i] = byteString.charCodeAt(i);
  }
  
  return new Blob([ab], { type: mimeType });
};

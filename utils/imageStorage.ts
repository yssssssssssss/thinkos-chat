/**
 * 图片本地存储服务
 * 使用 IndexedDB 在浏览器中静默保存生成的图片
 */

const DB_NAME = 'GeminiFlowImages';
const DB_VERSION = 1;
const STORE_NAME = 'images';

interface StoredImage {
  id: string;
  url: string;
  modelName: string;
  prompt: string;
  timestamp: number;
  fileName: string;
}

let db: IDBDatabase | null = null;

/**
 * 初始化数据库
 */
const initDB = (): Promise<IDBDatabase> => {
  return new Promise((resolve, reject) => {
    if (db) {
      resolve(db);
      return;
    }

    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onerror = () => {
      console.error('[ImageStorage] Failed to open database');
      reject(request.error);
    };

    request.onsuccess = () => {
      db = request.result;
      console.log('[ImageStorage] Database opened successfully');
      resolve(db);
    };

    request.onupgradeneeded = (event) => {
      const database = (event.target as IDBOpenDBRequest).result;
      if (!database.objectStoreNames.contains(STORE_NAME)) {
        const store = database.createObjectStore(STORE_NAME, { keyPath: 'id' });
        store.createIndex('timestamp', 'timestamp', { unique: false });
        store.createIndex('modelName', 'modelName', { unique: false });
        console.log('[ImageStorage] Object store created');
      }
    };
  });
};

/**
 * 生成唯一 ID
 */
const generateId = (): string => {
  return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
};

/**
 * 生成文件名
 */
const generateFileName = (modelName: string, prompt: string): string => {
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
  const sanitizedModel = modelName.replace(/[^a-zA-Z0-9\u4e00-\u9fa5]/g, '_');
  const promptPart = prompt ? `_${prompt.slice(0, 20).replace(/[^a-zA-Z0-9\u4e00-\u9fa5]/g, '_')}` : '';
  return `${timestamp}_${sanitizedModel}${promptPart}.png`;
};

/**
 * 静默保存图片到 IndexedDB
 */
export const saveImageSilently = async (
  imageUrl: string,
  modelName: string,
  prompt: string
): Promise<string> => {
  try {
    const database = await initDB();
    const id = generateId();
    const fileName = generateFileName(modelName, prompt);

    const image: StoredImage = {
      id,
      url: imageUrl,
      modelName,
      prompt,
      timestamp: Date.now(),
      fileName,
    };

    return new Promise((resolve, reject) => {
      const transaction = database.transaction([STORE_NAME], 'readwrite');
      const store = transaction.objectStore(STORE_NAME);
      const request = store.add(image);

      request.onsuccess = () => {
        console.log(`[ImageStorage] Image saved: ${fileName}`);
        resolve(id);
      };

      request.onerror = () => {
        console.error('[ImageStorage] Failed to save image');
        reject(request.error);
      };
    });
  } catch (error) {
    console.error('[ImageStorage] Save error:', error);
    throw error;
  }
};

/**
 * 批量静默保存图片
 */
export const saveImagesBatch = async (
  images: Array<{ url: string; modelName: string; prompt: string }>
): Promise<string[]> => {
  const ids: string[] = [];
  for (const image of images) {
    try {
      const id = await saveImageSilently(image.url, image.modelName, image.prompt);
      ids.push(id);
    } catch (error) {
      console.error('[ImageStorage] Failed to save image:', error);
    }
  }
  console.log(`[ImageStorage] Batch saved ${ids.length}/${images.length} images`);
  return ids;
};

/**
 * 获取所有保存的图片
 */
export const getAllImages = async (): Promise<StoredImage[]> => {
  try {
    const database = await initDB();
    return new Promise((resolve, reject) => {
      const transaction = database.transaction([STORE_NAME], 'readonly');
      const store = transaction.objectStore(STORE_NAME);
      const request = store.getAll();

      request.onsuccess = () => {
        const images = request.result.sort((a, b) => b.timestamp - a.timestamp);
        resolve(images);
      };

      request.onerror = () => {
        reject(request.error);
      };
    });
  } catch (error) {
    console.error('[ImageStorage] Get all error:', error);
    return [];
  }
};

/**
 * 获取单张图片
 */
export const getImage = async (id: string): Promise<StoredImage | null> => {
  try {
    const database = await initDB();
    return new Promise((resolve, reject) => {
      const transaction = database.transaction([STORE_NAME], 'readonly');
      const store = transaction.objectStore(STORE_NAME);
      const request = store.get(id);

      request.onsuccess = () => {
        resolve(request.result || null);
      };

      request.onerror = () => {
        reject(request.error);
      };
    });
  } catch (error) {
    console.error('[ImageStorage] Get error:', error);
    return null;
  }
};

/**
 * 删除图片
 */
export const deleteImage = async (id: string): Promise<void> => {
  try {
    const database = await initDB();
    return new Promise((resolve, reject) => {
      const transaction = database.transaction([STORE_NAME], 'readwrite');
      const store = transaction.objectStore(STORE_NAME);
      const request = store.delete(id);

      request.onsuccess = () => {
        console.log(`[ImageStorage] Image deleted: ${id}`);
        resolve();
      };

      request.onerror = () => {
        reject(request.error);
      };
    });
  } catch (error) {
    console.error('[ImageStorage] Delete error:', error);
    throw error;
  }
};

/**
 * 导出图片到本地（手动下载）
 * 下载后的文件会保存到浏览器默认下载目录
 * 如需保存到 /output 文件夹，请在浏览器设置中修改下载位置
 */
export const exportImage = (imageUrl: string, fileName: string): void => {
  const link = document.createElement('a');
  link.href = imageUrl;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};

/**
 * 导出图片到 output 文件夹（通过下载）
 * 文件名格式：YYYY-MM-DD_HH-mm-ss_模型名_提示词.png
 */
export const exportImageToOutput = (
  imageUrl: string,
  modelName: string,
  prompt: string
): void => {
  const fileName = generateFileName(modelName, prompt);
  console.log(`[ImageStorage] 导出图片: ${fileName}`);
  console.log('[ImageStorage] 提示：图片将下载到浏览器默认下载目录');
  console.log('[ImageStorage] 如需保存到 /output 文件夹，请在浏览器设置中将下载位置改为项目的 output 目录');
  exportImage(imageUrl, fileName);
};

/**
 * 获取存储统计信息
 */
export const getStorageStats = async (): Promise<{ count: number; oldestDate: Date | null }> => {
  const images = await getAllImages();
  return {
    count: images.length,
    oldestDate: images.length > 0 ? new Date(images[images.length - 1].timestamp) : null,
  };
};

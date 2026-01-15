/**
 * 图片裁剪 Skill
 * 裁剪图片的指定区域
 */

import { BaseSkill } from '../base/skill';
import { log } from '../../utils/logger';

export interface CropImageParams {
  imageUrl: string;
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface CropImageResult {
  imageUrl: string;
  originalWidth: number;
  originalHeight: number;
  cropX: number;
  cropY: number;
  cropWidth: number;
  cropHeight: number;
}

export class CropImageSkill extends BaseSkill {
  manifest = {
    id: 'image-crop',
    name: '图片裁剪',
    description: '裁剪图片的指定区域',
    version: '1.0.0',
    parameters: {
      type: 'object' as const,
      properties: {
        imageUrl: {
          type: 'string',
          description: '图片 URL 或 Base64 编码'
        },
        x: {
          type: 'number',
          description: '裁剪起始 X 坐标（像素）'
        },
        y: {
          type: 'number',
          description: '裁剪起始 Y 坐标（像素）'
        },
        width: {
          type: 'number',
          description: '裁剪宽度（像素）'
        },
        height: {
          type: 'number',
          description: '裁剪高度（像素）'
        }
      },
      required: ['imageUrl', 'x', 'y', 'width', 'height']
    }
  };

  async execute(params: CropImageParams): Promise<{ success: boolean; data?: CropImageResult; error?: string }> {
    const { imageUrl, x, y, width, height } = params;

    // 参数验证
    if (x < 0 || y < 0) {
      return { success: false, error: '裁剪坐标不能为负数' };
    }

    if (width <= 0 || height <= 0) {
      return { success: false, error: '裁剪尺寸必须大于 0' };
    }

    if (width > 8192 || height > 8192) {
      return { success: false, error: '裁剪尺寸过大，最大支持 8192x8192' };
    }

    try {
      log.info('CropImageSkill', '开始裁剪图片', { x, y, width, height });

      // 1. 加载图片
      const img = await this.loadImage(imageUrl);

      // 2. 边界检查
      if (x + width > img.width || y + height > img.height) {
        return {
          success: false,
          error: `裁剪区域超出图片边界（图片尺寸：${img.width}×${img.height}）`
        };
      }

      // 3. 创建 Canvas 并裁剪
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');

      if (!ctx) {
        return { success: false, error: '无法获取 Canvas 上下文' };
      }

      canvas.width = width;
      canvas.height = height;

      // 4. 绘制裁剪区域
      ctx.drawImage(img, x, y, width, height, 0, 0, width, height);

      // 5. 导出结果
      const resultUrl = canvas.toDataURL('image/png');

      log.info('CropImageSkill', '图片裁剪完成', {
        originalWidth: img.width,
        originalHeight: img.height,
        cropWidth: width,
        cropHeight: height
      });

      return {
        success: true,
        data: {
          imageUrl: resultUrl,
          originalWidth: img.width,
          originalHeight: img.height,
          cropX: x,
          cropY: y,
          cropWidth: width,
          cropHeight: height
        }
      };
    } catch (error) {
      log.error('CropImageSkill', '图片裁剪失败', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : '裁剪失败'
      };
    }
  }

  /**
   * 加载图片
   */
  private loadImage(src: string): Promise<HTMLImageElement> {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.onload = () => resolve(img);
      img.onerror = () => reject(new Error('图片加载失败，请检查 URL 是否可访问'));
      img.src = src;
    });
  }
}

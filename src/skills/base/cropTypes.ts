/**
 * 图片裁剪相关类型定义
 */

export interface CropImageParams extends ImageProcessingParams {
  imageUrl: string;
  x: number;          // 裁剪起始 X 坐标
  y: number;          // 裁剪起始 Y 坐标
  width: number;      // 裁剪宽度
  height: number;     // 裁剪高度
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

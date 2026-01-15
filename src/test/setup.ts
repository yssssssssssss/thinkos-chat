import '@testing-library/jest-dom';
import { expect, afterEach, vi } from 'vitest';
import { cleanup } from '@testing-library/react';

// 自动清理
afterEach(() => {
  cleanup();
});

// Mock HTMLCanvasElement
global.HTMLCanvasElement.prototype.getContext = vi.fn(() => ({
  fillStyle: '',
  fillRect: vi.fn(),
  drawImage: vi.fn(),
  toDataURL: vi.fn(() => 'data:image/png;base64,mock'),
})) as any;

// jsdom 未安装 node-canvas 时，HTMLCanvasElement.prototype.toDataURL 会返回 null 并输出 Not implemented 错误日志；
// 这里统一 mock，避免图片类 Skills 单测被噪音污染/返回值为空。
global.HTMLCanvasElement.prototype.toDataURL = vi.fn(() => 'data:image/png;base64,mock') as any;

// Mock Image
global.Image = class extends EventTarget {
  width = 0;
  height = 0;
  src = '';
  crossOrigin = '';
  onload: ((this: GlobalEventHandlers, ev: Event) => any) | null = null;
  onerror: ((this: GlobalEventHandlers, ev: Event | string) => any) | null = null;

  constructor() {
    super();
    setTimeout(() => {
      this.width = 200;
      this.height = 200;
      if (this.onload) {
        this.onload.call(this, new Event('load'));
      }
    }, 0);
  }
} as any;

/**
 * 内嵌工具弹窗
 * 用 iframe 在当前页面以弹窗形式打开工具页面（避免页面跳转）
 */

import React, { useEffect } from 'react';
import { X } from 'lucide-react';

interface EmbeddedToolModalProps {
  title: string;
  src: string;
  onClose: () => void;
}

export const EmbeddedToolModal: React.FC<EmbeddedToolModalProps> = ({ title, src, onClose }) => {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-2xl shadow-2xl w-full max-w-6xl h-[90vh] overflow-hidden flex flex-col"
        onClick={(e: React.MouseEvent) => e.stopPropagation()}
      >
        <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between">
          <div className="font-medium text-gray-800">{title}</div>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-xl transition-colors" title="关闭">
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        <div className="flex-1 bg-gray-50">
          <iframe
            title={title}
            src={src}
            className="w-full h-full bg-white"
            loading="lazy"
            referrerPolicy="no-referrer"
          />
        </div>
      </div>
    </div>
  );
};


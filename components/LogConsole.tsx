import React, { useState, useRef, useEffect } from 'react';
import { Terminal, X, Trash2, ChevronDown, ChevronUp, Download } from 'lucide-react';

export interface LogEntry {
  id: string;
  timestamp: Date;
  level: 'info' | 'success' | 'warning' | 'error';
  nodeId?: string;
  nodeType?: string;
  message: string;
  details?: any;
}

interface LogConsoleProps {
  logs: LogEntry[];
  onClear: () => void;
}

const LogConsole: React.FC<LogConsoleProps> = ({ logs, onClear }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const [filter, setFilter] = useState<'all' | 'info' | 'success' | 'warning' | 'error'>('all');
  const logEndRef = useRef<HTMLDivElement>(null);
  const [autoScroll, setAutoScroll] = useState(true);

  useEffect(() => {
    if (autoScroll && logEndRef.current) {
      logEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [logs, autoScroll]);

  const filteredLogs = filter === 'all' 
    ? logs 
    : logs.filter(log => log.level === filter);

  const getLevelColor = (level: string) => {
    switch (level) {
      case 'info': return 'text-blue-400';
      case 'success': return 'text-green-400';
      case 'warning': return 'text-yellow-400';
      case 'error': return 'text-red-400';
      default: return 'text-gray-400';
    }
  };

  const getLevelBg = (level: string) => {
    switch (level) {
      case 'info': return 'bg-blue-500/10 border-blue-500/30';
      case 'success': return 'bg-green-500/10 border-green-500/30';
      case 'warning': return 'bg-yellow-500/10 border-yellow-500/30';
      case 'error': return 'bg-red-500/10 border-red-500/30';
      default: return 'bg-gray-500/10 border-gray-500/30';
    }
  };

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString('zh-CN', { 
      hour: '2-digit', 
      minute: '2-digit', 
      second: '2-digit',
      fractionalSecondDigits: 3
    });
  };

  const exportLogs = () => {
    const logText = logs.map(log => 
      `[${formatTime(log.timestamp)}] [${log.level.toUpperCase()}] ${log.nodeType || 'System'} ${log.nodeId ? `(${log.nodeId.slice(0, 8)})` : ''}: ${log.message}${log.details ? '\n  Details: ' + JSON.stringify(log.details, null, 2) : ''}`
    ).join('\n');
    
    const blob = new Blob([logText], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `workflow-logs-${new Date().toISOString()}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  if (!isOpen) {
    return (
      <button
        onClick={() => setIsOpen(true)}
        className="fixed bottom-6 left-6 z-50 bg-gray-900/90 backdrop-blur-md border border-gray-700 rounded-full p-3 shadow-lg hover:bg-gray-800 transition-all group"
        title="打开日志控制台"
      >
        <Terminal size={20} className="text-gray-300 group-hover:text-white" />
        {logs.length > 0 && (
          <div className="absolute -top-1 -right-1 bg-blue-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center font-bold">
            {logs.length > 99 ? '99+' : logs.length}
          </div>
        )}
      </button>
    );
  }

  return (
    <div 
      className={`fixed left-6 z-50 bg-gray-900/95 backdrop-blur-md border border-gray-700 rounded-2xl shadow-2xl transition-all ${
        isExpanded 
          ? 'bottom-6 w-[800px] h-[600px]' 
          : 'bottom-6 w-[500px] h-[300px]'
      }`}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-700 bg-black/30">
        <div className="flex items-center gap-2">
          <Terminal size={16} className="text-blue-400" />
          <span className="text-sm font-semibold text-white">日志控制台</span>
          <span className="text-xs text-gray-500">({filteredLogs.length} 条)</span>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setAutoScroll(!autoScroll)}
            className={`text-xs px-2 py-1 rounded transition ${
              autoScroll 
                ? 'bg-blue-500/20 text-blue-400' 
                : 'bg-gray-700/50 text-gray-400 hover:bg-gray-700'
            }`}
            title="自动滚动"
          >
            自动滚动
          </button>
          <button
            onClick={exportLogs}
            className="p-1.5 hover:bg-gray-700 rounded transition"
            title="导出日志"
          >
            <Download size={14} className="text-gray-400" />
          </button>
          <button
            onClick={onClear}
            className="p-1.5 hover:bg-gray-700 rounded transition"
            title="清空日志"
          >
            <Trash2 size={14} className="text-gray-400" />
          </button>
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="p-1.5 hover:bg-gray-700 rounded transition"
            title={isExpanded ? '缩小' : '展开'}
          >
            {isExpanded ? <ChevronDown size={14} className="text-gray-400" /> : <ChevronUp size={14} className="text-gray-400" />}
          </button>
          <button
            onClick={() => setIsOpen(false)}
            className="p-1.5 hover:bg-gray-700 rounded transition"
            title="关闭"
          >
            <X size={14} className="text-gray-400" />
          </button>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="flex items-center gap-2 px-4 py-2 border-b border-gray-800 bg-black/20">
        {(['all', 'info', 'success', 'warning', 'error'] as const).map(level => (
          <button
            key={level}
            onClick={() => setFilter(level)}
            className={`text-xs px-3 py-1 rounded-full transition ${
              filter === level
                ? 'bg-blue-500 text-white'
                : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
            }`}
          >
            {level === 'all' ? '全部' : level.toUpperCase()}
            {level !== 'all' && (
              <span className="ml-1 opacity-60">
                ({logs.filter(l => l.level === level).length})
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Log Content */}
      <div className="flex-1 overflow-y-auto p-4 space-y-2 font-mono text-xs custom-scrollbar" style={{ height: 'calc(100% - 100px)' }}>
        {filteredLogs.length === 0 ? (
          <div className="flex items-center justify-center h-full text-gray-500">
            <div className="text-center">
              <Terminal size={32} className="mx-auto mb-2 opacity-50" />
              <p>暂无日志</p>
            </div>
          </div>
        ) : (
          filteredLogs.map(log => (
            <div
              key={log.id}
              className={`p-3 rounded-lg border ${getLevelBg(log.level)} hover:bg-opacity-80 transition`}
            >
              <div className="flex items-start gap-2">
                <span className="text-gray-500 shrink-0">{formatTime(log.timestamp)}</span>
                <span className={`font-bold shrink-0 ${getLevelColor(log.level)}`}>
                  [{log.level.toUpperCase()}]
                </span>
                {log.nodeType && (
                  <span className="text-purple-400 shrink-0">
                    {log.nodeType}
                  </span>
                )}
                {log.nodeId && (
                  <span className="text-gray-600 shrink-0 text-[10px]">
                    ({log.nodeId.slice(0, 8)})
                  </span>
                )}
              </div>
              <div className="mt-1 text-gray-300 leading-relaxed">
                {log.message}
              </div>
              {log.details && (
                <details className="mt-2">
                  <summary className="text-gray-500 cursor-pointer hover:text-gray-400">
                    详细信息
                  </summary>
                  <pre className="mt-1 p-2 bg-black/30 rounded text-[10px] text-gray-400 overflow-x-auto">
                    {JSON.stringify(log.details, null, 2)}
                  </pre>
                </details>
              )}
            </div>
          ))
        )}
        <div ref={logEndRef} />
      </div>
    </div>
  );
};

export default LogConsole;

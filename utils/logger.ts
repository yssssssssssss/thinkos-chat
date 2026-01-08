/**
 * 日志工具
 * 提供统一的日志记录功能，方便后台查看项目进程
 */

export enum LogLevel {
  DEBUG = 'DEBUG',
  INFO = 'INFO',
  WARN = 'WARN',
  ERROR = 'ERROR',
}

interface LogEntry {
  timestamp: string;
  level: LogLevel;
  module: string;
  message: string;
  data?: any;
}

class Logger {
  private static instance: Logger;
  private logs: LogEntry[] = [];
  private maxLogs = 1000; // 最多保存 1000 条日志

  private constructor() {}

  static getInstance(): Logger {
    if (!Logger.instance) {
      Logger.instance = new Logger();
    }
    return Logger.instance;
  }

  private formatTimestamp(): string {
    const now = new Date();
    return now.toISOString();
  }

  private log(level: LogLevel, module: string, message: string, data?: any) {
    const entry: LogEntry = {
      timestamp: this.formatTimestamp(),
      level,
      module,
      message,
      data,
    };

    // 保存到内存
    this.logs.push(entry);
    if (this.logs.length > this.maxLogs) {
      this.logs.shift();
    }

    // 输出到控制台
    const prefix = `[${entry.timestamp}] [${level}] [${module}]`;
    const logData = data ? [prefix, message, data] : [prefix, message];

    switch (level) {
      case LogLevel.DEBUG:
        console.debug(...logData);
        break;
      case LogLevel.INFO:
        console.info(...logData);
        break;
      case LogLevel.WARN:
        console.warn(...logData);
        break;
      case LogLevel.ERROR:
        console.error(...logData);
        break;
    }
  }

  debug(module: string, message: string, data?: any) {
    this.log(LogLevel.DEBUG, module, message, data);
  }

  info(module: string, message: string, data?: any) {
    this.log(LogLevel.INFO, module, message, data);
  }

  warn(module: string, message: string, data?: any) {
    this.log(LogLevel.WARN, module, message, data);
  }

  error(module: string, message: string, data?: any) {
    this.log(LogLevel.ERROR, module, message, data);
  }

  getLogs(): LogEntry[] {
    return [...this.logs];
  }

  clearLogs() {
    this.logs = [];
  }

  exportLogs(): string {
    return JSON.stringify(this.logs, null, 2);
  }
}

// 导出单例实例
export const logger = Logger.getInstance();

// 便捷方法
export const log = {
  debug: (module: string, message: string, data?: any) => logger.debug(module, message, data),
  info: (module: string, message: string, data?: any) => logger.info(module, message, data),
  warn: (module: string, message: string, data?: any) => logger.warn(module, message, data),
  error: (module: string, message: string, data?: any) => logger.error(module, message, data),
};

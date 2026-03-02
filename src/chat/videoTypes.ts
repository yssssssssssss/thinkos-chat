/**
 * 视频生成模块类型定义
 * 移植自 joy_ip_video 项目
 */

export type FileInputKey = 'image' | 'firstFrame' | 'lastFrame' | 'audio' | 'mask';

export type ParameterType = 'string' | 'number' | 'boolean' | 'enum';

export type GeneratorPublicSpec = {
    id: string;
    title: string;
    inputs: {
        files: Array<{
            key: FileInputKey;
            label: string;
            required: boolean;
            accept: string;
            help?: string;
        }>;
    };
    parameters: Array<{
        key: string;
        label: string;
        type: ParameterType;
        defaultValue: string | number | boolean;
        options: Array<{ label: string; value: string }>;
        min?: number;
        max?: number;
        step?: number;
        help?: string;
    }>;
};

export type TaskStatus = 'queued' | 'running' | 'succeeded' | 'failed' | 'unknown';

export type TaskStatusResponse = {
    taskId: string;
    status: TaskStatus;
    result?: {
        videoUrl?: string;
        message?: string;
    };
    raw: unknown;
};

export type VideoUploadState =
    | { status: 'idle'; previewUrl?: string }
    | { status: 'uploading'; percent: number; previewUrl?: string }
    | { status: 'done'; objectUrl: string; previewUrl?: string }
    | { status: 'error'; message: string; previewUrl?: string };

export type VideoTaskState =
    | { status: 'idle' }
    | { status: 'submitting' }
    | { status: 'polling'; taskId: string; progress?: string }
    | { status: 'done'; videoUrl: string; raw?: unknown }
    | { status: 'error'; message: string };

export type VideoGenerationResult = {
    generatorId: string;
    generatorTitle: string;
    videoUrl: string;
    prompt: string;
    taskId: string;
};

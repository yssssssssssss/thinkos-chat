/**
 * 瑙嗛鐢熸垚鏈嶅姟
 * 瀹㈡埛绔洿杩?JDCloud 妯″瀷鏈嶅姟锛岄€氳繃 Vite proxy 浠ｇ悊
 * 绉绘鑷?joy_ip_video 椤圭洰鐨勬牳蹇冮€昏緫
 */

import type {
    FileInputKey,
    GeneratorPublicSpec,
    TaskStatus,
    TaskStatusResponse,
    VideoGenerationResult,
} from '../src/chat/videoTypes';

// 鈹€鈹€鈹€ 鐢熸垚鍣ㄥ畾涔?鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€

type BuildPayloadInput = {
    prompt: string;
    fileUrls: Partial<Record<FileInputKey, string>>;
    params: Record<string, unknown>;
};

type GeneratorDefinition = GeneratorPublicSpec & {
    buildPayload: (input: BuildPayloadInput) => unknown;
};

function getString(v: unknown, fallback: string): string {
    const s = typeof v === 'string' ? v : v === undefined || v === null ? '' : String(v);
    return s.trim() ? s : fallback;
}

function getNumber(v: unknown, fallback: number): number {
    const n = typeof v === 'number' ? v : Number(v);
    return Number.isFinite(n) ? n : fallback;
}

function getBoolean(v: unknown, fallback: boolean): boolean {
    if (typeof v === 'boolean') return v;
    if (typeof v === 'string') {
        const s = v.trim().toLowerCase();
        if (['1', 'true', 'yes', 'y', 'on'].includes(s)) return true;
        if (['0', 'false', 'no', 'n', 'off'].includes(s)) return false;
    }
    if (typeof v === 'number') return v !== 0;
    return fallback;
}

function requireUrl(input: BuildPayloadInput, key: FileInputKey): string {
    const v = input.fileUrls[key];
    if (!v) throw new Error(`缂哄皯鏂囦欢: ${key}`);
    return v;
}

const DEFAULT_OMNIHUMAN_AUDIO_URL =
    'https://maas-task.s3.cn-north-1.jdcloud-oss.com/upload/2026-01-05/test_audio.mp3';

const generators: GeneratorDefinition[] = [
    {
        id: 'doubao-img',
        title: 'Doubao-Seedance（单图）',
        inputs: {
            files: [
                { key: 'image', label: '图片', required: false, accept: 'image/png,image/jpeg,image/webp', help: '上传 1 张图片' },
            ],
        },
        parameters: [
            { key: 'ratio', label: '比例', type: 'enum', defaultValue: '1:1', options: [{ label: '1:1', value: '1:1' }, { label: '16:9', value: '16:9' }, { label: '9:16', value: '9:16' }] },
            { key: 'duration', label: '时长（秒）', type: 'number', defaultValue: 5, options: [], min: 1, max: 30, step: 1 },
            { key: 'watermark', label: '水印', type: 'boolean', defaultValue: false, options: [] },
        ],
        buildPayload: (input) => {
            const imageUrl = requireUrl(input, 'image');
            return {
                model: 'Doubao-Seedance-1.5-pro',
                content: [
                    { type: 'text', text: input.prompt },
                    { type: 'image_url', image_url: { url: imageUrl } },
                ],
                parameters: {
                    ratio: getString(input.params.ratio, '1:1'),
                    duration: getNumber(input.params.duration, 5),
                    watermark: getBoolean(input.params.watermark, false),
                },
            };
        },
    },
    {
        id: 'doubao-img-img',
        title: 'Doubao-Seedance（首尾帧）',
        inputs: {
            files: [
                { key: 'firstFrame', label: '首帧图片', required: false, accept: 'image/png,image/jpeg,image/webp', help: '上传首帧图片' },
                { key: 'lastFrame', label: '尾帧图片', required: true, accept: 'image/png,image/jpeg,image/webp', help: '上传尾帧图片' },
            ],
        },
        parameters: [
            { key: 'ratio', label: '比例', type: 'enum', defaultValue: '1:1', options: [{ label: '1:1', value: '1:1' }, { label: '16:9', value: '16:9' }, { label: '9:16', value: '9:16' }] },
            { key: 'duration', label: '时长（秒）', type: 'number', defaultValue: 5, options: [], min: 1, max: 30, step: 1 },
            { key: 'watermark', label: '水印', type: 'boolean', defaultValue: false, options: [] },
        ],
        buildPayload: (input) => {
            const firstFrameUrl = requireUrl(input, 'firstFrame');
            const lastFrameUrl = requireUrl(input, 'lastFrame');
            return {
                model: 'Doubao-Seedance-1.5-pro',
                content: [
                    { type: 'text', text: input.prompt },
                    { type: 'image_url', image_url: { url: firstFrameUrl }, role: 'first_frame' },
                    { type: 'image_url', image_url: { url: lastFrameUrl }, role: 'last_frame' },
                ],
                parameters: {
                    ratio: getString(input.params.ratio, '1:1'),
                    duration: getNumber(input.params.duration, 5),
                    watermark: getBoolean(input.params.watermark, false),
                },
            };
        },
    },
    {
        id: 'hailuo-img',
        title: 'MiniMax-Hailuo（单图）',
        inputs: {
            files: [
                { key: 'image', label: '图片', required: true, accept: 'image/png,image/jpeg,image/webp', help: '上传 1 张图片' },
            ],
        },
        parameters: [
            { key: 'duration', label: '时长（秒）', type: 'number', defaultValue: 6, options: [], min: 1, max: 30, step: 1 },
            { key: 'prompt_optimizer', label: '提示词优化', type: 'boolean', defaultValue: true, options: [] },
            { key: 'resolution', label: '分辨率', type: 'enum', defaultValue: '768P', options: [{ label: '768P', value: '768P' }, { label: '1080P', value: '1080P' }] },
            { key: 'watermark', label: '水印', type: 'boolean', defaultValue: true, options: [] },
        ],
        buildPayload: (input) => {
            const imageUrl = requireUrl(input, 'image');
            return {
                model: 'MiniMax-Hailuo-2.3',
                content: [
                    { type: 'text', text: input.prompt },
                    { type: 'image_url', image_url: { url: imageUrl } },
                ],
                parameters: {
                    duration: getNumber(input.params.duration, 6),
                    prompt_optimizer: getBoolean(input.params.prompt_optimizer, true),
                    resolution: getString(input.params.resolution, '768P'),
                    watermark: getBoolean(input.params.watermark, true),
                },
            };
        },
    },
    {
        id: 'kling-img',
        title: 'Kling（单图）',
        inputs: {
            files: [
                { key: 'image', label: '图片', required: true, accept: 'image/png,image/jpeg,image/webp', help: '上传 1 张图片' },
            ],
        },
        parameters: [
            { key: 'model', label: '模型', type: 'string', defaultValue: 'Kling-V2-5-Turbo', options: [], help: '默认 Kling-V2-5-Turbo' },
            { key: 'duration', label: '时长（秒）', type: 'number', defaultValue: 5, options: [], min: 1, max: 30, step: 1 },
            { key: 'mode', label: '模式', type: 'enum', defaultValue: 'std', options: [{ label: 'std', value: 'std' }, { label: 'pro', value: 'pro' }] },
        ],
        buildPayload: (input) => {
            const imageUrl = requireUrl(input, 'image');
            return {
                model: getString(input.params.model, 'Kling-V2-5-Turbo'),
                content: [
                    { type: 'text', text: input.prompt },
                    { type: 'image_url', image_url: { url: imageUrl } },
                ],
                parameters: {
                    duration: getNumber(input.params.duration, 5),
                    mode: getString(input.params.mode, 'std'),
                },
            };
        },
    },
    {
        id: 'kling-img-img',
        title: 'Kling（首尾帧）',
        inputs: {
            files: [
                { key: 'firstFrame', label: '首帧图片', required: true, accept: 'image/png,image/jpeg,image/webp', help: '上传首帧图片' },
                { key: 'lastFrame', label: '尾帧图片', required: true, accept: 'image/png,image/jpeg,image/webp', help: '上传尾帧图片' },
            ],
        },
        parameters: [
            { key: 'model', label: '模型', type: 'string', defaultValue: 'Kling-V2-5-Turbo', options: [] },
            { key: 'duration', label: '时长（秒）', type: 'number', defaultValue: 5, options: [], min: 1, max: 30, step: 1 },
            { key: 'mode', label: '模式', type: 'enum', defaultValue: 'pro', options: [{ label: 'std', value: 'std' }, { label: 'pro', value: 'pro' }] },
        ],
        buildPayload: (input) => {
            const firstFrameUrl = requireUrl(input, 'firstFrame');
            const lastFrameUrl = requireUrl(input, 'lastFrame');
            return {
                model: getString(input.params.model, 'Kling-V2-5-Turbo'),
                content: [
                    { type: 'text', text: input.prompt },
                    { type: 'image_url', role: 'first_frame', image_url: { url: firstFrameUrl } },
                    { type: 'image_url', role: 'last_frame', image_url: { url: lastFrameUrl } },
                ],
                parameters: {
                    mode: getString(input.params.mode, 'pro'),
                    duration: String(getNumber(input.params.duration, 5)),
                },
            };
        },
    },
    {
        id: 'sora-img',
        title: 'Sora-2（单图）',
        inputs: {
            files: [
                { key: 'image', label: '图片', required: true, accept: 'image/png,image/jpeg,image/webp', help: '上传 1 张图片' },
            ],
        },
        parameters: [
            { key: 'model', label: '模型', type: 'string', defaultValue: 'Sora-2', options: [] },
            { key: 'seconds', label: '时长（秒）', type: 'number', defaultValue: 8, options: [], min: 1, max: 60, step: 1 },
        ],
        buildPayload: (input) => {
            const imageUrl = requireUrl(input, 'image');
            return {
                model: getString(input.params.model, 'Sora-2'),
                content: [
                    { type: 'text', text: input.prompt },
                    { type: 'image_url', image_url: { url: imageUrl } },
                ],
                parameters: {
                    seconds: String(getNumber(input.params.seconds, 8)),
                },
            };
        },
    },
    {
        id: 'omnihuman',
        title: 'OmniHuman-1.5（图+音频）',
        inputs: {
            files: [
                { key: 'image', label: '人物图片', required: true, accept: 'image/png,image/jpeg,image/webp', help: '上传 1 张人物图片' },
                { key: 'audio', label: '驱动音频', required: false, accept: 'audio/mpeg,audio/wav', help: '用于驱动人物口型和动作' },
                { key: 'mask', label: 'Mask（可选）', required: false, accept: 'image/png,image/jpeg,image/webp', help: '尺寸必须与人物图片一致' },
            ],
        },
        parameters: [
            { key: 'seed', label: 'seed', type: 'number', defaultValue: -1, options: [], step: 1 },
            { key: 'pe_fast_mode', label: '快速模式', type: 'boolean', defaultValue: true, options: [] },
            { key: 'output_resolution', label: '输出分辨率', type: 'number', defaultValue: 720, options: [], min: 240, max: 2160, step: 1 },
        ],
        buildPayload: (input) => {
            const imageUrl = requireUrl(input, 'image');
            const audioUrl = input.fileUrls.audio || DEFAULT_OMNIHUMAN_AUDIO_URL;
            const maskUrl = input.fileUrls.mask;

            const content: any[] = [
                { type: 'text', text: input.prompt },
                { type: 'image_url', image_url: { url: imageUrl } },
            ];
            if (audioUrl) content.push({ type: 'audio_url', audio_url: { url: audioUrl } });
            if (maskUrl) content.push({ type: 'mask_url', image_url: { url: maskUrl } });

            return {
                model: 'OmniHuman-1.5',
                content,
                parameters: {
                    seed: getNumber(input.params.seed, -1),
                    pe_fast_mode: getBoolean(input.params.pe_fast_mode, true),
                    output_resolution: getNumber(input.params.output_resolution, 720),
                },
            };
        },
    },
];

// 鈹€鈹€鈹€ 鍏叡鏌ヨ 鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€

export function listGenerators(): GeneratorPublicSpec[] {
    return generators.map((g) => ({
        id: g.id,
        title: g.title,
        inputs: g.inputs,
        parameters: g.parameters,
    }));
}

export function getGenerator(id: string): GeneratorDefinition | undefined {
    return generators.find((g) => g.id === id);
}

// 鈹€鈹€鈹€ 浠诲姟鐘舵€佽В鏋愶紙绉绘鑷?taskStatus.ts锛夆攢鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€

function asRecord(v: unknown): Record<string, any> | null {
    if (!v || typeof v !== 'object') return null;
    return v as Record<string, any>;
}

function extractTaskStatusText(raw: unknown): string {
    const obj = asRecord(raw);
    if (!obj) return '';

    const candidates: unknown[] = [obj.status, obj.task_status, obj.state];
    const result = asRecord(obj.result);
    if (result) candidates.push(result.status, result.task_status, result.state);
    const data = asRecord(obj.data);
    if (data) {
        candidates.push(data.status, data.task_status, data.state);
        const dataResult = asRecord(data.result);
        if (dataResult) candidates.push(dataResult.status, dataResult.task_status, dataResult.state);
    }

    for (const v of candidates) {
        if (v === null || v === undefined) continue;
        const s = String(v).trim().toLowerCase();
        if (s) return s;
    }
    return '';
}

function normalizeTaskStatus(status: string): TaskStatus {
    const s = String(status || '').trim().toLowerCase();
    if (!s) return 'unknown';
    if (['queued', 'pending', 'created', 'waiting'].includes(s)) return 'queued';
    if (['running', 'processing', 'in_progress', 'doing'].includes(s)) return 'running';
    if (['completed', 'success', 'succeeded', 'done', 'finished'].includes(s)) return 'succeeded';
    if (['failed', 'error', 'fail'].includes(s)) return 'failed';
    if (s.includes('queue') || s.includes('pending')) return 'queued';
    if (s.includes('run') || s.includes('process') || s.includes('progress')) return 'running';
    if (s.includes('success') || s.includes('complete') || s.includes('finish')) return 'succeeded';
    if (s.includes('fail') || s.includes('error')) return 'failed';
    return 'unknown';
}

function isHttpUrl(s: string): boolean {
    try {
        const u = new URL(s);
        return u.protocol === 'http:' || u.protocol === 'https:';
    } catch {
        return false;
    }
}

function looksLikeVideoUrl(s: string): boolean {
    return /\.(mp4|mov|webm)(\?|$)/i.test(s) || s.toLowerCase().includes('video');
}

function collectUrlCandidates(raw: unknown, out: string[], depth: number): void {
    if (depth > 10) return;
    if (raw === null || raw === undefined) return;
    if (typeof raw === 'string') {
        if (isHttpUrl(raw)) out.push(raw);
        return;
    }
    if (Array.isArray(raw)) {
        for (const item of raw) collectUrlCandidates(item, out, depth + 1);
        return;
    }
    const obj = asRecord(raw);
    if (!obj) return;
    for (const [k, v] of Object.entries(obj)) {
        if (/result|output|data|payload/i.test(k)) collectUrlCandidates(v, out, depth + 1);
    }
    for (const v of Object.values(obj)) collectUrlCandidates(v, out, depth + 1);
}

function extractVideoUrl(raw: unknown): string | undefined {
    const candidates: string[] = [];
    collectUrlCandidates(raw, candidates, 0);
    if (!candidates.length) return undefined;
    const scored = candidates
        .map((url) => ({ url, score: (looksLikeVideoUrl(url) ? 2 : 0) + (url.includes('?') ? 1 : 0) }))
        .sort((a, b) => b.score - a.score);
    return scored[0]?.url;
}

function extractTaskId(raw: unknown): string {
    if (!raw || typeof raw !== 'object') return '';
    const obj = raw as Record<string, any>;
    const direct = obj.task_id ?? obj.taskId ?? obj.taskID;
    if (direct) return String(direct);
    const result = obj.result;
    if (result && typeof result === 'object') {
        const rid = (result as any).task_id ?? (result as any).taskId ?? (result as any).taskID;
        if (rid) return String(rid);
    }
    return '';
}

// 鈹€鈹€鈹€ API 璋冪敤 鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€

function getApiKey(): string {
    return process.env.VITE_TEXT_MODEL_API_KEY || '';
}

function getAuthHeader(): string {
    const key = getApiKey();
    if (!key) return '';
    return key.toLowerCase().startsWith('bearer ') ? key : `Bearer ${key}`;
}

const OSS_PROXY_PREFIX = '/jdoss';
const OSS_PUBLIC_BASE_URL = 'https://maas-task.s3.cn-north-1.jdcloud-oss.com';
const ENABLE_PROXY_UPLOAD_FALLBACK = String(process.env.VITE_OSS_UPLOAD_ENABLE_PROXY_FALLBACK || '')
    .trim()
    .toLowerCase() === 'true';
const SUBMIT_MAX_RETRIES = 3;
const SUBMIT_BASE_BACKOFF_MS = 1200;
const SUBMIT_MAX_BACKOFF_MS = 8000;

function sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
}

function parseRetryAfterMs(retryAfter: string | null): number | null {
    if (!retryAfter) return null;
    const trimmed = retryAfter.trim();
    const seconds = Number(trimmed);
    if (Number.isFinite(seconds) && seconds >= 0) {
        return Math.max(0, Math.round(seconds * 1000));
    }
    const at = Date.parse(trimmed);
    if (Number.isNaN(at)) return null;
    return Math.max(0, at - Date.now());
}

function isRateLimited(resp: Response, text: string): boolean {
    if (resp.status === 429) return true;
    return /RATE_LIMIT|request limit for seconds|too many requests/i.test(text);
}

/**
 * 灏嗘湰鍦版枃浠朵笂浼犲埌 OSS 骞惰繑鍥炲彲璁块棶鐨?URL
 * 浣跨敤鍚庣浠ｇ悊涓婁紶浠ヨ閬?CORS 闂
 */
export async function uploadFileToOss(
    file: File,
    fileKey: string,
    onProgress?: (percent: number) => void,
): Promise<string> {
    // 默认仅使用浏览器直传，避免开发服务进程承担大文件上行流量
    try {
        return await uploadFileToOssDirect(file, fileKey, onProgress);
    } catch (e) {
        if (ENABLE_PROXY_UPLOAD_FALLBACK) {
            // 仅在显式开启时才允许回退，避免无感回退导致 Node 进程占用高上行
            return await uploadFileToOssViaProxy(file, fileKey, onProgress);
        }
        const detail = e instanceof Error ? e.message : String(e);
        throw new Error(
            `直传 OSS 失败，已禁止回退代理上传以避免本地 Node 进程占用高网络上传。` +
            `请检查 OSS CORS/签名配置，或设置 VITE_OSS_UPLOAD_ENABLE_PROXY_FALLBACK=true 临时回退。` +
            ` 详情: ${detail}`
        );
    }
}

async function uploadFileToOssDirect(
    file: File,
    fileKey: string,
    onProgress?: (percent: number) => void,
): Promise<string> {
    const presignResp = await fetch('/api/oss/presign-put', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            fileKey,
            filename: file.name,
            contentType: file.type || 'application/octet-stream',
        }),
    });
    const presignText = await presignResp.text();
    if (!presignResp.ok) {
        throw new Error(`预签名失败: ${presignResp.status} ${presignText}`);
    }

    let presignData: any;
    try {
        presignData = JSON.parse(presignText);
    } catch {
        throw new Error('预签名响应解析失败');
    }

    const signedPutUrl = String(presignData?.signedPutUrl || '');
    if (!signedPutUrl) throw new Error('预签名结果缺少 signedPutUrl');
    const headers = (presignData?.headers && typeof presignData.headers === 'object') ? presignData.headers : {};

    await new Promise<void>((resolve, reject) => {
        const xhr = new XMLHttpRequest();
        xhr.open('PUT', signedPutUrl, true);
        Object.entries(headers).forEach(([k, v]) => {
            if (typeof v === 'string' && v) xhr.setRequestHeader(k, v);
        });
        xhr.upload.onprogress = (evt) => {
            if (evt.lengthComputable && onProgress) {
                onProgress((evt.loaded / evt.total) * 100);
            }
        };
        xhr.onload = () => {
            if (xhr.status >= 200 && xhr.status < 300) {
                resolve();
                return;
            }
            reject(new Error(`直传失败: ${xhr.status} ${(xhr.responseText || '').slice(0, 200)}`));
        };
        xhr.onerror = () => reject(new Error('直传失败: 网络错误'));
        xhr.send(file);
    });

    const signedGetUrl = typeof presignData?.url === 'string' ? presignData.url : '';
    if (signedGetUrl) return signedGetUrl;
    const objectKey = String(presignData?.objectKey || '');
    if (!objectKey) throw new Error('上传成功但未拿到 objectKey/url');
    return `${OSS_PUBLIC_BASE_URL}/${objectKey}`;
}

async function uploadFileToOssViaProxy(
    file: File,
    fileKey: string,
    onProgress?: (percent: number) => void,
): Promise<string> {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('fileKey', fileKey);

    return new Promise<string>((resolve, reject) => {
        const xhr = new XMLHttpRequest();
        xhr.open('POST', '/api/oss/upload', true);

        xhr.upload.onprogress = (evt) => {
            if (evt.lengthComputable && onProgress) {
                onProgress((evt.loaded / evt.total) * 100);
            }
        };

        xhr.onload = () => {
            if (xhr.status >= 200 && xhr.status < 300) {
                try {
                    const data = JSON.parse(xhr.responseText);
                    // 杩斿洖鍚庣鐢熸垚鐨勯绛惧悕 GET URL
                    resolve(data.url);
                } catch (e) {
                    reject(new Error('瑙ｆ瀽鍝嶅簲澶辫触'));
                }
            } else {
                const detail = (xhr.responseText || '').trim().slice(0, 200);
                reject(new Error(`涓婁紶澶辫触: ${xhr.status}${detail ? ` ${detail}` : ''}`));
            }
        };

        xhr.onerror = () => reject(new Error('涓婁紶澶辫触: 缃戠粶閿欒'));
        xhr.send(formData);
    });
}

/**
 * 鎻愪氦瑙嗛鐢熸垚浠诲姟
 */
export async function submitVideoTask(
    generatorId: string,
    prompt: string,
    fileUrls: Partial<Record<FileInputKey, string>>,
    params: Record<string, unknown>,
): Promise<{ taskId: string; raw: unknown }> {
    const def = getGenerator(generatorId);
    if (!def) throw new Error(`未知的生成器: ${generatorId}`);

    // 构建 payload
    const payload = def.buildPayload({ prompt, fileUrls, params });

    const auth = getAuthHeader();
    let lastStatus = 0;
    let lastText = '';
    let lastWasRateLimited = false;

    for (let attempt = 0; attempt <= SUBMIT_MAX_RETRIES; attempt++) {
        const resp = await fetch('/api/jdcloud/task/submit', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                ...(auth ? { Authorization: auth } : {}),
            },
            body: JSON.stringify(payload),
        });

        const text = await resp.text();
        if (resp.ok) {
            let raw: unknown;
            try {
                raw = JSON.parse(text);
            } catch {
                raw = { raw: text };
            }

            const taskId = extractTaskId(raw);
            if (!taskId) {
                throw new Error(`提交成功但未获取到 taskId: ${text}`);
            }

            return { taskId, raw };
        }

        lastStatus = resp.status;
        lastText = text;
        lastWasRateLimited = isRateLimited(resp, text);

        const canRetry = attempt < SUBMIT_MAX_RETRIES && lastWasRateLimited;
        if (!canRetry) break;

        const retryAfterMs = parseRetryAfterMs(resp.headers.get('Retry-After'));
        const expBackoff = Math.min(SUBMIT_BASE_BACKOFF_MS * Math.pow(2, attempt), SUBMIT_MAX_BACKOFF_MS);
        const jitter = Math.floor(Math.random() * 350);
        await sleep(retryAfterMs ?? (expBackoff + jitter));
    }

    if (lastWasRateLimited) {
        throw new Error(`模型服务触发限流，已自动重试 ${SUBMIT_MAX_RETRIES} 次仍失败，请稍后再试。原始错误: ${lastStatus} ${lastText}`);
    }
    throw new Error(`模型服务提交失败: ${lastStatus} ${lastText}`);
}

/**
 * 查询任务状态
 */
export async function pollVideoTask(taskId: string): Promise<TaskStatusResponse> {
    const auth = getAuthHeader();
    const safeTaskId = encodeURIComponent(String(taskId || ''));

    const resp = await fetch(`/api/jdcloud/task/status?taskId=${safeTaskId}`, {
        method: 'GET',
        headers: {
            'Content-Type': 'application/json',
            ...(auth ? { Authorization: auth } : {}),
        },
    });

    const text = await resp.text();
    if (!resp.ok) {
        throw new Error(`妯″瀷鏈嶅姟鏌ヨ澶辫触: ${resp.status} ${text}`);
    }

    let raw: unknown;
    try {
        raw = JSON.parse(text);
    } catch {
        raw = { raw: text };
    }

    const statusText = extractTaskStatusText(raw);
    const status = normalizeTaskStatus(statusText);
    const videoUrl = extractVideoUrl(raw);

    return {
        taskId,
        status,
        result: videoUrl ? { videoUrl } : undefined,
        raw,
    };
}

/**
 * 瀹屾暣鐨勮棰戠敓鎴愭祦绋嬶細鎻愪氦 鈫?绛夊緟 鈫?杞 鈫?杩斿洖缁撴灉
 */
export async function generateVideo(
    generatorId: string,
    prompt: string,
    fileUrls: Partial<Record<FileInputKey, string>>,
    params: Record<string, unknown>,
    onStatusChange?: (status: string) => void,
): Promise<VideoGenerationResult> {
    const def = getGenerator(generatorId);
    if (!def) throw new Error(`鏈煡鐨勭敓鎴愬櫒: ${generatorId}`);

    // 1. 鎻愪氦浠诲姟
    onStatusChange?.('姝ｅ湪鎻愪氦浠诲姟...');
    const { taskId } = await submitVideoTask(generatorId, prompt, fileUrls, params);

    // 2. 绛夊緟 30 绉掑悗寮€濮嬭疆璇?
    onStatusChange?.(`浠诲姟宸叉彁浜?(ID: ${taskId})锛岀瓑寰呭鐞嗕腑...`);
    await new Promise((r) => setTimeout(r, 30_000));

    // 3. 杞浠诲姟鐘舵€?
    const intervalMs = 15_000;
    const maxMs = 60 * 60 * 1000;
    const start = Date.now();

    let latest = await pollVideoTask(taskId);
    onStatusChange?.(`浠诲姟鐘舵€? ${latest.status}`);

    while (latest.status === 'queued' || latest.status === 'running' || latest.status === 'unknown') {
        if (Date.now() - start > maxMs) {
            throw new Error('轮询超时（已超过 1 小时）');
        }
        await new Promise((r) => setTimeout(r, intervalMs));
        latest = await pollVideoTask(taskId);
        onStatusChange?.(`浠诲姟鐘舵€? ${latest.status}`);
    }

    if (latest.status === 'failed') {
        throw new Error(latest.result?.message || '瑙嗛鐢熸垚澶辫触');
    }

    if (!latest.result?.videoUrl) {
        throw new Error('鐢熸垚瀹屾垚浣嗘湭鎵惧埌瑙嗛閾炬帴');
    }

    return {
        generatorId,
        generatorTitle: def.title,
        videoUrl: latest.result.videoUrl,
        prompt,
        taskId,
    };
}


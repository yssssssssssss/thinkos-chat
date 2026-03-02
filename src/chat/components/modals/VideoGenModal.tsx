/**
 * VideoGenModal - 视频生成弹窗
 * 集成 joy_ip_video 的 7 个视频生成器
 */

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Film, Loader2, Play, Upload, X, Download, ChevronRight, Check, AlertCircle } from 'lucide-react';
import type {
    GeneratorPublicSpec,
    FileInputKey,
    VideoTaskState,
    VideoUploadState,
    VideoGenerationResult,
} from '../../videoTypes';
import {
    listGenerators,
    uploadFileToOss,
    submitVideoTask,
    pollVideoTask,
} from '../../../../services/videoGenService';

// ─── props ────────────────────────────────────────────────────

interface VideoGenModalProps {
    onClose: () => void;
    onGenerated?: (result: VideoGenerationResult) => void;
}

// ─── helpers ──────────────────────────────────────────────────

function cx(...classes: Array<string | false | null | undefined>): string {
    return classes.filter(Boolean).join(' ');
}

// ─── component ────────────────────────────────────────────────

export const VideoGenModal: React.FC<VideoGenModalProps> = ({ onClose, onGenerated }) => {
    // 生成器列表
    const generators = useMemo(() => listGenerators(), []);
    const [activeId, setActiveId] = useState(() => generators[0]?.id ?? '');
    const active = useMemo(() => generators.find((g) => g.id === activeId) ?? null, [generators, activeId]);

    // 输入状态
    const [prompt, setPrompt] = useState('');
    const [fileStates, setFileStates] = useState<Record<string, VideoUploadState>>({});
    const [paramValues, setParamValues] = useState<Record<string, unknown>>({});

    // 任务状态
    const [taskState, setTaskState] = useState<VideoTaskState>({ status: 'idle' });
    const [videoUrl, setVideoUrl] = useState<string | null>(null);

    const abortRef = useRef(false);
    const submitLockRef = useRef(false);

    // 切换生成器时重置
    useEffect(() => {
        if (!active) return;
        setPrompt('');
        setTaskState({ status: 'idle' });
        setVideoUrl(null);
        abortRef.current = true; // cancel any ongoing poll

        const nextFiles: Record<string, VideoUploadState> = {};
        for (const f of active.inputs.files) nextFiles[f.key] = { status: 'idle' };
        setFileStates(nextFiles);

        const nextParams: Record<string, unknown> = {};
        for (const p of active.parameters) nextParams[p.key] = p.defaultValue;
        setParamValues(nextParams);

        return () => {
            // 清理预览 URL
            Object.values(nextFiles).forEach((st) => {
                if ('previewUrl' in st && st.previewUrl) URL.revokeObjectURL(st.previewUrl);
            });
        };
    }, [activeId]); // eslint-disable-line react-hooks/exhaustive-deps

    // Escape 关闭
    useEffect(() => {
        const handle = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
        window.addEventListener('keydown', handle);
        return () => window.removeEventListener('keydown', handle);
    }, [onClose]);

    // ───── 文件上传 ────────────────────────────────────────────

    const handleUpload = useCallback(async (fileKey: string, file: File) => {
        let previewUrl: string | undefined;
        if (file.type.startsWith('image/')) {
            previewUrl = URL.createObjectURL(file);
        }

        setFileStates((s) => ({ ...s, [fileKey]: { status: 'uploading', percent: 0, previewUrl } }));

        try {
            const objectUrl = await uploadFileToOss(file, fileKey, (percent) => {
                setFileStates((s) => ({ ...s, [fileKey]: { status: 'uploading', percent, previewUrl } }));
            });
            setFileStates((s) => ({ ...s, [fileKey]: { status: 'done', objectUrl, previewUrl } }));
        } catch (e) {
            setFileStates((s) => ({
                ...s,
                [fileKey]: { status: 'error', message: e instanceof Error ? e.message : String(e), previewUrl },
            }));
        }
    }, []);

    // ───── 提交 ────────────────────────────────────────────────

    const canSubmit = useMemo(() => {
        if (!active) return false;
        if (taskState.status === 'submitting' || taskState.status === 'polling') return false;
        if (!prompt.trim()) return false;
        for (const f of active.inputs.files) {
            const st = fileStates[f.key];
            if (f.required && st?.status !== 'done') return false;
            if (st?.status === 'uploading') return false;
        }
        return true;
    }, [active, prompt, fileStates, taskState.status]);

    const handleSubmit = useCallback(async () => {
        if (!active || !canSubmit || submitLockRef.current) return;
        submitLockRef.current = true;
        abortRef.current = false;

        const fileUrls: Partial<Record<FileInputKey, string>> = {};
        for (const f of active.inputs.files) {
            const st = fileStates[f.key];
            if (st?.status === 'done') fileUrls[f.key as FileInputKey] = st.objectUrl;
        }

        setTaskState({ status: 'submitting' });
        setVideoUrl(null);

        try {
            // 提交
            const { taskId } = await submitVideoTask(active.id, prompt.trim(), fileUrls, paramValues);
            setTaskState({ status: 'polling', taskId, progress: '任务已提交，等待处理...' });

            // 等30秒后开始轮询
            await new Promise((r) => setTimeout(r, 30_000));
            if (abortRef.current) return;

            // 轮询
            const start = Date.now();
            const maxMs = 60 * 60 * 1000;
            const intervalMs = 15_000;

            let latest = await pollVideoTask(taskId);
            setTaskState({ status: 'polling', taskId, progress: `状态: ${latest.status}` });

            while (
                !abortRef.current &&
                (latest.status === 'queued' || latest.status === 'running' || latest.status === 'unknown')
            ) {
                if (Date.now() - start > maxMs) throw new Error('轮询超时（已超过 1 小时）');
                await new Promise((r) => setTimeout(r, intervalMs));
                if (abortRef.current) return;
                latest = await pollVideoTask(taskId);
                setTaskState({ status: 'polling', taskId, progress: `状态: ${latest.status}` });
            }

            if (abortRef.current) return;

            if (latest.status === 'failed') {
                throw new Error(latest.result?.message || '视频生成失败');
            }

            if (!latest.result?.videoUrl) {
                throw new Error('生成完成但未找到视频链接');
            }

            setVideoUrl(latest.result.videoUrl);
            setTaskState({ status: 'done', videoUrl: latest.result.videoUrl, raw: latest.raw });

            onGenerated?.({
                generatorId: active.id,
                generatorTitle: active.title,
                videoUrl: latest.result.videoUrl,
                prompt: prompt.trim(),
                taskId,
            });
        } catch (e) {
            if (!abortRef.current) {
                setTaskState({ status: 'error', message: e instanceof Error ? e.message : String(e) });
            }
        } finally {
            submitLockRef.current = false;
        }
    }, [active, canSubmit, prompt, fileStates, paramValues, onGenerated]);

    // cleanup on unmount
    useEffect(() => {
        return () => { abortRef.current = true; };
    }, []);

    // ───── 渲染 ────────────────────────────────────────────────

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4" onClick={onClose}>
            <div
                className="bg-white rounded-2xl shadow-2xl w-full max-w-6xl h-[90vh] overflow-hidden flex flex-col"
                onClick={(e) => e.stopPropagation()}
            >
                {/* ── 头部 ── */}
                <div className="px-5 py-3.5 border-b border-gray-100 flex items-center justify-between shrink-0">
                    <div className="font-semibold text-gray-800 flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center">
                            <Film className="w-4 h-4 text-white" />
                        </div>
                        视频生成
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-xl transition-colors" title="关闭">
                        <X className="w-5 h-5 text-gray-500" />
                    </button>
                </div>

                {/* ── 主体 ── */}
                <div className="flex-1 overflow-hidden flex">
                    {/* 左侧生成器列表 */}
                    <nav className="w-56 border-r border-gray-100 bg-gray-50/80 overflow-y-auto shrink-0">
                        <div className="px-4 pt-4 pb-2 text-xs font-bold tracking-wide text-gray-400 uppercase">
                            Workflows
                        </div>
                        <div className="px-2 pb-4 flex flex-col gap-1">
                            {generators.map((g) => (
                                <button
                                    key={g.id}
                                    onClick={() => setActiveId(g.id)}
                                    className={cx(
                                        'w-full text-left px-3 py-2.5 rounded-xl text-sm transition-all',
                                        g.id === activeId
                                            ? 'bg-white text-violet-700 font-medium shadow-sm ring-1 ring-violet-200'
                                            : 'text-gray-600 hover:bg-white/60 hover:text-gray-800'
                                    )}
                                >
                                    {g.title}
                                </button>
                            ))}
                        </div>
                    </nav>

                    {/* 右侧内容 */}
                    <div className="flex-1 overflow-y-auto bg-gray-50">
                        {active ? (
                            <div className="p-6 max-w-3xl mx-auto space-y-6">
                                {/* 标题 */}
                                <div className="flex items-center gap-2">
                                    <h2 className="text-lg font-bold text-gray-800">{active.title}</h2>
                                </div>

                                {/* Prompt */}
                                <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
                                    <label className="text-sm font-semibold text-gray-700 mb-2 block">Prompt</label>
                                    <textarea
                                        className="w-full min-h-[100px] rounded-lg border border-gray-200 bg-gray-50 p-3 text-sm text-gray-800 outline-none transition focus:border-violet-300 focus:ring-2 focus:ring-violet-100 resize-none"
                                        placeholder="描述你想要生成的视频内容..."
                                        value={prompt}
                                        onChange={(e) => setPrompt(e.target.value)}
                                    />
                                </div>

                                {/* 文件上传 */}
                                {active.inputs.files.length > 0 && (
                                    <div className="grid gap-4 sm:grid-cols-2">
                                        {active.inputs.files.map((f) => {
                                            const st = fileStates[f.key] || { status: 'idle' as const };
                                            const isBusy = st.status === 'uploading';
                                            return (
                                                <div key={f.key} className="bg-white rounded-xl border border-gray-100 shadow-sm p-4 flex flex-col">
                                                    <div className="flex items-start justify-between mb-3">
                                                        <div>
                                                            <div className="text-sm font-semibold text-gray-700">
                                                                {f.label}
                                                                {f.required && <span className="ml-1 text-red-400">*</span>}
                                                            </div>
                                                            {f.help && <div className="mt-0.5 text-xs text-gray-400 leading-relaxed">{f.help}</div>}
                                                        </div>
                                                        {st.status === 'done' && (
                                                            <button
                                                                className="text-xs text-gray-400 hover:text-red-500 transition-colors"
                                                                onClick={() => {
                                                                    if ('previewUrl' in st && st.previewUrl) URL.revokeObjectURL(st.previewUrl);
                                                                    setFileStates((s) => ({ ...s, [f.key]: { status: 'idle' } }));
                                                                }}
                                                            >
                                                                清除
                                                            </button>
                                                        )}
                                                    </div>

                                                    <div className="flex items-center gap-3">
                                                        <div className="flex-1">
                                                            <input
                                                                disabled={isBusy}
                                                                className={cx(
                                                                    'w-full text-sm text-gray-500 file:mr-3 file:rounded-lg file:border-0 file:bg-violet-50 file:px-3 file:py-2 file:text-xs file:font-medium file:text-violet-600 hover:file:bg-violet-100',
                                                                    isBusy && 'cursor-not-allowed opacity-60'
                                                                )}
                                                                type="file"
                                                                accept={f.accept}
                                                                onChange={(e) => {
                                                                    const file = e.target.files?.[0];
                                                                    if (file) void handleUpload(f.key, file);
                                                                    e.target.value = '';
                                                                }}
                                                            />
                                                        </div>
                                                        {'previewUrl' in st && st.previewUrl && (
                                                            <div className="h-16 w-16 shrink-0 overflow-hidden rounded-lg border border-gray-100 bg-gray-50">
                                                                <img
                                                                    src={st.previewUrl}
                                                                    alt={`${f.label} 预览`}
                                                                    className="h-full w-full object-cover"
                                                                />
                                                            </div>
                                                        )}
                                                    </div>

                                                    {/* 状态指示 */}
                                                    <div className="mt-2 text-xs font-medium">
                                                        {st.status === 'idle' && <span className="text-gray-400">等待上传</span>}
                                                        {st.status === 'uploading' && (
                                                            <span className="text-violet-500">上传中 {Math.round(st.percent)}%</span>
                                                        )}
                                                        {st.status === 'done' && (
                                                            <span className="text-emerald-500 flex items-center gap-1">
                                                                <Check className="w-3 h-3" /> 已就绪
                                                            </span>
                                                        )}
                                                        {st.status === 'error' && (
                                                            <span className="text-red-500 flex items-center gap-1">
                                                                <AlertCircle className="w-3 h-3" /> {st.message}
                                                            </span>
                                                        )}
                                                    </div>

                                                    {st.status === 'uploading' && (
                                                        <div className="mt-2 h-1 w-full overflow-hidden rounded-full bg-gray-100">
                                                            <div
                                                                className="h-full rounded-full bg-violet-500 transition-all"
                                                                style={{ width: `${Math.max(2, Math.round(st.percent))}%` }}
                                                            />
                                                        </div>
                                                    )}
                                                </div>
                                            );
                                        })}
                                    </div>
                                )}

                                {/* 参数设置 */}
                                {active.parameters.length > 0 && (
                                    <details className="bg-white rounded-xl border border-gray-100 shadow-sm p-5" open>
                                        <summary className="cursor-pointer text-sm font-semibold text-gray-700 flex items-center gap-2">
                                            <ChevronRight className="w-4 h-4 transition-transform group-open:rotate-90" />
                                            高级参数
                                        </summary>
                                        <div className="mt-4 grid gap-4 md:grid-cols-2">
                                            {active.parameters.map((p) => {
                                                const val = paramValues[p.key];
                                                return (
                                                    <div key={p.key}>
                                                        <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
                                                            {p.label}
                                                        </label>
                                                        <div className="mt-1.5">
                                                            {p.type === 'boolean' ? (
                                                                <label className="inline-flex cursor-pointer items-center gap-2 rounded-lg bg-gray-50 px-3 py-2 transition hover:bg-gray-100">
                                                                    <input
                                                                        className="h-4 w-4 accent-violet-500 rounded"
                                                                        type="checkbox"
                                                                        checked={Boolean(val)}
                                                                        onChange={(e) =>
                                                                            setParamValues((s) => ({ ...s, [p.key]: e.target.checked }))
                                                                        }
                                                                    />
                                                                    <span className="text-sm text-gray-600">{Boolean(val) ? '开启' : '关闭'}</span>
                                                                </label>
                                                            ) : p.type === 'number' ? (
                                                                <input
                                                                    className="w-full rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-sm text-gray-700 outline-none transition focus:border-violet-300 focus:ring-2 focus:ring-violet-100"
                                                                    type="number"
                                                                    min={p.min}
                                                                    max={p.max}
                                                                    step={p.step ?? 1}
                                                                    value={val === '' ? '' : String(val ?? '')}
                                                                    onChange={(e) =>
                                                                        setParamValues((s) => ({
                                                                            ...s,
                                                                            [p.key]: e.target.value === '' ? '' : Number(e.target.value),
                                                                        }))
                                                                    }
                                                                />
                                                            ) : p.type === 'enum' ? (
                                                                <select
                                                                    className="w-full rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-sm text-gray-700 outline-none transition focus:border-violet-300 focus:ring-2 focus:ring-violet-100"
                                                                    value={String(val ?? '')}
                                                                    onChange={(e) =>
                                                                        setParamValues((s) => ({ ...s, [p.key]: e.target.value }))
                                                                    }
                                                                >
                                                                    {p.options.map((opt) => (
                                                                        <option key={opt.value} value={opt.value}>
                                                                            {opt.label}
                                                                        </option>
                                                                    ))}
                                                                </select>
                                                            ) : (
                                                                <input
                                                                    className="w-full rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-sm text-gray-700 outline-none transition focus:border-violet-300 focus:ring-2 focus:ring-violet-100"
                                                                    value={String(val ?? '')}
                                                                    onChange={(e) =>
                                                                        setParamValues((s) => ({ ...s, [p.key]: e.target.value }))
                                                                    }
                                                                />
                                                            )}
                                                        </div>
                                                        {p.help && <div className="mt-1 text-xs text-gray-400">{p.help}</div>}
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    </details>
                                )}

                                {/* 提交按钮 + 状态 */}
                                <div className="flex items-center gap-4 pt-2">
                                    <button
                                        onClick={() => void handleSubmit()}
                                        disabled={!canSubmit}
                                        className={cx(
                                            'inline-flex items-center gap-2 rounded-xl px-6 py-3 text-sm font-semibold transition-all',
                                            canSubmit
                                                ? 'bg-gradient-to-r from-violet-500 to-purple-600 text-white shadow-md hover:shadow-lg hover:from-violet-600 hover:to-purple-700'
                                                : 'bg-gray-100 text-gray-400 cursor-not-allowed'
                                        )}
                                    >
                                        {taskState.status === 'submitting' ? (
                                            <>
                                                <Loader2 className="w-4 h-4 animate-spin" />
                                                提交中...
                                            </>
                                        ) : taskState.status === 'polling' ? (
                                            <>
                                                <Loader2 className="w-4 h-4 animate-spin" />
                                                生成中...
                                            </>
                                        ) : (
                                            <>
                                                <Play className="w-4 h-4" />
                                                开始生成
                                            </>
                                        )}
                                    </button>

                                    {taskState.status === 'polling' && 'progress' in taskState && (
                                        <div className="flex items-center gap-2 px-3 py-1.5 bg-violet-50 text-violet-700 rounded-lg text-xs font-medium">
                                            <span className="h-1.5 w-1.5 rounded-full bg-violet-500 animate-pulse" />
                                            {taskState.progress}
                                        </div>
                                    )}
                                </div>

                                {/* 错误提示 */}
                                {taskState.status === 'error' && (
                                    <div className="rounded-xl border border-red-100 bg-red-50 p-4 text-sm text-red-700 flex items-start gap-3">
                                        <AlertCircle className="w-5 h-5 text-red-400 shrink-0 mt-0.5" />
                                        <div>
                                            <div className="font-semibold">生成失败</div>
                                            <div className="mt-0.5 text-red-600">{taskState.message}</div>
                                        </div>
                                    </div>
                                )}

                                {/* 视频结果 */}
                                {taskState.status === 'done' && videoUrl && (
                                    <div className="rounded-xl border border-emerald-100 bg-emerald-50 p-5">
                                        <div className="flex items-center gap-2 text-sm font-bold text-emerald-700 mb-4">
                                            <Check className="w-5 h-5" />
                                            生成成功
                                        </div>
                                        <div className="flex flex-col items-center gap-4">
                                            <div className="w-full max-w-md overflow-hidden rounded-xl border border-gray-200 bg-black shadow-lg">
                                                <video
                                                    className="block w-full h-auto max-h-[400px]"
                                                    controls
                                                    playsInline
                                                    preload="metadata"
                                                    src={videoUrl}
                                                />
                                            </div>
                                            <div className="flex gap-3">
                                                <a
                                                    className="inline-flex items-center gap-2 rounded-lg bg-white px-4 py-2.5 text-sm text-gray-600 border border-gray-200 hover:bg-gray-50 transition-colors"
                                                    href={videoUrl}
                                                    target="_blank"
                                                    rel="noreferrer"
                                                >
                                                    <Play className="w-4 h-4" />
                                                    新标签预览
                                                </a>
                                                <a
                                                    className="inline-flex items-center gap-2 rounded-lg bg-violet-500 px-4 py-2.5 text-sm text-white hover:bg-violet-600 transition-colors"
                                                    href={videoUrl}
                                                    download={`video-${Date.now()}.mp4`}
                                                >
                                                    <Download className="w-4 h-4" />
                                                    下载视频
                                                </a>
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </div>
                        ) : (
                            <div className="flex h-full items-center justify-center text-sm text-gray-400">
                                选择一个工作流开始
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default VideoGenModal;

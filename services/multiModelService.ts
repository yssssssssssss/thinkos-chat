/**
 * 多模型并行生成服务
 * 支持同时调用多个文本/图像模型，并提供流式响应
 */

import { chatCompletionsStream } from './textModelService';
import { generateImagesFromWorkflow } from './geminiImageService';
import { GeneratedImage } from '../types';
import { log } from '../utils/logger';

// ========== 类型定义 ==========

export type ModelResponseStatus = 'pending' | 'streaming' | 'complete' | 'error';

export interface TextModelResponse {
  modelId: string;
  modelName: string;
  status: ModelResponseStatus;
  content: string;
  error?: string;
}

export interface ImageModelResponse {
  modelId: string;
  modelName: string;
  status: ModelResponseStatus;
  image?: GeneratedImage;
  error?: string;
}

export interface MultiModelTextOptions {
  prompt: string;
  models: Array<{ id: string; name: string; systemPrompt?: string }>;
  globalSystemPrompt?: string;
  onUpdate: (responses: TextModelResponse[]) => void;
}

export interface MultiModelImageOptions {
  prompt: string;
  models: Array<{ id: string; name: string }>;
  inputImage?: string | null;
  onUpdate: (responses: ImageModelResponse[]) => void;
}

// ========== 文本模型并行流式生成 ==========

export const generateTextMultiModel = async (
  options: MultiModelTextOptions
): Promise<TextModelResponse[]> => {
  const { prompt, models, globalSystemPrompt, onUpdate } = options;

  log.info('MultiModelService', `开始文本生成`, { 
    models: models.map(m => m.id),
    promptLength: prompt.length 
  });

  // 初始化响应状态
  const responses: TextModelResponse[] = models.map(model => ({
    modelId: model.id,
    modelName: model.name,
    status: 'pending' as ModelResponseStatus,
    content: '',
  }));

  // 通知初始状态
  onUpdate([...responses]);

  // 并行调用所有模型
  const promises = models.map(async (model, index) => {
    try {
      log.debug('MultiModelService', `开始调用模型: ${model.name}`);
      // 更新为 streaming 状态
      responses[index].status = 'streaming';
      onUpdate([...responses]);

      const systemPrompt = model.systemPrompt || globalSystemPrompt;

      const finalText = await chatCompletionsStream(
        model.id,
        [{ role: 'user', content: prompt }],
        undefined,
        undefined,
        systemPrompt,
        (text) => {
          // 流式更新
          responses[index].content = text;
          onUpdate([...responses]);
        }
      );

      // 完成
      log.info('MultiModelService', `模型 ${model.name} 生成完成`, { 
        contentLength: finalText.length 
      });
      responses[index].status = 'complete';
      responses[index].content = finalText;
      onUpdate([...responses]);

      return responses[index];
    } catch (error) {
      log.error('MultiModelService', `模型 ${model.name} 生成失败`, error);
      responses[index].status = 'error';
      responses[index].error = error instanceof Error ? error.message : 'Unknown error';
      onUpdate([...responses]);
      return responses[index];
    }
  });

  await Promise.allSettled(promises);
  log.info('MultiModelService', '所有文本模型生成完成');

  return responses;
};

// ========== 图像模型并行生成 ==========

export const generateImageMultiModel = async (
  options: MultiModelImageOptions
): Promise<ImageModelResponse[]> => {
  const { prompt, models, inputImage, onUpdate } = options;

  log.info('MultiModelService', `开始图像生成`, { 
    models: models.map(m => m.id),
    hasInputImage: !!inputImage,
    promptLength: prompt.length 
  });

  // 初始化响应状态
  const responses: ImageModelResponse[] = models.map(model => ({
    modelId: model.id,
    modelName: model.name,
    status: 'pending' as ModelResponseStatus,
  }));

  // 通知初始状态
  onUpdate([...responses]);

  // 更新所有模型为 streaming 状态
  responses.forEach(r => r.status = 'streaming');
  onUpdate([...responses]);

  try {
    // 使用现有的 generateImagesFromWorkflow 进行并行生成
    const images = await generateImagesFromWorkflow(
      prompt,
      models.map(m => ({ id: m.id })),
      inputImage || undefined
    );

    log.info('MultiModelService', `图像生成完成`, { 
      generatedCount: images.length,
      requestedCount: models.length 
    });

    // 更新响应状态
    models.forEach((model, index) => {
      const image = images.find(img => img.model === model.id);
      if (image) {
        log.debug('MultiModelService', `模型 ${model.name} 生成成功`);
        responses[index].status = 'complete';
        responses[index].image = image;
      } else {
        log.warn('MultiModelService', `模型 ${model.name} 未生成图像`);
        responses[index].status = 'error';
        responses[index].error = 'No image generated';
      }
    });

    onUpdate([...responses]);
  } catch (error) {
    log.error('MultiModelService', '图像生成失败', error);
    // 标记所有为错误
    responses.forEach(r => {
      if (r.status !== 'complete') {
        r.status = 'error';
        r.error = error instanceof Error ? error.message : 'Unknown error';
      }
    });
    onUpdate([...responses]);
  }

  return responses;
};

// ========== 单模型重试 ==========

export const retryTextModel = async (
  modelId: string,
  modelName: string,
  prompt: string,
  systemPrompt?: string,
  onUpdate?: (response: TextModelResponse) => void
): Promise<TextModelResponse> => {
  const response: TextModelResponse = {
    modelId,
    modelName,
    status: 'streaming',
    content: '',
  };

  onUpdate?.(response);

  try {
    const finalText = await chatCompletionsStream(
      modelId,
      [{ role: 'user', content: prompt }],
      undefined,
      undefined,
      systemPrompt,
      (text) => {
        response.content = text;
        onUpdate?.({ ...response });
      }
    );

    response.status = 'complete';
    response.content = finalText;
    onUpdate?.({ ...response });

    return response;
  } catch (error) {
    response.status = 'error';
    response.error = error instanceof Error ? error.message : 'Unknown error';
    onUpdate?.({ ...response });
    return response;
  }
};

export const retryImageModel = async (
  modelId: string,
  modelName: string,
  prompt: string,
  inputImage?: string | null,
  onUpdate?: (response: ImageModelResponse) => void
): Promise<ImageModelResponse> => {
  const response: ImageModelResponse = {
    modelId,
    modelName,
    status: 'streaming',
  };

  onUpdate?.(response);

  try {
    const images = await generateImagesFromWorkflow(
      prompt,
      [{ id: modelId }],
      inputImage || undefined
    );

    if (images.length > 0) {
      response.status = 'complete';
      response.image = images[0];
    } else {
      response.status = 'error';
      response.error = 'No image generated';
    }

    onUpdate?.({ ...response });
    return response;
  } catch (error) {
    response.status = 'error';
    response.error = error instanceof Error ? error.message : 'Unknown error';
    onUpdate?.({ ...response });
    return response;
  }
};

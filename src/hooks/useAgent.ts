/**
 * Agent Hook
 * 管理 Agent 实例和执行状态
 */

import { useState, useCallback, useRef } from 'react';
import { Agent } from '../agent/agent';
import { AgentResponse } from '../agent/types';
import { log } from '../utils/logger';

export interface AgentState {
  isExecuting: boolean;
  currentSkill: string | null;
  error: string | null;
}

export function useAgent() {
  const agentRef = useRef<Agent>(new Agent());
  const [state, setState] = useState<AgentState>({
    isExecuting: false,
    currentSkill: null,
    error: null
  });

  /**
   * 执行自然语言聊天
   */
  const executeChat = useCallback(async (input: string): Promise<AgentResponse> => {
    setState({ isExecuting: true, currentSkill: null, error: null });

    try {
      log.info('useAgent', 'Agent 开始处理用户输入', { input });

      const response = await agentRef.current.chat(input);

      if (response.success) {
        setState({ isExecuting: false, currentSkill: response.skillId || null, error: null });
      } else {
        setState({ isExecuting: false, currentSkill: null, error: response.message });
      }

      return response;
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : '未知错误';
      log.error('useAgent', 'Agent 执行失败', error);
      setState({ isExecuting: false, currentSkill: null, error: errorMsg });

      return {
        success: false,
        message: errorMsg
      };
    }
  }, []);

  /**
   * 直接调用指定 Skill
   */
  const executeSkill = useCallback(async (
    skillId: string,
    params: Record<string, any>
  ): Promise<AgentResponse> => {
    setState({ isExecuting: true, currentSkill: skillId, error: null });

    try {
      log.info('useAgent', 'Agent 直接调用 Skill', { skillId, params });

      const response = await agentRef.current.invoke(skillId, params);

      if (response.success) {
        setState({ isExecuting: false, currentSkill: null, error: null });
      } else {
        setState({ isExecuting: false, currentSkill: null, error: response.message });
      }

      return response;
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : '未知错误';
      log.error('useAgent', 'Skill 执行失败', error);
      setState({ isExecuting: false, currentSkill: null, error: errorMsg });

      return {
        success: false,
        message: errorMsg
      };
    }
  }, []);

  /**
   * 重置错误状态
   */
  const resetError = useCallback(() => {
    setState(prev => ({ ...prev, error: null }));
  }, []);

  return {
    ...state,
    executeChat,
    executeSkill,
    resetError
  };
}

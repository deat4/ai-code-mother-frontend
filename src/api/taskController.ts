// @ts-ignore
/* eslint-disable */
import request from '@/utils/request'
import type { AxiosResponse } from 'axios'
import type { TaskInfo, TaskLogEntry, ValidationResult } from '@/types/task'

/**
 * 任务查询响应类型（后端返回结构）
 */
interface TaskResponse {
  id?: number
  sessionId?: string
  status?: string
  currentStage?: string
  errorMessage?: string
  validationSummary?: string
  validationPassed?: boolean
  issueCount?: number
  buildResult?: {
    installSuccess?: boolean
    buildSuccess?: boolean
    installExitCode?: number
    buildExitCode?: number
    installLog?: string
    buildLog?: string
    keyErrors?: string[]
    installDurationMs?: number
    buildDurationMs?: number
  }
}

/**
 * 基础响应包装
 */
interface BaseResponse<T> {
  code?: number
  data?: T
  message?: string
}

/**
 * 获取任务详情
 * GET /api/task/get?taskId={taskId}
 */
export async function getTask(taskId: number | string): Promise<AxiosResponse<BaseResponse<TaskResponse>>> {
  return request<BaseResponse<TaskResponse>>('/task/get', {
    method: 'GET',
    params: {
      taskId,
    },
  })
}

/**
 * 获取任务日志
 * GET /api/task/logs?taskId={taskId}
 */
export async function getTaskLogs(taskId: number | string): Promise<AxiosResponse<BaseResponse<TaskLogEntry[]>>> {
  return request<BaseResponse<TaskLogEntry[]>>('/task/logs', {
    method: 'GET',
    params: {
      taskId,
    },
  })
}

/**
 * 获取应用最新任务
 * GET /api/task/app/latest?appId={appId}
 */
export async function getLatestTaskByApp(appId: number | string): Promise<AxiosResponse<BaseResponse<TaskResponse>>> {
  return request<BaseResponse<TaskResponse>>('/task/app/latest', {
    method: 'GET',
    params: {
      appId,
    },
  })
}

/**
 * 解析任务响应为前端 TaskInfo 类型
 */
export function parseTaskResponse(response: TaskResponse): TaskInfo {
  return {
    taskId: response.id ?? 0,
    sessionId: response.sessionId,
    status: response.status,
    currentStage: response.currentStage,
    errorMessage: response.errorMessage,
    validationSummary: response.validationSummary,
    validationPassed: response.validationPassed,
    issueCount: response.issueCount,
    buildResult: response.buildResult,
  }
}
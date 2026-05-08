/**
 * 任务状态枚举
 * 注意：后端返回的是小写字符串，需要通过 normalizeTaskStatus 映射
 */
export enum TaskStatus {
  PENDING = 'PENDING',
  RUNNING = 'RUNNING',
  SUCCESS = 'SUCCESS',
  FAILED = 'FAILED',
  CANCELED = 'CANCELED',
}

/**
 * 任务阶段枚举
 * 注意：后端返回的是小写字符串，需要通过 normalizeTaskStage 映射
 */
export enum TaskStage {
  INIT = 'INIT',
  GENERATING = 'GENERATING',
  VALIDATING = 'VALIDATING',
  BUILDING = 'BUILDING',
  REPAIRING = 'REPAIRING',
  SCREENSHOT = 'SCREENSHOT',
  DONE = 'DONE',
}

/**
 * 后端状态字符串到前端枚举的映射
 */
const STATUS_MAP: Record<string, TaskStatus> = {
  pending: TaskStatus.PENDING,
  running: TaskStatus.RUNNING,
  success: TaskStatus.SUCCESS,
  failed: TaskStatus.FAILED,
  canceled: TaskStatus.CANCELED,
  cancelled: TaskStatus.CANCELED, // 兼容 alternate spelling
}

const STAGE_MAP: Record<string, TaskStage> = {
  init: TaskStage.INIT,
  generating: TaskStage.GENERATING,
  validating: TaskStage.VALIDATING,
  building: TaskStage.BUILDING,
  repairing: TaskStage.REPAIRING,
  screenshot: TaskStage.SCREENSHOT,
  done: TaskStage.DONE,
}

/**
 * 将后端返回的状态字符串标准化为前端枚举
 */
export function normalizeTaskStatus(status?: string): TaskStatus | undefined {
  if (!status) return undefined
  const lowerStatus = status.toLowerCase()
  return STATUS_MAP[lowerStatus] ?? undefined
}

/**
 * 将后端返回的阶段字符串标准化为前端枚举
 */
export function normalizeTaskStage(stage?: string): TaskStage | undefined {
  if (!stage) return undefined
  const lowerStage = stage.toLowerCase()
  return STAGE_MAP[lowerStage] ?? undefined
}

/**
 * 构建结果信息
 */
export interface BuildResult {
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

/**
 * 校验问题信息
 */
export interface ValidationIssue {
  type?: string
  severity?: string
  filePath?: string
  ruleCode?: string
  message?: string
  suggestion?: string
}

/**
 * 校验结果信息
 */
export interface ValidationResult {
  taskId?: number | string
  passed?: boolean
  summary?: string
  stage?: string
  issues?: ValidationIssue[]
  buildResult?: BuildResult
}

/**
 * 自动修复结果信息
 */
export interface RepairResult {
  taskId?: number | string
  repairRound?: number
  maxRepairRounds?: number
  attempted?: boolean
  success?: boolean
  summary?: string
  skippedReason?: string
}

/**
 * 任务信息
 */
export interface TaskInfo {
  taskId: number | string
  sessionId?: string
  status?: TaskStatus | string
  currentStage?: TaskStage | string
  errorMessage?: string
  validationSummary?: string
  validationPassed?: boolean
  issueCount?: number
  warningCount?: number
  buildResult?: BuildResult
  repairCount?: number
  maxRepairCount?: number
  repairSummary?: string
}

/**
 * 任务日志条目
 */
export interface TaskLogEntry {
  timestamp?: string
  stage?: string
  message?: string
  level?: string
}

/**
 * 任务状态显示文案映射
 */
export const TASK_STATUS_TEXT: Record<TaskStatus, string> = {
  [TaskStatus.PENDING]: '等待执行',
  [TaskStatus.RUNNING]: '正在执行',
  [TaskStatus.SUCCESS]: '任务完成',
  [TaskStatus.FAILED]: '任务失败',
  [TaskStatus.CANCELED]: '已取消',
}

/**
 * 任务阶段显示文案映射
 */
export const TASK_STAGE_TEXT: Record<TaskStage, string> = {
  [TaskStage.INIT]: '已创建任务',
  [TaskStage.GENERATING]: '正在生成代码',
  [TaskStage.VALIDATING]: '正在校验结果',
  [TaskStage.BUILDING]: '正在构建项目',
  [TaskStage.REPAIRING]: '正在自动修复',
  [TaskStage.SCREENSHOT]: '正在生成截图',
  [TaskStage.DONE]: '任务完成',
}

/**
 * 任务状态颜色映射（用于 Ant Design Tag）
 */
export const TASK_STATUS_COLOR: Record<TaskStatus, string> = {
  [TaskStatus.PENDING]: 'default',
  [TaskStatus.RUNNING]: 'processing',
  [TaskStatus.SUCCESS]: 'success',
  [TaskStatus.FAILED]: 'error',
  [TaskStatus.CANCELED]: 'warning',
}

/**
 * 任务阶段颜色映射（用于 Ant Design Tag）
 */
export const TASK_STAGE_COLOR: Record<TaskStage, string> = {
  [TaskStage.INIT]: 'default',
  [TaskStage.GENERATING]: 'processing',
  [TaskStage.VALIDATING]: 'processing',
  [TaskStage.BUILDING]: 'processing',
  [TaskStage.REPAIRING]: 'processing',
  [TaskStage.SCREENSHOT]: 'processing',
  [TaskStage.DONE]: 'success',
}

/**
 * 任务阶段顺序（用于时间线展示）
 * 注意：REPAIRING 只在校验失败后出现，不固定顺序
 */
export const TASK_STAGE_ORDER: TaskStage[] = [
  TaskStage.INIT,
  TaskStage.GENERATING,
  TaskStage.VALIDATING,
  TaskStage.BUILDING,
  TaskStage.DONE,
]

/**
 * 获取阶段在时间线中的位置索引
 */
export function getStageIndex(stage?: TaskStage): number {
  if (!stage) return -1
  return TASK_STAGE_ORDER.indexOf(stage)
}

/**
 * 判断阶段是否已完成（在当前阶段之前）
 */
export function isStageCompleted(stage: TaskStage, currentStage?: TaskStage): boolean {
  const currentIndex = getStageIndex(currentStage)
  const stageIndex = getStageIndex(stage)
  return stageIndex !== -1 && currentIndex !== -1 && stageIndex < currentIndex
}
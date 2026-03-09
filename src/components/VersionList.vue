<template>
  <div class="version-list">
    <div class="version-toolbar">
      <div class="toolbar-left">
        <span v-if="selectedCount > 0" class="selection-info">
          已选择 {{ selectedCount }} 个版本
        </span>
      </div>
      <div class="toolbar-right">
        <a-button type="primary" :disabled="selectedCount !== 2" @click="handleBatchCompare">
          对比选中的版本 ({{ selectedCount }}/2)
        </a-button>
      </div>
    </div>

    <a-table
      :columns="columns"
      :data-source="versions"
      :loading="loading"
      :pagination="pagination"
      row-key="id"
      size="small"
      @change="handleTableChange"
    >
      <template #bodyCell="{ column, record }">
        <template v-if="column.key === 'versionNumber'">
          <div class="version-cell">
            <a-checkbox
              :checked="!!selectedVersions[String(record.id)]"
              @change="(e) => handleVersionSelect(String(record.id), e.target.checked)"
            />
            <a-tag :color="record.versionNumber === currentVersion ? 'blue' : 'default'">
              v{{ record.versionNumber }}
            </a-tag>
          </div>
        </template>

        <template v-else-if="column.key === 'versionName'">
          <span>{{ record.versionName || `版本 ${record.versionNumber}` }}</span>
        </template>

        <template v-else-if="column.key === 'changeType'">
          <a-tag :color="getChangeTypeColor(record.changeType)">
            {{ getChangeTypeText(record.changeType) }}
          </a-tag>
        </template>

        <template v-else-if="column.key === 'createdAt'">
          {{ formatTime(record.createdAt) }}
        </template>

        <template v-else-if="column.key === 'action'">
          <a-space>
            <a-button
              type="link"
              size="small"
              @click="handleCompare(record)"
              :disabled="record.versionNumber === currentVersion"
            >
              对比
            </a-button>
            <a-button type="link" size="small" @click="handleView(record)"> 查看 </a-button>
            <a-button
              v-if="record.versionNumber < currentVersion"
              type="link"
              size="small"
              danger
              @click="handleRollback(record)"
            >
              回退
            </a-button>
          </a-space>
        </template>
      </template>
    </a-table>
  </div>
</template>

<script setup lang="ts">
import { ref, watch, computed } from 'vue'
import type { ColumnsType, TablePaginationConfig } from 'ant-design-vue/es/table'
import { message, Modal } from 'ant-design-vue'
import { listVersionsPage, rollbackToVersion } from '@/api/appVersionController'
import type { AppVersion } from '@/api/versionTypes'

interface Props {
  // 核心修复：业务主键 appId 必须是 string，防止雪花 ID 精度丢失
  appId: string
  // 假设 currentVersion 是常规自增版本号(如 1, 2, 3)。如果它也是雪花ID，请一并改为 string
  currentVersion: number
}

const props = defineProps<Props>()

const emit = defineEmits<{
  compare: [version: AppVersion, targetVersion?: AppVersion]
  view: [version: AppVersion]
  rollback: [version: AppVersion]
}>()

const versions = ref<AppVersion[]>([])
const loading = ref(false)
// 统一使用 string 类型的 key 来存储选中状态
const selectedVersions = ref<Record<string, boolean>>({})
const selectedCount = computed(() => Object.values(selectedVersions.value).filter(Boolean).length)

// 分页配置
const pagination = ref<TablePaginationConfig>({
  current: 1,
  pageSize: 10,
  total: 0,
  showSizeChanger: true,
})

const columns: ColumnsType<AppVersion> = [
  {
    title: '版本号',
    dataIndex: 'versionNumber',
    key: 'versionNumber',
    width: 120,
    sorter: (a: any, b: any) => (a.versionNumber || 0) - (b.versionNumber || 0),
  },
  {
    title: '版本名称',
    dataIndex: 'versionName',
    key: 'versionName',
    width: 150,
  },
  {
    title: '变更类型',
    dataIndex: 'changeType',
    key: 'changeType',
    width: 100,
  },
  {
    title: '摘要',
    dataIndex: 'summary',
    key: 'summary',
    ellipsis: true,
  },
  {
    title: '创建时间',
    dataIndex: 'createdAt',
    key: 'createdAt',
    width: 180,
    sorter: (a: any, b: any) => (a.createdAt || '').localeCompare(b.createdAt || ''),
  },
  {
    title: '操作',
    key: 'action',
    width: 200,
    fixed: 'right',
  },
]

// 加载版本列表
const loadVersions = async () => {
  if (!props.appId) return

  loading.value = true
  try {
    const res = await listVersionsPage({
      appId: props.appId,
      current: pagination.value.current,
      pageSize: pagination.value.pageSize,
    })

    if (res.data.code === 0 && res.data.data) {
      versions.value = res.data.data.records || []
      pagination.value.total = res.data.data.totalRow || 0
    }
  } catch (error) {
    console.error('加载版本列表失败:', error)
    message.error('加载版本列表失败')
  } finally {
    loading.value = false
  }
}

// 处理表格翻页和变动
const handleTableChange = (pag: TablePaginationConfig) => {
  pagination.value.current = pag.current || 1
  pagination.value.pageSize = pag.pageSize || 10
  loadVersions()
}

// 版本选择处理（强制入参 id 为 string）
const handleVersionSelect = (id: string, checked: boolean) => {
  if (checked && selectedCount.value >= 2) {
    message.warning('最多只能选择 2 个版本进行对比')
    return
  }
  selectedVersions.value[id] = checked
}

// 批量对比
const handleBatchCompare = () => {
  const selected = Object.entries(selectedVersions.value)
    .filter(([, checked]) => checked)
    // 强制转换为 string 进行比对
    .map(([id]) => versions.value.find((v) => String(v.id) === id))
    .filter(Boolean) as AppVersion[]

  if (selected.length !== 2) {
    message.warning('请选择 2 个版本进行对比')
    return
  }

  emit('compare', selected[0], selected[1])
}

// 单个版本对比
const handleCompare = (version: AppVersion) => {
  emit('compare', version)
}

// 查看版本详情
const handleView = (version: AppVersion) => {
  emit('view', version)
}

// 回退版本
const handleRollback = async (version: AppVersion) => {
  Modal.confirm({
    title: '确认回退',
    content: `确定要回退到版本 v${version.versionNumber} 吗？`,
    okText: '确认',
    cancelText: '取消',
    onOk: async () => {
      try {
        const res = await rollbackToVersion({
          appId: props.appId,
          targetVersion: version.versionNumber, // 注意这里传的是 versionNumber 还是 id，根据你的后端接口定
        })

        if (res.data.code === 0) {
          message.success('回退成功')
          loadVersions()
          emit('rollback', version)
        } else {
          message.error('回退失败')
        }
      } catch {
        message.error('回退失败')
      }
    },
  })
}

// 变更类型颜色
const getChangeTypeColor = (type?: string) => {
  const colors: Record<string, string> = {
    CREATE: 'green',
    UPDATE: 'blue',
    ROLLBACK: 'orange',
  }
  return colors[type || 'UPDATE'] || 'default'
}

// 变更类型文本
const getChangeTypeText = (type?: string) => {
  const texts: Record<string, string> = {
    CREATE: '创建',
    UPDATE: '更新',
    ROLLBACK: '回退',
  }
  return texts[type || 'UPDATE'] || type
}

// 格式化时间
const formatTime = (time?: string) => {
  if (!time) return '-'
  try {
    const date = new Date(time)
    return date.toLocaleString('zh-CN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    })
  } catch {
    return time
  }
}

// 监听应用 ID 变化
watch(
  () => props.appId,
  () => {
    // 切换应用时，重置分页和选中状态，避免数据错乱
    pagination.value.current = 1
    selectedVersions.value = {}
    loadVersions()
  },
  { immediate: true },
)

// 暴露加载方法
defineExpose({
  loadVersions,
})
</script>

<style scoped>
.version-list {
  background: #fff;
  border-radius: 8px;
}

/* 顶部操作栏 */
.version-toolbar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px;
  border-bottom: 1px solid #f0f0f0;
}

.toolbar-left {
  flex: 1;
}

.selection-info {
  font-size: 14px;
  color: #1890ff;
  font-weight: 500;
}

.toolbar-right {
  display: flex;
  gap: 8px;
}

/* 版本单元格 */
.version-cell {
  display: flex;
  align-items: center;
  gap: 8px;
}
</style>

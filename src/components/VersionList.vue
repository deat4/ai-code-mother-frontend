<template>
  <div class="version-list">
    <a-table
      :columns="columns"
      :data-source="versions"
      :loading="loading"
      :pagination="pagination"
      row-key="id"
      size="small"
    >
      <template #bodyCell="{ column, record }">
        <!-- 版本号 -->
        <template v-if="column.key === 'versionNumber'">
          <a-tag :color="record.versionNumber === currentVersion ? 'blue' : 'default'">
            v{{ record.versionNumber }}
          </a-tag>
        </template>

        <!-- 版本名称 -->
        <template v-else-if="column.key === 'versionName'">
          <span>{{ record.versionName || `版本 ${record.versionNumber}` }}</span>
        </template>

        <!-- 变更类型 -->
        <template v-else-if="column.key === 'changeType'">
          <a-tag :color="getChangeTypeColor(record.changeType)">
            {{ getChangeTypeText(record.changeType) }}
          </a-tag>
        </template>

        <!-- 创建时间 -->
        <template v-else-if="column.key === 'createdAt'">
          {{ formatTime(record.createdAt) }}
        </template>

        <!-- 操作 -->
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
import { ref, watch } from 'vue'
import type { ColumnsType } from 'ant-design-vue/es/table'
import { message, Modal } from 'ant-design-vue'
import { listAppVersions, rollbackToVersion } from '@/api/versionController'
import type { AppVersion } from '../../api/versionTypes'

interface Props {

  appId: number
  currentVersion: number
}

const props = defineProps<Props>()

const emit = defineEmits<{
  compare: [version: AppVersion]
  view: [version: AppVersion]
  rollback: [version: AppVersion]
}>()

const versions = ref<AppVersion[]>([])
const loading = ref(false)

// 分页
const pagination = ref({
  current: 1,
  pageSize: 10,
  total: 0,
  showSizeChanger: false,
  showTotal: (total: number) => `共 ${total} 个版本`,
})

// 表格列定义
const columns: ColumnsType<AppVersion> = [
  {
    title: '版本号',
    dataIndex: 'versionNumber',
    key: 'versionNumber',
    width: 100,
    sorter: (a, b) => (a.versionNumber || 0) - (b.versionNumber || 0),
  },
  {
    title: '版本名称',
    dataIndex: 'versionName',
    key: 'versionName',
    ellipsis: true,
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
    sorter: (a, b) => (a.createdAt || '').localeCompare(b.createdAt || ''),
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
  loading.value = true
  try {
    const res = await listAppVersions({
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

// 处理对比
const handleCompare = (record: AppVersion) => {
  emit('compare', record)
}

// 处理查看
const handleView = (record: AppVersion) => {
  emit('view', record)
}

// 处理回退
const handleRollback = async (record: AppVersion) => {
  if (!record.versionNumber) return

  Modal.confirm({
    title: '确认回退',
    content: `确定要回退到版本 ${record.versionNumber} 吗？回退后当前版本之后的所有版本将被保留但不会生效。`,
    okText: '确认回退',
    cancelText: '取消',
    okButtonProps: { danger: true },
    onOk: async () => {
      try {
        const res = await rollbackToVersion({
          appId: props.appId,
          targetVersion: record.versionNumber,
        })

        if (res.data.code === 0) {
          message.success('回退成功')
          emit('rollback', record)
          loadVersions()
        } else {
          message.error(res.data.message || '回退失败')
        }
      } catch (error) {
        console.error('回退失败:', error)
        message.error('回退失败')
      }
    },
  })
}

// 获取变更类型颜色
const getChangeTypeColor = (type?: string) => {
  const colors: Record<string, string> = {
    CREATE: 'green',
    UPDATE: 'blue',
    ROLLBACK: 'orange',
  }
  return colors[type || 'UPDATE'] || 'default'
}

// 获取变更类型文本
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
watch(() => props.appId, loadVersions, { immediate: true })

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
</style>
sions,
})

<style scoped>
.version-list {
  background: #fff;
  border-radius: 8px;
}
</style>

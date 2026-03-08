<template>
  <div class="chat-history-manage-page">
    <a-card title="对话管理" :bordered="false">
      <template #extra>
        <a-button type="primary" @click="doSearch">搜索</a-button>
        <a-button style="margin-left: 8px" @click="handleReset">重置</a-button>
      </template>

      <a-form layout="inline" :model="searchParams" style="margin-bottom: 16px">
        <a-form-item label="应用ID">
          <a-input-number
            v-model:value="searchParams.appId"
            placeholder="请输入应用ID"
            style="width: 200px"
            allow-clear
          />
        </a-form-item>
        <a-form-item label="用户ID">
          <a-input-number
            v-model:value="searchParams.userId"
            placeholder="请输入用户ID"
            style="width: 200px"
            allow-clear
          />
        </a-form-item>
        <a-form-item label="消息类型">
          <a-select
            v-model:value="searchParams.messageType"
            placeholder="请选择消息类型"
            style="width: 150px"
            allow-clear
          >
            <a-select-option value="user">用户消息</a-select-option>
            <a-select-option value="assistant">AI 消息</a-select-option>
          </a-select>
        </a-form-item>
      </a-form>

      <a-table
        :columns="columns"
        :data-source="data"
        :loading="loading"
        :pagination="pagination"
        row-key="id"
        @change="doTableChange"
      >
        <template #bodyCell="{ column, record }">
          <template v-if="column.key === 'messageType'">
            <a-tag :color="record.messageType === 'user' ? 'blue' : 'green'">
              {{ record.messageType === 'user' ? '用户' : 'AI' }}
            </a-tag>
          </template>
          <template v-if="column.key === 'message'">
            <a-tooltip :title="record.message">
              <span class="message-preview">{{ record.message }}</span>
            </a-tooltip>
          </template>
          <template v-if="column.key === 'createTime'">
            {{ formatDateTime(record.createTime) }}
          </template>
          <template v-if="column.key === 'action'">
            <a-space>
              <a-button type="link" size="small" @click="viewDetail(record)">查看</a-button>
              <a-button type="link" size="small" danger @click="handleDelete(record.id)"
                >删除</a-button
              >
            </a-space>
          </template>
        </template>
      </a-table>
    </a-card>

    <!-- 详情弹窗 -->
    <a-modal v-model:open="showDetailModal" title="对话详情" :footer="null" width="700px">
      <a-descriptions :column="1" bordered>
        <a-descriptions-item label="ID">{{ currentRecord?.id }}</a-descriptions-item>
        <a-descriptions-item label="应用ID">{{ currentRecord?.appId }}</a-descriptions-item>
        <a-descriptions-item label="用户ID">{{ currentRecord?.userId }}</a-descriptions-item>
        <a-descriptions-item label="消息类型">
          <a-tag :color="currentRecord?.messageType === 'user' ? 'blue' : 'green'">
            {{ currentRecord?.messageType === 'user' ? '用户' : 'AI' }}
          </a-tag>
        </a-descriptions-item>
        <a-descriptions-item label="父消息ID">{{
          currentRecord?.parentId || '-'
        }}</a-descriptions-item>
        <a-descriptions-item label="创建时间">
          {{ formatDateTime(currentRecord?.createTime) }}
        </a-descriptions-item>
        <a-descriptions-item label="消息内容">
          <div class="message-content-detail">
            {{ currentRecord?.message }}
          </div>
        </a-descriptions-item>
        <a-descriptions-item v-if="currentRecord?.fileList" label="文件列表">
          <div class="file-list">
            <div v-for="(file, index) in parseFileList(currentRecord?.fileList)" :key="index">
              📄 {{ file.name }}
            </div>
          </div>
        </a-descriptions-item>
      </a-descriptions>
    </a-modal>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, computed, onMounted } from 'vue'
import { message, Modal } from 'ant-design-vue'
import { listAllChatHistoryByPageForAdmin, deleteChatHistory } from '@/api/chatHistoryController'

// 表格列定义
const columns = [
  {
    title: 'ID',
    dataIndex: 'id',
    key: 'id',
    width: 100,
  },
  {
    title: '应用ID',
    dataIndex: 'appId',
    key: 'appId',
    width: 120,
  },
  {
    title: '用户ID',
    dataIndex: 'userId',
    key: 'userId',
    width: 100,
  },
  {
    title: '消息类型',
    dataIndex: 'messageType',
    key: 'messageType',
    width: 100,
  },
  {
    title: '消息内容',
    dataIndex: 'message',
    key: 'message',
    ellipsis: true,
  },
  {
    title: '创建时间',
    dataIndex: 'createTime',
    key: 'createTime',
    width: 180,
    sorter: true,
  },
  {
    title: '操作',
    key: 'action',
    width: 150,
    fixed: 'right' as const,
  },
]

// 数据和状态
const data = ref<API.ChatHistoryVO[]>([])
const total = ref(0)
const loading = ref(false)
const showDetailModal = ref(false)
const currentRecord = ref<API.ChatHistoryVO | null>(null)

// 搜索参数
const searchParams = reactive({
  current: 1,
  pageSize: 10,
  appId: undefined as number | undefined,
  userId: undefined as number | undefined,
  messageType: undefined as string | undefined,
})

// 分页配置
const pagination = computed(() => ({
  current: searchParams.current,
  pageSize: searchParams.pageSize,
  total: total.value,
  showSizeChanger: true,
  showQuickJumper: true,
  showTotal: (t: number) => `共 ${t} 条记录`,
}))

// 格式化日期时间
const formatDateTime = (dateStr?: string) => {
  if (!dateStr) return '-'
  try {
    const date = new Date(dateStr)
    return date.toLocaleString('zh-CN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    })
  } catch {
    return dateStr
  }
}

// 解析文件列表
const parseFileList = (fileListStr?: string) => {
  if (!fileListStr) return []
  try {
    return JSON.parse(fileListStr)
  } catch {
    return []
  }
}

// 获取数据
const fetchData = async () => {
  loading.value = true
  try {
    const res = await listAllChatHistoryByPageForAdmin({
      current: searchParams.current,
      pageSize: searchParams.pageSize,
      appId: searchParams.appId,
      userId: searchParams.userId,
      messageType: searchParams.messageType,
    })

    if (res.data.code === 0 && res.data.data) {
      data.value = res.data.data.records || []
      total.value = res.data.data.totalRow || 0
    } else {
      message.error('获取数据失败：' + (res.data.message || '未知错误'))
    }
  } catch (error) {
    console.error('获取数据失败:', error)
    message.error('获取数据失败')
  } finally {
    loading.value = false
  }
}

// 搜索
const doSearch = () => {
  searchParams.current = 1
  fetchData()
}

// 重置
const handleReset = () => {
  searchParams.current = 1
  searchParams.appId = undefined
  searchParams.userId = undefined
  searchParams.messageType = undefined
  fetchData()
}

// 表格变化处理
const doTableChange = (pag: { current?: number; pageSize?: number }) => {
  searchParams.current = pag.current || 1
  searchParams.pageSize = pag.pageSize || 10
  fetchData()
}

// 查看详情
const viewDetail = (record: API.ChatHistoryVO) => {
  currentRecord.value = record
  showDetailModal.value = true
}

// 删除
const handleDelete = (id: number) => {
  Modal.confirm({
    title: '确认删除',
    content: '确定要删除这条对话记录吗？删除后无法恢复。',
    okText: '删除',
    cancelText: '取消',
    okButtonProps: { danger: true },
    onOk: async () => {
      try {
        const res = await deleteChatHistory({ id })
        if (res.data.code === 0) {
          message.success('删除成功')
          fetchData()
        } else {
          message.error('删除失败：' + (res.data.message || '未知错误'))
        }
      } catch (error) {
        console.error('删除失败:', error)
        message.error('删除失败')
      }
    },
  })
}

// 初始化
onMounted(() => {
  fetchData()
})
</script>

<style scoped>
.chat-history-manage-page {
  padding: 24px;
  background: #f0f2f5;
  min-height: 100vh;
}

.message-preview {
  display: inline-block;
  max-width: 300px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.message-content-detail {
  max-height: 300px;
  overflow-y: auto;
  padding: 12px;
  background: #f5f5f5;
  border-radius: 4px;
  white-space: pre-wrap;
  word-break: break-all;
}

.file-list {
  padding: 8px 0;
}
</style>

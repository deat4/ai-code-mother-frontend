<script setup lang="ts">
import { ref, reactive, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { message, Modal } from 'ant-design-vue'
import dayjs from 'dayjs'
import { listAppVoByPageByAdmin, deleteAppByAdmin, updateAppByAdmin } from '@/api/appController'

const router = useRouter()

// 表格列定义
const columns = [
  { title: 'ID', dataIndex: 'id', width: 80 },
  { title: '应用名称', dataIndex: 'appName' },
  { title: '封面', dataIndex: 'cover', width: 120 },
  { title: '优先级', dataIndex: 'priority', width: 80 },
  { title: '创建者', dataIndex: 'user.userName' },
  { title: '创建时间', dataIndex: 'createTime', width: 180 },
  { title: '操作', key: 'action', width: 200, fixed: 'right' as const },
]

// 数据
const data = ref<API.AppVO[]>([])
const total = ref(0)
const loading = ref(false)

// 搜索条件
const searchParams = reactive<API.AppQueryRequest>({
  current: 1,
  pageSize: 10,
})

// 分页参数
const pagination = computed(() => {
  return {
    current: searchParams.current ?? 1,
    pageSize: searchParams.pageSize ?? 10,
    total: total.value,
    showSizeChanger: true,
    showTotal: (total: number) => `共 ${total} 条`,
  }
})

// 获取数据
const fetchData = async () => {
  loading.value = true
  try {
    const res = await listAppVoByPageByAdmin({
      ...searchParams,
    })
    if (res.data.code === 0 && res.data.data) {
      data.value = res.data.data.records ?? []
      total.value = res.data.data.totalRow ?? 0
    } else {
      message.error('获取数据失败，' + (res.data.message ?? '未知错误'))
    }
  } catch {
    message.error('获取数据失败，请稍后重试')
  } finally {
    loading.value = false
  }
}

// 搜索
const doSearch = () => {
  searchParams.current = 1
  fetchData()
}

// 表格变化处理
const doTableChange = (page: { current: number; pageSize: number }) => {
  searchParams.current = page.current
  searchParams.pageSize = page.pageSize
  fetchData()
}

// 删除数据
const doDelete = async (id: number) => {
  if (!id) return
  try {
    const res = await deleteAppByAdmin({ id })
    if (res.data.code === 0) {
      message.success('删除成功')
      fetchData()
    } else {
      message.error('删除失败，' + (res.data.message ?? '未知错误'))
    }
  } catch {
    message.error('删除失败，请稍后重试')
  }
}

// 删除确认
const handleDelete = (id: number) => {
  Modal.confirm({
    title: '确认删除',
    content: '确定要删除该应用吗？此操作不可恢复。',
    okText: '确认',
    cancelText: '取消',
    onOk: () => doDelete(id),
  })
}

// 编辑应用
const handleEdit = (id: number) => {
  router.push(`/app/edit/${id}`)
}

// 设为精选
const handleSetGood = async (record: API.AppVO) => {
  try {
    const res = await updateAppByAdmin({
      id: record.id,
      priority: 99,
    })
    if (res.data.code === 0) {
      message.success('已设为精选')
      fetchData()
    } else {
      message.error('设置失败')
    }
  } catch {
    message.error('设置失败')
  }
}

onMounted(() => {
  fetchData()
})
</script>

<template>
  <div class="app-manage-page">
    <!-- 搜索表单 -->
    <a-form layout="inline" :model="searchParams" @finish="doSearch">
      <a-form-item label="应用名称">
        <a-input v-model:value="searchParams.appName" placeholder="输入应用名称" allow-clear />
      </a-form-item>
      <a-form-item label="优先级">
        <a-input-number v-model:value="searchParams.priority" placeholder="优先级" />
      </a-form-item>
      <a-form-item>
        <a-button type="primary" html-type="submit">搜索</a-button>
      </a-form-item>
    </a-form>
    <a-divider />
    <!-- 表格 -->
    <a-table
      :columns="columns"
      :data-source="data"
      :loading="loading"
      :pagination="pagination"
      row-key="id"
      @change="doTableChange"
    >
      <template #bodyCell="{ column, record }">
        <template v-if="column.dataIndex === 'cover'">
          <a-image v-if="record.cover" :src="record.cover" :width="80" />
          <span v-else>无封面</span>
        </template>
        <template v-else-if="column.dataIndex === 'createTime'">
          {{ dayjs(record.createTime).format('YYYY-MM-DD HH:mm:ss') }}
        </template>
        <template v-else-if="column.key === 'action'">
          <a-space>
            <a-button type="link" size="small" @click="handleEdit(record.id)">编辑</a-button>
            <a-button type="link" size="small" @click="handleSetGood(record)">精选</a-button>
            <a-button danger type="link" size="small" @click="handleDelete(record.id)">
              删除
            </a-button>
          </a-space>
        </template>
      </template>
    </a-table>
  </div>
</template>

<style scoped>
.app-manage-page {
  padding: 24px;
}
</style>

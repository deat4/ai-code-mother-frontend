<script setup lang="ts">
import { Layout } from 'ant-design-vue'
import GlobalHeader from '@/components/GlobalHeader.vue'
import GlobalFooter from '@/components/GlobalFooter.vue'

const { Header, Content, Footer } = Layout
</script>

<template>
  <Layout class="basic-layout">
    <Header class="layout-header">
      <GlobalHeader />
    </Header>
    <Content class="layout-content">
      <div class="content-wrapper">
        <router-view />
      </div>
    </Content>
    <Footer class="layout-footer">
      <GlobalFooter />
    </Footer>
  </Layout>
</template>

<style scoped>
.basic-layout {
  min-height: 100vh;
  display: flex;
  flex-direction: column;
}

.layout-header {
  padding: 0;
  height: 64px;
  line-height: 64px;
  background: #fff;
  position: sticky;
  top: 0;
  z-index: 100;
}

.layout-content {
  flex: 1;
  background: #f0f2f5;
  padding: 24px 50px;
}

.content-wrapper {
  max-width: 1200px;
  margin: 0 auto;
  background: #fff;
  padding: 24px;
  border-radius: 8px;
  min-height: calc(100vh - 64px - 120px - 48px);
}

.layout-footer {
  padding: 0;
  background: #f0f2f5;
}

@media (max-width: 768px) {
  .layout-content {
    padding: 16px 12px;
  }

  .content-wrapper {
    padding: 16px;
    border-radius: 4px;
  }
}
</style>

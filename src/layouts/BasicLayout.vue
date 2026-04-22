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
  background: var(--color-surface-subtle);
}

.layout-header {
  padding: var(--space-0);
  height: 64px;
  line-height: 64px;
  background: var(--color-surface-base);
  border-bottom: 1px solid var(--color-border-subtle);
  box-shadow: var(--shadow-1);
  position: sticky;
  top: 0;
  z-index: 100;
}

.layout-content {
  flex: 1;
  background: var(--color-surface-subtle);
  padding: var(--space-6) var(--space-10);
}

.content-wrapper {
  max-width: 1200px;
  margin: 0 auto;
  background: var(--color-surface-base);
  padding: var(--space-6);
  border-radius: var(--radius-lg);
  border: 1px solid var(--color-border-subtle);
  box-shadow: var(--shadow-1);
  min-height: calc(100vh - 64px - 120px - 48px);
}

.layout-footer {
  padding: var(--space-0);
  background: var(--color-surface-subtle);
  border-top: 1px solid var(--color-border-subtle);
}

@media (max-width: 768px) {
  .layout-content {
    padding: var(--space-4) var(--space-3);
  }

  .content-wrapper {
    padding: var(--space-4);
    border-radius: var(--radius-md);
  }
}
</style>

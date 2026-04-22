<script setup lang="ts">
const currentYear = new Date().getFullYear()
</script>

<template>
  <div class="global-footer">
    <div class="footer-content">
      <span>
        编程导航原创项目 by
        <a href="https://www.codefather.cn" target="_blank" rel="noopener noreferrer">
          程序员鱼皮
        </a>
      </span>
      <span class="copyright"> © {{ currentYear }} </span>
    </div>
  </div>
</template>

<style scoped>
.global-footer {
  padding: var(--space-6) var(--space-10);
  background: var(--color-surface-subtle);
  text-align: center;
}

.footer-content {
  color: var(--color-text-secondary);
  font-size: var(--font-size-14);
}

.footer-content a {
  color: var(--color-accent);
  text-decoration: none;
}

.footer-content a:hover {
  color: var(--color-accent-hover);
}

.copyright {
  margin-left: var(--space-2);
}

@media (max-width: 768px) {
  .global-footer {
    padding: var(--space-4) var(--space-6);
  }
}
</style>

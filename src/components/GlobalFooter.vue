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
  padding: 24px 50px;
  background: #f0f2f5;
  text-align: center;
}

.footer-content {
  color: rgba(0, 0, 0, 0.65);
  font-size: 14px;
}

.footer-content a {
  color: #1890ff;
  text-decoration: none;
}

.footer-content a:hover {
  color: #40a9ff;
}

.copyright {
  margin-left: 8px;
}

@media (max-width: 768px) {
  .global-footer {
    padding: 16px 24px;
  }
}
</style>

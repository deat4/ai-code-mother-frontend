<script setup lang="ts">
import { computed } from 'vue'
import { marked, type Tokens } from 'marked'
import hljs from 'highlight.js'
import DOMPurify from 'dompurify'

interface Props {
  content: string
}

interface HtmlPayload {
  html?: string
}

const props = defineProps<Props>()

// Custom renderer for code highlighting
const renderer = {
  code({ text, lang }: Tokens.Code): string {
    const language = lang && hljs.getLanguage(lang) ? lang : 'plaintext'
    const highlighted = hljs.highlight(text, { language }).value
    return `<pre><code class="hljs language-${language}">${highlighted}</code></pre>`
  },
}

// Use local renderer to avoid polluting global marked instance
marked.use({ renderer })

const tryParseHtmlPayload = (raw: string): string | null => {
  const trimmed = raw.trim()

  const parsePayload = (jsonText: string): string | null => {
    try {
      const parsed = JSON.parse(jsonText) as HtmlPayload
      if (parsed && typeof parsed.html === 'string') {
        return parsed.html
      }
    } catch {
      // Ignore parse errors and fall back to normal markdown rendering
    }
    return null
  }

  // 1) Plain JSON: { "html": "..." }
  if (trimmed.startsWith('{') && trimmed.endsWith('}')) {
    const html = parsePayload(trimmed)
    if (html) return html
  }

  // 2) Fenced JSON: ```json { "html": "..." } ```
  const fencedMatch = trimmed.match(/^```(?:json)?\s*([\s\S]*?)\s*```$/i)
  if (fencedMatch?.[1]) {
    const html = parsePayload(fencedMatch[1].trim())
    if (html) return html
  }

  return null
}

const renderedContent = computed(() => {
  if (!props.content) return ''

  let contentToRender = props.content
  const extractedHtml = tryParseHtmlPayload(props.content)
  if (extractedHtml) {
    contentToRender = extractedHtml
  }

  // If content is HTML, render directly
  const normalized = contentToRender.trim().toLowerCase()
  if (
    normalized.startsWith('<!doctype') ||
    normalized.startsWith('<html') ||
    normalized.startsWith('<head')
  ) {
    return DOMPurify.sanitize(contentToRender, {
      ADD_ATTR: ['class', 'style', 'id', 'data-*'],
      ADD_TAGS: ['style', 'script'],
    })
  }

  // Parse markdown and sanitize for XSS protection
  const rawHtml = marked.parse(contentToRender) as string
  return DOMPurify.sanitize(rawHtml, {
    ADD_ATTR: ['class'],
  })
})
</script>

<template>
  <div class="markdown-content" v-html="renderedContent"></div>
</template>

<style scoped>
/* Import highlight.js theme */
@import 'highlight.js/styles/github-dark.css';

.markdown-content {
  line-height: 1.6;
  word-wrap: break-word;
}

/* Headings */
.markdown-content :deep(h1),
.markdown-content :deep(h2),
.markdown-content :deep(h3),
.markdown-content :deep(h4),
.markdown-content :deep(h5),
.markdown-content :deep(h6) {
  margin-top: 1em;
  margin-bottom: 0.5em;
  font-weight: 600;
  line-height: 1.25;
}

.markdown-content :deep(h1) {
  font-size: 1.5em;
  border-bottom: 1px solid #e1e4e8;
  padding-bottom: 0.3em;
}

.markdown-content :deep(h2) {
  font-size: 1.25em;
  border-bottom: 1px solid #e1e4e8;
  padding-bottom: 0.3em;
}

.markdown-content :deep(h3) {
  font-size: 1.1em;
}

/* Paragraphs */
.markdown-content :deep(p) {
  margin: 0.5em 0;
}

/* Lists */
.markdown-content :deep(ul),
.markdown-content :deep(ol) {
  padding-left: 1.5em;
  margin: 0.5em 0;
}

.markdown-content :deep(li) {
  margin: 0.25em 0;
}

/* Code blocks */
.markdown-content :deep(pre) {
  background-color: #161b22;
  border-radius: 6px;
  padding: 1em;
  overflow-x: auto;
  margin: 0.75em 0;
  position: relative;
  white-space: pre-wrap; /* 保留空白但允许换行 */
  word-break: break-word; /* 长单词/代码在边界换行 */
}

.markdown-content :deep(pre code) {
  font-family: 'Fira Code', 'Consolas', 'Monaco', monospace;
  font-size: 0.875em;
  line-height: 1.5;
  background: transparent;
  padding: 0;
  color: #c9d1d9; /* github-dark 默认文字颜色，确保流式生成时也能看清 */
}

/* Inline code */
.markdown-content :deep(code:not(pre code)) {
  background-color: rgba(175, 184, 193, 0.2);
  border-radius: 6px;
  font-family: 'Fira Code', 'Consolas', 'Monaco', monospace;
  font-size: 0.875em;
  padding: 0.2em 0.4em;
}

/* Blockquotes */
.markdown-content :deep(blockquote) {
  border-left: 4px solid #58a6ff;
  padding: 0.5em 1em;
  margin: 0.5em 0;
  color: #8b949e;
  background-color: rgba(110, 118, 129, 0.1);
  border-radius: 0 6px 6px 0;
}

/* Tables */
.markdown-content :deep(table) {
  border-collapse: collapse;
  width: 100%;
  margin: 0.75em 0;
}

.markdown-content :deep(th),
.markdown-content :deep(td) {
  border: 1px solid #30363d;
  padding: 0.5em 0.75em;
}

.markdown-content :deep(th) {
  background-color: #21262d;
  font-weight: 600;
}

/* Links */
.markdown-content :deep(a) {
  color: #58a6ff;
  text-decoration: none;
}

.markdown-content :deep(a:hover) {
  text-decoration: underline;
}

/* Horizontal rule */
.markdown-content :deep(hr) {
  border: none;
  border-top: 1px solid #30363d;
  margin: 1em 0;
}

/* Images */
.markdown-content :deep(img) {
  max-width: 100%;
  border-radius: 6px;
}
</style>

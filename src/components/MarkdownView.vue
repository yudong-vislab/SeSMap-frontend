<script setup>
import { computed } from 'vue'
import MarkdownIt from 'markdown-it'
import DOMPurify from 'dompurify'

const props = defineProps({
  source: { type: String, default: '' }
})

const md = new MarkdownIt({
  html: false,        // 禁止原生 HTML 直通
  linkify: true,
  breaks: true
})

const rendered = computed(() => {
  const html = md.render(props.source || '')
  return DOMPurify.sanitize(html) // 防 XSS
})
</script>

<template>
  <div class="markdown-body" v-html="rendered"></div>
</template>

<style scoped>
.markdown-body :deep(h1){ font-size:1.25rem; margin:.75rem 0 .25rem; }
.markdown-body :deep(h2){ font-size:1.1rem; margin:.7rem 0 .2rem; }
.markdown-body :deep(h3){ font-size:1rem; margin:.6rem 0 .2rem; }
.markdown-body :deep(p), 
.markdown-body :deep(li){ line-height:1.5; }
.markdown-body :deep(code){ background:#f6f8fa; padding:2px 4px; border-radius:4px; }
.markdown-body :deep(ul){ padding-left:1.2rem; }
</style>

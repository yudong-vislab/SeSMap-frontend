<script setup>
import { computed } from 'vue'
import MarkdownIt from 'markdown-it'
import DOMPurify from 'dompurify'

const props = defineProps({
  source: { type: String, default: '' }
})

// 单例 md 实例
const md = new MarkdownIt({
  html: false,      // 禁止原生 HTML 直通
  linkify: true,
  breaks: true
})

const rendered = computed(() => {
  try {
    const raw = props.source || ''
    const html = md.render(raw)
    return DOMPurify.sanitize(html)
  } catch (e) {
    // 任何异常都降级为文本
    return DOMPurify.sanitize(String(props.source || ''))
  }
})
</script>

<template>
  <div class="markdown-body" v-html="rendered"></div>
</template>

<style scoped>
.markdown-body :deep(h1),
.markdown-body :deep(h2),
.markdown-body :deep(h3),
.markdown-body :deep(h4),
.markdown-body :deep(h5),
.markdown-body :deep(h6){
  font-size: 1em;
  font-weight: 600;
  margin: .25rem 0 .2rem;   /* 收紧上下边距 */
}
/* 段落/列表行距与间距更紧凑 */
.markdown-body :deep(p),
.markdown-body :deep(li){
  line-height: 1.45;
  margin: .15rem 0;
}
.markdown-body :deep(ul),
.markdown-body :deep(ol){
  padding-left: 1rem;
  margin: .15rem 0;
}
.markdown-body :deep(code){
  background:#f6f8fa;
  padding:2px 4px;
  border-radius:4px;
}

 .markdown-body :deep(a){
   color: #111;                 /* 主文字色 */
   text-decoration: underline;
   text-decoration-color: #9ca3af; /* 灰色下划线 */
 }
 .markdown-body :deep(a:hover){
   color: #111;
   text-decoration-color: #6b7280; /* 深一点的灰 */
 }
 /* 选中文本高亮：浅灰底 */
 .markdown-body :deep(::selection){
   background: #e5e7eb;
   color: #111;
 }

</style>

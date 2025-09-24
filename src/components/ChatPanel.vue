<script setup>
import { ref } from 'vue'
import ChatDock from './ChatDock.vue'                 // 你的输入组件（含 doSend）
import MarkdownView from './MarkdownView.vue'         // 你新增的渲染组件
import { sendQueryToLLM, interpretLLMResponse } from '@/api' // 你的 api.js

// 会话消息
// role: 'user' | 'assistant'
// type: 'markdown' | 'text' | 'error' | 'system'
const messages = ref([
  { role: 'assistant', type: 'text', text: 'Hi! Ask about case1, e.g. "In case1, summarize contributions of each paper."' }
])

const isLoading = ref(false)

function push(msg){ messages.value.push(msg) }
function showAssistant(text){ push({ role:'assistant', type:'text', text }) }
function showAssistantMD(text){ push({ role:'assistant', type:'markdown', text }) }
function showError(text){ push({ role:'assistant', type:'error', text }) }

// 处理 ChatDock 的 send 事件
async function onSend(userText){
  push({ role:'user', type:'text', text: userText })
  isLoading.value = true
  try {
    // 后端：回答场景返回 text/plain（Markdown）；其它场景可能是 JSON（列项目/建索引）
    const res = await sendQueryToLLM(userText, 'ChatGPT', 'markdown')
    console.log('typeof res =', typeof res, res.slice?.(0, 80));
    if (typeof res === 'string') {
      // ✅ 直接作为 Markdown 消息
      messages.value.push({ role:'assistant', type:'markdown', text: res })
    } else {
      // JSON：可能是 rag/projects 或 rag/index 等
      const view = interpretLLMResponse(res)
      if (view.type === 'rag-projects') {
        showAssistant(`Available projects: ${view.projects.join(', ')}`)
      } else if (view.type === 'rag-index') {
        const reused = view.stats?.reused ? ' (reused)' : ''
        const chunks = view.stats?.total_chunks ?? view.stats?.built ?? '—'
        showAssistant(`Index for ${view.projectId} is ready. Chunks/Built: ${chunks}${reused}`)
      } else if (view.type === 'rag-answer') {
        // 如果你还保留了旧协议（极少情况），也能兜底
        const md = view.text || 'Done.'
        showAssistantMD(md)
      } else if (view.type === 'error') {
        showError(view.text || 'Unknown error')
      } else {
        // 兜底显示
        showAssistant('Done.')
        console.log('RAW JSON:', res)
      }
      
    }
  } catch (e) {
    showError(e.message || String(e))
  } finally {
    isLoading.value = false
  }
}
</script>

<template>
  <div class="chat-panel">
    <div class="msg-list">
      <div v-for="(m,i) in messages" :key="i" class="msg" :class="m.role">
        <!-- 强制所有助手机器人消息用 MarkdownView 渲染 -->
        <template v-if="m.role === 'assistant'">
          <MarkdownView :source="m.text" />
        </template>
        <template v-else-if="m.type === 'error'">
          <div class="bubble error">{{ m.text }}</div>
        </template>
        <template v-else>
          <div class="bubble">{{ m.text }}</div>
        </template>
      </div>


      <div v-if="isLoading" class="msg assistant">
        <div class="bubble typing">Thinking…</div>
      </div>
    </div>

    <ChatDock
      :busy="isLoading"
      placeholder="Ask in English, e.g. “In case1, summarize methods and contributions per paper.”"
      :autofocus="true"
      :maxLength="4000"
      @send="onSend"
    />
  </div>
</template>

<style scoped>
.chat-panel{
  display:flex; flex-direction:column; height:100%;
}
.msg-list{
  flex:1; overflow:auto; padding:12px 12px 4px;
  display:flex; flex-direction:column; gap:10px;
}
.msg{ display:flex; }
.msg.user{ justify-content:flex-end; }
.msg.assistant{ justify-content:flex-start; }

.bubble{
  max-width: 70%;
  padding: 10px 12px;
  border-radius: 10px;
  line-height: 1.5;
  background: #f6f7f9;
  color: #111;
  white-space: pre-wrap;
  word-break: break-word;
}
.msg.user .bubble{ background:#dbeafe; }
.bubble.error{ background:#fee2e2; color:#b91c1c; }
.bubble.typing{ opacity:.7; font-style: italic; }

/* 让 MarkdownView 的内容看起来像泡泡 */
.msg.assistant :deep(.markdown-body){
  max-width: 70%;
  background: #f6f7f9;
  padding: 10px 12px;
  border-radius: 10px;
}
.msg.user :deep(.markdown-body){
  max-width: 70%;
  background:#dbeafe;
  padding: 10px 12px;
  border-radius: 10px;
}
</style>

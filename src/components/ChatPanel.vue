<script setup>
import { ref, inject, onMounted, onBeforeUnmount } from 'vue'
import ChatDock from './ChatDock.vue'
import MarkdownView from './MarkdownView.vue'
import { sendQueryToLLM, interpretLLMResponse } from '@/api'
import { routeCommand } from '../lib/commandRouter'   // ← 注意相对路径：components → lib

// 1) 统一拿 controller（优先 inject，其次 window），并在就绪事件时更新
const ctrlRef = ref(null)
const injectedCtrl = inject('SemanticMapCtrl', null)
let onReadyHandler = null
onMounted(() => {
  ctrlRef.value = injectedCtrl || window.SemanticMapCtrl || null
  onReadyHandler = () => { ctrlRef.value = window.SemanticMapCtrl || ctrlRef.value }
  window.addEventListener('semanticMap:ready', onReadyHandler)
})
onBeforeUnmount(() => {
  if (onReadyHandler) window.removeEventListener('semanticMap:ready', onReadyHandler)
})

// 2) 聊天状态
const messages = ref([{ role:'assistant', type:'markdown', text:'Hi! Ask about **case1**.' }])
const isLoading = ref(false)
function push(m){ messages.value.push(m) }

// 3) 识别“UI 指令”的正则：未就绪时直接提示，不要发给 LLM
const uiCommandRe = /^\s*(show|add|delete|remove|list|how many|显示|新增|删除|列出|有多少)\b/i

async function onSend(userText){
  push({ role:'user', type:'text', text:userText })

  // 先判定是否 UI 指令（解析只读，不执行）
  let parsed = null
  try { parsed = routeCommand.__parseOnly?.(userText) || null } catch {}

  const ctrl = ctrlRef.value || window.SemanticMapCtrl || null
  const isUiIntent = parsed && ['show','show-all','hide-all','add','delete','list','count','unknown'].includes(parsed.intent)
                      && /^\s*(show|add|delete|remove|list|how many|显示|新增|删除|列出|有多少)/i.test(userText)

  // 控制器就绪 → 直接执行命令
  if (ctrl && isUiIntent) {
    try {
      const { handled, message } = routeCommand(ctrl, userText)
      if (handled) { push({ role:'assistant', type:'markdown', text: message || 'Done.' }); return }
    } catch (e) {
      push({ role:'assistant', type:'error', text: `Command error: ${e.message || e}` })
      return
    }
  }

  // 控制器未就绪 且 看起来是 UI 指令 → 不要发给 LLM
  if (!ctrl && isUiIntent) {
    push({ role:'assistant', type:'error', text: 'UI 未就绪：语义地图控制器尚未初始化完成，请稍后再试。' })
    return
  }

  // 走 LLM（非 UI 指令）
  isLoading.value = true
  try {
    const res = await sendQueryToLLM(userText, 'ChatGPT', 'markdown')
    if (typeof res === 'string') {
      push({ role:'assistant', type:'markdown', text: res })
    } else {
      const view = interpretLLMResponse(res)
      if (view.type === 'rag-projects') push({ role:'assistant', type:'markdown', text:`**Available projects:** ${view.projects.join(', ')}` })
      else if (view.type === 'rag-index') push({ role:'assistant', type:'markdown', text:`Index for \`${view.projectId}\` ready.` })
      else if (view.type === 'rag-answer') push({ role:'assistant', type:'markdown', text: view.text || 'Done.' })
      else if (view.type === 'error') push({ role:'assistant', type:'error', text: view.text || 'Unknown error' })
      else push({ role:'assistant', type:'markdown', text: 'Done.' })
    }
  } catch (e) {
    push({ role:'assistant', type:'error', text: e.message || String(e) })
  } finally {
    isLoading.value = false
  }
}


</script>


<template>
  <div class="chat-panel">
    <div class="msg-list">
      <div v-for="(m,i) in messages" :key="i" class="msg" :class="m.role">
        <MarkdownView v-if="m.role==='assistant' && m.type!=='error'" :source="m.text" />
        <div v-else-if="m.type==='error'" class="bubble err">{{ m.text }}</div>
        <div v-else class="bubble">{{ m.text }}</div>
      </div>
      <div v-if="isLoading" class="msg assistant"><div class="bubble typing">Thinking…</div></div>
    </div>
    <ChatDock :busy="isLoading" placeholder="Ask in English…" @send="onSend" />
  </div>
</template>

<style scoped>
.chat-panel{ display:flex; flex-direction:column; height:100%; }
.msg-list{ flex:1; overflow:auto; padding:12px; display:flex; flex-direction:column; gap:10px; }
.msg{ display:flex; }
.msg.user{ justify-content:flex-end; }
.bubble{ max-width:70%; padding:10px 12px; border-radius:10px; background:#f6f7f9; }
.msg.user .bubble{ background:#dbeafe; }
.bubble.err{ background:#fee2e2; color:#b91c1c; }
.msg.assistant :deep(.markdown-body){ max-width:70%; background:#f6f7f9; padding:10px 12px; border-radius:10px; }
</style>

<script setup>
import { ref } from 'vue'
import ChatDock from './ChatDock.vue'
import MarkdownView from './MarkdownView.vue'
import { sendQueryToLLM, interpretLLMResponse } from '@/api'

const messages = ref([{ role:'assistant', type:'markdown', text:'Hi! Ask about **case1**.' }])
const isLoading = ref(false)

function push(m){ messages.value.push(m) }

async function onSend(userText){
  push({ role:'user', type:'text', text:userText })
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

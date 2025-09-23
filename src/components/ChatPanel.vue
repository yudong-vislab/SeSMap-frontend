<script setup>
import { ref } from 'vue'
import ChatDock from './chatdock.vue'
import { chatOnce } from '@/api/chat'

const messages = ref([
  { role: 'system', content: '你是科研助手。' }
])

const loading = ref(false)
const errorMsg = ref('')

async function onSend(userText){
  errorMsg.value = ''
  loading.value = true
  messages.value.push({ role: 'user', content: userText })

  try {
    // 你可以把 full history 传给后端，也可以只传最后几条
    const { answer } = await chatOnce({ messages: messages.value })
    messages.value.push({ role: 'assistant', content: answer })
  } catch (e) {
    errorMsg.value = e.message || '对话失败'
  } finally {
    loading.value = false
  }
}
function hardWrap(str) {
  // 思路：按空白分词；对长度>24的无空格长串，每8字符插入零宽空格\u200b
  //（对URL/连续数字/长英文都有效，视觉无痕）
  return String(str)
    .split(/(\s+)/)
    .map(tok => (tok.length > 24 ? tok.replace(/(.{8})/g, '$1\u200b') : tok))
    .join('');
}
</script>

<template>
  <div class="chat-panel">
    <div class="msg-list">
      <div class="msg-scroll">
        <div class="msgs">
          <div v-for="(m, idx) in messages" :key="idx" class="msg" :class="m.role">
            <div class="bubble">{{ m.content }}</div>
          </div>
          <div v-if="loading" class="msg assistant">
            <div class="bubble">Thinking...</div>
          </div>
          <div v-if="errorMsg" class="error">{{ errorMsg }}</div>
        </div>
        <!-- 右侧“空轨道列”（永远留白给滚动条/安全距离） -->
        <div class="rail" aria-hidden="true"></div>
      </div>
    </div>

    <ChatDock @send="onSend" />
  </div>
</template>

<style scoped>
/* 一处定义“右侧安全边距”变量，统一管控 */
.chat-panel{ 
  --rg: 20px;
  display:flex; flex-direction:column; height:100%;
}


/* 外层容器不滚动，避免滚动条贴边覆盖气泡 */
.msg-list{
  flex:1;
  overflow:hidden;
  background:#fff;
}

/* 里层才滚动，并负责 padding 与滚动条占位 */
.msg-list{ flex:1; overflow:hidden; }
.msg-scroll{
  height:100%;
  overflow:auto;
  box-sizing:border-box;
  padding:12px 20px 12px 12px;  /* 右侧多留点安全边距 */
  scrollbar-gutter: stable both-edges;
  overscroll-behavior: contain;
}

/* 所有气泡（含用户/助手） */
.bubble{
  display:block;                 /* WebKit 上更稳 */
  width:fit-content;
  max-width: min(70%, 720px);    /* 或改成 60ch 也可以 */
  padding:8px 10px;
  border-radius:12px;
  background:#f5f5f5;
  background-clip: padding-box;

  /* ✅ 禁用内部滚动条（即使有人误设了高度也不滚） */
  overflow: visible !important;
  max-height: none !important;
  overscroll-behavior: contain;

  /* ✅ 强制换行（新→旧→兜底） */
  white-space: pre-wrap;         /* 保留 \n */
  overflow-wrap: anywhere;       /* 现代浏览器：无空格也断 */
  line-break: anywhere;          /* WebKit/Safari 补丁 */
  word-break: break-word;        /* 旧版回退 */
  word-break: break-all;         /* 兜底：纯数字/URL 必断 */

  line-height:1.5;
  min-width:0;
  contain: paint;
}

/* 用户/助手配色及右侧安全距（防止圆角被滚动条“擦掉”） */
.msg.user .bubble{ background:#111; color:#fff; margin-right:20px; }
.msg.assistant .bubble{ background:#f5f5f5; }

/* 用户/助手气泡配色 */
.msg{
  display:flex;
  margin-bottom:8px;
  min-width:0;              
}
.msg.user{ justify-content:flex-end; }
.msg.assistant{ justify-content:flex-start; }


.error{ color:#c00; padding:8px; }
</style>

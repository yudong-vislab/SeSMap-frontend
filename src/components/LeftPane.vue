<!-- src/components/LeftPane.vue -->
<script setup>
import { ref, watch, nextTick, onMounted } from 'vue'
import ChatDock from './ChatDock.vue'
import PaperList from './PaperList.vue'
import MarkdownView from './MarkdownView.vue'
import { sendQueryToLLM, interpretLLMResponse } from '../lib/api'

// ====== Emits ==========================================================
const emit = defineEmits(['updateHexRadius','updateSystemPrompt','uploadPdfs','updateMarkdownModel'])

// ====== LLM 选择（保留） ==============================================
const selectedLLM = ref('ChatGPT')

// ====== Global System Prompt ==========================================
const systemPrompt = ref(`You are a semantic copilot inside a subspace-driven visual analytics framework.
Your responsibilities:
1) Assist experts in retrieving, comparing, and analyzing multi-domain documents through fine-grained semantic units (MSUs).
2) Operate within and across semantic subspaces (Background, Method, Experiment, Result, Conclusion) while preserving semantic fidelity.
3) Summarize, align, and contrast semantics across documents, identifying consistencies, differences, or conflicts without inventing facts.
4) Support retrieval and inspection of sentence-level semantics, citing MSU details for traceability.
5) When creating or validating semantic relations between subspaces, ensure logical consistency and request missing context when necessary.
6) Provide concise, structured outputs suitable for visualization (bullets, steps, or tables), and remain transparent about limitations.`)

// ====== Markdown Parser 选择（保留字段） ==============================
const markdownModel = ref('PyMuPDF+LLM')

// ====== Hex Radius =====================================================
const hexRadius = ref(12)
const hexMin = 6, hexMax = 28, hexStep = 1

// ====== PDF 上传 =======================================================
const uploadedFiles = ref([])
function handlePdfUpload(e) {
  const files = Array.from(e.target.files || [])
  uploadedFiles.value = files.map(f => ({ name: f.name, size: f.size }))
  emit('uploadPdfs', files)
}

// ====== Paper List（修复模板依赖的响应式） ============================
const paperListRef = ref(null)
const selectedPaperIds = ref([])
const paperQuery = ref('')     // ✅ 修复控制台 warn
const papers = ref([])         // ✅ 修复控制台 warn
function openPdfModal(pdfUrl, name){ console.log('[openPdfModal]', pdfUrl, name) }
function onSelectPaper(){ console.log('Selected Paper Indexs:', selectedPaperIds.value) }
function onClearPaper(){ paperListRef.value?.clearSelection?.() }

// ====== Chat（这里是你实际页面的聊天区） ==============================
const messages = ref([{ role: 'system', type:'text', text: 'You are chatting with an academic assistant.' }])
const msgBoxRef = ref(null)
const atBottom = ref(true)

function isNearBottom(el, threshold = 80) {
  return el.scrollHeight - el.scrollTop - el.clientHeight <= threshold
}
function scrollToBottom(behavior = 'smooth') {
  const el = msgBoxRef.value; if (!el) return
  el.scrollTo({ top: el.scrollHeight, behavior })
}
function onMsgsScroll(e){ atBottom.value = isNearBottom(e.target) }
onMounted(() => nextTick(() => scrollToBottom('instant')))
watch(() => messages.value.length, async () => {
  await nextTick(); if (atBottom.value) scrollToBottom('smooth')
})

async function handleSend(msg) {
  messages.value.push({ role: 'user', type:'text', text: msg })
  try {
    // ✅ 强制要求后端返回 markdown（text/plain）
    const res = await sendQueryToLLM(msg, selectedLLM.value, 'markdown')
    if (typeof res === 'string') {
      messages.value.push({ role: 'assistant', type:'markdown', text: res })
    } else {
      // 兼容：当返回 JSON（列项目/建索引）
      const view = interpretLLMResponse(res)
      if (view.type === 'rag-projects') {
        messages.value.push({ role:'assistant', type:'markdown', text: `**Available projects:** ${view.projects.join(', ')}` })
      } else if (view.type === 'rag-index') {
        const reused = view.stats?.reused ? ' (reused)' : ''
        const chunks = view.stats?.total_chunks ?? view.stats?.built ?? '—'
        messages.value.push({ role:'assistant', type:'markdown', text: `**Index for \`${view.projectId}\` ready.** Chunks/Built: ${chunks}${reused}` })
      } else if (view.type === 'rag-answer') {
        messages.value.push({ role:'assistant', type:'markdown', text: view.text || 'Done.' })
      } else if (view.type === 'error') {
        messages.value.push({ role:'assistant', type:'error', text: view.text || 'Unknown error' })
      } else {
        messages.value.push({ role:'assistant', type:'markdown', text: 'Done.' })
        console.log('RAW JSON:', res)
      }
    }
  } catch (err) {
    messages.value.push({ role: 'assistant', type:'error', text: `调用失败：${err.message}` })
  }
}

function handleUploadFiles(files){ /* 占位 */ }

// ====== Watchers（向父抛出） ==========================================
watch(hexRadius, v => emit('updateHexRadius', v))
watch(systemPrompt, v => emit('updateSystemPrompt', v))
watch(markdownModel, v => emit('updateMarkdownModel', v))
</script>

<template>
  <div class="lp-shell">
    <!-- 1) Control Panel -->
    <section class="lp-card">
      <header class="card__title">Control Panel</header>
      <div class="lp-card__body cp-stack">
        <div class="cp-block">
          <div class="cp-label-top">System Prompt</div>
          <textarea class="cp-input cp-textarea" v-model="systemPrompt" />
          <div class="cp-hint">Keep concise.</div>
        </div>

        <div class="cp-divider"></div>

        <div class="cp-block">
          <div class="cp-label-top">Upload PDFs to Markdown</div>
          <input type="file" accept=".pdf" multiple class="cp-input cp-file-input" @change="handlePdfUpload" />
          <div v-if="uploadedFiles.length" class="cp-files">
            <span class="cp-file" v-for="(f, i) in uploadedFiles" :key="i">{{ f.name }}</span>
          </div>
        </div>

        <div class="cp-divider"></div>

        <div class="cp-block">
          <div class="cp-label-top">Hex Radius</div>
          <div class="cp-slider">
            <input type="range" :min="hexMin" :max="hexMax" :step="hexStep" v-model="hexRadius" />
            <input class="cp-number" type="number" :min="hexMin" :max="hexMax" :step="hexStep" v-model.number="hexRadius" />
            <span class="cp-unit">px</span>
          </div>
          <div class="cp-hint">Controls HSU aggregation radius.</div>
        </div>
      </div>
    </section>

    <!-- 2) Paper Gallery -->
    <section class="lp-card">
      <header class="card__title">
        Paper Gallery
        <div class="mv-actions">
          <button class="select-btn" id="SelectBtn" @click="onSelectPaper">Select</button>
          <button class="clear-btn" id="ClearBtn" @click="onClearPaper">Clear</button>
        </div>
      </header>
      <div class="lp-card__body scroll-auto-hide">
        <PaperList
          ref="paperListRef"
          v-model:selected-ids="selectedPaperIds"
          :title="paperQuery"
          @update:title="val => (paperQuery = val)"
          :items="papers"
          :dim-opacity="0.15"
          :tileMin="80"
          :thumbRatio="0.55"
          @open-pdf="({pdfUrl, name}) => openPdfModal(pdfUrl, name)"
        />
      </div>
    </section>

    <!-- 3) Chat -->
    <section class="lp-card lp-chat">
      <header class="card__title">Chat with LLM</header>
      <div ref="msgBoxRef" class="lp-msgs" @scroll="onMsgsScroll">
        <div v-for="(m, i) in messages" :key="i" class="msg" :class="m.role">
          <!-- ✅ assistant 消息统一 Markdown 渲染 -->
          <MarkdownView v-if="m.role==='assistant' && m.type!=='error'" :source="m.text" />
          <div v-else-if="m.type==='error'" class="msg-bubble err">{{ m.text }}</div>
          <div v-else class="msg-bubble">{{ m.text }}</div>
        </div>
      </div>
      <ChatDock @send="handleSend" @upload-files="handleUploadFiles" />
    </section>
  </div>
</template>

<style scoped>
/* 布局 */
.lp-shell{ height:100%; display:grid; grid-template-rows:1.55fr 1.3fr 1.5fr; gap:6px; background:#f3f4f6; overflow:hidden; }
.lp-card{ --r:12px; background:#fff; border-radius:var(--r); display:flex; flex-direction:column; min-height:0; overflow:hidden; }
.card__title{ font-size:13px; font-weight:600; color:#333; border-bottom:1px solid #eee; padding:8px 10px; }
.lp-card__body{ padding:4px 6px; overflow:auto; min-height:0; border-bottom-left-radius:var(--r); border-bottom-right-radius:var(--r); background-clip:padding-box; scrollbar-width:none; }
.lp-card__body::-webkit-scrollbar{ width:0; height:0; }

/* Chat */
.lp-chat{ display:grid; grid-template-rows:auto 1fr auto; overflow:hidden; }
.lp-msgs{ gap:8px; padding:12px 0; overflow:auto; min-height:0; display:flex; flex-direction:column; scrollbar-gutter:stable both-edges; scrollbar-width:thin; scrollbar-color:transparent transparent; }
.lp-msgs::-webkit-scrollbar{ width:8px; height:8px; }
.lp-msgs::-webkit-scrollbar-thumb{ background:transparent; border-radius:4px; }
.lp-msgs::-webkit-scrollbar-track{ background:transparent; }
.lp-msgs:hover{ scrollbar-color:rgba(0,0,0,.25) transparent; }
.lp-msgs:hover::-webkit-scrollbar-thumb{ background:rgba(0,0,0,.25); }

.msg{ display:flex; min-width:0; }
.msg.user{ justify-content:flex-end; }
.msg .msg-bubble{ max-width:90%; padding:8px 10px; border-radius:10px; font-size:11px; background:#f3f4f6; }
.msg.user .msg-bubble{ background:#111; color:#fff; margin-right:11px; }
.msg .err{ background:#fee2e2; color:#b91c1c; }

/* 让 Markdown 泡泡与纯文本泡泡风格一致 */
.msg.assistant :deep(.markdown-body){
  max-width:90%; background:#f3f4f6; padding:8px 10px; border-radius:10px; font-size:11px;
}

/* Control Panel — Gray Theme (colors only) */
.cp-stack{ display:flex; flex-direction:column; gap:6px; }
.cp-block{ display:flex; flex-direction:column; gap:4px; }

.cp-label-top{ font-size:11px; color:#333; font-weight:600; }

.cp-input{
  width:100%; box-sizing:border-box; font-size:11px;
  color:#111; background:#fff; border:1px solid #d1d5db; border-radius:6px;
}
.cp-input::placeholder{ color:#9ca3af; }
.cp-input:focus{ outline:none; border-color:#cbd5e1; box-shadow:0 0 0 3px #e5e7eb; }

.cp-select{
  padding:6px 8px; font-size:11px; background:#fff; color:#111;
  border:1px solid #d1d5db; border-radius:6px;
}
.cp-select:focus{ outline:none; border-color:#cbd5e1; box-shadow:0 0 0 3px #e5e7eb; }

.cp-textarea{
  min-height:90px; font-size:9px; line-height:1.4; padding:6px 8px; resize:vertical;
  color:#111; background:#fff; border:1px solid #d1d5db; border-radius:6px;
}
.cp-textarea::placeholder{ color:#9ca3af; }
.cp-textarea:focus{ outline:none; border-color:#cbd5e1; box-shadow:0 0 0 3px #e5e7eb; }

.cp-file-input{
  font-size:11px; padding:6px 8px; color:#111;
  border:1px dashed #d1d5db; border-radius:6px; background:#f7f7f7;
}
.cp-file-input:hover{ background:#f3f4f6; }

.cp-file{
  font-size:10px; padding:2px 6px; color:#111;
  background:#f3f4f6; border:1px solid #e5e7eb; border-radius:5px;
}

.cp-slider{ display:inline-flex; align-items:center; gap:6px; width:100%; }
.cp-slider input[type="range"]{
  flex:1 1 auto; accent-color:#111;   /* 深灰主题色 */
}

.cp-number{
  width:60px; font-size:11px; padding:4px 6px; text-align:right; color:#111;
  background:#fff; border:1px solid #d1d5db; border-radius:6px;
}
.cp-number:focus{ outline:none; border-color:#cbd5e1; box-shadow:0 0 0 3px #e5e7eb; }

.cp-unit{ font-size:11px; color:#666; min-width:16px; }
.cp-hint{ font-size:10px; color:#777; margin-top:2px; }
.cp-divider{ width:100%; border-bottom:1px dashed #ddd; margin:4px 0; }

/* 操作区按钮容器（保持灰系即可） */
.mv-actions{ display:flex; align-items:center; gap:8px; float:right; }

/* 可选：原生控件统一灰主题，避免系统蓝 */
input[type="checkbox"], input[type="radio"], progress, meter { accent-color:#111; }


</style>

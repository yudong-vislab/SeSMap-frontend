<!-- src/components/LeftPane.vue -->
<script setup>
import { ref, watch, nextTick, onMounted } from 'vue'
import ChatDock from './ChatDock.vue'
import PaperList from './PaperList.vue'
import { sendQueryToLLM } from '../lib/api'

// ====== Emits ==========================================================
const emit = defineEmits(['updateHexRadius','updateSystemPrompt','uploadPdfs','updateMarkdownModel'])

// ====== LLM 选择（保留字段，UI 你当前隐藏了即可） ====================
const selectedLLM = ref('ChatGPT')
const llmOptions = ['ChatGPT', 'QWen']

// ====== Global System Prompt ==========================================
const systemPrompt = ref(`You are an academic copilot inside a semantic visual analytics system.
Your responsibilities:
1) Help experts explore cross-domain scientific papers using MSUs (Minimum Semantic Units).
2) Respect role-oriented subspaces (Background, Method, Experiment, Result, Conclusion).
3) Summarize, compare, and align semantics across papers without inventing facts.
4) Prefer concise, structured answers (bullets, steps), and cite paper IDs or HSU locations when available.
5) When asked to create or edit relations, propose clear steps and validation checks.
Be transparent about limitations, and ask for missing context only when necessary.`)

// ====== Markdown Parser ===============================================
const markdownModel = ref('PyMuPDF+LLM')
const markdownModelOptions = ['PyMuPDF+LLM','GROBID+Heuristics','ScienceParse']

// ====== Hex Radius =====================================================
const hexRadius = ref(12)
const hexMin = 6
const hexMax = 28
const hexStep = 1

// ====== PDF 上传 =======================================================
const uploadedFiles = ref([])
function handlePdfUpload(e) {
  const files = Array.from(e.target.files || [])
  uploadedFiles.value = files.map(f => ({ name: f.name, size: f.size }))
  emit('uploadPdfs', files)
}

// ====== Chat（保留） ===================================================
const messages = ref([{ role: 'system', text: 'You are chatting with an academic assistant.' }])
const msgBoxRef = ref(null)
const atBottom = ref(true)

function isNearBottom(el, threshold = 80) {
  return el.scrollHeight - el.scrollTop - el.clientHeight <= threshold
}
function scrollToBottom(behavior = 'smooth') {
  const el = msgBoxRef.value
  if (!el) return
  el.scrollTo({ top: el.scrollHeight, behavior })
}
function onMsgsScroll(e) { atBottom.value = isNearBottom(e.target) }
onMounted(() => nextTick(() => scrollToBottom('instant')))
watch(() => messages.value.length, async () => {
  await nextTick()
  if (atBottom.value) scrollToBottom('smooth')
})
async function handleSend(msg) {
  messages.value.push({ role: 'user', text: msg })
  try {
    const answer = await sendQueryToLLM(msg, selectedLLM.value)
    messages.value.push({ role: 'assistant', text: answer })
  } catch (err) {
    messages.value.push({ role: 'assistant', text: `调用失败：${err.message}` })
  }
}
function handleUploadFiles(files) { /* …占位… */ }

// ====== Paper List（改为子组件管理） ==================================
const paperListRef = ref(null)
const selectedPaperIds = ref([]) // 双向绑定子组件的选择（globalIndex 列表）

function onSelectPaper() {
  // 这里保持你原来行为：打印/alert；也可以 emit 给父层联动右侧
  console.log('Selected Paper Indexs:', selectedPaperIds.value)
  alert('Selected Paper Indexs: ' + selectedPaperIds.value.join(', '))
}
function onClearPaper() {
  paperListRef.value?.clearSelection?.()
}

// ====== Watchers（向父抛出） ===========================================
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
        <!-- Global System Prompt -->
        <div class="cp-block">
          <div class="cp-label-top">System Prompt</div>
          <textarea
            class="cp-input cp-textarea"
            v-model="systemPrompt"
            placeholder="Briefly describe the assistant’s role in this system…"
            @blur="$emit('updateSystemPrompt', systemPrompt)"
          ></textarea>
          <div class="cp-hint">State scope, style, and constraints; keep concise.</div>
        </div>

        <div class="cp-divider"></div>

        <!-- Upload PDFs -->
        <div class="cp-block">
          <div class="cp-label-top">Upload PDFs to Markdown</div>
          <input type="file" accept=".pdf" multiple class="cp-input cp-file-input" @change="handlePdfUpload" />
          <div v-if="uploadedFiles.length" class="cp-files">
            <span class="cp-file" v-for="(f, i) in uploadedFiles" :key="i">{{ f.name }}</span>
          </div>
        </div>

        <div class="cp-divider"></div>

        <!-- Hex Radius Threshold -->
        <div class="cp-block">
          <div class="cp-label-top">Hex Radius</div>
          <div class="cp-slider">
            <input type="range" :min="hexMin" :max="hexMax" :step="hexStep" v-model="hexRadius" />
            <input class="cp-number" type="number" :min="hexMin" :max="hexMax" :step="hexStep" v-model.number="hexRadius" />
            <span class="cp-unit">px</span>
          </div>
          <div class="cp-hint">Controls HSU aggregation radius; larger = coarser.</div>
        </div>
      </div>
    </section>

    <!-- 2) Paper List（改为新组件） -->
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
          <div class="msg-bubble">{{ m.text }}</div>
        </div>
      </div>
      <ChatDock @send="handleSend" @upload-files="handleUploadFiles" />
    </section>
  </div>
</template>

<style scoped>
/* —— 布局 —— */
.lp-shell {
  height: 100%;
  display: grid;
  grid-template-rows: 1.55fr 1.3fr 1.5fr; /* Parameters / Paper / Chat */
  gap: 6px;
  background: #f3f4f6;
  box-sizing: border-box;
  overflow: hidden;
}

/* —— 通用卡片 —— */
.lp-card {
  --r: 12px;
  background: #fff;
  border-radius: var(--r);
  display: flex;
  flex-direction: column;
  min-height: 0;
  overflow: hidden;
}
.card__title{
  font-size:13px;
  font-weight:600;
  color:#333;
  border-bottom:1px solid #eee;
  padding:8px 10px;
}
.lp-card__body {
  padding: 4px 6px;
  overflow: auto;
  min-height: 0;
  border-bottom-left-radius: var(--r);
  border-bottom-right-radius: var(--r);
  background-clip: padding-box;
  scrollbar-width: none;        /* Firefox 隐藏 */
}
.lp-card__body::-webkit-scrollbar { width:0; height:0; }

/* —— Chat —— */
.lp-chat { display: grid; grid-template-rows: auto 1fr auto; overflow: hidden; }
.lp-msgs {
  gap: 8px;  
  padding: 12px 0px;
  overflow: auto; min-height: 0;
  display: flex; flex-direction: column; 
  scrollbar-gutter: stable both-edges; scrollbar-width: thin; scrollbar-color: transparent transparent;

}
.lp-msgs::-webkit-scrollbar { width: 8px; height: 8px; }
.lp-msgs::-webkit-scrollbar-thumb { background: transparent; border-radius: 4px; }
.lp-msgs::-webkit-scrollbar-track { background: transparent; }
.lp-msgs:hover { scrollbar-color: rgba(0, 0, 0, .25) transparent; }
.lp-msgs:hover::-webkit-scrollbar-thumb { background: rgba(0, 0, 0, .25); }

/* 气泡 */
.msg { display: flex; min-width: 0; }
.msg.user { justify-content: flex-end; }
.msg .msg-bubble {
  max-width: 90%; padding: 8px 10px; border-radius: 10px; font-size: 11px; background: #f3f4f6;
}

 .msg.user .msg-bubble {
   background: #111; color: #fff;
   margin-right: 11px;             /* ✅ 再和右边拉开一点，圆角稳定 */
 }


/* Paper List 右上操作按钮 */
.mv-actions { display: flex; align-items: center; gap: 8px; float: right; }

/* ===== Control Panel 紧凑版样式（原样保留） ===== */
.cp-stack{ display: flex; flex-direction: column; gap: 6px; }
.cp-block{ display: flex; flex-direction: column; gap: 4px; }
.cp-label-top{ font-size: 11px; color: #444; font-weight: 500; }
.cp-input{ width: 100%; box-sizing: border-box; font-size: 11px; }
.cp-select{ padding: 6px 8px; border: 1px solid #e5e7eb; border-radius: 6px; background: #fff; font-size: 11px; }
.cp-textarea{ min-height: 90px; font-size: 9px; line-height: 1.4; padding: 6px 8px; border: 1px solid #e5e7eb; border-radius: 6px; resize: vertical; }
.cp-file-input{ font-size: 11px; padding: 6px 8px; border: 1px dashed #e5e7eb; border-radius: 6px; background: #fafafa; }
.cp-file{ font-size: 10px; padding: 2px 6px; background: #f3f4f6; border: 1px solid #e5e7eb; border-radius: 5px; }
.cp-slider{ display: inline-flex; align-items: center; gap: 6px; width: 100%; }
.cp-slider input[type="range"]{ flex: 1 1 auto; }
.cp-number{ width: 60px; font-size: 11px; padding: 4px 6px; border: 1px solid #e5e7eb; border-radius: 6px; text-align: right; }
.cp-unit{ font-size: 11px; color: #666; min-width: 16px; }
.cp-hint{ font-size: 10px; color: #777; margin-top: 2px; }
.cp-divider{ width: 100%; border-bottom: 1px dashed #ddd; margin: 4px 0; }

/* 分组关闭按钮（延用原样式） */
.subspace-close{ width: 20px; height: 20px; line-height: 18px; text-align: center; border: 1px solid #ddd; border-radius: 50%; background: #fff; cursor: pointer; font-size: 14px; padding: 0; box-shadow: 0 1px 2px rgba(0,0,0,.08); }
.subspace-close:hover{ background:#f5f5f5; }
</style>

<style>
:root{
  --brand: #111;
  --track: #B0B0B0;
}
.cp-slider input[type="range"]{ accent-color: var(--brand); }
</style>

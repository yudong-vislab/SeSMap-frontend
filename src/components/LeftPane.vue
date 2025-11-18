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

// ====== Paper Gallery（改为“多分组”渲染） ============================
const paperListRef = ref(null)
// 旧的 v-model:selected-ids 仅适用于单列表，分组模式下先移除使用
// const selectedPaperIds = ref([])
const paperQuery = ref('')      // 仍保留为外层标题（可和最新一次的分组合并）
// const papers = ref([])       // 单列表已废弃
const paperGroups = ref([])     // [{ key, title, items }]

function openPdfModal(pdfUrl, name){ console.log('[openPdfModal]', pdfUrl, name) }
function onSelectPaper(){ console.log('Select clicked (group-mode).') }
function onClearPaper(){
  paperGroups.value = [] // 分组模式
  paperQuery.value = ''  // ★ 清掉标题
}

// ====== Chat（这里是你实际页面的聊天区） ==============================
const messages = ref([{ role: 'system', type:'text', text: 'You are chatting with an academic assistant.' }])
const msgBoxRef = ref(null)
const atBottom = ref(true)
function isNearBottom(el, threshold = 80) { return el.scrollHeight - el.scrollTop - el.clientHeight <= threshold }
function scrollToBottom(behavior = 'smooth') {
  const el = msgBoxRef.value; if (!el) return
  el.scrollTo({ top: el.scrollHeight, behavior })
}
function onMsgsScroll(e){ atBottom.value = isNearBottom(e.target) }
onMounted(() => nextTick(() => scrollToBottom('instant')))
watch(() => messages.value.length, async () => { await nextTick(); if (atBottom.value) scrollToBottom('smooth') })

function handleUploadFiles(files){ /* 占位 */ }

// ====== Watchers（向父抛出） ==========================================
watch(hexRadius, v => emit('updateHexRadius', v))
watch(systemPrompt, v => emit('updateSystemPrompt', v))
watch(markdownModel, v => emit('updateMarkdownModel', v))

// ======================================================================
// ========== Pictures ➜ 注入到 Paper Gallery 的 items ==================
// ======================================================================

/**
 * 目录约定：
 *   src/assets/pictures/<folder>/<anything>.(png|jpg|jpeg|gif|webp|svg)
 * <folder> 即“主题/项目 id”，如 air / case1 / case2 / combust 等。
 * 初始为空；聊天文本命中主题 -> 显示该 folder 下所有图片，按自然序。
 */
const rawPicModules = import.meta.glob(
  '../assets/pictures/**/*.{png,jpg,jpeg,gif,webp,svg}',
  { eager: true, import: 'default' }
)

// 建索引：{ folderId: Array<{ name, url, path }> }，并按自然序排序
const galleryByFolder = ref({})
function naturalCompare(a, b) {
  const ax = a.match(/\d+|\D+/g) || [a]
  const bx = b.match(/\d+|\D+/g) || [b]
  const len = Math.max(ax.length, bx.length)
  for (let i = 0; i < len; i++) {
    const as = ax[i] || ''
    const bs = bx[i] || ''
    const an = Number(as), bn = Number(bs)
    const aNum = !Number.isNaN(an), bNum = !Number.isNaN(bn)
    if (aNum && bNum && an !== bn) return an - bn
    if (as !== bs) return as.localeCompare(bs)
  }
  return 0
}
function buildGalleryIndex() {
  const g = {}
  const seen = new Set() // 去重用
  for (const abs in rawPicModules) {
    const url = rawPicModules[abs]
    // abs 类似 "../assets/pictures/<folder>/.../xx.png"
    const rel = abs.replace('../assets/pictures/', '')
    const [folder, ...rest] = rel.split('/')
    if (!folder) continue
    const name = rest.join('/') // 相对 folder 的路径（用于展示/排序）
    // ★ 依据 URL 去重（同一资源不重复加入）
    if (seen.has(url)) continue
    seen.add(url)
    ;(g[folder] ||= []).push({ name, url, path: rel })
  }
  for (const k of Object.keys(g)) {
    g[k].sort((x, y) => naturalCompare(x.name, y.name))
  }
  galleryByFolder.value = g
  console.log('[Gallery] folders → counts:', Object.fromEntries(Object.entries(g).map(([k,v]) => [k, v.length])))
 
}
onMounted(buildGalleryIndex)

// 别名映射：按你的需求补/改
const FOLDER_ALIASES = {
  air: [
    'air', 'air pollution', 'pm2.5', 'pm25', 'particulate', 'aerosol',
    '空气', '空气污染', '雾霾', '颗粒物', '细颗粒物'
  ],
  combust: [
    // 英文
    'combust', 'combustion', 'engine combustion', 'combustor',
    'reacting flow', 'reactive flow', 'turbulent combustion',
    'premixed', 'non-premixed', 'diffusion flame', 'flamelet', 'fpv',
    'mixture fraction', 'progress variable', 'g-equation',
    'ignition', 'autoignition', 'detonation', 'deflagration',
    'les', 'dns', 'rans', 'cfd', 'navier-stokes',
    'shock', 'shock-induced', 'supersonic', 'hypersonic',
    'ramjet', 'scramjet', 'nozzle', 'inlet isolator',
    'combustion instability', 'thermoacoustic',
    'emissions', 'nox', 'soot', 'swirl',
    'spray', 'atomization', 'evaporation',
    'chemkin', 'cantera',
    // 中文
    '发动机燃烧', '湍流燃烧', '反应流', '反应性流动',
    '预混', '非预混', '扩散火焰', '火焰片', '火焰面',
    '混合分数', '进度变量', '点火', '自燃',
    '爆轰', '爆燃', '超声速', '高超声速',
    '冲压发动机', '超燃冲压', '燃烧不稳定', '热声不稳定',
    '排放', '氮氧化物', '烟炱', '旋流',
    '喷雾', '雾化', '蒸发', '等当量比', '化学计量比'
  ],
  case1: ['case1', 'project one', 'set1', '背景', 'background'],
  case2: ['case2', 'project two', 'set2', '方法', 'methods', 'method']
}
const FOLDER_TITLES = {
  air: 'Air',
  combust: 'Combust',
  case1: 'Case 1',
  case2: 'Case 2'
}
function folderTitle(folder) {
  // 优先用映射；没有映射就把下划线转空格并首字母大写
  if (FOLDER_TITLES[folder]) return FOLDER_TITLES[folder]
  return folder
    .split('/')
    .pop()
    .replace(/_/g, ' ')
    .replace(/^\w/, s => s.toUpperCase())
}

// 解析聊天文本 -> 目标 folder
function resolveFolderFromText(text) {
  const t = (text || '').toLowerCase()
  if (!t.trim()) return null

  // 先看是否直接包含现有文件夹名
  for (const folder of Object.keys(galleryByFolder.value || {})) {
    if (t.includes(folder.toLowerCase())) return folder
  }
  // 再走别名
  for (const [folder, aliases] of Object.entries(FOLDER_ALIASES)) {
    for (const a of aliases) {
      if (t.includes(a.toLowerCase())) return folder
    }
  }
  // “show <folder>” / “显示 <folder>”
  const m1 = t.match(/\bshow\s+([a-z0-9_\-]+)/)
  if (m1 && galleryByFolder.value[m1[1]]) return m1[1]
  const m2 = text.match(/显示\s*([a-zA-Z0-9_\-]+)/)
  if (m2 && galleryByFolder.value[m2[1]]) return m2[1]

  return null
}

// 清空命令
function isClearCommand(text) {
  const t = (text || '').toLowerCase()
  return (
    t.includes('hide all') ||
    t.includes('clear') ||
    t.includes('clear all') ||
    t.includes('empty') ||
    /清空|隐藏全部|全部隐藏|清除/.test(text || '')
  )
}

 // 仅当明确出现“gallery / paper gallery / 图片库 / 图集 / collect”时，才走图片展示通道
function isGalleryCommand(text){
  const t = (text || '').toLowerCase()
  return (
    /\b(paper\s*gallery|gallery)\b/.test(t) ||   // gallery / paper gallery
    /图片库|图集/.test(text || '') ||            // 中文触发词
    /^\s*collect\b/i.test(text || '')            // 你之前用的“collectxxxx”
  )
}


// 将图片集合映射为 PaperList 的 items
function toPaperItems(folder, items) {
  // PaperList 未提供具体类型；给出常用字段：id/title/thumbUrl/meta
     return items.map((img, i) => {
     const base = img.name.split('/').pop() || img.name
     const pretty = base.replace(/\.(png|jpe?g|gif|webp|svg)$/i, '')
     return {
       id: `${folder}::${img.path}`,
       globalIndex: i,
       // 提醒：PaperList 分组模式内部已按组维护选择，不强制全局唯一
       name: pretty,           // PaperList 优先显示 name
       title: pretty,          // 兜底
       content: img.url,       // ★ PaperList 用它当缩略图
       thumbUrl: img.url,      // 兼容
       pdfUrl: img.url,        // 让“眼睛”也能点开预览
       meta: { folder }
     }
   })

}

// 展示某个 folder：把图片灌进 Paper Gallery
function showFolder(folder) {
  const imgs = (galleryByFolder.value[folder] || []).slice()
  // 外层标题也更新为最近一次加载的分组名（可选）
  paperQuery.value = folderTitle(folder)
   // 改为“追加一个分组”，而不是覆盖
  paperGroups.value.push({
     key: `${folder}-${Date.now()}-${Math.random().toString(36).slice(2,7)}`,
     title: folderTitle(folder),
     items: toPaperItems(folder, imgs)
  })
  messages.value.push({
    role:'assistant',
    type:'markdown',
    text:`Showing \`${folder}\` — ${imgs.length} paper(s) in Paper Gallery.`
  })
}

// ====== 发送消息：本地解析优先（命中 -> 更新 Paper Gallery），否则后端 ======
async function handleSend(msg) {
  messages.value.push({ role: 'user', type:'text', text: msg })

  // A) 清空命令
  if (isClearCommand(msg)) {
    onClearPaper()
    messages.value.push({ role:'assistant', type:'markdown', text:'Cleared Paper Gallery.' })
    return
  }

  // B) Gallery 命令（必须带有 'gallery' / 'paper gallery' / '图集' / 'collect' 等关键词）
   if (isGalleryCommand(msg)) {
     const folder = resolveFolderFromText(msg)
     if (folder) { showFolder(folder); return }
     messages.value.push({
       role:'assistant', type:'error',
       text:'No matching gallery folder. Try: “gallery air” or “paper gallery combust”.'
     })
     return
   }
 
  // C) 子空间 UI 指令（优先前端直达，不经 LLM）
  //  try {
  //    if (window.CommandRouter && window.SemanticMapCtrl){
  //      const parsed = window.CommandRouter.__parse?.(msg) || null
  //      const isUi =
  //        parsed && ['show','show-all','hide-all','add','delete','list','count','unknown'].includes(parsed.intent) &&
  //        /^\s*(show|add|delete|remove|list|how many|显示|新增|删除|列出|有多少)/i.test(msg)
  //      if (isUi) {
  //        const ret = window.CommandRouter.routeCommand(window.SemanticMapCtrl, msg)
  //        messages.value.push({ role:'assistant', type:'markdown', text: ret?.message || 'Done.' })
  //        return
  //      }
  //    }
  //  } catch(e){
  //    console.warn('[LeftPane] UI route error:', e)
  //  }
 
  // D) 走后端 LLM（保留你的原逻辑）
  try {
    const res = await sendQueryToLLM(msg, selectedLLM.value, {
      messages: messages.value
      // 如果你将来想显式标记子空间命令，也可以在这里按需加上：
      // task: /subspace/i.test(msg) ? 'subspace' : undefined
    })
    if (typeof res === 'string') {
      messages.value.push({ role: 'assistant', type:'markdown', text: res })
    } else {
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

    <!-- 2) Paper Gallery（用图片列表直接填充） -->
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
           v-if="paperGroups.length"
           :key="paperQuery  + '::' +  paperGroups.length"
           ref="paperListRef"
           :title="paperQuery || 'Paper Query'"
           @update:title="val => (paperQuery = val)"
           :groups="paperGroups"
           :use-demo="false"
           :dim-opacity="0.15"
           :tileMin="80"
           :thumbRatio="0.55"
           @open-pdf="({pdfUrl, name}) => openPdfModal(pdfUrl, name)"
         />

        <!-- <div v-if="!papers.length" class="empty-hint" style="margin-top:8px;">
          <em>Empty.</em> Try:
          <div class="hint-code">show air</div>
          <div class="hint-code">show combust</div>
          <div class="hint-code">帮我看看发动机燃烧数值模拟的资料</div>
          <div class="hint-code">清空图片 / hide all</div>
        </div> -->
      </div>
    </section>

    <!-- 3) Chat -->
    <section class="lp-card lp-chat">
      <header class="card__title">Chat with LLM</header>
      <div ref="msgBoxRef" class="lp-msgs" @scroll="onMsgsScroll">
        <div v-for="(m, i) in messages" :key="i" class="msg" :class="m.role">
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
.cp-slider input[type="range"]{ flex:1 1 auto; accent-color:#111; }
.cp-number{ width:60px; font-size:11px; padding:4px 6px; text-align:right; color:#111;
  background:#fff; border:1px solid #d1d5db; border-radius:6px; }
.cp-unit{ font-size:11px; color:#666; min-width:16px; }
.cp-hint{ font-size:10px; color:#777; margin-top:2px; }
.cp-divider{ width:100%; border-bottom:1px dashed #ddd; margin:4px 0; }

/* 操作区按钮容器（保持灰系即可） */
.mv-actions{ display:flex; align-items:center; gap:8px; float:right; }

/* 为空提示的样式复用 */
.empty-hint{ font-size:11px; color:#666; line-height:1.5; }
.empty-hint .hint-code{
  font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace;
  background:#f3f4f6; border:1px solid #e5e7eb; border-radius:6px; padding:4px 6px; display:inline-block; margin:3px 0;
}

/* 可选：原生控件统一灰主题，避免系统蓝 */
input[type="checkbox"], input[type="radio"], progress, meter { accent-color:#111; }
</style>

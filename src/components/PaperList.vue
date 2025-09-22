<script setup>
import { ref, watch, nextTick, computed, defineExpose } from 'vue'

/* ---------- Props ---------- */
const props = defineProps({
  /** 选项卡标题（双击可编辑） */
  title: { type: String, default: 'Paper Query' },
  /** 论文项：[{ id, globalIndex, name, year, count, content(imgUrl), pdfUrl }] */
  items: { type: Array, default: () => [] },
  /** 有选中时，其它项透明度 */
  dimOpacity: { type: Number, default: 0.15 },
  /** v-model:selected-ids（用 globalIndex 做主键） */
  selectedIds: { type: Array, default: () => [] },
  /** 每个缩略卡最小宽度（控制每行个数），建议 92~120px */
  tileMin: { type: [String, Number], default: 100 }, // ~ 一行 5–6 个
  /** 缩略图高宽比（h = tileMin * thumbRatio） */
  thumbRatio: { type: Number, default: 0.68 }
})

/* ---------- Emits ---------- */
const emit = defineEmits(['update:title', 'update:selectedIds', 'open-pdf', 'close'])

/* ---------- 演示数据（兜底） ---------- */
const demoItems = [
  { id: 0, globalIndex: 0, name: '1911.12919v1', year: '2020', count: 45,
    content: new URL(`../assets/pictures/case_2/0_page_0_Figure_8.jpeg`, import.meta.url).href,
    pdfUrl: new URL(`../assets/pdf/case2/0_1911.12919v1.pdf`, import.meta.url).href },
  { id: 1, globalIndex: 1, name: '3219819.3219822', year: '2019', count: 38,
    content: new URL(`../assets/pictures/case_2/1_page_1_Figure_17.jpeg`, import.meta.url).href,
    pdfUrl: new URL(`../assets/pdf/case2/1_3219819.3219822.pdf`, import.meta.url).href },
  { id: 2, globalIndex: 2, name: 'acp-24-2423-2024', year: '2024', count: 52,
    content: new URL(`../assets/pictures/case_2/2_page_6_Figure_1.jpeg`, import.meta.url).href,
    pdfUrl: new URL(`../assets/pdf/case2/2_acp-24-2423-2024.pdf`, import.meta.url).href },
  { id: 3, globalIndex: 3, name: 'acp-25-9061-2025', year: '2025', count: 41,
    content: new URL(`../assets/pictures/case_2/3_page_8_Figure_1.jpeg`, import.meta.url).href,
    pdfUrl: new URL(`../assets/pdf/case2/3_acp-25-9061-2025.pdf`, import.meta.url).href },
  { id: 4, globalIndex: 4, name: 'airvis', year: '2022', count: 35,
    content: new URL(`../assets/pictures/case_2/4_page_0_Figure_2.jpeg`, import.meta.url).href,
    pdfUrl: new URL(`../assets/pdf/case2/4_airvis.pdf`, import.meta.url).href },
  { id: 5, globalIndex: 5, name: 'atmosphere-07-00035', year: '2020', count: 48,
    content: new URL(`../assets/pictures/case_2/5_page_2_Figure_4.jpeg`, import.meta.url).href,
    pdfUrl: new URL(`../assets/pdf/case2/5_atmosphere-07-00035.pdf`, import.meta.url).href },
]
const displayItems = computed(() => (props.items?.length ? props.items : demoItems))

/* ---------- 标题编辑（与右端交互一致） ---------- */
const editing = ref(false)
const titleLocal = ref(props.title)
watch(() => props.title, v => (titleLocal.value = v))

function startEdit() {
  editing.value = true
  nextTick(() => {
    const el = document.querySelector('.paperlist-card .step__title-text')
    if (!el) return
    const range = document.createRange()
    range.selectNodeContents(el); range.collapse(false)
    const sel = window.getSelection(); sel.removeAllRanges(); sel.addRange(range)
    el.focus()
  })
}
function finishEdit(e) {
  if (!editing.value) return
  const t = (e?.target?.innerText || '').trim()
  if (t && t !== props.title) emit('update:title', t)
  else e.target.innerText = props.title
  editing.value = false
}
function onTitleKey(e) {
  if (!editing.value) return
  if (e.key === 'Enter') { e.preventDefault(); e.currentTarget.blur() }
  if (e.key === 'Escape') {
    e.preventDefault()
    e.currentTarget.innerText = props.title
    editing.value = false
    e.currentTarget.blur()
  }
}

/* ---------- 多选 ---------- */
const selected = ref([...(props.selectedIds || [])])
watch(() => props.selectedIds, v => (selected.value = [...(v || [])]))

function toggleSelect(gi) {
  const s = new Set(selected.value)
  s.has(gi) ? s.delete(gi) : s.add(gi)
  selected.value = [...s]
  emit('update:selectedIds', selected.value)
}
function clearSelection() { selected.value = []; emit('update:selectedIds', selected.value) }
defineExpose({ clearSelection, getSelected: () => [...selected.value] })

function opacityFor(gi) {
  if (!selected.value.length) return 1
  return selected.value.includes(gi) ? 1 : props.dimOpacity
}
function openPdf(it) { emit('open-pdf', it) }

/* ---------- 计算注入 CSS 变量 ---------- */
const gridVars = computed(() => {
  const min = typeof props.tileMin === 'number' ? `${props.tileMin}px` : String(props.tileMin)
  const ratio = String(props.thumbRatio)
  return { '--tile-min': min, '--thumb-ratio': ratio }
})
</script>

<template>
  <!-- 选项卡外壳 -->
  <article class="step-card paperlist-card">
    <!-- 标题行（左：标题，右：圆形关闭） -->
    <div class="step__title-row">
      <div
        class="step__title step__title-text"
        :contenteditable="editing ? 'plaintext-only' : 'false'"
        @dblclick="startEdit"
        @blur="finishEdit"
        @keydown="onTitleKey"
        :title="editing ? 'Enter保存 · Esc取消' : '双击编辑标题'"
      >
        {{ titleLocal }}
      </div>
      <button class="subspace-close" @click="$emit('close')" aria-label="Close">×</button>
    </div>

    <!-- 子卡列表（仅一个 paperlist 子卡） -->
    <div class="subcards">
      <section class="subcards__item subcard subcard_paperlist">
        <div class="pl-grid" :style="gridVars">
          <div
            v-for="it in displayItems"
            :key="it.globalIndex"
            class="pl-item"
            :class="{ 'is-selected': selected.includes(it.globalIndex) }"
            :style="{ opacity: opacityFor(it.globalIndex) }"
            @click.stop="toggleSelect(it.globalIndex)"
            :title="it.name"
          >
            <div class="thumb" :style="{ backgroundImage: `url(${it.content})` }">
              <button class="eye-btn" @click.stop="openPdf(it)" title="Preview PDF" aria-label="Preview">
                <svg viewBox="0 0 24 24" class="eye-svg" aria-hidden="true">
                  <path d="M12 4.5c-6.627 0-12 7.072-12 7.5s5.373 7.5 12 7.5 12-7.072 12-7.5-5.373-7.5-12-7.5zm0 12c-2.485 0-4.5-2.015-4.5-4.5s2.015-4.5 4.5-4.5 4.5 2.015 4.5 4.5-2.015 4.5-4.5 4.5zm0-7.5c-1.657 0-3 1.343-3 3s1.343 3 3 3 3-1.343 3-3-1.343-3-3-3z"/>
                </svg>
              </button>
            </div>
            <div class="meta">
                <span class="title">{{ it.name }}</span>
            </div>
          </div>
        </div>
      </section>
    </div>
  </article>
</template>

<style scoped>
/* 尽量紧凑、与右端节奏一致 */
.paperlist-card{
  /* 减少左右内边距带来的“白条”观感：自身不滚动，交给外层滚动 */
  overflow: hidden;
}
.step-card{
  border:1px solid #e5e7eb;
  border-radius:10px;
  padding:6px;
  margin-bottom:10px;
  display:grid;
  gap:6px;
  grid-template-rows:auto auto;
  background:#fff;
}

/* 标题行（左标题 + 右关闭圆按钮） */
.step__title-row{
  display:flex; align-items:center; gap:6px;
}
.step__title{
  flex:1 1 auto;
  font-weight:600; font-size:11px; line-height:1.2;
  padding:4px 6px; border-radius:8px;
  background:#f9fafb;
  user-select:text; cursor:text;
  outline:none; border:1px dashed transparent;
}
.step__title[contenteditable="plaintext-only"]{
  border-color:#c7d2fe; background:#eef2ff;
}
/* 圆形关闭按钮（与你之前一致） */
.subspace-close{
  width: 20px; height: 20px; line-height: 18px;
  text-align:center; border:1px solid #e5e7eb;
  border-radius:50%; background:#fff; color:#111;
  cursor:pointer; font-size:13px; padding:0;
  box-shadow:0 1px 2px rgba(0,0,0,.08);
}
.subspace-close:hover{ background:#f5f5f5; }

/* 子卡容器 */
.subcards{ display:flex; flex-direction:column; gap:8px; }
.subcards__item{ border-radius:10px; }
.subcard_paperlist{
  border:1px solid #e5e7eb; background:#fff;
  border-radius:10px; padding:8px;
}

/* 网格：使用 CSS 变量控制列数（--tile-min），默认 100px → 一行 5–6 个 */
.pl-grid{
  --tile-min: 100px;
  --thumb-ratio: 0.68; /* 高度 = tileMin * ratio */
  display:grid;
  grid-template-columns: repeat(auto-fill, minmax(var(--tile-min), 1fr));
  gap:4px;
  align-items:start;
}

/* 单卡片：更小的圆角与边框，选中加深边框 */
.pl-item{
  user-select:none; background:#fff;
  border:1px solid #e5e7eb; border-radius:8px;
  padding:6px; transition:border-color .12s ease, box-shadow .12s ease, transform .06s ease;
}
.pl-item:hover{ border-color:#d1d5db; box-shadow:0 2px 8px rgba(0,0,0,.05); transform: translateY(-1px); }
.pl-item.is-selected{ border-color:#111; }

/* 缩略图：高度由变量控制，高宽自适应；右上角放“眼睛”按钮 */
.thumb{
  position:relative;
  width:100%;
  height: calc(var(--tile-min) * var(--thumb-ratio));
  background-size:cover; background-position:center; background-repeat:no-repeat;
  border-radius:6px; border:1px solid #e5e7eb; overflow:hidden;
}
.eye-btn{
  position:absolute; top:6px; right:6px;
  width:24px; height:24px;
  border:1px solid #e5e7eb; border-radius:6px;
  background:#fff; cursor:pointer; padding:0;
  display:flex; align-items:center; justify-content:center;
}
.eye-btn:hover{ background:#f4f4f5; }
.eye-svg{ width:16px; height:16px; fill:#9aa0a6; }
.eye-btn:hover .eye-svg{ fill:#111; }

/* 元信息行 */
.meta{ margin-top:4px; font-size:11px; color:#111; }
.meta .title {
  display: block;
  max-width: 100%;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;  /* 超出部分显示 ... */
}
</style>

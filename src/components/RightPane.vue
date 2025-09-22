<template>
  <section class="rp-card one">
    <header class="card__title">Stepwise Analysis View</header>

    <div class="rp-card__body">
      <div class="steps-stack" ref="stackRef">
        <!-- 父卡片（一次保存） -->
        <article v-for="(step, i) in steps" :key="step.id" class="step-card">
          <!-- 标题（一次保存一个） -->
          <div
            class="step__title"
            :data-index="i"
            @dblclick="beginEditTitle(i, $event)"
            @blur="finishEditTitle(i, $event)"
            @keydown="onTitleKey(i, $event)"
            :contenteditable="editingIdx === i ? 'plaintext-only' : 'false'"
            :title="editingIdx === i ? 'Enter to Save，Esc to Cancel' : 'Double click to Edit'"
          >
            {{ step.title || defaultTitle(step, i) }}
          </div>

          <!-- 子卡片列表：每条 link 一张（支持拖拽排序） -->
          <div class="subcards">
            <div
              v-for="(lk, j) in (step.links || [])"
              :key="lk.id || j"
              class="subcards__item"
              draggable="true"
              @dragstart="onDragStart(i, j, $event)"
              @dragover="onDragOver(i, j, $event)"
              @drop="onDrop(i, j, $event)"
              @dragend="onDragEnd"
              :class="{ 'is-drag-over': dragging.to?.i === i && dragging.to?.j === j }"
            >
              <LinkCard
                :link="lk"
                :nodes="step.nodes || []"
                :start-count-map="step.startCountMap"
                :colorByCountry="step.colorByCountry"
                :colorByPanelCountry="step.colorByPanelCountry"
                :normalizeCountryId="step.normalizeCountryId"
                :alpha-by-node="step.alphaByNode"
                :default-alpha="step.defaultAlpha"
                :borderColorByNode="step.borderColorByNode"  
                :borderWidthByNode="step.borderWidthByNode"  
                :fillByNode="step.fillByNode"                
              />
            </div>
          </div>

        </article>
      </div>
    </div>
  </section>
</template>

<script setup>
import { ref, onMounted, onBeforeUnmount, reactive } from 'vue'
import { onSelectionSaved, emitSummarizeSelected } from '../lib/selectionBus'
import LinkCard from './LinkCard.vue'
import { buildStartCountMap } from '@/lib/useLinkCard'

const steps = ref([])
const stackRef = ref(null)
const editingIdx = ref(-1)

const defaultTitle = (step, i) => {
  const t = step.createdAt ? new Date(step.createdAt) : new Date()
  const ts = `${t.getHours().toString().padStart(2,'0')}:${t.getMinutes().toString().padStart(2,'0')}:${t.getSeconds().toString().padStart(2,'0')}`
  return `Step ${i + 1} · ${ts}`
}

let offSaved = null
onMounted(() => {
  offSaved = onSelectionSaved((payload) => {
    const id = `${Date.now()}-${Math.random().toString(36).slice(2)}`
    const finalTitle = payload.title || `Step ${steps.value.length + 1}`

    // ① 先拿 nodes / links
    const nodes = Array.isArray(payload.nodes) ? payload.nodes : []
    const links = Array.isArray(payload.links) ? payload.links : []

    // ② 再分组（如果你有这一步）
    const hsus = groupHSUs(nodes, links)

    // ③ 取 mini 色板快照（多重兜底，保证拿到 fillByNode/alphaByNode）
    const palette =
      payload?.miniPalette
      || payload?.meta?.miniPalette
      || (window?.SemanticMap?.getMiniColorMaps?.() ?? null)
      || (window?.App?.getMiniColorMaps?.() ?? null)
      || (window?.App?.getSelectionSnapshot?.()?.meta?.miniPalette ?? null)

    // ④ push；优先用 palette，其次 payload，最后兜底
    steps.value.push({
      id,
      title: finalTitle,
      createdAt: payload.createdAt || Date.now(),
      nodes,
      links,
      startCountMap: buildStartCountMap(links),

      colorByCountry:      palette?.colorByCountry      ?? payload.colorByCountry      ?? {},
      colorByPanelCountry: palette?.colorByPanelCountry ?? payload.colorByPanelCountry ?? {},
      normalizeCountryId:  palette?.normalizeCountryId  ?? payload.normalizeCountryId  ?? ((x)=>x),

      // 这里直接吃 mini 色板里的 alphaByNode / fillByNode（它已经包含冲突区逐点覆盖）
      alphaByNode:         palette?.alphaByNode         ?? payload.alphaByNode         ?? {},
      borderColorByNode:   palette?.borderColorByNode   ?? payload.borderColorByNode   ?? {},
      borderWidthByNode:   palette?.borderWidthByNode   ?? payload.borderWidthByNode   ?? {},
      fillByNode:          palette?.fillByNode          ?? payload.fillByNode          ?? {},

      hsus,
      rawText: payload.rawText || '',
      summary: payload.summary || '',
      meta: payload.meta || {}
    })
  })
})


onBeforeUnmount(() => offSaved?.())

/**
 * 将上游 payload 里的透明度信息整理成  Map("panelIdx:q,r" -> alpha)
 * 兼容几种可能的来源：
 *  - payload.alphaByNode:        { "p:q,r": a, ... } 或 Map
 *  - payload.alphaByKey:         { "p|q,r": a, ... } 或 Map（来自 semanticMap 的 alphaByKey）
 *  - payload.colorOverridesByPanel: Map(panelIdx -> Map(countryId -> { alphaByKey: Map(...) }))
 */
function buildAlphaByNode(payload, nodes) {
  const out = new Map();
  const idOf = (p,q,r) => `${p}:${q},${r}`;

  // ① 直接给了 alphaByNode（最优先）
  const abn = payload?.alphaByNode;
  if (abn instanceof Map) {
    abn.forEach((a, k) => out.set(String(k), Number(a)));
    return out;
  }
  if (abn && typeof abn === 'object') {
    Object.keys(abn).forEach(k => out.set(String(k), Number(abn[k])));
    return out;
  }

  // ② 给了 alphaByKey（"p|q,r" -> alpha），把分隔符转换一下
  const abk = payload?.alphaByKey;
  if (abk instanceof Map) {
    abk.forEach((a, key) => {
      const [pStr, qr] = String(key).split('|');
      if (!qr) return;
      const [qStr, rStr] = qr.split(',');
      out.set(idOf(+pStr, +qStr, +rStr), Number(a));
    });
    return out;
  }
  if (abk && typeof abk === 'object') {
    Object.keys(abk).forEach(key => {
      const [pStr, qr] = String(key).split('|');
      if (!qr) return;
      const [qStr, rStr] = qr.split(',');
      out.set(idOf(+pStr, +qStr, +rStr), Number(abk[key]));
    });
    return out;
  }

  // ③ 从 colorOverridesByPanel 深挖（semanticMap 内部结构）
  const cop = payload?.colorOverridesByPanel; // 可能是 Map 或对象
  const forEachKV = (mapLike, fn) => {
    if (!mapLike) return;
    if (mapLike instanceof Map) { mapLike.forEach(fn); return; }
    if (typeof mapLike === 'object') { Object.keys(mapLike).forEach(k => fn(mapLike[k], k)); }
  };
  forEachKV(cop, (byCountry, panelIdxKey) => {
    const pIdx = Number(panelIdxKey);
    forEachKV(byCountry, (ov) => {
      const alphaByKey = ov?.alphaByKey;
      if (!alphaByKey) return;
      forEachKV(alphaByKey, (a, key) => {
        const [pStr, qr] = String(key).split('|'); // "p|q,r"
        if (!qr) return;
        const [qStr, rStr] = qr.split(',');
        if (+pStr !== pIdx) return;
        out.set(idOf(pIdx, +qStr, +rStr), Number(a));
      });
    });
  });

  // ④ 兜底：如果完全拿不到透明度，给已存在节点一个默认 1（可按需改）
  if (out.size === 0 && Array.isArray(nodes)) {
    nodes.forEach(n => out.set(idOf(n.panelIdx, n.q, n.r), 1));
  }
  return out;
}

/** ====== 标题编辑 ====== */
function beginEditTitle(i, evt) {
  editingIdx.value = i
  const el = evt.currentTarget
  if (!el) return
  const range = document.createRange()
  range.selectNodeContents(el)
  const sel = window.getSelection()
  sel.removeAllRanges(); sel.addRange(range)
}
function finishEditTitle(i, evt) {
  if (editingIdx.value !== i) return
  const el = evt.currentTarget
  if (!el) { editingIdx.value = -1; return }
  const txt = (el.textContent || '').trim()
  steps.value[i].title = txt || ''
  editingIdx.value = -1
}
function onTitleKey(i, evt) {
  if (editingIdx.value !== i) return
  if (evt.key === 'Enter') {
    evt.preventDefault()
    evt.currentTarget?.blur()
  } else if (evt.key === 'Escape') {
    evt.preventDefault()
    const el = evt.currentTarget
    if (el) el.textContent = steps.value[i].title || defaultTitle(steps.value[i], i)
    editingIdx.value = -1
  }
}

/** ====== 子卡片拖拽换序（每个 Step 内） ====== */
const dragging = reactive({ from: null, to: null });

function onDragStart(stepIdx, linkIdx, e) {
  dragging.from = { i: stepIdx, j: linkIdx };
  e.dataTransfer.effectAllowed = 'move';
  e.dataTransfer.setData('text/plain', `${stepIdx}:${linkIdx}`);
}
function onDragOver(stepIdx, linkIdx, e) {
  e.preventDefault(); // 允许 drop
  if (!dragging.from) return;
  dragging.to = { i: stepIdx, j: linkIdx };
}
function onDrop(stepIdx, linkIdx, e) {
  e.preventDefault();
  const src = dragging.from; if (!src) return;
  // 仅支持“同一个 Step 内”换序
  if (src.i === stepIdx) {
    const arr = steps.value[stepIdx].links;
    const item = arr.splice(src.j, 1)[0];
    arr.splice(linkIdx, 0, item);
    // 顺带更新 startCountMap（起点次序不影响计数，但安全起见保持一致）
    steps.value[stepIdx].startCountMap = buildStartCountMap(arr);
  }
  dragging.from = dragging.to = null;
}
function onDragEnd() { dragging.from = dragging.to = null; }
 /** ========== NEW：按 HSU 分组   路径排序 ========== */
 function groupHSUs(nodes, links) {
   const keyOf = (n) => `${n.panelIdx}|${n.q},${n.r}`
   const map = new Map() // key -> { key, panelIdx,q,r,country_id, msus:[{id,text,checked}] }
   ;(nodes || []).forEach(n => {
     const k = keyOf(n)
     if (!map.has(k)) {
       map.set(k, { key: k, panelIdx: n.panelIdx, q: n.q, r: n.r, country_id: n.country_id ?? null, msus: [] })
     }
     const bucket = map.get(k)
     // 兼容两种：n.msu 或 n.msu_ids（无文本时用 id 兜底字符串）
     if (Array.isArray(n.msu) && n.msu.length) {
       n.msu.forEach((m, idx) => bucket.msus.push({
         id: m.id ?? `${k}#${idx}`,
         text: (m.text ?? m.summary ?? String(m.id ?? idx)).toString(),
         checked: false
       }))
     } else if (Array.isArray(n.msu_ids) && n.msu_ids.length) {
       n.msu_ids.forEach((mid, idx) => bucket.msus.push({
         id: mid ?? `${k}#${idx}`,
         text: String(mid ?? `${k}#${idx}`),
         checked: false
       }))
     }
   })
   // 路径顺序（取第一条 link 的 path 为序）
   const first = Array.isArray(links) && links[0]
   const pathOrder = []
   if (first && Array.isArray(first.path)) {
     first.path.forEach(p => pathOrder.push(`${p.panelIdx}|${p.q},${p.r}`))
   }
   const keys = Array.from(map.keys())
   keys.sort((a, b) => {
     const ia = pathOrder.indexOf(a), ib = pathOrder.indexOf(b)
     if (ia >= 0 && ib >= 0) return ia - ib
     if (ia >= 0) return -1
     if (ib >= 0) return 1
     // 无路径：按 panelIdx -> q -> r 稳定排序
     const [pa, qa, ra] = a.split(/[|,]/).map(Number)
     const [pb, qb, rb] = b.split(/[|,]/).map(Number)
     if (pa !== pb) return pa - pb
     if (qa !== qb) return qa - qb
     return ra - rb
   })
   return keys.map(k => map.get(k))
 }
 
 /** ========== NEW：收集勾选 MSU -> 发起“总结请求” ========== */
 function summarizeStep(stepIdx) {
   const s = steps.value[stepIdx]
   if (!s) return
   const selectedTexts = []
   ;(s.hsus || []).forEach(h => (h.msus || []).forEach(m => {
     if (m.checked && m.text) selectedTexts.push(m.text)
   }))
   // 右侧不直接调大模型；只发“总结请求”事件，交给上游处理
   emitSummarizeSelected({
     stepId: s.id,
     title: s.title,
     nodes: s.hsus,         // 携带结构，便于上游溯源
     selectedTexts
   })
 }


</script>

<style scoped>
.rp-card.one{ height:100%; background:#fff; border-radius:12px;
  display:flex; flex-direction:column; min-height:0; overflow:hidden; }
.rp-card__body{ padding:6px; min-height:0; overflow:auto; }

.steps-stack{ width:100%; height:100%; overflow:auto; min-height:0; scrollbar-width: none; }
.steps-stack::-webkit-scrollbar{ width:0; height:0; }

.step-card{
  border:1px solid #e5e7eb; border-radius:10px;
  padding:6px; margin-bottom:10px;
  display:grid; gap:4px;
  grid-template-rows: auto auto;
  background:#fff;
}
.step__title{
  font-weight:600; font-size:14px; line-height:1; padding:6px 6px; border-radius:8px;
  background:#f9fafb; user-select:text; cursor:text;
  outline:none; border:1px dashed transparent;
}
.step__title[contenteditable="plaintext-only"]{ border-color:#c7d2fe; background:#eef2ff; }

/* 子卡片区 + 拖拽态 */
.subcards{ display:flex; flex-direction:column; gap:10px; }
.subcards__item{ border-radius:10px; }
.subcards__item.is-drag-over{ outline:2px dashed #93c5fd; outline-offset:2px; }
</style>

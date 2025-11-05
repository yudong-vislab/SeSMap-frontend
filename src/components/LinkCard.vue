<!-- src/components/LinkCard.vue -->
<template>
  <section class="subcard" :class="{ 'expanded': showOriginal }">
    <!-- ⓪ Subspace(s) 标签 -->
    <div class="subcard__meta" v-if="(props.link?.panelNames?.length || 0) > 0">
      <span class="meta-label">{{ props.link.panelNames.length > 1 ? 'Subspaces' : 'Subspace' }}:</span>
      <span class="meta-names">{{ props.link.panelNames.join(' -> ') }}</span>
    </div>

    <!-- ① Hex 概览 + Summarize 按钮（新增） -->
    <!-- ① Hex 概览（按钮与 hex 同层，绝对定位到右侧，垂直居中） -->
     <div class="subcard__hex">
       <div class="hex-scroll">
         <svg ref="svgRef" class="mini" />
       </div>
       <button
         class="show-original-btn summarize-btn hex-action"
         type="button"
         :disabled="selectedCount === 0 || llmLoading"
         @click="summarizeSelected"
         title="Summarize checked MSUs in this link"
       >
         Summarize<span v-if="selectedCount"> ({{ selectedCount }})</span>
       </button>
     </div>


    <!-- ② 原文句子 - 显示当前link关联的MSU句子（含勾选） -->
    <div class="subcard__source">
       <div v-if="displayMsuSentences.length > 0" class="msu-sentences">
         <!-- ★ 使用 displayMsuSentences：点击节点时仅显示该 HSU 的 MSU，点击空白恢复全部 -->
         <div v-for="(msu, index) in displayMsuSentences" :key="msu.uid" class="msu-sentence">
          <div class="msu-meta">
            <label class="msu-checkwrap">
              <input
                type="checkbox"
                class="msu-check"
                :aria-label="`Select MSU ${msu.id}`"
                :checked="selectedMsus.has(msu.uid)"
                @change="toggleMsu(msu.uid)"
              />
              <span class="msu-id">MSU {{ msu.id }}</span>
            </label>

            <button class="show-original-btn" @click="toggleOriginal">
              {{ showOriginal ? 'Hide Details' : 'Show Details' }}
            </button>
          </div>

          <div class="msu-text">{{ msu.sentence }}</div>

          <!-- 展开显示的para_info -->
          <div v-if="showOriginal && msu.para_info" class="para-info">
            <div class="para-info-content">{{ msu.para_info }}</div>
          </div>
        </div>
      </div>
      <div v-else class="placeholder">No MSU sentences for this link</div>
    </div>

    <!-- ③ 大模型总结（展示点击按钮后的结果） -->
    <div class="subcard__llm">
      <div v-if="llmSummary" class="llm-content">
       Summary:  {{ llmSummary }}
      </div>
      <div v-else-if="llmLoading" class="llm-loading">
        LLM is summarizing...
      </div>
      <div v-else-if="llmError" class="llm-error">
        {{ llmError }}
      </div>
      <div v-else class="placeholder">LLM summary</div>
    </div>
  </section>
</template>

<script setup>
import { onMounted, watch, ref, onBeforeUnmount, computed } from 'vue'
import { mountMiniLink } from '@/lib/useLinkCard'
import { summarizeMsuSentences } from '@/lib/api'

const props = defineProps({
  link:  { type: Object, required: true },
  nodes: { type: Array,  default: () => [] },
  startCountMap: { type: Object, default: () => new Map() },

  colorByCountry: { type: [Object, Map], default: () => ({}) },
  colorByPanelCountry: { type: [Object, Map], default: () => ({}) },
  normalizeCountryId: { type: Function, default: (x) => x },

  // 透明度映射
  alphaByNode: { type: [Object, Map], default: () => ({}) },
  defaultAlpha: { type: Number, default: 1 },

  // 逐节点边框 & 逐节点填充（Alt 覆盖）
  borderColorByNode: { type: [Object, Map], default: () => ({}) },
  borderWidthByNode: { type: [Object, Map], default: () => ({}) },
  fillByNode: { type: [Object, Map], default: () => ({}) },
})

const svgRef = ref(null)
let mini = null

const showOriginal = ref(false)
const llmSummary = ref('')
const llmLoading = ref(false)
const llmError = ref('')

// 勾选状态：存 uid（= HSU key + '#' + MSU id），确保同一 MSU 出现在不同 HSU 时不混淆
const selectedMsus = ref(new Set())

// ★ 新增：当前点击选中的 HSU 键（"panelIdx:q,r"），null 表示不筛选
const pickedNodeKey = ref(null)

// 切换显示/隐藏原文
const toggleOriginal = () => { showOriginal.value = !showOriginal.value }

// 切换某个 MSU 的选择状态
const toggleMsu = (uid) => {
  const set = new Set(selectedMsus.value)
  if (set.has(uid)) set.delete(uid)
  else set.add(uid)
  selectedMsus.value = set
}

// 已选择的数量
const selectedCount = computed(() => selectedMsus.value.size)

// 计算当前 link 关联的 MSU，**带 HSU key**（panelIdx:q,r）用于分组
const linkMsuSentences = computed(() => {
  if (!props.link?.path || !Array.isArray(props.nodes)) return []
  // (1) 把 nodes 建立索引： "panelIdx:q,r" -> node
  const nodeMap = new Map()
  props.nodes.forEach(node => {
    const key = `${node.panelIdx}:${node.q},${node.r}`
    nodeMap.set(key, node)
  })

  // (2) 沿 path 收集 MSU，并附上它来自哪个 HSU（hsuKey）
  const out = []
  const seen = new Set() // 去重同一 HSU 中重复的 MSU id（可按需求调整是否全局去重）
  const path = Array.isArray(props.link.path) ? props.link.path : []
  path.forEach(point => {
    const hsuKey = `${point.panelIdx}:${point.q},${point.r}`
    const node = nodeMap.get(hsuKey)
    if (node?.msu && Array.isArray(node.msu)) {
      node.msu.forEach(msu => {
        const id = msu?.MSU_id ?? msu?.id
        if (id == null) return
        const uid = `${hsuKey}#${id}` // 唯一 uid = HSU + MSU
        if (seen.has(uid)) return
        seen.add(uid)
        out.push({
          uid,
          hsuKey,
          id,
          sentence: msu.sentence || msu.text || 'No sentence available',
          category: msu.category || 'Unknown',
          para_info: msu.para_info || null,
          raw: msu
        })
      })
    }
  })
  return out
})

/** 点击按钮：仅对已勾选的 MSU 做总结，并按 HSU 分组发给后端 */
/** 点击按钮：仅对已勾选的 MSU 做总结，并按“路径顺序”组织为 hops */
const summarizeSelected = async () => {
  llmError.value = '';
  llmSummary.value = '';

  // 1) 建 index： "panelIdx:q,r" -> node
  const nodeMap = new Map();
  (props.nodes || []).forEach(node => {
    const key = `${node.panelIdx}:${node.q},${node.r}`;
    nodeMap.set(key, node);
  });

  // 2) panelIdx → 子空间名（尽力获取；不存在就回退）
  //   - 如果后端/数据层有 link.panelNamesByIndex 之类映射，可优先使用
  const panelNameByIdx = (props.link && props.link.panelNamesByIndex) || {};
  const getDomNameMap = () => {
    try {
      const els = document.querySelectorAll('.subspace-title');
      const m = {};
      els.forEach((el, i) => {
        const idxAttr = el.dataset?.panelIdx ?? el.getAttribute('data-panel-idx') ?? i;
        const idx = Number.isFinite(Number(idxAttr)) ? Number(idxAttr) : i;
        const raw =
          (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA') ? el.value :
          el.isContentEditable ? el.innerText :
          el.textContent;
        const name = (raw || '').trim() || `Subspace ${idx}`;
        m[idx] = name;
      });
      return m;
    } catch { return {}; }
  };

  const fallbackName = (idx) => {
    const p = panelNameByIdx[idx];
    if (p) return p;
    const dm = getDomNameMap();
    return dm[idx] || `Subspace ${idx}`;
  };
  // 3) 仅依据“用户勾选”的 MSU 构建 hops（保持 path 顺序；未选中的节点直接跳过）
  const hops = [];
  const sel = selectedMsus.value; // Set("<panelIdx:q,r>#<MSU_id>")
  const path = Array.isArray(props.link?.path) ? props.link.path : [];

  // 预先提取出被选中的 HSU 键集合，避免在每个节点上无意义遍历
  const selectedHsuKeys = new Set(
    Array.from(sel).map(uid => uid.split('#')[0]) // -> "<panelIdx:q,r>"
  );

  path.forEach((pt, i) => {
    const hsuKey = `${pt.panelIdx}:${pt.q},${pt.r}`;
    if (!selectedHsuKeys.has(hsuKey)) return; // 该节点无任何被选中的 MSU，直接跳过

    const node = nodeMap.get(hsuKey);
    if (!node?.msu || !Array.isArray(node.msu)) return;

    const sentences = [];
    for (const msu of node.msu) {
      const id = msu?.MSU_id ?? msu?.id;
      if (id == null) continue;
      const uid = `${hsuKey}#${id}`;
      if (!sel.has(uid)) continue; // 只要“勾选”的
      const sent = (msu.sentence || msu.text || '').trim();
      if (sent) sentences.push(`MSU ${id}: ${sent}`);
    }

    if (sentences.length) {
      hops.push({
        step: i + 1,
        hsu: hsuKey,                             // "panelIdx:q,r"
        panelIdx: pt.panelIdx,
        subspace: fallbackName(pt.panelIdx),     // 最佳可得的子空间名
        sentences                                // 仅包含用户选中的句子
      });
    }
  });

  if (hops.length === 0) {
    llmError.value = 'Please select at least one MSU.';
    return;
  }

  try {
    llmLoading.value = true;
    // 把“有序 hops”传给 API
    const answer = await summarizeMsuSentences(hops);
    llmSummary.value =
      typeof answer === 'string' ? answer :
      answer?.text ?? answer?.summary ?? answer?.payload?.text ?? answer?.payload?.summary ??
      JSON.stringify(answer);
  } catch (err) {
    console.error(err);
    llmError.value = 'Failed to generate summary.';
  } finally {
    llmLoading.value = false;
  }
};

// ★ 新增：根据是否点击选中某个 HSU 来决定显示的 MSU 清单
const displayMsuSentences = computed(() => {
  const all = linkMsuSentences.value || []
  if (!pickedNodeKey.value) return all
  return all.filter(m => m.hsuKey === pickedNodeKey.value)
})

onMounted(() => {
  mini = mountMiniLink(svgRef.value, {
    link: props.link,
    nodes: props.nodes,
    startCountMap: props.startCountMap,
    colorByCountry: props.colorByCountry,
    colorByPanelCountry: props.colorByPanelCountry,
    normalizeCountryId: props.normalizeCountryId,
    alphaByNode: props.alphaByNode,
    defaultAlpha: props.defaultAlpha,
    borderColorByNode: props.borderColorByNode,
    borderWidthByNode: props.borderWidthByNode,
    fillByNode: props.fillByNode,
    pickedId: pickedNodeKey.value,          // ★ 同步当前选中（初始为空）
    onPick: (key /* "panelIdx:q,r" or null */) => {
      pickedNodeKey.value = key
    }

  })
})

// 数据更新时刷新小卡
watch(
  () => [
    props.link,
    props.nodes,
    props.startCountMap,
    props.colorByCountry,
    props.colorByPanelCountry,
    props.normalizeCountryId,
    props.alphaByNode,
    props.defaultAlpha,
    props.borderColorByNode,
    props.borderWidthByNode,
    props.fillByNode
  ],
  () => {
    mini?.update({
      link: props.link,
      nodes: props.nodes,
      startCountMap: props.startCountMap,
      colorByCountry: props.colorByCountry,
      colorByPanelCountry: props.colorByPanelCountry,
      normalizeCountryId: props.normalizeCountryId,
      alphaByNode: props.alphaByNode,
      defaultAlpha: props.defaultAlpha,
      borderColorByNode: props.borderColorByNode,
      borderWidthByNode: props.borderWidthByNode,
      fillByNode: props.fillByNode,
      pickedId: pickedNodeKey.value,        // ★ 每次更新保持选中样式
      onPick: (key) => { pickedNodeKey.value = key }
    })
  },
  { deep: true }
)

onBeforeUnmount(() => mini?.destroy())

// ⚠️ 重要：移除“自动生成总结”的 watch，改为用户点击按钮才总结
// （所以不再 watch(linkMsuSentences) 自动调用 generateSummary）
</script>

<style scoped>
/* 原样保留你的样式（仅补极少量按钮容器样式） */

/* —— 新增：hex 内按钮容器 —— */
.hex-action{
  position: absolute;
  right: 8px;                /* 与“Show Details”右边距保持一致，如需改：6/10/12 */
  top: 50%;
  transform: translateY(-50%);
  white-space: nowrap;
}

/* —— 新增：tickbox 相关 —— */
.msu-checkwrap{
  display:inline-flex;
  align-items:center;
  gap:6px;
}
.msu-check{
  width: 0.95em;
  height: 0.95em;
  flex: none;
  margin: 0;
  vertical-align: middle;
  accent-color: #e5e7eb;
}

/* 原有样式（未改动） */
.subcard{
  border:1px dashed #e5e7eb; border-radius:10px;
  display:grid; gap:4px;
  grid-template-rows:auto auto auto auto;
  padding:4px; background:#fff;
  transition: all 0.3s ease;
}
.subcard.expanded { grid-template-rows: auto auto auto auto; }
.subcard__meta{ padding:2px 2px 0 2px; line-height:1; font-size:12px; color:#6b7280; }
.meta-label{ font-weight:600; margin-right:4px; }
.meta-names{ font-weight:500; }

.subcard__hex, .subcard__source, .subcard__llm{
  border:1px dashed #e5e7eb; border-radius:8px; padding:6px; min-height:40px;
}
.subcard__hex{
  /* 同一行：svg 在左，按钮在右；垂直居中 */
  position: relative;        /* 让右侧按钮以本容器为定位参照 */
  display: flex;
  align-items: center;       /* 按钮与 hex 垂直对齐 */
  height: 30px;              /* 与你原设计一致 */
}
.hex-row{
  display:flex; align-items:center; justify-content:space-between; gap:8px; width:100%;
}
.hex-scroll{
  max-width:100%; height:100%;
  display:flex; justify-content:flex-start; align-items:center;
  overflow-x:auto; overflow-y:hidden; scrollbar-width:none;
}

.hex-scroll::-webkit-scrollbar{ height:0; }

.subcard__source { max-height: 200px; overflow-y: auto; transition: all 0.3s ease; }
.subcard.expanded .subcard__source { max-height: 500px; }
.msu-sentences { font-size: 11px; line-height: 1.4; }
.msu-sentence { margin-bottom: 8px; padding: 6px; background: #f9fafb; border-radius: 4px; border-left: 3px solid #e5e7eb; }
.msu-sentence:last-child { margin-bottom: 0; }

.msu-meta { display: flex; justify-content: space-between; align-items: center; margin-bottom: 4px; }
.msu-id { font-weight: 600; color: #374151; font-size: 10px; }

.show-original-btn{
  font-size: 10px;
  padding: 4px 10px;
  border-radius: 9999px;
  background: #111;      /* 默认可点击：深色 */
  color: #fff;           /* 白字 */
  border: none;
  cursor: pointer;
  transition: background-color 0.2s;
  line-height: 1;
}
.show-original-btn:hover:not(:disabled){
  background: #000;      /* hover 更深 */
}
.show-original-btn:disabled{
  background: #e5e7eb;   /* 禁用：变灰 */
  color: #9ca3af;        /* 文字也变淡 */
  cursor: not-allowed;
  opacity: 1;            /* 避免额外变淡 */
}

/* —— Summarize 专属覆盖（只需定义禁用态，启用时用通用黑底白字） —— */
.summarize-btn:disabled{
  background: #e5e7eb;
  color: #9ca3af;
}

.msu-text { color: #374151; font-size: 11px; line-height: 1.5; }
.para-info { margin-top: 8px; padding: 8px; background: #ffffff; border: 1px solid #e5e7eb; border-radius: 4px; }
.para-info-content { color: #4b5563; font-size: 10px; line-height: 1.5; white-space: pre-wrap; }

.subcard__llm { max-height: 100px; overflow-y: auto; }
.llm-content { font-size: 11px; line-height: 1.4; color: #374151; padding: 6px; background: #ffffff; border-radius: 4px; border-left: 3px solid #e5e7eb; }
.llm-loading { font-size: 11px; color: #6b7280; font-style: italic; padding: 6px; }
.llm-error { font-size: 11px; color: #ef4444; padding: 6px; }

.placeholder{ color:#9ca3af; font-size:12px; }
.mini{ height:100%; display:block; }

/* 选中节点更醒目（可按需调整颜色/粗细） */
.mini :deep(.nodes-layer .node.hovered .hex) {
  stroke: #111;
  stroke-width: 1;
}
.mini :deep(.nodes-layer .node.picked .hex) {
  stroke: #111;
  stroke-width: 1;
}
</style>

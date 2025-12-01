<!-- src/components/MainView.vue（只展示需要改的部分） -->
<script setup>
import { onMounted, onBeforeUnmount, ref, nextTick, provide } from 'vue'
import { initSemanticMap } from '../lib/semanticMap'
import {
  fetchSemanticMap,
  createSubspace,
  renameSubspace,
  renameMapTitle,
  getActiveProjectId      // ✨ 新增：从 api.js 引入当前激活的 case
} from '../lib/api'
import { emitSelectionSaved } from '../lib/selectionBus'

const outerRef = ref(null)
const playgroundRef = ref(null)
const globalOverlayRef = ref(null)
const mainTitleRef = ref(null)

let controller = null
const ready = ref(false)

// ✨ 新增：保存事件处理函数，方便卸载
let projectChangedHandler = null

/**
 * ✨ 抽出来的初始化/重载函数
 *  - projectId 可以为 'case1' / 'case2' / 'case3' / null
 *  - 不传时默认用 getActiveProjectId()，再不行就走后端默认（case3）
 */
async function bootstrapSemanticMap(projectId) {
  await nextTick()
  if (!outerRef.value || !playgroundRef.value || !globalOverlayRef.value) return

  const pid = projectId || getActiveProjectId() || null

  // 先向后端拉对应 case 的语义图数据
  const data = await fetchSemanticMap(pid)

  // 若已经有旧的 controller，先清理（防止残留元素/事件）
  if (controller?.cleanup) {
    try {
      controller.cleanup()
    } catch (e) {
      console.warn('[MainView] previous controller cleanup error:', e)
    }
  }

  // 初始化 / 重新初始化 语义图
  controller = await initSemanticMap({
    outerEl: outerRef.value,
    playgroundEl: playgroundRef.value,
    globalOverlayEl: globalOverlayRef.value,
    mainTitleEl: mainTitleRef.value,
    initialData: data,
    initialHidden: false
  })

  // provide 一下（和原来的写法一致）
  provide('SemanticMapCtrl', controller)

  // 让 ChatPanel 的命令路由可以拿到控制器
  window.SemanticMapCtrl = controller

  // 每次重建完都可以发一次 ready 事件（原来只有第一次，现在多次也没问题）
  window.dispatchEvent(new CustomEvent('semanticMap:ready'))

  // 绑定重命名回调
  controller.setOnSubspaceRename?.(async (idx, newName) => {
    await renameSubspace(idx, newName)
  })

  controller.setOnMainTitleRename?.(async (newTitle) => {
    try { await renameMapTitle(newTitle) } catch (e) { console.warn(e) }
  })

  ready.value = true
}

onMounted(async () => {
  // 1️⃣ 首次加载：用当前 activeProjectId（可能是 null，会走默认 case3）
  // await bootstrapSemanticMap()

  // 2️⃣ 监听 case 变更事件（由 sendQueryToLLM 中的 subspace/control 分支触发）
  projectChangedHandler = async (e) => {
    const pid = e.detail?.projectId || getActiveProjectId() || null
    console.log('[MainView] semantic-map:project-changed =>', pid)
    await bootstrapSemanticMap(pid)   // 🔁 用新的 case 重载语义图
  }

  window.addEventListener('semantic-map:project-changed', projectChangedHandler)
})

onBeforeUnmount(() => {
  // 卸载事件监听
  if (projectChangedHandler) {
    window.removeEventListener('semantic-map:project-changed', projectChangedHandler)
    projectChangedHandler = null
  }

  // 清理 controller
  controller?.cleanup?.()
  if (window.SemanticMapCtrl === controller) {
    delete window.SemanticMapCtrl
  }
})

async function onAddSubspace() {
  if (!ready.value || !controller) return
  const created = await createSubspace({})
  controller.addSubspace?.(created?.subspace || { subspaceName: 'New Subspace', hexList: [] })
}

/* 点击 Save 时，打印当前选择的节点 */
function onSave() {
  if (!ready.value || !controller) return

  // 先刷新一次样式，把此刻每个 hex 的最终透明度写入缓存
  controller?.refreshAllHexStyles?.()

  // 获取带 connected:true 的快照
  const snap = controller.getSelectionSnapshot?.() || { nodes: [], links: [] }
  const titleText = (mainTitleRef.value?.textContent || '').trim() || 'Semantic Map'
  const createdAt = Date.now()

  // 取小卡用的配色映射
  const {
    colorByCountry,
    colorByPanelCountry,
    normalizeCountryId,
    alphaByNode,
    borderColorByNode,
    borderWidthByNode,
    fillByNode
  } = controller.getMiniColorMaps()

  console.groupCollapsed('[SemanticMap] Selection Snapshot')
  console.log('nodes:', snap.nodes)
  console.log('links:', snap.links)
  console.groupEnd()

  emitSelectionSaved({
    ...snap,
    title: titleText,
    createdAt,
    colorByCountry,
    colorByPanelCountry,
    normalizeCountryId,
    alphaByNode,
    borderColorByNode,
    borderWidthByNode,
    fillByNode
  })
}
</script>


<template>
  <div class="mainview">
    <header class="mv-header">
      <h2 class="mv-title editable-title" ref="mainTitleRef">Semantic Subspace Map View</h2>

      <!-- 👇 模式按钮条（新增） -->
      <div class="mode-toolbar">
        <button id="mode-btn-select" class="mode-btn" type="button" title="Select Single HSU/Link">Single Select</button>
        <button id="mode-btn-route"  class="mode-btn" type="button" title="Select Multiple HSUs/Links (Ctrl/⌘)">Multiple Select</button>
        <button id="mode-btn-alt" class="mode-btn" type="button" title="Select Country/Conflict Area(Alt/Option)">Area Select</button>
        <!-- <button id="mode-btn-insert" class="mode-btn" type="button" title="Arm Connect (Ctrl/⌘+Shift), then click to start">Connect</button> -->
      </div>

      <div class="mv-actions">
        <!-- <button class="add-btn" @click="onAddSubspace" title="Add subspace">＋</button> -->
        <!-- <button class="filter-btn" title="Filter">Filter</button> -->
        <button class="save-btn" title="Save" @click="onSave">Save</button>
      </div>
    </header>

    <div ref="outerRef" class="mv-scroller">
      <div ref="playgroundRef" id="playground">
        <svg ref="globalOverlayRef" id="global-overlay"></svg>
      </div>
    </div>
  </div>
</template>


<style scoped>
/* 根容器：上下布局，header 固定在上，下面是滚动区 */
.mainview {
  height: 100%;
  display: grid;
  grid-template-rows: auto 1fr;  /* 顶部自适应高度 + 下方占满 */
  grid-template-columns: 100%;
}

/* 顶部标题栏 */
.mv-header {
  position: sticky;     /* 如果你希望它在大容器滚动时仍吸顶，可以 sticky；当前父容器不滚，fixed/relative 都行 */
  top: 0;
  z-index: 10;
  display: flex;
  align-items: center;
  justify-content: space-between; /* 左侧标题 & 右侧按钮 */
  padding: 8px;
  background: #fff;     /* 固定栏底色 */
  border-bottom: 1px solid #eee;
}

/* 标题文字 */
.mv-title {
  margin: 0;
  font-size: 16px;
  font-weight: 600;
  color: #333;
}

/* 右侧按钮容器：横向排列、保持右对齐 */
.mv-actions {
  display: flex;
  align-items: center;
  gap: 8px;             /* 两个按钮间距 */
}

/* 让中间区域成为滚动容器；滚动条自动隐藏（兼容 Chrome/Edge/Safari/Firefox） */
.mv-scroller {
  position: relative;
  height: 100%;
  overflow: auto;
  background: #fff;
  /* 让出现滚动条也不挤压布局（现代浏览器） */
  scrollbar-gutter: stable both-edges;
}

/* WebKit 自动隐藏滚动条（仍可滚动） */
.mv-scroller::-webkit-scrollbar {
  width: 8px;
  height: 8px;
}
.mv-scroller::-webkit-scrollbar-thumb {
  background: transparent;
  border-radius: 4px;
}
.mv-scroller:hover::-webkit-scrollbar-thumb {
  background: rgba(0,0,0,.15);
}
.mv-scroller::-webkit-scrollbar-track {
  background: transparent;
}

/* Firefox 自动隐藏风格 */
.mv-scroller {
  scrollbar-width: thin;          /* 细滚动条 */
  scrollbar-color: transparent transparent;
}
.mv-scroller:hover {
  scrollbar-color: rgba(0,0,0,.25) transparent;
}

.mode-toolbar{
  display:flex;
  align-items:center;
  gap:6px;
  margin-left:12px;   /* 让按钮与标题有点间距 */
}

.mode-btn{
  background:#f3f5f7; color:#334;
  border:1px solid #e3e7ee;
  border-radius:999px;
  padding:6px 10px; font-size:12px; line-height:1;
  cursor:default; opacity:.7; user-select:none;
}

/* 活动态（绿色） */
.mode-btn.is-active{
  background:#111;      /* 绿色 */
  border-color:#111;
  color:#fff; opacity:1;
}

/* 触发中/预备（黄色） */
.mode-btn.is-armed{
  background:#eec316;      /* 黄色 */
  border-color:#eec316;
  color:#fff; opacity:1;
}

/* —— 主标题默认态：与 subspace-title 的非编辑态保持风格一致 —— */
.mv-title.editable-title {
  cursor: text;                /* 双击后会进入编辑，保持 I-beam 语义 */
  font-size: 16px;
  color: #333;
  margin: 5px 0 2px 0;
  pointer-events: auto;
  user-select: none;           /* 非编辑态避免误选 */
  position: relative;
  z-index: 20;
  /* padding: 6px 8px; */
  border: 1px dashed transparent;
  border-radius: 8px;
  background: transparent;
  transition: background-color .12s ease, border-color .12s ease;
}

/* —— 主标题编辑态：完全复刻 subspace-title 的编辑效果 —— */
.mv-title.editable-title[contenteditable="plaintext-only"] {
  cursor: text;
  user-select: text;           /* 编辑态允许选中文本 */
  outline: none;
  background: #eef2ff;         /* 淡蓝底 */
  border-color: #c7d2fe;       /* 虚线边框显色 */
}

/* （可选）编辑态悬停更明显一点，与 subspace-title 保持一致 */
.mv-title.editable-title[contenteditable="plaintext-only"]:hover {
  border-color: #a5b4fc;
}



</style>

<!-- src/components/LeftPane.vue -->
<script setup>
import { ref, watch, nextTick, onMounted } from 'vue'
import ChatDock from './ChatDock.vue'
import * as d3 from 'd3';
import { sendQueryToLLM } from '../lib/api'

// ====== Emits ==========================================================
const emit = defineEmits(['updateHexRadius','updateSystemPrompt','uploadPdfs','updateMarkdownModel'])

// ====== LLM 选择 =======================================================
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

// ====== Chat（原有） ===================================================
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

// ====== Paper List（保留原有 D3） =====================================
let selectedPaperIndexs = []
const chartContainerRef = ref(null)
const eyePathData = "M12 4.5c-6.627 0-12 7.072-12 7.5s5.373 7.5 12 7.5 12-7.072 12-7.5-5.373-7.5-12-7.5zm0 12c-2.485 0-4.5-2.015-4.5-4.5s2.015-4.5 4.5-4.5 4.5 2.015 4.5 4.5-2.015 4.5-4.5 4.5zm0-7.5c-1.657 0-3 1.343-3 3s1.343 3 3 3 3-1.343 3-3-1.343-3-3-3z";

function generateFixedData() {
  const fileMappings = [
    { id: 0, pdfFile: '0_1911.12919v1.pdf', imageFile: '0_page_0_Figure_8.jpeg', name: '1911.12919v1', year: '2020', count: 45, domain: 'Air Pollution' },
    { id: 1, pdfFile: '1_3219819.3219822.pdf', imageFile: '1_page_1_Figure_17.jpeg', name: '3219819.3219822', year: '2019', count: 38, domain: 'Air Pollution' },
    { id: 2, pdfFile: '2_acp-24-2423-2024.pdf', imageFile: '2_page_6_Figure_1.jpeg', name: 'acp-24-2423-2024', year: '2024', count: 52, domain: 'Air Pollution' },
    { id: 3, pdfFile: '3_acp-25-9061-2025.pdf', imageFile: '3_page_8_Figure_1.jpeg', name: 'acp-25-9061-2025', year: '2025', count: 41, domain: 'Air Pollution' },
    { id: 4, pdfFile: '4_airvis.pdf', imageFile: '4_page_0_Figure_2.jpeg', name: 'airvis', year: '2022', count: 35, domain: 'Air Pollution' },
    { id: 5, pdfFile: '5_atmosphere-07-00035.pdf', imageFile: '5_page_2_Figure_4.jpeg', name: 'atmosphere-07-00035', year: '2020', count: 48, domain: 'Air Pollution' }
  ];
  const mappedFiles = fileMappings.map(item => ({
    name: item.name,
    id: `${item.id}`,
    globalIndex: item.id,
    year: item.year,
    count: item.count,
    content: new URL(`../assets/pictures/case_2/${item.imageFile}`, import.meta.url).href,
    pdfUrl: new URL(`../assets/pdf/case2/${item.pdfFile}`, import.meta.url).href,
    domain: item.domain
  }));
  return [{ domain: 'Air Pollution', value: mappedFiles, Total: mappedFiles.length.toString() }];
}

function drawChart() {
  const chartData = generateFixedData();
  const domains = ["Chemistry", "Society", "Visualization"];
  const colors = ["#69b3a2", "#e69f00", "#56b4e9"];
  const colorScale = d3.scaleOrdinal().domain(domains).range(colors);

  const totalPaperCount = d3.sum(chartData, d => d.value.length);

  const groupPadding_left = 50;
  const groupPadding_top = 10;
  const rectWidth = 34;
  const rectHeight = 30;
  const rectPadding_x = 10;
  const rectPadding_y = 25;
  const rectsPerRow = 5;

  const container = d3.select("#paperlistContent");
  const containerWidth = container.node().clientWidth;
  const margin = { top: 10, left: 10, right: 4, bottom: 0 };
  const svgWidth = containerWidth - margin.right;

  container.html('');

  chartData.forEach((domainData, domainIndex) => {
    const groupDiv = container.append("div")
      .style("position", "relative");  // 作为定位参照
    const paperCount = domainData.value.length;
    const rows = Math.ceil(paperCount / rectsPerRow);
    const svgHeight = (rectHeight + rectPadding_y + 5) * rows + groupPadding_top;

    const svg = groupDiv.append("svg")
      .attr("width", svgWidth)
      .attr("height", svgHeight);

    groupDiv.append("button")
      .attr("class", "subspace-close")
      .style("position", "absolute")
      .style("top", "6px")
      .style("right", "8px")
      .style("z-index", "10")     // HTML 场景下 z-index 生效
      .text("×")
      .on("click", (e) => {
        e.stopPropagation();
        // TODO: 这里写你的关闭逻辑，比如移除当前分组、清空内容等
        // groupDiv.remove();  // 示例：直接移除该分组
      });

    const defs = svg.append("defs");
    defs.selectAll("pattern")
      .data(domainData.value)
      .enter()
      .append("pattern")
      .attr("id", d => `image-pattern-${d.globalIndex}`)
      .attr("width", 1)
      .attr("height", 1)
      .attr("patternContentUnits", "objectBoundingBox")
      .append("image")
      .attr("xlink:href", d => d.content)
      .attr("width", 1)
      .attr("height", 1)
      .attr("preserveAspectRatio", "xMidYMid slice");

    const rectGroup = svg.append("g").attr("transform", `translate(${groupPadding_left},0)`);

    const paperGroup = rectGroup.selectAll("g.paper-group")
      .data(domainData.value)
      .enter()
      .append("g")
      .attr("class", "paper-group")
      .attr("data-global-index", d => d.globalIndex)
      .attr("transform", (d, i) => {
        const col = i % rectsPerRow;
        const row = Math.floor(i / rectsPerRow);
        const x = col * (rectWidth + rectPadding_x);
        const y = groupPadding_top + row * (rectHeight + rectPadding_y);
        return `translate(${x},${y})`;
      });

    paperGroup.append("rect")
      .attr("rx", 4).attr("ry", 4)
      .attr("width", rectWidth).attr("height", rectHeight)
      .attr("stroke", d => colorScale(d.domain)).attr("stroke-width", 2)
      .style("opacity", 1)
      .attr("fill", d => `url(#image-pattern-${d.globalIndex})`)
      .style("cursor", "pointer")
      .on("mousemove", (event, d) => {
        d3.select("#paperlistTooltip")
          .style("display", "block")
          .style("left", (event.pageX + 10) + "px")
          .style("top", (event.pageY + 10) + "px")
          .html(`<strong>ID:</strong> ${d.id}<br/><strong>Year:</strong> ${d.year}<br/><strong>Count:</strong> ${d.count}`);
      })
      .on("mouseout", () => d3.select("#paperlistTooltip").style("display", "none"))
      .on("click", (event, d) => {
        event.stopPropagation();
        const index = selectedPaperIndexs.indexOf(d.globalIndex);
        if (index > -1) selectedPaperIndexs.splice(index, 1);
        else selectedPaperIndexs.push(d.globalIndex);
        d3.selectAll(".paper-group").style("opacity", (paperData) => {
          if (selectedPaperIndexs.length === 0) return 1;
          return selectedPaperIndexs.includes(paperData.globalIndex) ? 1 : 0.5;
        });
      });

    paperGroup.append("text")
      .attr("text-anchor", "middle").attr("font-size", "8px").attr("fill", "#000")
      .attr("x", rectWidth / 2).attr("y", rectHeight + 10)
      .each(function (d) {
        d3.select(this).append("tspan").attr("x", d3.select(this).attr("x")).attr("dy", 0)
          .text(`ID:${d.id}`);
      });

    paperGroup.append("path")
      .attr("d", eyePathData)
      .attr("transform", `scale(0.5) translate(${rectWidth / 0.5 / 2 - 10}, ${rectHeight / 0.5 + 20})`)
      .style("cursor", "pointer").style("fill", "#D3D3D3")
      .on("click", (event, d) => {
        event.stopPropagation();
        showPdfModal(d.pdfUrl, d.name);
      })
      .on("mouseover", function () { d3.select(this).style("fill", "#007bff"); })
      .on("mouseout", function () { d3.select(this).style("fill", "#D3D3D3"); });

    // 半圆饼图
    const pieinnerRadius = 14, pieouterRadius = 20;
    const pieGroup = svg.append("g").attr("transform", `translate(25, ${groupPadding_top * 4})`);
    const pieData = d3.pie().sort(null).startAngle(-Math.PI/2).endAngle(Math.PI/2)
      .value(d => d)([paperCount, totalPaperCount - paperCount]);
    const arcGenerator = d3.arc().innerRadius(pieinnerRadius).outerRadius(pieouterRadius);
    const arcColors = [colorScale(domainData.domain), "#ddd"];
    pieGroup.selectAll("path").data(pieData).enter().append("path")
      .attr("d", arcGenerator).attr("fill", (d, i) => arcColors[i]);
    const pieText = pieGroup.append("text").attr("text-anchor", "middle").attr("fill", "#000");
    pieText.append("tspan").attr("x", 0).attr("dy", 0).attr("font-size", "10px")
      .text(`${paperCount}/${totalPaperCount}`);
    pieText.append("tspan").attr("x", 0).attr("dy", "1.2em").attr("font-size", "8px")
      .attr("font-weight", "bold").attr("fill", colorScale(domainData.domain))
      .text(domainData.domain);

    if (domainIndex < chartData.length - 1) {
      svg.append("line")
        .attr("x1", 10).attr("y1", svgHeight)
        .attr("x2", svgWidth - 4).attr("y2", svgHeight)
        .attr("stroke", "black").attr("stroke-width", 2).attr("stroke-dasharray", "4 2");
    }
  });

  d3.select("#closeModalBtn").on("click", hidePdfModal);
  d3.select("#modalOverlay").on("click", (event) => {
    if (event.target === d3.select("#modalOverlay").node()) hidePdfModal();
  });
  
}

onMounted(() => {
  drawChart();
  new ResizeObserver(drawChart).observe(chartContainerRef.value);
});

// PDF 预览
function showPdfModal(pdfUrl, pdfName) {
  const modalOverlay = d3.select("#modalOverlay");
  const pdfFrame = d3.select("#pdfFrame");
  const pdfTitle = d3.select("#pdfTitle");
  pdfTitle.text(pdfName);
  pdfFrame.attr("src", pdfUrl);
  modalOverlay.style("display", "flex");
}
function hidePdfModal() {
  const modalOverlay = d3.select("#modalOverlay");
  const pdfFrame = d3.select("#pdfFrame");
  const pdfTitle = d3.select("#pdfTitle");
  pdfFrame.attr("src", "");
  pdfTitle.text("PDF Viewer");
  modalOverlay.style("display", "none");
}

async function onSelectPaper() {
  console.log("Selected Paper Indexs:", selectedPaperIndexs);
  alert("Selected Paper Indexs: " + selectedPaperIndexs.join(", "));
}
async function onClearPaper() {
  selectedPaperIndexs = [];
  d3.selectAll(".paper-group").style("opacity", 1);
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
        <!-- LLM -->
        <div class="cp-block">
          <div class="cp-label-top">LLM</div>
          <select class="cp-input cp-select" v-model="selectedLLM">
            <option v-for="o in llmOptions" :key="o" :value="o">{{ o }}</option>
          </select>
        </div>

        <div class="cp-divider"></div>

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

        <!-- Markdown Parser -->
        <!-- <div class="cp-block">
          <div class="cp-label-top">Markdown Parser</div>
          <select class="cp-input cp-select" v-model="markdownModel">
            <option v-for="m in markdownModelOptions" :key="m" :value="m">{{ m }}</option>
          </select>
        </div> -->

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

    <!-- 2) Paper List -->
    <section class="lp-card">
      <header class="card__title">
        Paper List
        <div class="mv-actions">
          <button class="select-btn" id="SelectBtn" @click="onSelectPaper">Select</button>
          <button class="clear-btn" id="ClearBtn" @click="onClearPaper">Clear</button>
        </div>
      </header>
      <div class="lp-card__body scroll-auto-hide" ref="chartContainerRef"></div>
      <div id="paperlistContent" style="width: 100%; height: 100%; overflow: auto; padding: 2px;"></div>

      <div id="modalOverlay">
        <div id="pdfModal">
          <span id="closeModalBtn">&times;</span>
          <h3 id="pdfTitle">PDF Viewer</h3>
          <iframe id="pdfFrame"></iframe>
        </div>
      </div>
      <div id="paperlistTooltip"></div>
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
  padding: 8px 10px;
  overflow: auto;
  min-height: 0;
  border-bottom-left-radius: var(--r);
  border-bottom-right-radius: var(--r);
  background-clip: padding-box;
}

/* —— Chat —— */
.lp-chat {
  display: grid;
  grid-template-rows: auto 1fr auto; /* 头 / 消息 / 输入条 */
  overflow: hidden;
}
.lp-msgs {
  padding: 10px 2px;
  overflow: auto;
  min-height: 0;
  display: flex;
  flex-direction: column;
  gap: 8px;
  scrollbar-gutter: stable both-edges;
  scrollbar-width: thin;
  scrollbar-color: transparent transparent;
}
.lp-msgs::-webkit-scrollbar { width: 8px; height: 8px; }
.lp-msgs::-webkit-scrollbar-thumb { background: transparent; border-radius: 4px; }
.lp-msgs::-webkit-scrollbar-track { background: transparent; }
.lp-msgs:hover { scrollbar-color: rgba(0, 0, 0, .25) transparent; }
.lp-msgs:hover::-webkit-scrollbar-thumb { background: rgba(0, 0, 0, .25); }

/* 气泡 */
.msg { display: flex; }
.msg.user { justify-content: flex-end; }
.msg .msg-bubble {
  max-width: 90%;
  padding: 8px 10px;
  border-radius: 10px;
  font-size: 11px;
  background: #f3f4f6;
}
.msg.user .msg-bubble { background: #111; color: #fff; }

/* Paper List 右上操作按钮 */
.mv-actions {
  display: flex; align-items: center; gap: 8px; float: right;
}

/* PDF 模态 */
#modalOverlay {
  position: fixed; top: 0; left: 0; width: 100%; height: 100%;
  background: rgba(0, 0, 0, 0.5); display: none;
  justify-content: center; align-items: center; z-index: 10000;
}
#pdfModal {
  background: white; padding: 20px; border-radius: 8px;
  box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
  width: 80%; max-width: 800px; height: 80%;
  position: relative; display: flex; flex-direction: column; z-index: 9999;
}
#pdfModal iframe { flex-grow: 1; border: none; z-index: 9999; }
#closeModalBtn {
  position: absolute; top: 15px; right: 15px; font-size: 24px;
  cursor: pointer; color: #333; z-index: 10001;
}

/* Tooltip */
#paperlistTooltip {
  position: absolute; background: rgba(0, 0, 0, 0.7); color: white;
  padding: 4px 8px; border-radius: 4px; font-size: 12px;
  pointer-events: none; display: none;
}

/* ===== Control Panel 紧凑版样式 ===== */
.cp-stack{
  display: flex;
  flex-direction: column;
  gap: 6px; /* 缩小间距 */
}

.cp-block{
  display: flex;
  flex-direction: column;
  gap: 4px; /* 缩小 gap */
}

.cp-label-top{
  font-size: 11px;       /* 缩小字体 */
  color: #444;
  font-weight: 500;      /* 字重轻一点 */
}

.cp-input{
  width: 100%;
  box-sizing: border-box;
  font-size: 11px;       /* 输入框文字更小 */
}

/* 下拉框 */
.cp-select{
  padding: 6px 8px;      /* 减少 padding */
  border: 1px solid #e5e7eb;
  border-radius: 6px;
  background: #fff;
  font-size: 11px;
}

/* 文本域 */
.cp-textarea{
  min-height: 90px;      /* 高度降低 */
  font-size: 9px;
  line-height: 1.4;
  padding: 6px 8px;
  border: 1px solid #e5e7eb;
  border-radius: 6px;
  resize: vertical;
}

/* 上传文件框 */
.cp-file-input{
  font-size: 11px;
  padding: 6px 8px;
  border: 1px dashed #e5e7eb;
  border-radius: 6px;
  background: #fafafa;
}

/* 文件 tag */
.cp-file{
  font-size: 10px;
  padding: 2px 6px;
  background: #f3f4f6;
  border: 1px solid #e5e7eb;
  border-radius: 5px;
}

/* 滑动条部分 */
.cp-slider{
  display: inline-flex;
  align-items: center;
  gap: 6px;
  width: 100%;
}
.cp-slider input[type="range"]{ flex: 1 1 auto; }
.cp-number{
  width: 60px;
  font-size: 11px;
  padding: 4px 6px;
  border: 1px solid #e5e7eb;
  border-radius: 6px;
  text-align: right;
}
.cp-unit{
  font-size: 11px;
  color: #666;
  min-width: 16px;
}

/* hint 文字更小 */
.cp-hint{
  font-size: 10px;
  color: #777;
  margin-top: 2px;
}

/* 分隔线 */
.cp-divider{
  width: 100%;
  border-bottom: 1px dashed #ddd; /* 细一点 */
  margin: 4px 0;
}


/* 小屏：保持良好可读性 */
@media (max-width: 1200px){
  .cp-textarea{ min-height: 100px; }
}

.subspace-close{
  width: 20px;
  height: 20px;
  line-height: 18px;
  text-align: center;
  border: 1px solid #ddd;
  border-radius: 50%;
  background: #fff;
  cursor: pointer;
  font-size: 14px;
  padding: 0;
  box-shadow: 0 1px 2px rgba(0,0,0,.08);
}
.subspace-close:hover{
  background:#f5f5f5;
}
</style>

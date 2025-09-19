// useLinkCard.js
import * as d3 from 'd3';
import { onRightHover, emitRightHover } from './rightHoverBus'

const STYLE = {
  H: 30,
  PADX: 10, PADY: 6,
  HEX_R: 10,
  DX: 52,
  COLOR_TEXT: '#DCDCDC',
  COLOR_IMAGE: '#DCDCDC',
  COLOR_DEFAULT: '#ffffff',
  ROAD:   { stroke:'#e9c46b', width:1.4, dash:null,  opacity:0.95 },
  RIVER:  { stroke:'#8fbadf', width:1.4, dash:null,  opacity:0.95 },
  FLIGHT: { stroke:'#4a5f7e', width:1.4, dash:'4,4', opacity:0.95 },
  CITY: { r: 2.6, fill: '#ffffff', capitalInnerFill: '#000000', stroke: '#777777', strokeWidth: 1.0 },
  HOVER_DIM: 0.25,        // 保留，当前不用于 hover 衰减
  SELECT_DIM: 0.10        // ★ 选中时非当前节点的衰减系数

};

const hexPathD = (r) => {
  const a = Math.PI/3;
  const pts = d3.range(6).map(i => [r*Math.cos(a*i), r*Math.sin(a*i)]);
  return d3.line()(pts.concat([pts[0]]));
};
const styleOfLink = (t) => (t === 'flight' ? STYLE.FLIGHT : (t === 'river' ? STYLE.RIVER : STYLE.ROAD));
const idOf = (p, q, r) => `${p}:${q},${r}`;

/** 兼容 Map / 对象，并且容忍数字/字符串键 */
function pick(mapLike, key) {
  if (!mapLike) return null;
  const k1 = key;
  const k2 = String(key);
  if (mapLike instanceof Map) return mapLike.get(k1) ?? mapLike.get(k2) ?? null;
  if (typeof mapLike === 'object') return (mapLike[k1] ?? mapLike[k2] ?? null);
  return null;
}

// 同时兼容 "panelIdx:q,r" 与 "panelIdx|q,r"
function pickAlpha(mapLike, id) {
  if (!mapLike) return null;
  const candidates = [id];
  // 形如 "1:0,-4" ↔ "1|0,-4"
  if (typeof id === 'string') {
    if (id.includes(':')) candidates.push(id.replace(':', '|'));
    if (id.includes('|')) candidates.push(id.replace('|', ':'));
  }
  for (const k of candidates) {
    if (mapLike instanceof Map) {
      if (mapLike.has(k)) return mapLike.get(k);
      if (mapLike.has(String(k))) return mapLike.get(String(k));
    } else if (typeof mapLike === 'object') {
      if (k in mapLike) return mapLike[k];
      if (String(k) in mapLike) return mapLike[String(k)];
    }
  }
  return null;
}


/** 节点着色：先 panel+country 覆盖 → 再全局 country → 最后 modality 回退 */
function resolveNodeColor(
  n,
  { colorByCountry, colorByPanelCountry, normalizeCountryId = (x)=>x, fillByNode = null } = {}
) {
  if (!n) return STYLE.COLOR_DEFAULT;
  // ★ 优先：逐节点覆盖（Alt 冲突上色）
  const nodeKey = `${n.panelIdx}:${n.q},${n.r}`;
  const nodeFill = pick(fillByNode, nodeKey);
  if (nodeFill) return nodeFill;
  const cidRaw = n.country_id;
  const cid = (cidRaw == null) ? null : normalizeCountryId(cidRaw);

  if (cid != null && Number.isInteger(n.panelIdx)) {
    const k = `${n.panelIdx}|${cid}`;
    const p = pick(colorByPanelCountry, k);
    if (p) return p;
  }
  if (cid != null) {
    const g = pick(colorByCountry, cid);
    if (g) return g;
  }
  return n.modality === 'text' ? STYLE.COLOR_TEXT
       : n.modality === 'image' ? STYLE.COLOR_IMAGE
       : STYLE.COLOR_DEFAULT;
}

/** 统计起点次数（city/capital 用） */
export function buildStartCountMap(links = []) {
  const m = new Map();
  for (const l of (links || [])) {
    if (!l || l.type === 'single') continue;
    const path = Array.isArray(l.path) ? l.path : [];
    if (!path.length) continue;
    const p0 = path[0];
    const key = idOf(p0.panelIdx, p0.q, p0.r);
    m.set(key, (m.get(key) || 0) + 1);
  }
  return m;
}

function drawCityOrCapital(g, count) {
  if (!count || count < 1) return;
  const { r, fill, capitalInnerFill, stroke, strokeWidth } = STYLE.CITY;
  if (count === 1) {
    g.append('circle').attr('class','city').attr('r',r)
      .attr('fill',fill).attr('stroke',stroke).attr('stroke-width',strokeWidth)
      .attr('vector-effect','non-scaling-stroke').style('pointer-events','none');
  } else {
    const outer = r * 1.4, inner = r * 0.85;
    g.append('circle').attr('class','city capital-outer').attr('r',outer)
      .attr('fill',fill).attr('stroke',stroke).attr('stroke-width',strokeWidth)
      .attr('vector-effect','non-scaling-stroke').style('pointer-events','none');
    g.append('circle').attr('class','city capital-inner').attr('r',inner)
      .attr('fill',capitalInnerFill).attr('stroke',stroke).attr('stroke-width',strokeWidth)
      .attr('vector-effect','non-scaling-stroke').style('pointer-events','none');
  }
}

/**
 * 迷你预览（右卡片）
 * 新增支持：
 *   - alphaByNode: Map|Object，key 形如 "panelIdx:q,r"，值是 0~1
 *   - defaultAlpha: number，未命中时使用（默认 1）
 */
export function mountMiniLink(
  svgEl,
  {
    link,
    nodes = [],
    startCountMap = new Map(),
    colorByCountry = null,
    colorByPanelCountry = null,
    normalizeCountryId = (x)=>x,
    alphaByNode = null,              // ★ NEW
    defaultAlpha = 1,                 // ★ NEW
    borderColorByNode = null,   // ★ 新增：逐节点边框色
    borderWidthByNode = null,   // ★ 新增：逐节点边框宽
    fillByNode = null,          // ★ 新增：逐节点填充色（Alt 冲突）
    onPick = null,              // ★ 新增：点击回调，参数为 "panelIdx:q,r" 或 null
    pickedId = null            // ★ NEW: 外部可同步选中 id（"panelIdx:q,r"）
  }
) {
  const svg = d3.select(svgEl);
  const hexD = hexPathD(STYLE.HEX_R);
  let offHover = null;
  let hoveredId = null;
  let selectedId = pickedId || null;   // ★ NEW: 内部选中状态
  let visibleIds = new Set();          // ★ NEW: 本卡可见节点 id

  const baseAlphaOf = (id) => {
    const v = pickAlpha(alphaByNode, id);
    if (typeof v === 'number' && v >= 0 && v <= 1) return v;
    return (defaultAlpha != null) ? defaultAlpha : 1;
  };

  function applyHover(id) {
    if (selectedId) return; // 选中时忽略 hover 透明度变化
    hoveredId = (id && visibleIds.has(id)) ? id : null;

    const nodesSel = svg.selectAll('g.node');
    nodesSel.classed('hovered', d => !!hoveredId && d._id === hoveredId);

    if (hoveredId) svg.select('.nodes-layer').raise();
    else svg.select('.links-layer').raise();
  }

  function applyPicked() {
    const nodesSel = svg.selectAll('g.nodes-layer g.node');
    const hasPick = !!selectedId;

    nodesSel
      .classed('picked', d => hasPick && d._id === selectedId)
      .each(function(d) {
        const sel  = d3.select(this);
        const base = baseAlphaOf(d._id);
        const hex  = sel.select('path.hex');
        const city = sel.select('.city-wrap');

        if (!hasPick || d._id === selectedId) {
          // 初始/恢复 或 选中本节点
          hex.attr('fill-opacity', base)
            .attr('stroke-opacity', 1);
          city.attr('opacity', 1);
        } else {
          // 非选中
          hex.attr('fill-opacity', base * 0.1)
            .attr('stroke-opacity', 0.1);
          city.attr('opacity', 0.1);
        }
      });
  }

  function render({
    link, nodes, startCountMap,
    colorByCountry, colorByPanelCountry, normalizeCountryId,
    alphaByNode, defaultAlpha
  }) {
    svg.selectAll('*').remove();

    const path = Array.isArray(link?.path) ? link.path : [];
    if (!path.length) { svg.attr('width', 0).attr('height', STYLE.H); return; }

    const isSingleCard = (link?.type === 'single') || (path.length < 2);

    const innerH = STYLE.H - 2 * STYLE.PADY;
    const yMid = Math.round(STYLE.PADY + innerH / 2) + 0.5;
    const coords = path.map((p, i) => ({
      ...p, x: STYLE.PADX + i * STYLE.DX, y: yMid, _id: idOf(p.panelIdx, p.q, p.r)
    }));
    // 记录当前卡片内的节点 id
    visibleIds = new Set(coords.map(d => d._id));

    const lastX = coords[coords.length - 1].x;
    const contentW = lastX + STYLE.PADX + STYLE.HEX_R * 1.2;
    svg.attr('width', contentW).attr('height', STYLE.H);

    const g = svg.append('g');
    const gNodes = g.append('g').attr('class', 'nodes-layer'); // 先画节点层（在下）
    const gLinks = g.append('g').attr('class', 'links-layer'); // 再画连线路层（在上）

    const nodeMap = new Map(nodes.map(n => [idOf(n.panelIdx, n.q, n.r), n]));

    gNodes.selectAll('g.node')
      .data(coords, d => d._id)
      .join(enter => {
        // enter:
        const gg = enter.append('g')
          .attr('class', 'node')
          .attr('data-id', d => d._id)
          .attr('transform', d => `translate(${d.x},${d.y})`)
          .style('cursor', 'pointer');

        gg.append('path')
          .attr('class', 'hex')
          .attr('d', hexD)
          .attr('fill', d => resolveNodeColor(nodeMap.get(d._id), { colorByCountry, colorByPanelCountry, normalizeCountryId, fillByNode }))
          .attr('fill-opacity', d => baseAlphaOf(d._id))   // ← 只给填充套外部透明度
          .attr('stroke', d => pick(borderColorByNode, d._id) || '#ffffff')
          .attr('stroke-opacity', 1)                        // ← 描边固定为 1（不被整体 opacity 影响）
          .attr('stroke-width', d => {
            const w = pick(borderWidthByNode, d._id);
            return (Number.isFinite(w) ? w : 1);
          });

        gg.append('g')
          .attr('class', 'city-wrap')
          .each(function(d){
            const count = isSingleCard ? 0 : (startCountMap.get(d._id) || 0);
            drawCityOrCapital(d3.select(this), count);
          })
          .attr('opacity', 1);                               // ← city 默认 1


        gg.on('mouseenter', (_, d) => {
             emitRightHover(d._id);
             // ★ 有选中时，hover 不改变视觉（仅发事件/联动）
             if (!selectedId) applyHover(d._id);
           })
           .on('mouseleave', () => {
             emitRightHover(null);
             if (!selectedId) applyHover(null);
           })

           // ★ 新增：点击该 HSU → 通知外部筛选该节点
           .on('click', (evt, d) => {
             evt.stopPropagation();
             selectedId = d._id;
             applyPicked();
             if (typeof onPick === 'function') onPick(d._id);
           });

        return gg;
      });

    const s = styleOfLink(link?.type);
    gLinks.append('polyline')
      .attr('points', coords.map(d => `${d.x},${d.y}`).join(' '))
      .attr('fill', 'none').attr('stroke', s.stroke)
      .attr('stroke-width', s.width).attr('stroke-opacity', s.opacity)
      .attr('stroke-dasharray', s.dash)
      .style('pointer-events','none'); // ★ 让背景能接收到 click，用于“清除筛选”
 
      // ★ 背景点击 = 清除筛选（恢复显示全部 MSU）
      svg.on('click', () => {
       selectedId = null;
       if (typeof onPick === 'function') onPick(null);
       // 清除后恢复 hover 样式/默认透明度
       applyHover(null);
       applyPicked();

      });
      // 初始渲染：若有选中则应用选中样式；否则按 hover 恢复
      if (selectedId) applyPicked();
      else applyHover(hoveredId);
  }

  render({
    link, nodes, startCountMap,
    colorByCountry, colorByPanelCountry, normalizeCountryId,
    alphaByNode, defaultAlpha
  });
  offHover = onRightHover(applyHover);

  return {
    update(next) {
       // 外部可同步选中的 pickedId
       if (next && Object.prototype.hasOwnProperty.call(next, 'pickedId')) {
         selectedId = next.pickedId || null;
       }

       if (next && Object.prototype.hasOwnProperty.call(next, 'onPick')) {
         onPick = next.onPick;
       }
       // 覆盖闭包变量（render 里直接用到这些闭包变量）
       if (next && Object.prototype.hasOwnProperty.call(next, 'fillByNode')) {
         fillByNode = next.fillByNode;
       }
       if (next && Object.prototype.hasOwnProperty.call(next, 'borderColorByNode')) {
         borderColorByNode = next.borderColorByNode;
       }
       if (next && Object.prototype.hasOwnProperty.call(next, 'borderWidthByNode')) {
         borderWidthByNode = next.borderWidthByNode;
       }
       if (next && Object.prototype.hasOwnProperty.call(next, 'alphaByNode')) {
         alphaByNode = next.alphaByNode;
       }
       if (next && Object.prototype.hasOwnProperty.call(next, 'defaultAlpha')) {
         defaultAlpha = next.defaultAlpha;
       }
       if (next && Object.prototype.hasOwnProperty.call(next, 'colorByCountry')) {
         colorByCountry = next.colorByCountry;
       }
       if (next && Object.prototype.hasOwnProperty.call(next, 'colorByPanelCountry')) {
         colorByPanelCountry = next.colorByPanelCountry;
       }
       if (next && Object.prototype.hasOwnProperty.call(next, 'normalizeCountryId')) {
         normalizeCountryId = next.normalizeCountryId;
       }
 
       render({
         link: next?.link ?? link,
         nodes: next?.nodes ?? nodes,
         startCountMap: next?.startCountMap ?? startCountMap,
         colorByCountry,
         colorByPanelCountry,
         normalizeCountryId,
         alphaByNode,
         defaultAlpha
       });
      // 更新后应用一次选中样式
      applyPicked();
    },
    destroy() { offHover && offHover(); }
  };
}


/* === Random color helpers (top-level, guaranteed) === */
// var COLOR_PALETTE = (typeof COLOR_PALETTE !== 'undefined' && COLOR_PALETTE) ? COLOR_PALETTE : [
//   '#A9D08D', '#FFD966', '#9DC3E6', '#F4B183', '#C9B5F4',
//   '#F8CBAD', '#B7DEE8', '#C6E0B4', '#FFE699', '#BDD7EE',
//   '#C5E0B3', '#D9E1F2', '#E2F0D9', '#FCE4D6', '#EAD1DC'
// ];
var COLOR_PALETTE = (typeof COLOR_PALETTE !== 'undefined' && COLOR_PALETTE) ? COLOR_PALETTE : [
  '#8CBF75', // 柔和草绿 (科技感的绿色)
  '#E5C45A', // 稳重金黄，避免过亮
  '#6FA8DC', // 中等饱和度的蓝色
  '#D99970', // 柔和橙色，不刺眼
  '#9A7FCC', // 中性色调的紫色
  '#E9A08D', // 柔和砖红，避免太浅
  '#76C2C7', // 稳定青蓝
  '#A6D785', // 温和浅绿
  '#F2D16B', // 柔和琥珀色
  '#89B4E0', // 低饱和度天蓝
  '#93B96F', // 稳重军绿色
  '#A7BCE3', // 中灰蓝，适合论文插图
  '#B9D8B1', // 清爽浅绿
  '#E4B7B3', // 柔和粉红
  '#C090A6'  // 稳定紫红
];


var pickRandomColor = (typeof pickRandomColor === 'function') ? pickRandomColor : function(seedStr){
  var arr = COLOR_PALETTE; if (!arr || !arr.length) return '#A9D08D';
  if (seedStr) {
    var h = 0; for (var i = 0; i < seedStr.length; i++) h = (h * 33 + seedStr.charCodeAt(i)) | 0;
    return arr[Math.abs(h) % arr.length];
  }
  return arr[Math.floor(Math.random() * arr.length)];
};
try { if (typeof App !== 'undefined' && App) { App.pickRandomColor = pickRandomColor; } } catch(_) {}
/* === End random color helpers === */
// src/lib/semanticMap.js
import * as d3 from 'd3';

/* =========================
 * 样式与常量（集中）
 * ========================= */
const STYLE = {
  CONFLICT_GRAY: '#B0B0B0',
  HEX_RADIUS: 16,
  HEX_BORDER_WIDTH: 1.2,
  HEX_BORDER_COLOR: '#ffffff',
  // HEX_FILL_TEXT: '#a9d08d',
  // HEX_FILL_IMAGE: '#a6cee3',
  HEX_FILL_TEXT: '#DCDCDC',
  HEX_FILL_IMAGE: '#DCDCDC',
  HEX_FILL_DEFAULT: '#ffffff',

  OPACITY_DEFAULT: 0.2,
  OPACITY_HOVER: 1.0,
  OPACITY_SELECTED: 1.0,
  OPACITY_NEIGHBOR: 0.6,
  OPACITY_PREVIEW: 0.5,      // 预览（待选）态透明度
  HATCH_ID: 'preview-hatch', // 预览斜线填充的 <pattern> id

  // --- ALT（国家预览）态 ---
  OPACITY_ALT_ACTIVE: 0.95,     // 当前国家的格子
  OPACITY_ALT_OTHER:  0.08,     // 其它国家/无归属格子
  BORDER_ALT_ACTIVE:  0.95,     // 当前国家的边界线透明度
  BORDER_ALT_OTHER:   0,      // 其它国家的边界线透明度（含虚线）

  CITY_RADIUS: 3.5,
  CITY_BORDER_WIDTH: 1.2,
  CITY_FILL: '#ffffff',     // 城市填充：白色
  CAPITAL_FILL: '#000',     // 首都内圆：黑色
  CITY_BORDER_COLOR: '#777777',

  FLIGHT_COLOR: '#4a5f7e',
  FLIGHT_WIDTH: 1.2,
  FLIGHT_OPACITY: 0.98,
  FLIGHT_DASH: '3,2',
  FLIGHT_CONTROL_RATIO: 0.18,
  FLIGHT_TEMP_WIDTH: 2,
  FLIGHT_TEMP_OPACITY: 0.55,
  FLIGHT_TEMP_DASH: '8,6',

  ROAD_COLOR: '#e9c46b',
  ROAD_WIDTH: 1.2,
  ROAD_OPACITY: 0.88,
  ROAD_DASH: null,

  RIVER_COLOR: '#e9c46b',
  // RIVER_COLOR: '#a6cee3',
  RIVER_WIDTH: 1.2,
  RIVER_OPACITY: 0.88,
  RIVER_DASH: null,

  COUNTRY_BORDER_COLOR: '#292929ff',
  COUNTRY_BORDER_WIDTH: 1,
  COUNTRY_BORDER_DASH: "2,1",

  PLAYGROUND_PADDING: 12,
  CLICK_DELAY: 350,

  SUBSPACE_MIN_W: 360,
  SUBSPACE_MIN_H: 400,
  SUBSPACE_GAP: 20,
  SUBSPACE_DEFAULT_LEFT: 30,
  SUBSPACE_DEFAULT_TOP: 30,
  
   // --- preview 透明度 ---
  OPACITY_PREVIEW_CENTER: 0.85,   // 鼠标所在 hex（中心）
  OPACITY_PREVIEW_NEIGHBOR: 0.7,  // 与中心点“有关系”的预览邻居
  OPACITY_ALT_FADE: 0.08,   // Alt 国家聚焦时：非该国家的 hex 统一降到这层透明度

  // --- 斜线阴影样式 ---
  HATCH_SPACING: 5,               // 斜线间距（px）
  HATCH_STROKE: '#000',           // 斜线颜色（可依据主题调）
  HATCH_STROKE_WIDTH: 0.8,          // 斜线粗细
  HATCH_OPACITY: 0.6,            // 斜线透明度
  HATCH_ANGLE: 45,                // 斜线角度（度）

  FOCUS_COUNTRY_FILL: '#FCFCFC',   // Alt 聚焦国家的统一填充色（不区分 modality）
  OPACITY_NONFOCUS: 0.08,          // Alt 聚焦时，非该国家 hex 的压暗透明度

  // MSU → 透明度映射区间（数值越高越透明）
  OPACITY_MSU_MIN: 0.15,  // msuCount = max 时用（最透明）
  OPACITY_MSU_MAX: 0.95,  // msuCount = 0  时用（最不透明）
  // 高亮透明度“加成”而不是绝对值：final = base + (1-base)*boost
  OVERLAY_ALPHA_BOOST: {
    hover: 0.15,          // 悬停 / 航线起点/hover
    previewCenter: 0.12,  // 预览中心
    previewNeighbor: 0.08,// 预览邻居
    selected: 0.20        // 选中（无覆盖色时）
  },

};

// src/lib/semanticMap.js（在 STYLE 下方添加）
const LAYOUT = {
  TARGET_COLS: 3,          // 目标列数（默认 3）
  MAX_COLS: 5,             // 大屏最多 4 列（可按需改）
  MIN_COLS: 1,
  GAP: 20,                 // 卡片间距，沿用你已有的 SUBSPACE_GAP 也可
  PAD_H: 12,               // playground 水平内边距
  ASPECT: 0.72,            // 高/宽，决定子空间纵横比（可调 0.7~0.8）
  MIN_W: STYLE.SUBSPACE_MIN_W,
  MIN_H: STYLE.SUBSPACE_MIN_H,
};


/* =========================
 * 初始化入口
 * ========================= */
export async function initSemanticMap({
  outerEl,
  playgroundEl,
  globalOverlayEl,
  mainTitleEl,
  initialData
}) {
  playgroundEl = playgroundEl || document.getElementById('playground');
  globalOverlayEl = globalOverlayEl || document.getElementById('global-overlay');
  if (!playgroundEl || !globalOverlayEl) {
    throw new Error('[semanticMap] playgroundEl/globalOverlayEl is missing.');
  }

  /* =========================
   * App 状态
   * ========================= */
  const App = {
    config: {
      hex: {
        radius: STYLE.HEX_RADIUS,
        fillOpacity: STYLE.OPACITY_DEFAULT,
        altOtherOpacity: STYLE.OPACITY_ALT_OTHER,
        borderWidth: STYLE.HEX_BORDER_WIDTH,
        borderColor: STYLE.HEX_BORDER_COLOR,
        textFill: STYLE.HEX_FILL_TEXT,
        imageFill: STYLE.HEX_FILL_IMAGE,
        zIndex: 1,
        borderDash: STYLE.COUNTRY_BORDER_DASH,
      },
      city: {
        radius: STYLE.CITY_RADIUS,
        borderWidth: STYLE.CITY_BORDER_WIDTH,
        fill: STYLE.CITY_FILL,
        capitalFill: STYLE.CAPITAL_FILL,
        borderColor: STYLE.CITY_BORDER_COLOR,
        zIndex: 3,
      },
      flight: {
        color: STYLE.FLIGHT_COLOR,
        width: STYLE.FLIGHT_WIDTH,
        opacity: STYLE.FLIGHT_OPACITY,
        dash: STYLE.FLIGHT_DASH,
        tempWidth: STYLE.FLIGHT_TEMP_WIDTH,
        tempOpacity: STYLE.FLIGHT_TEMP_OPACITY,
        tempDash: STYLE.FLIGHT_TEMP_DASH,
        zIndex: 100,
        controlCurveRatio: STYLE.FLIGHT_CONTROL_RATIO,
      },
      road:  { color: STYLE.ROAD_COLOR,  width: STYLE.ROAD_WIDTH,  opacity: STYLE.ROAD_OPACITY,  dash: STYLE.ROAD_DASH,  zIndex: 2 },
      river: { color: STYLE.RIVER_COLOR, width: STYLE.RIVER_WIDTH, opacity: STYLE.RIVER_OPACITY, dash: STYLE.RIVER_DASH, zIndex: 2 },
      countryBorder: { color: STYLE.COUNTRY_BORDER_COLOR, width: STYLE.COUNTRY_BORDER_WIDTH },
      background: STYLE.HEX_FILL_DEFAULT,
      playground: { padding: STYLE.PLAYGROUND_PADDING },
    },

    // 渲染缓存
    subspaceSvgs: [],
    overlaySvgs: [],
    hexMapsByPanel: [],
    hexBucketsByPanel: [],
    allHexDataByPanel: [],
    zoomStates: [],
    panelStates: [],

    // 交互状态
    _lastLinks: [],
    currentMouse: { x: 0, y: 0 },
    selectedHex: null,
    lastSelectionKind: null, // 'conflict' | 'group' | 'route' | 'connect' | null

    neighborKeySet: new Set(),
    flightStart: null,
    flightHoverTarget: null,
    hoveredHex: null,
    highlightedHexKeys: new Set(),  // ★ NEW：仅用于 hover 预览
    _clickTimer: null,
    _awaitingSingle: false,   // ★ NEW：是否在等待触发单击处理
    _lastClickAt: 0,          // ★ NEW：最近一次 click 的时间戳（非必须，但留作需要）
    insertMode: null, 
    uiPref: {
      route: false,          // 按钮想保持“Route Select 绿色”
      connectArmed: false,   // 按钮想保持“Connect 黄色（armed）”
    },
    //程序性布局/尺寸调整时，静默 RO 标记
    _squelchResize: false,
    // 选中与快照
    persistentHexKeys: new Set(),
    excludedHexKeys: new Set(),
    selectedRouteIds: new Set(),
    selectedEdgeKeys: new Set(),  // NEW: selected single-edge set (undirected keys)   // ★ 新增：当前被选中的“整条线路”的 id 集合（统计 road/river/flight）
    modKeys: { ctrl: false, meta: false, shift: false, alt: false },
    _isConfirmingAltColor: false,
    _lastSnapshot: null,
    activeAltCountry: null,

    // 每个 panel 的 { country_id -> Set<"panel|q,r"> }
    countryKeysByPanel: [],

    // 回调 & 容器
    onSubspaceRename: null,
    onMainTitleRename: null,
    // ★ FIX: 点击 hex 时把完整 MSU 数据抛给上层（可选）
    onHexClick: null,
    playgroundEl,
    globalOverlayEl,

    // 数据
    currentData: null,
    countryKeysGlobal: new Map(),   // ★ 新增：全局 { country_id -> Set("panel|q,r") }
    focusCountryId: null,   // ★ 当前 Alt 高亮的国家（跨面板生效）
    focusMode: 'filled',      // ★ 新增：'filled' | 'outline'

    // —— Alt 聚焦隔离 & 面板级聚焦覆盖 —— //
    altIsolatedPanels: new Set(),     // 被隔离 Alt 聚焦的面板索引集合（复制面板会加入）
    panelFocusOverrides: new Map(),   // panelIdx -> { countryId, mode: 'filled'|'outline' }

    // ★ 新增：全局（跨子空间）国家颜色表 + 开关
    globalCountryColors: new Map(),  // Map<normalizedCountryId, "#RRGGBB">
    syncCountryColorAcrossPanels: true, // 打开后，任何一次给某国设色，会同步到全部子空间

    
    routeDraft: null,

  };

  const cleanupFns = [];

  /* =========================
   * 小工具
   * ========================= */
  const pkey = (panelIdx, q, r) => `${panelIdx}|${q},${r}`;
  // const pointId = (panelIdx, q, r) => `${panelIdx}:${q},${r}`;
  const isCtrlLike = (e) => !!(e.metaKey || e.ctrlKey);

  const styleOf = (t) =>
    (t === 'flight') ? App.config.flight
    : (t === 'river') ? App.config.river
    : App.config.road;

  const getHexFillColor = (d) =>
    d.modality === 'text'   ? App.config.hex.textFill
    : d.modality === 'image'? App.config.hex.imageFill
    : App.config.background;

  const hexPoints = (radius) => {
    const angle = Math.PI / 3;
    return d3.range(6).map(i => [radius * Math.cos(angle * i), radius * Math.sin(angle * i)])
      .concat([[radius, 0]]);
  };

  // === Only reset points (do NOT touch country boundaries/focus/colors) ===
  function resetSubspacePoints(panelIdx) {
    // panel-scoped removal from a Set of "panel|q,r" keys
    const dropKeysOfPanel = (set) => {
      if (!set || typeof set.forEach !== 'function') return;
      const toDel = [];
      set.forEach((k) => {
        const s = String(k);
        const p = s.split('|')[0];
        if (p === panelIdx) toDel.push(k);
      });
      toDel.forEach(k => set.delete(k));
    };

    // Clear point-related transient states
    App.hoveredHex = null;
    App.flightHoverTarget = null;
    dropKeysOfPanel(App.highlightedHexKeys);
    dropKeysOfPanel(App.persistentHexKeys);
    dropKeysOfPanel(App.excludedHexKeys);

    // Do NOT clear country focus / colors / country layers here.
    // Just refresh styles to reflect point reset.
    if (typeof updateHexStyles === 'function') {
      updateHexStyles();
    }
  }

    // ---- helpers: country keys / conflict keys 统一出口 ----
  function getConflictKeysForCountry(panelIdx, countryId) {
    const cid = normalizeCountryId(countryId);
    const conflicts = App.conflictHexKeysByPanel?.[panelIdx]; // 假设已存在的结构：Map<stringCountryId, Set<hexKey>> 或等价
    if (!conflicts || !conflicts.get) return new Set();
    return new Set(conflicts.get(cid) || []);
  }
 
  // 约定：includeConflicts = true 用于 Hover 预览；false 用于 Click 应用/上色
  function getCountryKeysFiltered(panelIdx, countryId, includeConflicts = false) {
    const cid = normalizeCountryId(countryId);
    const allKeys = new Set(getCountryKeysInPanel(panelIdx, cid)); // 你原有函数，返回该面板该国家的全量 hexKey
    if (includeConflicts) return allKeys;
    const conflictKeys = getConflictKeysForCountry(panelIdx, cid);
    // 差集：去掉冲突区
    conflictKeys.forEach(k => allKeys.delete(k));
    return allKeys;
  }

  // === helpers for click payload (full multi-country data) ===
  function ensureBucketFor(panelIdx, q, r, d) {
    const b = (typeof getBucket === 'function') ? getBucket(panelIdx, q, r) : null;
    if (b && Array.isArray(b.items)) return b;
    const one = (App.hexMapsByPanel && App.hexMapsByPanel[panelIdx] && App.hexMapsByPanel[panelIdx].get(`${q},${r}`)) || d || {};
    let cid = '—'; try { cid = normalizeCountryId(one && one.country_id ? one.country_id : '—'); } catch(e) {}
    const set = new Set(); if (cid && cid !== '—') set.add(cid);
    const msuCount = (one && Array.isArray(one.msu_ids)) ? one.msu_ids.length : 0;
    return { panelIdx, q, r, items: [one], countries: set, msuCount, _cycleIdx: 0 };
  }
  
  function bucketGroupsFor(panelIdx, q, r) {
    const b = (typeof getBucket === 'function') ? getBucket(panelIdx, q, r) : null;
    const out = new Map();
    if (!b) return out;
    (b.items || []).forEach(it => {
      const cid = normalizeCountryId(it && it.country_id ? it.country_id : '—');
      if (!out.has(cid)) out.set(cid, { country_id: cid, items: [], msu_ids: [] });
      const g = out.get(cid);
      g.items.push(it);
      if (Array.isArray(it.msu_ids)) g.msu_ids.push(...it.msu_ids);
    });
    return out;
  }
  
function emitHexClick(panelIdx, q, r, d) {
  try {
    // 1) 统一拿整格 bucket（若没有就包成单格 bucket）
    const bucket = ensureBucketFor(panelIdx, q, r, d);
    // 2) 按国家分组
    const groupsMap = bucketGroupsFor(panelIdx, q, r);
    const groups = Array.from(groupsMap.entries()).map(([cid, g]) => ({
      country_id: cid,
      items: g.items,
      msu_ids: g.msu_ids,
      msu: (typeof resolveMSUs === 'function')
            ? resolveMSUs(g.msu_ids || [])
            : (g.msu_ids || [])
    }));
    // 3) 兼容字段（所有组的并集）
    const all_msu_ids = groups.flatMap(x => x.msu_ids || []);
    const all_msu = (typeof resolveMSUs === 'function') ? resolveMSUs(all_msu_ids) : all_msu_ids;

    const payload = { panelIdx, q, r, bucket, groups, all_msu_ids, all_msu, raw: d };

    // 优先走外部钩子
    if (typeof App?.onHexClick === 'function') {
      App.onHexClick(payload);
    }
    // 同时抛一个 DOM 事件，方便外部监听
    if (typeof window !== 'undefined' && window.dispatchEvent) {
      window.dispatchEvent(new CustomEvent('semanticmap:hexclick', { detail: payload }));
    }
  } catch (e) {
    console.warn('emitHexClick error:', e);
  }
}


// === Helper: ensure hatch pattern exists (optional overlay for conflicts) ===
function ensureHatchPattern(panelIdx, svg, color) {
  try {
    var defs = svg.select('defs');
    if (defs.empty()) defs = svg.append('defs');
    var pid = 'hatch-' + panelIdx;
    var pat = defs.select('#' + pid);
    if (pat.empty()) {
      pat = defs.append('pattern')
        .attr('id', pid)
        .attr('patternUnits', 'userSpaceOnUse')
        .attr('width', 6)
        .attr('height', 6)
        .attr('patternTransform', 'rotate(45)');
      pat.append('line')
        .attr('x1', 0).attr('y1', 0)
        .attr('x2', 0).attr('y2', 6)
        .attr('stroke', color || '#999')
        .attr('stroke-width', 1);
    }
  } catch(e) {}
}

// —— 颜色工具：把输入安全规范成 "#RRGGBB" ——

// 把 0-255 的 r,g,b 转成 "#RRGGBB"
function _rgbToHex(r, g, b) {
  const to2 = (n) => {
    const v = Math.max(0, Math.min(255, n|0));
    return v.toString(16).padStart(2, '0').toUpperCase();
  };
  return `#${to2(r)}${to2(g)}${to2(b)}`;
}

// 尝试把任意形式的颜色转成 "#RRGGBB"
function normalizeColorToHex(color, fallback = '#A9D08D') {
  try {
    // 1) null/undefined：直接回退
    if (color == null) return fallback;

    // 2) 数组/对象：常见 {r,g,b} 或 [r,g,b]
    if (Array.isArray(color) && color.length >= 3) {
      return _rgbToHex(+color[0], +color[1], +color[2]);
    }
    if (typeof color === 'object') {
      if ('r' in color && 'g' in color && 'b' in color) {
        return _rgbToHex(+color.r, +color.g, +color.b);
      }
      // 其它对象：不认识，回退
      return fallback;
    }

    // 3) 数字：按 0xRRGGBB 解释
    if (typeof color === 'number' && Number.isFinite(color)) {
      const n = Math.max(0, Math.min(0xFFFFFF, color|0));
      return `#${n.toString(16).padStart(6, '0').toUpperCase()}`;
    }

    // 4) 字符串：各种 CSS 颜色
    if (typeof color === 'string') {
      let s = color.trim();
      if (!s) return fallback;

      // 4.1 处理 hex
      const mHex = s.match(/^#([0-9a-f]{3}|[0-9a-f]{6})$/i);
      if (mHex) {
        const h = mHex[1];
        if (h.length === 3) {
          // #abc -> #AABBCC
          const r = h[0], g = h[1], b = h[2];
          return `#${(r+r+g+g+b+b).toUpperCase()}`;
        } else {
          return `#${h.toUpperCase()}`;
        }
      }

      // 4.2 处理 rgb/rgba(...)
      const mRgb = s.match(/^rgba?\s*\(\s*(\d{1,3})\s*[, ]\s*(\d{1,3})\s*[, ]\s*(\d{1,3})/i);
      if (mRgb) {
        return _rgbToHex(+mRgb[1], +mRgb[2], +mRgb[3]);
      }

      // 4.3 其它命名色/复杂格式：用 Canvas 解析成 rgb(...)
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext && canvas.getContext('2d');
      if (ctx) {
        ctx.fillStyle = '#000';          // 先设个默认
        ctx.fillStyle = s;                // 让浏览器解析
        const resolved = ctx.fillStyle;   // 通常变成 "rgb(r, g, b)"
        const m2 = resolved && resolved.match(/^rgb\(\s*(\d{1,3})\s*,\s*(\d{1,3})\s*,\s*(\d{1,3})\s*\)$/i);
        if (m2) return _rgbToHex(+m2[1], +m2[2], +m2[3]);
      }
    }

    // 都没命中：回退
    return fallback;
  } catch {
    return fallback;
  }
}


// 基于“原始 hexList”构建坐标索引：panelIdx -> Map("q,r" -> [多条记录])
function ensureCoordIndex(panelIdx) {
  if (!App.coordIndexByPanel) App.coordIndexByPanel = new Map();
  let m = App.coordIndexByPanel.get(panelIdx);
  if (m) return m;

  m = new Map();
  // 优先使用我们保存的“原始未去重列表”
  const src = (Array.isArray(App._rawHexListByPanel?.[panelIdx]))
    ? App._rawHexListByPanel[panelIdx]
    : (App.currentData?.subspaces?.[panelIdx]?.hexList || []);

  for (const it of src) {
    if (!it) continue;
    const key = `${it.q},${it.r}`;
    let arr = m.get(key);
    if (!arr) { arr = []; m.set(key, arr); }
    arr.push(it);
  }
  App.coordIndexByPanel.set(panelIdx, m);
  return m;
}

// 安全获取 bucket：优先用 getBucket；失败则从坐标索引兜底组一个“临时 bucket”
function getBucketSafe(panelIdx, q, r) {
  let b = (typeof getBucket === 'function') ? getBucket(panelIdx, q, r) : null;
  if (b && Array.isArray(b.items) && b.items.length) return b;

  const idx = ensureCoordIndex(panelIdx);
  const items = (idx.get(`${q},${r}`) || []).slice();
  if (!items.length) return null;

  const normCid = (cid) =>
    (typeof normalizeCountryId === 'function')
      ? normalizeCountryId(cid || '')
      : (cid || '');

  const countries = new Set(
    items.map(it => normCid(it.country_id)).filter(Boolean)
  );

  return { items, countries };
}


// === Tooltip: build single-item bucket for unified rendering ===
function buildSingleBucket(panelIdx, q, r, hex) {
  var cid = '—';
  try { cid = normalizeCountryId(hex && hex.country_id ? hex.country_id : '—'); } catch(e) {}
  var msuCount = (hex && Array.isArray(hex.msu_ids)) ? hex.msu_ids.length : 0;
  var set = new Set();
  if (cid && cid !== '—') set.add(cid);
  return { panelIdx: panelIdx, q: q, r: r, items: [hex], countries: set, msuCount: msuCount, _cycleIdx: 0 };
}

// === Color helpers ===
function getPanelCountryColor(panelIdx, cidRaw) {
  let cid = cidRaw;
  try { cid = normalizeCountryId(cidRaw); } catch(e) {}

  // 1) 面板内覆盖优先
  const panelMap = App.panelCountryColors?.get?.(panelIdx);
  const rec = panelMap?.get?.(cid);
  if (rec?.color) return rec.color;

  // 2) ★ 新增：全局（跨面板）颜色兜底
  const g = App.globalCountryColors?.get?.(cid);
  if (g) return g;

  // 3) 旧的“getCountryColorOverride(panelIdx, cid)”兜底（如果你保留了它）
  if (typeof getCountryColorOverride === 'function') {
    const tmp = getCountryColorOverride(panelIdx, cid);
    if (tmp?.color) return tmp.color;
  }

  // 4) 最后回退
  return (App.config?.countryBorder?.color) || '#999';
}


// === Base fill logic: single-country = that country's color; conflict = gray; none = modality fallback ===
function computeHexBaseFill(panelIdx, q, r, modality) {
  try {
    const b = getBucket(panelIdx, q, r);
    if (b && b.countries && b.countries.size > 0) {
      if (b.countries.size === 1) {
        const onlyCid = Array.from(b.countries)[0];
        return getPanelCountryColor(panelIdx, onlyCid);
      } else {
        return (STYLE && STYLE.CONFLICT_GRAY) ? STYLE.CONFLICT_GRAY : '#B0B0B0';
      }
    }
  } catch (e) {}
  if (modality === 'image') return (App.config && App.config.hex && App.config.hex.imageFill) || '#dddddd';
  if (modality === 'text')  return (App.config && App.config.hex && App.config.hex.textFill)  || '#eeeeee';
  return (App.config && App.config.background) || '#f5f5f5';
}


// === Per-country split builders ===
function _bucketCountrySlices(panelIdx, q, r) {
  const b = getBucket(panelIdx, q, r);
  const out = new Map();
  if (!b) return out;
  b.items.forEach(it => {
    const cid = normalizeCountryId(it.country_id || '—');
    if (!out.has(cid)) out.set(cid, { country_id: cid, items: [], msu_ids: [] });
    const g = out.get(cid);
    g.items.push(it);
    if (Array.isArray(it.msu_ids)) g.msu_ids.push(...it.msu_ids);
  });
  return out;
}

function buildSplitNodes() {
  const nodes = [];
  (App.hexBucketsByPanel || []).forEach((map, panelIdx) => {
    if (!map) return;
    map.forEach(b => {
      const slices = _bucketCountrySlices(panelIdx, b.q, b.r);
      if (slices.size === 0) {
        nodes.push({ panelIdx, q: b.q, r: b.r, country_id: null, msu_ids: [], key: `${panelIdx}|${b.q},${b.r}|` });
      } else {
        slices.forEach((g, cid) => {
          nodes.push({ panelIdx, q: b.q, r: b.r, country_id: cid, msu_ids: g.msu_ids.slice(), key: `${panelIdx}|${b.q},${b.r}|${cid}` });
        });
      }
    });
  });
  return nodes;
}

function buildSplitLinks(rawLinks) {
  const links = [];
  (rawLinks || []).forEach(L => {
    if (!L || !Array.isArray(L.path) || L.path.length < 2) return;
    for (let i=0;i<L.path.length-1;i++) {
      const a = L.path[i], b = L.path[i+1];
      const pa = (typeof a.panelIdx === 'number') ? a.panelIdx : (L.panelIdx ?? 0);
      const pb = (typeof b.panelIdx === 'number') ? b.panelIdx : (L.panelIdx ?? 0);
      const slicesA = _bucketCountrySlices(pa, a.q, a.r);
      const slicesB = _bucketCountrySlices(pb, b.q, b.r);
      const cidsA = slicesA.size ? Array.from(slicesA.keys()) : [null];
      const cidsB = slicesB.size ? Array.from(slicesB.keys()) : [null];
      cidsA.forEach(cidA => {
        cidsB.forEach(cidB => {
          links.push({
            baseId: L.id || L._uid || null,
            type: L.type || 'road',
            country_from: cidA,
            country_to: cidB,
            from: { panelIdx: pa, q: a.q, r: a.r, key: `${pa}|${a.q},${a.r}|${cidA||''}` },
            to:   { panelIdx: pb, q: b.q, r: b.r, key: `${pb}|${b.q},${b.r}|${cidB||''}` },
          });
        });
      });
    }
  });
  return links;
}


function emitSelectionPayload(){
  try{
    const nodes = [];
    const edges = [];
    (App.persistentHexKeys||new Set()).forEach(k=>{
      const [p, qr] = String(k).split('|');
      const [q, r] = qr.split(',').map(Number);
      const panelIdx = Number(p);
      const hex = App.hexMapsByPanel?.[panelIdx]?.get(`${q},${r}`) || { q, r };
      // Determine fill and alpha
      let fill = null;
      try { fill = getHexFillColor(hex); } catch(e) {}
      const alpha = App.msuAlphaByHex?.get?.(`${panelIdx}|${q},${r}`) ?? STYLE.OPACITY_DEFAULT;
      nodes.push({ panelIdx, q, r, color: fill, alpha, state: 'selected' });
    });
    (App.selectedEdgeKeys||new Set()).forEach(e=>edges.push(e));
    const payload = { nodes, edges, kind: App.lastSelectionKind||null };
    if (typeof App.onHexSelectionChange === 'function') App.onHexSelectionChange(payload);
    if (typeof window !== 'undefined' && window.dispatchEvent) {
      window.dispatchEvent(new CustomEvent('semanticmap:selection', { detail: payload }));
    }
  }catch(e){ console.warn('emitSelectionPayload failed:', e); }
}


function publishToStepAnalysis() {
  try {
    const nodesAll = buildSplitNodes();

    // 1) 路线级选择 → 分段导出 linksA
    const hasRouteSel = App.selectedRouteIds && App.selectedRouteIds.size > 0;
    const selectedRoutes = hasRouteSel
      ? (App._lastLinks || []).filter(L => {
          const id = (typeof linkKey === 'function') ? linkKey(L) : (L && (L.id || L._uid));
          return id && App.selectedRouteIds.has(id);
        })
      : (App._lastLinks || []);
    const linksA = buildSplitLinks(selectedRoutes);

    // 2) 点级 extras（persistentHexKeys）→ 切段 snap.links，并与 linksA 合并去重
    let links = linksA.slice();
    if (App.persistentHexKeys && App.persistentHexKeys.size > 0 && typeof snapshotFromKeySet === 'function') {
      // 先把“已在路线里的节点”排除，避免重复片段
      const inRoute = new Set();
      (buildSplitNodes(selectedRoutes) || []).forEach(n => inRoute.add(`${n.panelIdx}|${n.q},${n.r}`));
      const extras = new Set([...App.persistentHexKeys].filter(k => !inRoute.has(String(k))));

      const snap = snapshotFromKeySet(extras);
      if (snap && Array.isArray(snap.links) && snap.links.length) {
        const seen = new Set(linksA.map(e => `${e.type}|${e.from.key}->${e.to.key}`));
        snap.links.forEach(e => {
          const sig = `${e.type}|${e.from.key}->${e.to.key}`;
          if (!seen.has(sig)) { links.push(e); seen.add(sig); }
        });
      }
    }

    if (typeof window !== 'undefined' && window.dispatchEvent) {
      // ★ 给导出的 links 也盖上名字，保证外部拿到的 link 已包含 panelNames / panelNamesByIndex
      stampSubspaceNamesOnAllLinks(links);
      const panelNamesByIndex = getSubspaceNameMap();

      const ev = new CustomEvent('semantic-map-export', {
        detail: { nodes: nodesAll, links, panelNamesByIndex }
      });
      window.dispatchEvent(ev);

    }
    App._exportSplit = { nodes: nodesAll, links };
  } catch (e) {
    console.warn('publishToStepAnalysis failed:', e);
  }
}

// 从“当前子空间的原始列表”按坐标取出所有条目，并做一次规范化聚合
function _gatherByCoordFromSubspace(panelIdx, q, r) {
  // 1) 优先使用每个子空间的原始 hexList
  const space = App?.currentData?.subspaces?.[panelIdx];
  const list1 = Array.isArray(space?.hexList) ? space.hexList : [];

  // 2) 如果你前面有保存过“未去重原始表”（推荐），也合并进来兜底
  const list2 = Array.isArray(App?._rawHexListByPanel?.[panelIdx]) ? App._rawHexListByPanel[panelIdx] : [];

  // 合并两个来源，但按引用去重
  const all = [];
  const seen = new Set();
  for (const it of [...list1, ...list2]) {
    if (!it || it.q !== q || it.r !== r) continue;
    const key = it === Object(it) ? (it.__id || `${it.country_id}|${(it.msu_ids||[]).join(',')}`) : String(Math.random());
    if (seen.has(key)) continue;
    seen.add(key);
    all.push(it);
  }

  // 规范化 country id（兼容别名）
  const normCid = (cid) => (App?.countryIdAlias?.get?.(cid) || cid || '').toString();

  // 分组与并集
  const countries = new Set(all.map(it => normCid(it.country_id)).filter(Boolean));
  const groupsMap = new Map();
  for (const it of all) {
    const cid = normCid(it.country_id) || '—';
    if (!groupsMap.has(cid)) groupsMap.set(cid, { items: [], msu_ids: [] });
    const g = groupsMap.get(cid);
    g.items.push(it);
    if (Array.isArray(it.msu_ids)) g.msu_ids.push(...it.msu_ids);
  }

  const merged_msu_ids = Array.from(new Set([].concat(...Array.from(groupsMap.values()).map(g => g.msu_ids))));

  // 代表项（用第一条，避免破坏既有 UI 依赖）
  const first = all[0] || {};
  return {
    ok: all.length > 0,
    items: all,
    countries,
    groupsMap,
    merged_msu_ids,
    representative: {
      modality: first.modality || '',
      label: first.label || `${q},${r}`
    }
  };
}


// === Buckets helpers (aggregate multiple records in one hex) ===
function ensureHatchPattern(panelIdx, svg, color) {
  var defs = svg.select('defs');
  if (defs.empty()) defs = svg.append('defs');
  var pid = 'hatch-' + panelIdx;
  var pat = defs.select('#' + pid);
  if (pat.empty()) {
    pat = defs.append('pattern')
      .attr('id', pid)
      .attr('patternUnits', 'userSpaceOnUse')
      .attr('width', 6)
      .attr('height', 6)
      .attr('patternTransform', 'rotate(45)');
    pat.append('line')
      .attr('x1', 0).attr('y1', 0)
      .attr('x2', 0).attr('y2', 6)
      .attr('stroke', color || '#999')
      .attr('stroke-width', 1);
  }
  return 'url(#' + pid + ')';
}

// === 依据每面板的 MSU 数量，建立“每格 alpha”缓存 ===
function recomputeMsuAlphaForPanel(panelIdx) {
  if (!App.msuAlphaByHex) App.msuAlphaByHex = new Map();
  const bmap = App.hexBucketsByPanel?.[panelIdx];
  if (!bmap || !(bmap instanceof Map)) return;

  // 1) 找面板内的最大 MSU 数
  let maxCount = 0;
  bmap.forEach(b => { if (typeof b.msuCount === 'number' && b.msuCount > maxCount) maxCount = b.msuCount; });

  const hi = STYLE.OPACITY_MSU_MAX ?? 0.25; // MSU=0 时
  const lo = STYLE.OPACITY_MSU_MIN ?? 0.95; // MSU=max 时

  // 2) 逐格映射
  bmap.forEach(b => {
    const k = `${panelIdx}|${b.q},${b.r}`;
    let a = App?.config?.hex?.fillOpacity ?? STYLE.OPACITY_DEFAULT;
    if (maxCount > 0) {
      const t = Math.max(0, Math.min(1, (b.msuCount || 0) / maxCount)); // 0..1
      a = lo + (hi - lo) * t; // 新：越多越不透明（alpha 递增）
    }
    App.msuAlphaByHex.set(k, a);
  });
}


function buildBucketsForPanel(panelIdx, hexList) {
  var buckets = new Map(); // key: "q,r" -> {q,r,items:[], countries:Set, msuCount, _cycleIdx}
  for (var i=0;i<hexList.length;i++) {
    var d = hexList[i];
    var key = d.q + ',' + d.r;
    var b = buckets.get(key);
    if (!b) {
      b = { panelIdx: panelIdx, q: d.q, r: d.r, items: [], countries: new Set(), msuCount: 0, _cycleIdx: 0 };
      buckets.set(key, b);
    }
    b.items.push(d);
    if (d && d.country_id) {
      try { b.countries.add(normalizeCountryId(d.country_id)); } catch(e) { b.countries.add(String(d.country_id)); }
    }
    if (Array.isArray(d.msu_ids)) b.msuCount += d.msu_ids.length;
  }
  return buckets;
}



function getBucket(panelIdx, q, r) {
  var map = (App.hexBucketsByPanel && App.hexBucketsByPanel[panelIdx]) ? App.hexBucketsByPanel[panelIdx] : null;
  return map ? map.get(String(q)+','+String(r)) : null;
}


function renderBucketTooltipHTML(bucket) {
  if (!bucket) return '<i>No data</i>';
  var panelIdx = bucket.panelIdx != null ? bucket.panelIdx : 0;

  // 1) 按国家归组
  var groups = new Map(); // cid -> {cid, items: [], msuCount: 0, color: '#999'}
  for (var i=0;i<bucket.items.length;i++) {
    var it = bucket.items[i] || {};
    var cid = normalizeCountryId(it.country_id || '—');
    var g = groups.get(cid);
    if (!g) {
      var colRec = getCountryColorOverride(panelIdx, cid);
      var col = (colRec && colRec.color) ? colRec.color : '#999';
      g = { cid: cid, items: [], msuCount: 0, color: col };
      groups.set(cid, g);
    }
    g.items.push(it);
    if (Array.isArray(it.msu_ids)) g.msuCount += it.msu_ids.length;
  }

  // 2) 排序：聚焦国家（若有）在最前
  var focusCid = App.focusCountryId ? normalizeCountryId(App.focusCountryId) : null;
  var ordered = Array.from(groups.values()).sort(function(a, b) {
    if (focusCid) {
      if (a.cid === focusCid && b.cid !== focusCid) return -1;
      if (b.cid === focusCid && a.cid !== focusCid) return 1;
    }
    return (a.cid < b.cid) ? -1 : (a.cid > b.cid) ? 1 : 0;
  });

  // 3) 头部总体信息
  var totalItems = bucket.items.length || 0;
  var totalMSU = bucket.msuCount || 0;
  var totalCountries = groups.size;
  var html = '';
  html += '<div style="margin-bottom:6px;font-weight:600">'
       + ' · ' + (totalCountries===1?'1 Country':(totalCountries+' Countries'))
       + ' · ' + (totalMSU===1?'1 MSU':(totalMSU+' MSUs'))
       + '</div>';

  // 4) 各国家块 + 逐条摘要
  for (var gi=0; gi<ordered.length; gi++) {
    var g = ordered[gi];
    html += '<div style="display:flex;align-items:center;gap:8px;margin:.25em 0 .15em">'
         +   '<span style="display:inline-block;width:10px;height:10px;border-radius:50%;'
         +   'background:'+g.color+';flex:none;border:1px solid rgba(255,255,255,0.25)"></span>'
         +   '<b style="flex:none">['+ g.cid +']</b>'
         +   '<span style="opacity:.9;flex:none">' + (g.msuCount===1?'1 MSU':(g.msuCount+' MSUs')) + '</span>'
         + '</div>';

    var maxLines = Math.min(g.items.length, 5);
    for (var j=0; j<maxLines; j++) {
      var it = g.items[j] || {};
      var nmsu = Array.isArray(it.msu_ids) ? it.msu_ids.length : 0;
      var sum  = (it && typeof it.summary === 'string') ? it.summary.trim() : '';
      // if (sum && sum.length > 180) sum = sum.slice(0, 180) + '…'; 完整MSU
      html += '<div style="margin-left:18px;margin-top:2px;opacity:.95">'
           
           +   (sum ? 'Summary: <i>' + sum + '</i>': '<i>No summary</i>')
           + '</div>';
    }
    if (g.items.length > maxLines) {
      html += '<div style="margin-left:18px;opacity:.6">… and ' + (g.items.length - maxLines) + ' more</div>';
    }
  }

  return '<div style="max-width:420px">' + html + '</div>';
}


  // —— 简易防抖 —— //
  function debounce(fn, wait = 240) {
    let t = null;
    return (...args) => {
      if (t) clearTimeout(t);
      t = setTimeout(() => { t = null; fn(...args); }, wait);
    };
  }

  function setCountryFocus(countryId, mode = 'filled') {
    // 切换聚焦国家 → 清除 release toggle 状态
    if (typeof App !== 'undefined' && App._releaseToggleByPanel) {
      // 找到当前面板 idx，这里假设传入的是全局焦点，可根据你的上下文选择具体 idx
      // 若已有 panelIdx 参数或可获取当前 activePanelIdx，请替换掉 0
      const panelIdx = 0;
      App._releaseToggleByPanel.set(panelIdx, false);
    }
 
    const normId = countryId ? normalizeCountryId(countryId) : null;
    App.focusCountryId = normId;
    App.focusMode = normId ? mode : null;
    // 预览集合可不强依赖（保持或清空均可）
    if (normId && mode === 'filled') App.highlightedHexKeys = getCountryKeysAllPanels(normId);
    else App.highlightedHexKeys.clear();
    updateHexStyles();
  }


  // ★ FIX: 访问全量 msu_index 并解析
  function getMSUIndex() {
    // 允许 key 是字符串或数字；JS 访问时会自动转字符串
    return (App.currentData && App.currentData.msu_index) || {};
  }
  function resolveMSUs(msuIds) {
    const idx = getMSUIndex();
    const out = [];
    (msuIds || []).forEach((id) => {
      // 兼容字符串/数字 id
      const rec = idx[id] ?? idx[String(id)];
      if (rec) out.push(rec);
    });
    return out;
  }


  // ★ 可选：国家 ID 归一化（当不同面板用不同 id 表示同一国家时）
  // 用 controller.setCountryIdAlias(...) 可注入 { "p0_c1":"CN", "p1_c01":"CN" } 这样的映射
  App.countryIdAlias = new Map();
  function normalizeCountryId(cid) {
    return App.countryIdAlias.get(cid) || cid;
  }

  // 仅取单面板（原有逻辑保留，如需）
  function getCountryKeysInPanel(panelIdx, countryIdRaw) {
    const m = App.countryKeysByPanel?.[panelIdx];
    if (!m) return new Set();
    const cid = normalizeCountryId(countryIdRaw);
    return new Set(m.get(cid) || []);
  }

    // ★ 新增：面板内冲突区域 key 集合（countries.size > 1）
  function getConflictKeysInPanel(panelIdx, countriesFilter) {
    const out = new Set();
    const buckets = App.hexBucketsByPanel?.[panelIdx];
    if (!buckets) return out;
    const filter = countriesFilter ? new Set(Array.from(countriesFilter).map(normalizeCountryId)) : null;
    buckets.forEach((b, key) => {
      if (!b || !b.countries || b.countries.size <= 1) return;
      if (filter) {
        // 与过滤国家有交集才纳入
        let has = false;
        b.countries.forEach(cid => { if (filter.has(normalizeCountryId(cid))) has = true; });
        if (!has) return;
      }
      out.add(`${panelIdx}|${b.q},${b.r}`);
    });
    return out;
  }

  // ★ 新增：面板内某国家参与的“冲突区域” key 集合
  function getConflictKeysForCountryInPanel(panelIdx, countryIdRaw) {
    const cid = normalizeCountryId(countryIdRaw);
    return getConflictKeysInPanel(panelIdx, new Set([cid]));
  }


  // ★ 新增：跨所有面板，取同一国家（规范 id 后）的全部 hex key
  function getCountryKeysAllPanels(countryIdRaw) {
    const out = new Set();
    const cid = normalizeCountryId(countryIdRaw);
    (App.countryKeysByPanel || []).forEach((m) => {
      if (!m) return;
      const s = m.get(cid);
      if (s && s.size) s.forEach(k => out.add(k));
    });
    return out;
  }

  // —— 颜色快照工具：把面板级国家改色拍扁成两个映射 ——
  // 1) colorByCountry: { [normCountryId]: "#RRGGBB" }（跨面板统一色，取第一次出现为主）
  // 2) colorByPanelCountry: { ["panelIdx|normCountryId"]: "#RRGGBB" }（面板内覆盖）
  // —— 小工具：把 "p|q,r" 统一成 "p:q,r" —— //
  const _keyPipeToColon = (k) => {
    if (typeof k !== 'string') return String(k);
    const i = k.indexOf('|');
    return i >= 0 ? `${k.slice(0,i)}:${k.slice(i+1)}` : k;
  };

  // —— 从 App 中构造小卡用的颜色 & 透明度快照 —— //
  function _buildMiniSnapshot() {
    const colorByCountry = {};
    const colorByPanelCountry = {};
    const alphaByNode = {}; // key: "panelIdx:q,r" → 0~1

    // 颜色：来自 App.panelCountryColors（你的存储结构）
    if (App && App.panelCountryColors instanceof Map) {
      App.panelCountryColors.forEach((m, panelIdx) => {
        if (!(m instanceof Map)) return;
        m.forEach((rec, rawCid) => {
          const cid = App.countryIdAlias?.get?.(rawCid) || rawCid;
          const hex = rec?.color || null;
          if (hex) {
            colorByPanelCountry[`${panelIdx}|${cid}`] = hex;
            if (!(cid in colorByCountry)) colorByCountry[cid] = hex;
          }

          // 透明度：优先 rec.alphaByKey（Map 或对象）
          const abk = rec?.alphaByKey;
          if (abk instanceof Map) {
            abk.forEach((a, k) => {
              if (typeof a === 'number' && a >= 0 && a <= 1) {
                alphaByNode[_keyPipeToColon(k)] = a;
              }
            });
          } else if (abk && typeof abk === 'object') {
            Object.entries(abk).forEach(([k, a]) => {
              if (typeof a === 'number' && a >= 0 && a <= 1) {
                alphaByNode[_keyPipeToColon(k)] = a;
              }
            });
          }
        });
      });
    }

    // 透明度兜底：渲染时缓存（updateHexStyles 写入）
    if (App && App.alphaCacheByHex) {
      if (App.alphaCacheByHex instanceof Map) {
        App.alphaCacheByHex.forEach((a, k) => {
          const kc = _keyPipeToColon(k);
          if (alphaByNode[kc] == null && typeof a === 'number' && a >= 0 && a <= 1) {
            alphaByNode[kc] = a;
          }
        });
      } else if (typeof App.alphaCacheByHex === 'object') {
        Object.entries(App.alphaCacheByHex).forEach(([k, a]) => {
          const kc = _keyPipeToColon(k);
          if (alphaByNode[kc] == null && typeof a === 'number' && a >= 0 && a <= 1) {
            alphaByNode[kc] = a;
          }
        });
      }
    }

    const normalizeCountryId = (cid) => App.countryIdAlias?.get?.(cid) || cid;

    // === 追加：边框样式映射（把 "p|q,r" 转 "p:q,r"） ===
    const borderColorByNode = {};
    const borderWidthByNode = {};
    if (App && App.borderCacheByHex) {
      const put = (k, v) => {
        const colonKey = String(k).replace('|', ':');
        if (v && v.stroke) borderColorByNode[colonKey] = v.stroke;
        if (v && Number.isFinite(v.strokeW)) borderWidthByNode[colonKey] = v.strokeW;
      };
      if (App.borderCacheByHex instanceof Map) {
        App.borderCacheByHex.forEach((v, k) => put(k, v));
      } else if (typeof App.borderCacheByHex === 'object') {
        Object.entries(App.borderCacheByHex).forEach(([k, v]) => put(k, v));
      }
    }

    // 4) 逐点填充（Alt 冲突色）：来自 App.panelConflictColors
    const fillByNode = {};
    if (App && App.panelConflictColors instanceof Map) {
      App.panelConflictColors.forEach((rec /*, panelIdx */) => {
        const fallback = (App.config?.background || '#ffffff');        // NEW: 底色兜底
        const color = rec?.color ?? fallback;                           // NEW: 没配色也用底色
        const alphaByKey = rec?.alphaByKey;
        if (!(alphaByKey instanceof Map)) return;
        alphaByKey.forEach((a, k) => {
          const keyColon = _keyPipeToColon(k);
          fillByNode[keyColon] = color;                                 // 覆盖国家色
          if (typeof a === 'number' && a >= 0 && a <= 1) {              // NEW: 同步冲突透明度
            alphaByNode[keyColon] = a;
          }
        });
      });
    }

    // —— 原有返回，补充 3 张表 —— 
    return { colorByCountry, colorByPanelCountry, alphaByNode, normalizeCountryId,
            borderColorByNode, borderWidthByNode, fillByNode };

  }

  // —— 颜色/透明度/边框/逐点填充 的右侧快照 ——
  // 注意：这是在 semanticMap.js 里替换 _buildColorMapsSnapshot 的完整实现
  function _buildColorMapsSnapshot() {
    const colorByCountry = {};
    const colorByPanelCountry = {};
    const alphaByNode = {}; // "panelIdx:q,r" -> 0..1

    const _keyPipeToColon = (k) => {
      if (typeof k !== 'string') return String(k);
      const i = k.indexOf('|');
      return i >= 0 ? `${k.slice(0,i)}:${k.slice(i+1)}` : k;
    };
    const normalizeCountryId = (cid) => App.countryIdAlias?.get?.(cid) || cid;

    // 1) 颜色（保持你原逻辑）
    if (App && App.panelCountryColors instanceof Map) {
      App.panelCountryColors.forEach((m, panelIdx) => {
        if (!(m instanceof Map)) return;
        m.forEach((rec, rawCid) => {
          const cid = normalizeCountryId ? normalizeCountryId(rawCid) : rawCid;
          const hex = rec?.color || null;
          if (hex) {
            colorByPanelCountry[`${panelIdx}|${cid}`] = hex;
            if (!(cid in colorByCountry)) colorByCountry[cid] = hex;
          }
          const abk = rec?.alphaByKey;
          if (abk instanceof Map) {
            abk.forEach((a, k) => {
              const keyColon = _keyPipeToColon(k);
              if (typeof a === 'number' && a >= 0 && a <= 1) alphaByNode[keyColon] = a;
            });
          } else if (abk && typeof abk === 'object') {
            Object.entries(abk).forEach(([k, a]) => {
              const keyColon = _keyPipeToColon(k);
              if (typeof a === 'number' && a >= 0 && a <= 1) alphaByNode[keyColon] = a;
            });
          }
        });
      });
    }

    // 2) 透明度兜底：来自渲染缓存（updateHexStyles 写入）
    if (App && App.alphaCacheByHex) {
      if (App.alphaCacheByHex instanceof Map) {
        App.alphaCacheByHex.forEach((a, k) => {
          const keyColon = _keyPipeToColon(k);
          if (alphaByNode[keyColon] == null && typeof a === 'number' && a >= 0 && a <= 1) {
            alphaByNode[keyColon] = a;
          }
        });
      } else if (typeof App.alphaCacheByHex === 'object') {
        Object.entries(App.alphaCacheByHex).forEach(([k, a]) => {
          const keyColon = _keyPipeToColon(k);
          if (alphaByNode[keyColon] == null && typeof a === 'number' && a >= 0 && a <= 1) {
            alphaByNode[keyColon] = a;
          }
        });
      }
    }

    // 3) 边框样式：来自 App.borderCacheByHex（updateHexStyles 写入）
    const borderColorByNode = {};
    const borderWidthByNode = {};
    if (App && App.borderCacheByHex) {
      const put = (k, v) => {
        const keyColon = _keyPipeToColon(k);
        if (v && v.stroke) borderColorByNode[keyColon] = v.stroke;
        if (v && Number.isFinite(v.strokeW)) borderWidthByNode[keyColon] = v.strokeW;
      };
      if (App.borderCacheByHex instanceof Map) {
        App.borderCacheByHex.forEach((v, k) => put(k, v));
      } else if (typeof App.borderCacheByHex === 'object') {
        Object.entries(App.borderCacheByHex).forEach(([k, v]) => put(k, v));
      }
    }

    // 4) 逐点填充（Alt 冲突色）：来自 App.panelConflictColors
    const fillByNode = {};
    if (App && App.panelConflictColors instanceof Map) {
      App.panelConflictColors.forEach((rec /*, panelIdx */) => {
        const color = rec?.color;
        const alphaByKey = rec?.alphaByKey;
        if (!color || !(alphaByKey instanceof Map)) return;
        alphaByKey.forEach((_, k) => {
          const keyColon = _keyPipeToColon(k);
          fillByNode[keyColon] = color; // 只要在冲突 alpha 表里，就按冲突统一色涂满
        });
      });
    }

    // 统一返回
    return { colorByCountry, colorByPanelCountry, alphaByNode, borderColorByNode, borderWidthByNode, fillByNode };
  }


    function degradeFocusToOutlineFor(panelIdx) {
      // 面板级优先：如果该面板有本地聚焦，改成 outline
      const local = App.panelFocusOverrides.get(panelIdx);
      if (local && local.countryId && local.mode !== 'outline') {
        App.panelFocusOverrides.set(panelIdx, { countryId: local.countryId, mode: 'outline' });
        return true;
      }
      // 否则退全局：有全局聚焦就把模式改成 outline（不清 countryId）
      if (App.focusCountryId && App.focusMode !== 'outline') {
        App.focusMode = 'outline';
        return true;
      }
      return false;
    }


    // 在指定 svg 里确保存在一个用于“预览态”的斜线填充 pattern
    function ensureHatchPattern(svgSel) {
      if (!svgSel || svgSel.empty && svgSel.empty()) return;
      const defs = svgSel.select('defs').empty() ? svgSel.append('defs') : svgSel.select('defs');
      if (defs.select(`#${STYLE.HATCH_ID}`).empty()) {
        const pat = defs.append('pattern')
          .attr('id', STYLE.HATCH_ID)
          .attr('patternUnits', 'userSpaceOnUse')
          .attr('width', 6).attr('height', 6)
          .attr('patternTransform', 'rotate(45)');
        pat.append('line')
          .attr('x1', 0).attr('y1', 0)
          .attr('x2', 0).attr('y2', 6)
          .attr('stroke', '#444')        // 阴影线的颜色（可按需调整）
          .attr('stroke-width', 1)
          .attr('stroke-opacity', 0.6);  // 线条稍微淡一些
      }
    }

    const safeNum = (v, fallback = 0) => {
      const n = Number(v);
      return Number.isFinite(n) ? n : fallback;
    };
    function isConnectActive() {
      return !!(App.insertMode || App.flightStart);
    }
    function isConnectArmedNow(withCtrl, withShift) {
  // connect-edit disabled
  return false;
}


    // ★ 新增：Route 模式是否开启（键盘 Ctrl/⌘ 或 按钮 Route 绿灯）
    function isRouteMode(withCtrlLike) {
      return !!withCtrlLike || App.uiPref.route;
    }

    const isFiniteTransform = (t) => t && Number.isFinite(t.x) && Number.isFinite(t.y) && Number.isFinite(t.k);

    function getPanelRect(panelIdx) {
      const panelDom = App.playgroundEl.querySelectorAll('.subspace')[panelIdx];
      if (!panelDom) return null;
      const container = panelDom.querySelector('.hex-container');
      if (!container) return null;
      const playgroundRect = App.playgroundEl.getBoundingClientRect();
      const containerRect = container.getBoundingClientRect();
      return {
        left: containerRect.left - playgroundRect.left,
        top: containerRect.top - playgroundRect.top,
        right: containerRect.right - playgroundRect.left,
        bottom: containerRect.bottom - playgroundRect.top
      };
    }
    const pointInRect = (x, y, rect) =>
      x >= rect.left && x <= rect.right && y >= rect.top && y <= rect.bottom;

    function getHexGlobalXY(panelIdx, q, r) {
      const hexMap = App.hexMapsByPanel[panelIdx];
      if (!hexMap) return null;
      const hex = hexMap.get(`${q},${r}`);
      if (!hex) return null;
      const panelDom = App.playgroundEl.querySelectorAll('.subspace')[panelIdx];
      const container = panelDom.querySelector('.hex-container');
      const playgroundRect = App.playgroundEl.getBoundingClientRect();
      const containerRect = container.getBoundingClientRect();
      const offsetX = containerRect.left - playgroundRect.left;
      const offsetY = containerRect.top - playgroundRect.top;
      const t = App.zoomStates[panelIdx] || d3.zoomIdentity;
      const [tx, ty] = [t.applyX(hex.x), t.applyY(hex.y)];
      return [tx + offsetX, ty + offsetY];
    }

    // 为每个 panel 的 <svg> 确保一个斜线填充 pattern
    function ensureHatchDefs(svgSel, panelIdx) {
      let defs = svgSel.select('defs');
      if (defs.empty()) defs = svgSel.append('defs');

      const pid = `hex-hatch-${panelIdx}`;
      let pat = defs.select(`#${pid}`);
      if (pat.empty()) {
        pat = defs.append('pattern')
          .attr('id', pid)
          .attr('patternUnits', 'userSpaceOnUse')
          .attr('width', STYLE.HATCH_SPACING)
          .attr('height', STYLE.HATCH_SPACING)
          .attr('patternTransform', `rotate(${STYLE.HATCH_ANGLE})`);

        // 只画线，不画背景；“空白”区域透明 → 下方的底色可见
        pat.append('line')
          .attr('x1', 0).attr('y1', 0)
          .attr('x2', 0).attr('y2', STYLE.HATCH_SPACING)
          .attr('stroke', STYLE.HATCH_STROKE)
          .attr('stroke-width', STYLE.HATCH_STROKE_WIDTH)
          .attr('opacity', STYLE.HATCH_OPACITY);
      }
      return `url(#${pid})`;
    }

    // —— 从 App.panelCountryColors 构建小卡片可用的颜色映射 —— //
    // 返回 { colorByCountry: {...}, colorByPanelCountry: {...} }
    function _buildMiniColorMaps() {
      const colorByPanelCountry = {};
      const colorByCountry = {}; // 目前你主图没有“全局国家改色”，先留空对象

      // 1) 面板级改色（右键调色存这里）：App.panelCountryColors: Map(panelIdx -> Map(countryId -> { color, alphaByKey }))
      App.panelCountryColors.forEach((countryMap, panelIdx) => {
        countryMap.forEach((entry, rawCid) => {
          const cid = normalizeCountryId(rawCid);
          if (!entry || !entry.color) return;

          // 主键：用“规范化 id”
          colorByPanelCountry[`${panelIdx}|${cid}`] = entry.color;

          // 兼容：如果你有别名（raw -> canonical），把“原始 id”也一并写入，防止小卡片节点用的是 rawCid
          // App.countryIdAlias: Map(raw -> canonical)
          App.countryIdAlias?.forEach((to, from) => {
            if (to === cid) {
              colorByPanelCountry[`${panelIdx}|${from}`] = entry.color;
            }
          });
        });
      });

      // 2) 若以后你做了“全局国家改色”，在这里把 { canonicalCid: color } 写到 colorByCountry 即可

      return { colorByCountry, colorByPanelCountry };
    }


  // 从当前已选节点集合（persistentHexKeys）推导出涉及到的整条线路，灌入 selectedRouteIds
  function seedSelectedRoutesFromPersistent() {
    if (!App.persistentHexKeys || App.persistentHexKeys.size === 0) return false;
    if (App.selectedRouteIds && App.selectedRouteIds.size > 0) return false;

    let added = false;
    (App._lastLinks || []).forEach(link => {
      if (!isSelectableRoute(link)) return;
      const path = Array.isArray(link.path) ? link.path : [];
      for (let i = 0; i < path.length; i++) {
        const p = path[i];
        const pIdx = resolvePanelIdxForPathPoint(p, link, i);
        const key = `${pIdx}|${p.q},${p.r}`;
        if (App.persistentHexKeys.has(key)) {
          App.selectedRouteIds.add(linkKey(link));
          added = true;
          break;
        }
      }
    });

    if (added) {
      // 用路线+排除点重算一次持久选集，保证后续操作都在“路线视角”上进行
      recomputePersistentFromRoutes();
    }
    return added;
  }


  /* =========================
 * Alt 改色：状态与工具
 * ========================= */

// 面板级颜色覆盖：panelIdx -> (countryId -> { color: '#RRGGBB', alphaByKey: Map<'p|q,r', number> })
App.panelCountryColors = new Map();

// 临时预览态（打开菜单时用）
App._pendingColorEdit = null; 
// { panelIdx, countryId, color, keys:Set<"p|q,r">, alphaByKey:Map }

App.panelConflictColors = new Map();
// 临时预览（和国家改色的 pending 并存）
App._pendingConflictEdit = null;
// 判断某格是否冲突（countries.size > 1）
function isConflictHex(panelIdx, q, r) {
  try {
    const b = getBucket(panelIdx, q, r);
    return !!(b && b.countries && b.countries.size > 1);
  } catch { return false; }
}

// 冲突区：构建透明度渐变（整面板的冲突 hex）
function buildConflictAlphaRampFor(panelIdx) {
  const keys = getConflictKeysInPanel(panelIdx); // 已有函数
  const arr = Array.from(keys).map(k => {
    const [pStr, qr] = String(k).split('|');
    const [qs, rs] = qr.split(',');
    const p = +pStr, q = +qs, r = +rs;
    const hex = App.hexMapsByPanel[p]?.get(`${q},${r}`);
    return { k, x: hex?.x ?? 0, y: hex?.y ?? 0 };
  });
  arr.sort((a,b) => (a.y - b.y) || (a.x - b.x));
  const n = Math.max(1, arr.length);
  const a0 = 0.65, a1 = 1.0;
  const alphaByKey = new Map();
  arr.forEach((it, i) => {
    const t = n === 1 ? 1 : i / (n - 1);
    const alpha = a0 + (a1 - a0) * t;
    alphaByKey.set(it.k, alpha);
  });
  return { keys: new Set(arr.map(d => d.k)), alphaByKey };
}

// 写入/读取 冲突色
function setConflictColorOverride(panelIdx, color, alphaByKey) {
  
  if (App?.modKeys?.alt && App?._pendingConflictEdit && !App._isConfirmingAltColor) {
    // 未经确认：忽略任何写入请求（防外部监听或意外调用）
    return;
  }
  let alphaMap = new Map();
  if (alphaByKey instanceof Map) {
    alphaMap = new Map(
      Array.from(alphaByKey.entries()).map(([k, v]) => {
        const kk = (typeof k === 'string') ? (k.includes('|') ? k : k.replace(':','|')) : String(k);
        return [kk, v];
      })
    );
  } else if (alphaByKey && typeof alphaByKey === 'object') {
    for (const [k, v] of Object.entries(alphaByKey)) {
      const kk = k.includes('|') ? k : k.replace(':','|');
      alphaMap.set(kk, v);
    }
  }
  
  if (!alphaMap || alphaMap.size === 0) {
    alphaMap = new Map();
    const keys = getConflictKeysInPanel(panelIdx); // Set<"p|q,r">
    keys.forEach(k => {
      const a = (App.alphaCacheByHex?.get?.(k) ?? App.msuAlphaByHex?.get?.(k) ?? STYLE.OPACITY_DEFAULT);
      alphaMap.set(k, a);
    });
  }


  App.panelConflictColors.set(panelIdx, { color, alphaByKey: alphaMap });
}

function getConflictColorOverride(panelIdx) {
  return App.panelConflictColors?.get(panelIdx) || null;
}

// —— 工具：规范化国家 ID（含别名） ——
function _normCid(cid) {
  return (App?.countryIdAlias?.get?.(cid) || cid || '').toString();
}

// ★ 新增：为“某面板 + 某国家”的全部 hex 重建 alphaMap（遵循你现有的 MSU → 透明度逻辑）
function buildAlphaMapForPanelCountry(panelIdx, countryId) {
  const cid = normalizeCountryId(countryId);
  const keys = getCountryKeysInPanel(panelIdx, cid); // Set<"p|q,r">
  // 关键：排除该国参与的冲突 hex
  const conflict = (typeof getConflictKeysForCountryInPanel === 'function')
    ? getConflictKeysForCountryInPanel(panelIdx, cid)
    : new Set();

  const alphaMap = new Map();
  for (const k of keys) {
    if (conflict.has(k)) continue; // 跳过冲突 hex
    const a =
      (App.msuAlphaByHex?.get?.(k)) ??
      (App.alphaCacheByHex?.get?.(k)) ??
      STYLE.OPACITY_DEFAULT;
    alphaMap.set(k, a);
  }
  return alphaMap;
}


// ★ 新增：把某个国家的颜色同步到所有子空间
function propagateCountryColorToAllPanels(countryId, color) {
  const cid = normalizeCountryId(countryId);

  // 1) 记录到全局颜色表（供渲染兜底）
  App.globalCountryColors.set(cid, color);

  // 2) 写入每个面板的 panelCountryColors，并重建 alphaMap（按该面板的 MSU 分布）
  if (!App.panelCountryColors) App.panelCountryColors = new Map();

  (App.countryKeysByPanel || []).forEach((m, panelIdx) => {
    if (!m) return; // 该面板内可能没有任何国家
    let perPanel = App.panelCountryColors.get(panelIdx);
    if (!perPanel) {
      perPanel = new Map();
      App.panelCountryColors.set(panelIdx, perPanel);
    }
    const alphaByKey = buildAlphaMapForPanelCountry(panelIdx, cid);
    perPanel.set(cid, { color, alphaByKey });

    
  });

  // 3) 刷新
  if (typeof updateHexStyles === 'function') updateHexStyles();
}


// —— 覆盖色：写入（按 MSU → 透明度 基线为该国每个 hex 建立 alphaMap）——
function setCountryColorOverride(panelIdx, countryId, color, alphaByKey) {
  if (App?.modKeys?.alt && App?._pendingColorEdit && !App._isConfirmingAltColor) {
    return;
  }

  if (!App.panelCountryColors) App.panelCountryColors = new Map();

  let perPanel = App.panelCountryColors.get(panelIdx);
  if (!perPanel) {
    perPanel = new Map();
    App.panelCountryColors.set(panelIdx, perPanel);
  }

  const cid = _normCid(countryId);

  // 统一 alphaByKey 的 key 形态 -> `${panelIdx}|${q},${r}`
  let incoming = new Map();
  if (alphaByKey instanceof Map) {
    incoming = new Map(Array.from(alphaByKey.entries()).map(([k, v]) => {
      const kk = (typeof k === 'string') ? (k.includes('|') ? k : k.replace(':','|')) : String(k);
      return [kk, v];
    }));
  } else if (alphaByKey && typeof alphaByKey === 'object') {
    for (const [k, v] of Object.entries(alphaByKey)) {
      const kk = k.includes('|') ? k : k.replace(':','|');
      incoming.set(kk, v);
    }
  }

  // —— 关键：为“该国在该面板里的所有 hex”构造每格透明度 —— //
  // 规则：优先用 “MSU 基线” -> 没有就用 “渲染时的最终透明度缓存” -> 再没有用默认
  // —— 关键：为“该国在该面板里的所有 hex”构造每格透明度 —— //
  const alphaMap = new Map();
  const cidNorm = _normCid(countryId);
  const allKeys = getCountryKeysInPanel(panelIdx, cidNorm); // Set<"p|q,r">
  // 关键：排除该国参与的冲突 hex
  const conflict = (typeof getConflictKeysForCountryInPanel === 'function')
    ? getConflictKeysForCountryInPanel(panelIdx, cidNorm)
    : new Set();

  allKeys.forEach(k => {
    if (conflict.has(k)) return; // 跳过冲突 hex
    const a =
      (App.msuAlphaByHex?.get?.(k)) ??
      (App.alphaCacheByHex?.get?.(k)) ??
      incoming.get(k) ??
      STYLE.OPACITY_DEFAULT;
    alphaMap.set(k, a);
  });


  perPanel.set(cid, { color, alphaByKey: alphaMap });

  // ★ 可选追加：保证调用 setCountryColorOverride 也能全局同步
  if (App.syncCountryColorAcrossPanels) {
    propagateCountryColorToAllPanels(countryId, color);
  }

}


// —— 覆盖色：读取 —— //
function getCountryColorOverride(panelIdx, countryId) {
  const perPanel = App.panelCountryColors?.get(panelIdx);
  if (!perPanel) return null;
  const cid = _normCid(countryId);
  return perPanel.get(cid) || null;
}


// 依据“该面板 + 国家”的实际 hex 集合，生成一条透明度比例尺（层次感）
// 策略：按 y 再按 x 排序，做一个从 0.65 → 1.0 的线性渐变
function buildAlphaRampFor(panelIdx, countryId) {
  const cid = normalizeCountryId(countryId);
  const keys = getCountryKeysInPanel(panelIdx, cid); // Set<"p|q,r">
  const conflict = (typeof getConflictKeysForCountryInPanel === 'function')
    ? getConflictKeysForCountryInPanel(panelIdx, cid)
    : new Set();
  const filtered = Array.from(keys).filter(k => !conflict.has(k));

  const arr = filtered.map(k => {
    const [pStr, qr] = k.split('|');
    const [qs, rs] = qr.split(',');
    const p = +pStr, q = +qs, r = +rs;
    const hex = App.hexMapsByPanel[p]?.get(`${q},${r}`);
    return { k, x: hex?.x ?? 0, y: hex?.y ?? 0 };
  });
  arr.sort((a,b) => (a.y - b.y) || (a.x - b.x));
  const n = Math.max(1, arr.length);
  const a0 = 0.65, a1 = 1.0;
  const alphaByKey = new Map();
  arr.forEach((it, i) => {
    const t = n === 1 ? 1 : i / (n - 1);
    const alpha = a0 + (a1 - a0) * t;
    alphaByKey.set(it.k, alpha);
  });
  return { keys: new Set(arr.map(d => d.k)), alphaByKey };
}

/* =========================
 * 右键菜单（全局唯一）
 * ========================= */
function ensureColorMenu() {
  let menu = document.getElementById('alt-color-menu');
  if (menu) return menu;

  menu = document.createElement('div');
  menu.id = 'alt-color-menu';
  Object.assign(menu.style, {
    position: 'fixed',
    display: 'none',
    zIndex: 9999,
    minWidth: '220px',
    padding: '10px 12px',
    borderRadius: '12px',
    background: '#ffffff',                // 白色背景
    color: '#111',                        // 深色文字
    boxShadow: '0 8px 18px rgba(0,0,0,0.25)',
    border: '1px solid rgba(0,0,0,0.1)',  // 边框浅灰
    backdropFilter: 'blur(6px)',
  });

  menu.innerHTML = `
    <div style="font-size:13px;opacity:.85;margin-bottom:8px;color:#111">
      Adjust country color
    </div>

    <div style="display:flex;align-items:center;gap:8px;margin-bottom:10px">
      <input id="alt-color-input" type="color" 
            style="width:36px;height:28px;border:none;background:transparent;cursor:pointer" />
      <input id="alt-color-hex" type="text" placeholder="#AABBCC"
            style="flex:1;height:28px;border-radius:8px;
                    border:1px solid rgba(0,0,0,.2);
                    background:#f9f9f9;color:#111;
                    padding:0 8px;font-size:12px;outline:none" />
    </div>

    <div style="display:flex;justify-content:flex-end;gap:8px">
      <button id="alt-color-cancel"
              style="height:28px;padding:0 10px;border-radius:8px;
                    border:1px solid rgba(0,0,0,.2);
                    background:#fff;color:#111;cursor:pointer">
        Cancel
      </button>
      <button id="alt-color-confirm"
              style="height:28px;padding:0 12px;border-radius:8px;
                    border:none;background:#111;color:#fff;cursor:pointer">
        Confirm
      </button>
    </div>
  `;

  document.body.appendChild(menu);


  const pick = () => {
    const inp = /** @type {HTMLInputElement} */(menu.querySelector('#alt-color-input'));
    const hex = /** @type {HTMLInputElement} */(menu.querySelector('#alt-color-hex'));
    return { inp, hex };
  };

  // 同步：色盘 <-> 文本
  // —— 输入同步：色盘 <-> 文本，并同时更新两个 pending —— 
  menu.querySelector('#alt-color-input').addEventListener('input', () => {
    const inp = /** @type {HTMLInputElement} */(menu.querySelector('#alt-color-input'));
    const hex = /** @type {HTMLInputElement} */(menu.querySelector('#alt-color-hex'));
    hex.value = inp.value.toUpperCase();

    if (App._pendingColorEdit)    App._pendingColorEdit.color = inp.value;
    if (App._pendingConflictEdit) App._pendingConflictEdit.color = inp.value;
    debouncedPreview();
  });

  menu.querySelector('#alt-color-hex').addEventListener('input', () => {
    const inp = /** @type {HTMLInputElement} */(menu.querySelector('#alt-color-input'));
    const hex = /** @type {HTMLInputElement} */(menu.querySelector('#alt-color-hex'));
    const v = hex.value.trim();
    if (/^#([0-9a-f]{6})$/i.test(v)) {
      inp.value = v;
      if (App._pendingColorEdit)    App._pendingColorEdit.color = v;
      if (App._pendingConflictEdit) App._pendingConflictEdit.color = v;
      debouncedPreview();
    }
  });

  // —— 确认：同时落盘冲突颜色 & 国家颜色 —— 
  menu.querySelector('#alt-color-confirm').addEventListener('click', () => {
    App._isConfirmingAltColor = true;   
    const colorInp = /** @type {HTMLInputElement} */(menu.querySelector('#alt-color-input'));
    const colorHex = /** @type {HTMLInputElement} */(menu.querySelector('#alt-color-hex'));
    let chosen = (colorHex?.value || colorInp?.value || '').trim();
    if (!/^#([0-9a-f]{6})$/i.test(chosen)) chosen = null;

    const pendC = App._pendingConflictEdit;
    const pendN = App._pendingColorEdit;

    if (pendC && chosen) {
      App._isConfirmingAltColor = true;
      setConflictColorOverride(pendC.panelIdx, chosen, pendC.alphaByKey);
      App._isConfirmingAltColor = false;
    }
    if (pendN && chosen) {
      // 1) 原面板先落一份（不破坏你原来的 per-panel 行为）
      setCountryColorOverride(pendN.panelIdx, pendN.countryId, chosen, pendN.alphaByKey);

      // 2) ★ 新增：跨子空间同步
      if (App.syncCountryColorAcrossPanels) {
        propagateCountryColorToAllPanels(pendN.countryId, chosen);
      }
    }
    App._isConfirmingAltColor = false;
    App._pendingConflictEdit = null;
    App._pendingColorEdit = null;
    hideColorMenu();
    updateHexStyles();
  });

  // —— 取消 / 点击外部：同时丢弃两个 pending —— 
  menu.querySelector('#alt-color-cancel').addEventListener('click', () => {
    App._pendingConflictEdit = null;
    App._pendingColorEdit = null;
    hideColorMenu();
    updateHexStyles();
  });

  document.addEventListener('click', (e) => {
    if (menu.style.display === 'none') return;
    if (!menu.contains(e.target)) {
      App._pendingConflictEdit = null;
      App._pendingColorEdit = null;
      hideColorMenu();
      updateHexStyles();
    }
  });

  // —— 预览刷新：任一 pending 存在就预览 —— 
  const debouncedPreview = debounce(() => {
    if (App._pendingColorEdit || App._pendingConflictEdit) updateHexStyles();
  }, 160);


  return menu;
}

function showColorMenu(x, y, initColor = '#a9d08d') {
  const menu = ensureColorMenu();
  if (!menu) return;

  const inp = /** @type {HTMLInputElement|null} */(menu.querySelector('#alt-color-input'));
  const hex = /** @type {HTMLInputElement|null} */(menu.querySelector('#alt-color-hex'));

  // 统一成 "#RRGGBB"（大写）
  const hexColor = normalizeColorToHex(initColor, '#A9D08D'); // => "#A9D08D"

  if (inp) inp.value = hexColor;               // <input type="color"> 也能接受大写
  if (hex) hex.value = hexColor.toUpperCase(); // 文本显示大写

  // 避免出屏
  const pad = 8;
  const vw = window.innerWidth, vh = window.innerHeight;
  // 先显示，再测量 offsetWidth/Height 更准确
  menu.style.display = 'block';
  const w = menu.offsetWidth || 240;
  const h = menu.offsetHeight || 120;
  menu.style.left = Math.min(x, vw - w - pad) + 'px';
  menu.style.top  = Math.min(y, vh - h - pad) + 'px';
}

function hideColorMenu() {
  const menu = document.getElementById('alt-color-menu');
  if (menu) menu.style.display = 'none';
}

// —— Hover Tooltip（与改色菜单同级的小组件）——
function ensureHexTooltip() {
  let tip = document.getElementById('hex-tip');
  if (tip) return tip;

  tip = document.createElement('div');
  tip.id = 'hex-tip';
  Object.assign(tip.style, {
    position: 'fixed',
    display: 'none',
    zIndex: 9998,
    maxWidth: '420px',
    padding: '10px 12px',
    borderRadius: '12px',
    background: '#ffffff',         // 白底
    color: '#111',                 // 黑字
    boxShadow: '0 8px 18px rgba(0,0,0,0.15)', // 阴影也可以调浅一点
    border: '1px solid rgba(0,0,0,0.1)',      // 边框浅灰
    backdropFilter: 'blur(6px)',
    fontSize: '12.5px',
    lineHeight: '1.45',
    pointerEvents: 'none'
  });
  tip.innerHTML = ''; // 动态填充
  document.body.appendChild(tip);
  return tip;
}

function renderHexTooltipHTML({ color = '#999', msuCount = 0, summary = '' }) {
  const safeSummary = (summary || '').toString().trim();
  // 根据数量决定显示 "MSU" 还是 "MSUs"
  const label = msuCount === 1 ? 'MSU' : 'MSUs';
  console.log('renderHexTooltipHTML', color, msuCount, summary);
  return `
    <div style="display:flex;align-items:center;gap:8px">
      <span style="
        display:inline-block;width:10px;height:10px;border-radius:50%;
        background:${color};flex:none;border:1px solid rgba(255,255,255,0.25)
      "></span>
      <span style="opacity:.9;flex:none"><b>${msuCount}</b> ${label}: </span>
      <span style="opacity:.95;flex:1">${safeSummary || '<i style="opacity:.6">No summary</i>'}</span>
    </div>
  `;
}

function showHexTooltip(clientX, clientY, payload) {
  const tip = ensureHexTooltip();
  if (payload && payload._rawHTML && payload.html) {
    tip.innerHTML = payload.html;
  } else {
    tip.innerHTML = renderHexTooltipHTML(payload);
  }
  // ↓ 下面定位&防溢出逻辑保持不变
  const pad = 10;
  tip.style.display = 'block';
  tip.style.left = (clientX + 14) + 'px';
  tip.style.top  = (clientY + 14) + 'px';
  const vw = window.innerWidth, vh = window.innerHeight;
  const rect = tip.getBoundingClientRect();
  if (rect.right > vw - pad) tip.style.left = (vw - rect.width - pad) + 'px';
  if (rect.bottom > vh - pad) tip.style.top = (vh - rect.height - pad) + 'px';
}


function moveHexTooltip(clientX, clientY) {
  const tip = document.getElementById('hex-tip');
  if (!tip || tip.style.display === 'none') return;
  const pad = 10;
  tip.style.left = (clientX + 14) + 'px';
  tip.style.top  = (clientY + 14) + 'px';

  const vw = window.innerWidth, vh = window.innerHeight;
  const rect = tip.getBoundingClientRect();
  if (rect.right > vw - pad) tip.style.left = (vw - rect.width - pad) + 'px';
  if (rect.bottom > vh - pad) tip.style.top = (vh - rect.height - pad) + 'px';
}

function hideHexTooltip() {
  const tip = document.getElementById('hex-tip');
  if (tip) tip.style.display = 'none';
}


  // flight 端点可见性（用于“端点不可见则不画”）
  const isPointVisible = (panelIdx, q, r) => {
    const pt = getHexGlobalXY(panelIdx, q, r);
    const rect = getPanelRect(panelIdx);
    return !!(pt && rect && pointInRect(pt[0], pt[1], rect));
  };
  const flightEndpointsVisible = (pStart, pEnd) =>
    isPointVisible(pStart.panelIdx, pStart.q, pStart.r) &&
    isPointVisible(pEnd.panelIdx,   pEnd.q,   pEnd.r);

  // 解析 path 点的 panelIdx（兼容 flight 的 From/To）
  function resolvePanelIdxForPathPoint(p, link, i) {
    if (typeof p.panelIdx === 'number') return p.panelIdx;
    if (link?.type === 'flight') {
      if (i === 0 && typeof link.panelIdxFrom === 'number') return link.panelIdxFrom;
      if (i === (link.path?.length || 1) - 1 && typeof link.panelIdxTo === 'number') return link.panelIdxTo;
    }
    if (typeof link?.panelIdx === 'number') return link.panelIdx;
    return 0;
  }

  // —— Subspace 名称工具 ——
  // ========== 1) 从 DOM 抓取子空间名 ==========
  function getPanelNameMapFromDOM() {
    const map = {};
    // .subspace-title 可能是 <div contenteditable> / <input> / <span> 等
    const els = document.querySelectorAll('.subspace-title');
    els.forEach((el, i) => {
      // 面板索引：优先 data-panel-idx，其次 data-idx，再次顺序 i
      const idxAttr = el.dataset?.panelIdx ?? el.getAttribute('data-panel-idx') ?? el.dataset?.idx ?? el.getAttribute('data-idx');
      const panelIdx = Number.isFinite(Number(idxAttr)) ? Number(idxAttr) : i;

      // 文本：优先 input.value；否则 contentEditable 的 innerText；否则 textContent
      const raw =
        (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA') ? el.value :
        el.isContentEditable ? el.innerText :
        el.textContent;
      const name = (raw || '').trim() || `Subspace ${panelIdx}`;

      map[panelIdx] = name;
    });
    return map;
  }

  // ========== 2) 把子空间名“刻”到每条 link 上（可传入外部 map）==========
  function stampSubspaceNamesOnAllLinksUsingMap(semantic, nameMap) {
    if (!semantic || !Array.isArray(semantic.links)) return;
    const nm = nameMap || {};

    semantic.links.forEach(link => {
      const path = Array.isArray(link?.path) ? link.path : [];

      // 顶部显示（我默认做了“连续相同去重”，更友好；想完全不去重就去掉判重）
      const ordered = [];
      let last = null;

      path.forEach(pt => {
        const idx = pt?.panelIdx;
        const title = (idx != null && nm[idx] != null) ? nm[idx] : `Subspace ${idx}`;
        if (title !== last) ordered.push(title);
        last = title;
      });

      link.panelNamesByIndex = { ...nm }; // 供 LinkCard 和 prompt 的 Legend 使用
      link.panelNames = ordered;          // 顶部“Subspaces: A -> B -> C”显示
    });
  }

  // ========== 3) 统一刷新：优先用 DOM 的名字，没有就退回数据里的 ==========
  function refreshLinkNamesFromDOM() {
    if (!window.App || !App.currentData) return;
    const domMap = getPanelNameMapFromDOM();
    // 如果 DOM 为空（例如页面尚未渲染好），退回旧方法
    if (Object.keys(domMap).length === 0) {
      // 旧方法：从数据层 build
      const fallback = {};
      (App.currentData.subspaces || []).forEach((s, i) => {
        const name = s?.subspaceName || s?.title || s?.name || `Subspace ${i}`;
        fallback[i] = name;
      });
      stampSubspaceNamesOnAllLinksUsingMap(App.currentData, fallback);
    } else {
      stampSubspaceNamesOnAllLinksUsingMap(App.currentData, domMap);
    }
  }

  // ========== 4) 监听 DOM 里的标题变化，自动刷新 ==========
  function watchSubspaceTitleDOM() {
    try {
      if (window.__subspaceTitleObserver) {
        window.__subspaceTitleObserver.disconnect();
        window.__subspaceTitleObserver = null;
      }
      const root = document.body; // 或者传你子空间容器根节点
      const obs = new MutationObserver(() => {
        refreshLinkNamesFromDOM();
        // 2) 开启监听（用户改名后自动同步）
        watchSubspaceTitleDOM();
        // 如果你有事件总线导出给右侧卡片，可以一起发布
        if (typeof publishToStepAnalysis === 'function') publishToStepAnalysis();
      });
      obs.observe(root, {
        subtree: true,
        childList: true,
        characterData: true,
        attributes: true,
        attributeFilter: ['value', 'data-panel-idx', 'contenteditable']
      });
      window.__subspaceTitleObserver = obs;
    } catch (e) {
      console.warn('[watchSubspaceTitleDOM] failed:', e);
    }
  }


  // 生成 panelIdx -> subspaceName 的映射
  function getSubspaceNameMap() {
    const m = {};
    const arr = App?.currentData?.subspaces || [];
    arr.forEach((s, i) => { m[i] = (s && s.subspaceName) ? s.subspaceName : `Subspace ${i}`; });
    return m;
  }

  // 给单条 link 写入 panelNames / panelNamesByIndex
  function stampSubspaceNamesOnLink(link) {
    if (!link) return link;
    const nameByIdx = getSubspaceNameMap();
    const path = Array.isArray(link.path) ? link.path : [];
    const names = [];
    for (let i = 0; i < path.length; i++) {
      const p = path[i];
      const pIdx = resolvePanelIdxForPathPoint(p, link, i); // 你已有的工具，能处理 flight 跨子空间
      names.push(nameByIdx[pIdx] ?? `Subspace ${pIdx}`);
    }
    link.panelNames = names;            // 如 ["background","method","background", ...]（保序、不合并）
    link.panelNamesByIndex = nameByIdx; // 如 {0:"background",1:"method",...}
    return link;
  }

  // —— 从全量 semantic 数据建立 panelIdx → 子空间名 —— //
  function buildPanelNameMap(semantic) {
    const map = {};
    const subs = (semantic && Array.isArray(semantic.subspaces)) ? semantic.subspaces : [];
    subs.forEach(sp => {
      const idx = (sp && sp.panelIdx != null) ? sp.panelIdx : null;
      if (idx != null) {
        // 数据里字段可能是 subspaceName 或 title，兼容两种
        const name = sp.subspaceName || sp.title || `Subspace ${idx}`;
        map[idx] = name;
      }
    });
    return map;
  }

  // —— 把子空间名信息“刻到”每一条 link 上 —— //
  function stampSubspaceNamesOnAllLinks(semantic) {
    if (!semantic || !Array.isArray(semantic.links)) return;
    const nameMap = buildPanelNameMap(semantic);

    semantic.links.forEach(link => {
      const path = Array.isArray(link?.path) ? link.path : [];
      // 按路径顺序生成“子空间名序列”，并压缩连续重复（用于 LinkCard 顶部 meta 标签）
      const orderedNames = [];
      let last = null;
      path.forEach(pt => {
        const idx = (pt && pt.panelIdx != null) ? pt.panelIdx : null;
        const name = (idx != null && nameMap[idx] != null) ? nameMap[idx] : `Subspace ${idx}`;
        if (name !== last) orderedNames.push(name);
        last = name;
      });

      // 给 LinkCard 用：
      link.panelNamesByIndex = { ...nameMap };   // 索引→名称（供 summarize / 回退使用）
      link.panelNames = orderedNames;            // “A -> B -> B -> C” 压缩成 “A -> B -> C” 的显示用
    });
  }


  function findLinkById(routeId){
    return (App._lastLinks || []).find(l => linkKey(l) === routeId) || null;
  }
  function findSelectedRouteContaining(panelIdx, q, r){
    // 在已选路线中找包含这个点的路线
    for (const l of (App._lastLinks || [])) {
      if (!App.selectedRouteIds.has(linkKey(l))) continue;
      if (linkContainsNode(l, panelIdx, q, r)) return l;
    }
    return null;
  }
  function indexOfPointInLink(link, panelIdx, q, r){
    const path = Array.isArray(link?.path) ? link.path : [];
    for (let i=0;i<path.length;i++){
      const p = path[i];
      const pIdx = resolvePanelIdxForPathPoint(p, link, i);
      if (pIdx === panelIdx && p.q === q && p.r === r) return i;
    }
    return -1;
  }

  // 插入一个点到 link.path 的 anchorIndex 之后
  function insertPointAfter(link, anchorIndex, panelIdx, q, r){
    if (!link || !Array.isArray(link.path)) return;
    // 已存在就跳过
    if (indexOfPointInLink(link, panelIdx, q, r) >= 0) return;

    const newPt = { q, r, panelIdx };
    // 注意：保留 flight 的两端 panelIdxFrom/To，不需要改动
    const insertAt = Math.max(0, Math.min(anchorIndex + 1, link.path.length));
    link.path.splice(insertAt, 0, newPt);
    // anchor 往后移动一个，方便继续“顺序加点”
    App.insertMode.anchorIndex = insertAt; 
  }

  function computeColsAndItemSize(containerW) {
    const pad = (LAYOUT.PAD_H || 0) * 2;
    const usable = Math.max(0, containerW - pad);
    // 基于最小宽度+间距估算最大可放列数
    const maxByWidth = Math.max(
      LAYOUT.MIN_COLS,
      Math.min(
        LAYOUT.MAX_COLS,
        Math.floor((usable + LAYOUT.GAP) / (LAYOUT.MIN_W + LAYOUT.GAP))
      )
    );
    const cols = Math.min(LAYOUT.TARGET_COLS, Math.max(LAYOUT.MIN_COLS, maxByWidth));
    // 计算卡片宽度（夹在 MIN_W 与平均可用宽度之间）
    const itemW = Math.max(
      LAYOUT.MIN_W,
      Math.floor((usable - (cols - 1) * LAYOUT.GAP) / cols)
    );
    const itemH = Math.max(LAYOUT.MIN_H, Math.floor(itemW * LAYOUT.ASPECT));
    const totalW = cols * itemW + (cols - 1) * LAYOUT.GAP;
    const leftPad = Math.max(LAYOUT.PAD_H, Math.floor((containerW - totalW) / 2)); // 居中
    return { cols, itemW, itemH, leftPad };
  }

  function applyResponsiveLayout(force = false) {
    if (!App.playgroundEl) return;

    // 找到滚动容器并保存滚动位置
    const scroller = App.playgroundEl.closest('.mv-scroller') || App.playgroundEl.parentElement;
    const prevTop  = scroller ? scroller.scrollTop  : 0;
    const prevLeft = scroller ? scroller.scrollLeft : 0;

    const containerW = App.playgroundEl.clientWidth || 0;
    if (!containerW) return;

    const { cols, itemW, itemH, leftPad } = computeColsAndItemSize(containerW);
    const subspaces = Array.from(App.playgroundEl.querySelectorAll('.subspace'));

    // 程序性布局：屏蔽 RO 的“用户调整”标记
    App._squelchResize = true;

    subspaces.forEach((div, i) => {
      const st = App.panelStates[i] || {};
      const moved   = !!st.userMoved;
      const resized = !!st.userResized;

      // 非 force 模式，尊重用户拖拽/手动改尺寸过的卡片
      if (!force && (moved || resized)) return;

      const row = Math.floor(i / cols);
      const col = i % cols;
      const left = leftPad + col * (itemW + LAYOUT.GAP);
      const top  = STYLE.SUBSPACE_DEFAULT_TOP + row * (itemH + LAYOUT.GAP);

      Object.assign(div.style, {
        left: `${left}px`,
        top:  `${top}px`,
        width: `${itemW}px`,
        height:`${itemH}px`,
      });

      // 同步状态；force 时顺便清掉用户标记（使后续响应式还能继续生效）
      App.panelStates[i] = {
        ...(st || {}),
        left, top, width: itemW, height: itemH,
        ...(force ? { userMoved: false, userResized: false } : {})
      };

      syncContainerHeight(div);
    });

    // 估算整体高度，更新全局 overlay 尺寸
    const rows = Math.ceil(subspaces.length / cols);
    const approxHeight = STYLE.SUBSPACE_DEFAULT_TOP + rows * (itemH + LAYOUT.GAP) + 40;
    App.globalOverlayEl.setAttribute('width', App.playgroundEl.clientWidth);
    App.globalOverlayEl.setAttribute('height', Math.max(approxHeight, App.playgroundEl.clientHeight));

    // 重画连线与透明度
    drawOverlayLinesFromLinks(App._lastLinks, App.allHexDataByPanel, App.hexMapsByPanel, !!App.flightStart);
    updateHexStyles();

    // 释放静默标记并还原滚动位置
    requestAnimationFrame(() => {
      App._squelchResize = false;
      if (scroller) scroller.scrollTo({ top: prevTop, left: prevLeft, behavior: 'auto' });
    });
  }

  function computeHoverOrCountryPreview(panelIdx, q, r, { withCtrl=false, withShift=false, withAlt=false } = {}) {
    if (withAlt) {
      App._forceSingleNextClick = true;
      // 判定当前格是否冲突：同一 (q,r) 存在多个国家
      const bucket = getBucket(panelIdx, q, r);
      const isConflict = !!(bucket && bucket.countries && bucket.countries.size > 1);

      if (isConflict) {
        // 仅显示“当前子空间下的冲突区域”
        // 为了语义聚焦，仅取与鼠标所在格同一冲突国家集合有交集的冲突格
        const countriesHere = new Set(bucket.countries || []);
        return getConflictKeysInPanel(panelIdx, countriesHere);
      } else {
        // 非冲突格：按国家版图显示，并把该国家参与的冲突格也纳入当前子空间预览
        const hex = App.hexMapsByPanel[panelIdx]?.get(`${q},${r}`);
        const cid = hex?.country_id ? normalizeCountryId(hex.country_id) : null;
        if (!cid) return new Set();

        // 复制面板：仅本面板预览（国家格  该国家的冲突格）
        if (App.altIsolatedPanels.has(panelIdx)) {
          const keys = getCountryKeysInPanel(panelIdx, cid);
          const conflicts = getConflictKeysForCountryInPanel(panelIdx, cid);
          conflicts.forEach(k => keys.add(k));
          return keys;
        }
        // 跨面板：沿用原跨面板国家预览，但当前子空间下补充冲突格保证可见
        const keys = getCountryKeysAllPanels(cid);
        getConflictKeysForCountryInPanel(panelIdx, cid).forEach(k => keys.add(k));
        return keys;
      }
    }

    return ModeUI.computeHoverPreview(panelIdx, q, r, { withCtrl, withShift });
  }

  // —— Mode UI：按钮状态（绿色=active，黄色=armed），无 HUD/Chip —— //
  const ModeUI = (() => {
    // 放在 ModeUI IIFE 里
    const TIPS = {
      select:       'Select connected region',
      routeIdle:    'Select an entire route',
      routeActive:  'Route mode (click a node to pick whole line)',
      connIdle:     'Insert custom segment',
      connArmed:    'Armed: click a route node to start inserting',
      connActive:   'Insert mode: Shift-click to add; Ctrl+Shift endpoint to finish (Esc cancel, Enter commit)',
    };


    const btnSel   = document.getElementById('mode-btn-select');
    const btnRoute = document.getElementById('mode-btn-route');
    const btnConn  = document.getElementById('mode-btn-insert'); // Connect
    const btnAlt   = document.getElementById('mode-btn-alt');     // Alt / Option

    // 统一清理三个按钮的状态类
    function clearAll() {
      [btnSel, btnRoute, btnConn, btnAlt].forEach(b => {
        if (!b) return;
        b.classList.remove('is-active', 'is-armed');
      });
    }

    // —— NEW：强制默认 = Group Select（无修饰键、无路由/连线偏好） —— //
    function forceGroupDefault() {
      App.uiPref.route = false;
      App.uiPref.connectArmed = false;
      App.insertMode = null;
      App.flightStart = null;
      App.modKeys = { ...(App.modKeys||{}), ctrl:false, meta:false, shift:false, alt:false };

      // ★ 新增：彻底清理悬停预览与路线/排除态，避免回到 Group 后残影
      App.selectedRouteIds.clear();
      App.excludedHexKeys.clear();
      App.highlightedHexKeys.clear();
      recomputePersistentFromRoutes();   // 会把 persistent 与路线状态同步一遍（此时为空集）
      drawOverlayLinesFromLinks(App._lastLinks, App.allHexDataByPanel, App.hexMapsByPanel, false);
      updateHexStyles();
      publishToStepAnalysis();


      // 显示：Group 按钮绿；行为：单击走 Group 选择
      computeAndApply({ ctrl:false, meta:false, shift:false });
    }

    // —— Alt/Option 开关 —— //
    function setAlt(val) {
      App.modKeys = { ...(App.modKeys||{}), alt: !!val };
      if (val) {
        // Alt 独占：关掉 Route / Connect / 其它修饰键
        App.uiPref && (App.uiPref.route = false);
        App.uiPref && (App.uiPref.connectArmed = false);
        App.insertMode = null;
        App.modKeys.ctrl = false;
        App.modKeys.meta = false;
        App.modKeys.shift = false;
      }
      // 可选：若 Alt 会影响即时上色（如“灰化非选中”），这里顺手刷新
      updateHexStyles?.();

      stampSubspaceNamesOnAllLinks(App._lastLinks);
      refreshLinkNamesFromDOM();
      publishToStepAnalysis?.();

      // 更新按钮视觉
      const connectActive = !!App.insertMode;
      const connectArmed  = isConnectArmedNow(App.modKeys.ctrl, App.modKeys.shift);
      const routeActive   = isRouteMode(App.modKeys.ctrl || App.modKeys.meta);
      setVisualState({ connectActive, connectArmed, routeActive, altActive: !!App.modKeys.alt });

    }
    function toggleAlt() { setAlt(!(App.modKeys && App.modKeys.alt)); }

    // 绑定按钮点击
    btnAlt?.addEventListener?.('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      toggleAlt();
    });

    // 选中/多选按钮被点击时，关闭 Alt 以保持互斥
    btnSel?.addEventListener?.('click', () => setAlt(false));
    btnRoute?.addEventListener?.('click', () => setAlt(false));

    // 键盘监听（mac 上 Option 就是 Alt）
    window.addEventListener('keydown', (e) => {
      if (e.key === 'Alt' || e.altKey) setAlt(true);
      // if (e.ctrlKey || e.metaKey) setAlt(false); // 按下 Ctrl/⌘ 时互斥关闭 Alt
    }, { passive: true });
    window.addEventListener('keyup', (e) => {
      if (e.key === 'Alt' || !e.altKey) setAlt(false);
    }, { passive: true });
    window.addEventListener('blur', () => setAlt(false));


    // 路线的可见点（已被排除的点不参与高亮/预览）
    function visiblePathKeys(link) {
      const out = [];
      const path = Array.isArray(link?.path) ? link.path : [];
      for (let i = 0; i < path.length; i++) {
        const p = path[i];
        const pIdx = resolvePanelIdxForPathPoint(p, link, i);
        const k = pkey(pIdx, p.q, p.r);
        if (!App.excludedHexKeys.has(k)) out.push(k);
      }
      return out; // Array<"panelIdx|q,r">
    }

    // —— 预览工具：根据当前模式，计算鼠标悬停点应该高亮的 key 集 —— //
    function computeHoverPreview(panelIdx, q, r, { withCtrl=false, withShift=false } = {}) {
      const ctrlLike   = !!withCtrl;
      const armedNow   = isConnectArmedNow(withCtrl, withShift);   // 键盘(Ctrl+Shift) 或 按钮黄灯
      const routeMode  = isRouteMode(ctrlLike);                    // 键盘(Ctrl/⌘) 或 按钮 Route 绿灯

      const result = new Set();

      // —— Connect Active（已进入插入）优先 —— //
      if (App.insertMode) {
        // 尚未选锚点：提示“可作为锚点”的整条路线
        if (App.insertMode.awaitingAnchor) {
          (App._lastLinks || []).forEach(link => {
            if (!isSelectableRoute(link)) return;
            if (linkContainsNode(link, panelIdx, q, r)) {
              visiblePathKeys(link).forEach(k => result.add(k));
            }
          });
          return result;
        }

        // 已有锚点：高亮当前 route 全路径；并依据 armed/端点给出暗示
        const link = findLinkById(App.insertMode.routeId);
        if (link) {
          visiblePathKeys(link).forEach(k => result.add(k));

          const iIn = indexOfPointInLink(link, panelIdx, q, r);
          if (iIn >= 0) {
            const isEnd = (iIn === 0 || iIn === link.path.length - 1);
            if (isEnd && (armedNow || (withCtrl && withShift))) {
              const mate = findEndpointMate(panelIdx, q, r);
              if (mate.found) result.add(mate.mateKey);
            } else {
              const aIdx = App.insertMode.anchorIndex;
              if (aIdx >= 0) {
                const anchor = link.path[aIdx];
                const pIdxA  = resolvePanelIdxForPathPoint(anchor, link, aIdx);
                starKeys(pIdxA, anchor.q, anchor.r).forEach(k => result.add(k));
              }
              starKeys(panelIdx, q, r).forEach(k => result.add(k));
            }
          }
        }
        return result;
      }

      // —— Connect Armed（黄灯但未进入 active） —— //
      if (armedNow && !isConnectActive()) {
        (App._lastLinks || []).forEach(link => {
          if (!isSelectableRoute(link)) return;
          if (linkContainsNode(link, panelIdx, q, r)) {
            visiblePathKeys(link).forEach(k => result.add(k));
          }
        });
        return result;
      }

      // —— Route 模式 —— //
      if (routeMode) {
        // 若是从 Group 模式切过来且还没选线路，把现有选中的节点映射成整条线路
        seedSelectedRoutesFromPersistent();
        let added = false;
        (App._lastLinks || []).forEach(link => {
          if (!isSelectableRoute(link)) return;
          if (isStartOfLink(link, panelIdx, q, r)) {
            visiblePathKeys(link).forEach(k => result.add(k));
            added = true;
          }
        });
        if (!added) {
          (App._lastLinks || []).forEach(link => {
            if (!isSelectableRoute(link)) return;
            if (linkContainsNode(link, panelIdx, q, r)) {
              visiblePathKeys(link).forEach(k => result.add(k));
            }
          });
        }
        return result;
      }

      // —— Group（默认）：整条连通分量 —— //
      getComponentKeysFrom(buildUndirectedAdjacency(), pkey(panelIdx, q, r))
        .forEach(k => result.add(k));

      return result;
    }


    /**
     * setVisualState 根据当前“事实状态”上色：
     *  - connectActive：已进入插入/连线（insertMode 或 flightStart）
     *  - connectArmed：Ctrl+Shift 按下，但尚未点第一个点
     *  - routeActive：Ctrl/⌘ 按下（且不在 connect 状态）
     *  - 其余默认：Cluster Select 绿色
     */
    function setVisualState({ connectActive=false, connectArmed=false, routeActive=false, altActive=false } = {}) {

      clearAll();

      // 默认 tooltip
      btnSel  && (btnSel.title  = TIPS.select);
      btnRoute&& (btnRoute.title= TIPS.routeIdle);
      btnConn && (btnConn.title = TIPS.connIdle);

      if (connectActive) {
        btnConn?.classList.add('is-active');    // 绿
        if (btnConn) btnConn.title = TIPS.connActive;
        return;
      }
      if (connectArmed) {
        btnConn?.classList.add('is-armed');     // 黄
        if (btnConn) btnConn.title = TIPS.connArmed;
        return;
      }
      if (routeActive) {
        btnRoute?.classList.add('is-active');   // 绿
        if (btnRoute) btnRoute.title = TIPS.routeActive;
        return;
      }
      // Alt / Option 模式的提示（保持整齐：只高亮按钮，不改变默认 Group 的逻辑）
      if (altActive) {
        btnAlt?.classList.add('is-active');     // 绿
        if (btnAlt) btnAlt.title = 'Alt/Option mode';
        return;
      }
      btnSel?.classList.add('is-active');       // 绿（默认）
    }

    /**
     * computeAndApply 从“键盘/应用状态”推导视觉态：
     *  - armed：CtrlLike + Shift（且没进入 active）
     *  - active：insertMode 存在 或 flightStart 存在
     *  - route：CtrlLike（且不 armed/active）
     */
    function computeAndApply(overrides = null) {
      // 键盘态（优先读 overrides，否则读 App.modKeys）
      const { ctrl, meta, shift } = overrides || App.modKeys;
      const ctrlLike = !!(ctrl || meta);

      // 事实 active：插入模式 or 航线选择进行中
      const connectActive = !!(App.insertMode || App.flightStart);

      // 允许“按钮黄灯”（armed）在没有 Shift 的情况下保持黄色
      const connectArmed = !connectActive && ( (ctrlLike && !!shift) || App.uiPref.connectArmed );

      // 允许“按钮绿灯 Route”在没有 Ctrl 的情况下保持绿色
      const routeActive  = !connectActive && !connectArmed && ( ctrlLike || App.uiPref.route );

      const altActive = !!(App.modKeys && App.modKeys.alt);

      setVisualState({ connectActive, connectArmed, routeActive, altActive });

      // ★ 模式视觉态变化后，如有悬停，刷新一次预览
      if (App.hoveredHex) {
        const { panelIdx, q, r } = App.hoveredHex;
        const ctrlLike = overrides ? !!(overrides.ctrl || overrides.meta) : !!(App.modKeys.ctrl || App.modKeys.meta);
        const shift    = overrides ? !!overrides.shift : !!App.modKeys.shift;
        const alt      = overrides ? !!overrides.alt   : !!App.modKeys.alt;
        App.highlightedHexKeys = alt
          ? computeHoverOrCountryPreview(panelIdx, q, r, { withCtrl: ctrlLike, withShift: shift, withAlt: alt })
          : ModeUI.computeHoverPreview(panelIdx, q, r, { withCtrl: ctrlLike, withShift: shift });
        updateHexStyles();
      }

    }

    // 鼠标状态
    function wireButtons() {
      if (btnSel) {
        btnSel.addEventListener('click', () => {
          forceGroupDefault();
        });
      }
      if (btnRoute) {
        btnRoute.addEventListener('click', () => {
          //若 Connect 正在 active（绿灯），先退出（等价 Esc）
          if (App.insertMode) {
            endInsertMode(false); // 取消插入，回落
          }
          if (App.flightStart) {
            App.flightStart = null; // 取消航线起点
            drawOverlayLinesFromLinks(App._lastLinks, App.allHexDataByPanel, App.hexMapsByPanel, false);
            updateHexStyles();
            publishToStepAnalysis();
          }
          // 点 Route：关掉 Connect 黄灯，点亮 Route 绿灯
          App.uiPref.connectArmed = false;
          App.uiPref.route = true;
          seedSelectedRoutesFromPersistent();
          computeAndApply();
        });
      }

      if (btnConn) {
        btnConn.addEventListener('click', () => {
          const active = isConnectActive();
          const armed  = App.uiPref.connectArmed;

          if (!armed && !active) {
            // ① 空 → 黄（armed）
            App.uiPref.connectArmed = true;
            App.uiPref.route = false;        // 黄灯时不和 Route 抢态
            computeAndApply();
            return;
          }

          if (armed && !active) {
            // ② 黄 → 绿（active：进入插入模式，但先等待锚点）
            App.uiPref.connectArmed = false;
            // ★ 进入“等待锚点”的插入态（先点到一条路线上的节点作为锚点）
            App.insertMode = { routeId: null, anchorIndex: -1, inserting: true, awaitingAnchor: true };
            computeAndApply();
            return;
          }

          // ③ 绿（active） → 回到 Group（退出 Connect）
          if (active) {
            endInsertMode(false);    // 取消提交
            App.flightStart = null;
            App.uiPref.connectArmed = false;
            App.uiPref.route = false;
            drawOverlayLinesFromLinks(App._lastLinks, App.allHexDataByPanel, App.hexMapsByPanel, false);
            computeAndApply();
            return;
          }
        });
      }
    }
    wireButtons();

    // 让页面一进来就是 Group 绿灯（默认态）
    forceGroupDefault();

    return { setVisualState, computeAndApply, forceGroupDefault, computeHoverPreview };
  })();




  function beginInsertMode(route, anchorIdx){
  // removed connect-edit
  return;
}


  function endInsertMode(commit = true){
  // removed connect-edit
  return;
}

  // NEW: 给定一个点，找出“包含该点”的所有整条链路 IDs（按你重申的‘邻居=整条链路’）
  function getRouteIdsByNode(panelIdx, q, r){
    const out = new Set();
    (App._lastLinks || []).forEach(link => {
      if (!isSelectableRoute(link)) return;
      if (linkContainsNode(link, panelIdx, q, r)) out.add(linkKey(link));
    });
    return out;
  }

  // === 路线级选择：辅助 ===
  function linkKey(link){
    return link?.id || link?._uid || '';
  }
  
  // 统一的“可选择的整条线路类型”判断：road / river / flight 都计入
  function isSelectableRoute(link){
    const t = (link?.type || 'road');
    return t === 'road' || t === 'river' || t === 'flight';
  }

  function linkContainsNode(link, panelIdx, q, r){
    const path = Array.isArray(link?.path) ? link.path : [];
    for (let i=0;i<path.length;i++){
      const p = path[i];
      const pIdx = resolvePanelIdxForPathPoint(p, link, i);
      if (pIdx === panelIdx && p.q === q && p.r === r) return true;
    }
    return false;
  }
  function isStartOfLink(link, panelIdx, q, r){
    const path = Array.isArray(link?.path) ? link.path : [];
    if (path.length < 1) return false;
    const p0 = path[0];
    const pIdx0 = resolvePanelIdxForPathPoint(p0, link, 0);
    return (pIdx0 === panelIdx && p0.q === q && p0.r === r);
  }

  // 在不改动原函数的前提下，重算路线点并“保留额外单点”
  function recomputePersistentFromRoutesPreservingExtras() {
    // 1) 记录当前已选的所有点（含此前 Ctrl 叠加的单点）
    const extras = new Set(App.persistentHexKeys || []);

    // 2) 预先算出“路线上的所有点”，用于后面判断哪些是路线点
    const routeKeys = new Set();
    if (App.selectedRouteIds && App.selectedRouteIds.size > 0 && Array.isArray(App._lastLinks)) {
      (App._lastLinks || []).forEach(L => {
        const id = (typeof linkKey === 'function') ? linkKey(L) : (L && (L.id || L._uid));
        if (!id || !App.selectedRouteIds.has(id)) return;
        if (Array.isArray(L.path)) {
          L.path.forEach(p => routeKeys.add(pkey(p.panelIdx, p.q, p.r)));
        } else if (L.from && L.to) {
          routeKeys.add(pkey(L.from.panelIdx, L.from.q, L.from.r));
          routeKeys.add(pkey(L.to.panelIdx, L.to.q, L.to.r));
        }
      });
    }

    // 3) 用原有逻辑重建“路线点”到 persistentHexKeys（这一步会清空重算）
    if (typeof recomputePersistentFromRoutes === 'function') {
      recomputePersistentFromRoutes();
    }

    // 4) 把非路线的“额外点”再并回 persistentHexKeys
    const target = App.persistentHexKeys || (App.persistentHexKeys = new Set());
    extras.forEach(k => {
      if (!routeKeys.has(k)) target.add(k);
    });
  }


  // === 根据当前选中的“整条线路 + 排除点”，重建节点选集 App.persistentHexKeys ===
  function recomputePersistentFromRoutes(){
    App.persistentHexKeys.clear();
    (App._lastLinks || []).forEach(link => {
      if (!isSelectableRoute(link)) return;
      const k = linkKey(link);
      if (!App.selectedRouteIds.has(k)) return;

      const path = Array.isArray(link.path) ? link.path : [];
      for (let i=0;i<path.length;i++){
        const p = path[i];
        const pIdx = resolvePanelIdxForPathPoint(p, link, i);
        const key = `${pIdx}|${p.q},${p.r}`;
        if (!App.excludedHexKeys.has(key)) {
          App.persistentHexKeys.add(key);
        }
      }
    });
    // ★ 集合变更后立即重画
    drawOverlayLinesFromLinks(App._lastLinks, App.allHexDataByPanel, App.hexMapsByPanel, !!App.flightStart);
  
  }

  /* =========================
   * DOM/子空间
   * ========================= */
  function ensureOverlayRoot(svgSel) {
    if (svgSel.select('g.overlay-root').empty()) {
      const root = svgSel.append('g').attr('class', 'overlay-root');
      root.append('g').attr('class', 'links');   // road/river OR flight（global）
      root.append('g').attr('class', 'cities');  // 仅 panel：城市/首都
    }
    return {
      root: svgSel.select('g.overlay-root'),
      links: svgSel.select('g.overlay-root').select('g.links'),
      cities: svgSel.select('g.overlay-root').select('g.cities'),
    };
  }

  // —— 全局键盘监听：键盘抬起后的自动切换 —— //
  function wireKeyboardHints() {
    const setFromEvent = (e, down) => {
      // 只认修饰键，其他键忽略
      if (e.key === 'Control') App.modKeys.ctrl = down;
      if (e.key === 'Meta')    App.modKeys.meta = down;
      if (e.key === 'Shift')   App.modKeys.shift = down;
      if (e.key === 'Alt')     App.modKeys.alt  = down;

      ModeUI.computeAndApply();  // ← 读取 App.modKeys，自动回落

      // ★ 若正在悬停，重算预览
      if (App.hoveredHex) {
          const { panelIdx, q, r } = App.hoveredHex;
          App.highlightedHexKeys = computeHoverOrCountryPreview(panelIdx, q, r, {
            withCtrl: (App.modKeys.ctrl || App.modKeys.meta),
            withShift: App.modKeys.shift,
            withAlt:  App.modKeys.alt
          });
          updateHexStyles();
        }

      if (!down && e.key === 'Alt') {
        App.activeAltCountry = null;   // ★ 退出 ALT，清掉当前国家
      }

    };
 
    const onKeyDown = (e) => setFromEvent(e, true);
    const onKeyUp   = (e) => setFromEvent(e, false);
 
    document.addEventListener('keydown', onKeyDown);
    document.addEventListener('keyup', onKeyUp);
    cleanupFns.push(() => {
      document.removeEventListener('keydown', onKeyDown);
      document.removeEventListener('keyup', onKeyUp);
    });
 
    // 窗口失焦时重置（防止“卡住 Ctrl/Shift”）
    // 窗口失焦时：清干净修饰键 + 关闭 Route/Connect 偏好，并回到 Group
    const onBlur = () => {
      App.modKeys = { ctrl:false, meta:false, shift:false, alt:false };
      App.uiPref.route = false;
      App.uiPref.connectArmed = false;
      ModeUI.forceGroupDefault();
    };

    window.addEventListener('blur', onBlur);
    cleanupFns.push(() => window.removeEventListener('blur', onBlur));
 
    // 初始化：默认 Cluster 绿
    App.modKeys = { ctrl:false, meta:false, shift:false, alt:false };
    ModeUI.computeAndApply();
  }

  wireKeyboardHints();

  function createSubspaceElement(space, i) {
    const div = document.createElement('div');
    div.className = 'subspace';
    div.style.position = 'absolute';
    div.style.boxSizing = 'border-box';
    div.style.margin = '0';
    div.dataset.index = String(i);

    // 默认网格位置
    const offsetX = STYLE.SUBSPACE_MIN_W + STYLE.SUBSPACE_GAP;
    const offsetY = STYLE.SUBSPACE_MIN_H + STYLE.SUBSPACE_GAP;
    const defaultLeft = STYLE.SUBSPACE_DEFAULT_LEFT + offsetX * (i % 3);
    const defaultTop  = STYLE.SUBSPACE_DEFAULT_TOP  + offsetY * Math.floor(i / 3);

    // 读取持久化位置/尺寸
    const st = App.panelStates[i] || {};
    const w = Math.max(STYLE.SUBSPACE_MIN_W, st.width  ?? STYLE.SUBSPACE_MIN_W);
    const h = Math.max(STYLE.SUBSPACE_MIN_H, st.height ?? STYLE.SUBSPACE_MIN_H);
    const l = Math.max(0, st.left ?? defaultLeft);
    const t = Math.max(0, st.top  ?? defaultTop);

    Object.assign(div.style, {
      left: `${l}px`,
      top: `${t}px`,
      width: `${w}px`,
      height: `${h}px`,
      resize: 'both',
      overflow: 'hidden',
    });

    const title = document.createElement('div');
    title.className = 'subspace-title';
    title.innerText = space.subspaceName || `Subspace ${i + 1}`;
    div.appendChild(title);

    // ... 现有 addBtn 之后
    const releaseBtn = document.createElement('button');
    releaseBtn.className = 'subspace-release';
    releaseBtn.textContent = '↺';                   // 或者 'R'
    releaseBtn.title = 'Release selections in this subspace';
    releaseBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      const idxNow = Number(div.dataset.index ?? i);
      releaseSubspaceSelections(idxNow);            // ← 调用下面的新函数
    });
    div.appendChild(releaseBtn);


    const addBtn = document.createElement('button');
    addBtn.className = 'subspace-add';
    addBtn.textContent = '+';
    addBtn.title = 'Duplicate Subspace';
    addBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      const idxNow = Number(div.dataset.index ?? i);
      _duplicateSubspaceByIndex(idxNow);
    });
    div.appendChild(addBtn);

    const closeBtn = document.createElement('button');
    closeBtn.className = 'subspace-close';
    closeBtn.textContent = '×';
    closeBtn.title = 'Delete Subspace';
    closeBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      const idxNow = Number(div.dataset.index ?? i);
      _deleteSubspaceByIndex(idxNow);
    });
    div.appendChild(closeBtn);

    // 标题双击重命名
    title.addEventListener('dblclick', (evt) => {
      evt.stopPropagation();
      const idx = Number(div.dataset.index || i);
      const placeholder = `Subspace ${idx + 1}`;
      title.setAttribute('contenteditable', 'plaintext-only');
      title.focus();

      const range = document.createRange();
      range.selectNodeContents(title);
      const sel = window.getSelection();
      sel.removeAllRanges(); sel.addRange(range);

      const commit = async () => {
        const newName = (title.textContent || '').trim() || placeholder;
        title.textContent = newName;
        title.removeAttribute('contenteditable');
        if (App.currentData?.subspaces?.[idx]) {
          App.currentData.subspaces[idx].subspaceName = newName;
        }
        if (typeof App.onSubspaceRename === 'function') {
          try { await App.onSubspaceRename(idx, newName); } catch (e) { console.warn(e); }
        }
        syncContainerHeight(div, title);
      };
      const cancel = () => {
        title.removeAttribute('contenteditable');
        const old = App.currentData?.subspaces?.[idx]?.subspaceName || placeholder;
        title.textContent = old;
        syncContainerHeight(div, title);
      };

      const onBlur = () => { title.removeEventListener('keydown', onKey); commit(); };
      const onKey = (e) => {
        if (e.key === 'Enter') { e.preventDefault(); title.removeEventListener('blur', onBlur); commit(); }
        if (e.key === 'Escape') { e.preventDefault(); title.removeEventListener('blur', onBlur); cancel(); }
      };

      title.addEventListener('blur', onBlur, { once: true });
      title.addEventListener('keydown', onKey);
    });

    // 内容容器 + 两层 SVG
    const container = document.createElement('div');
    container.className = 'hex-container';
    Object.assign(container.style, { position: 'relative', width: '100%' });

    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.setAttribute('class', 'hex-svg');
    container.appendChild(svg);

    const overlay = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    overlay.setAttribute('class', 'overlay-svg');
    overlay.style.pointerEvents = 'none';
    overlay.style.zIndex = App.config.road.zIndex;
    container.appendChild(overlay);

    div.appendChild(container);
    App.playgroundEl.appendChild(div);

    // 根据标题高度扣减内容高度
    syncContainerHeight(div, title);

    // 缓存 d3 选择
    App.subspaceSvgs.push(d3.select(svg));
    App.overlaySvgs.push(d3.select(overlay));

    // 激活拖拽（标题栏）
    enableSubspaceDrag(div, i);
  }

  function syncContainerHeight(subspaceDiv, titleEl) {
    const th = (titleEl || subspaceDiv.querySelector('.subspace-title'))?.offsetHeight || 0;
    const container = subspaceDiv.querySelector('.hex-container');
    const svg = subspaceDiv.querySelector('svg.hex-svg');
    const overlay = subspaceDiv.querySelector('svg.overlay-svg');
    const cs = getComputedStyle(subspaceDiv);
    const w = parseFloat(cs.width);
    const h = parseFloat(cs.height);
    const ch = Math.max(0, h - th);
    if (container) container.style.height = `calc(100% - ${th}px)`;
    if (svg)     { svg.setAttribute('width',  w); svg.setAttribute('height', ch); }
    if (overlay) { overlay.setAttribute('width', w); overlay.setAttribute('height', ch); }
  }

  function renderPanels(subspaces) {
    Array.from(App.playgroundEl.querySelectorAll('.subspace')).forEach(el => el.remove());
    App.subspaceSvgs = [];
    App.overlaySvgs = [];
    App.hexMapsByPanel = [];
    App.allHexDataByPanel = [];
    subspaces.forEach((space, i) => createSubspaceElement(space, i));
  }

  /* =========================
   * Hex 网格渲染（每面板）
   * ========================= */
  function renderHexGridFromData(panelIdx, space, hexRadius) {
    const svg = App.subspaceSvgs[panelIdx];
    const overlay = App.overlaySvgs[panelIdx];
    if (!svg || svg.empty() || !overlay || overlay.empty()) return;
    // 确保当前面板 svg 拥有用于预览态的斜线填充
    ensureHatchPattern(svg);

    const { root: overlayRoot } = ensureOverlayRoot(overlay);
    // >>> 新增：为当前 panel 的 svg 定义斜线 pattern
    ensureHatchDefs(svg, panelIdx);

    // 尺寸计算
    const parent = svg.node().parentNode; // .hex-container
    const pcs = getComputedStyle(parent);
    let width  = pcs ? safeNum(pcs.width)  : 0;
    let height = pcs ? safeNum(pcs.height) : 0;
    if (!width)  width  = safeNum(parent?.clientWidth,  svg.node().clientWidth || 1);
    if (!height) height = safeNum(parent?.clientHeight, svg.node().clientHeight || 1);

    svg.attr('width', width).attr('height', height);
    overlay.attr('width', width).attr('height', height);

    // ★ 新增：panel 背景点击捕获（空白处点击=回到 Group 并清理选集）
    let bg = svg.select('rect.bg-capture');
    if (bg.empty()) {
      bg = svg.insert('rect', ':first-child')   // 放在最底层
        .attr('class', 'bg-capture')
        .attr('x', 0).attr('y', 0)
        .attr('fill', 'transparent')
        .on('click', (evt) => {
          // Alt + 空白：只清国家聚焦（其他逻辑照旧）
          if (evt && evt.altKey) {
            setCountryFocus(null, null);
          }

          App.selectedHex = null;
          App.neighborKeySet.clear();
          App.selectedRouteIds.clear();
          App.excludedHexKeys.clear();
          App.persistentHexKeys.clear();
          App.highlightedHexKeys.clear();
          emitSelectionPayload();
          drawOverlayLinesFromLinks(App._lastLinks, App.allHexDataByPanel, App.hexMapsByPanel, !!App.flightStart);
          App.hoveredHex = null;
          updateHexStyles();
          publishToStepAnalysis();
          ModeUI.forceGroupDefault();
        });
    }
    // 保持尺寸同步
    bg.attr('width', width).attr('height', height);

    // 容器组
    let container = svg.select('g');
    if (container.empty()) container = svg.append('g');
    // 数据坐标（平顶六边形）
    const rawHexList = (space.hexList || []).map(h => {
      const x = (3 / 4) * 2 * hexRadius * h.q;
      const y = Math.sqrt(3) * hexRadius * (h.r + h.q / 2);
      return { ...h, rawX: x, rawY: y };
    });

    const xs = rawHexList.map(h => h.rawX);
    const ys = rawHexList.map(h => h.rawY);
    const centerX = (Math.min(...xs) + Math.max(...xs)) / 2 || 0;
    const centerY = (Math.min(...ys) + Math.max(...ys)) / 2 || 0;

    const hexList = rawHexList.map(h => ({ ...h, x: h.rawX, y: h.rawY, panelIdx }));
    App.allHexDataByPanel[panelIdx] = hexList;

    // 为当前 panel 建立国家索引
    const cmap = new Map(); // country_id -> Set(keys)
    hexList.forEach(h => {
      if (!h.country_id) return;
      const normId = normalizeCountryId(h.country_id);  // ★ 归一化
      const k = `${panelIdx}|${h.q},${h.r}`;
      if (!cmap.has(normId)) cmap.set(normId, new Set());
      cmap.get(normId).add(k);
    });
    App.countryKeysByPanel[panelIdx] = cmap;

    // ★ 新增：合并到全局索引
    cmap.forEach((set, cid) => {
      if (!App.countryKeysGlobal.has(cid)) App.countryKeysGlobal.set(cid, new Set());
      const gset = App.countryKeysGlobal.get(cid);
      set.forEach(k => gset.add(k));   // k 形如 "panel|q,r"
    });

    // 初始/持久化变换
    const savedZoom = App.panelStates[panelIdx]?.zoom;
    const defaultTransform = d3.zoomIdentity
      .translate((width / 2) - centerX, (height / 2) - centerY/2)
      .scale(0.6);

    let lastTransform =
      savedZoom && isFiniteTransform(savedZoom)
        ? d3.zoomIdentity.translate(savedZoom.x, savedZoom.y).scale(savedZoom.k)
        : (isFiniteTransform(App.zoomStates[panelIdx]) ? App.zoomStates[panelIdx] : defaultTransform);

    if (!isFiniteTransform(lastTransform)) lastTransform = defaultTransform;
    if (!savedZoom && !App.zoomStates[panelIdx]) {
      App.panelStates[panelIdx] = { ...(App.panelStates[panelIdx] || {}), zoom: { k: 1, x: defaultTransform.x, y: defaultTransform.y } };
      App.zoomStates[panelIdx] = defaultTransform;
    }

    const zoom = d3.zoom()
      .scaleExtent([0.4, 3])
      .on('zoom', (event) => {
        const t = event?.transform;
        if (!isFiniteTransform(t)) return;
        container.attr('transform', t);
        overlayRoot.attr('transform', t);
        App.zoomStates[panelIdx] = t;
        App.panelStates[panelIdx] = { ...(App.panelStates[panelIdx] || {}), zoom: { k: t.k, x: t.x, y: t.y } };
        drawOverlayLinesFromLinks(App._lastLinks, App.allHexDataByPanel, App.hexMapsByPanel, !!App.flightStart);
        updateHexStyles();
      });

    svg.on('dblclick.zoom', null).call(zoom);
    const applyTransform = (t) => {
      if (!isFiniteTransform(t)) return;
      container.attr('transform', t);
      overlayRoot.attr('transform', t);
      svg.call(zoom.transform, t);
    };
    applyTransform(lastTransform);

    
    // === Build per-hex buckets to avoid overlapping ===
    var _buckets = buildBucketsForPanel(panelIdx, hexList);
    App.hexBucketsByPanel[panelIdx] = _buckets;
    recomputeMsuAlphaForPanel(panelIdx);

    var uniqueHexes = [];
    _buckets.forEach(function(b){
      // Use first item as representative for drawing (q,r kept the same)
      var rep = b.items[0];
      // Ensure q,r are explicit on the representative (some pipelines overwrite)
      rep.q = b.q; rep.r = b.r;
      uniqueHexes.push(rep);
    });

    // Ensure hatch pattern exists (for conflict visualization)
    try { ensureHatchPattern(panelIdx, svg, (App.config && App.config.countryBorder && App.config.countryBorder.color) || '#999'); } catch(e) {}
// 绑定 hex
    container.selectAll('g.hex')
      .data(uniqueHexes, d => `${d.panelIdx}_${d.q}_${d.r}`)
      .join(
        enter => {
          const g = enter.append('g').attr('class', 'hex');
          g.append('path')
            .attr('d', d3.line()(hexPoints(hexRadius)))
            .attr('fill', d => getHexFillColor(d))
            .attr('stroke', App.config.hex.borderColor)
            .attr('stroke-width', App.config.hex.borderWidth)
            .attr('fill-opacity', App.config.hex.fillOpacity);

          // >>> 新增：顶层“斜线阴影”覆盖，默认不显示（fill:none）
          g.append('path')
            .attr('class', 'hex-hatch')
            .attr('d', d3.line()(hexPoints(hexRadius)))
            .attr('fill', 'none')                 // 需要时再切到 pattern
            .style('pointer-events', 'none');     // 阴影不截获事件

          g.on('mouseover', (event, d) => {
            // // 若已经处于“国家聚焦”锁定，悬停不再改写高亮集合
            App.hoveredHex = { panelIdx, q: d.q, r: d.r };
            if (App.flightStart) App.flightHoverTarget = { panelIdx, q: d.q, r: d.r };

            const withCtrl  = isCtrlLike(event);
            const withShift = !!event.shiftKey;
            const withAlt   = !!event.altKey;

            App.highlightedHexKeys = computeHoverOrCountryPreview(
              panelIdx, d.q, d.r,
              { withCtrl, withShift, withAlt }
            );
            updateHexStyles();

            // —— Tooltip: 读取 msu 数、summary、国家颜色 —— //
            const hex = App.hexMapsByPanel?.[panelIdx]?.get(`${d.q},${d.r}`) || d;

            // 1) 统计 MSU 数
            const msuCount = Array.isArray(hex?.msu_ids) ? hex.msu_ids.length : 0;

            // 2) 读取 summary（后端放在 hex 对象上；没有就为空字符串）
            // console.log('renderHexgridfromdata', hex);    //这里就没有summary
            const summary = (hex && typeof hex.summary === 'string') ? hex.summary : '';

            // 3) 取当前“国家色”（优先用面板内覆盖色；否则用聚焦色；最后兜底基础填充）
            let color = '#A0A0A0';
            const rawCid = hex?.country_id || null;
            if (rawCid) {
              const cid = normalizeCountryId(rawCid); // 你已有
              // 你项目里面板级颜色存储在 App.panelCountryColors（Map）
              // 先查面板覆盖色
              const panelMap = App.panelCountryColors?.get(panelIdx);
              const rec = panelMap?.get?.(cid);
              if (rec?.color) {
                color = rec.color;
              } else if (App.focusCountryId && normalizeCountryId(App.focusCountryId) === cid) {
                // 聚焦中的国家就用默认聚焦色（与改色菜单默认一致）
                color = (STYLE.FOCUS_COUNTRY_FILL || '#FCFCFC');
              } else {
                // 最后兜底：按该 hex 的 modality 取基础色
                color = (hex?.modality === 'image') ? App.config.hex.imageFill
                    : (hex?.modality === 'text')  ? App.config.hex.textFill
                    : (App.config.background || '#ffffff');
              }
            }
            // 4) 显示 tooltip（用 client 坐标）
            // console.log('renderHexgridfromdata', color, msuCount, summary);
            // —— Tooltip: 统一使用“按国家分组”的模板 —— //
            const _b = getBucket(panelIdx, d.q, d.r);
            const _bucket = (_b && _b.items)
              ? _b
              : buildSingleBucket(panelIdx, d.q, d.r, hex);  // 单条也转成 bucket
            const _html = renderBucketTooltipHTML(_bucket);
            showHexTooltip(event.clientX, event.clientY, { _rawHTML: true, html: _html });

          })

          .on('mousemove', (event) => {
            moveHexTooltip(event.clientX, event.clientY);
          })

          .on('mouseout', (event, d) => {
            if (App.hoveredHex?.panelIdx === panelIdx && App.hoveredHex.q === d.q && App.hoveredHex.r === d.r) {
              App.hoveredHex = null;
            }
            // 无论是否有国家聚焦，都清理预览集合
            App.highlightedHexKeys.clear();
            updateHexStyles();
            hideHexTooltip();
          })
          
          .on('click', (event, d) => {
            App._releaseToggleByPanel?.set?.(panelIdx, false);
            event.preventDefault();
            event.stopPropagation();
            // 阻断双击序列里的单击
            if (event.detail && event.detail > 1) return;
            if (App._clickTimer) clearTimeout(App._clickTimer);

            const withCtrl = isCtrlLike(event);
            const withShift = !!event.shiftKey;
            App._clickTimer = setTimeout(() => {
              handleSingleClick(panelIdx, d.q, d.r, withCtrl, withShift);
            }, STYLE.CLICK_DELAY);
            // 统一：点击时抛出“该 hex 的完整（含多国）数据”
            if (!(App.modKeys && App.modKeys.alt)) {      // ← Alt 流程：仅预览，不抛事件
              emitHexClick(panelIdx, d.q, d.r, d);
            }

          }).on('dblclick', (event, d) => {
            event.preventDefault(); event.stopPropagation();
            if (App._clickTimer) { clearTimeout(App._clickTimer); App._clickTimer = null; }
            handleDoubleClick(panelIdx, d.q, d.r, event);
          }).on('contextmenu', (event, d) => {
              if (!App.modKeys.alt) return;
              event.preventDefault();

              const panelIdx = d.panelIdx ?? d.panel_index ?? 0;
              const q = d.q, r = d.r;
              const isConflict = isConflictHex(panelIdx, q, r);

              if (isConflict) {
                const { keys, alphaByKey } = buildConflictAlphaRampFor(panelIdx);
                App._pendingConflictEdit = {
                  panelIdx,
                  color: getConflictColorOverride(panelIdx)?.color || pickRandomColor(`conflict:${panelIdx}`),
                  keys,
                  alphaByKey
                };
                App._pendingColorEdit = null;
              } else {
                const raw = d.country_id || null;
                if (!raw) return;
                const countryId = normalizeCountryId(raw);
                const { keys, alphaByKey } = buildAlphaRampFor(panelIdx, countryId); // 你现有的方法
                App._pendingColorEdit = {
                  panelIdx,
                  countryId,
                  color: getCountryColorOverride(panelIdx, /*...*/ ) || pickRandomColor(`country:${panelIdx}:${String(countryId)}`),
                  keys,
                  alphaByKey
                };
                App._pendingConflictEdit = null;
              }

              showColorMenu(event.clientX, event.clientY,
                (App._pendingConflictEdit?.color || App._pendingColorEdit?.color || '#A9D08D')
              );
            });


          return g.attr('transform', d => `translate(${d.x},${d.y})`);
        },
        update => update.attr('transform', d => `translate(${d.x},${d.y})`),
        exit => exit.remove()
      );

    // 国家边界
    drawCountries(space, svg, hexRadius);

    // 构建 map
    const hexMap = new Map();
    // hexList.forEach(d => hexMap.set(`${d.q},${d.r}`, d));
    hexList.forEach(d => {
      // console.log('Building hexMap:', d.q, d.r, 'summary:', d.summary, 'full object:', d);
      hexMap.set(`${d.q},${d.r}`, d);
    });
    App.hexMapsByPanel[panelIdx] = hexMap;

    updateHexStyles();
  }

  function drawCountries(space, svg, hexRadius, opts = {}) {
    const focusId  = opts.focusCountryId || null;
    const focusMode= opts.focusMode || null; // 'filled'|'outline'|null
    const container = svg.select('g');
    container.selectAll('.country-border').remove();

    // 1) claimMap: (q,r) -> Set(country_id)
    const claimMap = new Map();
    (space.countries || []).forEach(cn => {
      const cid = normalizeCountryId(cn.country_id);
      (cn.hexes || []).forEach(h => {
        const k = `${h.q},${h.r}`;
        if (!claimMap.has(k)) claimMap.set(k, new Set());
        claimMap.get(k).add(cid);
      });
    });

    // 2) 像素位置索引
    const hexDict = new Map();
    container.selectAll('g.hex').each(function(d){
      hexDict.set(`${d.q},${d.r}`, { x: d.x, y: d.y });
    });
    const dirs = [[+1,0],[0,+1],[-1,+1],[-1,0],[0,-1],[+1,-1]];
    const hexCorner = (i) => {
      const ang = Math.PI/3 * i;
      return [hexRadius*Math.cos(ang), hexRadius*Math.sin(ang)];
    };
    const edgeKey = (ax,ay,bx,by) => {
      const k1 = `${ax},${ay}`, k2 = `${bx},${by}`;
      return (k1 < k2) ? `${k1}_${k2}` : `${k2}_${k1}`;
    };
    const edgeEndpoints = (cx, cy, i) => {
      const p1 = hexCorner(i);
      const p2 = hexCorner((i+1)%6);
      return [[cx+p1[0], cy+p1[1]], [cx+p2[0], cy+p2[1]]];
    };

    // 3) 两类边：otherEdges（很浅） 与 focusEdges（正常）
    const focusCid = focusId; 
    const otherEdges = new Map(); // key -> {a,b,dashed}
    const focusEdges = new Map();

    claimMap.forEach((currSet, qr) => {
      const [qStr, rStr] = qr.split(',');
      const q = +qStr, r = +rStr;
      const hex = hexDict.get(qr);
      if (!hex) return;

      for (let i=0; i<6; i++) {
        const [dq, dr] = dirs[i];
        const nq = q + dq, nr = r + dr;
        const nKey = `${nq},${nr}`;
        const nbSet = claimMap.get(nKey) || new Set(); // 邻居可为空（外部）

        // 内部边（集合相同）跳过
        const same =
          currSet.size === nbSet.size &&
          [...currSet].every(c => nbSet.has(c));
        if (same) continue;

        // 冲突：任一侧多国认领
        const dashed = (currSet.size > 1) || (nbSet.size > 1);
        const [a,b] = edgeEndpoints(hex.x, hex.y, i);
        const k = edgeKey(a[0],a[1], b[0],b[1]);

        if (!focusCid) {
          // ★ 非 Alt：如你之前的逻辑（全部国家一起画）
          const prev = otherEdges.get(k);
          if (prev) prev.dashed = prev.dashed || dashed;
          else otherEdges.set(k, { a, b, dashed });
        } else {
          // ★ Alt：只把“focus 国家格子与非 focus 邻居”的边划到 focusEdges；
          // 其余边归 other（很浅显示）
          const currHasFocus = currSet.has(focusCid);
          const nbHasFocus   = nbSet.has(focusCid);

          // 只要 curr 有 focus，且邻居“不完全相同”，且（邻居里不含 focus 或为空/他国），就是焦点外边
          if (currHasFocus && !nbHasFocus) {
            const prev = focusEdges.get(k);
            if (prev) prev.dashed = prev.dashed || dashed;
            else focusEdges.set(k, { a, b, dashed });
          } else {
            const prev = otherEdges.get(k);
            if (prev) prev.dashed = prev.dashed || dashed;
            else otherEdges.set(k, { a, b, dashed });
          }
        }
      }
    });

    // 4) 绘制
    // other：outline 模式下，其他边界完全隐藏；filled / 无聚焦则按原逻辑
    otherEdges.forEach(({a,b,dashed}) => {
      const show = focusId
        ? (focusMode === 'filled' ? true : false) // outline 不画 other
        : true;
      if (!show) return;

      container.append('line')
        .attr('class', 'country-border country-border-other')
        .attr('x1', a[0]).attr('y1', a[1])
        .attr('x2', b[0]).attr('y2', b[1])
        .attr('stroke', App.config.countryBorder.color)
        .attr('stroke-width', App.config.countryBorder.width)
        .attr('stroke-opacity', focusId ? STYLE.BORDER_ALT_OTHER : 1)
        .attr('stroke-dasharray', dashed ? '6,4' : null)
        .attr('pointer-events', 'none');
    });

    // focus：outline/filled 都画，但在 outline 下更突出
    if (focusId) {
      focusEdges.forEach(({a,b,dashed}) => {
        container.append('line')
          .attr('class', 'country-border country-border-focus')
          .attr('x1', a[0]).attr('y1', a[1])
          .attr('x2', b[0]).attr('y2', b[1])
          .attr('stroke', App.config.countryBorder.color)
          .attr('stroke-width', App.config.countryBorder.width)
          .attr('stroke-opacity', 1) // 聚焦边界始终清晰
          .attr('stroke-dasharray', dashed ? '6,4' : null)
          .attr('pointer-events', 'none');
      });
    }
  }

  /* =========================
   * Overlay（roads / rivers / cities / flights）
   * ========================= */
  function drawOverlayLinesFromLinks(links, allHexDataByPanel, hexMapsByPanel, showTempFlight=false) {
    // 清空每个 panel 的 overlay-root
    App.overlaySvgs.forEach(overlaySvg => {
      const { links, cities } = ensureOverlayRoot(overlaySvg);
      links.selectAll('*').remove();
      cities.selectAll('*').remove();
    });

    // 全局 overlay（flight 最高层）
    const gGlobal = d3.select(App.globalOverlayEl);
    const gG = ensureOverlayRoot(gGlobal);
    gG.links.selectAll('*').remove();   // flight 曲线层

    // 起点计数（城市/首都）
    const startCountPerPanel = new Map();
    const ensureCountMap = (idx) => {
      if (!startCountPerPanel.has(idx)) startCountPerPanel.set(idx, new Map());
      return startCountPerPanel.get(idx);
    };
    const bump = (idx, q, r) => {
      const m = ensureCountMap(idx);
      const k = `${q},${r}`;
      m.set(k, (m.get(k) || 0) + 1);
    };

    const getLocalXY = (panelIdx, q, r) => {
      const hex = App.hexMapsByPanel[panelIdx]?.get(`${q},${r}`);
      return hex ? [hex.x, hex.y] : null;
    };

    (links || []).forEach(link => {
      const type  = link.type || 'road';
      const style = styleOf(type);

      // 1) 原始路径 → 标准化 panelIdx
      const ptsRaw = (link.path || []).map((p, i) => ({
        panelIdx: resolvePanelIdxForPathPoint(p, link, i),
        q: p.q, r: p.r
      }));

      // 2) 若这条线路被选中：按排除点过滤（关键改动）
      let pts = ptsRaw;
      const lk = linkKey(link);
      if (App.selectedRouteIds.has(lk)) {
        pts = ptsRaw.filter(p => !App.excludedHexKeys.has(`${p.panelIdx}|${p.q},${p.r}`));
      }

      // 3) 过滤后不足两点，不画
      if (pts.length < 2) return;

      // 4) 起点计数（用于城市/首都，基于过滤后的首点）
      const p0 = pts[0];
      bump(p0.panelIdx, p0.q, p0.r);

      if (type === 'flight') {
        // 多跳 flight：逐段绘制二次贝塞尔曲线（a-b, b-c, ...）
        for (let i = 0; i < pts.length - 1; i++) {
          const a = pts[i];
          const b = pts[i + 1];

          // 可见性：逐段判断（若跨 panel 也能画，因为用的是“全局坐标”）
          if (!flightEndpointsVisible(a, b)) continue;

          const g0 = getHexGlobalXY(a.panelIdx, a.q, a.r);
          const g1 = getHexGlobalXY(b.panelIdx, b.q, b.r);
          if (!g0 || !g1) continue;

          const dx = g1[0] - g0[0], dy = g1[1] - g0[1];
          const mx = (g0[0] + g1[0]) / 2, my = (g0[1] + g1[1]) / 2;
          const curveOffset = Math.sign(dx) * style.controlCurveRatio * Math.sqrt(dx*dx + dy*dy);
          const c1x = mx + curveOffset, c1y = my - curveOffset;

          gG.links.append('path')
            .attr('d', `M${g0[0]},${g0[1]} Q${c1x},${c1y} ${g1[0]},${g1[1]}`)
            .attr('stroke', style.color)
            .attr('stroke-width', style.width)
            .attr('stroke-opacity', style.opacity)
            .attr('fill', 'none')
            .attr('stroke-dasharray', style.dash || null);
        }
      } else {
        // road/river：按过滤后的 pts 直接画，跳过被排除的中间点
        const panelIdx = pts[0].panelIdx;
        const overlaySvg = App.overlaySvgs[panelIdx];
        if (!overlaySvg) return;
        const gLines = ensureOverlayRoot(overlaySvg).links;

        const xy = pts.map(p => getLocalXY(p.panelIdx, p.q, p.r)).filter(Boolean);
        if (xy.length < 2) return;

        if (xy.length === 2) {
          gLines.append('line')
            .attr('x1', xy[0][0]).attr('y1', xy[0][1])
            .attr('x2', xy[1][0]).attr('y2', xy[1][1])
            .attr('stroke', style.color).attr('stroke-width', style.width)
            .attr('stroke-opacity', style.opacity).attr('fill', 'none')
            .attr('stroke-dasharray', style.dash || null);
        } else {
          gLines.append('polyline')
            .attr('points', xy.map(p => p.join(',')).join(' '))
            .attr('stroke', style.color).attr('stroke-width', style.width)
            .attr('stroke-opacity', style.opacity).attr('fill', 'none')
            .attr('stroke-dasharray', style.dash || null);
        }
      }
    });

    // 城市/首都（中层）—保持不变
    startCountPerPanel.forEach((map, pIdx) => {
      const overlay = App.overlaySvgs[pIdx];
      if (!overlay) return;
      const gCities = ensureOverlayRoot(overlay).cities;
      const baseR = App.config.city.radius;

      map.forEach((count, key) => {
        const [qStr, rStr] = key.split(',');
        const q = +qStr, r = +rStr;
        const hex = App.hexMapsByPanel[pIdx]?.get(`${q},${r}`);
        if (!hex) return;

        const cx = hex.x, cy = hex.y;

        if (count === 1) {
          gCities.append('circle')
            .attr('cx', cx).attr('cy', cy)
            .attr('r', baseR)
            .attr('fill', App.config.city.fill)
            .attr('stroke', App.config.city.borderColor)
            .attr('stroke-width', App.config.city.borderWidth)
            .attr('vector-effect', 'non-scaling-stroke')
            .style('pointer-events', 'none');
        } else if (count >= 2) {
          const outerR = baseR * 1.4;
          const innerR = baseR * 0.8;
          gCities.append('circle')
            .attr('cx', cx).attr('cy', cy)
            .attr('r', outerR)
            .attr('fill', App.config.city.fill)
            .attr('stroke', App.config.city.borderColor)
            .attr('stroke-width', App.config.city.borderWidth)
            .attr('vector-effect', 'non-scaling-stroke')
            .style('pointer-events', 'none');
          gCities.append('circle')
            .attr('cx', cx).attr('cy', cy)
            .attr('r', innerR)
            .attr('fill', App.config.city.capitalFill)
            .attr('stroke', App.config.city.borderColor)
            .attr('stroke-width', App.config.city.borderWidth)
            .attr('vector-effect', 'non-scaling-stroke')
            .style('pointer-events', 'none');
        }
      });

      gCities.raise();
    });

    // 临时 flight（保持不变）
    if (showTempFlight && App.flightStart) {
      const a = App.flightStart;
      const startVisible = isPointVisible(a.panelIdx, a.q, a.r);
      if (startVisible) {
        const p0 = getHexGlobalXY(a.panelIdx, a.q, a.r);
        const p1 = [App.currentMouse.x, App.currentMouse.y];
        if (p0 && p1) {
          const style = App.config.flight;
          const dx = p1[0] - p0[0], dy = p1[1] - p0[1];
          const mx = (p0[0] + p1[0]) / 2, my = (p0[1] + p1[1]) / 2;
          const curveOffset = Math.sign(dx) * style.controlCurveRatio * Math.sqrt(dx*dx + dy*dy);
          const c1x = mx + curveOffset, c1y = my - curveOffset;

          gG.links.append('path')
            .attr('d', `M${p0[0]},${p0[1]} Q${c1x},${c1y} ${p1[0]},${p1[1]}`)
            .attr('stroke', style.color)
            .attr('stroke-width', style.tempWidth)
            .attr('stroke-opacity', style.tempOpacity)
            .attr('fill', 'none')
            .attr('stroke-dasharray', style.tempDash);
        }
      }
    }
  }

  /* =========================
   * 选中/高亮样式
   * ========================= */
  function getConnectedHexKeys(panelIdx, q, r) {
    const out = new Set();
    for (const link of (App._lastLinks || [])) {
      if (link.type !== 'road' && link.type !== 'river') continue;
      const pts = (link.path || []).map((p, i) => ({
        panelIdx: resolvePanelIdxForPathPoint(p, link, i),
        q: p.q, r: p.r
      })).filter(p => p.panelIdx === panelIdx);
      if (!pts.length) continue;
      if (pts.some(p => p.q === q && p.r === r)) {
        pts.forEach(p => out.add(`${p.q},${p.r}`));
      }
    }
    return out;
  }

function updateHexStyles() {
  App.subspaceSvgs.forEach((svg, panelIdx) => {
    const override = App.panelFocusOverrides.get(panelIdx);
    const focusCid  = override && override.countryId
      ? normalizeCountryId(override.countryId)
      : (App.focusCountryId ? normalizeCountryId(App.focusCountryId) : null);
    const focusMode = override && override.mode ? override.mode : (App.focusMode || null);

    svg.selectAll('g.hex').each(function(d) {
      const core = d3.select(this).select('path.hex-core');
      if (!core.empty()) core.attr('fill', computeHexBaseFill(panelIdx, d.q, d.r, d.modality));

      const gSel  = d3.select(this);
      const path  = gSel.select('path');
      const hatch = gSel.select('path.hex-hatch');
      const key   = `${panelIdx}|${d.q},${d.r}`;

      // 基础底色（未覆盖时）
      const baseFill = getHexFillColor(d);

      // === 记录最终边框样式到缓存（供右端使用） ===
      const stroke  = path.attr('stroke') || (App?.config?.hex?.borderColor) || '#FFFFFF';
      const strokeW = Number(path.attr('stroke-width')) || (App?.config?.hex?.borderWidth) || 1;
      if (!App.borderCacheByHex) App.borderCacheByHex = new Map();
      App.borderCacheByHex.set(key, { stroke, strokeW });

      // —— 国家与 Alt 焦点 —— //
      const thisCid     = d.country_id ? normalizeCountryId(d.country_id) : null;
      const isFocusHex  = !!(focusCid && thisCid === focusCid);

      // Alt=filled：仅改变焦点国内的“填充色”，并压暗非焦点；不要统一透明度
      let focusBaseFill   = baseFill;
      let nonFocusOpacity = null;
      if (focusCid && focusMode === 'filled') {
        focusBaseFill   = isFocusHex ? STYLE.FOCUS_COUNTRY_FILL : baseFill;
        if (!isFocusHex) nonFocusOpacity = STYLE.OPACITY_NONFOCUS; // 仅非焦点压暗
      }

      // —— 覆盖色（国家） —— //
      const countryOv = thisCid ? getCountryColorOverride(panelIdx, thisCid) : null;
      const confirmedCountryAlphaMap = countryOv?.alphaByKey || null;
      let confirmedCountryColor =
        (countryOv?.color && confirmedCountryAlphaMap?.has?.(key))
          ? countryOv.color
          : null;
      
      // —— 预览（国家） —— //
      let previewColor = null;
      let previewAlpha = null;
      if (App._pendingColorEdit && isFocusHex) {
        const p = App._pendingColorEdit;
        if (p.panelIdx === panelIdx && p.countryId === thisCid && p.keys.has(key)) {
          previewColor = p.color || null;
          previewAlpha = p.alphaByKey?.get?.(key) ?? null;
        }
      }

      // —— 冲突优先：当 hex 是冲突时，用冲突覆盖 —— //
      const isConflict = isConflictHex(panelIdx, d.q, d.r);
       // ★ 关键：一旦是冲突格，屏蔽国家覆盖色（无论预览还是确认）
      if (isConflict) {
        confirmedCountryColor = null;
        previewColor = null;
        previewAlpha = null;
      }
      let confirmedConflictColor = null;
      let confirmedConflictAlphaMap = null;
      let previewConflictColor = null;
      let previewConflictAlpha = null;

      if (isConflict) {
        const cov = getConflictColorOverride(panelIdx);
        if (cov) {
          confirmedConflictColor    = cov.color || null;
          confirmedConflictAlphaMap = cov.alphaByKey || null;
        }
        if (App._pendingConflictEdit && App._pendingConflictEdit.panelIdx === panelIdx) {
          const p = App._pendingConflictEdit;
          if (p.keys.has(key)) {
            previewConflictColor = p.color || null;
            previewConflictAlpha = p.alphaByKey?.get?.(key) ?? null;
          }
        }
      }

      // —— 颜色与 alpha 选择优先级 —— //
      // 颜色：冲突预览 > 冲突已确认 > 国家预览 > 国家已确认 > 焦点底色 > 默认底色
      let finalFill =
        previewConflictColor ??
        confirmedConflictColor ??
        previewColor ??
        confirmedCountryColor ??
        focusBaseFill ??
        baseFill;

      // alpha：默认用 MSU 基线；若覆盖/预览提供 per-hex alpha，用它覆盖该格
      const msuAlpha = App.msuAlphaByHex?.get?.(key) ?? STYLE.OPACITY_DEFAULT;

      let confirmedAlpha = null;
      if (isConflict) {
        confirmedAlpha = confirmedConflictAlphaMap?.get?.(key) ?? null;
      } else {
        confirmedAlpha = confirmedCountryAlphaMap?.get?.(key) ?? null;
      }

      // 2) 基底透明度
      let baseOpacity = msuAlpha;

      // Alt 填充聚焦：压暗非焦点国家；焦点国内保留各自 MSU 透明度
      if (nonFocusOpacity != null) {
        baseOpacity = Math.min(baseOpacity, nonFocusOpacity);
      }

      // 覆盖色/预览若提供 per-hex alpha，则替换基线
      if (previewConflictAlpha != null) {
        baseOpacity = previewConflictAlpha;
      } else if (confirmedAlpha != null) {
        baseOpacity = confirmedAlpha;
      } else if (previewAlpha != null) {
        baseOpacity = previewAlpha;
      }

      // —— 交互态 —— //
      let isSelected       = App.persistentHexKeys.has(key);
      let isHovered        = !!(App.hoveredHex && App.hoveredHex.panelIdx === panelIdx && App.hoveredHex.q === d.q && App.hoveredHex.r === d.r);
      let isFlightStart    = !!(App.flightStart  && App.flightStart.panelIdx  === panelIdx && App.flightStart.q === d.q && App.flightStart.r === d.r);
      let isFlightHover    = !!(App.flightHoverTarget && App.flightHoverTarget.panelIdx === panelIdx && App.flightHoverTarget.q === d.q && App.flightHoverTarget.r === d.r);
      let inPreview        = App.highlightedHexKeys.has(key);
      let isPreviewCenter  = inPreview && isHovered;
      let isPreviewNeighbor= inPreview && !isPreviewCenter;
      // 若当前存在选中集，则所有“未选中”的格子统一压暗到非焦点透明度
      if (App.persistentHexKeys && App.persistentHexKeys.size > 0 && !isSelected) {
        // baseOpacity 是上面算好的“基底透明度”（MSU/覆盖/预览已经体现在 baseOpacity 里）
        // 这里我们在它之上再做一道压暗
        if (typeof baseOpacity === 'number') {
          baseOpacity = Math.min(baseOpacity, STYLE.OPACITY_NONFOCUS);
        }
      }

      // 3) 交互叠加透明度（不要把有覆盖色的选中态硬拉到 1）
      let overlayOpacity = STYLE.OPACITY_DEFAULT;
      // 选中态优先于 hover/preview（但保留“有覆盖色不拉满”的规则）
      if (isSelected) {
        if (!previewColor && !confirmedCountryColor && !confirmedConflictColor && previewConflictColor == null) {
          overlayOpacity = STYLE.OPACITY_SELECTED; // 只有在无覆盖色时才抬高
        } else {
          overlayOpacity = Math.max(overlayOpacity, STYLE.OPACITY_NEIGHBOR); // 有覆盖时也给点抬升
        }
      } else if (isHovered || isFlightStart || isFlightHover) {
        overlayOpacity = STYLE.OPACITY_HOVER;
      } else if (isPreviewCenter) {
        overlayOpacity = STYLE.OPACITY_PREVIEW_CENTER;
      } else if (isPreviewNeighbor) {
        overlayOpacity = STYLE.OPACITY_PREVIEW_NEIGHBOR;
      }

      let boost = Math.max(0, Math.min(1, overlayOpacity)); // overlayOpacity 改名更贴切也可
      let finalOpacity = baseOpacity + (1 - baseOpacity) * boost;

      // 写入最终透明度缓存（右侧用）
      if (!App.alphaCacheByHex) App.alphaCacheByHex = new Map();
      App.alphaCacheByHex.set(key, finalOpacity);

      // 预览邻居的斜线填充 + 应用样式
      hatch.attr('fill', isPreviewNeighbor ? `url(#hex-hatch-${panelIdx})` : 'none');
      path .attr('fill', finalFill)
           .attr('fill-opacity', finalOpacity);

      // 冲突选择态的边框专属规则
      let conflictMode = (App.lastSelectionKind === 'conflict' && App.persistentHexKeys && App.persistentHexKeys.size > 0);
      isSelected = App.persistentHexKeys && App.persistentHexKeys.has(`${panelIdx}|${d.q},${d.r}`);
      let strokeOpacity = conflictMode ? (isSelected ? STYLE.BORDER_ALT_ACTIVE : STYLE.BORDER_ALT_OTHER) : 1;
      let strokeWidth   = conflictMode ? (App.config.hex.borderWidth * (isSelected ? 1.6 : 1.0)) : App.config.hex.borderWidth;
      path.attr('stroke-opacity', strokeOpacity).attr('stroke-width', strokeWidth);
      // 普通选中态：在非冲突模式下也给边框加一点强调
      if (!conflictMode && isSelected) {
        path.attr('stroke-width', Math.max(Number(path.attr('stroke-width')) || App.config.hex.borderWidth, App.config.hex.borderWidth * 1.6));
      }
      try { applySpotlight(panelIdx); } catch(e) { console.warn(e); }

      });
  });

  // —— 边界重绘（保持你的原逻辑）—— //
  App.currentData?.subspaces?.forEach((space, i) => {
    const svg = App.subspaceSvgs[i];
    if (!svg || svg.empty()) return;

    const override = App.panelFocusOverrides.get(i);
    const focusCid  = override && override.countryId ? normalizeCountryId(override.countryId)
                                                    : (App.focusCountryId ? normalizeCountryId(App.focusCountryId) : null);
    const focusMode = override && override.mode ? override.mode : (App.focusMode || null);

    drawCountries(space, svg, App.config.hex.radius, {
      focusCountryId: focusCid,
      focusMode: focusMode
    });
  });
}


  /* =========================
   * 交互/快照
   * ========================= */
  function buildUndirectedAdjacency() {
    const adj = new Map();
    const key = (panelIdx, q, r) => `${panelIdx}|${q},${r}`;
    const ensure = (k) => { if (!adj.has(k)) adj.set(k, new Set()); return adj.get(k); };

    for (const e of (App._lastLinks || [])) {
      const path = Array.isArray(e.path) ? e.path : [];
      if (path.length < 2) continue;
      const pts = path.map((p, i) => ({
        panelIdx: resolvePanelIdxForPathPoint(p, e, i),
        q: p.q, r: p.r
      }));
      for (let i = 0; i < pts.length - 1; i++) {
        const a = pts[i], b = pts[i+1];
        const ka = key(a.panelIdx, a.q, a.r);
        const kb = key(b.panelIdx, b.q, b.r);

        // ★ 关键：如果任一端被排除了，就不要把这条边放进连通图
        if (App.excludedHexKeys.has(ka) || App.excludedHexKeys.has(kb)) continue;

        ensure(ka).add(kb);
        ensure(kb).add(ka);
      }
    }
    return adj;
  }

  // ==== NEW: 基于“整条线路”的 star：返回所有“包含 (panelIdx,q,r)” 的线路上所有点 ====
  function lineStarKeys(panelIdx, q, r, opts = { includeFlight: true }) {
    const result = new Set();
    const matchAt = (pt, link, i) => {
      const pIdx = resolvePanelIdxForPathPoint(pt, link, i);
      return pIdx === panelIdx && pt.q === q && pt.r === r;
    };

    (App._lastLinks || []).forEach(link => {
      if (!opts.includeFlight && link.type === 'flight') return; // 如需把航线也纳入一跳，改为 true
      const path = Array.isArray(link.path) ? link.path : [];
      if (!path.length) return;

      // 该线路是否包含点击点
      const hit = path.some((pt, i) => matchAt(pt, link, i));
      if (!hit) return;

      // 把该线路全路径上的点加入选中集
      path.forEach((pt, i) => {
        const pIdx = resolvePanelIdxForPathPoint(pt, link, i);
        result.add(pkey(pIdx, pt.q, pt.r));
      });
    });

    return result; // Set<"panelIdx|q,r">
  }


  // 计算某点的一跳邻居（含自身）
  function computeOneHopStar(panelIdx, q, r) {
    const center = pkey(panelIdx, q, r);
    const adj = buildUndirectedAdjacency();      // 基于全部 links（road/river/flight）构建无向图
    const star = new Set([center]);
    const nbs = adj.get(center);
    if (nbs && nbs.size) {
      nbs.forEach(nb => star.add(nb));
    }
    return star;  // Set<"panel|q,r">
  }


  function findEndpointMate(panelIdx, q, r) {
    const k = (p, q, r) => `${p}|${q},${r}`;
    for (const e of (App._lastLinks || [])) {
      const path = Array.isArray(e.path) ? e.path : [];
      if (path.length < 2) continue;
      const pts = path.map((p, i) => ({
        panelIdx: resolvePanelIdxForPathPoint(p, e, i), q: p.q, r: p.r
      }));
      const idx = pts.findIndex(p => p.panelIdx === panelIdx && p.q === q && p.r === r);
      if (idx < 0) continue;

      if (idx === 0) {
        const nb = pts[1];
        return { found: true, mateKey: k(nb.panelIdx, nb.q, nb.r) };
      }
      if (idx === pts.length - 1) {
        const nb = pts[pts.length - 2];
        return { found: true, mateKey: k(nb.panelIdx, nb.q, nb.r) };
      }
      // 中间点返回 not-found
    }
    return { found: false };
  }

  function removeSingleNode(panelIdx, q, r) {
    const key = pkey(panelIdx, q, r);
    App.persistentHexKeys.delete(key);
    App.excludedHexKeys.add(key);
  }


  // ★ NEW：从某个 key 出发，拿到“整条连通分量”（Set<key>）
   function getComponentKeysFrom(adj, startKey) {
     const visited = new Set([startKey]);
     const q = [startKey];
     while (q.length) {
       const cur = q.shift();
       for (const nb of (adj.get(cur) || new Set())) {
         if (!visited.has(nb)) { visited.add(nb); q.push(nb); }
       }
     }
     return visited;
   }
 
   // ★ NEW：批量选中/取消一个点所在的整条连通分量
   function selectComponent(panelIdx, q, r) {
      const k = pkey(panelIdx, q, r);
      const adj = buildUndirectedAdjacency();
      const comp = getComponentKeysFrom(adj, k);
      comp.forEach(kk => {
        App.persistentHexKeys.add(kk);
        App.excludedHexKeys.delete(kk);   // ★ NEW：被选中的点不应再保留“排除”标记
      });
    }

    function deselectComponent(panelIdx, q, r) {
      const k = pkey(panelIdx, q, r);
      const adj = buildUndirectedAdjacency();
      const comp = getComponentKeysFrom(adj, k);
      comp.forEach(kk => {
        App.persistentHexKeys.delete(kk);
        //（可选）也可以把 comp 内的排除清掉，看你的需求：
        // App.excludedHexKeys.delete(kk);
      });
    }

  // 在当前子空间中，按 (q,r) 收集并合并所有记录
  // —— 工具：多路兜底的“按子空间 + 坐标”聚合器 ——
  function _gatherAt(panelIdx, q, r) {
    const key = `${q},${r}`;
    let items = [];

    // 1) 直接从 buckets 取（如果你在 render 阶段已经 buildBuckets）
    try {
      const m = App?.hexBucketsByPanel?.[panelIdx];
      const b = m && typeof m.get === 'function' ? m.get(key) : null;
      if (b && Array.isArray(b.items) && b.items.length) items = items.concat(b.items);
    } catch (e) {}

    // 2) getBucket 函数（有就用）
    try {
      if (!items.length && typeof getBucket === 'function') {
        const b = getBucket(panelIdx, q, r);
        if (b && Array.isArray(b.items) && b.items.length) items = items.concat(b.items);
      }
    } catch (e) {}

    // 3) 你的“原始未去重列表”备份
    try {
      const raw = App?._rawHexListByPanel?.[panelIdx];
      if (Array.isArray(raw)) {
        items = items.concat(raw.filter(it => it && it.q === q && it.r === r));
      }
    } catch (e) {}

    // 4) 当前子空间的 hexList（有些项目会被覆盖成“唯一代表”，但也兜底尝试）
    try {
      const list = App?.currentData?.subspaces?.[panelIdx]?.hexList || [];
      if (Array.isArray(list)) {
        items = items.concat(list.filter(it => it && it.q === q && it.r === r));
      }
    } catch (e) {}

    // 5) 其它你项目里常见的缓存（可能已去重，作为最后兜底）
    try {
      const all = App?.allHexDataByPanel?.[panelIdx] || [];
      if (Array.isArray(all)) {
        items = items.concat(all.filter(it => it && it.q === q && it.r === r));
      }
    } catch (e) {}

    // —— 去掉完全重复（以 “country+msu_ids+modality” 作为签名） ——
    const seen = new Set();
    const uniq = [];
    for (const it of items) {
      if (!it) continue;
      const sig = `${_normCid(it.country_id)}|${Array.isArray(it.msu_ids) ? it.msu_ids.join(',') : ''}|${it.modality || ''}`;
      if (seen.has(sig)) continue;
      seen.add(sig);
      uniq.push(it);
    }

    if (!uniq.length) return { ok: false };

    // 国家集合
    const countries = new Set(uniq.map(it => _normCid(it.country_id)).filter(Boolean));

    // 合并 msu 并去重
    const merged_msu_ids = Array.from(new Set(
      uniq.flatMap(it => Array.isArray(it.msu_ids) ? it.msu_ids : [])
    ));

    // 分国明细（给右侧等用）
    const groupsMap = new Map();
    for (const it of uniq) {
      const cid = _normCid(it.country_id) || '—';
      if (!groupsMap.has(cid)) groupsMap.set(cid, { items: [], msu_ids: [] });
      const g = groupsMap.get(cid);
      g.items.push(it);
      if (Array.isArray(it.msu_ids)) g.msu_ids.push(...it.msu_ids);
    }
    for (const [, g] of groupsMap) g.msu_ids = Array.from(new Set(g.msu_ids));

    const first = uniq[0] || {};
    return {
      ok: true,
      items: uniq,
      countries,
      merged_msu_ids,
      groupsMap,
      representative: {
        modality: first.modality || '',
        label: first.label || key
      }
    };
  }
 
  function snapshotFromKeySet(keySet) {
    if (!keySet || keySet.size === 0) return { nodes: [], links: [] };

    const nodes = [];
    for (const k of keySet) {
      const [pStr, qr] = String(k).split('|');
      const [qStr, rStr] = qr.split(',');
      const panelIdx = parseInt(pStr, 10);
      const q = parseInt(qStr, 10);
      const r = parseInt(rStr, 10);

      // ★ 直接用多路兜底聚合器（不会被“最上层覆盖”影响）
      const agg = _gatherAt(panelIdx, q, r);
      if (!agg.ok) continue;

      const modality   = agg.representative.modality;
      const label      = agg.representative.label;
      const country_id = (agg.countries.size === 1) ? Array.from(agg.countries)[0] : null; // 多国 → null
      const msu_ids    = agg.merged_msu_ids;
      const msu        = (typeof resolveMSUs === 'function') ? resolveMSUs(msu_ids) : msu_ids;

      nodes.push({
        id: `${panelIdx}:${q},${r}`,
        panelIdx, q, r,
        label, modality, country_id,
        msu_ids, msu,
        conflict: agg.countries.size > 1
      });
    }

    // ===== 下面是你原来的“切段生成 links”逻辑，保持不变 =====
    const links = [];
    const inSet = (p) => keySet.has(`${p.panelIdx}|${p.q},${p.r}`);
    const usedKeys = new Set();

    for (const e of (App._lastLinks || [])) {
      const rawPts = Array.isArray(e.path) ? e.path : [];
      if (rawPts.length < 2) continue;
      const norm = rawPts.map((p, i) => ({
        panelIdx: resolvePanelIdxForPathPoint(p, e, i), q: p.q, r: p.r
      }));

      let run = [];
      const flush = () => {
        if (run.length >= 2) {
          run.forEach(pt => usedKeys.add(`${pt.panelIdx}|${pt.q},${pt.r}`));
          const panels = Array.from(new Set(run.map(pt => pt.panelIdx)));
          const panelNames = panels.map(idx => App.currentData?.subspaces?.[idx]?.subspaceName || `Subspace ${idx+1}`);
          const first = run[0], last = run[run.length - 1];
          links.push({
            id: `${e.type || 'road'}:${first.panelIdx}:${first.q},${first.r}->${last.panelIdx}:${last.q},${last.r}`,
            type: e.type || 'road',
            path: run.map(pt => ({ panelIdx: pt.panelIdx, q: pt.q, r: pt.r })),
            panels, panelNames
          });
        }
        run = [];
      };
      for (let i = 0; i < norm.length; i++) {
        const pt = norm[i];
        if (inSet(pt)) run.push(pt); else flush();
      }
      flush();
    }

    // “孤点” single（保持原行为）
    for (const key of keySet) {
      if (usedKeys.has(String(key))) continue;
      const [pStr, qr] = String(key).split('|');
      const [qStr, rStr] = qr.split(',');
      const panelIdx = parseInt(pStr, 10);
      const q = parseInt(qStr, 10);
      const r = parseInt(rStr, 10);
      const panels = [panelIdx];
      const panelNames = [App.currentData?.subspaces?.[panelIdx]?.subspaceName || `Subspace ${panelIdx + 1}`];
      links.push({
        id: `single:${panelIdx}:${q},${r}`,
        type: 'single',
        path: [{ panelIdx, q, r }],
        panels, panelNames
      });
    }

    return { nodes, links };
  }


  function snapshotFromSelectedRoutes() {
    const nodesSet = new Set();  // 收集被选路线中“未被排除”的节点 key
    const linksOut = [];

    (App._lastLinks || []).forEach(link => {
      if (!isSelectableRoute(link)) return;
      const lk = linkKey(link);
      if (!App.selectedRouteIds.has(lk)) return;

      const raw = Array.isArray(link.path) ? link.path : [];
      // 过滤掉被排除点，同时保留原始顺序
      const filtered = [];
      for (let i=0;i<raw.length;i++){
        const p = raw[i];
        const pIdx = resolvePanelIdxForPathPoint(p, link, i);
        const key = `${pIdx}|${p.q},${p.r}`;
        if (!App.excludedHexKeys.has(key)) {
          filtered.push({ panelIdx: pIdx, q: p.q, r: p.r });
          nodesSet.add(key);
        }
      }
      if (filtered.length >= 2) {
        const panels = Array.from(new Set(filtered.map(pt => pt.panelIdx)));
        const panelNames = panels.map(idx => App.currentData?.subspaces?.[idx]?.subspaceName || `Subspace ${idx+1}`);

        linksOut.push({
          id: `${(link.type || 'road')}:${linkKey(link)}`,
          type: link.type || 'road',
          path: filtered,
          panels, panelNames
        });
      }
    });

    // nodes：从 nodesSet 萃取（改为“并集版”）
    const nodes = [];
    nodesSet.forEach(k => {
      const [pStr, qr] = k.split('|');
      const [qStr, rStr] = qr.split(',');
      const panelIdx = +pStr, q = +qStr, r = +rStr;

      // 优先：拿聚合后的 bucket（保证包含同一格的多条记录）
      const bucket = (typeof getBucketSafe === 'function')
        ? getBucketSafe(panelIdx, q, r)
        : (typeof getBucket === 'function' ? getBucket(panelIdx, q, r) : null);

      if (bucket && Array.isArray(bucket.items) && bucket.items.length) {
        const items = bucket.items;
        const modality = items[0]?.modality || '';
        const label    = items[0]?.label || `${q},${r}`;
        const countries = bucket.countries && bucket.countries.size
          ? bucket.countries
          : new Set(items.map(it => (typeof normalizeCountryId === 'function' ? normalizeCountryId(it?.country_id) : it?.country_id)).filter(Boolean));
        const country_id = (countries.size === 1) ? Array.from(countries)[0] : null;

        const msu_ids = Array.from(new Set(
          items.flatMap(it => Array.isArray(it?.msu_ids) ? it.msu_ids : [])
        ));
        const msu = (typeof resolveMSUs === 'function') ? resolveMSUs(msu_ids) : msu_ids;

        nodes.push({
          id: `${panelIdx}:${q},${r}`,
          panelIdx, q, r,
          label, modality, country_id,
          msu_ids, msu,
          conflict: countries.size > 1
        });
        return; // 已经用 bucket 成功聚合，提前返回
      }

      // 兜底：仍然保留原来的“顶层单条”逻辑，避免没有 bucket 时直接丢数据
      const hex = App.hexMapsByPanel?.[panelIdx]?.get(`${q},${r}`);
      if (hex) {
        const msu_ids = Array.isArray(hex.msu_ids) ? hex.msu_ids : [];
        const msu = (typeof resolveMSUs === 'function') ? resolveMSUs(msu_ids) : msu_ids;
        nodes.push({
          id: `${panelIdx}:${q},${r}`,
          panelIdx, q, r,
          label: hex.label || `${q},${r}`,
          modality: hex.modality || '',
          country_id: hex.country_id || null,
          msu_ids,
          msu,
          conflict: false
        });
      }
    });


    // 若完全没有选中路线（比如只点了一个且被排除），退回原有方案
    if (!linksOut.length && nodes.length) {
      return snapshotFromKeySet(App.persistentHexKeys);
    }
    console.log( nodes, linksOut );
    return { nodes, links: linksOut };
  }


  // —— 小工具：无向边 key —— //
  function undirectedEdgeKey(panelIdx, q1, r1, q2, r2) {
    const a = `${q1},${r1}`, b = `${q2},${r2}`;
    const [u, v] = (a < b) ? [a, b] : [b, a];
    return `${panelIdx}|${u}|${v}`;
  }

  // —— 单击：按“整条链路”为基本单位；Ctrl 做并/差集 —— //
  function handleSingleClick(panelIdx, q, r, withCtrl = false, withShift = false) {
    const k = pkey(panelIdx, q, r);

    // -------- Alt：只“预览”冲突块或整国，不进入选集，也不 emit --------
    if (App.modKeys && App.modKeys.alt) {
      const conflict = isConflictHex(panelIdx, q, r);
      // 清除任何待上色状态
      App._pendingConflictEdit = null;
      App._pendingColorEdit = null;
      if (App.highlightedHexKeys) App.highlightedHexKeys.clear();

      if (conflict) {
        const ramp = buildConflictAlphaRampFor(panelIdx);  // { keys:Set, alphaByKey:Map }
        App.highlightedHexKeys = new Set(ramp.keys);
        App._pendingConflictEdit = {
          panelIdx,
          keys: new Set(ramp.keys),                 // 仅用于右键“确认上色”
          color: getConflictColorOverride(panelIdx)?.color || null,
          alphaByKey: ramp.alphaByKey               // 预览透明度仍按 MSU 逻辑
        };
        App.lastSelectionKind = 'conflict-preview';
        updateHexStyles();
        return; // ← 不改 persistent、不 emit
      } else {
        // Alt 点击普通国家格：只把整国放入“高亮预览”，用于右键确认上色
        const hex = App.hexMapsByPanel?.[panelIdx]?.get(`${q},${r}`);
        const cid = hex?.country_id ? normalizeCountryId(hex.country_id) : null;
        if (cid) {
          // 差集：国家 - 冲突区（保证 Alt Click 后的“高亮/上色集合”与右键逻辑一致）
          const all = getCountryKeysInPanel(panelIdx, cid);
          const conflicts = getConflictKeysForCountryInPanel(panelIdx, cid);
          const filteredKeys = new Set([...all].filter(k => !conflicts.has(k)));

          App.highlightedHexKeys = new Set(filteredKeys);
          App._pendingColorEdit = {
            panelIdx,
            keys: new Set(filteredKeys),
            color: getCountryColorOverride(panelIdx, cid)?.color || null,
            alphaByKey: buildAlphaMapForPanelCountry(panelIdx, cid) // 该函数内部本就排冲突；保留用于透明度分配
          };

          App.lastSelectionKind = 'country-preview';
          updateHexStyles();
          return; // ← 同样不改 persistent、不 emit
        }
      }
    }

    // 普通点击前：轻量降级 Alt 聚焦（不动你的上色记录）
    degradeFocusToOutlineFor(panelIdx);

    // 清掉“预览”态
    App._pendingConflictEdit = null;
    App._pendingColorEdit = null;
    if (App.highlightedHexKeys) App.highlightedHexKeys.clear?.();

    // —— 依据“点 ⇒ 所在整条链路集合”来选择（而不是一跳邻居） —— //
    const routeIdsAtPoint = new Set();
    (App._lastLinks || []).forEach(L => {
      const t = (L && L.type) || 'road';
      const isSelectable = (t === 'flight' || t === 'road' || t === 'river');
      if (!isSelectable) return;
      try {
        if (typeof linkContainsNode === 'function') {
          if (linkContainsNode(L, panelIdx, q, r)) {
            const rid = (typeof linkKey === 'function') ? linkKey(L) : (L.id || L._uid);
            if (rid) routeIdsAtPoint.add(rid);
          }
        } else {
          // 兜底：简单判断 path 中是否含该点
          const inPath = Array.isArray(L.path) && L.path.some(p => p.panelIdx === panelIdx && p.q === q && p.r === r);
          if (inPath) {
            const rid = (typeof linkKey === 'function') ? linkKey(L) : (L.id || L._uid);
            if (rid) routeIdsAtPoint.add(rid);
          }
        }
      } catch(_) {}
    });

    const ctrlLike = withCtrl || App.modKeys?.ctrl || App.modKeys?.meta;

    if (!ctrlLike) {
      // —— 非 Ctrl：选择“该点所在的整条链路集合”；若该点不在任何链路上，则退化为仅该点 —— //
      App.selectedEdgeKeys?.clear?.();
      App.selectedRouteIds?.clear?.();

      if (routeIdsAtPoint.size > 0) {
        routeIdsAtPoint.forEach(id => App.selectedRouteIds.add(id));
        App.lastSelectionKind = 'route';
        if (typeof recomputePersistentFromRoutes === 'function') {
          recomputePersistentFromRoutes(); // 由路线级选择推导节点集
        } else {
          // 兜底：把这些链路的所有 path 点落入 persistent
          App.persistentHexKeys.clear();
          (App._lastLinks || []).forEach(L => {
            const rid = (typeof linkKey === 'function') ? linkKey(L) : (L.id || L._uid);
            if (rid && App.selectedRouteIds.has(rid) && Array.isArray(L.path)) {
              L.path.forEach(p => App.persistentHexKeys.add(pkey(p.panelIdx, p.q, p.r)));
            }
          });
        }
      } else {
        // 无链路：只选该点
        App.persistentHexKeys.clear();
        App.persistentHexKeys.add(k);
        App.lastSelectionKind = 'single';
      }

      App.selectedHex = { panelIdx, q, r };
    } else {
      // —— Ctrl：对“该点所在的整条链路集合”做并/差切换；若无链路则对单点切换 —— //
      if (!App.selectedRouteIds) App.selectedRouteIds = new Set();

      if (routeIdsAtPoint.size > 0) {
        routeIdsAtPoint.forEach(id => {
          if (App.selectedRouteIds.has(id)) App.selectedRouteIds.delete(id);
          else App.selectedRouteIds.add(id);
        });
        App.lastSelectionKind = 'route';
        if (typeof recomputePersistentFromRoutesPreservingExtras === 'function') {
          recomputePersistentFromRoutesPreservingExtras();
        } else {
          // 兜底：用当前 selectedRouteIds 回填节点集
          App.persistentHexKeys.clear();
          (App._lastLinks || []).forEach(L => {
            const rid = (typeof linkKey === 'function') ? linkKey(L) : (L.id || L._uid);
            if (rid && App.selectedRouteIds.has(rid) && Array.isArray(L.path)) {
              L.path.forEach(p => App.persistentHexKeys.add(pkey(p.panelIdx, p.q, p.r)));
            }
          });
        }
      } else {
        // 无链路：退化为单点切换
        if (App.persistentHexKeys.has(k)) App.persistentHexKeys.delete(k);
        else App.persistentHexKeys.add(k);
        App.lastSelectionKind = 'single';
      }

      App.selectedHex = { panelIdx, q, r };
    }

    // 清掉临时 hover 预览，避免覆盖选中态视觉
    App.highlightedHexKeys?.clear?.();

    // 统一刷新/抛数
    drawOverlayLinesFromLinks(App._lastLinks, App.allHexDataByPanel, App.hexMapsByPanel, !!App.flightStart);
    emitSelectionPayload?.();          // nodes/edges/kind
    updateHexStyles();
    refreshLinkNamesFromDOM();
    publishToStepAnalysis?.();
  }
   function commitRouteDraft() {
    const draft = App.routeDraft;
    if (!draft || !Array.isArray(draft.path) || draft.path.length < 2) {
      cancelRouteDraft();
      return;
    }
    const path = draft.path.map(p => ({ q: p.q, r: p.r, panelIdx: p.panelIdx }));
    const first = path[0], last = path[path.length-1];

    const uid = draft._uid || draft.id || ('user-' + Date.now() + '-' + Math.random().toString(36).slice(2));
    const link = {
      _uid: uid,
      id: uid,
      type: 'flight',
      panelIdxFrom: first.panelIdx,
      panelIdxTo:   last.panelIdx,
      from: { q:first.q, r:first.r, panelIdx:first.panelIdx },
      to:   { q:last.q,  r:last.r,  panelIdx:last.panelIdx  },
      path
    };

    stampSubspaceNamesOnLink(link);  
    App._lastLinks.push(link);
    
    // 清理草稿 & 临时线
    App.routeDraft = null;
    App.flightStart = null;
    App.flightDraft = null;  
      // ★ 更新选中路线集合（尊重 Ctrl 并/差集）
     if (!App.selectedRouteIds) App.selectedRouteIds = new Set();
     const rid = link.id || link._uid;
     const ctrlLike = (d3.event?.ctrlKey || App.modKeys?.ctrl || App.modKeys?.meta);
     if (rid) {
       if (ctrlLike) {
         if (App.selectedRouteIds.has(rid)) App.selectedRouteIds.delete(rid);
         else App.selectedRouteIds.add(rid);
       } else {
         App.selectedRouteIds.clear();
         App.selectedRouteIds.add(rid);
       }
     }
 
     if (typeof recomputePersistentFromRoutes === 'function') {
       recomputePersistentFromRoutesPreservingExtras();
     }
 
     drawOverlayLinesFromLinks(App._lastLinks, App.allHexDataByPanel, App.hexMapsByPanel, false);
     updateHexStyles();
     publishToStepAnalysis();

  }


  function cancelRouteDraft() {
    App.routeDraft = null;
    App.flightStart = null;
    drawOverlayLinesFromLinks(App._lastLinks, App.allHexDataByPanel, App.hexMapsByPanel, false);
    updateHexStyles();
    publishToStepAnalysis();
  }

  function handleDoubleClick(panelIdx, q, r, event) {
    const here = { panelIdx, q, r };

    // ① 第一次双击：设起点 + 进入预览（不写入持久选集）
    if (!App.flightStart && !App.flightDraft) {
      App.flightStart = here;
      const rect = App.playgroundEl.getBoundingClientRect();
      App.currentMouse.x = event.clientX - rect.left;
      App.currentMouse.y = event.clientY - rect.top;

      updateHexStyles();
      drawOverlayLinesFromLinks(App._lastLinks, App.allHexDataByPanel, App.hexMapsByPanel, true);
      publishToStepAnalysis();
      return;
    }

    // ② 双击“当前端点” => 结束构建（不清已建内容）
    const sameAsStart =
      App.flightStart &&
      App.flightStart.panelIdx === panelIdx &&
      App.flightStart.q === q &&
      App.flightStart.r === r;

    if (sameAsStart && App.flightDraft) {
      const d = App.flightDraft;

      // （保险）若当前端点未写入 path，则补上
      const last = d.path[d.path.length - 1];
      if (!(last.panelIdx === here.panelIdx && last.q === here.q && last.r === here.r)) {
        d.path.push(here);
      }

       // ★ 选中整条新建航线（路线级）——支持 Ctrl 并/差集
       const rid = (typeof linkKey === 'function') ? linkKey(d) : (d.id || d._uid);
       if (!App.selectedRouteIds) App.selectedRouteIds = new Set();
       const ctrlLike = event?.ctrlKey || App.modKeys?.ctrl || App.modKeys?.meta;
       if (rid) {
         if (ctrlLike) {
           if (App.selectedRouteIds.has(rid)) App.selectedRouteIds.delete(rid);
           else App.selectedRouteIds.add(rid);
         } else {
           App.selectedRouteIds.clear();
           App.selectedRouteIds.add(rid);
         }
       }

      App.lastSelectionKind = 'route';

      // ★ 清理预览/hover/单点残留，避免端点常亮
      App.highlightedHexKeys?.clear?.();
      App.hoveredHex = null;
      App.selectedHex = null;
      App.flightHoverTarget = null;  // ← 关键：清掉航线 hover 目标
      // 结束构建状态
      App.flightStart = null;
      App.flightDraft = null;

      // ★ 路线→节点：由路线级回填持久选集并统一重绘
      if (typeof recomputePersistentFromRoutesPreservingExtras === 'function') {
        recomputePersistentFromRoutesPreservingExtras();
      }
      drawOverlayLinesFromLinks(App._lastLinks, App.allHexDataByPanel, App.hexMapsByPanel, false);
      updateHexStyles();
      if (typeof emitSelectionPayload === 'function') emitSelectionPayload();
      publishToStepAnalysis();
      return;
    }

    // ③ 追加/新建草稿
    if (!App.flightDraft) {
      // 新建一条草稿线：a -> b
      const start = App.flightStart; // 第一次必有
      const uid = 'user-' + Date.now() + '-' + Math.random().toString(36).slice(2);

      const draft = {
        type: 'flight',
        _uid: uid, // 让 buildSplitLinks 把它视作一条线
        panelIdxFrom: start.panelIdx,
        panelIdxTo:   here.panelIdx,
        from: { q: start.q, r: start.r, panelIdx: start.panelIdx },
        to:   { q, r, panelIdx },
        path: [
          { q: start.q, r: start.r, panelIdx: start.panelIdx },
          { q, r, panelIdx }
        ]
      };
      App._lastLinks.push(draft);
      App.flightDraft = draft;
    } else {
      // 已有草稿：把 here 追加为下一跳
      const d = App.flightDraft;
      const last = d.path[d.path.length - 1];
      if (!(last.panelIdx === panelIdx && last.q === q && last.r === r)) {
        d.path.push({ q, r, panelIdx });
        // 同步终点元信息
        d.panelIdxTo = panelIdx;
        d.to = { q, r, panelIdx };
      }
    }

    // ④ 更新“当前端点”为 here，用于下一段预览（拖尾从最新端点出发）
    App.flightStart = here;

    // —— 预览而非落盘：只保留当前端点（可选：也把倒数第二个点做轻微预览） —— //
    // 预览：先清旧再加新（避免 a,b,c... 残留）
    if (App.highlightedHexKeys && typeof pkey === 'function') {
      App.highlightedHexKeys.clear();                     // ★ 关键：不累计
      App.highlightedHexKeys.add(pkey(here.panelIdx, here.q, here.r));
    }

    // 预览继续：已建路径 + 当前端点 → 鼠标
    drawOverlayLinesFromLinks(App._lastLinks, App.allHexDataByPanel, App.hexMapsByPanel, true);
    updateHexStyles();
    publishToStepAnalysis();
  }


  /* =========================
   * 面板拖拽/尺寸变化/全局事件
   * ========================= */
  function enableSubspaceDrag(subspaceDiv, idxInitial) {
    const title = subspaceDiv.querySelector('.subspace-title');
    let startX, startY, origLeft, origTop;
    let isDragging = false;

    const onMouseMove = (e) => {
      if (!isDragging) return;
      const dx = e.clientX - startX;
      const dy = e.clientY - startY;
      subspaceDiv.style.left = (origLeft + dx) + 'px';
      subspaceDiv.style.top  = (origTop  + dy) + 'px';
      requestAnimationFrame(() => {
        drawOverlayLinesFromLinks(App._lastLinks, App.allHexDataByPanel, App.hexMapsByPanel, !!(App.flightStart || App.flightDraft));
      });
    };

    const onMouseUp = () => {
      if (!isDragging) return;
      isDragging = false;
      document.body.style.userSelect = '';
      const idx = Number(subspaceDiv.dataset.index ?? idxInitial);
      const left = parseFloat(subspaceDiv.style.left || '0');
      const top  = parseFloat(subspaceDiv.style.top  || '0');
      App.panelStates[idx] = { ...(App.panelStates[idx] || {}), left, top, userMoved: true };
    };

    title.addEventListener('mousedown', (e) => {
      if (e.detail === 2) return; // 双击时不拖拽
      if (title.isContentEditable) return;
      isDragging = true;
      startX = e.clientX; startY = e.clientY;
      origLeft = parseFloat(subspaceDiv.style.left || '0');
      origTop  = parseFloat(subspaceDiv.style.top  || '0');
      document.body.style.userSelect = 'none';
      e.preventDefault();
    });

    const onKeyDownGlobal = (e) => {
      if (e.key === 'Escape') {
        // 先退插入模式
        if (App.insertMode) { endInsertMode(false); }
        // 再退国家聚焦
        if (App.focusCountryId) { setCountryFocus(null); }
      }
      if (e.key === 'Enter')  { if (App.insertMode) endInsertMode(true); }
    };

    document.addEventListener('keydown', onKeyDownGlobal);
    cleanupFns.push(() => document.removeEventListener('keydown', onKeyDownGlobal));


    document.addEventListener('mousemove', onMouseMove);
    document.addEventListener('mouseup', onMouseUp);

    cleanupFns.push(() => {
      document.removeEventListener('mousemove', onMouseMove);
      document.removeEventListener('mouseup', onMouseUp);
    });
  }

function observePanelResize() {
  App.playgroundEl.querySelectorAll('.subspace').forEach((subspaceDiv) => {
    if (subspaceDiv._resizeObserver) return;
    const ro = new ResizeObserver(() => {
      const idx = Number(subspaceDiv.dataset.index ?? -1);
      const cs = getComputedStyle(subspaceDiv);
      const w = parseFloat(cs.width);
      const h = parseFloat(cs.height);
      if (idx >= 0) {
        const base = App.panelStates[idx] || {};
        // ★ 程序性布局期间只同步宽高，不打“用户”标记
        App.panelStates[idx] = {
          ...base,
          width: w,
          height: h,
          ...(App._squelchResize ? {} : { userResized: true })
        };
      }
      syncContainerHeight(subspaceDiv);
      drawOverlayLinesFromLinks(App._lastLinks, App.allHexDataByPanel, App.hexMapsByPanel, !!(App.flightStart || App.flightDraft));
      updateHexStyles();
    });
    subspaceDiv._resizeObserver = ro;
    ro.observe(subspaceDiv);
    cleanupFns.push(() => ro.disconnect());
  });
}


  // 确保全局 overlay 有根节点
  ensureOverlayRoot(d3.select(App.globalOverlayEl));

  // 初始化渲染
  function renderSemanticMapFromData(data) {
    App.currentData = data;
    App._lastLinks = data.links || [];
    stampSubspaceNamesOnAllLinks(App._lastLinks);   // ★ 写入子空间名字
    App.countryKeysGlobal = new Map();   // ★ 新增：全量重建前清空

    // ★ 给每条 link 分配稳定 id（若已有 id 则复用，否则生成 _uid）
    let _uidSeq = 0;
    (App._lastLinks || []).forEach(link => {
      if (!link) return;
      if (!link.id) link._uid = `L${_uidSeq++}`;     // 没有 id 用 _uid
    });

    renderPanels(data.subspaces || []);
    (data.subspaces || []).forEach((space, i) => renderHexGridFromData(i, space, App.config.hex.radius));
    drawOverlayLinesFromLinks(App._lastLinks, App.allHexDataByPanel, App.hexMapsByPanel, false);
    observePanelResize();
    updateHexStyles();
    publishToStepAnalysis();
    ModeUI.computeAndApply({});

    // 初次渲染后
    applyResponsiveLayout(true);

    const resizeHandler = () => {
      (data.subspaces || []).forEach((space, i) => renderHexGridFromData(i, space, App.config.hex.radius));
      drawOverlayLinesFromLinks(App._lastLinks, App.allHexDataByPanel, App.hexMapsByPanel, !!App.flightStart);
      updateHexStyles();
      App.globalOverlayEl.setAttribute('width', App.playgroundEl.clientWidth);
      App.globalOverlayEl.setAttribute('height', App.playgroundEl.clientHeight);
      applyResponsiveLayout(false);   // ← 新增：窗口变化时重新排布
    };
    window.addEventListener('resize', resizeHandler);
    cleanupFns.push(() => window.removeEventListener('resize', resizeHandler));

    const ro = new ResizeObserver(() => {
      App.globalOverlayEl.setAttribute('width', App.playgroundEl.clientWidth);
      App.globalOverlayEl.setAttribute('height', App.playgroundEl.clientHeight);
      applyResponsiveLayout(false);   // ← 新增
    });
    ro.observe(App.playgroundEl);
    cleanupFns.push(() => ro.disconnect());
  }

  // 全局鼠标（临时航线）
  const onMouseMoveGlobal = (event) => {
    if (!App.flightStart) return;
    const rect = App.playgroundEl.getBoundingClientRect();
    App.currentMouse.x = event.clientX - rect.left;
    App.currentMouse.y = event.clientY - rect.top;
    drawOverlayLinesFromLinks(App._lastLinks, App.allHexDataByPanel, App.hexMapsByPanel, true);
    updateHexStyles();
    moveHexTooltip(event.clientX, event.clientY);
  };
  document.addEventListener('mousemove', onMouseMoveGlobal);
  cleanupFns.push(() => document.removeEventListener('mousemove', onMouseMoveGlobal));

  // 点击空白：单击 = 清空并回到默认；双击 = 优先处理正在绘制的连线/起点
  const onBlankClick = (e) => {
    if (e.target !== App.playgroundEl) return;

    // —— 双击空白：优先收尾/取消 —— //
    if (e.detail === 2) {
      // 有多跳草稿：≥2 点提交；否则取消
      if (App.routeDraft && Array.isArray(App.routeDraft.path)) {
        if (App.routeDraft.path.length >= 2) {
          commitRouteDraft();   // 生成一条 {type:'flight', path:[...]} link 并 push 到 App._lastLinks
        } else {
          cancelRouteDraft();   // 清空草稿与临时线
        }
        return; // 已处理完，不再复位 UI
      }
      // 仅有旧的一跳临时起点：清掉即可
      if (App.flightStart) {
        App.flightStart = null;
        drawOverlayLinesFromLinks(App._lastLinks, App.allHexDataByPanel, App.hexMapsByPanel, false);
        updateHexStyles();
        publishToStepAnalysis();
        return; // 不复位 UI，避免用户连线时被强制切回 Group
      }
      // 若无草稿/起点，落回到“单击清空”的逻辑（不 return）
    }

    // —— 单击空白：清空一切临时/选中，并回到默认模式 —— //
    App.selectedHex = null;
    App.neighborKeySet.clear();
    App.selectedRouteIds.clear();
    App.excludedHexKeys.clear();
    App.persistentHexKeys.clear();
    App.highlightedHexKeys.clear();
    drawOverlayLinesFromLinks(App._lastLinks, App.allHexDataByPanel, App.hexMapsByPanel, !!App.flightStart);
    App.highlightedHexKeys.clear();
    App.hoveredHex = null;
    updateHexStyles();
    publishToStepAnalysis();

    // UI 复位（仅单击时复位，双击分支已提前 return）
    ModeUI.forceGroupDefault();
  };

  const onBlankDblClick = (e) => {
    if (e.target === App.playgroundEl) {
      App.flightStart = null;
      App.flightDraft = null;
      App.flightHoverTarget = null;

      // 双击空白才取消国家聚焦
      App.focusCountryId = null;
      App.highlightedHexKeys.clear();

      drawOverlayLinesFromLinks(App._lastLinks, App.allHexDataByPanel, App.hexMapsByPanel, false);
      App.highlightedHexKeys.clear();
      App.panelFocusOverrides.clear();   // 如果不想清，删掉这行

      App.hoveredHex = null;  
      updateHexStyles();
      publishToStepAnalysis();
    }
  };
  App.playgroundEl.addEventListener('click', onBlankClick);
  App.playgroundEl.addEventListener('dblclick', onBlankDblClick);
  cleanupFns.push(() => {
    App.playgroundEl.removeEventListener('click', onBlankClick);
    App.playgroundEl.removeEventListener('dblclick', onBlankDblClick);
  });

  // 首次渲染
  renderSemanticMapFromData(initialData || { subspaces: [], links: [] });
  App.globalOverlayEl.setAttribute('width', App.playgroundEl.clientWidth);
  App.globalOverlayEl.setAttribute('height', App.playgroundEl.clientHeight);

  // 主标题：双击可编辑
  if (mainTitleEl) {
    setupInlineEditableTitle(mainTitleEl, {
      getInitial: () => (
        (App.currentData?.title ?? (mainTitleEl.textContent || '').trim()) || 'Semantic Map'
      ),
      placeholder: 'Semantic Map',
      onRename: async (newText) => {
        if (!App.currentData) App.currentData = {};
        App.currentData.title = newText;
        if (typeof App.onMainTitleRename === 'function') {
          await App.onMainTitleRename(newText);
        }
      }
    });
  }

  function setupInlineEditableTitle(el, { getInitial, placeholder, onRename }) {
    if (!el) return;
    el.addEventListener('dblclick', () => {
      // 与 subspace-title 一致：使用 plaintext-only
      el.setAttribute('contenteditable', 'plaintext-only');
      el.focus();
      const range = document.createRange();
      range.selectNodeContents(el);
      const sel = window.getSelection();
      sel.removeAllRanges(); sel.addRange(range);

      const finish = async (commit = true) => {
        el.removeAttribute('contenteditable');
        if (commit) {
          const txt = (el.textContent || '').trim() || placeholder;
          el.textContent = txt;
          try { await onRename(txt); } catch (e) { console.warn(e); }
        } else {
          el.textContent = getInitial();
        }
      };
      const onBlur = () => finish(true);
      const onKey = (e) => {
        if (e.key === 'Enter') { e.preventDefault(); finish(true); }
        if (e.key === 'Escape') { e.preventDefault(); finish(false); }
      };
      el.addEventListener('blur', onBlur, { once: true });
      el.addEventListener('keydown', onKey, { once: true });
    });
  }

  /* =========================
   * 删除子空间（重建索引/连线）
   * ========================= */
  function _rebuildLinksAfterRemove(links, removedIdx) {
    const out = [];
    for (const link of links || []) {
      const touchesRemoved =
        link.panelIdx === removedIdx ||
        link.panelIdxFrom === removedIdx ||
        link.panelIdxTo === removedIdx ||
        (link.path || []).some(p => p.panelIdx === removedIdx);

      if (touchesRemoved) continue;

      const copy = JSON.parse(JSON.stringify(link));
      if (typeof copy.panelIdxFrom === 'number' && copy.panelIdxFrom > removedIdx) copy.panelIdxFrom--;
      if (typeof copy.panelIdxTo   === 'number' && copy.panelIdxTo   > removedIdx) copy.panelIdxTo--;
      if (typeof copy.panelIdx     === 'number' && copy.panelIdx     > removedIdx) copy.panelIdx--;
      if (Array.isArray(copy.path)) {
        copy.path.forEach(p => {
          if (typeof p.panelIdx === 'number' && p.panelIdx > removedIdx) p.panelIdx--;
        });
      }
      out.push(copy);
    }
    return out;
  }

function releaseSubspaceSelections(panelIdx) {
  App._releaseToggleByPanel = App._releaseToggleByPanel || new Map();
  if (App._releaseToggleByPanel.get(panelIdx)) {
    // 第二次点击 → 仅重置当前子空间的点，不清国家边界/聚焦
    resetSubspacePoints(panelIdx);
    App._releaseToggleByPanel.set(panelIdx, false);
    return;
  }
  // 第一次点击 → 执行释放效果
  App._releaseToggleByPanel.set(panelIdx, true);

  const dropKeysOfPanel = (set) => {
    if (!set || typeof set.forEach !== 'function') return;
    const toDel = [];
    set.forEach((k) => {
      const s = String(k);
      const p = s.split('|')[0];
      if (p === panelIdx) toDel.push(k);
    });
    toDel.forEach(k => set.delete(k));
  };
  dropKeysOfPanel(App.persistentHexKeys);
  dropKeysOfPanel(App.highlightedHexKeys);
  dropKeysOfPanel(App.excludedHexKeys);
  App.hoveredHex = null;
  App.flightHoverTarget = null;

  recomputePersistentFromRoutes();
  drawOverlayLinesFromLinks(App.selectedRouteIds.map(id => App.linksById.get(id)));
  updateHexStyles();
  publishToStepAnalysis();
}

function _duplicateSubspaceByIndex(srcIdx) {
  if (!App.currentData?.subspaces?.[srcIdx]) return;
  const src = App.currentData.subspaces[srcIdx];

  // 1) 深拷贝整个子空间（包含 hexList & countries）
  const cloned = JSON.parse(JSON.stringify(src));

  // ★ 在标题后追加 Copy
  cloned.subspaceName = (src.subspaceName || `Subspace${srcIdx}`) + ' Copy';

  // 2) 挂到数据上
  const newIndex = App.currentData.subspaces.length;
  App.currentData.subspaces.push(cloned);

  // 3) 渲染这个新面板
  createSubspaceElement(cloned, newIndex);
  renderHexGridFromData(newIndex, cloned, App.config.hex.radius);

  // ★ 新增：复制出来的面板 Alt 只影响自己
  App.altIsolatedPanels.add(newIndex);
  // ★ 新增：给该面板准备本地聚焦容器
  App.panelFocusOverrides.set(newIndex, { countryId: null, mode: null });

  // 4) 正常刷新
  drawOverlayLinesFromLinks(App._lastLinks, App.allHexDataByPanel, App.hexMapsByPanel, !!App.flightStart);
  updateHexStyles();
  observePanelResize();
  applyResponsiveLayout(true);
}

function _deleteSubspaceByIndex(idx) {
  if (!App.currentData || !Array.isArray(App.currentData.subspaces)) return;
  if (idx < 0 || idx >= App.currentData.subspaces.length) return;

  // ★ 保存滚动位置
  const scroller = App.playgroundEl.closest('.mv-scroller') || App.playgroundEl.parentElement;
  const prevTop  = scroller ? scroller.scrollTop  : 0;
  const prevLeft = scroller ? scroller.scrollLeft : 0;

  // 1) 删除数据与状态
  App.currentData.subspaces.splice(idx, 1);
  App.panelStates.splice(idx, 1);
  App.zoomStates.splice(idx, 1);

  // 2) 重建连线
  App._lastLinks = _rebuildLinksAfterRemove(App._lastLinks, idx);
  stampSubspaceNamesOnAllLinks(App._lastLinks);   // ★ 重建后也写入

  // 清理选集
  for (const k of Array.from(App.persistentHexKeys)) {
    const [panelStr] = k.split('|');
    if (+panelStr === idx) App.persistentHexKeys.delete(k);
  }

  // 3) 全量重绘
  renderPanels(App.currentData.subspaces || []);
  (App.currentData.subspaces || []).forEach((space, i) => {
    renderHexGridFromData(i, space, App.config.hex.radius);
  });
  drawOverlayLinesFromLinks(App._lastLinks, App.allHexDataByPanel, App.hexMapsByPanel, !!App.flightStart);
  App.highlightedHexKeys.clear();
  App.hoveredHex = null;
  updateHexStyles();
  observePanelResize();

  publishToStepAnalysis();

  // ★ 强制响应式重排（忽略 userMoved/userResized）
  applyResponsiveLayout(true);

  // ★ 恢复滚动位置（下一帧，待高度稳定后）
  requestAnimationFrame(() => {
    if (scroller) scroller.scrollTo({ top: prevTop, left: prevLeft, behavior: 'auto' });
  });
}

// 把当前主视图里“面板级国家颜色覆盖”整理成两张映射表：
// - byPanel: { "panelIdx|countryId": "#RRGGBB", ... }（优先）
// - byCountry: { countryId: "#RRGGBB", ... }（可留空/备用）
function exportMiniColorMaps() {
  const byPanel = {};   // 面板+国家 优先映射
  App.panelCountryColors.forEach((countryMap, panelIdx) => {
    countryMap.forEach((rec, countryIdRaw) => {
      const cid = normalizeCountryId(countryIdRaw);
      byPanel[`${panelIdx}|${cid}`] = rec?.color || '#FFFFFF';
    });
  });

  // 如果你暂时没有“全局国家色”，可以先留空对象
  const byCountry = {};
  return { byPanel, byCountry };
}

  /* =========================
   * 对外 API
   * ========================= */
  const controller = {
    cleanup() {
      cleanupFns.forEach(fn => fn && fn());
      d3.select(App.globalOverlayEl).selectAll('*').remove();
      App.playgroundEl.querySelectorAll('.subspace').forEach(n => n.remove());
    },
    addSubspace(space = {}) {
      if (!App.currentData) App.currentData = { subspaces: [], links: [] };
      const newIndex = App.currentData.subspaces.length;

      if (!Array.isArray(App.panelStates)) App.panelStates = [];
      App.panelStates.push({});

      const newSpace = {
        subspaceName: space.subspaceName || `Subspace ${newIndex + 1}`,
        hexList: Array.isArray(space.hexList) ? space.hexList : [],
        countries: Array.isArray(space.countries) ? space.countries : []
      };
      App.currentData.subspaces.push(newSpace);

      // ★ 保存“原始 hexList”（未去重）
      if (!Array.isArray(App._rawHexListByPanel)) App._rawHexListByPanel = [];
      App._rawHexListByPanel[newIndex] = Array.isArray(newSpace.hexList) ? newSpace.hexList.slice() : [];

      createSubspaceElement(newSpace, newIndex);
      renderHexGridFromData(newIndex, newSpace, App.config.hex.radius);

      // 可选：预建一次坐标索引
      ensureCoordIndex(newIndex);

      drawOverlayLinesFromLinks(App._lastLinks, App.allHexDataByPanel, App.hexMapsByPanel, !!App.flightStart);
      updateHexStyles();
      observePanelResize();
      applyResponsiveLayout(true);
    },
    setOnSubspaceRename(fn) {
      App.onSubspaceRename = typeof fn === 'function' ? fn : null;
    },
    deleteSubspace(idx) {
      _deleteSubspaceByIndex(idx);
    },
    duplicateSubspace(idx) { 
      _duplicateSubspaceByIndex(idx); 
    },
    setOnMainTitleRename(fn) {
      App.onMainTitleRename = typeof fn === 'function' ? fn : null;
    },
    setCountryIdAlias(aliasObj = {}) {
      App.countryIdAlias = new Map(Object.entries(aliasObj || {}));
      // 重新基于现有渲染数据构建索引，让别名立刻生效
      (App.currentData?.subspaces || []).forEach((space, i) => {
        renderHexGridFromData(i, space, App.config.hex.radius);
      });
      updateHexStyles();
    },

    pulseSelection() { publishToStepAnalysis(); },
    getSelectionSnapshot() {
      // 1) 先取“路线级快照”（若有选择）
      const hasRouteSel = App.selectedRouteIds && App.selectedRouteIds.size > 0;
      const routeSnap = hasRouteSel
        ? snapshotFromSelectedRoutes()
        : { nodes: [], links: [] };

      // 2) 计算需要并入的“额外点集”(extras) = persistentHexKeys - (路线已包含的节点)
      const keySetBase =
        (App.persistentHexKeys && App.persistentHexKeys.size)
          ? App.persistentHexKeys
          : App.highlightedHexKeys;
      const baseSet = new Set(keySetBase || []);

      let extrasSet = baseSet;
      if (hasRouteSel && Array.isArray(routeSnap?.nodes)) {
        const inRoute = new Set(
          routeSnap.nodes.map(n => `${n.panelIdx}|${n.q},${n.r}`)
        );
        extrasSet = new Set([...baseSet].filter(k => !inRoute.has(String(k))));
      }

      // 3) 用 keySet 切段，拿到额外的节点+边（含“孤点”→single）
      const extrasSnap = snapshotFromKeySet(extrasSet || new Set());

      // 4) 合并并去重（节点按 node.id 去重；边简单拼接即可，
      //    extrasSnap 已经是从 keySet 切段生成，不会跟 routeSnap.links 冲突）
      const nodeById = new Map();
      (routeSnap.nodes || []).forEach(n => nodeById.set(n.id, n));
      (extrasSnap.nodes || []).forEach(n => nodeById.set(n.id, n));

      const nodes = [...nodeById.values()];
      const links = [...(routeSnap.links || []), ...(extrasSnap.links || [])];

      // 5) meta
      const focusId = App.selectedHex
        ? `${App.selectedHex.panelIdx}:${App.selectedHex.q},${App.selectedHex.r}`
        : null;
      const mini = _buildMiniSnapshot();

      return { nodes, links, meta: { focusId, miniPalette: mini } };
    },



      // ✅ 单独提供 getMiniColorMaps 给 MainView.vue 用
      getMiniColorMaps() {
        return _buildMiniSnapshot();
      },

      // 可选
      getCountryIdNormalizer() {
        return (cid) => App.countryIdAlias?.get?.(cid) || cid;
      },

      // ★ FIX: 通过坐标直接拿该格完整信息
      // ★ 改为“按 bucket 聚合”的版本：冲突格返回并集（不再只取最上层 country）
      // ★ 通过坐标拿该格“并集版”详情（含每国分组与 MSU 并集）
      getHexDetail(panelIdx, q, r) {
        // 先试用多路兜底聚合器（你文件中已有 _gatherAt；若不存在就用 getBucketSafe）
        const agg = (typeof _gatherAt === 'function') ? _gatherAt(panelIdx, q, r) : null;
        if (agg && agg.items && agg.items.length) {
          const modality   = agg.representative.modality;
          const label      = agg.representative.label;
          const country_id = (agg.countries.size === 1) ? Array.from(agg.countries)[0] : null;
          const msu_ids    = agg.merged_msu_ids;
          const msu        = (typeof resolveMSUs === 'function') ? resolveMSUs(msu_ids) : msu_ids;
          const groups     = Array.from(agg.groupsMap.entries()).map(([cid, g]) => ({
            country_id: cid,
            items: g.items,
            msu_ids: g.msu_ids,
            msu: (typeof resolveMSUs === 'function') ? resolveMSUs(g.msu_ids) : g.msu_ids
          }));
          return { panelIdx, q, r, modality, country_id, label, msu_ids, msu, groups, conflict: agg.countries.size > 1 };
        }

        // 兜底：单条顶层
        const hex = App.hexMapsByPanel?.[panelIdx]?.get(`${q},${r}`);
        if (!hex) return null;
        const msu_ids = Array.isArray(hex.msu_ids) ? hex.msu_ids : [];
        const msu = (typeof resolveMSUs === 'function') ? resolveMSUs(msu_ids) : msu_ids;
        return {
          panelIdx, q, r,
          modality: hex.modality || '',
          country_id: hex.country_id || null,
          label: hex.label || `${q},${r}`,
          msu_ids, msu,
          groups: [],
          conflict: false
        };
      },

      // ★ FIX: 设置点击回调
      setOnHexClick(fn) {
        App.onHexClick = (typeof fn === 'function') ? fn : null;
      },

      // ① 给右侧卡片或外部调用：取当前的颜色映射快照
      getColorMaps() {
        return _buildColorMapsSnapshot();
      },

      // ②（可选）暴露基础填充，做兜底
      getBaseFillColors() {
        return {
          text:   App.config?.hex?.textFill   || '#DCDCDC',
          image:  App.config?.hex?.imageFill  || '#DCDCDC',
          def:    App.config?.background      || '#ffffff'
        };
      },


  };

  return controller;
}

export function destroySemanticMap(cleanup) {
  if (typeof cleanup === 'function') cleanup();
}


/* === Spotlight: fade unrelated hexes when a selection exists === */
function applySpotlight(panelIdx) {

  try {
    const A = (typeof App!=='undefined' && App) || (typeof window!=='undefined' && window.App) || (typeof globalThis!=='undefined' && globalThis.App) || {};
    const S = (typeof STYLE!=='undefined' && STYLE) || {};
    const svg = A.subspaceSvgs ? A.subspaceSvgs[panelIdx] : null;
    if (!svg) return;

    const hasPersistent = !!(A.persistentHexKeys && A.persistentHexKeys.size > 0);
    const hasPreview    = !!(A.highlightedHexKeys && A.highlightedHexKeys.size > 0);
    const spotlightOn   = hasPersistent || hasPreview;
    if (!spotlightOn) return;

    svg.selectAll('g.hex').each(function(d) {
      const gSel = d3.select(this);
      const path = gSel.select('path');
      const key  = `${panelIdx}|${d.q},${d.r}`;
      const inSpot = !!( (hasPersistent && A.persistentHexKeys.has(key)) || (hasPreview && A.highlightedHexKeys.has(key)) );

      if (!inSpot) {
        const baseGray = (S.HEX_FILL_TEXT || S.HEX_FILL_DEFAULT || '#DCDCDC');
        const fade = (typeof S.OPACITY_ALT_FADE === 'number') ? S.OPACITY_ALT_FADE : 0.08;
        path.attr('fill', baseGray);
        path.attr('fill-opacity', fade);
        path.attr('stroke-opacity', 0);
      } else {
        if (A._pendingConflictEdit) {
          const w = (S.HEX_BORDER_WIDTH || 1.2) * 1.6;
          path.attr('stroke-opacity', 1).attr('stroke-width', w);
        }
      }
    });

    // Optional edges
    svg.selectAll('path.edge').attr('opacity', function(){
      const id = d3.select(this).attr('data-edge-key');
      return (A.selectedEdgeKeys && A.selectedEdgeKeys.has(id)) ? 1 : 0.05;
    });
  } catch (e) {
    try { console.warn('[applySpotlight] error:', e); } catch(_){}
  }

}



// === Global contextmenu: confirm color when Alt preview is active (guarded) ===
// @semanticmap_contextmenu_guard
(function(){
  if (typeof document === 'undefined') return;
  document.addEventListener('contextmenu', function(e){
    try {
      const A = (typeof App!=='undefined' && App) || (typeof window!=='undefined' && window.App) || (typeof globalThis!=='undefined' && globalThis.App);
      if (!A) return;
      if (A._pendingConflictEdit || A._pendingColorEdit) {
        e.preventDefault();
        if (typeof showColorMenu === 'function') {
          const init = (A._pendingConflictEdit?.color) || (A._pendingColorEdit?.color) || '#A9D08D';
          showColorMenu(e.clientX||0, e.clientY||0, init);
        }
      }
    } catch(err){ try{console.warn(err);}catch(_){ } }
  }, { capture: true });
})();

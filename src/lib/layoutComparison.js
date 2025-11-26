// layoutComparison.js

// ========== 1. 预处理数据 ==========

function preprocessData(raw, options = {}) {
  const {
    maxPoints = 800,
    paperTopK = 6
  } = options;

  let data = raw.map(d => {
    return {
      x: d.x,
      y: d.y,
      paper_id: d.paper_id,
      category: d.category,
      sentence: d.sentence
    };
  });

  // 简单采样，避免示意图太密
  if (data.length > maxPoints) {
    data = d3.shuffle(data).slice(0, maxPoints);
  }

  // 统计 topK paper_id
  const counts = d3.rollup(
    data,
    v => v.length,
    d => d.paper_id
  );
  const sorted = Array.from(counts.entries()).sort((a, b) =>
    d3.descending(a[1], b[1])
  );
  const topPapers = new Set(sorted.slice(0, paperTopK).map(d => d[0]));

  data.forEach(d => {
    d.paper_group = topPapers.has(d.paper_id) ? String(d.paper_id) : 'Other';
  });

  const xExtent = d3.extent(data, d => d.x);
  const yExtent = d3.extent(data, d => d.y);

  return { data, xExtent, yExtent };
}

// ========== 2. 主入口：创建四种布局对比图 ==========

function createLayoutComparison(containerSelector, raw) {
  const { data, xExtent, yExtent } = preprocessData(raw);

  // 正方形画布，面板也尽量正方形
  const size = 1000;
  const margin = { top: 60, right: 60, bottom: 60, left: 60 };

  const innerWidth = size - margin.left - margin.right;
  const innerHeight = size - margin.top - margin.bottom;

  const cols = 2;
  const rows = 2;
  const panelW = innerWidth / cols;
  const panelH = innerHeight / rows;

  const container = d3.select(containerSelector);
  container.selectAll('*').remove();

  const svg = container.append('svg')
    .attr('width', size)
    .attr('height', size)
    .style('background', '#ffffff');

  const gRoot = svg.append('g')
    .attr('transform', `translate(${margin.left},${margin.top})`);

  const xScale = d3.scaleLinear().domain(xExtent).range([20, panelW - 20]);
  const yScale = d3.scaleLinear().domain(yExtent).range([panelH - 20, 20]); // 上下翻转

  const groups = Array.from(new Set(data.map(d => d.paper_group)));
  const color = d3.scaleOrdinal()
    .domain(groups)
    .range(d3.schemeTableau10);

  const panels = [
    { title: 'Scatterplot', render: renderScatter },
    { title: 'Rectangular grid', render: renderRectGrid },
    { title: 'Voronoi', render: renderVoronoi },
    { title: 'Hexagonal tiling', render: renderHexTiling }
  ];

  panels.forEach((p, i) => {
    const col = i % cols;
    const row = Math.floor(i / cols);

    const gx = gRoot.append('g')
      .attr('transform', `translate(${col * panelW},${row * panelH})`);

    // 背景框
    gx.append('rect')
      .attr('x', 0)
      .attr('y', 0)
      .attr('width', panelW)
      .attr('height', panelH)
      .attr('fill', '#fafafa')
      .attr('stroke', '#e5e7eb');

    // 不再绘制标题文字（去掉 panel 类型标签）

    const gInner = gx.append('g')
      .attr('transform', `translate(0, 0)`);

    p.render(gInner, data, {
      panelW,
      panelH,
      xScale,
      yScale,
      color
    });
  });
}

// ========== 3. 各布局渲染函数 ==========

// 3.1 Scatterplot
function renderScatter(g, data, ctx) {
  const { xScale, yScale, color } = ctx;

  const plot = g.append('g');

  plot.selectAll('circle')
    .data(data)
    .join('circle')
    .attr('cx', d => xScale(d.x))
    .attr('cy', d => yScale(d.y))
    .attr('r', 2.2)
    .attr('fill', d => color(d.paper_group))
    .attr('fill-opacity', 0.35);
}

// 3.2 Rectangular grid 聚合（Y 方向修正 + 冲突不填色）

// 3.2 Rectangular grid 聚合（Y 方向修正 + 冲突不填色，虚线在上层且不重合）
function renderRectGrid(g, data, ctx) {
  const { panelW, panelH, color } = ctx;

  const gridCols = 24;
  const gridRows = 24;

  const cellW = (panelW - 40) / gridCols;
  const cellH = (panelH - 40) / gridRows;

  const xMin = d3.min(data, d => d.x);
  const xMax = d3.max(data, d => d.x);
  const yMin = d3.min(data, d => d.y);
  const yMax = d3.max(data, d => d.y);

  function toGrid(d) {
    const nx = (d.x - xMin) / (xMax - xMin + 1e-9);
    const ny = 1 - (d.y - yMin) / (yMax - yMin + 1e-9); // 反转 y

    const gx = Math.max(0, Math.min(gridCols - 1, Math.floor(nx * gridCols)));
    const gy = Math.max(0, Math.min(gridRows - 1, Math.floor(ny * gridRows)));
    return `${gx},${gy}`;
  }

  const cells = d3.rollup(
    data,
    v => {
      const count = v.length;
      const groupCounts = d3.rollup(
        v,
        vv => vv.length,
        d => d.paper_group
      );
      const groups = Array.from(groupCounts.keys());
      const dominant = groups.slice().sort((a, b) =>
        d3.descending(groupCounts.get(a), groupCounts.get(b))
      )[0];
      const conflict = groups.length > 1;
      return { count, dominant, conflict };
    },
    toGrid
  );

  const entries = Array.from(cells.entries());
  const nonConflict = entries.filter(d => !d[1].conflict);
  const conflict = entries.filter(d => d[1].conflict);

  const plot = g.append('g')
    .attr('transform', `translate(20, 20)`);

  // 先画非冲突格子（有填色 + 浅描边）
  plot.append('g')
    .selectAll('rect')
    .data(nonConflict)
    .join('rect')
    .attr('x', d => {
      const [gx] = d[0].split(',').map(Number);
      return gx * cellW;
    })
    .attr('y', d => {
      const [, gy] = d[0].split(',').map(Number);
      return gy * cellH;
    })
    .attr('width', cellW)
    .attr('height', cellH)
    .attr('fill', d => color(d[1].dominant))
    .attr('fill-opacity', d =>
      Math.min(0.85, 0.2 + 0.6 * Math.log(1 + d[1].count) / Math.log(10))
    )
    .attr('stroke', '#e5e7eb')
    .attr('stroke-width', 0.2);

  // 再画冲突格子轮廓：略微内缩，避免边界完全重合
  const inset = 0.8; // 向内收缩的像素

  plot.append('g')
    .selectAll('rect')
    .data(conflict)
    .join('rect')
    .attr('x', d => {
      const [gx] = d[0].split(',').map(Number);
      return gx * cellW + inset;
    })
    .attr('y', d => {
      const [, gy] = d[0].split(',').map(Number);
      return gy * cellH + inset;
    })
    .attr('width', cellW - 2 * inset)
    .attr('height', cellH - 2 * inset)
    .attr('fill', 'none')
    .attr('stroke', '#636363ff')
    .attr('stroke-width', 0.5)
    .attr('stroke-dasharray', '1.5,1');
}

// 3.3 Voronoi 布局（细粒度：每个点一个 cell，不做冲突编码）
function renderVoronoi(g, data, ctx) {
  const { panelW, panelH, xScale, yScale, color } = ctx;

  // 使用每个点作为 Voronoi 种子
  const points = data.map(d => [xScale(d.x), yScale(d.y), d.paper_group]);

  // 构建 Delaunay 与 Voronoi
  const delaunay = d3.Delaunay.from(points, d => d[0], d => d[1]);
  const voronoi = delaunay.voronoi([10, 10, panelW - 10, panelH - 10]);

  const plot = g.append('g');

  // 为每个点对应的 Voronoi cell 画一个 polygon
  for (let i = 0; i < points.length; i++) {
    const path = voronoi.renderCell(i);
    if (!path) continue;

    plot.append('path')
      .attr('d', path)
      .attr('fill', color(points[i][2]))   // 仍然按 paper_group 上色
      .attr('fill-opacity', 0.7)
      .attr('stroke', '#f9fafb')          // cell 之间浅分隔线
      .attr('stroke-width', 0.4);
  }
}

// 3.4 Hexagonal tiling 布局（与 Rect 同粒度 / 冲突不填色，虚线在上层且略缩小）
function renderHexTiling(g, data, ctx) {
  const { panelW, panelH, xScale, yScale, color } = ctx;

  const plot = g.append('g');

  const points = data.map(d => [xScale(d.x), yScale(d.y), d.paper_group]);

  const targetCols = 24;
  const hexRadius = (panelW - 40) / (targetCols * 2);

  const hexbin = d3.hexbin()
    .radius(hexRadius)
    .extent([[20, 20], [panelW - 20, panelH - 20]]);

  const bins = hexbin(points);

  const cells = bins.map(bin => {
    const groupCounts = d3.rollup(
      bin,
      v => v.length,
      p => p[2]
    );
    const groups = Array.from(groupCounts.keys());
    const dominant = groups.slice().sort((a, b) =>
      d3.descending(groupCounts.get(a), groupCounts.get(b))
    )[0];
    const conflict = groups.length > 1;
    const count = bin.length;
    return {
      x: bin.x,
      y: bin.y,
      dominant,
      conflict,
      count
    };
  });

  const nonConflict = cells.filter(d => !d.conflict);
  const conflict = cells.filter(d => d.conflict);

  // 先画非冲突 hex：有填色 + 浅描边
  const hexPolygon = hexbin.hexagon(); // 默认半径的路径

  plot.append('g')
    .selectAll('path')
    .data(nonConflict)
    .join('path')
    .attr('transform', d => `translate(${d.x},${d.y})`)
    .attr('d', hexPolygon)
    .attr('fill', d => color(d.dominant))
    .attr('fill-opacity', d =>
      Math.min(0.9, 0.25 + 0.6 * Math.log(1 + d.count) / Math.log(10))
    )
    .attr('stroke', '#e5e7eb')
    .attr('stroke-width', 0.3);

  // 再画冲突 hex：缩放一下，只画虚线轮廓
  const conflictScale = 0.9; // 比原 hex 稍微缩小一点

  plot.append('g')
    .selectAll('path')
    .data(conflict)
    .join('path')
    .attr('transform', d => `translate(${d.x},${d.y}) scale(${conflictScale})`)
    .attr('d', hexPolygon)
    .attr('fill', 'none')
    .attr('stroke', '#636363ff')
    .attr('stroke-width', 0.5)
    .attr('stroke-dasharray', '1.5,1');
}


// 暴露主函数
window.createLayoutComparison = createLayoutComparison;

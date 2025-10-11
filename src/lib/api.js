export async function fetchSemanticMap() {
  const res = await fetch('/api/semantic-map');
  if (!res.ok) throw new Error('Failed to load semantic map');
  return res.json();
}

export async function createSubspace(payload) {
  const res = await fetch('/api/subspaces', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload || {})
  });
  if (!res.ok) throw new Error('Failed to create subspace');
  return res.json();
}

export async function renameSubspace(idx, name) {
  const res = await fetch(`/api/subspaces/${idx}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ subspaceName: name })
  });
  if (!res.ok) throw new Error('Failed to rename subspace');
  return res.json();
}

export async function renameMapTitle(newTitle){
  // 按你的真实 API 调整 URL / method / body
  await fetch('/api/semantic-map/title', {
    method: 'POST',
    headers: { 'Content-Type':'application/json' },
    body: JSON.stringify({ title: newTitle })
  })
}

export async function sendQueryToLLM(query, llm = 'ChatGPT') {
  const res = await fetch('/api/query', {
    method: 'POST',
    headers: { 'Content-Type':'application/json' },
    body: JSON.stringify({ query, model: llm === 'QWen' ? 'qwen-turbo' : 'gpt-3.5-turbo' })
  });
  const ct = res.headers.get('content-type') || '';
  if (ct.includes('text/plain')) {
    const text = await res.text();
    if (!res.ok) throw new Error(text || 'Request failed');
    return text; // ✅ 直接返回纯文本答案
  } else {
    const data = await res.json();
    if (!res.ok) {
      const msg = data?.payload?.message || data?.error || 'Request failed';
      throw new Error(msg);
    }
    // 仅在列项目/建索引等非回答场景会走到这里
    return data;
  }

}

// 新增：总结MSU句子的函数
export async function summarizeMsuSentences(hopsOrGroups) {
  // ---------- 规范化 hops ----------
  const normalize = (arr) => {
    const hasHopShape = arr?.some(x => 'step' in x || 'panelIdx' in x || 'subspace' in x);
    if (hasHopShape) {
      return [...arr]
        .filter(x => Array.isArray(x.sentences) && x.sentences.length > 0)
        .sort((a, b) => (a.step || 1) - (b.step || 1))
        .map(x => ({
          step: x.step ?? 0,
          hsu: x.hsu,
          panelIdx: x.panelIdx,
          subspace: x.subspace || `Subspace ${x.panelIdx}`,
          sentences: x.sentences
        }));
    }
    return (arr || []).map((g, i) => ({
      step: i + 1,
      hsu: g.hsu,
      panelIdx: Number(String(g.hsu).split(':')[0] || 0),
      subspace: `Subspace ${Number(String(g.hsu).split(':')[0] || 0)}`,
      sentences: g.sentences || []
    }));
  };
  const hops = normalize(hopsOrGroups);

  // ---------- Legend & Ordered Hops ----------
  const legendMap = new Map();
  hops.forEach(h => {
    const name = h.subspace || `Subspace ${h.panelIdx}`;
    if (!legendMap.has(h.panelIdx)) legendMap.set(h.panelIdx, name);
  });
  const legendLines = Array.from(legendMap.entries())
    .sort((a,b) => a[0]-b[0])
    .map(([idx, name]) => `- panelIdx ${idx} → "${name}"`)
    .join('\n');

  const hopsBlock = hops
    .sort((a,b) => (a.step||0) - (b.step||0))
    .map(h => [
      `Step ${h.step} | HSU ${h.hsu} | Subspace "${h.subspace}" (panelIdx ${h.panelIdx}):`,
      ...(h.sentences || [])
    ].join('\n'))
    .join('\n\n');

  // ---------- 提示词：只返回 RouteSummary + 禁止代码块 ----------
  const prompt = `
You are given an ordered flight across a semantic map. Each hop is an HSU node belonging to a subspace.
Each hop includes one or more MSU sentences selected by the user.

GOALS:
- Produce a faithful, concise-but-informative overview that RESPECTS the original hop order.
- Emphasize major shifts when crossing subspaces (panelIdx changes), but never invent facts.
- Summarize the substance across hops; do NOT list hops one by one.

CONSTRAINTS (Very Important):
1) Preserve the logic implied by hop order (temporal/causal/argument flow).
2) Base ONLY on the provided MSU sentences (no hallucination).
3) Output MUST be a SINGLE JSON object with EXACTLY ONE key: RouteSummary.
4) Do NOT include any markdown, code fences, labels, or extra text before/after the JSON.
5) Length target: 80–140 words (informative yet concise).

LEGEND (panel index → subspace name):
${legendLines || '(none)'}

ORDERED HOPS (do not reorder; for your reference only):
${hopsBlock || '(none)'}

REQUIRED OUTPUT (single JSON object only):
{"RouteSummary": "<80–140 words overview that integrates key points and notes any important cross-subspace transitions>"}
`.trim();

  // ---------- 请求 ----------
  let text = '';
  try {
    const res = await fetch('/api/query', {
      method: 'POST',
      headers: { 'Content-Type':'application/json' },
      body: JSON.stringify({
        query: prompt,
        task: 'subspace',
        model: 'gpt-3.5-turbo'
      })
    });
    if (!res.ok) throw new Error('API request failed');
    text = (await res.text()).trim();
  } catch (e) {
    console.error('Summary generation error:', e);
    return '';
  }

  // ---------- 解析：剥掉代码块/多余前后缀，只取 RouteSummary ----------
  const stripCodeFences = (s) =>
    s.replace(/^\s*```(?:json)?\s*/i, '').replace(/\s*```\s*$/i, '').trim();

  const tryParseRouteSummary = (raw) => {
    // 1) 先去掉三引号代码块
    let s = stripCodeFences(raw);

    // 2) 有时模型会在 JSON 前加 "Summary:" 之类，清掉常见前缀
    s = s.replace(/^\s*summary\s*:\s*/i, '').trim();

    // 3) 直接尝试 JSON.parse
    try {
      const obj = JSON.parse(s);

      // 3a) 标准：{ RouteSummary: "..." }
      if (obj && typeof obj.RouteSummary === 'string' && obj.RouteSummary.trim()) {
        return obj.RouteSummary.trim();
      }

      // 3b) 退路1：返回成数组 [{unit, type}...] → 把 unit 串起来
      if (Array.isArray(obj) && obj.length) {
        const units = obj
          .map(x => (typeof x?.unit === 'string' ? x.unit.trim() : ''))
          .filter(Boolean);
        if (units.length) return units.join('; ');
      }

      // 3c) 退路2：对象其他键里找最像摘要的字段
      const candidate =
        obj.summary || obj.Summary || obj.routeSummary || obj.abstract || obj.text;
      if (typeof candidate === 'string' && candidate.trim()) return candidate.trim();

      // 3d) 退路3：任意把对象压成一行文本
      return JSON.stringify(obj);
    } catch {
      // 4) 不是 JSON：直接返回纯文本
      return s;
    }
  };

  return tryParseRouteSummary(text);
}


// === RAG：列项目 ===
export async function listRagProjects() {
  const res = await fetch('/api/rag/projects');
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Failed to list RAG projects');
  return data.projects; // e.g. ["case1","case2"]
}

// === RAG：为某项目构建/更新索引 ===
// rebuild=true 时强制重建；默认做增量（仅当PDF变化时重建）
export async function buildRagIndex(projectId, rebuild = false) {
  const res = await fetch('/api/rag/index', {
    method: 'POST',
    headers: { 'Content-Type':'application/json' },
    body: JSON.stringify({ project_id: projectId, rebuild })
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Failed to build RAG index');
  return data; // { project_id, stats: {...} }
}

// === RAG：提问 ===
export async function askRag(projectId, question, { k = 5, mmr = false } = {}) {
  const res = await fetch('/api/rag/query', {
    method: 'POST',
    headers: { 'Content-Type':'application/json' },
    body: JSON.stringify({ project_id: projectId, question, k, mmr })
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Failed to query RAG');
  // data = { answer, citations: [{doc_id,page,score}], used_k }
  return data;
}

// 把 /api/query 的统一响应转成 UI 该怎么显示
export function interpretLLMResponse(envelope) {
  const { mode, payload } = envelope || {};
  switch (mode) {
    case 'chat':
      return { type: 'text', text: payload?.answer || '' };

    case 'rag/projects':
      // 展示项目列表
      return { type: 'rag-projects', projects: payload?.projects || [] };

    case 'rag/index':
      // 展示索引构建结果
      return { type: 'rag-index', projectId: payload?.project_id, stats: payload?.stats };

    case 'rag/answer':
      // 展示RAG答案 + 引用
      return {
        type: 'rag-answer',
        text: payload?.answer || '',
        citations: payload?.citations || [] // [{doc_id,page,score}]
      };

    case 'error':
      return { type: 'error', text: payload?.message || 'Unknown error' };

    default:
      // 兜底：当后端给了未知 mode
      return { type: 'raw', data: envelope };
  }
}




import './commandRouter.js';

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

export async function sendQueryToLLM(query, llm = 'ChatGPT', opts = {}) {
  const res = await fetch('/api/query', {
    method: 'POST',
    headers: { 'Content-Type':'application/json' },
         body: JSON.stringify({
       query,
       model: llm === 'QWen' ? 'qwen-turbo' : 'gpt-3.5-turbo',
       // 允许前端把最近几轮 messages 直接传给后端
       messages: Array.isArray(opts.messages) ? opts.messages : undefined,
       task: opts.task || undefined
     })
  
  });
  const ct = res.headers.get('content-type') || '';

  // --- JSON 返回：可能是 RAG / subspace-control / error 等 ---
  if (ct.includes('application/json')) {
    const data = await res.json();
    if (!res.ok) {
      const msg = data?.payload?.message || data?.error || 'Request failed';
      throw new Error(msg);
    }

    // ⭐ 新增：若是“子空间显隐”模式，直接路由并返回一个轻量结果
    if (data?.mode === 'subspace/control') {
      const cmd = data?.payload?.text || data?.payload?.command || '';

      // ⭐ 如果路由器还没在 window 上，先动态导入一遍（副作用执行）
      if (!window.CommandRouter) {
        try {
          await import('./commandRouter.js');  // 路径同上
        } catch (e) {
          console.warn('[sendQueryToLLM] lazy-load commandRouter failed:', e);
        }
      }

      if (window.CommandRouter && window.SemanticMapCtrl && cmd) {
        try {
          window.CommandRouter.routeCommand(window.SemanticMapCtrl, cmd);
        } catch (err) {
          console.error('[sendQueryToLLM] subspace/control route error:', err);
        }
      } else {
        // 地图或路由器还没就绪：排队，commandRouter 会在 semanticMap:ready 时冲掉
        window.__pendingSubspaceCmds = window.__pendingSubspaceCmds || [];
        window.__pendingSubspaceCmds.push(cmd);
        console.warn('[sendQueryToLLM] subspace/control missing router/ctrl/cmd', {
          cmd,
          hasCtrl: !!window.SemanticMapCtrl,
          hasRouter: !!window.CommandRouter
        });
      }
      return { mode: 'subspace/control', ok: true, command: cmd };
    }

    // 其他 JSON：直接返回给上层 interpretLLMResponse 使用
    return data;
  }

  // --- 纯文本返回（plain chat） ---
  const text = await res.text();
  if (!res.ok) throw new Error(text || 'Request failed');
  return text; // ✅ 直接返回纯文本答案
}


// 新增：总结MSU句子的函数（修正版：不再用 task:'subspace'）
export async function summarizeMsuSentences(hopsOrGroups) {
  console.log(hopsOrGroups)
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
You are given an ordered flight link across a semantic map.
Each hop is an HSU in a specific subspace (panelIdx), containing one or more user-selected MSU sentences.

TASK
Write a faithful, information-dense overview that is derived ONLY from the MSUs below. Follow the hop order to preserve temporal/causal/argument flow. If panelIdx changes, describe it briefly as a shift in perspective/focus/topic—only when evident from MSUs.

CONTENT RULES (Strict)
1) Evidence-only: use ONLY terms and facts that appear in the MSUs or LEGEND. No outside info, no re-interpretation.
2) Lexical fidelity: prefer verbatim reuse of salient nouns/phrases from MSUs; do not generalize into vague wording.
3) Coverage: integrate the 3–6 most central claims/themes reflected across hops; avoid enumerating hops one-by-one.
4) Transition cue: if subspace changes, mention it minimally (e.g., “Shift from <Subspace A> to <Subspace B> …”).
5) No meta/fillers: forbid “overall/in summary/generally/the text says/this suggests/it highlights/it indicates”.
6) One paragraph, not a list; high information density; coherent and neutral.

OUTPUT FORMAT (Very Important)
- Return a SINGLE JSON object with EXACTLY ONE key: "RouteSummary".
- The value must be a compact paragraph of 90–120 words (no bullets, no markdown, no code fences, no extra text).

LEGEND (panel index → subspace name):
${legendLines || '(none)'}

ORDERED HOPS (do not reorder; source of truth):
${hopsBlock || '(none)'}

REQUIRED OUTPUT:
{"RouteSummary": "<50-120 words; dense, evidence-based paragraph that preserves hop logic and notes genuine subspace shifts when present>"}
  `.trim();

  // ---------- 请求（改动点：task 用 'literature'；按内容类型分流） ----------
  try {
    const res = await fetch('/api/query', {
      method: 'POST',
      headers: { 'Content-Type':'application/json' },
      body: JSON.stringify({
        query: prompt,
        task: 'literature',     // ✨ 关键：这是一条“摘要”任务，不能用 'subspace'
        model: 'gpt-3.5-turbo'         // 或你习惯的模型
      })
    });
    if (!res.ok) throw new Error('API request failed');

    const ct = res.headers.get('content-type') || '';

    // 如果后端万一返回了 JSON（例如其它模式），先判断是否 UI 控制
    if (ct.includes('application/json')) {
      const data = await res.json();

      // 若意外返回了 subspace/control（比如你把 prompt 改成了显隐语句）
      if (data?.mode === 'subspace/control') {
        const cmd = data?.payload?.text || data?.payload?.command || '';
        if (window.CommandRouter && window.SemanticMapCtrl && cmd) {
          window.CommandRouter.routeCommand(window.SemanticMapCtrl, cmd);
        }
        return ''; // 不把控制指令当摘要展示
      }

      // 其它 JSON（如 rag/index 等）——这里不是本函数关注点，直接字符串化返回或丢空
      return typeof data === 'string' ? data : JSON.stringify(data);
    }

    // ---------- 纯文本：解析 RouteSummary ----------
    const text = (await res.text()).trim();

    const stripCodeFences = (s) =>
      s.replace(/^\s*```(?:json)?\s*/i, '').replace(/\s*```\s*$/i, '').trim();

    const tryParseRouteSummary = (raw) => {
      // 1) 去掉三引号
      let s = stripCodeFences(raw);
      // 2) 去掉常见前缀
      s = s.replace(/^\s*summary\s*:\s*/i, '').trim();
      // 3) 尝试 JSON.parse
      try {
        const obj = JSON.parse(s);
        if (obj && typeof obj.RouteSummary === 'string' && obj.RouteSummary.trim()) {
          return obj.RouteSummary.trim();
        }
        if (Array.isArray(obj) && obj.length) {
          const units = obj.map(x => (typeof x?.unit === 'string' ? x.unit.trim() : '')).filter(Boolean);
          if (units.length) return units.join('; ');
        }
        const candidate = obj.summary || obj.Summary || obj.routeSummary || obj.abstract || obj.text;
        if (typeof candidate === 'string' && candidate.trim()) return candidate.trim();
        return JSON.stringify(obj);
      } catch {
        return s; // 不是 JSON，就当纯文本返回
      }
    };

    return tryParseRouteSummary(text);

  } catch (e) {
    console.error('Summary generation error:', e);
    return '';
  }
}

// === 子空间显隐：独立调用 ===
// 说明：这是“高优先级 UI 控制”专用的 API 封装。
// naturalText 例如： "show background and result subspaces"
export async function runSubspaceCommand(naturalText) {
  const res = await fetch('/api/query', {
    method: 'POST',
    headers: { 'Content-Type':'application/json' },
    body: JSON.stringify({
      query: naturalText,
      task: 'subspace',      // 关键：命中后端最高优先级 UI 控制分支
      model: 'gpt-3.5-turbo'        // 或你习惯的模型名
    })
  });

  const ct = res.headers.get('content-type') || '';
  if (!res.ok) {
    const msg = ct.includes('application/json') ? (await res.json())?.error : await res.text();
    throw new Error(msg || 'Subspace command failed');
  }

  if (!ct.includes('application/json')) {
    console.warn('[subspace/control] Expect JSON but got text; ignoring.');
    return false;
  }

  const data = await res.json();
  if (data?.mode === 'subspace/control') {
    const cmd = data?.payload?.text || data?.payload?.command || '';
    if (window.CommandRouter && window.SemanticMapCtrl && cmd) {
      try {
        window.CommandRouter.routeCommand(window.SemanticMapCtrl, cmd);
      } catch (err) {
        console.error('[subspace/control] route error:', err);
        return false;
      }
      return true;
    } else {
      console.warn('[subspace/control] Missing router/ctrl/cmd', {
        hasRouter: !!window.CommandRouter,
        hasCtrl: !!window.SemanticMapCtrl,
        cmd
      });
      return false;
    }
  }

  console.warn('[subspace/control] Unexpected response:', data);
  return false;
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
  const res = await fetch('/api/query', {
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

    case 'subspace/control':
      // 已在 sendQueryToLLM 中做过实际路由，这里只回个占位结果给 UI（可选）
      return { type: 'subspace-control', text: '', command: payload?.text || payload?.command || '' };

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




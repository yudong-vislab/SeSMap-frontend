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
 export async function summarizeMsuSentences(msuGroups) {
   // msuGroups: [ { hsu: "113,-11", sentences: [ "MSU 214: ...", "MSU 540: ..." ] }, ... ]
   const prompt = `You are given multiple scientific fragments grouped by HSU (Hierarchical Semantic Units).
 Each HSU has multiple MSU sentences. Please summarize across all selected MSUs.
 
 Requirements:
 1. Provide a concise summary in English (≤20 words).
 2. Highlight the main points into summary.
 3. Respect grouping: ensure summary reflects differences between HSUs if necessary.
 4. Output format strictly in JSON:
 {"Summary": "Your summary here"}
 
 HSU Groups and Sentences:
 ${msuGroups.map(g => `HSU ${g.hsu}:\n${g.sentences.join('\n')}`).join('\n\n')}`;

  try {
    const res = await fetch('/api/query', {
      method: 'POST',
      headers: { 'Content-Type':'application/json' },
      body: JSON.stringify({ 
        query: prompt, 
        model: 'gpt-3.5-turbo',
        max_tokens: 100
      })
    });
    
    if (!res.ok) {
      throw new Error('API request failed');
    }
    
    const data = await res.json();
    console.log('API response:', data);
    
    // 处理JSON字符串格式的响应
    let responseText = data.answer || '';
    if (typeof responseText === 'string') {
      try {
        // 尝试解析JSON字符串
        const parsed = JSON.parse(responseText);
        return parsed.Summary || parsed.summary || responseText;
      } catch (e) {
        // 如果不是JSON格式，直接返回文本
        return responseText;
      }
    }
    
    // 如果是对象格式
    return data.Summary || data.summary || responseText;
  } catch (error) {
    console.error('Summary generation error:', error);
    return 'Generating summary...';
  }
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




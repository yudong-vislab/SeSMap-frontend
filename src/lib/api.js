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
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Request failed');
  return data.answer;
}

// 新增：总结MSU句子的函数
 export async function summarizeMsuSentences(msuGroups) {
   // msuGroups: [ { hsu: "113,-11", sentences: [ "MSU 214: ...", "MSU 540: ..." ] }, ... ]
   const prompt = `You are given multiple scientific fragments grouped by HSU (Hierarchical Semantic Units).
 Each HSU has multiple MSU sentences. Please summarize across all selected MSUs.
 
 Requirements:
 1. Provide a concise summary in English (≤50 words).
 2. Highlight the main research contributions and conclusions.
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


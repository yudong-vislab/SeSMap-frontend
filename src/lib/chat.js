// src/api/chat.js
import { setActiveProjectId } from '../lib/api';   // ✨ 关键：复用 api.js 里对 case 的管理

export async function chatOnce({ query, messages } = {}) {
  const res = await fetch('/api/query', {
    method: 'POST',
    headers: { 'Content-Type':'application/json' },
    body: JSON.stringify({
      query,
      messages,
      stream: false,
      // 这里不传 task，仍然让后端用 is_subspace_command 自动识别
    })
  });

  if (!res.ok) {
    const err = await res.json().catch(()=> ({}));
    throw new Error(err.error || `Chat failed: ${res.status}`);
  }

  const data = await res.json();

  try {
    // 自动把子空间控制指令转发到 UI，并处理 project_id
    if (data && data.mode === 'subspace/control') {
      const ctrl   = window.SemanticMapCtrl;   // 由 semanticMap 初始化时挂在全局
      const router = window.CommandRouter;     // 由 commandRouter.js 末尾挂在全局
      const text   = data.payload?.text || data.payload?.command || '';

      // 🔍 1) 先从 payload 里拿 project_id
      let projectId = data.payload?.project_id || null;

      // 🔍 2) 如果 payload 没给，就从原始 query 里用正则兜底解析 "case 1/2/3"
      if (!projectId && typeof query === 'string') {
        const m = query.match(/case\s*([123])/i);
        if (m) {
          projectId = `case${m[1]}`;
        }
      }

      // ✅ 3) 如果得到了 projectId，就更新全局状态 + 通知 MainView 重载语义图
      if (projectId) {
        // 写入全局变量（getActiveProjectId 会从 window.__activeProjectId 读）
        setActiveProjectId(projectId);

        try {
          window.dispatchEvent(new CustomEvent('semantic-map:project-changed', {
            detail: { projectId }
          }));
          console.log('[chatOnce] dispatched semantic-map:project-changed =>', projectId);
        } catch (e) {
          console.warn('[chatOnce] dispatch project-changed failed:', e);
        }
      }

      // 🔁 4) 仍然把控制命令路由给语义图控制器（显隐子空间）
      if (ctrl && router && text) {
        try {
          router.routeCommand(ctrl, text);
        } catch (e) {
          console.error('[chatOnce] routeCommand error:', e);
        }
      } else {
        console.warn('[chatOnce] subspace/control missing router/ctrl/text', {
          hasCtrl: !!ctrl,
          hasRouter: !!router,
          text
        });
      }
    }
  } catch (e) {
    console.warn('[chatOnce] subspace/control handling error:', e);
  }

  return data;
}

// 下面这两个保持占位就行，目前你没有在用流式
export function chatStream({ query, messages } = {}, onDelta, onDone, onError) {
  const es = new EventSourcePolyfill('/api/chat_stream_sse_not_used');
}

export function chatSSE({ query, messages }, { onDelta, onDone, onError }){
  const url = '/api/chat';
  const es = new EventSourcePolyfill ? new EventSourcePolyfill(url) : null;
}

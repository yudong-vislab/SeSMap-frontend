// src/lib/commandRouter.js
// 解析自然语言 → 意图（show / show-all / hide-all / add / delete / count / list）→ 调用 semanticMap 控制器

const zhJoiner = /[、，\s]+/;

// 提取子空间名字：去连接词 & “subspace(s)/子空间” 噪音
function extractNames(text) {
  const lowered = String(text || '').toLowerCase();
  const cleaned = lowered
    .replace(/\band\b/g, ' ')
    .replace(/\bor\b/g, ' ')
    .replace(/和|及/g, ' ')
    .replace(/subspaces?/g, ' ')   // ← 全局去噪
    .replace(/子空间/g, ' ');       // ← 全局去噪
  return cleaned.split(zhJoiner).map(s => s.trim()).filter(Boolean);
}

export function parseCommand(textRaw) {
  const text = String(textRaw || '').trim();
  const lowered = text.toLowerCase();   // ← 先定义再使用

  // 0) 空输入
  if (!lowered) return { intent: 'unknown' };

  // 1) 计数/列举
  if (/(^|\s)(how many subspaces|subspace count)(\s|$)|有多少个子空间|子空间数量/.test(lowered)) {
    return { intent: 'count' };
  }
  if (/list subspaces|show subspace list|列出子空间|子空间列表/.test(lowered)) {
    return { intent: 'list' };
  }

  // 2) 显示全部（要放在通配 show 前面！）
  if (/show all subspaces|show all\b|显示(所有|全部)\s*子空间/.test(lowered)) {
    return { intent: 'show-all' };
  }

  // 3) 隐藏全部（可选增强）
  if (/hide all subspaces|hide all\b|隐藏(所有|全部)\s*子空间|清空视图/.test(lowered)) {
    return { intent: 'hide-all' };
  }

  // 4) 仅显示指定子空间
  //   支持：
  //   - "show background and result subspaces"
  //   - "show subspaces background and result"
  //   - "显示 background 和 result 子空间"
  if (/^show\b|显示/.test(lowered)) {
    // 去掉前置动词与“子空间”噪音
    const stripped = lowered
      .replace(/^show\s*/, '')
      .replace(/^subspaces?\s*/, '')
      .replace(/subspaces?/g, ' ')
      .replace(/子空间/g, ' ');
    const names = extractNames(stripped);
    if (names.length) return { intent: 'show', names };
    // 没给名字 → 视为 show-all
    return { intent: 'show-all' };
  }

  // 5) 新增
  if (/^add\b|新增|新建/.test(lowered)) {
    const after = lowered
      .replace(/^add\s*/, '')
      .replace(/^subspace\s*/, '')
      .replace(/subspaces?/g, ' ')
      .replace(/子空间/g, ' ');
    const names = extractNames(after);
    return { intent: 'add', names: names.length ? names : ['New Subspace'] };
  }

  // 6) 删除
  if (/^(delete|remove)\b|删除/.test(lowered)) {
    const after = lowered
      .replace(/^(delete|remove)\s*/, '')
      .replace(/^subspace\s*/, '')
      .replace(/subspaces?/g, ' ')
      .replace(/子空间/g, ' ');
    const names = extractNames(after);
    return { intent: 'delete', names };
  }

  return { intent: 'unknown' };
}

// 执行动作，返回 {handled, message}
export function routeCommand(controller, text) {

  // === Controller 就绪性守卫（未就绪则排队，避免 undefined.hideAllSubspaces 报错）===
  if (
    !controller ||
    typeof controller.hideAllSubspaces !== 'function' ||
    typeof controller.showAllSubspaces !== 'function' ||
    typeof controller.showOnlySubspaces !== 'function'
  ) {
    console.warn('[CommandRouter] controller not ready or missing APIs', {
      hasCtrl: !!controller,
      hasHide: typeof controller?.hideAllSubspaces === 'function',
      hasShowAll: typeof controller?.showAllSubspaces === 'function',
      hasShowOnly: typeof controller?.showOnlySubspaces === 'function'
    });

    // 把命令暂存到全局队列，等 semanticMap:ready 后冲掉
    if (typeof window !== 'undefined') {
      window.__pendingSubspaceCmds = window.__pendingSubspaceCmds || [];
      window.__pendingSubspaceCmds.push(text);
    }

    return { handled: false, message: 'controller-not-ready' };
  }

  try {
    const { intent, names = [] } = parseCommand(text);

    // 基础查询
    if (intent === 'count') {
      const n = controller.getSubspaceCount?.() ?? 0;
      return { handled: true, message: `There are ${n} subspaces.` };
    }
    if (intent === 'list') {
      const arr = controller.getSubspaceNames?.() || [];
      return { handled: true, message: arr.length ? `Subspaces: ${arr.join(', ')}` : 'No subspaces.' };
    }

    // 显隐
    if (intent === 'show-all') {
      controller.showAllSubspaces?.();
      return { handled: true, message: `Showing all subspaces.` };
    }
    if (intent === 'hide-all') {
      controller.hideAllSubspaces?.();
      return { handled: true, message: `Hid all subspaces.` };
    }
    if (intent === 'show') {
      const idxs = controller.findSubspaceIndicesByNames?.(names) || [];
      if (!idxs.length) return { handled: true, message: `No matching subspace: ${names.join(', ')}` };
      controller.showOnlySubspaces?.(idxs);
      return { handled: true, message: `Showing: ${names.join(', ')}` };
    }

    // 增删
    if (intent === 'add') {
      names.forEach(nm => controller.addSubspace?.({ subspaceName: nm }));
      return { handled: true, message: `Added subspace(s): ${names.join(', ')}` };
    }
    if (intent === 'delete') {
      if (!names.length) return { handled: true, message: 'Please specify subspace name(s) to delete.' };
      controller.deleteSubspacesByNameOrIdx?.(names);
      return { handled: true, message: `Deleted (if existed): ${names.join(', ')}` };
    }

    return { handled: false, message: '' };
  } catch (e) {
    console.error('[commandRouter] failed:', e);
    return { handled: true, message: `Command error: ${e.message || e}` };
  }
}

// 让外部有“只解析不执行”的能力（可用于 ChatPanel 判断）
routeCommand.__parseOnly = parseCommand;
// 可选：挂到全局，便于从任意对话组件直接触发
if (typeof window !== 'undefined') {
  window.CommandRouter = { routeCommand, __parse: routeCommand.__parseOnly };

  // 语义图就绪时，自动执行排队命令
  window.addEventListener('semanticMap:ready', () => {
    const ctrl = window.SemanticMapCtrl;
    if (!ctrl) return;
    const q = window.__pendingSubspaceCmds || [];
    while (q.length) {
      const cmd = q.shift();
      try {
        routeCommand(ctrl, cmd);
      } catch (e) {
        console.error('[CommandRouter] flush error:', e);
      }
    }
  });
}

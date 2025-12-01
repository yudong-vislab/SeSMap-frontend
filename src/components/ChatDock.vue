<script setup>
import { ref, onMounted, nextTick } from 'vue'
const emit = defineEmits(['send','upload-files','upload-images'])
const props = defineProps({ busy:{type:Boolean,default:false}, placeholder:{type:String,default:'Say something in English…'} })
const taRef = ref(null), text = ref(''); const MIN_ROWS = 1, MAX_ROWS = 8

// 常用指令提示（可按需替换/追加）
const hintChips = ref([
  'show air related papers in semantic source gallery',
  'show all subspaces in case 1',
  'summarize case 1',
  'show background and results subspaces'
])

function applyHint(h){
  text.value = h
  nextTick(()=> autoResize())
}

function autoResize(){
  const ta=taRef.value; if(!ta) return;
  ta.style.height='auto';
  const lh=parseFloat(getComputedStyle(ta).lineHeight||'20');
  const maxH=lh*MAX_ROWS;
  ta.style.height=Math.min(ta.scrollHeight,maxH)+'px';
  if(ta.scrollHeight>maxH) ta.classList.add('is-scrollable'); else ta.classList.remove('is-scrollable')
}
function onInput(){ autoResize() }
function onKeydown(e){ /* Enter to send; Shift+Enter newline */ if(e.key==='Enter' && !e.shiftKey){ e.preventDefault(); doSend() } }
async function doSend(){ const msg=text.value.trim(); if(!msg || props.busy) return; emit('send', msg); text.value=''; await nextTick(); autoResize() }
onMounted(()=> nextTick(autoResize))
</script>

<template>
  <div class="chat-dock">
    <!-- 悬停时出现的提示条（不影响原有编辑区结构） -->
    <div class="dock-hints" aria-hidden="true">
      <div class="hint-label">Try:</div>
      <div class="hint-list">
        <button v-for="h in hintChips" :key="h" class="hint-chip" type="button" @click="applyHint(h)">
          {{ h }}
        </button>
      </div>
    </div>

    <div class="dock-editor">
      <textarea ref="taRef" v-model="text" :rows="MIN_ROWS" class="dock-textarea"
        :placeholder="placeholder" :disabled="busy" @input="onInput" @keydown="onKeydown" />
      <button class="send-btn" :disabled="busy || !text.trim()" @click="doSend" title="Send">
        <svg class="icon" viewBox="0 0 24 24" fill="none" aria-hidden="true">
          <path d="M6 18L18 6M18 6v8M18 6h-8" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/>
        </svg>
      </button>
    </div>
  </div>
</template>

<style scoped>
/* ===== 原样式：一行未改 ===== */
.chat-dock{ position:sticky; bottom:0; padding:10px 12px; background:#fff; border-top:1px solid #eee; }
.dock-editor{ display:grid; grid-template-columns:minmax(0,1fr) max-content; gap:6px; align-items:end; }
.dock-textarea{ width:100%; box-sizing:border-box; resize:none; border:1px solid #e5e7eb; border-radius:8px; font:inherit; font-size:12px; line-height:1.4; padding:6px 8px; overflow-y:hidden; }
.dock-textarea.is-scrollable{ overflow-y:auto; }
 .send-btn{
   height: 20px;
   /* width: 20px; */
   border-radius: 50%;
   align-self: center;
   border: 1px solid #111;
   background: #111;
   color: #fff;
   display: inline-flex;
   align-items: center;
   justify-content: center;
   padding: 0;
   cursor: pointer;
 }
 .send-btn:disabled{ opacity:.45; cursor:not-allowed; }
 .send-btn .icon{ width:14px; height:14px; display:block; }
 /* ✅ 焦点态/hover 都保持灰黑，不出现系统蓝描边 */
 .send-btn:focus{ outline: none; box-shadow: 0 0 0 2px #e5e7eb; }
 .send-btn:hover{ filter: brightness(0.95); }

 /* 输入控件的焦点描边也统一灰色 */
 .dock-textarea:focus{
   outline: none;
   border-color: #cbd5e1;           /* 边框浅灰 */
   box-shadow: 0 0 0 3px #e5e7eb;   /* 外发光浅灰 */
 }

/* ===== 新增样式（仅添加，不改动既有规则） ===== */

/* 提示条容器：默认折叠；hover 展开 */
.dock-hints{
  display:flex;
  align-items:center;
  gap:8px;
  overflow:hidden;
  max-height:0;              /* 关键：默认折叠 */
  opacity:0;
  transform: translateY(4px);
  transition: max-height .22s ease, opacity .18s ease, transform .22s ease;
  padding:0 0 6px 0;         /* 与编辑区拉开 6px */
}

/* 鼠标悬停到 chat-dock：展开提示 + 整体高度略增 */
.chat-dock:hover .dock-hints{
  max-height:48px;           /* 展开高度（够放一行提示） */
  opacity:1;
  transform: translateY(0);
}

/* 轻微增加容器上内边距，制造“变高”的感觉 */
.chat-dock:hover{
  padding-top:14px;          /* 在原 10px 基础上 +4px 视觉增高 */
}

/* 提示条元素 */
.hint-label{
  font-size:11px;
  color:#6b7280;
  flex:0 0 auto;
}

.hint-list{
  display:flex;
  gap:6px;
  flex-wrap:wrap;
}

/* 胶囊提示（可点填充输入框，不自动发送） */
.hint-chip{
  font-size:11px;
  line-height:1;
  border:1px dashed #e5e7eb;
  background:#fafafa;
  padding:4px 8px;
  border-radius:999px;
  cursor:pointer;
  user-select:none;
  transition: background .15s ease, border-color .15s ease, transform .06s ease;
}
.hint-chip:hover{ background:#f3f4f6; border-color:#d1d5db; }
.hint-chip:active{ transform: scale(0.98); }

/* === 滚动增强（只新增，不改动你已有规则） === */

/* 让整行提示在展开时为统一高度，便于内部滚动；并让列表占满剩余空间 */
.dock-hints{ align-items: stretch; }
.hint-label{ align-self: center; } /* 标签保持垂直居中即可 */

/* 列表容器：默认隐藏滚动条与滚动能力；在 hover 时再开放滚动 */
.hint-list{
  flex: 1 1 auto;
  max-height: 40px;            /* 与 .chat-dock:hover .dock-hints 的 max-height 协同 */
  overflow: hidden;            /* 默认不滚动 */
  padding-right: 2px;          /* 给滚动条预留一丝空间，避免挤压内容 */
  overscroll-behavior: contain;
  -webkit-overflow-scrolling: touch;

  /* 默认隐藏滚动条（Firefox + WebKit） */
  scrollbar-width: none;                   /* Firefox */
}
.hint-list::-webkit-scrollbar{ width: 0; height: 0; }  /* WebKit 隐藏 */

/* 悬停 chat-dock 时：启用垂直滚动，显示细滚动条 */
.chat-dock:hover .hint-list{
  overflow-y: auto;
  /* Firefox 显示细滚动条 */
  scrollbar-width: thin;
  scrollbar-color: #d1d5db transparent;   /* 滑块+轨道 */
}

/* WebKit 的细滚动条样式（仅在 hover 状态下生效）*/
.chat-dock:hover .hint-list::-webkit-scrollbar{
  width: 6px;
}
.chat-dock:hover .hint-list::-webkit-scrollbar-track{
  background: transparent;
  border-radius: 8px;
}
.chat-dock:hover .hint-list::-webkit-scrollbar-thumb{
  background: #d1d5db;
  border-radius: 8px;
}
.chat-dock:hover .hint-list::-webkit-scrollbar-thumb:hover{
  background: #c5cbd3;
}

</style>


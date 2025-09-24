<script setup>
import { ref, onMounted, nextTick } from 'vue'
const emit = defineEmits(['send','upload-files','upload-images'])
const props = defineProps({ busy:{type:Boolean,default:false}, placeholder:{type:String,default:'Say something in English…'} })
const taRef = ref(null), text = ref(''); const MIN_ROWS = 1, MAX_ROWS = 8
function autoResize(){ const ta=taRef.value; if(!ta) return; ta.style.height='auto'; const lh=parseFloat(getComputedStyle(ta).lineHeight||'20'); const maxH=lh*MAX_ROWS; ta.style.height=Math.min(ta.scrollHeight,maxH)+'px'; if(ta.scrollHeight>maxH) ta.classList.add('is-scrollable'); else ta.classList.remove('is-scrollable') }
function onInput(){ autoResize() }
function onKeydown(e){ /* Enter to send; Shift+Enter newline */ if(e.key==='Enter' && !e.shiftKey){ e.preventDefault(); doSend() } }
async function doSend(){ const msg=text.value.trim(); if(!msg || props.busy) return; emit('send', msg); text.value=''; await nextTick(); autoResize() }
onMounted(()=> nextTick(autoResize))
</script>

<template>
  <div class="chat-dock">
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


</style>
